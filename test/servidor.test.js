'use strict';
const assert = require('assert'); const WebSocket = require('ws'); const os = require('os'); const path = require('path'); const fs = require('fs');
const { criarServidor } = require('../server/server'); const { criarDados } = require('../server/dados'); const B = require('../public/shared/base');
const espera = ms => new Promise(r => setTimeout(r, ms));
function cliente(porta) { return new Promise(res => { const ws = new WebSocket('ws://127.0.0.1:' + porta); const c = { ws, msgs: [], n: 1, ped: {} };
  c.chamar = (t, d) => new Promise(ok => { const id = c.n++; c.ped[id] = ok; ws.send(JSON.stringify(Object.assign({}, d || {}, { t, _r: id }))); });
  ws.on('message', d => { const m = JSON.parse(d); c.msgs.push(m); if (m.t === 'resp' && c.ped[m._r]) { c.ped[m._r](m); delete c.ped[m._r]; } });
  ws.on('open', () => res(c)); }); }
(async () => {
  const arq = path.join(os.tmpdir(), 'vibe-teste-' + process.pid + '.json');
  const dados = criarDados({ token: '', repo: '', arquivo: arq }); await dados.carregar();
  const g = criarServidor({ dados }); await new Promise(r => g.server.listen(0, r)); const porta = g.server.address().port;
  const A = await cliente(porta), Bc = await cliente(porta);
  // cadastro: validações
  let r = await A.chamar('cadastrar', { nome: 'Ana', email: 'ana@x.com', senha: '123456', nasc: '2012-01-01' }); assert(/18 anos/.test(r.erro), 'menor de idade recusado');
  r = await A.chamar('cadastrar', { nome: 'Ana', email: 'ana@x', senha: '123456', nasc: '1999-01-01' }); assert(/Email/.test(r.erro));
  r = await A.chamar('cadastrar', { nome: 'Ana', email: 'ana@x.com', senha: '123', nasc: '1999-01-01' }); assert(/senha/i.test(r.erro));
  r = await A.chamar('cadastrar', { nome: 'Ana', email: 'ana@x.com', senha: '123456', nasc: '1999-05-01', visual: B.INICIAIS[2] }); assert(r.token && r.eu.creditos === 150, 'cadastrou com 150 créditos');
  const tokA = r.token; assert(!JSON.stringify(dados.db).includes('123456'), 'senha não fica em texto puro');
  r = await Bc.chamar('cadastrar', { nome: 'ana', email: 'b@x.com', senha: '123456', nasc: '1990-01-01' }); assert(/em uso/.test(r.erro), 'nome único');
  r = await Bc.chamar('cadastrar', { nome: 'Beto', email: 'beto@x.com', senha: 'segredo1', nasc: '1990-01-01' }); assert(r.token);
  // login e sessão
  const C = await cliente(porta); r = await C.chamar('entrar', { email: 'ana@x.com', senha: 'errada' }); assert(/incorretos/.test(r.erro));
  r = await C.chamar('retomar', { token: tokA }); assert.strictEqual(r.eu.nome, 'Ana', 'retoma sessão');
  r = await C.chamar('comprar', { item: 'ac_asas' }); assert(/insuficientes/.test(r.erro), 'sem créditos para as asas');
  r = await C.chamar('comprar', { item: 'cab_coque' }); assert(r.eu.creditos === 30 && r.eu.inventario.includes('cab_coque'));
  r = await C.chamar('salvarVisual', { visual: Object.assign({}, B.INICIAIS[0], { acessorio: 'ac_asas' }) }); assert(r.erro, 'não veste item que não tem');
  r = await C.chamar('salvarVisual', { visual: Object.assign({}, B.INICIAIS[0], { cabelo: 'cab_coque' }) }); assert.strictEqual(r.eu.visual.cabelo, 'cab_coque');
  r = await C.chamar('bonus'); assert.strictEqual(r.ganhou, 50); r = await C.chamar('bonus'); assert(r.erro, 'bônus só 1 vez por dia');
  { const antes = r.eu ? r.eu.creditos : null; const g = await C.chamar('girar'); assert(g.i >= 0 && g.i < 8 && g.premio, 'roleta deu prêmio'); assert(g.premio.t === 'item' ? g.eu.inventario.includes(g.premio.id) : g.premio.v > 0); const g2 = await C.chamar('girar'); assert(g2.erro, 'roleta só 1 vez por dia'); }
  // salas: pontos, fala, limite de 10 e cópia da sala
  r = await A.chamar('entrarSala', { sala: 'lounge' }); assert(r.sala && r.sala.n === 1);
  r = await Bc.chamar('entrarSala', { sala: 'lounge' }); assert.strictEqual(r.membros.length, 2);
  r = await A.chamar('ir', { p: 0 }); assert(!r.erro); r = await Bc.chamar('ir', { p: 0 }); assert(/ocupado/.test(r.erro), 'lugar ocupado');
  await A.chamar('falar', { txt: 'oi <b>gente</b> manda nudes' }); await espera(80);
  const fala = Bc.msgs.find(m => m.t === 'sala:fala'); assert(fala && !/[<>]/.test(fala.txt) && !/nudes/.test(fala.txt), 'chat limpo e filtrado: ' + (fala && fala.txt));
  const outros = []; for (let i = 0; i < 9; i++) { const k = await cliente(porta); await k.chamar('cadastrar', { nome: 'Pessoa' + i, email: 'p' + i + '@x.com', senha: '123456', nasc: '1995-01-01' }); const e = await k.chamar('entrarSala', { sala: 'lounge' }); outros.push([k, e]); }
  assert(outros.every(([, e]) => e.sala), 'todos entraram'); assert(outros.some(([, e]) => e.sala.n === 2), 'quando lota abre a sala 2');
  const lista = (await A.chamar('salas')).salas.find(s => s.id === 'lounge'); assert(lista.pessoas === 11 && lista.copias === 2 && lista.max === 10);
  // bloqueio: B bloqueia A e não recebe mais as falas
  await Bc.chamar('bloquear', { id: 'u1', sim: true }); Bc.msgs.length = 0; await espera(900); await A.chamar('falar', { txt: 'teste' }); await espera(100); assert(!Bc.msgs.some(m => m.t === 'sala:fala'), 'bloqueado não aparece');
  // feed, curtida, comentário e notificação
  const idBeto = (await Bc.chamar('eu')).eu.id; await Bc.chamar('bloquear', { id: 'u1', sim: false });
  r = await A.chamar('seguir', { id: idBeto, sim: true }); assert(r.perfil.sigo);
  r = await Bc.chamar('postar', { texto: 'Olá mundo' }); assert(r.post); const pid = r.post.id;
  r = await A.chamar('curtir', { post: pid }); assert(r.post.curtidas === 1 && r.post.curti);
  r = await A.chamar('comentar', { post: pid, txt: 'lindo!' }); assert.strictEqual(r.post.comentarios.length, 1);
  r = await Bc.chamar('notificacoes'); assert(r.notifs.some(n => n.tipo === 'curtida') && r.notifs.some(n => n.tipo === 'seguir'));
  r = await A.chamar('feed', { aba: 'seguindo' }); assert(r.posts.some(p => p.id === pid));
  r = await A.chamar('postar', { foto: 'data:text/html;base64,AAAA' }); assert(r.erro, 'só aceita foto jpeg do jogo');
  r = await Bc.chamar('apagarPost', { post: 'nada' }); r = await A.chamar('apagarPost', { post: pid }); assert(r.erro, 'só o autor apaga');
  // denúncias escondem post
  for (const [k] of outros.slice(0, 3)) await k.chamar('denunciar', { tipo: 'post', alvo: pid, motivo: 'teste' });
  r = await A.chamar('feed', { aba: 'descubra' }); assert(!r.posts.some(p => p.id === pid), 'post com 3 denúncias some');
  // sem login nada funciona
  const Z = await cliente(porta); r = await Z.chamar('feed', {}); assert(/Entre/.test(r.erro));
  // dados salvos
  await dados.gravarAgora(); const salvo = JSON.parse(fs.readFileSync(arq, 'utf8')); assert(Object.keys(salvo.usuarios).length === 11);
  [A, Bc, C, Z, ...outros.map(o => o[0])].forEach(c => c.ws.close()); g.server.close(); fs.unlinkSync(arq);
  console.log('servidor: OK'); process.exit(0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
