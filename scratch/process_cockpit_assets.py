import os
import numpy as np
from PIL import Image, ImageFilter
import scipy.ndimage as ndi

src_dir = r"H:\bus-driver-nostalgic\public\assets\cockpit"
dst_dir = r"H:\bus-driver-nostalgic\public\assets\cockpit_processed"
os.makedirs(dst_dir, exist_ok=True)

# ============================================================================
# 1. Process Cockpit Frame
# ============================================================================
print("Processing Cockpit Frame...")
frame_path = os.path.join(src_dir, "ChatGPT Image Sep 27, 2026, 02_56_18 PM.png")
im_frame = Image.open(frame_path).convert("RGBA")
arr_frame = np.array(im_frame)
H, W, _ = arr_frame.shape

# The window cutouts are black regions (R,G,B < 25) in the top/middle window areas
# Let's identify the window areas by finding the connected black regions in the window zones
black_mask = (arr_frame[:, :, 0] < 22) & (arr_frame[:, :, 1] < 22) & (arr_frame[:, :, 2] < 22)
labeled, num_features = ndi.label(black_mask)

# Window components:
# 1. Main windshield (center top)
# 2. Left side window
# 3. Right side window
# 4. Right quarter glass
# Also the 4 gauge holes on the dash
transparent_mask = np.zeros((H, W), dtype=bool)

# Find components that intersect with known window/gauge bounding boxes
for i in range(1, num_features + 1):
    ys, xs = np.where(labeled == i)
    if len(ys) < 300:
        continue
    # Center of component
    cy = (ys.min() + ys.max()) / 2
    cx = (xs.min() + xs.max()) / 2
    
    # Check if this is windshield, side windows, or gauge cutouts
    # Windshield: y in [150..480], x in [550..1650]
    # Left window: y in [0..650], x in [0..500]
    # Right window: y in [80..600], x in [1800..2171]
    # Quarter window: y in [150..550], x in [1650..1780]
    # Dash gauge holes: y in [490..590], x in [540..1000]
    is_window = (
        (150 <= cy <= 480 and 520 <= cx <= 1650) or
        (0 <= cy <= 650 and cx <= 500) or
        (80 <= cy <= 600 and cx >= 1800) or
        (150 <= cy <= 550 and 1650 <= cx <= 1780) or
        (490 <= cy <= 590 and 540 <= cx <= 1000)
    )
    if is_window:
        transparent_mask[labeled == i] = True

# Also do a slight morphological dilation/feathering on the mask so no dark black fringe remains
# Convert mask to float alpha [0..255]
alpha = np.ones((H, W), dtype=np.float32) * 255.0
alpha[transparent_mask] = 0.0

# Gaussian blur the alpha mask slightly for antialiased edges
alpha_im = Image.fromarray(alpha.astype(np.uint8), mode="L")
alpha_im = alpha_im.filter(ImageFilter.GaussianBlur(radius=1.2))

# Re-apply strict 0 to pure interior of windows
alpha_arr = np.array(alpha_im)
# Where original mask was deep inside (distance > 3 from edge), force 0
dist = ndi.distance_transform_edt(transparent_mask)
alpha_arr[dist > 2.0] = 0

arr_frame[:, :, 3] = alpha_arr
out_frame = Image.fromarray(arr_frame, mode="RGBA")
out_frame.save(os.path.join(dst_dir, "cockpit_frame.webp"), "WEBP", quality=95)
out_frame.save(os.path.join(dst_dir, "cockpit_frame.png"), "PNG")
print(f"Cockpit frame saved: size={W}x{H}")

# ============================================================================
# 2. Process Steering Wheel with Hands
# ============================================================================
print("Processing Steering Wheel...")
wheel_path = os.path.join(src_dir, "ChatGPT Image Sep 27, 2026, 02_54_32 PM.png")
im_wheel = Image.open(wheel_path).convert("RGBA")
arr_wheel = np.array(im_wheel)
w_H, w_W, _ = arr_wheel.shape

# Hub center is at (708, 503)
hub_cx = 708
hub_cy = 503

# We want the steering wheel image to be centered exactly on (hub_cx, hub_cy)
# Calculate max distance from hub to valid content
alpha_w = arr_wheel[:, :, 3]
ys_w, xs_w = np.where(alpha_w > 10)
dx_max = max(hub_cx - xs_w.min(), xs_w.max() - hub_cx)
dy_max = max(hub_cy - ys_w.min(), ys_w.max() - hub_cy)
radius_box = max(dx_max, dy_max) + 20

