/* VIBE — avatar 3D: corpo, rosto, cabelo, roupas, acessórios e animações. Tudo feito com formas originais. */
(function () {
  'use strict';
  var B = window.BASE, AV = window.AVATAR = {};
  var FEMINA = null, GANGSTA = null, FEMINA_PRONTA = false, GANGSTA_PRONTA = false;
  function std(cor, r, m, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: r == null ? 0.7 : r, metalness: m || 0 }, extra || {})); }
  function m(geo, mat, x, y, z, pai) { var o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; if (pai) pai.add(o); return o; }
  function piv(x, y, z, pai) { var g = new THREE.Group(); g.position.set(x, y, z); pai.add(g); return g; }
  /* forma arredondada a partir de um perfil (raio por altura) */
  function torno(perfil, seg) { return new THREE.LatheGeometry(perfil.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 18); }
  function capsula(r1, r2, h, seg) { var g = torno([[0, -r1], [r1 * 0.7, -r1 * 0.75], [r1, -r1 * 0.2], [r1, 0], [r2, h], [r2, h + r2 * 0.2], [r2 * 0.7, h + r2 * 0.75], [0, h + r2]], seg || 14); return g; }

  /* ---------- montar o avatar ---------- */
  AV.criarAntigo = function (v) {
    v = v || B.INICIAIS[0];
    var f = v.corpo === 'f', pele = std(B.PELES[v.pele] || B.PELES[0], 0.62), raiz = new THREE.Group(), corpo = piv(0, 0, 0, raiz);
    var top = B.ITEM[v.top] || B.ITEM.top_camiseta_branca, baixo = B.ITEM[v.baixo] || B.ITEM.bx_jeans, pes = B.ITEM[v.pes] || B.ITEM.pe_tenis, ac = B.ITEM[v.acessorio] || B.ITEM.ac_nenhum, cab = B.ITEM[v.cabelo] || B.ITEM.cab_curto;
    var roupaTop = std(top.cor, top.forma === 'jaqueta' ? 0.35 : 0.8, top.forma === 'jaqueta' ? 0.25 : 0);
    var roupaBx = std(baixo.cor, 0.85);
    var vestido = top.forma === 'vestido';
    var sombr = f ? 0.92 : 1, quad = f ? 1.08 : 1;     // ombros e quadril
    var H = { quadril: 0.95, peito: 1.38, ombro: 1.42, pescoco: 1.5, cabeca: 1.62 };

    // quadril e tronco (cintura -> peito)
    var materialCintura = top.forma === 'cropped' ? pele : (vestido ? roupaTop : roupaTop);
    var quadril = m(torno([[0, 0], [0.17 * quad, 0.01], [0.19 * quad, 0.08], [0.17 * quad, 0.17], [0.15, 0.2]], 18), vestido ? roupaTop : roupaBx, 0, H.quadril - 0.05, 0, corpo); quadril.scale.z = 0.72;
    var cintura = m(torno([[0.15, 0], [f ? 0.13 : 0.15, 0.12], [f ? 0.15 : 0.165, 0.22]], 18), materialCintura, 0, H.quadril + 0.14, 0, corpo); cintura.scale.z = 0.7;
    var peito = m(torno([[f ? 0.15 : 0.165, 0], [f ? 0.18 : 0.19, 0.08], [0.2 * sombr, 0.17], [0.19 * sombr, 0.24], [0.1, 0.3], [0.05, 0.31]], 18), roupaTop, 0, H.quadril + 0.36, 0, corpo); peito.scale.z = f ? 0.74 : 0.66;
    // pescoço e cabeça
    var pesc = piv(0, H.pescoco, 0, corpo);
    m(new THREE.CylinderGeometry(0.055, 0.065, 0.14, 12), pele, 0, 0.02, 0, pesc);
    var cabeca = piv(0, 0.1, 0, pesc);
    var cranio = m(new THREE.SphereGeometry(0.13, 24, 18), pele, 0, 0.1, 0, cabeca); cranio.scale.set(0.92, 1.08, 1);
    var queixo = m(new THREE.SphereGeometry(0.1, 18, 12), pele, 0, 0.035, 0.025, cabeca); queixo.scale.set(f ? 0.82 : 0.92, 0.8, 0.95);
    // rosto
    var branco = std(0xffffff, 0.35), iris = std(B.CORES_OLHO[v.olhos] || B.CORES_OLHO[0], 0.25), pupila = std(0x050505, 0.2);
    [-0.045, 0.045].forEach(function (x) {
      var o = m(new THREE.SphereGeometry(0.022, 12, 10), branco, x, 0.115, 0.108, cabeca); o.scale.set(1.15, 0.8, 0.5);
      m(new THREE.SphereGeometry(0.0125, 10, 8), iris, x, 0.115, 0.118, cabeca).scale.z = 0.5;
      m(new THREE.SphereGeometry(0.006, 8, 6), pupila, x, 0.115, 0.123, cabeca);
      var sob = m(new THREE.BoxGeometry(0.05, f ? 0.007 : 0.011, 0.01), std(B.CORES_CABELO[v.corCabelo] || 0x222222, 0.8), x, 0.15, 0.112, cabeca); sob.rotation.z = x < 0 ? -0.12 : 0.12;
      if (f) { var c = m(new THREE.BoxGeometry(0.048, 0.006, 0.01), std(0x111111, 0.6), x, 0.128, 0.115, cabeca); c.rotation.z = x < 0 ? 0.2 : -0.2; }
    });
    m(new THREE.ConeGeometry(0.016, 0.045, 8), pele, 0, 0.085, 0.125, cabeca).rotation.x = 0.35;
    var boca = m(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), std(f ? 0xc0565f : 0x9a5a50, 0.5), 0, 0.045, 0.112, cabeca); boca.rotation.z = Math.PI;
    [-0.125, 0.125].forEach(function (x) { m(new THREE.SphereGeometry(0.025, 10, 8), pele, x, 0.1, 0, cabeca).scale.set(0.5, 1, 0.8); });
    cabelo(cab.forma, std(B.CORES_CABELO[v.corCabelo] || 0x222222, 0.55, 0.05), cabeca, f, pele);

    // braços
    var mangaLonga = /moletom|jaqueta|pelo|social/.test(top.forma), mangaCurta = /camiseta/.test(top.forma);
    function braco(s) {
      var omb = piv(s * 0.2 * sombr, H.ombro, 0, corpo); omb.rotation.z = s * 0.08;
      m(new THREE.SphereGeometry(0.06, 12, 10), roupaTop.color && (mangaLonga || mangaCurta || /regata|vestido|cropped/.test(top.forma) === false) ? roupaTop : roupaTop, 0, 0, 0, omb);
      var sup = m(capsula(0.052, 0.042, 0.26), mangaLonga || mangaCurta ? roupaTop : pele, 0, -0.29, 0, omb);
      if (mangaCurta) { var p2 = m(capsula(0.045, 0.04, 0.14), pele, 0, -0.27, 0, omb); }
      var cot = piv(0, -0.3, 0, omb);
      m(capsula(0.04, 0.032, 0.24), mangaLonga ? roupaTop : pele, 0, -0.26, 0, cot);
      var mao = m(new THREE.SphereGeometry(0.042, 10, 8), pele, 0, -0.3, 0.005, cot); mao.scale.set(0.75, 1.1, 0.5);
      if (top.forma === 'pelo') { for (var i = 0; i < 9; i++) { var b = m(new THREE.SphereGeometry(0.07 + Math.random() * 0.02, 7, 6), roupaTop, (Math.random() - 0.5) * 0.06, -0.05 - i * 0.055, (Math.random() - 0.5) * 0.06, omb); } }
      return { omb: omb, cot: cot };
    }
    var bE = braco(-1), bD = braco(1);

    // pernas
    var calcaLonga = /calca|cargo/.test(baixo.forma) && !vestido, bermuda = baixo.forma === 'bermuda' && !vestido, short = baixo.forma === 'short' && !vestido;
    function perna(s) {
      var anca = piv(s * 0.095 * quad, H.quadril, 0, corpo);
      m(capsula(0.085 * quad, 0.06, 0.4), calcaLonga || bermuda || short ? roupaBx : pele, 0, -0.44, 0, anca);
      if (short) m(capsula(0.07, 0.06, 0.24), pele, 0, -0.42, 0, anca);
      if (bermuda) { var bm = m(new THREE.CylinderGeometry(0.1, 0.11, 0.42, 14, 1, true), roupaBx, 0, -0.25, 0, anca); bm.material.side = THREE.DoubleSide; }
      var joelho = piv(0, -0.44, 0, anca);
      m(capsula(0.058, 0.042, 0.36), calcaLonga ? roupaBx : pele, 0, -0.42, 0, joelho);
      if (baixo.forma === 'cargo' && !vestido) m(new THREE.BoxGeometry(0.05, 0.1, 0.04), std(0x4a5040, 0.9), s * 0.07, -0.12, 0.02, joelho);
      var pe = piv(0, -0.45, 0, joelho);
      sapato(pes, pe, s);
      return { anca: anca, joelho: joelho };
    }
    var pE = perna(-1), pD = perna(1);
    // saia e vestido
    if (vestido || baixo.forma === 'saia') {
      var mat = vestido ? roupaTop : roupaBx, comp = vestido ? 0.42 : 0.3;
      var saia = m(torno([[0.15, 0], [0.19, -0.05], [0.25, -comp * 0.6], [0.3, -comp]], 20), mat, 0, H.quadril + 0.12, 0, corpo); saia.material = mat.clone(); saia.material.side = THREE.DoubleSide; saia.scale.z = 0.85;
    }
    // detalhes da roupa de cima
    if (top.forma === 'moletom') { var capuz = m(new THREE.TorusGeometry(0.11, 0.045, 8, 18), roupaTop, 0, H.pescoco - 0.02, -0.04, corpo); capuz.rotation.x = Math.PI / 2 + 0.3; m(new THREE.BoxGeometry(0.16, 0.08, 0.03), roupaTop, 0, H.quadril + 0.24, 0.12, corpo); }
    if (top.forma === 'jaqueta') { [-1, 1].forEach(function (s) { var l = m(new THREE.BoxGeometry(0.07, 0.22, 0.02), std(0x222228, 0.3, 0.3), s * 0.06, H.quadril + 0.48, 0.135, corpo); l.rotation.z = s * 0.25; }); m(new THREE.BoxGeometry(0.1, 0.3, 0.02), std(0xf2f2f2, 0.8), 0, H.quadril + 0.36, 0.125, corpo); }
    if (top.forma === 'social') { [-1, 1].forEach(function (s) { var g = m(new THREE.BoxGeometry(0.06, 0.04, 0.03), roupaTop, s * 0.04, H.pescoco - 0.03, 0.06, corpo); g.rotation.z = s * 0.5; }); for (var k = 0; k < 4; k++) m(new THREE.SphereGeometry(0.008, 6, 4), std(0x888888), 0, H.quadril + 0.2 + k * 0.08, 0.13, corpo); }
    if (top.forma === 'pelo') { for (var i = 0; i < 26; i++) { var a = i / 26 * Math.PI * 2, b = m(new THREE.SphereGeometry(0.075 + Math.random() * 0.03, 7, 6), roupaTop, Math.cos(a) * 0.2 * sombr, H.ombro - 0.05 + Math.sin(i * 1.7) * 0.05, Math.sin(a) * 0.13, corpo); } }
    if (top.forma === 'cropped') { var neon = new THREE.MeshBasicMaterial({ color: top.cor }); m(new THREE.TorusGeometry(0.165, 0.008, 6, 24), neon, 0, H.quadril + 0.37, 0, corpo).rotation.x = Math.PI / 2; }
    acessorio(ac, cabeca, corpo, H);

    raiz.userData = { corpo: corpo, pesc: pesc, cabeca: cabeca, bE: bE, bD: bD, pE: pE, pD: pD, fase: Math.random() * 6, emote: null, emoteT: 0, salto: pes.forma === 'salto' ? 0.06 : 0 };
    corpo.position.y = raiz.userData.salto;
    return raiz;
  };

  function sapato(it, pe, s) {
    var mat = std(it.cor, 0.6), sola = std(it.forma === 'tenis' && it.cor > 0x888888 ? 0xdddddd : 0x111111, 0.8);
    if (it.forma === 'bota') { m(new THREE.CylinderGeometry(0.058, 0.06, 0.2, 12), mat, 0, 0.06, 0, pe); m(new THREE.BoxGeometry(0.1, 0.07, 0.2), mat, 0, -0.04, 0.04, pe); m(new THREE.BoxGeometry(0.11, 0.03, 0.21), sola, 0, -0.08, 0.04, pe); }
    else if (it.forma === 'salto') { var b = m(new THREE.BoxGeometry(0.08, 0.05, 0.17), mat, 0, -0.02, 0.05, pe); b.rotation.x = 0.35; m(new THREE.CylinderGeometry(0.01, 0.008, 0.1, 6), mat, 0, -0.06, -0.03, pe); }
    else if (it.forma === 'chinelo') { m(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), std(0xf5f5f5, 0.9), 0, 0.0, 0, pe); m(new THREE.BoxGeometry(0.1, 0.025, 0.21), mat, 0, -0.07, 0.04, pe); m(new THREE.BoxGeometry(0.1, 0.02, 0.03), mat, 0, -0.04, 0.07, pe); }
    else { var t = m(new THREE.BoxGeometry(0.1, 0.08, 0.2), mat, 0, -0.04, 0.04, pe); m(new THREE.BoxGeometry(0.11, 0.03, 0.21), sola, 0, -0.085, 0.04, pe); }
  }
  function cabelo(forma, mat, cab, f, pele) {
    /* cabelo = topo da cabeça + metade de trás (o rosto fica livre) */
    function capa(raio, alturaTopo, alturaTras, materialCapa) {
      var t = m(new THREE.SphereGeometry(raio, 22, 12, 0, Math.PI * 2, 0, alturaTopo), materialCapa, 0, 0.105, -0.005, cab); t.scale.set(0.96, 1.08, 1.04);
      var b = m(new THREE.SphereGeometry(raio, 22, 14, Math.PI, Math.PI, 0, alturaTras), materialCapa, 0, 0.105, -0.005, cab); b.scale.set(0.96, 1.08, 1.04);
      b.material.side = THREE.DoubleSide;
    }
    if (forma === 'raspado') { capa(0.134, 0.95, 1.5, mat); return; }
    if (forma === 'moicano') { for (var i = 0; i < 7; i++) { var c = m(new THREE.BoxGeometry(0.04, 0.08 - Math.abs(i - 3) * 0.008, 0.05), mat, 0, 0.24 - Math.abs(i - 3) * 0.012, 0.09 - i * 0.035, cab); c.rotation.x = -0.4 + i * 0.12; } capa(0.132, 0.9, 1.4, std(0x2a2020, 0.9)); return; }
    // capa básica
    capa(0.142, forma === 'franja' ? 1.15 : 1.0, 1.75, mat);
    if (forma === 'curto' && !f) return;
    if (forma === 'longo' || (forma === 'curto' && f) || forma === 'franja') {
      var compr = forma === 'curto' ? 0.16 : 0.38;
      var tras = m(torno([[0.13, 0], [0.135, -compr * 0.5], [0.11, -compr]], 16), mat, 0, 0.08, -0.03, cab); tras.scale.set(1, 1, 0.75);
      [-1, 1].forEach(function (s) { var l = m(new THREE.BoxGeometry(0.035, compr * 0.7, 0.1), mat, s * 0.122, 0.06 - compr * 0.32, 0.03, cab); });
      if (forma === 'franja') { var fr = m(new THREE.BoxGeometry(0.22, 0.06, 0.04), mat, 0, 0.18, 0.11, cab); fr.rotation.x = -0.2; }
      return;
    }
    if (forma === 'coque') { [-0.08, 0.08].forEach(function (x) { m(new THREE.SphereGeometry(0.06, 14, 10), mat, x, 0.25, -0.03, cab); }); var fr2 = m(new THREE.BoxGeometry(0.2, 0.04, 0.03), mat, 0, 0.19, 0.115, cab); return; }
    if (forma === 'rabo') { var rb = m(new THREE.ConeGeometry(0.06, 0.32, 10), mat, 0, 0.02, -0.17, cab); rb.rotation.x = Math.PI - 0.35; m(new THREE.SphereGeometry(0.05, 10, 8), mat, 0, 0.15, -0.14, cab); return; }
    if (forma === 'cacheado') { for (var k = 0; k < 34; k++) { var a = Math.random() * Math.PI * 2, b = Math.random() * 1.4, raio = 0.15 + Math.random() * 0.03; m(new THREE.SphereGeometry(0.045 + Math.random() * 0.02, 8, 6), mat, Math.cos(a) * Math.sin(b) * raio, 0.12 + Math.cos(b) * raio * 0.95 - (b > 1 ? 0.06 : 0), Math.sin(a) * Math.sin(b) * raio * 0.95 - 0.02, cab); } }
  }
  function acessorio(it, cab, corpo, H) {
    var f = it.forma; if (f === 'nenhum') return;
    var mat = std(it.cor, 0.4, 0.2), brilho = new THREE.MeshBasicMaterial({ color: it.cor });
    if (f === 'oculos') { [-0.045, 0.045].forEach(function (x) { var l = m(new THREE.BoxGeometry(0.07, 0.04, 0.01), std(0x0a0a0a, 0.1, 0.8), x, 0.115, 0.13, cab); }); m(new THREE.BoxGeometry(0.03, 0.008, 0.01), mat, 0, 0.12, 0.13, cab); }
    if (f === 'bone') { var c = m(new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI * 2, 0, 1.5), mat, 0, 0.13, -0.005, cab); c.scale.set(1, 0.9, 1.05); var aba = m(new THREE.BoxGeometry(0.2, 0.012, 0.14), mat, 0, 0.17, 0.15, cab); aba.rotation.x = 0.12; }
    if (f === 'fones') { var arco = m(new THREE.TorusGeometry(0.15, 0.012, 6, 20, Math.PI), mat, 0, 0.11, 0, cab); [-0.15, 0.15].forEach(function (x) { m(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), mat, x, 0.1, 0, cab).rotation.z = Math.PI / 2; }); }
    if (f === 'tiara') { for (var i = 0; i < 9; i++) { var a = Math.PI * (0.15 + i * 0.0875); m(new THREE.SphereGeometry(0.022, 8, 6), std([0xff9ec7, 0xffffff, 0xffd36b][i % 3], 0.6), Math.cos(a) * 0.14, 0.2 + Math.sin(a) * 0.04, Math.sin(a) * 0.02 - 0.01, cab); } }
    if (f === 'halo') { var h = m(new THREE.TorusGeometry(0.11, 0.012, 8, 28), brilho, 0, 0.3, -0.02, cab); h.rotation.x = Math.PI / 2 - 0.2; for (var j = 0; j < 10; j++) { var r = m(new THREE.ConeGeometry(0.01, 0.08, 4), brilho, Math.cos(j / 10 * Math.PI * 2) * 0.11, 0.33, Math.sin(j / 10 * Math.PI * 2) * 0.11 - 0.02, cab); } }
    if (f === 'chifres') { [-1, 1].forEach(function (s) { var c2 = m(new THREE.ConeGeometry(0.025, 0.13, 10), brilho, s * 0.07, 0.25, 0.02, cab); c2.rotation.z = -s * 0.4; }); }
    if (f === 'asas') {
      var asaMat = new THREE.MeshStandardMaterial({ color: it.cor, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.2, emissive: it.cor, emissiveIntensity: 0.25 });
      corpo.userData.asas = [-1, 1].map(function (s) {
        var p = piv(s * 0.05, H.ombro - 0.08, -0.13, corpo);
        var a1 = m(new THREE.CircleGeometry(0.22, 18), asaMat, s * 0.2, 0.08, 0, p); a1.scale.set(1, 1.4, 1); a1.rotation.y = s * 0.3;
        var a2 = m(new THREE.CircleGeometry(0.14, 16), asaMat, s * 0.16, -0.22, 0, p); a2.scale.set(1, 1.3, 1); a2.rotation.y = s * 0.3;
        p.userData.s = s; return p;
      });
    }
  }

  /* ---------- animação ---------- */
  AV.emote = function (a, e) { a.userData.emote = e; a.userData.emoteT = 0; };
  AV.animarAntigo = function (a, est, dt) {
    var u = a.userData, t = (u.fase += dt), andando = est.andando, sentado = est.sentado;
    var bE = u.bE, bD = u.bD, pE = u.pE, pD = u.pD, k = Math.min(1, dt * 10);
    function ir(o, prop, alvo) { o.rotation[prop] += (alvo - o.rotation[prop]) * k; }
    var s = andando ? Math.sin(t * 7.5) : 0;
    // pernas
    if (sentado) { ir(pE.anca, 'x', -1.5); ir(pD.anca, 'x', -1.5); ir(pE.joelho, 'x', 1.5); ir(pD.joelho, 'x', 1.5); u.corpo.position.y += ((-0.43 + u.salto) - u.corpo.position.y) * k; }
    else { ir(pE.anca, 'x', s * 0.55); ir(pD.anca, 'x', -s * 0.55); ir(pE.joelho, 'x', Math.max(0, -s) * 0.7); ir(pD.joelho, 'x', Math.max(0, s) * 0.7); u.corpo.position.y += ((u.salto + (andando ? Math.abs(Math.cos(t * 7.5)) * 0.03 : Math.sin(t * 1.6) * 0.004)) - u.corpo.position.y) * k; }
    // braços (padrão)
    var ombE = { x: -s * 0.45, z: -0.08 }, ombD = { x: s * 0.45, z: 0.08 }, cotE = -0.15, cotD = -0.15;
    if (!andando && !sentado) { ombE.x = Math.sin(t * 1.6) * 0.03; ombD.x = -ombE.x; }
    if (sentado) { ombE.x = -0.4; ombD.x = -0.4; cotE = -0.6; cotD = -0.6; }
    var cabX = 0, cabY = 0, quadrilY = 0;
    // emotes
    if (u.emote) {
      u.emoteT += dt; var e = u.emote, q = u.emoteT;
      if (e === 'acenar') { ombD.z = 2.6; ombD.x = 0; cotD = -0.5 + Math.sin(q * 12) * 0.5; }
      if (e === 'dancar') { ombE.z = -1.2 - Math.sin(q * 8) * 0.6; ombD.z = 1.2 + Math.sin(q * 8 + 1) * 0.6; cotE = cotD = -1.2; quadrilY = Math.sin(q * 8) * 0.25; u.corpo.position.y = u.salto + Math.abs(Math.sin(q * 8)) * 0.06; }
      if (e === 'rir') { cabX = -0.25 + Math.sin(q * 20) * 0.08; ombE.x = ombD.x = -0.4; cotE = cotD = -1.3; }
      if (e === 'palmas') { ombE.x = ombD.x = -1.2; ombE.z = 0.35 + Math.sin(q * 14) * 0.15; ombD.z = -0.35 - Math.sin(q * 14) * 0.15; cotE = cotD = -0.6; }
      if (e === 'coracao') { ombE.z = -2.7; ombD.z = 2.7; cotE = cotD = -1.4; }
      if (u.emoteT > (e === 'dancar' ? 6 : 2.4)) u.emote = null;
    }
    ir(bE.omb, 'x', ombE.x); ir(bD.omb, 'x', ombD.x); ir(bE.omb, 'z', ombE.z); ir(bD.omb, 'z', ombD.z); ir(bE.cot, 'x', cotE); ir(bD.cot, 'x', cotD);
    ir(u.cabeca, 'x', cabX); ir(u.cabeca, 'y', cabY); ir(u.corpo, 'y', quadrilY);
    if (u.corpo.userData.asas) u.corpo.userData.asas.forEach(function (w) { w.rotation.y = w.userData.s * (0.25 + Math.sin(t * 3) * 0.25); });
  };

  /* ---------- foto do avatar (para perfil, feed e lojas) ---------- */
  var cache = {};
  AV.foto = function (renderer, v, w, h, modo) {
    var chave = JSON.stringify(v) + '|modelo:' + (v && v.modelo || 'femina') + w + h + (modo || ''); if (cache[chave]) return cache[chave];
    var rt = new THREE.WebGLRenderTarget(w * 2, h * 2); rt.texture.encoding = THREE.sRGBEncoding;
    var s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xffffff, 0x554466, 0.55)); var l = new THREE.DirectionalLight(0xffffff, 0.85); l.position.set(1.5, 2.5, 3); s.add(l);
    var l2 = new THREE.PointLight(0xb44dff, 0.6, 6); l2.position.set(-1.5, 1.6, -1); s.add(l2);
    var a = AV.criar(v); a.rotation.y = modo === 'rosto' ? 0.15 : 0.35; s.add(a); var yR = a.userData.yRosto || 1.68;
    var c = new THREE.PerspectiveCamera(modo === 'rosto' ? 22 : 30, w / h, 0.05, 20);
    if (modo === 'rosto') { c.position.set(0, yR + 0.02, 1.25); c.lookAt(0, yR, 0); } else { c.position.set(0, 1.0, 3.6); c.lookAt(0, 0.92, 0); }
    var antes = renderer.getClearAlpha(); renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(s, c);
    var W = w * 2, Hh = h * 2, buf = new Uint8Array(W * Hh * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, Hh, buf); renderer.setRenderTarget(null); renderer.setClearAlpha(antes); rt.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    var cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; var g = cv.getContext('2d'), img = g.createImageData(W, Hh);
    for (var y = 0; y < Hh; y++) img.data.set(buf.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
    g.putImageData(img, 0, 0); return (cache[chave] = cv.toDataURL('image/png'));
  };
  AV.descartar = function (o) { o.traverse(function (k) { if (k.geometry) k.geometry.dispose(); if (k.material) [].concat(k.material).forEach(function (x) { x.dispose(); }); }); };

  /* =====================================================================
     Personagens 3D (modelos low-poly com esqueleto, convertidos do FBX).
     A cor de pele, cabelo e roupas é trocada por vértice, mantendo o sombreado.
     As animações (andar, sentar, emotes) são feitas por código nos ossos.
     ===================================================================== */
  var MODELOS = {}, PRONTO = false;
  AV.carregar = function (pronto) {
    var arqs = { m: 'modelos/homem.json', f: 'modelos/mulher.json' }, falta = 4, feito = false;
    function fim() { if (feito) return; feito = true; PRONTO = !!(MODELOS.m && MODELOS.f); pronto(PRONTO); }
    Object.keys(arqs).forEach(function (k) {
      fetch(arqs[k]).then(function (r) { return r.json(); }).then(function (d) { MODELOS[k] = preparar(d); }).catch(function () {}).then(function () { if (--falta === 0) fim(); });
    });
    if (window.THREE.GLTFLoader) {
      var loader = new THREE.GLTFLoader();
      loader.load('modelos/female_demon_girl_body_mesh_free.glb?v=2', function (g) { FEMINA = g.scene; FEMINA_PRONTA = true; if (--falta === 0) fim(); }, undefined, function () { if (--falta === 0) fim(); });
      loader.load('modelos/sexy_gangsta_girl_2.glb?v=2', function (g) { GANGSTA = g.scene; GANGSTA_PRONTA = true; if (--falta === 0) fim(); }, undefined, function () { if (--falta === 0) fim(); });
    } else { falta -= 2; if (falta === 0) fim(); }
    setTimeout(fim, 20000);
  };
  function lin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function preparar(d) {
    var n = d.parte.length, P = {};
    P.pos = new Float32Array(d.pos); P.nor = new Float32Array(d.nor); P.si = new Uint16Array(d.si); P.sw = new Float32Array(d.sw);
    P.idx = d.idx.length > 65535 ? new Uint32Array(d.idx) : new Uint16Array(d.idx); P.parte = d.parte; P.chao = d.info.chao;
    P.orig = new Float32Array(n * 3); for (var i = 0; i < n * 3; i++) P.orig[i] = lin(d.cor[i]);
    // luminância de referência de cada parte (mediana) para manter o sombreado ao trocar a cor
    var ls = {}; for (i = 0; i < n; i++) { var p = d.parte[i]; if (!p) continue; (ls[p] = ls[p] || []).push(lum(P.orig[i * 3], P.orig[i * 3 + 1], P.orig[i * 3 + 2])); }
    P.fator = new Float32Array(n); var ref = {};
    Object.keys(ls).forEach(function (p) { var a = ls[p].sort(function (x, y) { return x - y; }); ref[p] = a[Math.floor(a.length * 0.6)] || 0.5; });
    for (i = 0; i < n; i++) if (d.parte[i]) P.fator[i] = Math.max(0.35, Math.min(1.5, lum(P.orig[i * 3], P.orig[i * 3 + 1], P.orig[i * 3 + 2]) / ref[d.parte[i]]));
    // ossos em repouso
    P.ossos = d.ossos.map(function (o) { var m4 = new THREE.Matrix4().fromArray(o.m), b = { n: o.n, p: o.p, pos: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }; m4.decompose(b.pos, b.q, b.s); return b; });
    P.i = {}; P.ossos.forEach(function (o, k) { P.i[o.n] = k; });
    var W = [], Wp = [];
    P.ossos.forEach(function (o, k) { var m4 = new THREE.Matrix4().compose(o.pos, o.q, o.s); W[k] = o.p >= 0 ? W[o.p].clone().multiply(m4) : m4; });
    P.mW = W; P.qW = W.map(function (m4) { var p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m4.decompose(p, q, sc); Wp.push(p); return q; }); P.pW = Wp;
    function dir(a, b) { return P.pW[P.i[b]].clone().sub(P.pW[P.i[a]]).normalize(); }
    P.dir = {};
    ['L', 'R'].forEach(function (l) {
      P.dir[l + 'braco'] = dir(l + ' UpperArm', l + ' Forearm'); P.dir[l + 'ante'] = dir(l + ' Forearm', l + ' Hand');
      P.dir[l + 'coxa'] = dir(l + ' Thigh', l + ' Calf'); P.dir[l + 'perna'] = dir(l + ' Calf', l + ' Foot');
      P['lado' + l] = Math.sign(P.pW[P.i[l + ' UpperArm']].x) || (l === 'L' ? 1 : -1);
    });
    P.yQuadril = (P.pW[P.i['L Thigh']].y + P.pW[P.i['R Thigh']].y) / 2 - P.chao;
    P.yOmbro = (P.pW[P.i['L UpperArm']].y + P.pW[P.i['R UpperArm']].y) / 2 - P.chao;
    // caixa da cabeça (só pele presa ao osso da cabeça) para encaixar acessórios
    var hi = P.i['Head'], mn = new THREE.Vector3(1e9, 1e9, 1e9), mx = new THREE.Vector3(-1e9, -1e9, -1e9), v = new THREE.Vector3();
    for (i = 0; i < n; i++) if (P.si[i * 4] === hi && P.sw[i * 4] > 0.8 && d.parte[i] === 1) { v.set(P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]); mn.min(v); mx.max(v); }
    P.cab = { c: mn.clone().add(mx).multiplyScalar(0.5), t: mx.clone().sub(mn) };
    P.cab.c.y -= P.chao; P.yRosto = P.cab.c.y - P.cab.t.y * 0.05;
    return P;
  }
  var _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), EIXO_X = new THREE.Vector3(1, 0, 0), EIXO_Y = new THREE.Vector3(0, 1, 0), EIXO_Z = new THREE.Vector3(0, 0, 1);
  function corLin(hex) { var c = new THREE.Color(hex); return [lin(c.r * 255), lin(c.g * 255), lin(c.b * 255)]; }
  function criarModeloGLB(v, fonte, marcador) {
    var raiz = new THREE.Group(), corpo = new THREE.Group(); raiz.add(corpo);
    var modelo = fonte.clone(true), caixa = new THREE.Box3().setFromObject(modelo), tam = caixa.getSize(new THREE.Vector3()), centro = caixa.getCenter(new THREE.Vector3());
    var escala = 1.78 / Math.max(tam.y, 0.001); modelo.scale.setScalar(escala);
    modelo.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);
    modelo.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) [].concat(o.material).forEach(function (mat) { mat.side = THREE.DoubleSide; }); } });
    corpo.add(modelo);
    raiz.userData = { glbFemina: true, modeloNome: marcador, corpo: corpo, modeloGLB: modelo, fase: Math.random() * 6, emote: null, emoteT: 0, salto: 0 };
    return raiz;
  }
  AV.criar = function (v) {
    v = v || B.INICIAIS[0];
    if (v.corpo === 'f' && v.modelo === 'gangsta' && GANGSTA_PRONTA) return criarModeloGLB(v, GANGSTA, 'gangsta');
    if (v.corpo === 'f' && FEMINA_PRONTA) return criarModeloGLB(v, FEMINA, 'femina');
    var P = MODELOS[v.corpo === 'f' ? 'f' : 'm'];
    if (!PRONTO || !P) return AV.criarAntigo(v);
    var it = function (c, pad) { return B.ITEM[v[c]] || B.ITEM[pad]; };
    var cores = [null, corLin(B.PELES[v.pele] || B.PELES[0]), corLin(B.CORES_CABELO[v.corCabelo] || B.CORES_CABELO[0]),
      corLin(it('top', 'top_camiseta_branca').cor), corLin(it('baixo', 'bx_jeans').cor), corLin(it('pes', 'pe_tenis').cor)];
    var n = P.parte.length, col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var p = P.parte[i]; if (!p) { col[i * 3] = P.orig[i * 3]; col[i * 3 + 1] = P.orig[i * 3 + 1]; col[i * 3 + 2] = P.orig[i * 3 + 2]; } else { var c = cores[p], f = P.fator[i]; col[i * 3] = c[0] * f; col[i * 3 + 1] = c[1] * f; col[i * 3 + 2] = c[2] * f; } }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(P.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('skinIndex', new THREE.BufferAttribute(P.si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(P.sw, 4));
    g.setIndex(new THREE.BufferAttribute(P.idx, 1));
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.78, metalness: 0 });
    var malha = new THREE.SkinnedMesh(g, mat); malha.castShadow = true; malha.frustumCulled = false;
    var ossos = P.ossos.map(function (o) { var b = new THREE.Bone(); b.name = o.n; b.position.copy(o.pos); b.quaternion.copy(o.q); b.scale.copy(o.s); return b; });
    P.ossos.forEach(function (o, k) { if (o.p >= 0) ossos[o.p].add(ossos[k]); });
    malha.add(ossos[0]); malha.updateMatrixWorld(true); malha.bind(new THREE.Skeleton(ossos));
    var raiz = new THREE.Group(), corpo = new THREE.Group(); raiz.add(corpo); corpo.add(malha); malha.position.y = -P.chao;
    // acessórios: um "suporte" preso no osso da cabeça com o mesmo sistema de medidas do boneco antigo
    var ac = B.ITEM[v.acessorio];
    if (ac && ac.forma !== 'nenhum') {
      var cab = new THREE.Group(), esc = new THREE.Vector3(P.cab.t.x / 0.24, P.cab.t.y / 0.27, P.cab.t.z / 0.26);
      var alvo = new THREE.Matrix4().compose(new THREE.Vector3(P.cab.c.x, P.cab.c.y + P.chao - 0.1 * esc.y, P.cab.c.z), new THREE.Quaternion(), esc);
      new THREE.Matrix4().copy(P.mW[P.i['Head']]).invert().multiply(alvo).decompose(cab.position, cab.quaternion, cab.scale);
      ossos[P.i['Head']].add(cab);
      var tronco = new THREE.Group(); new THREE.Matrix4().copy(P.mW[P.i['Spine1']]).invert().multiply(new THREE.Matrix4().makeTranslation(0, P.chao, 0)).decompose(tronco.position, tronco.quaternion, tronco.scale);
      ossos[P.i['Spine1']].add(tronco);
      acessorio(ac, cab, tronco, { ombro: P.yOmbro + 0.02 });
      corpo.userData.asas = tronco.userData.asas;
    }
    raiz.userData = { modelo: P, ossos: ossos, corpo: corpo, fase: Math.random() * 10, emote: null, emoteT: 0, yRosto: P.yRosto,
      e: { bE: [0.1, 0, 0.25], bD: [0.1, 0, 0.25], cE: [0, 0], cD: [0, 0], cab: [0, 0], quadril: 0, y: 0, tronco: 0 }, Wc: P.ossos.map(function () { return new THREE.Quaternion(); }) };
    animarModelo(raiz, { andando: false, sentado: false }, 1);
    return raiz;
  };
  // direção de um membro a partir de ângulos simples (no espaço do boneco: +Z frente, +Y cima, lado = sinal do lado)
  function dirMembro(frente, abrir, lado, out) {
    out.set(0, -Math.cos(frente), Math.sin(frente));                       // balança para frente/trás
    var c = Math.cos(abrir), s = Math.sin(abrir) * lado; var x = out.x * c - out.y * s, y = out.x * s + out.y * c; out.x = x; out.y = y; // abre para o lado
    return out.normalize();
  }
  var _d = new THREE.Vector3(), _d2 = new THREE.Vector3(), Qd = {};
  function animarModelo(a, est, dt) {
    var u = a.userData, P = u.modelo, O = u.ossos, e = u.e, t = (u.fase += dt), k = Math.min(1, dt * 9);
    var andando = est.andando, sentado = est.sentado, s = andando ? Math.sin(t * 7.5) : 0;
    // alvo (ângulos em radianos)
    var T = { bE: [0.05, 0.13, 0.25], bD: [0.05, 0.13, 0.25], cE: [0, 0], cD: [0, 0], cab: [0, 0], quadril: 0, y: 0, tronco: 0 };
    // braços: [frente, abrir, dobra do cotovelo]
    if (andando) { T.bE = [-s * 0.5, 0.1, 0.35 + Math.max(0, -s) * 0.3]; T.bD = [s * 0.5, 0.1, 0.35 + Math.max(0, s) * 0.3]; T.y = Math.abs(Math.cos(t * 7.5)) * 0.025; }
    else { T.bE[0] = Math.sin(t * 1.6) * 0.03; T.bD[0] = -T.bE[0]; T.y = Math.sin(t * 1.6) * 0.004; }
    // pernas: [frente da coxa, dobra do joelho]
    if (sentado) { T.cE = [1.5, 1.5]; T.cD = [1.5, 1.5]; T.y = (0.5 - P.yQuadril); T.bE = [0.45, 0.12, 0.9]; T.bD = [0.45, 0.12, 0.9]; }
    else if (andando) { T.cE = [s * 0.5, Math.max(0, -s) * 0.8 + 0.1]; T.cD = [-s * 0.5, Math.max(0, s) * 0.8 + 0.1]; }
    if (u.emote) {
      u.emoteT += dt; var em = u.emote, q = u.emoteT;
      if (em === 'acenar') { T.bD = [0.2, 2.5, 0.4 + Math.sin(q * 12) * 0.45]; T.cab = [0, -0.15]; }
      if (em === 'dancar') { T.bE = [0.3, 1.2 + Math.sin(q * 8) * 0.6, 1.3]; T.bD = [0.3, 1.2 + Math.sin(q * 8 + 1) * 0.6, 1.3]; T.quadril = Math.sin(q * 8) * 0.3; T.y += Math.abs(Math.sin(q * 8)) * 0.05; if (!sentado) { T.cE = [Math.max(0, Math.sin(q * 8)) * 0.4, Math.max(0, Math.sin(q * 8)) * 0.7]; T.cD = [Math.max(0, -Math.sin(q * 8)) * 0.4, Math.max(0, -Math.sin(q * 8)) * 0.7]; } }
      if (em === 'rir') { T.cab = [-0.3 + Math.sin(q * 20) * 0.08, 0]; T.bE = [0.5, 0.15, 1.6]; T.bD = [0.5, 0.15, 1.6]; T.tronco = Math.sin(q * 20) * 0.04; }
      if (em === 'palmas') { var bate = Math.sin(q * 14) * 0.12; T.bE = [1.1, -0.15 + bate, 0.9]; T.bD = [1.1, -0.15 + bate, 0.9]; }
      if (em === 'coracao') { T.bE = [0.1, 2.6, 1.7]; T.bD = [0.1, 2.6, 1.7]; T.cab = [0.1, 0]; }
      if (u.emoteT > (em === 'dancar' ? 6 : 2.4)) u.emote = null;
    }
    // suaviza
    function liso(a1, b1) { for (var i = 0; i < a1.length; i++) a1[i] += (b1[i] - a1[i]) * k; }
    liso(e.bE, T.bE); liso(e.bD, T.bD); liso(e.cE, T.cE); liso(e.cD, T.cD); liso(e.cab, T.cab);
    e.quadril += (T.quadril - e.quadril) * k; e.y += (T.y - e.y) * k; e.tronco += (T.tronco - e.tronco) * k;
    u.corpo.position.y = e.y;
    // rotações desejadas no espaço do boneco (delta sobre a pose de repouso)
    function mirar(nome, dRepouso, dAlvo) { var q = Qd[nome] || (Qd[nome] = new THREE.Quaternion()); return q.setFromUnitVectors(dRepouso, dAlvo); }
    var D = {};
    ['L', 'R'].forEach(function (l) {
      var lado = P['lado' + l], br = l === P.ladoEsq ? e.bE : (l === 'L' ? (P.ladoL > 0 ? e.bE : e.bD) : (P.ladoR > 0 ? e.bE : e.bD)), pr = l === 'L' ? (P.ladoL > 0 ? e.cE : e.cD) : (P.ladoR > 0 ? e.cE : e.cD);
      dirMembro(br[0], br[1], lado, _d); var qb = new THREE.Quaternion().setFromUnitVectors(P.dir[l + 'braco'], _d);
      dirMembro(br[0] + br[2], br[1], lado, _d2); var qa = new THREE.Quaternion().setFromUnitVectors(P.dir[l + 'ante'], _d2);
      D[P.i[l + ' UpperArm']] = qb; D[P.i[l + ' Forearm']] = qa; D[P.i[l + ' Hand']] = qa;
      var pc = P.dir[l + 'coxa']; _d.set(pc.x, -Math.cos(pr[0]), Math.sin(pr[0])).normalize(); var qc = new THREE.Quaternion().setFromUnitVectors(pc, _d);
      var pp = P.dir[l + 'perna']; _d2.set(pp.x, -Math.cos(pr[0] - pr[1]), Math.sin(pr[0] - pr[1])).normalize(); var qp = new THREE.Quaternion().setFromUnitVectors(pp, _d2);
      D[P.i[l + ' Thigh']] = qc; D[P.i[l + ' Calf']] = qp; D[P.i[l + ' Foot']] = new THREE.Quaternion();
    });
    var qCab = new THREE.Quaternion().setFromAxisAngle(EIXO_X, e.cab[0]); qCab.premultiply(_q.setFromAxisAngle(EIXO_Y, e.cab[1])); D[P.i['Head']] = qCab;
    if (e.tronco || e.quadril) { D[P.i['Spine1']] = new THREE.Quaternion().setFromAxisAngle(EIXO_Z, e.tronco).premultiply(_q.setFromAxisAngle(EIXO_Y, -e.quadril * 0.5)); D[P.i['Pelvis']] = new THREE.Quaternion().setFromAxisAngle(EIXO_Y, e.quadril); }
    // aplica de cima para baixo: local = (mundo do pai)^-1 * delta * mundo de repouso
    var Wc = u.Wc;
    for (var i = 0; i < P.ossos.length; i++) {
      var o = P.ossos[i], b = O[i];
      if (D[i]) { _q2.copy(D[i]).multiply(P.qW[i]); if (o.p >= 0) b.quaternion.copy(_q.copy(Wc[o.p]).invert().multiply(_q2)); else b.quaternion.copy(_q2); }
      else b.quaternion.copy(o.q);
      if (o.p >= 0) Wc[i].copy(Wc[o.p]).multiply(b.quaternion); else Wc[i].copy(b.quaternion);
    }
    if (u.corpo.userData.asas) u.corpo.userData.asas.forEach(function (w) { w.rotation.y = w.userData.s * (0.25 + Math.sin(t * 3) * 0.25); });
  }
  function animarFemina(a, est, dt) {
    var u = a.userData, t = (u.fase += dt), k = Math.min(1, dt * 8), andando = est.andando;
    var alvoY = andando ? Math.abs(Math.cos(t * 7.5)) * 0.025 : Math.sin(t * 1.6) * 0.004;
    u.corpo.position.y += (alvoY - u.corpo.position.y) * k;
    u.modeloGLB.rotation.y += ((andando ? Math.sin(t * 7.5) * 0.035 : Math.sin(t * 1.6) * 0.012) - u.modeloGLB.rotation.y) * k;
    u.modeloGLB.rotation.z += ((andando ? Math.sin(t * 7.5) * 0.018 : 0) - u.modeloGLB.rotation.z) * k;
    if (u.emote) { u.emoteT += dt; u.modeloGLB.rotation.y += Math.sin(u.emoteT * 10) * 0.02; if (u.emoteT > (u.emote === 'dancar' ? 6 : 2.4)) u.emote = null; }
  }
  AV.animar = function (a, est, dt) { if (a.userData.glbFemina) animarFemina(a, est, dt); else if (a.userData.modelo) animarModelo(a, est, dt); else AV.animarAntigo(a, est, dt); };
  AV.pronto = function () { return PRONTO; };
})();
