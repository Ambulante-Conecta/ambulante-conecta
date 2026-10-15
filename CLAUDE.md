# Ambulante Conecta (TCC) — contexto para o Claude Code

Repositório: https://github.com/Ambulante-Conecta/ambulante-conecta (organização do grupo, transferida em 12/10). Site: https://ambulante-conecta.github.io/ambulante-conecta/ · API: https://ambulante-conecta.onrender.com/api · Banco: Neon.

Sistema web que ajuda a prefeitura a mapear e gerir vendedores ambulantes: formalização (MEI/CNPJ), solicitação e concessão de pontos de venda em vias públicas. TCC de Análise e Desenvolvimento de Sistemas, de Manaus/AM.

**Prazo crítico: pré-banca em 30/10/2026.** Projeto em dupla: os dois usam o Claude Code com este arquivo como contexto.
**Idioma: responda sempre em português do Brasil, sem termos de Portugal.**

## Situação atual (atualize esta seção ao concluir qualquer item)

Atualizado em 15/10/2026 (noite).

- **Sistema pronto e publicado:** todos os RF01 a RF07, recuperação de senha, novo visual em todas as telas (Nielsen, WCAG 2.1 AA, e-MAG), camada de rede para conexão instável e deploy (GitHub Pages + Render + Neon). `npm test`: 120 verificações, 0 problemas.
- **Slides da pré-banca: prontos** (confirmado pelo usuário em 15/10).
- **Regras de negócio:** numeração igual à Tabela 4 do artigo (RN05 = concorrência de pontos, RN06 = painel exclusivo do gestor; LGPD = RNF05).
- **Combinado em 15/10:** Resumo, Resultados e Discussões, Considerações Finais (e Abstract) **só depois da pré-banca**.

### Falta até a pré-banca (30/10), em ordem
1. **Correções no artigo** (texto já existente, desatualizado em relação ao sistema): link do GitHub na referência ALVES; seção 3.5 (identidade visual verde/tucumã, Leaflet "já usa", hospedagem já feita em GitHub Pages + Render + Neon); Kanban (mapa, hospedagem, formalização com API e telas já concluídos); tirar "ou sindicato" do RF05 e do Diagrama de Atividade; Matriz GUT (rótulos 1a/1b no texto, riscos 1e/1f citados e ausentes, linha 1c com produto 75 em vez de 125); "Minha Situação" → "Meu pedido" na 3.3.6 e no Diagrama de Componentes; citar a recuperação de senha no RNF02.
2. **Teste de usabilidade (opcional antes da pré-banca, mas os dados alimentam os Resultados):** materiais em 17 e 18/10 (termo de consentimento, questionário SUS, roteiro das 3 tarefas: cadastrar-se, pedir um ponto, ler uma mensagem) e aplicação de 19 a 23/10 com 5 a 8 pessoas, no site publicado.
3. **Lighthouse** do site publicado (desempenho e acessibilidade): evidência do RNF06 e do RNF01.
4. **26/10: fim de mudanças no código.** Só correções do que os testes acharem.
5. **Preparar a demonstração:** recriar as contas de demonstração no Neon com senha conhecida (`DEMO_SENHA`), roteiro da demo, vídeo de reserva (o usuário já está gravando), abrir o site uns minutos antes (o Render dorme após 15 min).
6. **29/10:** dois ensaios cronometrados com os slides e a demo; backup do banco do Neon e do `.env`.
7. **Pequenos itens de documentação:** README ainda cita `responsivo.css` (não existe mais) e não lista os arquivos novos (`icones.js`, `inicio.js`, `recuperar.js`, `recuperar-senha.html`); `img/logo.png` antigo sem uso (apagar quando o usuário confirmar).

### Depois da pré-banca (até a banca final)
- Aplicar as observações da banca.
- Escrever **Resumo, Abstract, Resultados e Discussões** (testes automatizados: 120 verificações; testes de usabilidade: taxa de conclusão, tempo, erros e nota SUS; Lighthouse) e **Considerações Finais** (limitações: sem integração com Portal do Empreendedor e Semef Atende; recuperação de senha sem envio de código; licença municipal representada pelo pedido de ponto aprovado; amostra pequena).
- Entrega final do produto e banca final.

