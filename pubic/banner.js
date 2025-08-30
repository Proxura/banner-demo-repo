console.log('BANNER JS LOADED v3');

(function(){
  const el = document.getElementById('hero3d');
  if(!el){ console.error('no #hero3d'); return; }
  if(!window.THREE){ console.error('THREE missing'); return; }

  const renderer = new THREE.WebGLRenderer({canvas: el, antialias:true, alpha:true});
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
  camera.position.z = 5;

  const geo = new THREE.TorusKnotGeometry(0.8, 0.28, 180, 32);
  const mat = new THREE.MeshBasicMaterial({color: 0x00E27A, wireframe:true});
  const knot = new THREE.Mesh(geo, mat);
  scene.add(knot);

  function resize(){
    const r = el.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  (function loop(){
    knot.rotation.x += 0.01;
    knot.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();