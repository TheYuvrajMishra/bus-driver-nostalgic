"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDriveStore, EYE_HEIGHT } from "@/lib/drive-store";
import {
  getPatternTexture,
  getGaugeTexture,
  mergeGeos,
  xform,
} from "@/lib/cockpit-assets";

/**
 * DriverRig — architecture.md §6.
 *
 * First-person bus cockpit: the camera sits at driver eye height and the
 * whole cockpit (dashboard, 3D steering wheel, mirrors, windshield frame,
 * dash props, hands) is built from low-poly merged geometry parented to the
 * same rig group, so it never moves relative to the view (only the tiny
 * procedural bob offsets the camera, which reads as life, not drift).
 *
 * Draw calls: ~14 for the entire cockpit (merged trim/dash/glass/accent
 * meshes + 3 wheel meshes + 2 hand meshes + 1 instanced garland).
 */

const DEG = Math.PI / 180;
/** Visual wheel rotation at full steering lock (matches old 2D wheel). */
const WHEEL_VISUAL_RAD = 135 * DEG;

// ---------------------------------------------------------------------------
// static merged geometry
// ---------------------------------------------------------------------------

function buildTrimGeos(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  // dashboard main body
  g.push(xform(B(2.3, 0.62, 0.5), 0, 1.32, -0.55));
  // instrument pod (gauges mount on its driver-facing slope, behind the wheel)
  g.push(xform(B(0.5, 0.14, 0.12), 0, 1.78, -0.66));
  // A-pillars (windshield side frame)
  g.push(xform(B(0.09, 0.48, 0.12), -0.52, 1.87, -0.61, 0.06, 0, 0.1));
  g.push(xform(B(0.09, 0.48, 0.12), 0.52, 1.87, -0.61, 0.06, 0, -0.1));
  // header bar (top windshield frame)
  g.push(xform(B(2.3, 0.14, 0.18), 0, 2.1, -0.62));
  // rear-view mirror frame + hanger
  g.push(xform(B(0.42, 0.16, 0.03), 0, 2.04, -0.6, 0.08));
  g.push(xform(B(0.04, 0.09, 0.03), 0, 2.13, -0.6));
  // side mirror housings + arms
  for (const sx of [-1, 1]) {
    g.push(xform(B(0.05, 0.05, 0.16), sx * 0.44, 1.74, -0.5, 0, sx * 0.5));
    g.push(xform(B(0.15, 0.11, 0.05), sx * 0.5, 1.74, -0.56, 0, sx * 0.55));
  }
  // radio unit body
  g.push(xform(B(0.24, 0.1, 0.12), 0.44, 1.7, -0.6, -0.15));
  // dash buttons (dark bases)
  for (let i = 0; i < 3; i++) {
    g.push(xform(B(0.045, 0.03, 0.045), 0.18 + i * 0.08, 1.715, -0.52));
  }
  return mergeGeos(g);
}

function buildDashTopGeo(): THREE.BufferGeometry {
  // warm dash top pad (slightly warmer than exterior trim)
  return xform(new THREE.BoxGeometry(2.2, 0.09, 0.56), 0, 1.665, -0.58, 0.03);
}

function buildGlassGeos(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  // rear-view mirror glass
  g.push(xform(new THREE.PlaneGeometry(0.38, 0.12), 0, 2.04, -0.582, 0.08));
  // side mirror glass (fake reflection, on the housing's driver-facing side)
  for (const sx of [-1, 1]) {
    const ry = sx * 0.55;
    g.push(
      xform(
        new THREE.PlaneGeometry(0.12, 0.08),
        sx * 0.5 + 0.027 * Math.sin(ry),
        1.74,
        -0.56 + 0.027 * Math.cos(ry),
        0,
        ry
      )
    );
  }
  return mergeGeos(g);
}