## Trabalho em dupla

- Antes de começar: `git pull`. Ao terminar: commits pequenos e `git push` logo em seguida. Configure `git config --global pull.rebase true` para não gerar commits de merge.
- **Todo push na `main` publica o site** (GitHub Actions) e, se mexer no back-end, a API no Render. Teste localmente antes.
- Ao concluir um item do plano, marque `[x]` aqui e atualize a "Situação atual" no mesmo commit, para o outro saber.
- `npm install` só dentro de `backend-ambulante` (é a única pasta com `package.json`).
- No `.env` do desenvolvimento, use `LOGIN_LIMITE=200` (o `npm test` faz ~16 logins por execução).
- Cada um tem o próprio `.env`, banco local e `JWT_SECRET`. Nunca compartilhe a `DATABASE_URL` do Neon nem segredos do Render em grupo de mensagens.
- Se o Claude Code ligar a API para rodar testes, ele deve desligá-la depois (no Windows, conferir a porta 3000: o `node server.js` pode continuar vivo).
- Um Live Server por vez: a API só aceita o front na porta 5500.

## Como trabalhar neste projeto

- Entregue código completo e funcional, sem trechos omitidos.
- Antes de mexer em rota ou regra, rode `npm test` na pasta `backend-ambulante` e mantenha a suíte verde. Última execução registrada: 120 verificações, 0 problemas (15/10, 13:51, já com a recuperação de senha).
- Antes de criar qualquer tela, leia uma página que já funciona (`frontend/situacao.html` e `frontend/js/situacao.js`) e siga o mesmo padrão. Não invente classes de CSS nem funções que já existem.
- Nunca leia, copie, mostre nem versione o conteúdo do `.env`. Se achar um arquivo `_env` ou `.env` com valores reais em algum lugar compartilhado, avise para trocar `JWT_SECRET` e `DB_PASSWORD`.
- Para dados vindos da API use `escHtml()` ou `textContent`, nunca HTML cru.
- Responsivo nos breakpoints 360, 390, 768 e 1024 px. No celular, tabelas viram cartões.
- Explique em poucas frases o que mudou e como testar no navegador.

## Stack

- Back-end: Node.js + Express (REST), PostgreSQL com PostGIS (`pg`, `pool.query`), JWT com perfis `ambulante` e `gestor`.
- Front-end: HTML5, CSS3 puro e JavaScript ES6+ com `fetch`. Sem frameworks.
- Mapas: Leaflet + OpenStreetMap (decidido: **não** usar Google Maps).
- Testes: scripts Node (`npm test` roda `src/testar-tudo.js`, pede `TESTE_GESTOR_CPF` e `TESTE_GESTOR_SENHA`, que salva o relatório em `resultados-testes/`).
- O front roda pelo Live Server (porta 5500). O CORS aceita só `localhost:5500` e `127.0.0.1:5500`. A API roda em `http://localhost:3000`.

## Estrutura do repositório

```
backend-ambulante/  server.js, api.md, package.json, scripts/ (preparar-demo.js, criar-gestor.js), src/{routes,middlewares,controllers,utils,config}, testar-*.js
database/           schema.sql, seed.sql, migracoes/ (001, 002, 003, 004_turno, 005_senha_alterada)
frontend/           index, mapa, formalizacao, cadastro, login, situacao, comunicacao .html
                    css/style.css, css/responsivo.css
                    js/api.js, app.js, login.js, cadastro.js, situacao.js, comunicacao.js, painel.js, mapa.js, formalizacao.js
                    img/logo.png
```

Atenção ao nome dos arquivos e das pastas: sem acento nem espaço (`situacao.js`, e não `situação.js`).

## Regras de negócio (como estão no código)

