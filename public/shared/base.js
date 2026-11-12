/* VIBE — regras compartilhadas entre servidor e navegador: nome do jogo, catálogo, salas e validações. */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m; else root.BASE = m;
})(this, function () {
  'use strict';

  /* troque aqui para mudar o nome do jogo em todo lugar */
  var NOME = 'VIBE';
  var REGRAS = { IDADE_MIN: 18, CREDITOS_INICIAIS: 150, BONUS_DIARIO: 50, BONUS_HORAS: 20, MAX_SALA: 10, MAX_TEXTO_POST: 280, MAX_FOTO: 90000, MAX_CHAT: 160, MAX_BIO: 100, MAX_TAGS: 7, GIRO_HORAS: 20 };

  /* catálogo: preço 0 = já vem para todo mundo */
  var C = [];
  function item(id, cat, nome, preco, extra) { var o = { id: id, cat: cat, nome: nome, preco: preco }; for (var k in extra) o[k] = extra[k]; C.push(o); }
  // cabelos (forma + cor)
  [['curto', 'Curto', 0], ['longo', 'Longo liso', 0], ['coque', 'Coque duplo', 120], ['cacheado', 'Cacheado volumoso', 150], ['moicano', 'Moicano', 140], ['rabo', 'Rabo de cavalo', 90], ['franja', 'Franja reta', 110], ['raspado', 'Raspado', 0]].forEach(function (h) { item('cab_' + h[0], 'cabelo', h[1], h[2], { forma: h[0] }); });
  // parte de cima
  item('top_camiseta_branca', 'top', 'Camiseta branca', 0, { forma: 'camiseta', cor: 0xf2f2f2 });
  item('top_camiseta_preta', 'top', 'Camiseta preta', 0, { forma: 'camiseta', cor: 0x1c1c22 });
  item('top_top_preto', 'top', 'Top preto', 0, { forma: 'cropped', cor: 0x1f2123 });
  item('top_regata_rosa', 'top', 'Regata rosa', 60, { forma: 'regata', cor: 0xff6fa8 });
  item('top_moletom_roxo', 'top', 'Moletom roxo', 140, { forma: 'moletom', cor: 0x6b3fd6 });
  item('top_moletom_cinza', 'top', 'Moletom cinza', 120, { forma: 'moletom', cor: 0x8a8f99 });
  item('top_jaqueta_couro', 'top', 'Jaqueta de couro', 260, { forma: 'jaqueta', cor: 0x111114 });
  item('top_casaco_pelo', 'top', 'Casaco de pelúcia', 320, { forma: 'pelo', cor: 0x2b2a33 });
  item('top_cropped_neon', 'top', 'Cropped neon', 180, { forma: 'cropped', cor: 0x3ef2e0 });
  item('top_camisa_social', 'top', 'Camisa social', 150, { forma: 'social', cor: 0xe9eef5 });
  item('top_vestido_vermelho', 'top', 'Vestido vermelho', 280, { forma: 'vestido', cor: 0xc8102e });
  item('top_vestido_branco', 'top', 'Vestido de fada', 340, { forma: 'vestido', cor: 0xf4f0ff });
  // parte de baixo
  item('bx_jeans', 'baixo', 'Calça jeans', 0, { forma: 'calca', cor: 0x3a5c8f });
  item('bx_preta', 'baixo', 'Calça preta', 0, { forma: 'calca', cor: 0x18181c });
  item('bx_short_claro', 'baixo', 'Short jeans claro', 0, { forma: 'short', cor: 0xadc4e2 });
  item('bx_cargo', 'baixo', 'Calça cargo', 160, { forma: 'cargo', cor: 0x59614a });
  item('bx_short', 'baixo', 'Short jeans', 80, { forma: 'short', cor: 0x5d7fb5 });
  item('bx_bermuda_preta', 'baixo', 'Bermuda larga', 90, { forma: 'bermuda', cor: 0x2a2a30 });
  item('bx_saia_xadrez', 'baixo', 'Saia xadrez', 130, { forma: 'saia', cor: 0x7a1f3d });
  item('bx_saia_preta', 'baixo', 'Saia preta', 110, { forma: 'saia', cor: 0x141418 });
  // calçados
  item('pe_tenis', 'pes', 'Tênis branco', 0, { forma: 'tenis', cor: 0xf5f5f5 });
  item('pe_tenis_preto', 'pes', 'Tênis preto', 0, { forma: 'tenis', cor: 0x1a1a1a });
  item('pe_bota', 'pes', 'Bota preta', 150, { forma: 'bota', cor: 0x141414 });
  item('pe_chinelo', 'pes', 'Chinelo com meia', 70, { forma: 'chinelo', cor: 0x222222 });
  item('pe_salto', 'pes', 'Salto vermelho', 200, { forma: 'salto', cor: 0xc8102e });
  // acessórios
  item('ac_nenhum', 'acessorio', 'Nenhum', 0, { forma: 'nenhum' });
  item('ac_oculos', 'acessorio', 'Óculos escuros', 90, { forma: 'oculos', cor: 0x111111 });
  item('ac_bone', 'acessorio', 'Boné', 80, { forma: 'bone', cor: 0x1f2a44 });
  item('ac_fones', 'acessorio', 'Fones de ouvido', 120, { forma: 'fones', cor: 0xff4fa3 });
  item('ac_tiara', 'acessorio', 'Tiara de flores', 140, { forma: 'tiara', cor: 0xff9ec7 });
  item('ac_asas', 'acessorio', 'Asas de fada', 400, { forma: 'asas', cor: 0xbfe8ff });
  item('ac_halo', 'acessorio', 'Coroa de luz', 450, { forma: 'halo', cor: 0xffd36b });
  item('ac_chifres', 'acessorio', 'Chifres neon', 380, { forma: 'chifres', cor: 0xb44dff });
  var CATALOGO = C, ITEM = {}; C.forEach(function (i) { ITEM[i.id] = i; });
  var CATS = [['cabelo', 'Cabelo'], ['top', 'Parte de cima'], ['baixo', 'Parte de baixo'], ['pes', 'Calçados'], ['acessorio', 'Acessórios']];

  var PELES = [0xf6d7c3, 0xe8b996, 0xc98e66, 0xa16a45, 0x6e4529, 0x4a2d1a];
  var CORES_CABELO = [0x1a1414, 0x4a2c1c, 0x8a5a2e, 0xd9b26a, 0xf2f0f5, 0xff6fa8, 0x6b8cff, 0xb44dff, 0x3ef2c8, 0xd13030];
  var CORES_OLHO = [0x3b2a20, 0x2f6fa8, 0x3f8a4a, 0x8a5aa8, 0x6e6e6e];

  /* visuais prontos da primeira tela */
  var INICIAIS = [
    { corpo: 'f', modelo: 'femina', pele: 0, cabelo: 'cab_curto', corCabelo: 3, olhos: 0, top: 'top_top_preto', baixo: 'bx_short_claro', pes: 'pe_tenis_preto', acessorio: 'ac_nenhum' },
    { corpo: 'f', modelo: 'gangsta', pele: 2, cabelo: 'cab_curto', corCabelo: 0, olhos: 1, top: 'top_camiseta_preta', baixo: 'bx_preta', pes: 'pe_tenis_preto', acessorio: 'ac_oculos' }
  ];

  /* salas públicas: cada uma é uma "caixa" 3D vista de frente. Os jogadores se movem tocando nos pontos
     (bolinhas): [x, z, rotação, sentado]. Todas usam os mesmos pontos; o cenário muda (sofá, tronco, cadeira…). */
  var PONTOS = [
    [-4, -3.1, 0, 1], [-2.8, -3.1, 0, 1], [2.8, -3.1, 0, 1], [4, -3.1, 0, 1], [-5.1, 0.6, 1.57, 1], [5.1, 0.6, -1.57, 1],
    [-2, -1.2, 0, 0], [0, -1.6, 0, 0], [2, -1.2, 0, 0], [-3.2, 0.9, 0.3, 0], [-1, 0.6, 0, 0], [1, 0.6, 0, 0], [3.2, 0.9, -0.3, 0], [-2, 2.6, 0, 0], [0, 2.4, 0, 0], [2, 2.6, 0, 0]
  ];
  var SALAS = [
    { id: 'lounge', nome: 'Lounge Neon', desc: 'Pista com luzes e sofás', tema: 'neon' },
    { id: 'praia', nome: 'Praia ao Pôr do Sol', desc: 'Areia, fogueira e mar', tema: 'praia' },
    { id: 'cafe', nome: 'Café da Esquina', desc: 'Mesinhas e conversa calma', tema: 'cafe' },
    { id: 'cobertura', nome: 'Cobertura na Cidade', desc: 'Piscina e vista da cidade à noite', tema: 'cobertura' },
    { id: 'jardim', nome: 'Jardim Encantado', desc: 'Árvores de cristal e vaga-lumes', tema: 'jardim' },
    { id: 'quarto', nome: 'Quarto Dark', desc: 'Luz baixa, pôsteres e puffs', tema: 'dark' }
  ];
  var SALA = {}; SALAS.forEach(function (s) { SALA[s.id] = s; });
  var EMOTES = [['acenar', '👋', 'Acenar'], ['dancar', '💃', 'Dançar'], ['rir', '😂', 'Rir'], ['palmas', '👏', 'Palmas'], ['coracao', '💖', 'Coração']];

  /* opções do perfil */
  var PERFIL = {
    sexo: ['Prefiro não dizer', 'Masculino', 'Feminino', 'Outro'],
    pais: ['Brasil', 'Portugal', 'Angola', 'Moçambique', 'Cabo Verde', 'Estados Unidos', 'Argentina', 'Paraguai', 'Uruguai', 'Outro'],
    rel: ['Prefiro não dizer', 'Solteiro(a)', 'Namorando', 'Casado(a)', 'Enrolado(a)', 'Relacionamento aberto'],
    aqui: ['Amizade', 'Conversar', 'Namoro', 'Diversão', 'Moda e visual', 'Outro'],
    tags: ['amizade', 'aventura', 'solitario', 'liberdade', 'misterio', 'anime', 'games', 'musica', 'funk', 'rock', 'kpop', 'trap', 'moda', 'arte', 'festa', 'filmes', 'series', 'viagem', 'pets', 'tatuagem', 'dark', 'fofura', 'esportes', 'futebol', 'leitura', 'fotografia'],
    temas: [['roxo', 'linear-gradient(180deg,#3a1f6a,#0e0d12)'], ['rosa', 'linear-gradient(180deg,#6a1f4a,#0e0d12)'], ['azul', 'linear-gradient(180deg,#14306a,#0e0d12)'], ['verde', 'linear-gradient(180deg,#14503a,#0e0d12)'], ['ouro', 'linear-gradient(180deg,#5a4214,#0e0d12)'], ['preto', 'linear-gradient(180deg,#2a2a30,#0e0d12)'], ['por do sol', 'linear-gradient(180deg,#ff8a5c,#5a1f4a 70%,#0e0d12)'], ['neon', 'linear-gradient(160deg,#2fb8ff,#b44dff 50%,#ff3fd0)']]
  };
  /* limpa o que vem da tela de editar perfil */
  function perfilOk(p) {
    p = p || {}; function opc(lista, v) { return lista.indexOf(v) >= 0 ? v : lista[0]; }
    var tags = []; (Array.isArray(p.tags) ? p.tags : []).forEach(function (t) { if (PERFIL.tags.indexOf(t) >= 0 && tags.indexOf(t) < 0 && tags.length < REGRAS.MAX_TAGS) tags.push(t); });
    return { sexo: opc(PERFIL.sexo, p.sexo), pais: opc(PERFIL.pais, p.pais), rel: opc(PERFIL.rel, p.rel), aqui: opc(PERFIL.aqui, p.aqui), tags: tags,
      tema: PERFIL.temas.some(function (t) { return t[0] === p.tema; }) ? p.tema : 'roxo',
      mostrarOnline: p.mostrarOnline !== false, mostrarSala: !!p.mostrarSala, mostrarIdade: !!p.mostrarIdade, mostrarSexo: !!p.mostrarSexo };
  }

  /* ---------- validações ---------- */
  function idade(nasc, hoje) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(nasc || '')); if (!m) return -1;
    hoje = hoje || new Date(); var a = hoje.getFullYear() - (+m[1]), mm = hoje.getMonth() + 1 - (+m[2]);
    if (mm < 0 || (mm === 0 && hoje.getDate() < +m[3])) a--;
    return (+m[1] < 1900 || a > 120) ? -1 : a;
  }
  function emailOk(e) { return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(String(e || '')); }
  function nomeLimpo(n) { return String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); }
  function textoLimpo(t, max) { return String(t == null ? '' : t).replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, max); }
  /* palavras proibidas simples (o jogo também tem denúncia e bloqueio) */
  var FEIAS = ['nude', 'nudes', 'pelad', 'porn', 'sexo', 'xxx', 'buceta', 'caralho', 'piroca', 'rola'];
  function filtrar(t) { return String(t).replace(/[A-Za-zÀ-ú]+/g, function (w) { var l = w.toLowerCase(); return FEIAS.some(function (f) { return l.indexOf(f) === 0; }) ? '•'.repeat(w.length) : w; }); }

  /* confere se um visual só usa itens válidos (e que a pessoa tem) */
  function visualOk(v, inventario) {
    if (!v || (v.corpo !== 'f' && v.corpo !== 'm')) return false;
    if (v.modelo != null && ['femina', 'gangsta'].indexOf(v.modelo) < 0) return false;
    if (!(v.pele >= 0 && v.pele < PELES.length) || !(v.corCabelo >= 0 && v.corCabelo < CORES_CABELO.length) || !(v.olhos >= 0 && v.olhos < CORES_OLHO.length)) return false;
    return CATS.every(function (c) { var it = ITEM[v[c[0]]]; return it && it.cat === c[0] && (it.preco === 0 || (inventario && inventario.indexOf(it.id) >= 0)); });
  }
  function limparVisual(v) { var o = { corpo: v.corpo, modelo: v.modelo === 'gangsta' ? 'gangsta' : 'femina', pele: v.pele | 0, corCabelo: v.corCabelo | 0, olhos: v.olhos | 0 }; CATS.forEach(function (c) { o[c[0]] = String(v[c[0]]); }); return o; }


  /* roleta diária: só créditos do jogo e roupas do catálogo (nada de dinheiro real) */
  var ROLETA = [
    { t: 'cred', v: 10, peso: 22, cor: 'branco' }, { t: 'cred', v: 40, peso: 12, cor: 'ouro' }, { t: 'item', peso: 8, cor: 'rosa' }, { t: 'cred', v: 15, peso: 20, cor: 'branco' },
    { t: 'cred', v: 150, peso: 3, cor: 'ouro' }, { t: 'cred', v: 25, peso: 15, cor: 'branco' }, { t: 'item', peso: 8, cor: 'rosa' }, { t: 'cred', v: 20, peso: 12, cor: 'branco' }
  ];
  return { ROLETA: ROLETA, PERFIL: PERFIL, perfilOk: perfilOk, PONTOS: PONTOS, NOME: NOME, REGRAS: REGRAS, CATALOGO: CATALOGO, ITEM: ITEM, CATS: CATS, PELES: PELES, CORES_CABELO: CORES_CABELO, CORES_OLHO: CORES_OLHO, INICIAIS: INICIAIS, SALAS: SALAS, SALA: SALA, EMOTES: EMOTES,
    idade: idade, emailOk: emailOk, nomeLimpo: nomeLimpo, textoLimpo: textoLimpo, filtrar: filtrar, visualOk: visualOk, limparVisual: limparVisual };
});
