/* VIBE — aplicativo: telas, conexão com o servidor e ações. */
(function () {
  'use strict';
  var B = window.BASE, AV = window.AVATAR, CEN = window.CENARIO, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  [].forEach.call(document.querySelectorAll('.nm'), function (e) { e.textContent = B.NOME; }); document.title = B.NOME;
  $('promoN').textContent = B.REGRAS.CREDITOS_INICIAIS;

  /* ---------- 3D ---------- */
  CEN.init($('tres'), ler('vibe_qual') || 'normal');
  function foto(v, w, h, modo) { try { return AV.foto(CEN.renderer, v, w, h, modo); } catch (e) { return ''; } }
  var ultimo = performance.now();
  (function quadro(t) { requestAnimationFrame(quadro); var dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t; CEN.atualizar(dt, t / 1000); })(ultimo);

  /* ---------- conexão ---------- */
  var ws = null, conectado = false, pedidos = {}, nPed = 1, eu = null, filaEnvio = [];
  function conectar() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = function () { conectado = true; filaEnvio.splice(0).forEach(function (m) { ws.send(m); }); var tk = ler('vibe_token'); if (tk) chamar('retomar', { token: tk }).then(function (r) { if (r.erro) { gravar('vibe_token', null); if (!eu) inicioSemConta(); else sairConta(); } else { eu = r.eu; if (tela === 'carga' || tela === 'tBoas') entrarApp(); else atualizarEu(); } }); else if (!eu) inicioSemConta(); };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } receber(m); };
    ws.onclose = function () { conectado = false; aviso('Reconectando…'); setTimeout(conectar, 2000); if (salaAtual) { CEN.ativo = true; } };
  }
  function chamar(t, d) { return new Promise(function (ok) { var id = nPed++; pedidos[id] = ok; var m = JSON.stringify(Object.assign({}, d || {}, { t: t, _r: id })); if (conectado) ws.send(m); else filaEnvio.push(m); setTimeout(function () { if (pedidos[id]) { delete pedidos[id]; ok({ erro: 'Sem resposta do servidor.' }); } }, 15000); }); }
  function mandar(t, d) { var m = JSON.stringify(Object.assign({ t: t }, d || {})); if (conectado) ws.send(m); }
  function receber(m) {
    if (m.t === 'resp') { var f = pedidos[m._r]; if (f) { delete pedidos[m._r]; f(m); } return; }
    if (m.t === 'notif') { if (eu) eu.naoLidas = m.naoLidas; marcarNotif(); if (m.n && m.n.txt) aviso('🔔 ' + m.n.txt); return; }
    if (!salaAtual) return;
    if (m.t === 'sala:entrou') { membros[m.m.id] = m.m; CEN.membro(m.m.id, m.m.nome, m.m.visual, m.m.p, false); logSala(m.m, 'juntou-se ao chat'); contarSala(); }
    if (m.t === 'sala:saiu') { var q = membros[m.id]; CEN.sair(m.id); if (q) logSala(q, 'saiu do chat'); delete membros[m.id]; contarSala(); }
    if (m.t === 'sala:ir') { CEN.ir(m.id, m.p); if (membros[m.id]) membros[m.id].p = m.p; }
    if (m.t === 'sala:fala') { if (eu.bloqueados.indexOf(m.id) >= 0) return; CEN.fala(m.id, m.txt); logSala(membros[m.id] || { nome: m.nome }, m.txt, true); }
    if (m.t === 'sala:emote') { CEN.emote(m.id, m.e); var em = B.EMOTES.filter(function (k) { return k[0] === m.e; })[0]; if (em && membros[m.id]) logSala(membros[m.id], em[1] + ' ' + em[2].toLowerCase()); }
    if (m.t === 'sala:visual') { var mb = membros[m.id]; if (mb) { mb.visual = m.visual; CEN.membro(m.id, mb.nome, m.visual, mb.p, m.id === eu.id); } }
  }

  /* ---------- telas ---------- */
  var tela = 'carga', pagina = 'pInicio';
  function mostrar(t) { tela = t; ['tBoas', 'tCadastro', 'tLogin'].forEach(function (k) { $(k).hidden = k !== t; }); $('app').hidden = t !== 'app'; $('tSala').hidden = t !== 'sala'; if (t !== 'carga') { $('carga').classList.add('sai'); setTimeout(function () { $('carga').hidden = true; }, 400); } }
  function aviso(t) { var e = $('aviso'); e.textContent = t; e.classList.add('on'); clearTimeout(aviso.h); aviso.h = setTimeout(function () { e.classList.remove('on'); }, 2600); }
  function janela(html, iniciar) { $('janela').innerHTML = html; $('janela').hidden = false; $('fundo').hidden = false; if (iniciar) iniciar($('janela')); }
  function fecharJanela() { $('janela').hidden = true; $('fundo').hidden = true; }
  $('fundo').onclick = fecharJanela;
  [].forEach.call(document.querySelectorAll('[data-voltar]'), function (b) { b.onclick = function () { mostrar(b.getAttribute('data-voltar')); CEN.palco(visualEscolhido); }; });

  /* ---------- boas-vindas: escolha do primeiro visual ---------- */
  var visualEscolhido = B.INICIAIS[0];
  function inicioSemConta() {
    mostrar('tBoas'); CEN.palco(visualEscolhido);
    var g = $('iniciais'); if (!g.children.length) {
      g.innerHTML = B.INICIAIS.map(function (v, i) { return '<button data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + ' aria-label="Visual ' + (i + 1) + '"><img alt="" src="' + foto(v, 90, 116) + '"></button>'; }).join('');
      [].forEach.call(g.children, function (b) { b.onclick = function () { [].forEach.call(g.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); visualEscolhido = Object.assign({}, B.INICIAIS[+b.getAttribute('data-i')]); CEN.palco(visualEscolhido); }; });
    }
  }
  $('btProximo').onclick = function () { visualEscolhido = Object.assign({}, visualEscolhido); $('cadFoto').src = foto(visualEscolhido, 104, 104, 'rosto'); mostrar('tCadastro'); };
  $('lkEntrar').onclick = function (e) { e.preventDefault(); mostrar('tLogin'); };
  $('lkCriar').onclick = function (e) { e.preventDefault(); visualEscolhido = Object.assign({}, visualEscolhido); $('cadFoto').src = foto(visualEscolhido, 104, 104, 'rosto'); mostrar('tCadastro'); };
  $('fCadastro').onsubmit = function (e) {
    e.preventDefault(); $('cErro').textContent = ''; $('btCadastrar').disabled = true;
    chamar('cadastrar', { nome: $('cNome').value, email: $('cEmail').value, senha: $('cSenha').value, nasc: $('cNasc').value, visual: visualEscolhido }).then(function (r) {
      $('btCadastrar').disabled = false; if (r.erro) { $('cErro').textContent = r.erro; return; }
      gravar('vibe_token', r.token); eu = r.eu; entrarApp(); aviso('Conta criada! Você ganhou ' + B.REGRAS.CREDITOS_INICIAIS + ' créditos 🎉');
    });
  };
  $('fLogin').onsubmit = function (e) {
    e.preventDefault(); $('lErro').textContent = ''; $('btEntrar').disabled = true;
    chamar('entrar', { email: $('lEmail').value, senha: $('lSenha').value }).then(function (r) { $('btEntrar').disabled = false; if (r.erro) { $('lErro').textContent = r.erro; return; } gravar('vibe_token', r.token); eu = r.eu; entrarApp(); });
  };
  function sairConta() { chamar('sair', { token: ler('vibe_token') }); gravar('vibe_token', null); eu = null; mostrar('tBoas'); inicioSemConta(); }

  /* ---------- aplicativo ---------- */
  function entrarApp() { mostrar('app'); atualizarEu(); irPara('pInicio'); }
  function atualizarEu() {
    if (!eu) return;
    $('iCred').textContent = eu.creditos; $('lCred').textContent = eu.creditos; $('iFoto').src = eu.foto || foto(eu.visual, 54, 54, 'rosto'); marcarNotif(); if ($('rolMarca')) marcarRoleta();
  }
  function marcarNotif() { var n = eu ? eu.naoLidas : 0; $('nNotif').hidden = !n; $('nNotif').textContent = n > 9 ? '9+' : n; }
  [].forEach.call(document.querySelectorAll('[data-ir]'), function (b) { b.onclick = function () { irPara(b.getAttribute('data-ir')); }; });
  function irPara(p) {
    pagina = p; ['pInicio', 'pFeed', 'pSalas', 'pVestir', 'pNotif', 'pLoja', 'pPerfil', 'pEditar'].forEach(function (k) { $(k).hidden = k !== p; });
    [].forEach.call(document.querySelectorAll('.barra button'), function (b) { b.classList.toggle('on', b.getAttribute('data-ir') === p); });
    $('barra').hidden = p === 'pEditar';
    var com3d = p === 'pInicio' || p === 'pVestir'; CEN.ativo = com3d;
    if (p === 'pInicio') { CEN.palco(eu.visual); montarInicio(); }
    if (p === 'pVestir') abrirVestir();
    if (p === 'pFeed') carregarFeed();
    if (p === 'pSalas') carregarSalas();
    if (p === 'pNotif') carregarNotif();
    if (p === 'pLoja') montarLoja();
  }

  /* início */
  var abaInicio = 'vestir';
  [].forEach.call(document.querySelectorAll('.abas3 button'), function (b) { b.onclick = function () { abaInicio = b.getAttribute('data-aba'); [].forEach.call(document.querySelectorAll('.abas3 button'), function (x) { x.classList.toggle('on', x === b); }); montarInicio(); }; });
  function montarInicio() {
    var A = {
      vestir: [['🛍️', 'Loja', function () { irPara('pLoja'); }], ['👕', 'Mudar meu visual', function () { irPara('pVestir'); }], ['📸', 'Publicar no Feed', publicarFotoAvatar], ['🎁', 'Ganhar créditos', pegarBonus]],
      amizade: [['🔎', 'Procurar pessoas', function () { irPara('pSalas'); setTimeout(function () { $('busca').focus(); }, 100); }], ['💬', 'Entrar numa sala', function () { irPara('pSalas'); }], ['📰', 'Ver o Feed', function () { irPara('pFeed'); }], ['👤', 'Meu perfil', function () { abrirPerfil(eu.id); }]],
      recomp: [['🎡', 'Giro diário', abrirRoleta], ['🎁', 'Bônus diário', pegarBonus], ['⚙️', 'Gráficos', configurar], ['🚪', 'Sair da conta', function () { janela('<h3>Sair da conta?</h3><div class="linha-bt"><button class="bt-borda" id="jNao">Cancelar</button><button class="bt-borda cheio" id="jSim">Sair</button></div>', function () { $('jNao').onclick = fecharJanela; $('jSim').onclick = function () { fecharJanela(); sairConta(); }; }); }], ['📜', 'Regras', regras]]
    }[abaInicio];
    $('acoesInicio').innerHTML = A.map(function (a, i) { return '<button data-i="' + i + '"><i>' + a[0] + '</i>' + a[1] + '</button>'; }).join('');
    [].forEach.call($('acoesInicio').children, function (b) { b.onclick = A[+b.getAttribute('data-i')][2]; });
  }
  CEN.aoTocarPalco = function () { if (tela === 'app' && pagina === 'pInicio' && CEN.alvoPalco) AV.emote(CEN.alvoPalco, ['acenar', 'dancar', 'coracao'][Math.floor(Math.random() * 3)]); };
  $('btMeuPerfil').onclick = function () { abrirPerfil(eu.id); };
  function pegarBonus() { chamar('bonus').then(function (r) { if (r.erro) return aviso(r.erro); eu = r.eu; atualizarEu(); aviso('🎁 +' + r.ganhou + ' créditos!'); }); }
  $('btBonus').onclick = pegarBonus; $('btBonus2').onclick = pegarBonus;
  function configurar() { janela('<h3>Gráficos</h3><button class="opcao" data-q="normal">Normal (bonito)</button><button class="opcao" data-q="leve">Leve (celular simples)</button><p class="mini-txt">Muda depois de abrir o app de novo.</p>', function (j) { [].forEach.call(j.querySelectorAll('[data-q]'), function (b) { b.onclick = function () { gravar('vibe_qual', b.getAttribute('data-q')); fecharJanela(); aviso('Pronto! Reabra o app para aplicar.'); }; }); }); }
  function regras() { janela('<h3>Regras do ' + esc(B.NOME) + '</h3><p class="mini-txt" style="font-size:14px;color:#ddd">• Idade mínima: ' + B.REGRAS.IDADE_MIN + ' anos.<br>• Nada de nudez, conteúdo sexual ou assédio.<br>• Respeite todo mundo. Sem ofensas, ameaças ou golpes.<br>• Não compartilhe senha, endereço ou telefone.<br>• Use Bloquear e Denunciar no perfil ou no post quando precisar.</p><button class="bt-ouro" id="jOk">ENTENDI</button>', function () { $('jOk').onclick = fecharJanela; }); }

  /* ---------- guarda-roupa ---------- */
  var rascunho = null, catVestir = 'corpo';
  function abrirVestir() { rascunho = JSON.parse(JSON.stringify(eu.visual)); CEN.palco(rascunho); montarCats(); montarOpcoes(); }
  function montarCats() {
    var cats = [['corpo', 'Corpo']].concat(B.CATS);
    $('catsVestir').innerHTML = cats.map(function (c) { return '<button data-c="' + c[0] + '"' + (c[0] === catVestir ? ' class="on"' : '') + '>' + c[1] + '</button>'; }).join('');
    [].forEach.call($('catsVestir').children, function (b) { b.onclick = function () { catVestir = b.getAttribute('data-c'); montarCats(); montarOpcoes(); }; });
  }
  function hex(c) { return '#' + ('00000' + c.toString(16)).slice(-6); }
  function montarOpcoes() {
    var o = $('opcoesVestir'), h = '';
    if (catVestir === 'corpo') {
      h += '<div class="titulo-op">CORPO</div><button class="op corpo-bt' + (rascunho.corpo === 'f' && rascunho.modelo !== 'gangsta' ? ' on' : '') + '" data-corpo="f" data-modelo="femina">Femina</button><button class="op corpo-bt' + (rascunho.corpo === 'f' && rascunho.modelo === 'gangsta' ? ' on' : '') + '" data-corpo="f" data-modelo="gangsta">Gangsta Girl</button><button class="op corpo-bt' + (rascunho.corpo === 'm' ? ' on' : '') + '" data-corpo="m">Masculino</button>';
      h += '<div class="titulo-op">PELE</div>' + B.PELES.map(function (c, i) { return '<button class="cor' + (rascunho.pele === i ? ' on' : '') + '" data-pele="' + i + '" style="background:' + hex(c) + '"></button>'; }).join('');
      h += '<div class="titulo-op">OLHOS</div>' + B.CORES_OLHO.map(function (c, i) { return '<button class="cor' + (rascunho.olhos === i ? ' on' : '') + '" data-olhos="' + i + '" style="background:' + hex(c) + '"></button>'; }).join('');
    } else {
      if (catVestir === 'cabelo') h += '<div class="titulo-op">COR DO CABELO</div>' + B.CORES_CABELO.map(function (c, i) { return '<button class="cor' + (rascunho.corCabelo === i ? ' on' : '') + '" data-cc="' + i + '" style="background:' + hex(c) + '"></button>'; }).join('') + '<div class="titulo-op">ESTILO</div>';
      h += B.CATALOGO.filter(function (it) { return it.cat === catVestir; }).map(function (it) {
        var tem = it.preco === 0 || eu.inventario.indexOf(it.id) >= 0, v = Object.assign({}, rascunho); v[it.cat] = it.id;
        return '<button class="op' + (rascunho[it.cat] === it.id ? ' on' : '') + (tem ? '' : ' trancado') + '" data-item="' + it.id + '"><img alt="" src="' + foto(v, 80, 100, it.cat === 'cabelo' || it.cat === 'acessorio' ? 'rosto' : '') + '">' + (tem ? '' : '<em class="preco">🪙' + it.preco + '</em>') + '<span>' + esc(it.nome) + '</span></button>';
      }).join('');
    }
    o.innerHTML = h;
    [].forEach.call(o.querySelectorAll('button'), function (b) {
      b.onclick = function () {
        var d = b.dataset;
        if (d.corpo) rascunho.corpo = d.corpo; if (d.modelo) rascunho.modelo = d.modelo; if (d.pele) rascunho.pele = +d.pele; if (d.olhos) rascunho.olhos = +d.olhos; if (d.cc) rascunho.corCabelo = +d.cc;
        if (d.item) { var it = B.ITEM[d.item]; if (!(it.preco === 0 || eu.inventario.indexOf(it.id) >= 0)) return comprarJanela(it); rascunho[it.cat] = it.id; }
        CEN.palco(rascunho); montarOpcoes();
      };
    });
  }
  $('btSalvarVisual').onclick = function () { chamar('salvarVisual', { visual: rascunho }).then(function (r) { if (r.erro) return aviso(r.erro); eu = r.eu; atualizarEu(); aviso('Visual salvo ✨'); }); };

  /* ---------- loja ---------- */
  var catLoja = 'top';
  function montarLoja() {
    $('chipsLoja').innerHTML = B.CATS.map(function (c) { return '<button data-c="' + c[0] + '"' + (c[0] === catLoja ? ' class="on"' : '') + '>' + c[1] + '</button>'; }).join('');
    [].forEach.call($('chipsLoja').children, function (b) { b.onclick = function () { catLoja = b.getAttribute('data-c'); montarLoja(); }; });
    var L = B.CATALOGO.filter(function (it) { return it.cat === catLoja && it.preco > 0; });
    $('gradeLoja').innerHTML = L.map(function (it) {
      var v = Object.assign({}, eu.visual); v[it.cat] = it.id; var tem = eu.inventario.indexOf(it.id) >= 0;
      return '<button class="produto" data-item="' + it.id + '"><div class="img"><img alt="" src="' + foto(v, 160, 160, it.cat === 'cabelo' || it.cat === 'acessorio' ? 'rosto' : '') + '"></div><b>' + esc(it.nome) + '</b><div class="preco">' + (tem ? '<span class="tem">✓ Você tem</span>' : '<span>🪙 ' + it.preco + '</span><span>🛒</span>') + '</div></button>';
    }).join('');
    [].forEach.call($('gradeLoja').children, function (b) { b.onclick = function () { comprarJanela(B.ITEM[b.getAttribute('data-item')]); }; });
  }
  function comprarJanela(it) {
    var v = Object.assign({}, eu.visual); v[it.cat] = it.id; var tem = eu.inventario.indexOf(it.id) >= 0;
    janela('<img class="previa" alt="" src="' + foto(v, 300, 300) + '"><h3>' + esc(it.nome) + '</h3><p class="mini-txt">Você tem 🪙 ' + eu.creditos + ' créditos.</p>' + (tem ? '<button class="bt-ouro" id="jUsar">VESTIR AGORA</button>' : '<button class="bt-ouro" id="jComprar">COMPRAR POR 🪙 ' + it.preco + '</button>'), function () {
      if (tem) $('jUsar').onclick = function () { var nv = Object.assign({}, eu.visual); nv[it.cat] = it.id; chamar('salvarVisual', { visual: nv }).then(function (r) { if (!r.erro) { eu = r.eu; atualizarEu(); aviso('Vestido ✨'); } fecharJanela(); }); };
      else $('jComprar').onclick = function () { chamar('comprar', { item: it.id }).then(function (r) { if (r.erro) return aviso(r.erro); eu = r.eu; atualizarEu(); fecharJanela(); aviso('Comprado! ✨ Vá em Mudar visual para vestir.'); if (pagina === 'pLoja') montarLoja(); if (pagina === 'pVestir') montarOpcoes(); }); };
    });
  }

  /* ---------- feed ---------- */
  var abaFeed = 'descubra';
  [].forEach.call(document.querySelectorAll('[data-feed]'), function (b) { b.classList.toggle('on', b.getAttribute('data-feed') === abaFeed); b.onclick = function () { abaFeed = b.getAttribute('data-feed'); [].forEach.call(document.querySelectorAll('[data-feed]'), function (x) { x.classList.toggle('on', x === b); }); carregarFeed(); }; });
  function quando(t) { var s = (Date.now() - t) / 1000; return s < 60 ? 'agora' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; }
  function carregarFeed() { $('listaFeed').innerHTML = '<p class="vazio">Carregando…</p>'; chamar('feed', { aba: abaFeed }).then(function (r) { desenharPosts($('listaFeed'), r.posts || [], abaFeed === 'seguindo' ? 'Você ainda não segue ninguém. Veja a aba Descubra!' : 'Nenhuma postagem ainda. Seja o primeiro!'); }); }
  function desenharPosts(el, posts, vazio) {
    if (!posts.length) { el.innerHTML = '<p class="vazio">' + vazio + '</p>'; return; }
    el.innerHTML = posts.map(postHtml).join('');
    ligarPosts(el, posts);
  }
  function postHtml(p) {
    var a = p.autor || { nome: '?', visual: B.INICIAIS[0] };
    return '<article class="post" data-id="' + p.id + '"><div class="post-cab"><img class="foto-redonda" alt="" data-perfil="' + (a.id || '') + '" src="' + foto(a.visual, 46, 46, 'rosto') + '"><div><b data-perfil="' + (a.id || '') + '">' + esc(a.nome) + '</b><small>' + quando(p.em) + '</small></div><button class="menu" data-menu aria-label="Opções">⋯</button></div>' +
      (p.texto ? '<p>' + esc(p.texto) + '</p>' : '') + (p.foto ? '<img class="foto" alt="Foto 3D" src="' + p.foto + '">' : '') +
      '<div class="post-acoes"><button data-curtir class="' + (p.curti ? 'curti' : '') + '">' + (p.curti ? '♥' : '♡') + ' ' + p.curtidas + '</button><button data-coment>💬 ' + p.comentarios.length + '</button></div>' +
      '<div class="coments" hidden>' + p.comentarios.map(function (c) { return '<div><b>' + esc(c.nome) + '</b>' + esc(c.txt) + '</div>'; }).join('') + '</div><form class="coment-form" hidden><input maxlength="200" placeholder="Comentar…"><button class="bt-ouro mini">OK</button></form></article>';
  }
  function ligarPosts(el, posts) {
    [].forEach.call(el.querySelectorAll('.post'), function (art, i) {
      var p = posts[i];
      function trocar(np) { posts[i] = np; var d = document.createElement('div'); d.innerHTML = postHtml(np); var novo = d.firstChild; art.replaceWith(novo); ligarPosts(el, posts); var c = novo.querySelector('.coments'); if (art.querySelector('.coments') && !art.querySelector('.coments').hidden) { c.hidden = false; novo.querySelector('.coment-form').hidden = false; } }
      art.querySelector('[data-curtir]').onclick = function () { chamar('curtir', { post: p.id }).then(function (r) { if (r.post) trocar(r.post); }); };
      art.querySelector('[data-coment]').onclick = function () { var c = art.querySelector('.coments'), f = art.querySelector('.coment-form'); c.hidden = !c.hidden; f.hidden = c.hidden; if (!f.hidden) f.querySelector('input').focus(); };
      art.querySelector('.coment-form').onsubmit = function (e) { e.preventDefault(); var v = this.querySelector('input').value.trim(); if (!v) return; chamar('comentar', { post: p.id, txt: v }).then(function (r) { if (r.erro) return aviso(r.erro); trocar(r.post); var n = el.querySelector('[data-id="' + p.id + '"]'); n.querySelector('.coments').hidden = false; n.querySelector('.coment-form').hidden = false; }); };
      [].forEach.call(art.querySelectorAll('[data-perfil]'), function (x) { x.onclick = function () { if (p.autor) abrirPerfil(p.autor.id); }; });
      art.querySelector('[data-menu]').onclick = function () {
        var meu = p.autor && p.autor.id === eu.id;
        janela((meu || eu.admin ? '<button class="opcao perigo" id="jApagar">🗑 Apagar postagem</button>' : '') + (meu ? '' : '<button class="opcao perigo" id="jDenPost">⚑ Denunciar postagem</button>') + '<button class="opcao" id="jFechar">Cancelar</button>', function () {
          $('jFechar').onclick = fecharJanela;
          if ($('jApagar')) $('jApagar').onclick = function () { chamar('apagarPost', { post: p.id }).then(function () { fecharJanela(); art.remove(); aviso('Postagem apagada.'); }); };
          if ($('jDenPost')) $('jDenPost').onclick = function () { denunciar('post', p.id); };
        });
      };
    });
  }
  $('btTexto').onclick = function () { janela('<h3>Nova postagem</h3><textarea id="jTxt" maxlength="' + B.REGRAS.MAX_TEXTO_POST + '" placeholder="No que você está pensando?"></textarea><div class="linha-bt"><button class="bt-borda" id="jNao">Cancelar</button><button class="bt-ouro" id="jPub">PUBLICAR</button></div>', function () { $('jNao').onclick = fecharJanela; $('jTxt').focus(); $('jPub').onclick = function () { publicar({ texto: $('jTxt').value }); }; }); };
  $('btFoto3d').onclick = publicarFotoAvatar;
  function publicarFotoAvatar() {
    var antes = pagina; irPara('pInicio'); CEN.palco(eu.visual);
    setTimeout(function () { var f = CEN.foto(); if (antes !== 'pInicio') irPara(antes); janelaFoto(f); }, 350);
  }
  function janelaFoto(f) { janela('<h3>Foto 3D</h3><img class="previa" alt="" src="' + f + '"><textarea id="jTxt" maxlength="' + B.REGRAS.MAX_TEXTO_POST + '" placeholder="Escreva uma legenda (opcional)" style="min-height:60px"></textarea><div class="linha-bt"><button class="bt-borda" id="jNao">Cancelar</button><button class="bt-ouro" id="jPub">PUBLICAR</button></div>', function () { $('jNao').onclick = fecharJanela; $('jPub').onclick = function () { publicar({ texto: $('jTxt').value, foto: f }); }; }); }
  function publicar(d) { $('jPub').disabled = true; chamar('postar', d).then(function (r) { if ($('jPub')) $('jPub').disabled = false; if (r.erro) return aviso(r.erro); fecharJanela(); aviso('Publicado no Feed ✨'); if (pagina === 'pFeed') carregarFeed(); }); }

  /* ---------- salas ---------- */
  var FUNDOS = { neon: 'linear-gradient(160deg,#2a0f4a,#0a0420 60%,#ff3fd0)', praia: 'linear-gradient(180deg,#ff8a5c,#ffc27a 55%,#2f8fb8 56%,#e8cf98)', cafe: 'linear-gradient(160deg,#e8d8c0,#8a5a3a)', cobertura: 'linear-gradient(180deg,#0a0f2a,#2a1f4a 60%,#2fb8e8)', jardim: 'linear-gradient(160deg,#9fd8ff,#3f7a4a)', dark: 'linear-gradient(160deg,#3a3a40,#0e0e10)' };
  var ICONES = { neon: '🪩', praia: '🌅', cafe: '☕', cobertura: '🏙️', jardim: '🌿', dark: '🖤' };
  function cartaoSala(s) { return '<button class="cartao-sala" data-sala="' + s.id + '"><div class="thumb-sala" style="background:' + FUNDOS[s.tema] + '"><span class="olho">👁 ' + s.pessoas + '</span><span style="position:absolute;inset:0;display:grid;place-items:center;font-size:54px">' + ICONES[s.tema] + '</span></div><b>' + esc(s.nome) + '</b><small>👤 ' + s.pessoas + ' · até ' + s.max + ' por sala</small></button>'; }
  function carregarSalas() {
    chamar('salas').then(function (r) {
      var L = (r.salas || []).slice(), dest = L.slice().sort(function (a, b) { return b.pessoas - a.pessoas; }).slice(0, 3);
      $('salasDest').innerHTML = dest.map(cartaoSala).join(''); $('salasTodas').innerHTML = L.map(cartaoSala).join('');
      [].forEach.call(document.querySelectorAll('[data-sala]'), function (b) { b.onclick = function () { entrarSala(b.getAttribute('data-sala')); }; });
    });
  }
  var buscaT = 0;
  $('busca').oninput = function () { clearTimeout(buscaT); var q = this.value.trim(); if (q.length < 2) { $('resBusca').innerHTML = ''; return; } buscaT = setTimeout(function () { chamar('buscar', { q: q }).then(function (r) { $('resBusca').innerHTML = (r.pessoas || []).map(function (p) { return '<button data-p="' + p.id + '"><img class="foto-redonda" alt="" src="' + foto(p.visual, 36, 36, 'rosto') + '"><b>' + esc(p.nome) + '</b>' + (p.online ? ' <small style="color:#2ecc71">● online</small>' : '') + '</button>'; }).join('') || '<button disabled>Ninguém encontrado</button>'; [].forEach.call($('resBusca').querySelectorAll('[data-p]'), function (b) { b.onclick = function () { $('resBusca').innerHTML = ''; $('busca').value = ''; abrirPerfil(b.getAttribute('data-p')); }; }); }); }, 300); };

  var salaAtual = null, membros = {};
  function entrarSala(tipo) {
    chamar('entrarSala', { sala: tipo }).then(function (r) {
      if (r.erro) return aviso(r.erro);
      salaAtual = r.sala; membros = {}; mostrar('sala'); CEN.ativo = true;
      $('salaNome').textContent = r.sala.nome; $('logSala').innerHTML = ''; $('chatSala').classList.remove('aberto'); $('emotes').hidden = true;
      CEN.sala(B.SALA[tipo].tema, eu.id);
      r.membros.forEach(function (mb) { membros[mb.id] = mb; CEN.membro(mb.id, mb.nome, mb.visual, mb.p, mb.id === eu.id); if (mb.id !== eu.id) logSala(mb, 'está no chat'); });
      logSala(Object.assign({ voce: true }, membros[eu.id] || eu), 'juntou-se ao chat'); contarSala();
      $('dicaSala').style.opacity = 1; setTimeout(function () { $('dicaSala').style.opacity = 0; }, 5000);
    });
  }
  function contarSala() { $('salaN').textContent = Object.keys(membros).length + '/' + B.REGRAS.MAX_SALA; }
  CEN.aoTocarPonto(function (p) { if (CEN.ocupado(p)) return aviso('Lugar ocupado'); chamar('ir', { p: p }).then(function (r) { if (r && r.erro) aviso(r.erro); }); });
  function logSala(mb, txt, fala) {
    var li = document.createElement('li'), v = mb.visual || (membros[mb.id] && membros[mb.id].visual) || B.INICIAIS[0];
    li.innerHTML = '<img alt="" src="' + foto(v, 40, 40, 'rosto') + '"><div><small>' + (mb.voce || mb.id === (eu && eu.id) ? 'Você' : esc(mb.nome || '')) + '</small>' + esc(txt) + '</div>';
    if (mb.id) li.querySelector('img').onclick = function () { if (mb.id !== eu.id) abrirPerfil(mb.id); };
    $('logSala').appendChild(li); while ($('logSala').children.length > 80) $('logSala').removeChild($('logSala').firstChild); $('logSala').scrollTop = 1e9;
  }
  $('btPuxar').onclick = function () { $('chatSala').classList.toggle('aberto'); };
  $('btSairSala').onclick = function () { chamar('sairSala'); salaAtual = null; membros = {}; mostrar('app'); irPara('pSalas'); };
  $('fFala').onsubmit = function (e) { e.preventDefault(); var t = $('txtFala').value.trim(); if (!t) return; $('txtFala').value = ''; chamar('falar', { txt: t }).then(function (r) { if (r && r.erro) aviso(r.erro); }); };
  $('emotes').innerHTML = B.EMOTES.map(function (e) { return '<button data-e="' + e[0] + '">' + e[1] + '<span>' + e[2] + '</span></button>'; }).join('');
  [].forEach.call($('emotes').children, function (b) { b.onclick = function () { mandar('emote', { e: b.getAttribute('data-e') }); $('emotes').hidden = true; }; });
  $('btEmo').onclick = function () { $('emotes').hidden = !$('emotes').hidden; };
  $('btFotoSala').onclick = function () { janelaFoto(CEN.foto()); };
  $('btMenuSala').onclick = function () {
    var outros = Object.keys(membros).filter(function (id) { return id !== eu.id; });
    janela('<h3>Pessoas na sala</h3>' + (outros.map(function (id) { return '<button class="opcao" data-p="' + id + '">👤 ' + esc(membros[id].nome) + '</button>'; }).join('') || '<p class="mini-txt">Só você por enquanto. Chame amigos!</p>') + '<button class="opcao" id="jRegras">📜 Regras</button><button class="opcao" id="jFechar">Fechar</button>', function (j) {
      $('jFechar').onclick = fecharJanela; $('jRegras').onclick = regras;
      [].forEach.call(j.querySelectorAll('[data-p]'), function (b) { b.onclick = function () { fecharJanela(); abrirPerfil(b.getAttribute('data-p')); }; });
    });
  };

  /* ---------- perfil ---------- */
  var voltarDe = 'pInicio', perfilAtual = null;
  function temaCss(t) { var k = B.PERFIL.temas.filter(function (x) { return x[0] === t; })[0]; return (k || B.PERFIL.temas[0])[1]; }
  var MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  function dataBr(t) { var d = new Date(t); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function abrirPerfil(id) {
    chamar('perfil', { id: id }).then(function (r) {
      if (r.erro) return aviso(r.erro);
      var p = r.perfil, meu = p.id === eu.id; perfilAtual = p;
      if (tela === 'sala') { $('app').hidden = false; $('tSala').hidden = true; tela = 'app'; voltarDe = 'sala'; } else if (pagina !== 'pPerfil' && pagina !== 'pEditar') voltarDe = pagina;
      irPara('pPerfil'); CEN.ativo = false; fecharJanela();
      $('pfCapa').style.background = temaCss(p.tema);
      $('pfCorpo').src = foto(p.visual, 260, 360); $('pfRosto').src = p.foto || foto(p.visual, 104, 104, 'rosto');
      $('pfNome').textContent = '@' + p.nome; $('pfOnline').textContent = p.online ? 'online agora' : ''; $('pfBolinha').hidden = !p.online;
      $('btEditarPerfil').hidden = !meu;
      $('pfSeg').textContent = p.seguidores; $('pfSeguindo').textContent = p.seguindo; $('pfAmigos').textContent = p.amigos;
      $('pfBio').textContent = p.bio ? p.bio.toUpperCase() : (meu ? 'Toque em EDITAR para escrever sua bio.' : '');
      $('pfBotoes').innerHTML = meu ? '<button class="bt-borda" id="pfEditar">EDITAR</button>' : '<button class="bt-borda ' + (p.sigo ? '' : 'cheio') + '" id="pfSeguir">' + (p.sigo ? 'SEGUINDO' : 'SEGUIR') + '</button><button class="bt-borda" id="pfMais">⋯</button>';
      // aba Sobre
      var h = '';
      if (p.sala && !meu) h += '<h4><i>💬</i>ESTÁ NA SALA</h4><div class="na-sala"><p style="margin:0">' + esc(p.sala.nome) + '</p><button class="bt-ouro mini" id="pfIrSala">ENTRAR</button></div>';
      if (p.tags && p.tags.length) h += '<h4><i>#</i>HASHTAGS</h4><div class="pf-tags">' + p.tags.map(function (t) { return '<span>#' + esc(t) + '</span>'; }).join('') + '</div>';
      if (p.rel && p.rel !== 'Prefiro não dizer') h += '<h4><i>💍</i>STATUS DE RELACIONAMENTO</h4><p>' + esc(p.rel) + '</p>';
      if (p.aqui) h += '<h4><i>🎚</i>AQUI POR</h4><p>' + esc(p.aqui) + '</p>';
      if (p.pais) h += '<h4><i>🌎</i>PAÍS</h4><p>' + esc(p.pais) + '</p>';
      if (p.idade != null || (p.sexo && p.sexo !== 'Prefiro não dizer')) h += '<h4><i>👤</i>SOBRE</h4><p>' + [p.idade != null ? p.idade + ' anos' : '', p.sexo && p.sexo !== 'Prefiro não dizer' ? p.sexo : ''].filter(Boolean).join(' · ') + '</p>';
      h += '<h4><i>📅</i>MEMBRO DESDE</h4><p>' + dataBr(p.criado) + '</p>';
      $('pfSobre').innerHTML = h;
      if ($('pfIrSala')) $('pfIrSala').onclick = function () { entrarSala(p.sala.tipo); };
      abaPerfil('sobre');
      if (meu) $('pfEditar').onclick = abrirEditar;
      else {
        $('pfSeguir').onclick = function () { chamar('seguir', { id: p.id, sim: !p.sigo }).then(function (r2) { if (r2.erro) return aviso(r2.erro); abrirPerfil(p.id); }); };
        $('pfMais').onclick = function () { janela('<h3>' + esc(p.nome) + '</h3><button class="opcao perigo" id="jBloq">' + (p.bloqueado ? '✓ Desbloquear' : '⛔ Bloquear') + '</button><button class="opcao perigo" id="jDen">⚑ Denunciar perfil</button><button class="opcao" id="jFechar">Cancelar</button>', function () {
          $('jFechar').onclick = fecharJanela; $('jDen').onclick = function () { denunciar('usuario', p.id); };
          $('jBloq').onclick = function () { chamar('bloquear', { id: p.id, sim: !p.bloqueado }).then(function (r2) { if (r2.eu) eu = r2.eu; fecharJanela(); aviso(p.bloqueado ? 'Desbloqueado.' : 'Bloqueado. Você não verá mais essa pessoa.'); abrirPerfil(p.id); }); };
        }); };
      }
      $('pfPosts').innerHTML = '<p class="vazio">Carregando…</p>';
      chamar('feed', { aba: 'descubra', de: p.id }).then(function (r2) { desenharPosts($('pfPosts'), r2.posts || [], 'Nenhuma postagem ainda.'); });
    });
  }
  function abaPerfil(a) { [].forEach.call(document.querySelectorAll('[data-pfaba]'), function (b) { b.classList.toggle('on', b.getAttribute('data-pfaba') === a); }); $('pfSobre').hidden = a !== 'sobre'; $('pfPosts').hidden = a !== 'posts'; }
  [].forEach.call(document.querySelectorAll('[data-pfaba]'), function (b) { b.onclick = function () { abaPerfil(b.getAttribute('data-pfaba')); }; });
  $('btFecharPerfil').onclick = function () { if (voltarDe === 'sala' && salaAtual) { mostrar('sala'); CEN.ativo = true; } else irPara(voltarDe === 'pPerfil' || voltarDe === 'pEditar' ? 'pInicio' : voltarDe); };
  $('btEditarPerfil').onclick = function () { abrirEditar(); };

  /* ---------- editar perfil ---------- */
  var ed = null;
  function abrirEditar() {
    ed = { nome: eu.nome, bio: eu.bio || '', perfil: JSON.parse(JSON.stringify(eu.perfil || B.perfilOk({}))), foto: eu.foto || null, mudouFoto: false };
    irPara('pEditar'); CEN.ativo = false; pintarEditar();
  }
  function pintarEditar() {
    var p = ed.perfil;
    $('edFotoImg').src = ed.foto || foto(eu.visual, 44, 44, 'rosto'); $('edTemaBola').style.background = temaCss(p.tema);
    $('edNome').value = ed.nome; $('edNomeN').textContent = ed.nome.length + '/20';
    $('edBio').value = ed.bio; $('edBioN').textContent = ed.bio.length + '/' + B.REGRAS.MAX_BIO;
    $('edTagsN').textContent = p.tags.length + ' ›';
    $('edSexo').textContent = p.sexo; $('edPais').textContent = p.pais; $('edRel').textContent = p.rel; $('edAqui').textContent = p.aqui;
    $('edOnline').checked = p.mostrarOnline; $('edSala').checked = p.mostrarSala; $('edIdade').checked = p.mostrarIdade; $('edSexoM').checked = p.mostrarSexo;
  }
  $('edNome').oninput = function () { ed.nome = this.value; $('edNomeN').textContent = this.value.length + '/20'; };
  $('edBio').oninput = function () { ed.bio = this.value; $('edBioN').textContent = this.value.length + '/' + B.REGRAS.MAX_BIO; };
  [['edOnline', 'mostrarOnline'], ['edSala', 'mostrarSala'], ['edIdade', 'mostrarIdade'], ['edSexoM', 'mostrarSexo']].forEach(function (k) { $(k[0]).onchange = function () { ed.perfil[k[1]] = this.checked; }; });
  [].forEach.call(document.querySelectorAll('[data-opc]'), function (b) {
    var campo = b.getAttribute('data-opc'), titulo = { sexo: 'Sexo', pais: 'País', rel: 'Relacionamento', aqui: 'Aqui por' }[campo];
    b.onclick = function () { janela('<h3>' + titulo + '</h3>' + B.PERFIL[campo].map(function (o, i) { return '<button class="opcao" data-i="' + i + '">' + (ed.perfil[campo] === o ? '✓ ' : '') + esc(o) + '</button>'; }).join(''), function (j) { [].forEach.call(j.querySelectorAll('[data-i]'), function (x) { x.onclick = function () { ed.perfil[campo] = B.PERFIL[campo][+x.getAttribute('data-i')]; fecharJanela(); pintarEditar(); }; }); }); };
  });
  $('edTags').onclick = function () {
    function desenhar(j) { j.querySelector('.tags-esc').innerHTML = B.PERFIL.tags.map(function (t) { return '<button class="' + (ed.perfil.tags.indexOf(t) >= 0 ? 'on' : '') + '" data-t="' + t + '">#' + t + '</button>'; }).join(''); j.querySelector('h3').textContent = 'Hashtags (' + ed.perfil.tags.length + '/' + B.REGRAS.MAX_TAGS + ')';
      [].forEach.call(j.querySelectorAll('[data-t]'), function (x) { x.onclick = function () { var t = x.getAttribute('data-t'), i = ed.perfil.tags.indexOf(t); if (i >= 0) ed.perfil.tags.splice(i, 1); else if (ed.perfil.tags.length < B.REGRAS.MAX_TAGS) ed.perfil.tags.push(t); else aviso('Máximo de ' + B.REGRAS.MAX_TAGS + ' hashtags'); desenhar(j); }; }); }
    janela('<h3></h3><div class="tags-esc"></div><button class="bt-ouro" id="jOk" style="margin-top:14px">PRONTO</button>', function (j) { desenhar(j); $('jOk').onclick = function () { fecharJanela(); pintarEditar(); }; });
  };
  $('edTema').onclick = function () { janela('<h3>Aparência do perfil</h3><div class="temas">' + B.PERFIL.temas.map(function (t) { return '<button class="' + (ed.perfil.tema === t[0] ? 'on' : '') + '" data-t="' + t[0] + '" style="background:' + t[1] + '" aria-label="' + t[0] + '"></button>'; }).join('') + '</div>', function (j) { [].forEach.call(j.querySelectorAll('[data-t]'), function (x) { x.onclick = function () { ed.perfil.tema = x.getAttribute('data-t'); fecharJanela(); pintarEditar(); }; }); }); };
  $('edFoto').onclick = function () {
    janela('<h3>Imagem do perfil</h3><button class="opcao" id="jRosto">🙂 Usar o rosto do meu avatar</button><button class="opcao" id="jPose">📸 Tirar foto 3D do meu avatar</button>' + (ed.foto ? '<button class="opcao perigo" id="jTirar">Remover foto</button>' : '') + '<p class="mini-txt">Por segurança, o ' + esc(B.NOME) + ' não aceita imagens da galeria: só fotos feitas dentro do jogo.</p>', function () {
      $('jRosto').onclick = function () { ed.foto = null; ed.mudouFoto = true; fecharJanela(); pintarEditar(); };
      if ($('jTirar')) $('jTirar').onclick = $('jRosto').onclick;
      $('jPose').onclick = function () {
        fecharJanela(); CEN.ativo = true; CEN.palco(eu.visual); if (CEN.alvoPalco) AV.emote(CEN.alvoPalco, 'coracao');
        setTimeout(function () { var url = AV.foto(CEN.renderer, eu.visual, 200, 200, 'rosto'); var c = document.createElement('canvas'); c.width = 200; c.height = 200; var g = c.getContext('2d'), img = new Image(); img.onload = function () { var gr = g.createRadialGradient(100, 80, 10, 100, 100, 140); gr.addColorStop(0, '#b44dff'); gr.addColorStop(1, '#14061f'); g.fillStyle = gr; g.fillRect(0, 0, 200, 200); g.drawImage(img, 0, 0, 200, 200); ed.foto = c.toDataURL('image/jpeg', 0.82); ed.mudouFoto = true; CEN.ativo = false; pintarEditar(); }; img.src = url; }, 300);
      };
    });
  };
  $('edVoltar').onclick = function () { abrirPerfil(eu.id); };
  $('edSalvar').onclick = function () {
    var d = { nome: ed.nome, bio: ed.bio, perfil: ed.perfil }; if (ed.mudouFoto) d.foto = ed.foto;
    $('edSalvar').disabled = true;
    chamar('editarPerfil', d).then(function (r) { $('edSalvar').disabled = false; if (r.erro) return aviso(r.erro); eu = r.eu; atualizarEu(); aviso('Perfil salvo ✨'); abrirPerfil(eu.id); });
  };
  function denunciar(tipo, alvo) {
    janela('<h3>Denunciar</h3><button class="opcao" data-m="Conteúdo adulto ou nudez">Conteúdo adulto ou nudez</button><button class="opcao" data-m="Assédio ou ofensa">Assédio ou ofensa</button><button class="opcao" data-m="Golpe ou spam">Golpe ou spam</button><button class="opcao" data-m="Parece menor de idade">Parece menor de idade</button><button class="opcao" data-m="Outro">Outro motivo</button>', function (j) {
      [].forEach.call(j.querySelectorAll('[data-m]'), function (b) { b.onclick = function () { chamar('denunciar', { tipo: tipo, alvo: alvo, motivo: b.getAttribute('data-m') }).then(function (r) { fecharJanela(); aviso(r.ok || r.erro); }); }; });
    });
  }

  /* ---------- notificações ---------- */
  function carregarNotif() {
    $('listaNotif').innerHTML = '<p class="vazio">Carregando…</p>';
    chamar('notificacoes').then(function (r) {
      eu.naoLidas = 0; marcarNotif();
      var L = r.notifs || []; if (!L.length) { $('listaNotif').innerHTML = '<p class="vazio">Nada por aqui ainda.</p>'; return; }
      $('listaNotif').innerHTML = L.map(function (n) { return '<div class="n' + (n.lida ? '' : ' nova') + '"' + (n.quem ? ' data-p="' + n.quem.id + '"' : '') + '><img class="foto-redonda" alt="" src="' + (n.quem ? foto(n.quem.visual, 52, 52, 'rosto') : foto(eu.visual, 52, 52, 'rosto')) + '"><div><p>' + esc(n.txt) + '</p><small>' + quando(n.em) + '</small></div></div>'; }).join('');
      [].forEach.call($('listaNotif').querySelectorAll('[data-p]'), function (d) { d.onclick = function () { abrirPerfil(d.getAttribute('data-p')); }; });
    });
  }

  AV.carregar(function () { conectar(); });

  /* ---------- roleta diária ---------- */
  var rol = { ang: 0, girando: false, img: {} };
  function giroFalta() { return eu ? (eu.giroEm || 0) + B.REGRAS.GIRO_HORAS * 3600000 - Date.now() : 1; }
  function marcarRoleta() { $('rolMarca').hidden = giroFalta() > 0; }
  function moedaIcone(g, x, y, r, cor) { // moeda de linha dourada
    g.save(); g.translate(x, y); g.lineWidth = r * 0.16; g.strokeStyle = cor; g.fillStyle = cor === '#fff' ? '#d4a443' : '#fff';
    g.beginPath(); g.ellipse(0, r * 0.28, r, r * 0.42, 0, 0, Math.PI); g.lineTo(-r, 0); g.stroke();
    g.beginPath(); g.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.2, 0.6, Math.PI * 1.7); g.lineWidth = r * 0.13; g.stroke(); g.restore();
  }
  function pilhaIcone(g, n, cor) { var r = 18, pos = [[0, 6], [-24, 14], [24, 14], [-12, -18], [12, -18]];
    var sel = pos.slice(0, n).sort(function (a, b) { return a[1] - b[1]; }); for (var k = 0; k < n; k++) { var p = sel[k]; for (var h = 0; h <= 2; h++) moedaIcone(g, p[0], p[1] - h * 7, r, cor); } }
  function camisaIcone(g) { g.save(); g.fillStyle = '#e8137a'; g.strokeStyle = '#e8137a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-34, -18); g.lineTo(-14, -30); g.quadraticCurveTo(0, -20, 14, -30); g.lineTo(34, -18); g.lineTo(26, -4); g.lineTo(18, -8); g.lineTo(18, 30); g.lineTo(-18, 30); g.lineTo(-18, -8); g.lineTo(-26, -4); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, -40, 7, Math.PI, Math.PI * 2.4); g.stroke(); // cabide
    g.fillStyle = '#fff'; g.font = '800 15px system-ui'; g.textAlign = 'center'; g.fillText('ROUPA', 0, 12); g.restore(); }
  function desenharRoda() {
    var cv = $('rolRoda'), g = cv.getContext('2d'), W = cv.width, c = W / 2, R = c - 10, Ri = R - 30, n = B.ROLETA.length, fatia = Math.PI * 2 / n;
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(c, c);
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fillStyle = '#0b0a0d'; g.fill();
    g.save(); g.rotate(rol.ang);
    B.ROLETA.forEach(function (sg, i) {
      var a0 = -Math.PI / 2 + (i - 0.5) * fatia, a1 = a0 + fatia;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, Ri, a0, a1); g.closePath();
      g.fillStyle = sg.cor === 'ouro' ? '#d4a443' : sg.cor === 'rosa' ? '#ffd9ea' : '#ffffff'; g.fill();
      if (sg.cor === 'ouro') { g.save(); g.clip(); for (var k = 0; k < 18; k++) { var a = a0 + (k + 0.5) / 18 * fatia; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * Ri, Math.sin(a) * Ri); g.strokeStyle = 'rgba(255,230,160,.25)'; g.lineWidth = 3; g.stroke(); } g.restore(); }
      else if (sg.cor === 'branco') { var gr = g.createRadialGradient(0, 0, Ri * 0.3, 0, 0, Ri); gr.addColorStop(0, '#e9e6ec'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fill(); }
      g.save(); g.setLineDash([3, 4]); g.strokeStyle = 'rgba(232,19,122,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * Ri, Math.sin(a0) * Ri); g.stroke(); g.restore();
      g.save(); g.rotate(i * fatia); g.translate(0, -Ri * 0.66);
      var corL = sg.cor === 'ouro' ? '#fff' : '#d4a443';
      if (sg.t === 'item') { camisaIcone(g); }
      else { var q = sg.v >= 150 ? 5 : sg.v >= 40 ? 4 : sg.v >= 25 ? 3 : sg.v >= 15 ? 2 : 1; g.scale(0.85, 0.85); pilhaIcone(g, q, corL);
        if (sg.v >= 150) { g.fillStyle = '#fff'; [[-46, -40], [46, -30], [-40, 26]].forEach(function (p) { g.beginPath(); for (var e = 0; e < 8; e++) { var rr = e % 2 ? 3 : 9, aa = e * Math.PI / 4; g.lineTo(p[0] + Math.cos(aa) * rr, p[1] + Math.sin(aa) * rr); } g.fill(); }); }
        g.fillStyle = corL; g.font = '800 24px system-ui'; g.textAlign = 'center'; g.fillText('+' + sg.v, 0, 58); }
      g.restore();
    });
    g.restore();
    // luzes da borda: um arco aceso que corre
    var t = Date.now() / (rol.girando ? 60 : 160);
    for (var j = 0; j < 36; j++) { var a = j / 36 * Math.PI * 2 - Math.PI / 2, d = ((j - t) % 36 + 36) % 36, acesa = d < 8;
      var lx = Math.cos(a) * (R - 15), ly = Math.sin(a) * (R - 15);
      if (acesa) { var hl = g.createRadialGradient(lx, ly, 2, lx, ly, 22); hl.addColorStop(0, 'rgba(255,214,110,.9)'); hl.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = hl; g.beginPath(); g.arc(lx, ly, 22, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(lx, ly, acesa ? 7 : 5.5, 0, Math.PI * 2); g.fillStyle = acesa ? '#fff6d6' : '#4a4850'; g.fill(); }
    g.restore();
  }
  function laçoRoda() { if ($('tRoleta').hidden) return; desenharRoda(); atualizarDicaRoleta(); requestAnimationFrame(laçoRoda); }
  function atualizarDicaRoleta() {
    if (rol.girando) return; var f = giroFalta();
    if (f > 0) { var h = Math.floor(f / 3600000), m = Math.floor(f % 3600000 / 60000); $('rolDica').textContent = 'Próximo giro em ' + h + 'h ' + (m < 10 ? '0' : '') + m + 'min'; $('rolGirar').classList.remove('pronto'); $('rolGirar').innerHTML = '<i>✦</i>?<i>✦</i>'; }
    else { $('rolDica').textContent = 'Deslize ou toque para ganhar!'; $('rolGirar').classList.add('pronto'); $('rolGirar').textContent = 'GIRAR'; }
  }
  function abrirRoleta() { fecharJanela(); $('tRoleta').hidden = false; CEN.ativo = false; laçoRoda(); }
  function girarRoleta(forca) {
    if (rol.girando) return;
    if (giroFalta() > 0) { aviso('Você já girou hoje. Volte mais tarde!'); return; }
    rol.girando = true; $('rolDica').textContent = 'Girando…';
    // começa a girar já, enquanto o servidor sorteia
    var ini = performance.now(), vel = 0.012 * (forca || 1), parado = false, alvo = null;
    (function solto(t) { if (alvo) return; rol.ang += vel * 16; requestAnimationFrame(solto); })();
    chamar('girar').then(function (r) {
      if (r.erro) { rol.girando = false; alvo = 1; aviso(r.erro); return; }
      var n = B.ROLETA.length, fatia = Math.PI * 2 / n, jit = (Math.random() - 0.5) * fatia * 0.6;
      var fim = -r.i * fatia + jit, a0 = rol.ang, voltas = Math.PI * 2 * 6;
      var destino = a0 + voltas + ((fim - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      alvo = destino; var t0 = performance.now(), dur = 4200;
      (function anim(t) { var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); rol.ang = a0 + (destino - a0) * e; if (p < 1) requestAnimationFrame(anim); else fimGiro(r); })(t0);
    });
  }
  function fimGiro(r) {
    rol.girando = false; eu = r.eu; atualizarEu();
    var p = r.premio, txt = p.t === 'item' ? 'Você ganhou a roupa <b>' + esc(p.nome) + '</b>! Já está no seu guarda-roupa.' : 'Você ganhou <b>' + p.v + ' créditos</b>!';
    janela('<div class="premio-grande">' + (p.t === 'item' ? '👕' : '🪙') + '</div><h3 style="text-align:center">PARABÉNS!</h3><p style="text-align:center">' + txt + '</p>' + (p.t === 'item' ? '<button class="bt-ouro" id="jVestir">VESTIR AGORA</button>' : '') + '<button class="bt-borda" id="jOk" style="margin-top:10px;width:100%">OK</button>', function () {
      $('jOk').onclick = fecharJanela; if ($('jVestir')) $('jVestir').onclick = function () { fecharJanela(); $('tRoleta').hidden = true; irPara('pVestir'); };
    });
  }
  $('rolFechar').onclick = function () { if (rol.girando) return; $('tRoleta').hidden = true; if (tela === 'app') irPara(pagina); marcarRoleta(); };
  $('rolGirar').onclick = function () { girarRoleta(1); };
  $('btRoleta').onclick = abrirRoleta;
  (function () { var d = null, cx = $('rolRoda');
    cx.addEventListener('pointerdown', function (e) { d = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    cx.addEventListener('pointerup', function (e) { if (!d) return; var dist = Math.hypot(e.clientX - d.x, e.clientY - d.y), tm = performance.now() - d.t; d = null; girarRoleta(dist > 30 ? Math.min(2.2, 0.6 + dist / tm) : 1); });
  })();
  setInterval(marcarRoleta, 30000);
  window.__vibe = { get eu() { return eu; }, get tela() { return tela; }, chamar: chamar, irPara: irPara, entrarSala: entrarSala, abrirRoleta: function () { abrirRoleta(); } };
})();