- RF01 Cadastro: CPF e CNPJ com módulo 11. Todos os dígitos iguais são rejeitados.
- RF02 Formalização: só quem tem MEI/CNPJ ativo solicita ponto.
- RN01: solicitar exige login de ambulante.
- RN02: ambulante sem MEI recebe **422** ao solicitar.
- RN03: toda solicitação nasce `Pendente` e cria sozinha uma mensagem "Solicitação recebida" para o ambulante (remetente `sistema`).
- RN04: só o gestor avalia. **A recusa exige justificativa** (mínimo 5, máximo 500 caracteres).
- RN05 (concorrência de pontos): quando o gestor aprova, o ponto vira `ocupado` e os outros pedidos pendentes do mesmo ponto são recusados automaticamente com a justificativa "Ponto concedido a outro solicitante."

- RN06 (acesso ao painel): o painel de gestão é exclusivo do perfil gestor.
- RNF05 (LGPD, requisito não funcional): consentimento registrado, senhas com hash, CPF mascarado para o gestor e painel só com dados agregados.

**Numeração (15/10):** segue a Tabela 4 do artigo. README, `api.md`, comentários do código e rótulos dos testes já usam RN05 = concorrência e RN06 = painel. Não renumere sem combinar com o artigo.

## API: 19 rotas em `/api` mais `GET /`

| Rota | Quem | Observações |
|---|---|---|
| `POST /api/ambulantes` | pública | cadastro; campos: nome_completo, cpf, data_nascimento, telefone, tipo_atividade, possui_mei, cnpj_mei, local_pretendido, turno (Manhã/Tarde/Noite/Dia todo, obrigatório), senha, consentimento. Respostas 201, 400 (com `campos`), 409 (CPF repetido) |
| `POST /api/auth/login` | pública | `{cpf, senha}` devolve `{token, usuario:{id, perfil, ambulante_id, nome}}`; limite de 20 tentativas por 15 min |
| `GET /api/auth/me` | logado | |
| `GET /api/pontos` | pública | **GeoJSON**; use `?status=disponivel` e `?bairro=`; dados em `features[].properties` (`id`, `descricao_local`, `bairro`, `status`...) |
| `POST /api/solicitacoes` | ambulante | `{ponto_id}`; 201, 400, 403, 404, 409 (ponto ocupado ou pedido pendente repetido), **422 (sem MEI)** |
| `GET /api/solicitacoes/minhas` | ambulante | campos: id, status, data_solicitacao, justificativa, data_avaliacao, ponto_id, ponto, bairro |
| `GET /api/solicitacoes` | gestor | `?status=Pendente`; campos: id, status, data_solicitacao, justificativa, data_avaliacao, ambulante_id, ambulante, ambulante_turno, ambulante_cpf (**mascarado**), ponto, bairro, ponto_id |
| `PATCH /api/solicitacoes/:id` | gestor | `{status:"Aprovada"\|"Recusada", justificativa}`; 400 sem justificativa, 404, 409 se já avaliada. **Não existe** `/api/avaliacoes/:id`, apesar de alguns textos dizerem isso |
| `POST /api/mensagens` | logado | `{assunto, texto}`; o gestor acrescenta `ambulante_id` |
| `GET /api/mensagens` | logado | ambulante vê a própria conversa; gestor usa `?ambulante_id=X` |
| `GET /api/mensagens/conversas` | gestor | lista as conversas, com contagem de não lidas |
| `GET /api/mensagens/nao-lidas` | logado | devolve `{total}` |
| `PATCH /api/mensagens/:id/lida` | logado | |
| `PATCH /api/mensagens/lidas` | gestor | `{ambulante_id}` |
| `GET /api/ambulantes/me` | ambulante | `{id, nome_completo, possui_mei, cnpj_mei}`, sem CPF |
| `PATCH /api/ambulantes/me` | ambulante | `{cnpj_mei}` (módulo 11); 200 com `possui_mei: true`, 400 com `campos.cnpj_mei`. CNPJ repetido entre ambulantes **não** é bloqueado (o cadastro também não bloqueia) |
| `POST /api/auth/recuperar-senha/verificar` | pública | `{cpf, data_nascimento, meio: "celular"\|"email", contato}` → `{token}` de 10 min; 401 com mensagem única; limite de 5/15 min (dev: `LOGIN_LIMITE`) |
| `POST /api/auth/recuperar-senha/nova` | token de recuperação | `{token, nova_senha}`; grava `usuarios.senha_alterada_em`, encerra sessões antigas (o `autenticar` recusa tokens emitidos antes) e manda aviso "Senha alterada" em Mensagens. **Não há envio de SMS/e-mail**: os dados são conferidos com o cadastro |
| `GET /api/painel` | gestor | usado hoje: `solicitacoes.pendentes`, `pontos.disponiveis`, `ambulantes.total`, `ambulantes.com_mei`, `mensagens_nao_lidas` |