function buildAccentGeos(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  // radio knobs
  for (const dx of [-0.07, 0.07]) {
    const knob = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8);
    g.push(xform(knob, 0.44 + dx, 1.7, -0.53, Math.PI / 2 - 0.15));
  }
  // one red button cap
  g.push(xform(new THREE.BoxGeometry(0.04, 0.025, 0.04), 0.18, 1.73, -0.52));
  return mergeGeos(g);
}

function buildIdolGeo(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  // base, body, head — tiny dashboard murti (left of the patterned band)
  g.push(xform(new THREE.CylinderGeometry(0.038, 0.042, 0.025, 8), -0.62, 1.72, -0.62));
  g.push(xform(new THREE.ConeGeometry(0.032, 0.075, 8), -0.62, 1.77, -0.62));
  g.push(xform(new THREE.SphereGeometry(0.026, 8, 6), -0.62, 1.825, -0.62));
  return mergeGeos(g);
}

function buildSpokeGeo(): THREE.BufferGeometry {
  const g: THREE.BufferGeometry[] = [];
  for (const aDeg of [90, 210, 330]) {
    const a = aDeg * DEG;
    g.push(
      xform(
        new THREE.BoxGeometry(0.055, 0.23, 0.035),
        Math.cos(a) * 0.135,
        Math.sin(a) * 0.135,
        0,
        0,
        0,
        a - Math.PI / 2
      )
    );
  }
  return mergeGeos(g);
}

