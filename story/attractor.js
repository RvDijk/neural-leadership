/* ──────────────────────────────────────────────────────────────────
   attractor.js — Three.js double-well potential landscape with a
   ball that can be perturbed across the saddle into a second basin.
   Loaded lazily via dynamic import; Three from esm.sh CDN (static-host friendly).
   ────────────────────────────────────────────────────────────────── */

import { sfx } from './audio.js';

export async function mountAttractor(host) {
  // Dynamic import — only loads if user reaches this scene
  let THREE;
  try {
    THREE = await import('https://esm.sh/three@0.160.0');
  } catch (err) {
    host.innerHTML = '<p style="color:var(--ink-2);padding:1rem;text-align:center;">3D scene requires an internet connection (Three.js loaded on demand).</p>';
    return;
  }

  const W = host.clientWidth, H = host.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.domElement.classList.add('attractor-canvas');
  host.appendChild(renderer.domElement);

  // Hint
  const hint = document.createElement('div');
  hint.className = 'attractor-hint';
  hint.textContent = 'drag to rotate · click to perturb the ball';
  host.appendChild(hint);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(0, 4.5, 7);
  camera.lookAt(0, 0, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0x404060, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 8, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9aa7ff, 0.6);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  // Double-well potential: z = (x^2 - 1)^2 + 0.4*y^2 - shifted so basins sit at z=0
  // Healthy basin at (-1, 0), toxic basin at (+1, 0) with slightly deeper well
  const potential = (x, y) => {
    const a = (x * x - 1) ** 2;
    const tilt = 0.15 * x;     // slight asymmetry — toxic basin slightly deeper
    return (a + 0.5 * y * y - tilt) * 0.6;
  };
  // Gradient (numerical, used for ball physics)
  const grad = (x, y) => {
    const h = 0.001;
    return [
      (potential(x + h, y) - potential(x - h, y)) / (2 * h),
      (potential(x, y + h) - potential(x, y - h)) / (2 * h),
    ];
  };

  // Build surface
  const seg = 80;
  const range = 2.4;
  const geom = new THREE.PlaneGeometry(range * 2, range * 2, seg, seg);
  const colors = [];
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const z = potential(x, y);
    pos.setZ(i, -z);
    // Color: blueish in healthy basin, warm in toxic basin
    const t = (x + 1) / 2; // -1..1 → 0..1
    const r = THREE.MathUtils.lerp(0.6, 1.0, Math.max(0, Math.min(1, t)));
    const g = THREE.MathUtils.lerp(0.65, 0.6, Math.max(0, Math.min(1, t)));
    const b = THREE.MathUtils.lerp(1.0,  0.42, Math.max(0, Math.min(1, t)));
    const dim = 0.4 + Math.max(0, 1 - Math.abs(z) * 0.8) * 0.6;
    colors.push(r * dim, g * dim, b * dim);
  }
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();
  geom.rotateX(-Math.PI / 2);

  const surface = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false,
      side: THREE.DoubleSide,
    })
  );
  scene.add(surface);

  // Wireframe overlay
  const wire = new THREE.Mesh(
    geom.clone(),
    new THREE.MeshBasicMaterial({ color: 0x6f779a, wireframe: true, transparent: true, opacity: 0.12 })
  );
  scene.add(wire);

  // Ball (starts in healthy basin at x = -1)
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x7fffa3,
      emissive: 0x4cb274,
      roughness: 0.3,
      metalness: 0.5,
    })
  );
  let ballState = { x: -1, y: 0, vx: 0, vy: 0 };
  ball.position.set(ballState.x, -potential(ballState.x, ballState.y) + 0.13, ballState.y);
  scene.add(ball);

  // Drag-to-rotate camera
  let rotating = false, lastX = 0, lastY = 0, theta = 0, phi = 0.55;
  const updateCamera = () => {
    const r = 8;
    camera.position.x = r * Math.cos(phi) * Math.sin(theta);
    camera.position.z = r * Math.cos(phi) * Math.cos(theta);
    camera.position.y = r * Math.sin(phi);
    camera.lookAt(0, 0, 0);
  };
  updateCamera();
  renderer.domElement.addEventListener('pointerdown', e => {
    rotating = true; lastX = e.clientX; lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!rotating) return;
    theta -= (e.clientX - lastX) * 0.008;
    phi   += (e.clientY - lastY) * 0.005;
    phi = Math.max(0.2, Math.min(1.4, phi));
    lastX = e.clientX; lastY = e.clientY;
    updateCamera();
  });
  renderer.domElement.addEventListener('pointerup', e => {
    rotating = false;
    if (Math.abs(e.movementX || 0) < 2 && Math.abs(e.movementY || 0) < 2) {
      // Treat as click → perturb
      perturb();
    }
  });

  let perturbStrength = 1.2;
  function perturb() {
    // Apply a random velocity kick. Each successive click grows stronger until basin escape.
    const angle = Math.random() * Math.PI * 2;
    ballState.vx += Math.cos(angle) * perturbStrength;
    ballState.vy += Math.sin(angle) * perturbStrength;
    perturbStrength = Math.min(perturbStrength * 1.1, 3.5);
    sfx.perturb();
  }

  // Physics loop
  const friction = 0.92;
  const dt = 1 / 60;
  function step() {
    const [gx, gy] = grad(ballState.x, ballState.y);
    ballState.vx += -gx * 4 * dt;
    ballState.vy += -gy * 4 * dt;
    ballState.vx *= friction;
    ballState.vy *= friction;
    ballState.x += ballState.vx * dt;
    ballState.y += ballState.vy * dt;
    // Clamp
    ballState.x = Math.max(-2.2, Math.min(2.2, ballState.x));
    ballState.y = Math.max(-2.2, Math.min(2.2, ballState.y));
    const z = -potential(ballState.x, ballState.y) + 0.13;
    ball.position.set(ballState.x, z, ballState.y);
    // Color flip if in toxic basin
    const target = ballState.x > 0 ? 0xff5d7a : 0x7fffa3;
    const emissive = ballState.x > 0 ? 0xb24c5e : 0x4cb274;
    ball.material.color.setHex(target);
    ball.material.emissive.setHex(emissive);
  }

  let raf;
  function loop() {
    step();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();

  // Resize
  const ro = new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(host);

  // Cleanup hook (not strictly needed for this app)
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
  };
}
