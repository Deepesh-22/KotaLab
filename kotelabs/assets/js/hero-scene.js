/**
 * KotaLabs — hero-scene.js
 *
 * A persistent Three.js particle galaxy behind the page:
 *  - warm-white point particles form a layered spiral with a bright core
 *  - scroll gradually loosens the spiral into a wide field of dust
 *  - subtle rotation, twinkle and cursor repulsion keep the field alive
 *
 * No WebGL → the CSS galaxy fallback remains. Reduced-motion users never load
 * this module; the tab-hidden render loop is paused.
 */

import * as THREE from "../../vendor/three.module.min.js";

const canvas = document.getElementById("scene");
if (canvas) init(canvas);

function init(canvas) {
  const smallScreen = window.matchMedia("(max-width: 860px)").matches;
  const lowPower =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !smallScreen,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
    });
  } catch (err) {
    canvas.remove();
    return;
  }
  if (!renderer.getContext()) {
    canvas.remove();
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const fov = 38;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 120);
  camera.position.set(0, 0, 6.2);

  const group = new THREE.Group();
  scene.add(group);

  /* ================================================================== */
  /* 1. Spiral galaxy particles                                         */
  /* ================================================================== */
  const COUNT = lowPower ? 7600 : smallScreen ? 15000 : 32000;
  const galaxy = new Float32Array(COUNT * 3);
  const scatter = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);

  const rand = Math.random;
  const TAU = Math.PI * 2;
  const ARM_COUNT = 3;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  for (let i = 0; i < COUNT; i++) {
    const core = rand() < 0.16;
    const halo = !core && rand() < 0.055;
    let x, y, z, brightness;

    if (core) {
      // Dense, gently glowing bulge at the centre of the disk.
      const angle = rand() * TAU;
      const radius = Math.sqrt(rand()) * 0.58;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 0.62;
      z = (rand() + rand() + rand() - 1.5) * 0.16;
      brightness = 1.05 + rand() * 0.8;
    } else if (halo) {
      // A sparse, imperfect outer halo gives the spiral a dusty edge.
      const angle = rand() * TAU;
      const radius = 1.65 + rand() * 1.15;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 0.56;
      z = (rand() + rand() + rand() - 1.5) * 0.17;
      brightness = 0.38 + rand() * 0.48;
    } else {
      // Three logarithmically winding arms, with soft width and radial grain.
      const arm = Math.floor(rand() * ARM_COUNT);
      const radius = 0.28 + Math.pow(rand(), 0.72) * 2.15;
      const armAngle = (arm / ARM_COUNT) * TAU + radius * 2.65;
      const spread = (rand() + rand() + rand() - 1.5) * (0.08 + radius * 0.045);
      const angle = armAngle + spread;
      const radialGrain = (rand() - 0.5) * (0.07 + radius * 0.04);
      const r = radius + radialGrain;
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r * 0.58;
      z = (rand() + rand() + rand() - 1.5) * (0.075 + radius * 0.025);
      brightness = 0.78 + rand() * 0.86;
    }

    const j = i * 3;
    galaxy[j] = x;
    galaxy[j + 1] = y;
    galaxy[j + 2] = z;

    // Full-screen normalized destinations; their world size tracks the viewport.
    scatter[j] = (rand() + rand() - 1) * 1.72;
    scatter[j + 1] = (rand() + rand() - 1) * 1.72;
    scatter[j + 2] = (rand() + rand() - 1) * 1.25;

    // High-energy ivory points, warming to pale gold around the centre.
    const warmth = rand();
    const coreWhite = core ? 0.12 : 0;
    colors[j] = (0.98 + warmth * 0.18) * brightness;
    colors[j + 1] = (0.88 + warmth * 0.16 + coreWhite) * brightness;
    colors[j + 2] = (0.72 + warmth * 0.2 + coreWhite * 1.1) * brightness;

    sizes[i] = core && rand() < 0.16 ? 0.028 + rand() * 0.018 : 0.007 + rand() * 0.013;
    seeds[i] = rand();
  }

  const geometry = new THREE.BufferGeometry();
  // Three's renderer uses `position` to determine the draw count for Points.
  geometry.setAttribute("position", new THREE.BufferAttribute(galaxy, 3));
  geometry.setAttribute("aGalaxy", new THREE.BufferAttribute(galaxy, 3));
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24);

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uOpen: { value: 0 },
    uSpread: { value: new THREE.Vector2(1, 1) },
    uPixelScale: { value: 1 },
    uPointer: { value: new THREE.Vector3(20, 20, 0) },
    uAlpha: { value: 1 },
  };

  const vertexShader = /* glsl */ `
    precision highp float;

    attribute vec3 aGalaxy;
    attribute vec3 aScatter;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aSeed;

    uniform float uTime;
    uniform float uScroll;
    uniform float uOpen;
    uniform vec2 uSpread;
    uniform float uPixelScale;
    uniform vec3 uPointer;

    varying vec3 vColor;
    varying float vSeed;
    varying float vFade;

    void main() {
      float spin = uTime * 0.035 + uScroll * 0.16;
      float cs = cos(spin);
      float sn = sin(spin);
      vec2 turned = mat2(cs, -sn, sn, cs) * aGalaxy.xy;
      vec3 inGalaxy = vec3(turned, aGalaxy.z);
      inGalaxy.z += sin(uTime * 0.55 + aSeed * 6.2831) * 0.012;

      vec3 inScatter = vec3(aScatter.xy * uSpread, aScatter.z * 2.6);
      vec3 pointPosition = mix(inGalaxy, inScatter, uOpen);

      // A small, soft cursor wake. It fades as the galaxy disperses.
      vec2 away = pointPosition.xy - uPointer.xy;
      float distanceToPointer = length(away);
      float wake = (1.0 - smoothstep(0.0, 0.86, distanceToPointer)) * (1.0 - uOpen * 0.55);
      pointPosition.xy += normalize(away + vec2(0.0001)) * wake * 0.15;

      vec4 viewPosition = modelViewMatrix * vec4(pointPosition, 1.0);
      gl_Position = projectionMatrix * viewPosition;
      gl_PointSize = clamp(aSize * uPixelScale / max(1.0, -viewPosition.z), 1.4, 12.0);

      vColor = aColor;
      vSeed = aSeed;
      vFade = mix(1.0, 0.72, uOpen);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform float uAlpha;

    varying vec3 vColor;
    varying float vSeed;
    varying float vFade;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float radius = length(point) * 2.0;
      float disc = 1.0 - smoothstep(0.34, 0.84, radius);
      float halo = exp(-radius * 3.2) * 0.42;
      float alpha = max(disc, halo);
      if (alpha <= 0.008) discard;

      float twinkle = 0.88 + 0.22 * sin(uTime * (0.55 + vSeed * 2.8) + vSeed * 6.2831);
      float hotCore = 1.0 - smoothstep(0.0, 0.42, radius);
      vec3 color = vColor * twinkle * (1.0 + hotCore * 0.3);
      gl_FragColor = vec4(color, alpha * vFade * uAlpha * twinkle);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  group.add(points);

  /* ================================================================== */
  /* 2. Layout                                                           */
  /* ================================================================== */
  const halfFov = THREE.MathUtils.degToRad(fov * 0.5);
  const layout = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mobile = w < 860;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8);

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uSpread.value.set(
      camera.position.z * Math.tan(halfFov) * camera.aspect * 0.94,
      camera.position.z * Math.tan(halfFov) * 0.94
    );
    uniforms.uPixelScale.value = (h * pixelRatio) / (2 * Math.tan(halfFov));

    group.userData.mobile = mobile;
    group.userData.shift = mobile ? 0 : Math.min(w / h, 1.85) * 0.78;
  };
  layout();

  /* ================================================================== */
  /* 3. Pointer + scroll                                                 */
  /* ================================================================== */
  const pointer = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let targetProgress = 0;
  let pageProgress = 0;

  window.addEventListener("pointermove", (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const readScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = Math.min(1, Math.max(0, window.scrollY / max));
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  /* ================================================================== */
  /* 4. Animation                                                        */
  /* ================================================================== */
  const clock = new THREE.Clock();
  let rafId = null;
  let visible = true;

  const smoothstep = (edge0, edge1, value) => {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  function draw(time) {
    pageProgress += (targetProgress - pageProgress) * 0.055;
    smooth.x += (pointer.x - smooth.x) * 0.045;
    smooth.y += (pointer.y - smooth.y) * 0.045;

    const p = pageProgress;
    const open = smoothstep(0.015, 0.72, p);
    const mobile = group.userData.mobile;
    const shift = group.userData.shift || 0;

    uniforms.uTime.value = time;
    uniforms.uScroll.value = p;
    uniforms.uOpen.value = open;
    uniforms.uAlpha.value = 1.0;

    group.position.x = mobile ? 0 : shift * (1.0 - open * 0.78);
    group.position.y = (mobile ? 0.48 : 0.08) + open * 0.08;
    group.rotation.x = 0.11 + smooth.y * 0.055;
    group.rotation.y = smooth.x * 0.07;
    group.rotation.z = Math.sin(time * 0.055) * 0.012 + p * 0.035;

    const viewHalfHeight = camera.position.z * Math.tan(halfFov);
    const viewHalfWidth = viewHalfHeight * camera.aspect;
    uniforms.uPointer.value.set(
      smooth.x * viewHalfWidth - group.position.x,
      -smooth.y * viewHalfHeight - group.position.y,
      0
    );

    // Keep the hero crisp; the scattered field remains visible, but lighter,
    // while the rest of the page scrolls over it.
    canvas.style.opacity = String(1.0 - open * 0.22);
    renderer.render(scene, camera);
  }

  function loop() {
    draw(clock.getElapsedTime());
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }
  function start() {
    if (rafId === null && visible && !document.hidden) loop();
  }

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    canvas.classList.remove("is-ready");
    document.body.classList.remove("has-webgl");
  });

  renderer.compile(scene, camera);
  draw(0.4);
  canvas.classList.add("is-ready");
  document.body.classList.add("has-webgl");
  start();

  if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") {
    window.__kotelabsHero = { scene, camera, renderer, group, points, uniforms, count: COUNT };
  }
}
