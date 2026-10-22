/**
 * KotaLabs — hero-scene.js  (v4, persistent scene)
 *
 * A single WebGL layer that lives behind the entire page:
 *  - ~14k instanced pyramidal shards forming an organic two-lobed mass
 *  - a "sprinkle" field of glowing motes drifting around it
 *  - scroll drives everything: the mass opens out, drifts, and the palette
 *    grades from lime → teal → indigo → magenta → amber → lime
 *  - cursor creates a local dent in the mass
 *
 * Guards: no WebGL → canvas removed (CSS gradient stays). Context lost → stop.
 * Tab hidden → paused. prefers-reduced-motion → never loaded at all.
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, 0, 5.6);

  const group = new THREE.Group();
  scene.add(group);

  /* ================================================================== */
  /* 1. The mass                                                        */
  /* ================================================================== */
  const COUNT = lowPower ? 4200 : smallScreen ? 6800 : 14000;

  const hash = (x, y, z) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise3 = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);
    const mix = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
    return mix(
      mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v),
      mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v),
      w
    );
  };

  const offsets = new Float32Array(COUNT * 3);
  const quats = new Float32Array(COUNT * 4);
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const v3 = new THREE.Vector3();

  for (let i = 0; i < COUNT; i++) {
    const t = (i + 0.5) / COUNT;
    const y = 1 - t * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * GOLDEN;
    let x = Math.cos(phi) * r;
    let z = Math.sin(phi) * r;

    // clean fissure down the middle → reads as two lobes
    const fissure = 0.11;
    if (Math.abs(x) < fissure) x = Math.sign(x || 1) * fissure;

    const n1 = noise3(x * 1.9 + 3.1, y * 1.9, z * 1.9);
    const n2 = noise3(x * 4.7, y * 4.7 + 8.2, z * 4.7);
    const radius = 1 + (n1 - 0.5) * 0.34 + (n2 - 0.5) * 0.1;
    const inner = i % 5 === 0 ? 0.5 + Math.random() * 0.42 : 1 - Math.random() * 0.06;

    v3.set(x * radius * inner, y * radius * inner * 0.92, z * radius * inner * 0.94);

    offsets[i * 3] = v3.x;
    offsets[i * 3 + 1] = v3.y;
    offsets[i * 3 + 2] = v3.z;

    eul.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    q.setFromEuler(eul);
    quats[i * 4] = q.x;
    quats[i * 4 + 1] = q.y;
    quats[i * 4 + 2] = q.z;
    quats[i * 4 + 3] = q.w;

    scales[i] = 0.019 + Math.random() * 0.042;
    seeds[i] = Math.random();
  }

  const base = new THREE.ConeGeometry(0.62, 1.5, 4, 1, false);
  base.deleteAttribute("uv");
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.setAttribute("normal", base.getAttribute("normal"));
  geometry.instanceCount = COUNT;
  geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute("aQuat", new THREE.InstancedBufferAttribute(quats, 4));
  geometry.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

  /* ================================================================== */
  /* 2. Sprinkle field — glowing motes around the mass                   */
  /* ================================================================== */
  const SPARKS = lowPower ? 260 : smallScreen ? 420 : 900;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  const sparkSeed = new Float32Array(SPARKS);
  const paletteStops = [
    [0.788, 0.949, 0.302], // lime
    [0.36, 0.95, 0.72], // teal
    [0.42, 0.56, 1.0], // indigo
    [0.79, 0.45, 1.0], // magenta
    [1.0, 0.72, 0.34], // amber
  ];
  for (let i = 0; i < SPARKS; i++) {
    const rad = 1.9 + Math.random() * 5.4;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    sparkPos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
    sparkPos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th) * 0.75;
    sparkPos[i * 3 + 2] = rad * Math.cos(ph) * 0.8;

    const c = paletteStops[i % paletteStops.length];
    sparkCol[i * 3] = c[0];
    sparkCol[i * 3 + 1] = c[1];
    sparkCol[i * 3 + 2] = c[2];
    sparkSeed[i] = Math.random();
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: smallScreen ? 0.035 : 0.028,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  group.add(sparks);

  /* ================================================================== */
  /* 3. Shaders                                                         */
  /* ================================================================== */
  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uOpen: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uRepel: { value: new THREE.Vector3(0, 0, 1.2) },
    uBg: { value: new THREE.Color(0x050506) },
  };

  const vertexShader = /* glsl */ `
    precision highp float;

    attribute vec3 aOffset;
    attribute vec4 aQuat;
    attribute float aScale;
    attribute float aSeed;

    uniform float uTime;
    uniform float uScroll;
    uniform float uOpen;
    uniform vec2 uPointer;
    uniform vec3 uRepel;

    varying vec3 vNormalW;
    varying vec3 vViewPos;
    varying float vSeed;
    varying float vDepth;

    vec3 rotateByQuat(vec3 v, vec4 q) {
      return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }

    void main() {
      vSeed = aSeed;

      float breathe = 1.0 + 0.045 * sin(uTime * 0.7 + aSeed * 6.2831);
      vec3 offset = aOffset * breathe;

      float swirl = uTime * 0.05 + uScroll * 1.6;
      float cs = cos(swirl), sn = sin(swirl);
      offset.xz = mat2(cs, -sn, sn, cs) * offset.xz;

      // the form opens out as the page is scrolled
      vec3 outward = normalize(aOffset + 0.0001);
      offset += outward * uOpen * (0.6 + aSeed * 0.9);

      // local dent around the cursor
      vec3 toShard = offset - uRepel;
      float dist = length(toShard);
      float falloff = smoothstep(0.9, 0.0, dist);
      offset += normalize(toShard + 0.0001) * falloff * 0.42 * (0.4 + aSeed);

      vec3 transformed = rotateByQuat(position * aScale, aQuat);
      vec3 nrm = rotateByQuat(normal, aQuat);

      vec4 world = modelMatrix * vec4(offset + transformed, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * nrm);

      vec4 view = viewMatrix * world;
      vViewPos = view.xyz;
      vDepth = -view.z;

      gl_Position = projectionMatrix * view;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float uScroll;
    uniform float uTime;
    uniform vec3 uBg;

    varying vec3 vNormalW;
    varying vec3 vViewPos;
    varying float vSeed;
    varying float vDepth;

    // colour grade: lime → teal → indigo → magenta → amber → lime
    vec3 palette(float t) {
      vec3 c0 = vec3(0.788, 0.949, 0.302);
      vec3 c1 = vec3(0.360, 0.950, 0.720);
      vec3 c2 = vec3(0.420, 0.560, 1.000);
      vec3 c3 = vec3(0.790, 0.450, 1.000);
      vec3 c4 = vec3(1.000, 0.720, 0.340);

      t = fract(t);
      if (t < 0.2) return mix(c0, c1, smoothstep(0.0, 0.2, t));
      if (t < 0.4) return mix(c1, c2, smoothstep(0.2, 0.4, t));
      if (t < 0.6) return mix(c2, c3, smoothstep(0.4, 0.6, t));
      if (t < 0.8) return mix(c3, c4, smoothstep(0.6, 0.8, t));
      return mix(c4, c0, smoothstep(0.8, 1.0, t));
    }

    void main() {
      vec3 n = normalize(vNormalW);
      vec3 viewDir = normalize(-vViewPos);

      vec3 key = normalize(vec3(0.55, 0.8, 0.6));
      vec3 fill = normalize(vec3(-0.7, -0.15, 0.5));
      float kd = max(dot(n, key), 0.0);
      float fd = max(dot(n, fill), 0.0);
      float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.2);

      vec3 cool = palette(uScroll + 0.42);
      vec3 warm = palette(uScroll);
      vec3 baseCol = mix(cool, warm, smoothstep(0.42, 1.0, vSeed));

      vec3 color = baseCol * (0.07 + kd * 0.74 + fd * 0.22);
      color += palette(uScroll + 0.12) * rim * (0.18 + vSeed * 0.5);

      // depth fade to the page background
      float fog = smoothstep(10.5, 4.4, vDepth);
      color = mix(uBg, color, fog * 0.96 + 0.04);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
    depthTest: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  group.add(mesh);

  /* ================================================================== */
  /* 4. Layout — the canvas is fixed behind the whole page               */
  /* ================================================================== */
  const layout = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mobile = w < 860;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    group.userData.mobile = mobile;
    group.userData.shift = mobile ? 0 : Math.min(w / h, 1.85) * 0.78;
  };
  layout();

  /* ================================================================== */
  /* 5. Input                                                           */
  /* ================================================================== */
  const pointer = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let pageProgress = 0;
  let targetProgress = 0;

  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  const readScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = Math.min(1, Math.max(0, window.scrollY / max));
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  // Nudge CSS so the page background grades along with the scene.
  const root = document.documentElement;
  const applyCssGrade = (p) => {
    root.style.setProperty("--grade", p.toFixed(4));
    // hue rotates 0 → 150deg across the page, then eases back
    const hue = Math.sin(p * Math.PI) * 78;
    root.style.setProperty("--grade-hue", hue.toFixed(1) + "deg");
  };

  /* ================================================================== */
  /* 6. Loop                                                            */
  /* ================================================================== */
  const clock = new THREE.Clock();
  let rafId = null;
  let visible = true;

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function draw(t) {
    pageProgress += (targetProgress - pageProgress) * 0.06;
    const p = pageProgress;

    smooth.x += (pointer.x - smooth.x) * 0.05;
    smooth.y += (pointer.y - smooth.y) * 0.05;

    uniforms.uTime.value = t;
    uniforms.uScroll.value = p;
    uniforms.uOpen.value = easeInOut(p) * 0.85;

    uniforms.uRepel.value.set(smooth.x * 2.2, -smooth.y * 1.6, 1.2);

    const mobile = group.userData.mobile;
    const shift = group.userData.shift || 0;

    // Hero: the mass sits right of the copy.
    // Deeper in the page: it rises out of the way, shrinks back and fades, so it
    // becomes an ambient sprinkle around the content — never on top of the copy.
    const heroWeight = Math.max(0, 1 - p * 3.4);
    const settle = Math.min(1, Math.max(0, (p - 0.02) / 0.26)); // 0 → 1 over the first quarter page

    group.position.x = mobile ? 0 : shift * (0.18 + heroWeight * 0.82);
    group.position.y = (mobile ? 0.75 : 0.1) + settle * (mobile ? 2.4 : 2.9);
    group.scale.setScalar((mobile ? 0.9 : 1.0) * (1 - settle * 0.26));

    group.rotation.y = t * 0.09 + smooth.x * 0.32 + p * 0.9;
    group.rotation.x = Math.sin(t * 0.2) * 0.06 + smooth.y * 0.16;
    group.rotation.z = Math.sin(t * 0.13) * 0.03 + p * 0.2;

    sparks.rotation.y = -t * 0.03 + p * 0.8;
    sparks.rotation.x = Math.sin(t * 0.1) * 0.06;
    sparkMat.opacity = 0.72 * (1 - settle * 0.25);

    camera.position.z = 5.6 + settle * 1.1;
    camera.lookAt(0, 0, 0);

    // Readability first: full strength in the hero, ~0.3 through the content.
    const fade = 1 - settle * 0.72;
    canvas.style.opacity = String(fade);

    applyCssGrade(p);
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

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stop();
    canvas.classList.remove("is-ready");
  });

  /* ================================================================== */
  /* 7. Go                                                              */
  /* ================================================================== */
  renderer.compile(scene, camera);
  draw(0.4);
  canvas.classList.add("is-ready");
  start();

  if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:") {
    window.__kotelabsHero = { scene, camera, renderer, group, sparks, uniforms, count: COUNT, sparksCount: SPARKS };
  }
}
