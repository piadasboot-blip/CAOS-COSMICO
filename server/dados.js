/* Guarda os dados do jogo (contas, roupas, posts).
   - Com as variáveis DADOS_TOKEN e DADOS_REPO no Render: salva num repositório PRIVADO do GitHub (não se perde quando o Render reinicia).
   - Sem elas: salva no arquivo data/vibe.json (some quando o Render grátis reinicia). */
'use strict';
const fs = require('fs');
const path = require('path');

function criarDados(op) {
  op = op || {};
  const token = op.token !== undefined ? op.token : process.env.DADOS_TOKEN;
  const repo = op.repo !== undefined ? op.repo : process.env.DADOS_REPO;
  const arquivoGit = 'vibe.json';
  const arquivoLocal = op.arquivo || path.join(__dirname, '..', 'data', 'vibe.json');
  let sha = null, sujo = false, salvando = false, timer = null;
  const vazio = () => ({ seq: 1, usuarios: {}, emails: {}, posts: [], denuncias: [] });
  let db = vazio();
  const usaGit = !!(token && repo);

  async function gh(metodo, corpo) {
    const r = await fetch('https://api.github.com/repos/' + repo + '/contents/' + arquivoGit, {
      method: metodo, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'vibe-servidor' }, body: corpo ? JSON.stringify(corpo) : undefined });
    if (metodo === 'GET' && r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return r.json();
  }
  async function carregar() {
    try {
      if (usaGit) {
        const j = await gh('GET');
        if (j) { sha = j.sha; db = Object.assign(vazio(), JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'))); }
        console.log('Dados carregados do GitHub (' + Object.keys(db.usuarios).length + ' contas)');
      } else if (fs.existsSync(arquivoLocal)) {
        db = Object.assign(vazio(), JSON.parse(fs.readFileSync(arquivoLocal, 'utf8')));
        console.log('Dados carregados do arquivo (' + Object.keys(db.usuarios).length + ' contas)');
      }
    } catch (e) { console.error('Não consegui carregar os dados:', e.message); }
    return db;
  }
  async function gravar() {
    if (salvando) { sujo = true; return; }
    salvando = true; sujo = false;
    const txt = JSON.stringify(db);
    try {
      if (usaGit) {
        if (sha === null) { const j = await gh('GET'); sha = j ? j.sha : undefined; }
        const r = await gh('PUT', { message: 'salvar dados', content: Buffer.from(txt).toString('base64'), sha: sha || undefined });
        sha = r.content.sha;
      } else {
        fs.mkdirSync(path.dirname(arquivoLocal), { recursive: true });
        fs.writeFileSync(arquivoLocal + '.tmp', txt); fs.renameSync(arquivoLocal + '.tmp', arquivoLocal);
      }
    } catch (e) { console.error('Erro ao salvar:', e.message); sha = null; sujo = true; }
    salvando = false;
    if (sujo) agendar(3000);
  }
  function agendar(ms) { clearTimeout(timer); timer = setTimeout(gravar, ms); }
  /* marca que algo mudou: salva em poucos segundos (junta várias mudanças numa gravação) */
  function mudou(rapido) { agendar(rapido ? 1500 : usaGit ? 8000 : 2000); }
  return { carregar, mudou, gravarAgora: gravar, get db() { return db; }, usaGit };
}
module.exports = { criarDados };
