/* global THREE */
console.log('[banner] ribbons+particles v1 – dev2');

(function () {
  const el = document.getElementById('hero3d');
  if (!el || !window.THREE) return;

  // ------ Renderer (crisp, no blur) ------
  const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ------ Scene / camera ------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.set(0, 0, 6);

  // ------ Colors from CSS vars ------
  const css = getComputedStyle(document.documentElement);
  const NAVY  = new THREE.Color((css.getPropertyValue('--navy')||'#0D1B26').trim());
  const OCEAN = new THREE.Color((css.getPropertyValue('--ocean')||'#102537').trim());
  const GREEN = new THREE.Color((css.getPropertyValue('--brand-green')||'#00E27A').trim());
  const MINT  = new THREE.Color((css.getPropertyValue('--brand-mint')||'#D6FFF0').trim());

  // ------ Subtle gradient plane behind (no fog) ------
  const bgGeo = new THREE.PlaneGeometry(12, 6);
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { c1: { value: NAVY }, c2: { value: OCEAN } },
    vertexShader: `
      precision mediump float;
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv; uniform vec3 c1; uniform vec3 c2;
      void main(){
        float g = smoothstep(0.0, 1.0, vUv.y);
        vec3 col = mix(c1, c2, g);
        gl_FragColor = vec4(col, 0.9);
      }
    `,
    transparent: true, depthWrite: false
  });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  bg.position.z = -1.0;
  scene.add(bg);

  // ------ Ribbons (Stripe-like glow, additive) ------
  function makeRibbon(color, amp, speed, width, tilt) {
    const geo = new THREE.PlaneGeometry(12, 2, 400, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:  { value: 0 },
        uColor: { value: color },
        uAmp:   { value: amp },
        uWidth: { value: width }
      },
      vertexShader: `
        precision mediump float;
        uniform float uTime; uniform float uAmp;
        varying float vMask;
        void main(){
          vec3 p = position;
          float t = uTime * 0.35;
          p.y += sin(p.x * 1.6 + t) * uAmp;
          vMask = exp(-pow(p.y, 2.0) * uAmp * 6.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor; varying float vMask;
        void main(){
          float a = clamp(vMask, 0.0, 1.0);
          vec3 glow = uColor * (0.75 + 0.75 * a);
          gl_FragColor = vec4(glow, a);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = tilt;
    return { mesh, mat, speed };
  }

  const ribbonFront = makeRibbon(GREEN, 0.35,  1.0, 1.4,  0.18);
  const ribbonBack  = makeRibbon(MINT,  0.25, -0.6, 1.8, -0.12);
  ribbonFront.mesh.position.y = -0.28;
  ribbonBack.mesh.position.y  = -0.46; ribbonBack.mesh.position.z = -0.2;
  scene.add(ribbonBack.mesh, ribbonFront.mesh);

  // ------ Tiny particles (crisp, DPR-aware point sprites) ------
  const DOTS = 420;
  const gDots = new THREE.BufferGeometry();
  const pos   = new Float32Array(DOTS * 3);
  const aSize = new Float32Array(DOTS);
  for (let i = 0; i < DOTS; i++) {
    pos[i*3+0] = (Math.random() - 0.5) * 10.5; // x
    pos[i*3+1] = (Math.random() - 0.5) * 3.8;  // y
    pos[i*3+2] = Math.random() * -0.2;         // slight depth back
    aSize[i]   = 1.0 + Math.random() * 2.0;    // base (scaled in shader)
  }
  gDots.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gDots.setAttribute('aSize',    new THREE.BufferAttribute(aSize, 1));

  const dotMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: MINT },
      uDPR:   { value: dpr },
      uTime:  { value: 0.0 }
    },
    vertexShader: `
      precision mediump float;
      attribute float aSize;
      uniform float uDPR;
      uniform float uTime;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        // subtle drift
        p.x += 0.03 * sin(uTime * 0.25 + p.y * 0.7);
        p.y += 0.03 * cos(uTime * 0.22 + p.x * 0.6);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * 3.0 * uDPR / max(0.1, -mv.z); // crisp points
        vAlpha = 0.8;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform vec3 uColor;
      varying float vAlpha;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.0, length(uv)); // soft round sprite
        gl_FragColor = vec4(uColor * (0.6 + 0.4 * m), m * vAlpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  const dots = new THREE.Points(gDots, dotMat);
  scene.add(dots);

  // ------ Resize to banner strip ------
  function resize() {
    const r = el.getBoundingClientRect();
    const newDpr = Math.min(2, window.devicePixelRatio || 1);
    if (newDpr !== renderer.getPixelRatio()) {
      renderer.setPixelRatio(newDpr);
      dotMat.uniforms.uDPR.value = newDpr;
    }
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ------ Animate ------
  const clock = new THREE.Clock();
  function loop() {
    const t = clock.getElapsedTime();
    ribbonFront.mat.uniforms.uTime.value = t * ribbonFront.speed;
    ribbonBack.mat.uniforms.uTime.value  = t * ribbonBack.speed;
    dotMat.uniforms.uTime.value = t;

    // subtle camera sway
    camera.position.x = Math.sin(t * 0.07) * 0.05;
    camera.position.y = Math.cos(t * 0.06) * 0.03;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
})();