**Não confie só nesta tabela para mensagens e painel.** Leia `src/routes/mensagens.js` e `src/routes/painel.js` para ver os nomes exatos dos campos e os limites (tamanho do texto, limite de envios) antes de ligar as telas.

## Convenções do front-end (já existem, reutilize)

- Esqueleto de página: `<body data-pagina="x" data-exige-login="ambulante|gestor|qualquer|visitante">`, com `.app` > `aside.sidebar` (com `nav#nav`) + `.main` (com `header.topbar` e `main.content`), `nav#mobileNav`, `div#toast`. Um só CSS: `css/style.css` (o `responsivo.css` foi incorporado). Scripts, nesta ordem: `js/api.js`, `js/icones.js`, `js/app.js`, `js/<pagina>.js`.
- **Visual (style.css):** paleta em variáveis (`--floresta-*` para marca e ações, `--tucuma-*` para destaque e anel de foco, `--sucesso/--atencao/--erro/--info/--neutro` com `-fundo`). Contraste conferido: texto >= 4,5:1, bordas de campo e foco >= 3:1. **Nenhum texto abaixo de 16 px**; corpo com 18 px; botões com 48 px de altura (`.btn-sm` 44 px). Fonte do sistema (sem baixar fontes, por causa da rede móvel). Breakpoints 1024 / 768 / 390 / 360.
- **Cor nunca sozinha:** `.status green|orange|red|blue|gray` e `.notice notice-ok|alerta|recusa|info` já desenham ícone + texto via CSS. Use "Em análise / Aprovado / Recusado" para o ambulante (a API diz Pendente/Aprovada/Recusada).
- **Ícones:** `icone("nome")` no JS ou `<svg class="ico" aria-hidden="true"><use href="#i-nome"/></svg>` no HTML (lista em `js/icones.js`). São decorativos: sempre com texto ao lado.
- **Componentes:** `.btn btn-primary|btn-ghost|btn-destaque|btn-perigo|btn-link|btn-sm`, `.btn.carregando` (girando), `.card`, `.page-head` (faixa verde com título), `.field` + `.msg-erro` + `.muted-note` (ajuda), `.grupo` (fieldset de opções), `.choices` (opções em botão), `.ajuda` (details "O que é...?"), `.opcao-card` (opção grande em cartão), `.linha-tempo`, `.etapas` (formulário em etapas), `.balao` (conversa), `.vazio`, `.vazio-convite`.
- **Estados de tela (app.js):** `mostrarCarregando(container, blocos, texto)` (esqueleto) e `mostrarErroCarga(container, erro, tentar)` (erro + "Tentar de novo", que roda sozinho quando a internet volta). Todo carregamento trata carregando, vazio e erro.
- **Rede (api.js):** `chamarApi` tem tempo limite (20 s com o servidor acordado, 75 s se o Render pode estar dormindo), repete GET uma vez e mostra a faixa "sem internet / servidor acordando / conexão de volta". `ErroApi` tem `status` (0 = sem conexão), `tipo` (`offline`, `tempo`, `rede`) e `campos`.
- `api.js`: `API_BASE` (localhost em desenvolvimento; `https://ambulante-conecta.onrender.com/api` publicado), `Sessao` (token e usuário em `sessionStorage`) e `chamarApi(caminho, {metodo, corpo})`, que **lança** `ErroApi` em respostas não-OK e leva ao login em 401.
- `app.js`: `itensMenu` e `menusPorPerfil` (`topo`: menu horizontal do computador, até 5 itens; `lateral`: gaveta do celular; `movel`: 3 atalhos + botão "Menu"). O item selecionado considera a âncora (`painel.html#mensagens` seleciona "Mensagens"), `perfilAtual()`, `protegerPagina()`, `renderTopo()`, `renderMenu()`, `atualizarNaoLidas()`, `mostrarAviso(msg)` (toast de 5 s) e `escHtml()`.
- Para dados vindos da API use `escHtml()` ou `textContent`, nunca HTML cru (inclusive em balões e tooltips do Leaflet).
- Mensagens do ambulante: ver a conversa marca as recebidas como lidas (`PATCH /api/mensagens/lidas`).
- Só a licença municipal da Formalização continua em `localStorage` (`js/formalizacao.js`). A lista "Documentos para separar" foi retirada a pedido do usuário (14/10).

