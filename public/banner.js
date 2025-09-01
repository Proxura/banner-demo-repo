/* global THREE */
console.log('BANNER JS LOADED -- waves+dots (pro)');

(function () {
  const el = document.getElementById('hero3d');
  if (!el) { console.error('no #hero3d'); return; }
  if (!window.THREE) { console.error('THREE missing'); return; }

  // ---------- renderer (sharp + fast) ----------
  const renderer = new THREE.WebGLRenderer({
    canvas: el,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: true
  });
  const DPR = Math.min(2, window.devicePixelRatio || 1); // cap to 2 for perf
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ---------- scene/camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 100);
  camera.position.set(0, 12, 22);

  // ---------- soft round sprite (anti-aliased dot) ----------
  function makeDotTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    // center brighter, feathered edge for glow
    grd.addColorStop(0.0, 'rgba(0,226,122,0.95)'); // brand green
    grd.addColorStop(0.5, 'rgba(0,226,122,0.35)');
    grd.addColorStop(1.0, 'rgba(0,226,122,0.0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }
  const dotTexture = makeDotTexture(128);

  // ---------- particle grid (waves) ----------
  // Increase cols/rows for denser field. Keep spacing small for smooth waves.
  const cols = 140;
  const rows = 90;
  const spacing = 0.35;

  const positions = new Float32Array(cols * rows * 3);
  let i = 0;
  for (let x = 0; x < cols; x++) {
    for (let z = 0; z < rows; z++) {
      positions[i++] = (x - cols / 2) * spacing; // X
      positions[i++] = 0;                         // Y (animated)
      positions[i++] = (z - rows / 2) * spacing; // Z
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.22,                // base size in world units
    sizeAttenuation: true,     // respect perspective for realism
    map: dotTexture,           // soft circular sprite
    transparent: true,
    depthWrite: false,         // avoid z-fighting shimmer
    blending: THREE.AdditiveBlending // subtle additive glow
  });

  const dots = new THREE.Points(geo, mat);
  scene.add(dots);

  // ---------- resize handling (keep it razor-sharp) ----------
  function resize() {
    const r = el.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // dot size feels different with DPR -- compensate slightly:
    mat.size = 0.22 * (DPR <= 1 ? 1.2 : 1.0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- animation (smooth wave field) ----------
  function animate(time) {
    const t = time * 0.001; // seconds
    const pos = geo.attributes.position;
    const amp = 0.8;        // wave height
    const freqX = 0.45;
    const freqZ = 0.33;
    const speed = 0.8;

    for (let idx = 0; idx < pos.count; idx++) {
      const x = pos.getX(idx);
      const z = pos.getZ(idx);
      // layered sines for organic motion
      const y =
        Math.sin(x * freqX + t * speed) * 0.6 +
        Math.cos((x + z) * 0.22 - t * (speed * 0.7)) * 0.4;
      pos.setY(idx, y * amp);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // ---------- small polish ----------
  // Slight camera drift for depth; comment out if you want static.
  let drift = 0;
  function driftCam() {
    drift += 0.002;
    camera.position.x = Math.sin(drift) * 1.2;
    camera.lookAt(0, 0, 0);
    requestAnimationFrame(driftCam);
  }
  driftCam();
})();