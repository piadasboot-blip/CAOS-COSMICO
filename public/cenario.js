/* VIBE — cenas 3D: palco neon (início) e salas em formato de caixa vista de frente, com pontos para andar. */
(function () {
  'use strict';
  var B = window.BASE, AV = window.AVATAR, CEN = window.CENARIO = {};
  var renderer, cam, cena, raiz, modo = '', t0 = 0, tocar = null, larg = 1, alt = 1;
  function std(cor, r, m, x) { return new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: r == null ? 0.7 : r, metalness: m || 0 }, x || {})); }
  function basic(cor, x) { return new THREE.MeshBasicMaterial(Object.assign({ color: cor }, x || {})); }
  function m(geo, mat, x, y, z, pai) { var o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); (pai || raiz).add(o); return o; }
  function caixa(w, h, d, mat, x, y, z, pai) { return m(new THREE.BoxGeometry(w, h, d), mat, x, y, z, pai); }
  function tex(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  CEN.init = function (el, qualidade) {
    renderer = new THREE.WebGLRenderer({ antialias: qualidade !== 'leve', alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualidade === 'leve' ? 1 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    el.appendChild(renderer.domElement);
    cam = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    CEN.renderer = renderer; CEN.camera = cam; CEN.orbita = orbita;
    window.addEventListener('resize', ajustar); ajustar();
    // toque / clique: pontos da sala
    var ini = null, dedos = {}, pinca = null, el2 = renderer.domElement;
    el2.style.touchAction = 'none';
    function nDedos() { return Object.keys(dedos).length; }
    function distDedos() { var k = Object.keys(dedos), a = dedos[k[0]], b = dedos[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    el2.addEventListener('pointerdown', function (e) {
      dedos[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (nDedos() === 2 && modo === 'sala') { pinca = { d: distDedos(), z: orbita.zoom }; ini = null; return; }
      if (nDedos() === 1) ini = { x: e.clientX, y: e.clientY, yaw: orbita.yaw, t: performance.now() };
    });
    el2.addEventListener('pointermove', function (e) {
      if (dedos[e.pointerId]) { dedos[e.pointerId].x = e.clientX; dedos[e.pointerId].y = e.clientY; }
      if (pinca && nDedos() >= 2) { orbita.zoom = Math.max(0.42, Math.min(1.25, pinca.z * pinca.d / Math.max(20, distDedos()))); return; }
      if (!ini || modo !== 'sala') return; orbita.yaw = Math.max(-0.7, Math.min(0.7, ini.yaw - (e.clientX - ini.x) * 0.004));
    });
    function soltar(e) {
      delete dedos[e.pointerId];
      if (pinca) { if (nDedos() === 0) pinca = null; ini = null; return; }
      if (!ini || e.type !== 'pointerup') { ini = null; return; }
      var mov = Math.hypot(e.clientX - ini.x, e.clientY - ini.y); ini = null; if (mov < 10) toque(e.clientX, e.clientY);
    }
    el2.addEventListener('pointerup', soltar); el2.addEventListener('pointercancel', soltar); el2.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') soltar(e); });
    el2.addEventListener('wheel', function (e) { if (modo !== 'sala') return; e.preventDefault(); orbita.zoom = Math.max(0.42, Math.min(1.25, orbita.zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  };
  function ajustar() { larg = window.innerWidth; alt = window.innerHeight; renderer.setSize(larg, alt); cam.aspect = larg / alt; cam.updateProjectionMatrix(); }
  CEN.ajustar = ajustar;
  function limpar() { if (raiz) { cena.remove(raiz); raiz.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); }); }); } raiz = new THREE.Group(); cena = new THREE.Scene(); cena.add(raiz); anim = []; avatares = {}; pinos = []; }
  var anim = [], orbita = { yaw: 0, zoom: 1 }, foco = new THREE.Vector3(0, 0.6, -0.4), focoAlvo = new THREE.Vector3();

  /* ---------- palco neon (tela inicial e escolha de visual) ---------- */
  var palcoAvatar = null;
  CEN.palco = function (visual) {
    if (modo !== 'palco') {
      limpar(); modo = 'palco'; cena.background = new THREE.Color(0x0a0420);
      cena.add(new THREE.HemisphereLight(0xd8d0ff, 0x1a0a28, 0.55));
      var l = new THREE.DirectionalLight(0xfff4ea, 0.95); l.position.set(0.8, 2.5, 4); cena.add(l);
      var azul = new THREE.PointLight(0x2fb8ff, 0.9, 6); azul.position.set(-2.4, 2.4, 0.5); cena.add(azul);
      var rosa = new THREE.PointLight(0xff3fd0, 0.9, 6); rosa.position.set(2.4, 2.4, 0.5); cena.add(rosa);
      // túnel de anéis neon
      for (var i = 0; i < 9; i++) {
        var r = 2.4 + i * 0.05, z = -1 - i * 1.6, k = 1 - i / 10;
        [[0x2fb8ff, -1], [0xff3fd0, 1]].forEach(function (c) { var a = m(new THREE.TorusGeometry(r, 0.035, 8, 64, Math.PI * 0.62), basic(c[0], { transparent: true, opacity: 0.25 + k * 0.7 }), 0, 1.3, z); a.rotation.z = c[1] < 0 ? Math.PI * 0.69 : -Math.PI * 0.31; });
      }
      // feixes de luz
      [[-1.6, 0x6fd8ff, 0.42], [1.6, 0xff6fe0, -0.42]].forEach(function (f) { var b = m(new THREE.CylinderGeometry(0.06, 0.25, 9, 12, 1, true), basic(f[1], { transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), f[0], 4.2, -3); b.rotation.z = f[2]; anim.push(function (t) { b.material.opacity = 0.4 + Math.sin(t * 2 + f[0]) * 0.15; }); });
      // palco
      m(new THREE.CylinderGeometry(1.2, 1.3, 0.12, 48), std(0x1a1030, 0.3, 0.6), 0, -0.06, 0);
      var anel = m(new THREE.TorusGeometry(1.22, 0.025, 8, 64), basic(0xb44dff), 0, 0.005, 0); anel.rotation.x = Math.PI / 2;
      anim.push(function (t) { anel.material.color.setHSL(0.78 + Math.sin(t) * 0.06, 1, 0.6); });
      // partículas
      var g = new THREE.BufferGeometry(), n = 160, pos = new Float32Array(n * 3), R = rng(7); for (var j = 0; j < n; j++) { pos[j * 3] = (R() - 0.5) * 8; pos[j * 3 + 1] = R() * 5; pos[j * 3 + 2] = -R() * 10; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); var pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9c8ff, size: 0.03, transparent: true, opacity: 0.8 })); raiz.add(pts);
      anim.push(function (t) { pts.rotation.y = Math.sin(t * 0.1) * 0.2; });
      palcoAvatar = null;
    }
    if (visual) {
      var chave = JSON.stringify(visual);
      if (!palcoAvatar || palcoAvatar.userData.chave !== chave) { if (palcoAvatar) { raiz.remove(palcoAvatar); AV.descartar(palcoAvatar); } palcoAvatar = AV.criar(visual); palcoAvatar.userData.chave = chave; raiz.add(palcoAvatar); }
    }
    var retrato = larg < alt;
    cam.fov = retrato ? 42 : 36; cam.position.set(0, 1.25, retrato ? 4.4 : 4.0); cam.lookAt(0, retrato ? 0.95 : 1.0, 0); cam.updateProjectionMatrix();
    CEN.alvoPalco = palcoAvatar;
  };
  CEN.girarPalco = function (d) { if (palcoAvatar) palcoAvatar.rotation.y += d; };

  /* ---------- salas ---------- */
  var avatares = {}, pinos = [], pinosAte = 0, meuId = null;
  CEN.sala = function (tema, eu) {
    limpar(); modo = 'sala'; meuId = eu; orbita.yaw = 0; orbita.zoom = 1; foco.set(0, 0.6, -0.4);
    var T = TEMAS[tema] || TEMAS.neon;
    cena.background = new THREE.Color(0x000000);
    cena.add(new THREE.HemisphereLight(T.ceu, T.chao, T.amb));
    var sol = new THREE.DirectionalLight(T.luz, T.sol); sol.position.set(3, 8, 6); cena.add(sol);
    // caixa: chão e paredes (aberta na frente e em cima)
    var W = 12.6, D = 9, H = 4.6;
    caixa(W, 0.3, D, std(T.piso, 0.8), 0, -0.15, 0).userData.chao = true;
    caixa(W, H, 0.3, std(T.parede, 0.85), 0, H / 2, -D / 2);
    caixa(0.3, H, D, std(T.parede2 || T.parede, 0.85), -W / 2, H / 2, 0);
    caixa(0.3, H, D, std(T.parede2 || T.parede, 0.85), W / 2, H / 2, 0);
    caixa(W + 0.3, 0.12, 0.35, std(0x111111, 0.5), 0, H, -D / 2); caixa(0.35, 0.12, D, std(0x111111, 0.5), -W / 2, H, 0); caixa(0.35, 0.12, D, std(0x111111, 0.5), W / 2, H, 0);
    T.decorar(W, D, H);
    // assentos em cada ponto "sentado"
    B.PONTOS.forEach(function (p) { if (p[3]) T.assento(p[0], p[1], p[2]); });
    var retrato = larg < alt; cam.fov = retrato ? 52 : 40; cam.updateProjectionMatrix();
  };
  CEN.membro = function (id, nome, visual, p, eu) {
    CEN.sair(id);
    var a = AV.criar(visual), q = B.PONTOS[p] || B.PONTOS[6]; a.position.set(q[0], 0, q[1]); a.rotation.y = q[2];
    var et = etiqueta(nome, eu); et.position.y = 2.1; et.scale.set(1.6, 0.35, 1); a.add(et);
    raiz.add(a); avatares[id] = { a: a, p: p, alvo: null, sentado: !!q[3], nome: nome };
  };
  CEN.sair = function (id) { var o = avatares[id]; if (!o) return; raiz.remove(o.a); AV.descartar(o.a); delete avatares[id]; };
  CEN.ir = function (id, p) { var o = avatares[id], q = B.PONTOS[p]; if (!o || !q) return; o.p = p; o.alvo = q; o.sentado = false; };
  CEN.emote = function (id, e) { var o = avatares[id]; if (o) AV.emote(o.a, e); };
  CEN.fala = function (id, txt) {
    var o = avatares[id]; if (!o) return;
    if (o.balao) { o.a.remove(o.balao); o.balao.material.map.dispose(); }
    var b = balao(txt); b.position.y = 2.45; o.a.add(b); o.balao = b; o.balaoAte = performance.now() + 6000;
  };
  CEN.ocupado = function (p) { return Object.keys(avatares).some(function (k) { return avatares[k].p === p; }); };
  CEN.aoTocarPonto = function (f) { tocar = f; };
  CEN.mostrarPontos = function () {
    pinos.forEach(function (s) { raiz.remove(s); }); pinos = [];
    B.PONTOS.forEach(function (q, i) { if (CEN.ocupado(i)) return; var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinoTex(q[3]), transparent: true, depthTest: false })); s.position.set(q[0], q[3] ? 1.25 : 0.95, q[1]); s.scale.set(0.55, 0.7, 1); s.userData.p = i; s.renderOrder = 10; raiz.add(s); pinos.push(s); });
    pinosAte = performance.now() + 4500;
  };
  var ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function toque(x, y) {
    if (modo === 'palco') { if (CEN.aoTocarPalco) CEN.aoTocarPalco(); return; }
    if (modo !== 'sala') return;
    v2.set(x / larg * 2 - 1, -(y / alt) * 2 + 1); ray.setFromCamera(v2, cam);
    if (pinos.length) { var h = ray.intersectObjects(pinos); if (h.length) { var p = h[0].object.userData.p; pinos.forEach(function (s) { raiz.remove(s); }); pinos = []; if (tocar) tocar(p); return; } }
    CEN.mostrarPontos();
  }
  var pinoCache = {};
  function pinoTex(sentar) {
    var k = sentar ? 's' : 'p'; if (pinoCache[k]) return pinoCache[k];
    return (pinoCache[k] = tex(96, 122, function (c) {
      c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.arc(48, 46, 40, Math.PI * 0.85, Math.PI * 2.15); c.lineTo(48, 118); c.closePath(); c.fill();
      c.strokeStyle = sentar ? '#b44dff' : '#e0a53a'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(48, 22); c.lineTo(48, 70); c.moveTo(32, 54); c.lineTo(48, 72); c.lineTo(64, 54); c.stroke();
    }));
  }
  function etiqueta(nome, eu) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 56; var g = c.getContext('2d'); g.font = '700 26px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = Math.min(250, g.measureText(nome).width + 22); g.fillStyle = eu ? 'rgba(224,165,58,.92)' : 'rgba(0,0,0,.6)'; g.beginPath(); if (g.roundRect) g.roundRect(128 - w / 2, 8, w, 40, 20); else g.rect(128 - w / 2, 8, w, 40); g.fill();
    g.fillStyle = eu ? '#1a1206' : '#fff'; g.fillText(nome, 128, 29);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(0.95, 0.21, 1); s.renderOrder = 9; return s;
  }
  function balao(txt) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 180; var g = c.getContext('2d'); g.font = '600 30px system-ui, sans-serif';
    var palavras = txt.split(' '), linhas = [], l = ''; palavras.forEach(function (p) { var tst = l ? l + ' ' + p : p; if (g.measureText(tst).width > 440) { linhas.push(l); l = p; } else l = tst; }); linhas.push(l); linhas = linhas.slice(0, 3);
    var w = Math.max.apply(null, linhas.map(function (x) { return g.measureText(x).width; })) + 40, h = linhas.length * 38 + 26;
    g.fillStyle = '#fff'; g.beginPath(); if (g.roundRect) g.roundRect(256 - w / 2, 4, w, h, 22); else g.rect(256 - w / 2, 4, w, h); g.fill();
    g.beginPath(); g.moveTo(240, h + 3); g.lineTo(256, h + 24); g.lineTo(272, h + 3); g.fill();
    g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'top'; linhas.forEach(function (x, i) { g.fillText(x, 256, 18 + i * 38); });
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(3.4, 1.2, 1); s.center.set(0.5, 0); s.renderOrder = 11; return s;
  }

  /* ---------- temas das salas ---------- */
  function sofa(x, z, ry, cor, almof) { var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; raiz.add(g); caixa(1.1, 0.42, 0.9, std(cor, 0.8), 0, 0.21, 0, g); caixa(1.1, 0.7, 0.22, std(cor, 0.8), 0, 0.6, -0.4, g); if (almof) caixa(0.4, 0.3, 0.12, std(almof, 0.9), 0.2, 0.55, -0.24, g); return g; }
  function planta(x, z, s) { var g = new THREE.Group(); g.position.set(x, 0, z); raiz.add(g); m(new THREE.CylinderGeometry(0.25, 0.2, 0.45, 12), std(0x2a2a2a, 0.6), 0, 0.22, 0, g); for (var i = 0; i < 7; i++) { var f = m(new THREE.ConeGeometry(0.12, 0.9 * (s || 1), 6), std(0x2f7a3a, 0.8), Math.cos(i) * 0.12, 0.8, Math.sin(i) * 0.12, g); f.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5); } }
  function quadro(x, y, z, ry, cor1, cor2, w, h) { var t = tex(128, 160, function (c) { var g = c.createLinearGradient(0, 0, 128, 160); g.addColorStop(0, cor1); g.addColorStop(1, cor2); c.fillStyle = g; c.fillRect(0, 0, 128, 160); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(64, 70, 34, 0, 7); c.fill(); }); var q = m(new THREE.PlaneGeometry(w || 1, h || 1.25), new THREE.MeshBasicMaterial({ map: t }), x, y, z); q.rotation.y = ry || 0; caixa((w || 1) + 0.08, (h || 1.25) + 0.08, 0.04, std(0x111111), x, y, z - 0.03 * Math.cos(ry || 0)).rotation.y = ry || 0; }
  function letreiro(txt, cor, x, y, z) { var t = tex(512, 128, function (c) { c.font = '900 76px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = cor; c.shadowBlur = 24; c.fillStyle = cor; c.fillText(txt, 256, 66); c.fillStyle = '#fff'; c.shadowBlur = 0; c.globalAlpha = 0.5; c.fillText(txt, 256, 66); }); m(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: t, transparent: true }), x, y, z); }
  var TEMAS = {
    neon: { ceu: 0x6a4cff, chao: 0x1a0830, amb: 0.7, luz: 0xff8ae0, sol: 0.6, piso: 0x16121f, parede: 0x1d1530, parede2: 0x22183a,
      decorar: function (W, D, H) {
        letreiro('LOUNGE', '#ff3fd0', 0, 3.4, -4.32);
        for (var i = 0; i < 6; i++) { var cor = i % 2 ? 0x2fb8ff : 0xff3fd0; caixa(0.06, 3.6, 0.06, basic(cor), -5.9 + i * 2.36, 2, -4.3); }
        var pista = m(new THREE.PlaneGeometry(6, 3.2, 6, 3), new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xffffff, map: tex(256, 128, function (c) { for (var x = 0; x < 8; x++) for (var y = 0; y < 4; y++) { c.fillStyle = ['#ff3fd0', '#2fb8ff', '#b44dff', '#3ef2c8'][(x + y) % 4]; c.globalAlpha = 0.55; c.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); } }) }), 0, 0.01, 0.6); pista.rotation.x = -Math.PI / 2;
        anim.push(function (t) { pista.material.color.setHSL((t * 0.1) % 1, 0.4, 0.75); });
        var bola = m(new THREE.IcosahedronGeometry(0.35, 1), std(0xdddddd, 0.15, 1, { flatShading: true }), 0, 3.6, 0.5); anim.push(function (t) { bola.rotation.y = t; });
        caixa(1.6, 1, 0.6, std(0x111111, 0.3, 0.6), 0, 0.5, -3.9); caixa(1.7, 0.08, 0.7, basic(0x3ef2c8), 0, 1.02, -3.9);
        var l1 = new THREE.PointLight(0xff3fd0, 2.2, 9); l1.position.set(-3, 3, 0); raiz.add(l1); var l2 = new THREE.PointLight(0x2fb8ff, 2.2, 9); l2.position.set(3, 3, 0); raiz.add(l2);
        anim.push(function (t) { l1.intensity = 1.6 + Math.sin(t * 3) * 0.8; l2.intensity = 1.6 + Math.cos(t * 3) * 0.8; });
      }, assento: function (x, z, ry) { sofa(x, z, ry, 0x2a1d4a, 0xff3fd0); } },
    praia: { ceu: 0xffb27a, chao: 0x6a4a3a, amb: 0.9, luz: 0xffc48a, sol: 1.3, piso: 0xe8cf98, parede: 0xff9a6a, parede2: 0x6fb6d8,
      decorar: function (W, D, H) {
        var c = tex(256, 256, function (g) { var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ff8a5c'); gr.addColorStop(0.5, '#ffc27a'); gr.addColorStop(0.62, '#ffd9a0'); gr.addColorStop(0.63, '#2f8fb8'); gr.addColorStop(1, '#1d5f8a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(128, 150, 26, 0, 7); g.fill(); });
        m(new THREE.PlaneGeometry(12.3, 4.4), new THREE.MeshBasicMaterial({ map: c }), 0, 2.3, -4.33);
        // fogueira
        for (var i = 0; i < 5; i++) { var l = caixa(0.8, 0.12, 0.12, std(0x6a3d1e), 0, 0.08, 0.1); l.rotation.y = i * 0.63; }
        var fogo = m(new THREE.ConeGeometry(0.28, 0.7, 10), basic(0xffa020, { transparent: true, opacity: 0.85 }), 0, 0.45, 0.1); var luz = new THREE.PointLight(0xff8a20, 2.5, 6); luz.position.set(0, 0.8, 0.1); raiz.add(luz);
        anim.push(function (t) { fogo.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9) * 0.15, 1); luz.intensity = 2.2 + Math.sin(t * 11) * 0.5; });
        [[-5.4, -3.6], [5.4, -3.4]].forEach(function (p) { for (var k = 0; k < 5; k++) m(new THREE.CylinderGeometry(0.1, 0.13, 0.7, 7), std(0x8a6a3a), p[0] + k * 0.05, 0.35 + k * 0.68, p[1]).rotation.z = 0.08; for (var f = 0; f < 6; f++) { var fo = m(new THREE.BoxGeometry(1.4, 0.03, 0.3), std(0x2f8a3a), p[0] + 0.25, 3.5, p[1]); fo.rotation.set(0.3, f * 1.05, -0.5); } });
      }, assento: function (x, z, ry) { var t = caixa(1.1, 0.35, 0.4, std(0x7a5232, 0.9), x, 0.2, z); t.rotation.y = ry; } },
    cafe: { ceu: 0xfff0d8, chao: 0x5a3a2a, amb: 0.9, luz: 0xffe0b0, sol: 1.0, piso: 0x8a5a3a, parede: 0xe8d8c0, parede2: 0xcdb898,
      decorar: function () {
        caixa(5, 1, 0.8, std(0x5a3a28, 0.6), 0, 0.5, -3.9); caixa(5.1, 0.08, 0.9, std(0xf0ece4, 0.4), 0, 1.02, -3.9);
        for (var i = 0; i < 4; i++) m(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), std([0xffffff, 0xc84a3a][i % 2], 0.4), -1.5 + i, 1.15, -3.9);
        quadro(-3.5, 2.7, -4.3, 0, '#c87a4a', '#5a3a28'); quadro(3.5, 2.7, -4.3, 0, '#5a8a6a', '#2a4a3a');
        [[-2.2, 1.2], [2.2, 1.2], [0, 3]].forEach(function (p) { m(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 20), std(0xf2ece0, 0.4), p[0], 0.75, p[1]); m(new THREE.CylinderGeometry(0.05, 0.08, 0.75, 8), std(0x222222), p[0], 0.37, p[1]); });
        for (var k = 0; k < 3; k++) { var lu = m(new THREE.SphereGeometry(0.15, 12, 10), basic(0xffd890), -3 + k * 3, 3.7, -1); var l = new THREE.PointLight(0xffc880, 0.8, 5); l.position.copy(lu.position); raiz.add(l); }
        planta(-5.6, -3.8); planta(5.6, -3.8);
      }, assento: function (x, z, ry) { var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; raiz.add(g); caixa(0.5, 0.06, 0.5, std(0x6a4028), 0, 0.45, 0, g); caixa(0.5, 0.5, 0.06, std(0x6a4028), 0, 0.72, -0.22, g); [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(function (q) { caixa(0.04, 0.45, 0.04, std(0x222222), q[0], 0.22, q[1], g); }); } },
    cobertura: { ceu: 0x4a5aa8, chao: 0x0a0a20, amb: 0.7, luz: 0xbfcfff, sol: 0.8, piso: 0xd8d4cc, parede: 0x101830, parede2: 0x1a2340,
      decorar: function () {
        var c = tex(512, 256, function (g) { var gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0a0f2a'); gr.addColorStop(1, '#2a1f4a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); var R = rng(3); for (var i = 0; i < 40; i++) { var w = 14 + R() * 30, h = 60 + R() * 150, x = R() * 512; g.fillStyle = '#05070f'; g.fillRect(x, 256 - h, w, h); for (var j = 0; j < 20; j++) { if (R() < 0.4) { g.fillStyle = R() < 0.5 ? '#ffd890' : '#9fd0ff'; g.fillRect(x + 2 + R() * (w - 5), 256 - h + 4 + R() * (h - 8), 2, 3); } } } });
        m(new THREE.PlaneGeometry(12.3, 4.4), new THREE.MeshBasicMaterial({ map: c }), 0, 2.3, -4.33);
        var agua = m(new THREE.BoxGeometry(5, 0.1, 2.4), std(0x2fb8e8, 0.05, 0.1, { transparent: true, opacity: 0.85, emissive: 0x0a4a6a }), 0, 0.02, -1.0);
        caixa(5.3, 0.12, 0.15, std(0xffffff), 0, 0.06, 0.25); caixa(5.3, 0.12, 0.15, std(0xffffff), 0, 0.06, -2.25);
        anim.push(function (t) { agua.material.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2; });
        for (var i = 0; i < 8; i++) { var l = m(new THREE.SphereGeometry(0.06, 8, 6), basic(0xffd890), -5.5 + i * 1.57, 4.2 + Math.sin(i) * 0.1, -3.5); }
      }, assento: function (x, z, ry) { var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; raiz.add(g); caixa(0.8, 0.3, 1.5, std(0xffffff, 0.6), 0, 0.2, 0.3, g); caixa(0.8, 0.5, 0.2, std(0xffffff, 0.6), 0, 0.5, -0.4, g); } },
    jardim: { ceu: 0x9fd8ff, chao: 0x1a3a2a, amb: 0.8, luz: 0xd8f0ff, sol: 1.0, piso: 0x3f7a4a, parede: 0x9ab8d8, parede2: 0x7a9ab8,
      decorar: function () {
        [[-4.5, -3.2], [4.5, -3.4], [-5.4, 2.5], [5.4, 2.2]].forEach(function (p, i) { m(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 7), std(0xe8eef8, 0.4), p[0], 1.1, p[1]); for (var k = 0; k < 6; k++) { m(new THREE.OctahedronGeometry(0.4, 0), std(0xbfe8ff, 0.1, 0.2, { transparent: true, opacity: 0.8, emissive: 0x4a8acf, emissiveIntensity: 0.4, flatShading: true }), p[0] + Math.cos(k) * 0.5, 2.3 + Math.sin(k * 2) * 0.3, p[1] + Math.sin(k) * 0.4); } });
        var g = new THREE.BufferGeometry(), n = 60, pos = new Float32Array(n * 3), R = rng(11); for (var j = 0; j < n; j++) { pos[j * 3] = (R() - 0.5) * 11; pos[j * 3 + 1] = 0.5 + R() * 3.5; pos[j * 3 + 2] = (R() - 0.5) * 8; }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); var vg = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6a0, size: 0.09 })); raiz.add(vg); anim.push(function (t) { vg.position.y = Math.sin(t) * 0.1; vg.material.size = 0.07 + Math.sin(t * 4) * 0.02; });
        for (var f = 0; f < 30; f++) { var R2 = rng(f + 5); m(new THREE.SphereGeometry(0.06, 6, 4), std([0xff9ec7, 0xffffff, 0xffd36b][f % 3]), (R2() - 0.5) * 11, 0.06, (R2() - 0.5) * 8); }
      }, assento: function (x, z, ry) { var t = caixa(1.1, 0.4, 0.5, std(0x9a9a9a, 0.9), x, 0.2, z); t.rotation.y = ry; } },
    dark: { ceu: 0x5a5a6a, chao: 0x101010, amb: 0.55, luz: 0xd8d8e8, sol: 0.7, piso: 0x1e1e22, parede: 0x2a2a2e, parede2: 0x222226,
      decorar: function () {
        for (var i = 0; i < 5; i++) quadro(-4.6 + i * 2.3, 2.6, -4.3, 0, ['#444', '#777', '#333', '#666', '#555'][i], '#111', 1.4, 1.1);
        letreiro('DARK', '#d8d8e8', 0, 3.85, -4.3);
        var tapete = m(new THREE.PlaneGeometry(3.6, 2.4), std(0x2a2a30, 0.95), 1.6, 0.01, 1.2); tapete.rotation.x = -Math.PI / 2;
        for (var k = 0; k < 9; k++) { var l = m(new THREE.SphereGeometry(0.05, 6, 4), basic(0xf8f0d0), 3.3 + k * 0.28, 3.9 - Math.sin(k / 8 * Math.PI) * 0.3, -4.2); }
        planta(5.6, -3.8, 1.4); var lu = new THREE.PointLight(0xc8c8ff, 1.2, 8); lu.position.set(0, 3.5, 0); raiz.add(lu);
      }, assento: function (x, z, ry) { var p = m(new THREE.SphereGeometry(0.45, 14, 10), std(0x111114, 0.9), x, 0.3, z); p.scale.y = 0.62; } }
  };

  /* ---------- foto 3D para o feed ---------- */
  CEN.foto = function () { renderer.render(cena, cam); var c = document.createElement('canvas'), w = 540, h = Math.round(540 * alt / larg); c.width = w; c.height = Math.min(h, 720); c.getContext('2d').drawImage(renderer.domElement, 0, 0, w, c.height * renderer.domElement.width / w); var q = 0.72, url = c.toDataURL('image/jpeg', q); while (url.length > B.REGRAS.MAX_FOTO && q > 0.3) { q -= 0.1; url = c.toDataURL('image/jpeg', q); } return url; };

  /* ---------- quadro a quadro ---------- */
  CEN.ativo = true;
  CEN.atualizar = function (dt, t) {
    if (!CEN.ativo || !cena) return;
    anim.forEach(function (f) { f(t); });
    if (modo === 'palco' && palcoAvatar) { AV.animar(palcoAvatar, { andando: false, sentado: false }, dt); }
    if (modo === 'sala') {
      var retrato = larg < alt, z = orbita.zoom, dist = (retrato ? 15.5 : 13) * z, h = (retrato ? 9.5 : 7.5) * z;
      // quanto mais perto, mais a câmera segue o meu avatar
      var perto = Math.max(0, Math.min(1, (1 - z) / 0.58)), me = avatares[meuId];
      focoAlvo.set(0, retrato ? 0.6 : 1, -0.4);
      if (me) { focoAlvo.x += (me.a.position.x - focoAlvo.x) * perto; focoAlvo.z += (me.a.position.z - focoAlvo.z) * perto; focoAlvo.y += (1.3 - focoAlvo.y) * perto; }
      foco.lerp(focoAlvo, Math.min(1, dt * 6));
      cam.position.set(foco.x + Math.sin(orbita.yaw) * dist, Math.max(1.6, foco.y + h - 0.6), foco.z + Math.cos(orbita.yaw) * dist); cam.lookAt(foco);
      var agora = performance.now();
      Object.keys(avatares).forEach(function (id) {
        var o = avatares[id], a = o.a, andando = false;
        if (o.alvo) {
          var dx = o.alvo[0] - a.position.x, dz = o.alvo[1] - a.position.z, d = Math.hypot(dx, dz), v = 2.2 * dt;
          if (d <= v) { a.position.set(o.alvo[0], 0, o.alvo[1]); o.sentado = !!o.alvo[3]; var r = o.alvo[2]; a.rotation.y = r; o.alvo = null; }
          else { a.position.x += dx / d * v; a.position.z += dz / d * v; var alvoR = Math.atan2(dx, dz), dr = alvoR - a.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; a.rotation.y += dr * Math.min(1, dt * 10); andando = true; }
        }
        AV.animar(a, { andando: andando, sentado: o.sentado && !o.alvo }, dt);
        if (o.balao && agora > o.balaoAte) { a.remove(o.balao); o.balao.material.map.dispose(); o.balao = null; }
      });
      if (pinos.length && agora > pinosAte) { pinos.forEach(function (s) { raiz.remove(s); }); pinos = []; }
      pinos.forEach(function (s, i) { s.position.y = (B.PONTOS[s.userData.p][3] ? 1.25 : 0.95) + Math.sin(t * 4 + i) * 0.05; });
    }
    renderer.render(cena, cam);
  };
})();