## Contas de teste

`npm run demo` (em `backend-ambulante`) **apaga todos os ambulantes, solicitações e mensagens** (o gestor é mantido), libera os pontos e recria as contas abaixo. Só roda com banco local. A senha das contas é sorteada e aparece uma única vez no terminal (ou use a variável `DEMO_SENHA`).

| Conta | CPF | MEI |
|---|---|---|
| João Demo Silva | 52998224725 | sim (ocupa o 1º ponto) |
| Maria Demo Oliveira | 11144477735 | **não** (usar para testar o 422) |
| Ana Demo Souza | 93541134780 | sim (tem 1 pedido pendente no 2º ponto) |

Exporte os dados de qualquer teste de usabilidade **antes** de rodar o `demo`.

## Plano até a pré-banca

### Semana 0 (concluída)
Commits, senha do gestor trocada, `npm test` verde, Tabela 4 do artigo e RN03 implementada.

### Semana 1 (13 a 16/10): fluxo completo no navegador, sem Thunder Client — **concluída** (11/10; numeração das RNs fechada em 15/10)

- [x] Passo 0: inventário das rotas e CORS.
- [x] Base compartilhada: já existia (`api.js` e `app.js`). Não crie outra.
- [x] `situacao.html` + `js/situacao.js`: lista pontos disponíveis, envia, trata 201/409/422 (aviso de MEI com caminho para a Formalização), mostra status e motivo da recusa, atualiza ao voltar para a aba. **Testado pelo usuário e funcionando.**
- [x] **`comunicacao.html` ligada à API (ambulante).** Feito em `js/comunicacao.js`. **Testado pelo usuário e funcionando (11/10).**
- [x] **`painel.html` + `js/painel.js` (gestor, `data-exige-login="gestor"`).** Feito. Conflito (409/404) aparece dentro do diálogo, fixo. **Testado pelo usuário e funcionando, inclusive o 409 com duas abas (11/10).**
  - Números de `GET /api/painel`.
  - Pendentes de `GET /api/solicitacoes?status=Pendente`: tabela no desktop, cartões no celular.
  - **Aprovar:** confirmação avisando que os outros pedidos pendentes do mesmo ponto serão recusados; depois recarregar tudo.
  - **Recusar:** `<dialog>` com justificativa obrigatória (mínimo 5 caracteres, máximo 500).
  - Seção `#mensagens` (o menu leva a `painel.html#mensagens`): conversas, abrir uma, marcar como lida, responder com `ambulante_id`.
  - Tratar 409 ("já foi avaliada") recarregando a lista.
