# VIBE — rede social 3D (protótipo v0.1)

Jogo social 3D para celular em pé: avatar personalizável, salas 3D com chat, loja de roupas com créditos, feed e perfil. Só para maiores de 18 anos.
O nome fica em `public/shared/base.js` (`NOME`), troque lá para mudar em todo o jogo.

## O que tem
- **Conta:** cadastro com nome, email, senha e nascimento (18+). A senha fica protegida (scrypt). Login com sessão salva no aparelho.
- **Primeiro visual:** 6 avatares prontos num palco neon 3D.
- **Avatar 3D:** corpo feminino ou masculino, 6 tons de pele, cor dos olhos, 8 cabelos com 10 cores, roupas de cima e de baixo, calçados e acessórios (asas, coroa de luz, chifres neon…).
- **Loja:** compra com créditos (150 ao criar a conta e 50 grátis por dia).
- **Salas 3D:** Lounge Neon, Praia, Café, Cobertura, Jardim e Quarto Dark. Máximo de 10 pessoas por sala; quando lota, abre "Sala 2" sozinha.
  - Toque na tela para ver as bolinhas de onde dá pra ir (em pé ou sentado).
  - Balões de fala, histórico do chat, emotes (acenar, dançar, rir, palmas, coração) e foto 3D da sala.
- **Feed:** texto e foto 3D tirada no jogo (não aceita imagem da galeria). Curtir, comentar, apagar.
- **Perfil:** seguidores, seguindo, amigos (quem segue de volta), bio, posts.
- **Notificações:** seguidores, curtidas, comentários.
- **Segurança:** bloquear, denunciar perfil e post, post com 3 denúncias some, filtro de palavrões, limite de mensagens e de tentativas de senha.

## Rodar
```
npm install
npm start      # http://localhost:3000
npm test
```

## Render
- Build: `npm install` — Start: `npm start`.
- **Para não perder as contas** quando o Render grátis reiniciar, crie um repositório **privado** só para dados (ex.: `vibe-dados`) e coloque no Render (Environment):
  - `DADOS_REPO` = `seu-usuario/vibe-dados`
  - `DADOS_TOKEN` = um token do GitHub com permissão **Contents: Read and write** só nesse repositório
  - `ADMIN_EMAIL` = o email da sua conta no jogo (pode apagar posts e banir).
- Sem essas variáveis, os dados ficam num arquivo e somem quando o Render reinicia.

## Personagem Femina
O avatar feminino usa o modelo `public/modelos/female_demon_girl_body_mesh_free.glb`, carregado pelo `GLTFLoader`. O arquivo original foi fornecido pelo usuário e mantém os metadados de atribuição/licença do modelo.


## Segundo personagem
Também foi adicionado `public/modelos/sexy_gangsta_girl_2.glb` como a opção selecionável **Gangsta Girl**, junto da Femina, na tela inicial e no guarda-roupa.