# Create square canvas centered at (hub_cx, hub_cy)
sq_size = int(radius_box * 2)
wheel_square = Image.new("RGBA", (sq_size, sq_size), (0, 0, 0, 0))
# Paste original image so (hub_cx, hub_cy) lands at (sq_size // 2, sq_size // 2)
paste_x = (sq_size // 2) - hub_cx
paste_y = (sq_size // 2) - hub_cy
wheel_square.paste(im_wheel, (paste_x, paste_y))

# Clean up black background around hands/wheel AND inside the spoke openings
arr_sq = np.array(wheel_square)
center_sq = sq_size // 2

# Find black areas
is_black = (arr_sq[:, :, 0] < 18) & (arr_sq[:, :, 1] < 18) & (arr_sq[:, :, 2] < 18)
labeled_w, n_w = ndi.label(is_black)

# Component containing (0,0) is outer background
outer_label = labeled_w[0, 0]
arr_sq[labeled_w == outer_label, 3] = 0

# Also check spoke opening components inside the wheel rim (distance from center < 0.85 * rim_radius)
# Center hub cap is around center_sq. Don't remove the black center horn button!
# Horn button radius is ~55 pixels in original resolution
for comp_idx in range(1, n_w + 1):
    if comp_idx == outer_label:
        continue
    ys, xs = np.where(labeled_w == comp_idx)
    cy_c = (ys.min() + ys.max()) / 2
    cx_c = (xs.min() + xs.max()) / 2
    dist_to_center = np.sqrt((cx_c - center_sq)**2 + (cy_c - center_sq)**2)
    
    # If it's a large spoke opening (size > 1000) and not the central horn button (dist > 70)
    if len(ys) > 1000 and dist_to_center > 70:
        arr_sq[labeled_w == comp_idx, 3] = 0

wheel_square = Image.fromarray(arr_sq)

# Resize to standard crisp resolution (e.g. 1024x1024)
wheel_1024 = wheel_square.resize((1024, 1024), Image.Resampling.LANCZOS)
wheel_1024.save(os.path.join(dst_dir, "steering_wheel.webp"), "WEBP", quality=95)
wheel_1024.save(os.path.join(dst_dir, "steering_wheel.png"), "PNG")
print(f"Steering wheel saved: size=1024x1024, pivot=(512, 512)")

# ============================================================================
# 3. Process Gauges and Needles
# ============================================================================
print("Processing Gauges & Needles...")
gauge_path = os.path.join(src_dir, "ChatGPT Image Sep 27, 2026, 02_57_50 PM.png")
im_gauge = Image.open(gauge_path).convert("RGBA")
arr_g = np.array(im_gauge)

# Let's crop each dial squarely:
# 1. Speedometer (TATA km/h): center around (325, 342), radius ~ 290
speedo = im_gauge.crop((35, 52, 615, 632)).resize((512, 512), Image.Resampling.LANCZOS)
speedo.save(os.path.join(dst_dir, "gauge_speedo.png"), "PNG")

# 2. RPM Gauge: center around (922, 342), radius ~ 290
rpm = im_gauge.crop((632, 52, 1212, 632)).resize((512, 512), Image.Resampling.LANCZOS)
rpm.save(os.path.join(dst_dir, "gauge_rpm.png"), "PNG")

# 3. Fuel Gauge: top right (1212..1526, 20..335)
fuel = im_gauge.crop((1212, 20, 1526, 334)).resize((256, 256), Image.Resampling.LANCZOS)
fuel.save(os.path.join(dst_dir, "gauge_fuel.png"), "PNG")

# 4. Temp Gauge: mid right (1212..1526, 335..650)
temp = im_gauge.crop((1212, 335, 1526, 649)).resize((256, 256), Image.Resampling.LANCZOS)
temp.save(os.path.join(dst_dir, "gauge_temp.png"), "PNG")

# 5. Needles:
# Needle 1: Region at [652..977, 103..542] (Large red needle)
# Let's extract Needle 1 and find its circular base center so pivot is exact
needle_crop = im_gauge.crop((103, 652, 542, 977))
arr_nc = np.array(needle_crop)
# Needle base is the circular metallic cap near bottom left
# Find center of needle circular cap
# In crop coordinates: cap is around x ~ [30..90], y ~ [230..300]
cap_area = arr_nc[220:310, 20:100]
# Find center of dark inner circle of cap
cap_bright = cap_area[:, :, :3].mean(axis=2)
min_pos = np.unravel_index(np.argmin(cap_bright), cap_bright.shape)
needle_pivot_y = 220 + min_pos[0]
needle_pivot_x = 20 + min_pos[1]
print(f"Needle 1 size: {needle_crop.size}, pivot: ({needle_pivot_x}, {needle_pivot_y})")

# Let's make a square needle sprite centered on its pivot (or pointing up at 0 deg)
# The needle in the crop points up-right at angle ~ 40 deg
# Let's rotate the needle so it points straight up (0 deg) with pivot at center!
# Measure angle from pivot to tip
# Tip is at top-right
ys_n, xs_n = np.where(arr_nc[:, :, 3] > 100)
# Find point farthest from pivot
dists = (xs_n - needle_pivot_x)**2 + (ys_n - needle_pivot_y)**2
tip_idx = np.argmax(dists)
tip_x, tip_y = xs_n[tip_idx], ys_n[tip_idx]
angle_rad = np.arctan2(tip_y - needle_pivot_y, tip_x - needle_pivot_x) # in image coords (y down)
# Angle in standard math:
# Standard: 0 = right (+x), -pi/2 = up (-y)
current_angle_deg = np.degrees(angle_rad)
print(f"Needle pointing angle: {current_angle_deg:.1f} deg")

# Make square canvas with pivot at center (256, 256)
n_sq = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
n_sq.paste(needle_crop, (256 - needle_pivot_x, 256 - needle_pivot_y))
# Rotate so needle points straight UP (-90 deg in screen coords, i.e. 12 o'clock)
# To go from current_angle_deg to -90 deg:
rot_deg = -(current_angle_deg - (-90))
needle_up = n_sq.rotate(rot_deg, resample=Image.Resampling.BICUBIC, center=(256, 256))
needle_up.save(os.path.join(dst_dir, "needle_up.png"), "PNG")
print("Needle upright sprite saved: size=512x512, pivot=(256, 256)")

# ============================================================================
# 4. Process Nimbu-Mirchi Charm
# ============================================================================
print("Processing Nimbu-Mirchi Charm...")
nimbu_path = os.path.join(src_dir, "ChatGPT Image Sep 27, 2026, 02_58_16 PM.png")
im_nimbu = Image.open(nimbu_path).convert("RGBA")
arr_nimbu = np.array(im_nimbu)

# Crop symmetrically around anchor x=515.5
anchor_x = 515.5
w_half = 420
crop_x1 = max(0, int(anchor_x - w_half))
crop_x2 = min(arr_nimbu.shape[1], int(anchor_x + w_half))
nimbu_cropped = im_nimbu.crop((crop_x1, 0, crop_x2, 1530))

# Resize to crisp HUD size
nimbu_final = nimbu_cropped.resize((280, 512), Image.Resampling.LANCZOS)
nimbu_final.save(os.path.join(dst_dir, "nimbu_mirchi.webp"), "WEBP", quality=95)
nimbu_final.save(os.path.join(dst_dir, "nimbu_mirchi.png"), "PNG")
print(f"Nimbu-mirchi charm saved: size=280x512, top anchor at (140, 0)")

# ============================================================================
# 5. Process Windshield Glass Overlay
# ============================================================================
print("Processing Windshield Glass Overlay...")
glass_path = os.path.join(src_dir, "ChatGPT Image Sep 27, 2026, 02_54_19 PM.png")
im_glass = Image.open(glass_path).convert("RGBA")
# Crop out extra black margins
arr_g = np.array(im_glass)
alpha_g = arr_g[:, :, 3]
ys_g, xs_g = np.where(alpha_g > 10)
glass_cropped = im_glass.crop((xs_g.min(), ys_g.min(), xs_g.max(), ys_g.max()))
glass_cropped.save(os.path.join(dst_dir, "windshield_glass.webp"), "WEBP", quality=90)
glass_cropped.save(os.path.join(dst_dir, "windshield_glass.png"), "PNG")
print(f"Windshield glass overlay saved: size={glass_cropped.size}")

print("\nALL COCKPIT ASSETS SUCCESSFULLY PROCESSED AND GENERATED!")