// garland tassels: 16 along the header + 3 hanging from the mirror
const GARLAND_COUNT = 19;
const GARLAND_COLORS = ["#e8503a", "#f5b942", "#e8823f", "#7bc96f", "#e86a9a"];

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export default function DriverRig() {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const garland = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const trim = buildTrimGeos();
    const dashTop = buildDashTopGeo();
    const glass = buildGlassGeos();
    const accent = buildAccentGeos();
    const idol = buildIdolGeo();
    const spokes = buildSpokeGeo();
    const rim = new THREE.TorusGeometry(0.26, 0.032, 8, 24);
    const hub = xform(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 12), 0, 0, 0, Math.PI / 2);
    const hubCap = xform(new THREE.CylinderGeometry(0.032, 0.032, 0.075, 8), 0, 0, 0, Math.PI / 2);
    // hands: fists (skin) + forearms (sleeve), in wheel-tilt space
    const fistL = xform(new THREE.BoxGeometry(0.1, 0.085, 0.1), -0.225, 0.135, 0.03, 0, 0, 0.25);
    const fistR = xform(new THREE.BoxGeometry(0.1, 0.085, 0.1), 0.225, 0.135, 0.03, 0, 0, -0.25);
    const fists = mergeGeos([fistL, fistR]);
    const armL = xform(new THREE.BoxGeometry(0.095, 0.44, 0.095), -0.31, -0.1, 0.1, 0.25, 0, 0.45);
    const armR = xform(new THREE.BoxGeometry(0.095, 0.44, 0.095), 0.31, -0.1, 0.1, 0.25, 0, -0.45);
    const arms = mergeGeos([armL, armR]);
    const tassel = xform(new THREE.ConeGeometry(0.022, 0.07, 6), 0, 0, 0, Math.PI);
    return { trim, dashTop, glass, accent, idol, spokes, rim, hub, hubCap, fists, arms, tassel };
  }, []);

  useLayoutEffect(() => {
    const mesh = garland.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let i = 0;
    for (let k = 0; k < 16; k++) {
      const x = -0.8 + (k / 15) * 1.6;
      m.makeTranslation(x, 1.995, -0.6);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(GARLAND_COLORS[i % GARLAND_COLORS.length]));
      i++;
    }
    for (const dx of [-0.09, 0, 0.09]) {
      m.makeTranslation(dx, 1.925, -0.585);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(GARLAND_COLORS[(i + 2) % GARLAND_COLORS.length]));
      i++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const { lateralOffset, steeringAngle, speed } = useDriveStore.getState();
    const t = state.clock.elapsedTime;
    const speedK = speed / 14;
    const bobY = Math.sin(t * 7.0) * 0.018 * speedK;
    const bobX = Math.sin(t * 4.3) * 0.012 * speedK;
    group.current?.position.set(lateralOffset, 0, 0);
    camera.position.set(lateralOffset + bobX, EYE_HEIGHT + bobY, 0);
    camera.lookAt(lateralOffset + bobX * 2, 1.45, -40);
    camera.rotateZ(-steeringAngle * 0.025); // gentle lean into the turn
    if (spinner.current) {
      spinner.current.rotation.z = -steeringAngle * WHEEL_VISUAL_RAD;
    }
  });

  const patternMap = getPatternTexture();
  const gaugeMap = getGaugeTexture();

  return (
    <group ref={group}>
      {/* merged dark trim: dash body, binnacle, pillars, header, mirrors, radio */}
      <mesh geometry={assets.trim}>
        <meshLambertMaterial color="#2a242c" />
      </mesh>
      {/* warm dash top pad */}
      <mesh geometry={assets.dashTop}>
        <meshLambertMaterial color="#7a5230" />
      </mesh>
      {/* decorative geometric band lying on the dash top (faces the driver) */}
      <mesh position={[-0.1, 1.715, -0.66]} rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
        <planeGeometry args={[0.9, 0.13]} />
        <meshLambertMaterial map={patternMap ?? undefined} color="#ffffff" />
      </mesh>
      {/* instrument cluster (backlit dials) on the pod behind the wheel */}
      <mesh position={[0, 1.78, -0.588]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[0.42, 0.12]} />
        <meshBasicMaterial map={gaugeMap ?? undefined} color="#ffffff" />
      </mesh>
      {/* fake mirror glass: rear-view + side mirrors */}
      <mesh geometry={assets.glass}>
        <meshLambertMaterial color="#1d2636" emissive="#33456a" emissiveIntensity={0.7} />
      </mesh>
      {/* radio display glow */}
      <mesh position={[0.44, 1.715, -0.535]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[0.11, 0.035]} />
        <meshBasicMaterial color="#8df0a8" />
      </mesh>
      {/* orange accents: radio knobs + red button */}
      <mesh geometry={assets.accent}>
        <meshLambertMaterial color="#e8823f" />
      </mesh>
      {/* dashboard idol */}
      <mesh geometry={assets.idol}>
        <meshLambertMaterial color="#d9a441" emissive="#5c3d10" emissiveIntensity={0.35} />
      </mesh>
      {/* hanging garland / tassels */}
      <instancedMesh
        ref={garland}
        args={[assets.tassel, undefined, GARLAND_COUNT]}
        frustumCulled={false}
      >
        <meshLambertMaterial color="#ffffff" />
      </instancedMesh>

      {/* steering wheel: tilt group -> spinner (rotates with steeringAngle) */}
      <group position={[0, 1.5, -0.5]} rotation={[-0.3, 0, 0]}>
        <group ref={spinner}>
          <mesh geometry={assets.rim}>
            <meshLambertMaterial color="#1f9aa8" />
          </mesh>
          <mesh geometry={assets.spokes}>
            <meshLambertMaterial color="#e8823f" />
          </mesh>
          <mesh geometry={assets.hub}>
            <meshLambertMaterial color="#2a242c" />
          </mesh>
          <mesh geometry={assets.hubCap}>
            <meshLambertMaterial color="#e8823f" />
          </mesh>
        </group>
        {/* hands grip the wheel (static in tilt space, wheel spins beneath) */}
        <mesh geometry={assets.fists}>
          <meshLambertMaterial color="#c98d64" />
        </mesh>
        <mesh geometry={assets.arms}>
          <meshLambertMaterial color="#2f3d5c" />
        </mesh>
      </group>
    </group>
  );
}
