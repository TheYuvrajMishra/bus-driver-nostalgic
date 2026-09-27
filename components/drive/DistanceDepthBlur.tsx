"use client";

import { useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tDepth;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec2 resolution;
  uniform float blurStart;
  uniform float blurEnd;
  uniform float maxRadius;

  varying vec2 vUv;

  float getLinearDepth(float depth) {
    float z_ndc = 2.0 * depth - 1.0;
    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z_ndc * (cameraFar - cameraNear));
  }

  void main() {
    float depthVal = texture2D(tDepth, vUv).r;
    float linearDist = depthVal >= 0.9999 ? cameraFar : getLinearDepth(depthVal);
    
    // Smooth gradual unblur -> blur transition curve
    float factor = clamp((linearDist - blurStart) / (blurEnd - blurStart), 0.0, 1.0);
    factor = smoothstep(0.0, 1.0, factor);

    vec4 baseColor = texture2D(tDiffuse, vUv);

    if (factor < 0.005) {
      gl_FragColor = baseColor;
      return;
    }

    vec2 texel = 1.0 / resolution;
    float r = factor * maxRadius;

    // 13-tap Poisson-disc / Gaussian blur kernel for silky distance defocus
    vec4 sum = baseColor * 0.18;
    sum += texture2D(tDiffuse, vUv + vec2( 0.0,   1.0) * texel * r) * 0.11;
    sum += texture2D(tDiffuse, vUv + vec2( 0.0,  -1.0) * texel * r) * 0.11;
    sum += texture2D(tDiffuse, vUv + vec2( 1.0,   0.0) * texel * r) * 0.11;
    sum += texture2D(tDiffuse, vUv + vec2(-1.0,   0.0) * texel * r) * 0.11;
    
    sum += texture2D(tDiffuse, vUv + vec2( 0.707,  0.707) * texel * r) * 0.075;
    sum += texture2D(tDiffuse, vUv + vec2(-0.707,  0.707) * texel * r) * 0.075;
    sum += texture2D(tDiffuse, vUv + vec2( 0.707, -0.707) * texel * r) * 0.075;
    sum += texture2D(tDiffuse, vUv + vec2(-0.707, -0.707) * texel * r) * 0.075;

    sum += texture2D(tDiffuse, vUv + vec2( 0.383,  0.924) * texel * (r * 0.6)) * 0.045;
    sum += texture2D(tDiffuse, vUv + vec2(-0.383,  0.924) * texel * (r * 0.6)) * 0.045;
    sum += texture2D(tDiffuse, vUv + vec2( 0.924,  0.383) * texel * (r * 0.6)) * 0.045;
    sum += texture2D(tDiffuse, vUv + vec2(-0.924, -0.383) * texel * (r * 0.6)) * 0.045;

    gl_FragColor = sum;
  }
`;

/**
 * DistanceDepthBlur:
 * Cinematic depth-based atmospheric lens blur pass.
 * - Near & mid-distance road, vehicle, trees, traffic, and cockpit stay in razor-sharp crystal focus.
 * - Distant mountains, horizon, and faraway road curves softly defocus into a dreamy atmospheric blur.
 * - Approaching objects smoothly and gradually unblur as the player drives closer to them.
 */
export default function DistanceDepthBlur() {
  const { gl, scene, camera, size } = useThree();

  const renderTarget = useMemo(() => {
    const depthTexture = new THREE.DepthTexture(size.width, size.height);
    depthTexture.type = THREE.UnsignedIntType;
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthTexture: depthTexture,
    });
    return target;
  }, []);

  const postScene = useMemo(() => {
    const s = new THREE.Scene();
    const geom = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        blurStart: { value: 55.0 }, // In sharp focus up to 55m
        blurEnd: { value: 240.0 },   // Gradual fade to maximum soft blur at 240m+
        maxRadius: { value: 4.5 },   // Soft defocus kernel radius
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    s.add(mesh);
    return { scene: s, material: mat, mesh };
  }, [camera.near, camera.far]);

  const postCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    renderTarget.setSize(w, h);
    postScene.material.uniforms.resolution.value.set(w, h);
  }, [size, gl, renderTarget, postScene.material]);

  useEffect(() => {
    return () => {
      renderTarget.dispose();
      postScene.material.dispose();
    };
  }, [renderTarget, postScene.material]);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    postScene.material.uniforms.cameraNear.value = cam.near;
    postScene.material.uniforms.cameraFar.value = cam.far;
    postScene.material.uniforms.tDiffuse.value = renderTarget.texture;
    postScene.material.uniforms.tDepth.value = renderTarget.depthTexture;

    // 1. Render main 3D scene with shadows and depth to offscreen buffer
    gl.setRenderTarget(renderTarget);
    gl.clear();
    gl.render(scene, camera);

    // 2. Render post-processing quad with distance blur to screen canvas
    gl.setRenderTarget(null);
    gl.render(postScene.scene, postCamera);
  }, 1);

  return null;
}