- [x] **`data-exige-login`**: situacao e comunicacao (ambulante), painel (gestor), cadastro (`visitante`, novo valor: logado vai para o início). index, mapa e formalizacao ficam públicas de propósito. **Testado pelo usuário (11/10).**
- [x] **Teste ponta a ponta só pelo navegador (feito pelo usuário em 11/10):** cadastro, login sem MEI com aviso de Formalização (422), login com MEI e solicitação (Pendente), mensagem "em análise" não lida, segundo ambulante pede o mesmo ponto, gestor aprova um e o outro é recusado, recusa sem justificativa é bloqueada e com justificativa passa, ambulante vê status, motivo e mensagens, logout e acesso direto a `painel.html` redireciona.
- [x] `npm test` verde: 74 verificações, 0 problemas (`resultados-testes/2026-10-11-23-33.txt`). O `npm test` agora roda `src/testar-tudo.js` e para antes se a API estiver desligada.
- [x] Commit e push (`e05a188` + `4f0ad44`, que incluiu os arquivos que tinham ficado de fora).
- [x] README e `api.md` com a numeração das RNs igual à Tabela 4 do artigo (15/10).

### Fim de semana 17 e 18/10
Sem código: termo de consentimento simples, questionário SUS e roteiro das 3 tarefas do teste de usabilidade (cadastrar-se, pedir um ponto, ler uma mensagem). Recrutar 5 a 8 pessoas, de preferência ambulantes. Corrigir os trechos desatualizados do artigo (lista na "Situação atual").

### Semana 2 (19 a 23/10) — funcionalidades adiantadas em 11 a 15/10
- [x] **Mapa Leaflet** em index e `mapa.html` (`js/mapa.js`, Leaflet 1.9.4 com SRI), Google Maps removido.
- [x] **Formalização com API:** `GET`/`PATCH /api/ambulantes/me` (CNPJ pelo módulo 11).
- [x] **Turno de trabalho salvo** (migração 004).
- [x] **Deploy** (12/10): GitHub Pages + Render + Neon; repositório na organização Ambulante-Conecta.
- [x] **Novo visual em todas as telas** (14 e 15/10) e **recuperação de senha** (15/10, migração 005).
- [ ] **19 a 23/10:** testes de usabilidade no site publicado e Lighthouse.

### Semana 3 (26 a 30/10)
- [x] Slides da pré-banca (prontos em 15/10).
- [ ] Seg 26: corrigir o que os testes acharem e **fim de mudanças no código**.
- [ ] Ter 27 e qua 28: preparar a demonstração (contas de demo no Neon com `DEMO_SENHA`, roteiro, vídeo de reserva).
- [ ] Qui 29: dois ensaios cronometrados; backup do banco do Neon e do `.env`.
- [ ] Sex 30: **pré-banca**.

### Depois da pré-banca
Resumo, Abstract, Resultados e Discussões, Considerações Finais; observações da banca; entrega final e banca final.

### Ordem de corte se o tempo apertar
Reduzir os testes de usabilidade para 3 pessoas (ou fazê-los logo após a pré-banca, já que os Resultados só serão escritos depois). Se o Render falhar no dia, demonstrar localmente com o vídeo de reserva.
**Não cortar:** os ensaios e o vídeo de reserva.

## Pontos de atenção já identificados

- Artigo: a cópia que li ainda mostrava "23.10" na Tabela 4 (conferir se o original foi corrigido); a data "06.08" de Ideação provavelmente é 06.06; o texto fala em React Native/PWA, mas o front é HTML/CSS/JS puro e o PWA (RNF04) não está implementado; cita Google Maps, mas a decisão é Leaflet.
- Segurança: não versionar `.env`; trocar `JWT_SECRET` e `DB_PASSWORD` se algum valor real foi compartilhado.
- O `npm test` faz ~16 logins por execução: rodar duas vezes em 15 minutos estoura o limite (logins viram 429 e os testes falham com 401/undefined). No desenvolvimento use `LOGIN_LIMITE=200` no `.env` (ignorado com `NODE_ENV=production`) ou reinicie a API.
- Limite de 20 logins por 15 minutos: atrás do proxy de um serviço de hospedagem, sem `trust proxy`, todos os testadores compartilham esse limite.
- `Sair` apaga a sessão e o estado local; a sessão fica só na aba (`sessionStorage`).
