/* VIBE — servidor: contas, avatar, loja, salas 3D com chat, feed, perfil, notificações e segurança. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const B = require('../public/shared/base');
const { criarDados } = require('./dados');
const R = B.REGRAS;

const PUB = path.join(__dirname, '..', 'public');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
const LIBERADOS = new Set(['/index.html', '/style.css', '/app.js', '/avatar.js', '/cenario.js', '/shared/base.js', '/vendor/three.min.js', '/vendor/GLTFLoader.js', '/icone.svg', '/offline.html', '/modelos/homem.json', '/modelos/mulher.json', '/modelos/female_demon_girl_body_mesh_free.glb', '/modelos/sexy_gangsta_girl_2.glb']);
const agora = () => Date.now();
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
function senhaHash(senha, sal) { sal = sal || crypto.randomBytes(16).toString('hex'); return sal + ':' + crypto.scryptSync(senha, sal, 32).toString('hex'); }
function senhaConfere(senha, guardado) { const [sal, h] = String(guardado).split(':'); const t = crypto.scryptSync(senha, sal, 32).toString('hex'); return t.length === h.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(h)); }

function criarServidor(op) {
  op = op || {};
  const dados = op.dados || criarDados();
  const db = () => dados.db;
  const ADMIN = (process.env.ADMIN_EMAIL || '').toLowerCase();

  const server = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]); if (u === '/') u = '/index.html';
    if (u === '/saude') { res.writeHead(200); return res.end('ok'); }
    if (!LIBERADOS.has(u)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('não encontrado'); }
    fs.readFile(path.join(PUB, u), (e, d) => {
      if (e) { res.writeHead(500); return res.end(); }
      const cab = { 'Content-Type': TIPOS[path.extname(u)] || 'application/octet-stream', 'Cache-Control': u.startsWith('/modelos/') ? 'public, max-age=86400' : 'no-cache' };
      // comprime textos grandes (modelos 3D, three.js) para carregar rápido no celular
      if (d.length > 20000 && /gzip/.test(req.headers['accept-encoding'] || '') && !/image/.test(cab['Content-Type'])) { cab['Content-Encoding'] = 'gzip'; res.writeHead(200, cab); return res.end(zlib.gzipSync(d)); }
      res.writeHead(200, cab); res.end(d);
    });
  });
  const wss = new WebSocketServer({ server, maxPayload: 160 * 1024 });
  const conexoes = new Set();
  const online = new Map();          // usuárioId -> conexão
  const salas = new Map();           // 'lounge#1' -> { tipo, n, membros: Map(uid -> estado) }
  const tentativas = new Map();      // proteção contra chute de senha

  /* ---------- ajudantes ---------- */
  function env(c, m) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); }
  function u(id) { return db().usuarios[id]; }
  function salaDe(id) { const c = online.get(id); const s = c && c.sala && salas.get(c.sala); return s ? { tipo: s.tipo, nome: B.SALA[s.tipo].nome + (s.n > 1 ? ' ' + s.n : '') } : null; }
  function publico(x) {
    if (!x) return null; const pf = B.perfilOk(x.perfil), on = online.has(x.id);
    return { id: x.id, nome: x.nome, visual: x.visual, bio: x.bio || '', seguidores: (x.seguidores || []).length, seguindo: (x.seguindo || []).length, amigos: amigos(x).length, criado: x.criado,
      online: pf.mostrarOnline && on, sala: pf.mostrarSala && on ? salaDe(x.id) : null, idade: pf.mostrarIdade ? (x.nasc ? B.idade(x.nasc) : new Date().getFullYear() - x.anoNasc) : null,
      sexo: pf.mostrarSexo ? pf.sexo : null, pais: pf.pais, rel: pf.rel, aqui: pf.aqui, tags: pf.tags, tema: pf.tema, temFoto: !!x.foto };
  }
  function meu(x) { return Object.assign(publico(x), { perfil: B.perfilOk(x.perfil), foto: x.foto || null, nasc: x.nasc || String(x.anoNasc),  email: x.email, creditos: x.creditos, inventario: x.inventario, bonusEm: x.bonusEm || 0, giroEm: x.giroEm || 0, bloqueados: x.bloqueados || [], admin: x.email === ADMIN, naoLidas: (x.notifs || []).filter(n => !n.lida).length }); }
  function amigos(x) { return (x.seguindo || []).filter(id => (u(id) && (u(id).seguindo || []).includes(x.id))); }
  function bloqueou(a, b) { const x = u(a); return !!(x && (x.bloqueados || []).includes(b)); }
  function notificar(paraId, n) {
    const x = u(paraId); if (!x || bloqueou(paraId, n.de)) return;
    x.notifs = x.notifs || []; x.notifs.unshift(Object.assign({ id: db().seq++, em: agora(), lida: false }, n)); x.notifs = x.notifs.slice(0, 60);
    const c = online.get(paraId); if (c) env(c, { t: 'notif', naoLidas: x.notifs.filter(k => !k.lida).length, n: x.notifs[0] });
    dados.mudou();
  }
  function novaSessao(x) { const tok = crypto.randomBytes(24).toString('hex'); x.sessoes = [hash(tok)].concat(x.sessoes || []).slice(0, 5); dados.mudou(true); return tok; }
  function limiteTentativa(chave, max) { const t = agora(), L = (tentativas.get(chave) || []).filter(k => t - k < 60000); L.push(t); tentativas.set(chave, L); return L.length > (max || 6); }

  /* ---------- salas ---------- */
  function listaSalas() {
    return B.SALAS.map(s => { const inst = [...salas.values()].filter(x => x.tipo === s.id); return { id: s.id, nome: s.nome, desc: s.desc, tema: s.tema, pessoas: inst.reduce((a, x) => a + x.membros.size, 0), copias: inst.length, max: R.MAX_SALA }; });
  }
  function salaPara(tipo) {
    for (let n = 1; n < 100; n++) { const k = tipo + '#' + n; const s = salas.get(k); if (!s) { const nova = { k, tipo, n, membros: new Map() }; salas.set(k, nova); return nova; } if (s.membros.size < R.MAX_SALA) return s; }
    return null;
  }
  function naSala(s, m, excetoId) { const t = JSON.stringify(m); s.membros.forEach((e, id) => { if (id === excetoId) return; const c = online.get(id); if (!c || c.ws.readyState !== 1) return; if (m.de && bloqueou(id, m.de)) return; c.ws.send(t); }); }
  function membroPub(id, e) { const x = u(id); return { id, nome: x.nome, visual: x.visual, p: e.p }; }
  function livre(s, p, exceto) { let ok = true; s.membros.forEach((e, id) => { if (id !== exceto && e.p === p) ok = false; }); return ok; }
  function sairSala(c) {
    if (!c.sala) return; const s = salas.get(c.sala); c.sala = null;
    if (!s) return; s.membros.delete(c.uid); naSala(s, { t: 'sala:saiu', id: c.uid });
    if (!s.membros.size && s.n > 1) salas.delete(s.k);
  }

  /* ---------- pedidos do aplicativo ---------- */
  const ACOES = {
    async cadastrar(c, m) {
      const nome = B.nomeLimpo(m.nome), email = String(m.email || '').trim().toLowerCase(), senha = String(m.senha || ''), id = B.idade(m.nasc);
      if (limiteTentativa('cad:' + c.ip, 15)) return { erro: 'Muitas tentativas. Espere um minuto.' };
      if (nome.length < 3) return { erro: 'O nome precisa ter pelo menos 3 letras.' };
      if (!B.emailOk(email)) return { erro: 'Email inválido.' };
      if (senha.length < 6) return { erro: 'A senha precisa ter pelo menos 6 caracteres.' };
      if (id < 0) return { erro: 'Data de nascimento inválida.' };
      if (id < R.IDADE_MIN) return { erro: 'Você precisa ter pelo menos ' + R.IDADE_MIN + ' anos para jogar.' };
      if (db().emails[email]) return { erro: 'Esse email já tem conta. Toque em Entrar.' };
      if (Object.values(db().usuarios).some(x => x.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Esse nome já está em uso.' };
      const visual = m.visual && B.visualOk(m.visual, []) ? B.limparVisual(m.visual) : B.INICIAIS[0];
      const x = { id: 'u' + (db().seq++), nome, email, senha: senhaHash(senha), anoNasc: +String(m.nasc).slice(0, 4), nasc: String(m.nasc), menor: id < 18, criado: agora(), visual, inventario: [], creditos: R.CREDITOS_INICIAIS, bio: '', seguidores: [], seguindo: [], bloqueados: [], notifs: [], sessoes: [] };
      db().usuarios[x.id] = x; db().emails[email] = x.id;
      const token = novaSessao(x); c.uid = x.id; online.set(x.id, c);
      notificar(x.id, { tipo: 'boasvindas', de: null, txt: 'Bem-vindo ao ' + B.NOME + '! Você ganhou ' + R.CREDITOS_INICIAIS + ' créditos.' });
      return { token, eu: meu(x) };
    },
    async entrar(c, m) {
      const email = String(m.email || '').trim().toLowerCase();
      if (limiteTentativa('ent:' + email) || limiteTentativa('ip:' + c.ip, 20)) return { erro: 'Muitas tentativas. Espere um minuto.' };
      const x = u(db().emails[email]);
      if (!x || !senhaConfere(String(m.senha || ''), x.senha)) return { erro: 'Email ou senha incorretos.' };
      if (x.banido) return { erro: 'Esta conta foi suspensa por violar as regras.' };
      const token = novaSessao(x); c.uid = x.id; online.set(x.id, c); return { token, eu: meu(x) };
    },
    async retomar(c, m) {
      const h = hash(String(m.token || '')); const x = Object.values(db().usuarios).find(k => (k.sessoes || []).includes(h));
      if (!x || x.banido) return { erro: 'Sessão expirada. Entre de novo.' };
      c.uid = x.id; online.set(x.id, c); return { eu: meu(x) };
    },
    async sair(c, m) { const x = u(c.uid); if (x && m.token) x.sessoes = (x.sessoes || []).filter(k => k !== hash(String(m.token))); sairSala(c); online.delete(c.uid); c.uid = null; dados.mudou(); return {}; },
    async eu(c) { return { eu: meu(u(c.uid)) }; },
    async salvarVisual(c, m) { const x = u(c.uid); if (!B.visualOk(m.visual, x.inventario)) return { erro: 'Visual inválido.' }; x.visual = B.limparVisual(m.visual); dados.mudou(); if (c.sala) { const s = salas.get(c.sala); if (s) naSala(s, { t: 'sala:visual', id: x.id, visual: x.visual }); } return { eu: meu(x) }; },
    async comprar(c, m) {
      const x = u(c.uid), it = B.ITEM[m.item]; if (!it) return { erro: 'Item não existe.' };
      if (it.preco === 0 || x.inventario.includes(it.id)) return { erro: 'Você já tem esse item.' };
      if (x.creditos < it.preco) return { erro: 'Créditos insuficientes. Faltam ' + (it.preco - x.creditos) + '.' };
      x.creditos -= it.preco; x.inventario.push(it.id); dados.mudou(true); return { eu: meu(x) };
    },
    async girar(c) {
      const x = u(c.uid), falta = (x.giroEm || 0) + R.GIRO_HORAS * 3600000 - agora();
      if (falta > 0) return { erro: 'Próximo giro em ' + Math.ceil(falta / 3600000) + 'h.', falta };
      const tot = B.ROLETA.reduce((a, s) => a + s.peso, 0); let r = Math.random() * tot, i = 0;
      while (r >= B.ROLETA[i].peso) { r -= B.ROLETA[i].peso; i++; }
      const seg = B.ROLETA[i]; let premio;
      if (seg.t === 'item') {
        const op = B.CATALOGO.filter(it => it.preco > 0 && !x.inventario.includes(it.id));
        if (op.length) { const it = op[Math.floor(Math.random() * op.length)]; x.inventario.push(it.id); premio = { t: 'item', id: it.id, nome: it.nome }; }
        else { x.creditos += 60; premio = { t: 'cred', v: 60 }; }
      } else { x.creditos += seg.v; premio = { t: 'cred', v: seg.v }; }
      x.giroEm = agora(); dados.mudou(true); return { i, premio, eu: meu(x) };
    },
    async bonus(c) {
      const x = u(c.uid), falta = (x.bonusEm || 0) + R.BONUS_HORAS * 3600000 - agora();
      if (falta > 0) return { erro: 'Próximo bônus em ' + Math.ceil(falta / 3600000) + 'h.' };
      x.bonusEm = agora(); x.creditos += R.BONUS_DIARIO; dados.mudou(true); return { eu: meu(x), ganhou: R.BONUS_DIARIO };
    },
    async editarPerfil(c, m) {
      const x = u(c.uid);
      if (m.nome !== undefined) {
        const nome = B.nomeLimpo(m.nome);
        if (nome.length < 3) return { erro: 'O nome precisa ter pelo menos 3 letras.' };
        if (nome.toLowerCase() !== x.nome.toLowerCase()) {
          if (Object.values(db().usuarios).some(k => k.id !== x.id && k.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Esse nome já está em uso.' };
          if (agora() - (x.nomeEm || 0) < 24 * 3600000) return { erro: 'Você só pode trocar o nome uma vez por dia.' };
          x.nomeEm = agora();
        }
        x.nome = nome;
      }
      if (m.bio !== undefined) x.bio = B.filtrar(B.textoLimpo(m.bio, R.MAX_BIO));
      if (m.perfil) x.perfil = B.perfilOk(m.perfil);
      if (m.foto === null) delete x.foto;
      else if (m.foto !== undefined) { if (typeof m.foto !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.foto) || m.foto.length > 60000) return { erro: 'Foto inválida.' }; x.foto = m.foto; }
      dados.mudou(true); return { eu: meu(x) };
    },

    /* salas */
    async salas() { return { salas: listaSalas() }; },
    async entrarSala(c, m) {
      if (!B.SALA[m.sala]) return { erro: 'Sala não existe.' };
      sairSala(c); const s = salaPara(m.sala); if (!s) return { erro: 'Todas as salas estão cheias.' };
      const livres = B.PONTOS.map((q, i) => i).filter(i => !B.PONTOS[i][3] && livre(s, i));
      const e = { p: livres.length ? livres[Math.floor(Math.random() * livres.length)] : 6, ultFala: 0, ultIr: 0 };
      s.membros.set(c.uid, e); c.sala = s.k;
      naSala(s, { t: 'sala:entrou', m: membroPub(c.uid, e) }, c.uid);
      const membros = []; s.membros.forEach((k, id) => { if (!bloqueou(c.uid, id)) membros.push(membroPub(id, k)); });
      return { sala: { k: s.k, tipo: s.tipo, n: s.n, nome: B.SALA[s.tipo].nome + (s.n > 1 ? ' ' + s.n : ''), max: R.MAX_SALA }, membros };
    },
    async sairSala(c) { sairSala(c); return {}; },
    /* ir até um ponto da sala (bolinha) */
    async ir(c, m) {
      const s = salas.get(c.sala); if (!s) return; const p = m.p | 0; if (!B.PONTOS[p]) return { erro: 'Lugar inválido.' };
      const e = s.membros.get(c.uid); if (agora() - e.ultIr < 400) return;
      if (!livre(s, p, c.uid)) return { erro: 'Esse lugar está ocupado.' };
      e.p = p; e.ultIr = agora(); naSala(s, { t: 'sala:ir', id: c.uid, p }); return {};
    },
    async emote(c, m) { const s = salas.get(c.sala); if (!s || !B.EMOTES.some(k => k[0] === m.e)) return; naSala(s, { t: 'sala:emote', id: c.uid, e: m.e, de: c.uid }); },
    async falar(c, m) {
      const s = salas.get(c.sala); if (!s) return; const e = s.membros.get(c.uid);
      if (agora() - e.ultFala < 700) return { erro: 'Calma, espere um pouco.' };
      const txt = B.filtrar(B.textoLimpo(m.txt, R.MAX_CHAT)); if (!txt) return; e.ultFala = agora();
      naSala(s, { t: 'sala:fala', id: c.uid, nome: u(c.uid).nome, txt, de: c.uid }); return {};
    },

    /* feed */
    async feed(c, m) {
      const x = u(c.uid), seg = new Set(x.seguindo || []);
      let L = db().posts.filter(p => !p.oculto && !bloqueou(x.id, p.autor) && !bloqueou(p.autor, x.id));
      if (m.aba === 'seguindo') L = L.filter(p => seg.has(p.autor) || p.autor === x.id);
      if (m.de) L = L.filter(p => p.autor === m.de);
      return { posts: L.slice(0, 40).map(p => postPub(p, x.id)) };
    },
    async postar(c, m) {
      const x = u(c.uid), texto = B.filtrar(B.textoLimpo(m.texto, R.MAX_TEXTO_POST)); let foto = null;
      if (m.foto) { if (typeof m.foto !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.foto) || m.foto.length > R.MAX_FOTO) return { erro: 'Foto inválida ou grande demais.' }; foto = m.foto; }
      if (!texto && !foto) return { erro: 'Escreva algo ou tire uma foto 3D.' };
      if (agora() - (x.ultPost || 0) < 20000) return { erro: 'Espere alguns segundos para postar de novo.' };
      x.ultPost = agora();
      const p = { id: 'p' + (db().seq++), autor: x.id, texto, foto, em: agora(), curtidas: [], comentarios: [], denuncias: [] };
      db().posts.unshift(p); db().posts = db().posts.slice(0, 400); dados.mudou(true);
      (x.seguidores || []).forEach(f => notificar(f, { tipo: 'post', de: x.id, txt: x.nome + ' publicou no feed.' }));
      return { post: postPub(p, x.id) };
    },
    async curtir(c, m) { const p = db().posts.find(k => k.id === m.post); if (!p) return { erro: 'Post não existe.' }; const i = p.curtidas.indexOf(c.uid); if (i >= 0) p.curtidas.splice(i, 1); else { p.curtidas.push(c.uid); if (p.autor !== c.uid) notificar(p.autor, { tipo: 'curtida', de: c.uid, post: p.id, txt: u(c.uid).nome + ' curtiu seu post.' }); } dados.mudou(); return { post: postPub(p, c.uid) }; },
    async comentar(c, m) {
      const p = db().posts.find(k => k.id === m.post); if (!p) return { erro: 'Post não existe.' }; if (bloqueou(p.autor, c.uid)) return { erro: 'Você não pode comentar aqui.' };
      const txt = B.filtrar(B.textoLimpo(m.txt, 200)); if (!txt) return; p.comentarios.push({ de: c.uid, txt, em: agora() }); p.comentarios = p.comentarios.slice(-50);
      if (p.autor !== c.uid) notificar(p.autor, { tipo: 'comentario', de: c.uid, post: p.id, txt: u(c.uid).nome + ' comentou: ' + txt.slice(0, 60) }); dados.mudou(); return { post: postPub(p, c.uid) };
    },
    async apagarPost(c, m) { const x = u(c.uid), i = db().posts.findIndex(k => k.id === m.post); if (i < 0) return {}; if (db().posts[i].autor !== x.id && x.email !== ADMIN) return { erro: 'Só o autor pode apagar.' }; db().posts.splice(i, 1); dados.mudou(true); return {}; },

    /* perfil e amizade */
    async perfil(c, m) { const x = u(m.id); if (!x || x.banido) return { erro: 'Perfil não encontrado.' }; if (bloqueou(x.id, c.uid)) return { erro: 'Perfil indisponível.' }; const eu = u(c.uid); return { perfil: Object.assign(publico(x), { foto: x.foto || null, sigo: (eu.seguindo || []).includes(x.id), bloqueado: (eu.bloqueados || []).includes(x.id) }) }; },
    async seguir(c, m) {
      const eu = u(c.uid), x = u(m.id); if (!x || x.id === eu.id) return { erro: 'Não dá.' }; if (bloqueou(x.id, eu.id)) return { erro: 'Não foi possível seguir.' };
      eu.seguindo = (eu.seguindo || []).filter(k => k !== x.id); x.seguidores = (x.seguidores || []).filter(k => k !== eu.id);
      if (m.sim) { eu.seguindo.push(x.id); x.seguidores.push(eu.id); notificar(x.id, { tipo: 'seguir', de: eu.id, txt: eu.nome + ' começou a seguir você.' }); }
      dados.mudou(); return ACOES.perfil(c, { id: x.id });
    },
    async bloquear(c, m) {
      const eu = u(c.uid), x = u(m.id); if (!x || x.id === eu.id) return { erro: 'Não dá.' };
      eu.bloqueados = (eu.bloqueados || []).filter(k => k !== x.id);
      if (m.sim) { eu.bloqueados.push(x.id); eu.seguindo = (eu.seguindo || []).filter(k => k !== x.id); x.seguidores = (x.seguidores || []).filter(k => k !== eu.id); x.seguindo = (x.seguindo || []).filter(k => k !== eu.id); eu.seguidores = (eu.seguidores || []).filter(k => k !== x.id); }
      dados.mudou(); return { eu: meu(eu) };
    },
    async denunciar(c, m) {
      const motivo = B.textoLimpo(m.motivo, 200), alvo = String(m.alvo || ''); if (!alvo) return { erro: 'Nada para denunciar.' };
      db().denuncias.push({ de: c.uid, alvo, tipo: m.tipo === 'post' ? 'post' : 'usuario', motivo, em: agora() }); db().denuncias = db().denuncias.slice(-500);
      if (m.tipo === 'post') { const p = db().posts.find(k => k.id === alvo); if (p && !p.denuncias.includes(c.uid)) { p.denuncias.push(c.uid); if (p.denuncias.length >= 3) p.oculto = true; } }
      dados.mudou(); return { ok: 'Obrigado. A denúncia foi registrada.' };
    },
    async buscar(c, m) { const q = B.textoLimpo(m.q, 20).toLowerCase(); if (q.length < 2) return { pessoas: [] }; return { pessoas: Object.values(db().usuarios).filter(x => !x.banido && x.nome.toLowerCase().includes(q) && !bloqueou(x.id, c.uid)).slice(0, 20).map(publico) }; },
    async notificacoes(c) { const x = u(c.uid); const L = (x.notifs || []).slice(0, 40).map(n => Object.assign({}, n, { quem: n.de && u(n.de) ? { id: n.de, nome: u(n.de).nome, visual: u(n.de).visual } : null })); (x.notifs || []).forEach(n => { n.lida = true; }); dados.mudou(); return { notifs: L }; },

    /* moderação (só a conta com o email ADMIN_EMAIL) */
    async moderar(c, m) {
      const eu = u(c.uid); if (eu.email !== ADMIN) return { erro: 'Sem permissão.' };
      if (m.acao === 'lista') return { denuncias: db().denuncias.slice(-50).reverse() };
      if (m.acao === 'banir') { const x = u(m.id); if (x) { x.banido = true; x.sessoes = []; const k = online.get(x.id); if (k) k.ws.close(); dados.mudou(true); } return {}; }
      return {};
    }
  };
  function postPub(p, eu) { const a = u(p.autor); return { id: p.id, autor: a ? { id: a.id, nome: a.nome, visual: a.visual } : null, texto: p.texto, foto: p.foto, em: p.em, curtidas: p.curtidas.length, curti: p.curtidas.includes(eu), comentarios: p.comentarios.slice(-20).map(k => ({ nome: u(k.de) ? u(k.de).nome : '?', de: k.de, txt: k.txt })) }; }
  const PUBLICAS = new Set(['cadastrar', 'entrar', 'retomar']);

  wss.on('connection', (ws, req) => {
    const c = { ws, uid: null, sala: null, ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), n: 0, janela: agora() };
    conexoes.add(c);
    env(c, { t: 'oi', nome: B.NOME });
    ws.on('message', async raw => {
      const t = agora(); if (t - c.janela > 1000) { c.janela = t; c.n = 0; } if (++c.n > 40) return;
      let m; try { m = JSON.parse(raw); } catch (e) { return; }
      if (!m || typeof m.t !== 'string' || !Object.prototype.hasOwnProperty.call(ACOES, m.t)) return;
      if (!PUBLICAS.has(m.t) && !c.uid) return m._r && env(c, { t: 'resp', _r: m._r, erro: 'Entre na sua conta.' });
      try { const r = await ACOES[m.t](c, m); if (m._r) env(c, Object.assign({ t: 'resp', _r: m._r }, r || {})); }
      catch (e) { console.error('ERRO NA ACAO', m.t, e); try { if (m._r) env(c, { t: 'resp', _r: m._r, erro: 'Erro no servidor.' }); } catch (x) {} }
    });
    ws.on('close', () => { sairSala(c); if (c.uid && online.get(c.uid) === c) online.delete(c.uid); conexoes.delete(c); });
    ws.on('error', () => {});
  });
  return { server, wss, dados, salas, online };
}

if (require.main === module) {
  const dados = criarDados();
  dados.carregar().then(() => {
    const porta = process.env.PORT || 3000;
    criarServidor({ dados }).server.listen(porta, () => console.log(B.NOME + ' rodando em http://localhost:' + porta + (dados.usaGit ? ' (dados no GitHub)' : ' (dados em arquivo local)')));
    const salvarESair = () => { dados.gravarAgora().finally(() => process.exit(0)); };
    process.on('SIGTERM', salvarESair); process.on('SIGINT', salvarESair);
  });
}
module.exports = { criarServidor };
