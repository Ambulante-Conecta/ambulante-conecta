# Ambulante Conecta (TCC) — contexto para o Claude Code

Sistema web que ajuda a prefeitura a mapear e gerir vendedores ambulantes: formalização (MEI/CNPJ), solicitação e concessão de pontos de venda em vias públicas. TCC de Análise e Desenvolvimento de Sistemas, de Manaus/AM.

**Prazo crítico: pré-banca em 30/10/2026.** Hoje é 11/10/2026. A segunda 12/10 é feriado.
**Idioma: responda sempre em português do Brasil, sem termos de Portugal.**

## Como trabalhar neste projeto

- Entregue código completo e funcional, sem trechos omitidos.
- Antes de mexer em rota ou regra, rode `npm test` na pasta `backend-ambulante` e mantenha a suíte verde. Última execução registrada: 95 verificações, 0 problemas (11/10, 20:38, já com turno e formalização).
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

## Estrutura (pasta `definitivo`)

```
backend-ambulante/  server.js, api.md, package.json, scripts/ (preparar-demo.js, criar-gestor.js), src/{routes,middlewares,controllers,utils,config}, testar-*.js
database/           schema.sql, seed.sql, migracoes/ (001, 002, 003, 004_turno)
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
- Concorrência de pontos: quando o gestor aprova, o ponto vira `ocupado` e os outros pedidos pendentes do mesmo ponto são recusados automaticamente com a justificativa "Ponto concedido a outro solicitante."

**Decisão pendente do usuário:** a numeração das RNs está inconsistente. O artigo usa RN03 = pendente + aviso, RN05 = LGPD (consentimento) e RN06 = painel/CPF mascarado. O contexto do projeto chama a concorrência de RN05. Sugestão: tratar o artigo como referência e registrar a concorrência como RN07, ajustando README e `api.md`. Não renumere nada sem perguntar.

## API: 17 rotas em `/api` mais `GET /`

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
| `GET /api/painel` | gestor | usado hoje: `solicitacoes.pendentes`, `pontos.disponiveis`, `ambulantes.total`, `ambulantes.com_mei`, `mensagens_nao_lidas` |

**Não confie só nesta tabela para mensagens e painel.** Leia `src/routes/mensagens.js` e `src/routes/painel.js` para ver os nomes exatos dos campos e os limites (tamanho do texto, limite de envios) antes de ligar as telas.

## Convenções do front-end (já existem, reutilize)

- Esqueleto de página: `<body data-pagina="x" data-exige-login="ambulante|gestor|qualquer">`, com `.app` > `aside.sidebar` (com `nav#nav`) + `.main` (com `header.topbar` e `main.content`), `nav#mobileNav`, `div#toast`. Scripts, nesta ordem: `js/api.js`, `js/app.js`, `js/<pagina>.js`.
- `api.js`: `API_BASE` (localhost em desenvolvimento; `https://ambulante-conecta.onrender.com/api` publicado), `Sessao` (guarda token e usuário em `sessionStorage`), `ErroApi` (`status` 0 = sem conexão; `campos`) e `chamarApi(caminho, {metodo, corpo})`. Ele **lança** `ErroApi` em respostas não-OK e leva ao login em 401.
- Pendência para o deploy: `cadastro.js` tem o próprio `API_URL`, duplicando o `API_BASE` do `api.js`.
- `app.js`: `itensMenu` e `menusPorPerfil` (o menu do gestor já aponta para `painel.html` e `painel.html#mensagens`), `perfilAtual()`, `protegerPagina()` (usa `data-exige-login`), `renderTopo()`, `renderMenu()`, `atualizarNaoLidas()` (badge no menu), `mostrarAviso(msg)` (toast) e `escHtml()`.
- Classes de CSS que existem: `card`, `form-card`, `section-title`, `page-head`, `field`, `msg-erro`, `btn btn-primary`, `btn btn-ghost`, `btn-row`, `status green|orange|red|gray`, `notice`, `detalhes`, `msg-list`, `details.msg(.nova)`, `vazio`, `mt`, `muted`. Os estilos de `situacao` (cartões `solic-card`, avisos `notice-*`) estão no fim do `style.css`.
- `style.css` precisa ter `[hidden]{display:none !important}` (o `.notice` com `display:flex` anulava o atributo `hidden`). **Confirme que a linha existe.**
- Todo estado de tela é tratado: carregando, vazio e erro com botão "Tentar de novo".
- `paginas.js` foi removido. Só a licença municipal e a lista de documentos da Formalização continuam em `localStorage` (`js/formalizacao.js`).

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

### Semana 1 (13 a 16/10): fluxo completo no navegador, sem Thunder Client — **concluída em 11/10** (falta só o commit e o push)

- [x] Passo 0: inventário das rotas e CORS.
- [x] Base compartilhada: já existia (`api.js` e `app.js`). Não crie outra.
- [x] `situacao.html` + `js/situacao.js`: lista pontos disponíveis, envia, trata 201/409/422 (aviso de MEI com caminho para a Formalização), mostra status e motivo da recusa, atualiza ao voltar para a aba. **Testado pelo usuário e funcionando.**
- [x] **`comunicacao.html` ligada à API (ambulante).** Feito em `js/comunicacao.js`. **Testado pelo usuário e funcionando (11/10).** Hoje é protótipo em `localStorage` (`paginas.js`, com destinatário "Sindicato", que a API não tem). Fazer: `data-exige-login="ambulante"`, caixa de entrada vinda de `GET /api/mensagens`, abrir mensagem marca como lida (`PATCH /:id/lida`) e atualiza o badge do menu, formulário de envio (`POST /api/mensagens`), e os três estados de tela. A mensagem de RN03 deve aparecer como não lida. Remover `paginaComunicacao` do `paginas.js`.
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
- [ ] Commit (ex.: `feat(front): fluxo de solicitação, mensagens e painel do gestor`) e push.
- [ ] Ajustar README e `api.md` (nomes das rotas e numeração das RNs, depois que o usuário decidir). **Fica aguardando a decisão das RNs; não bloqueia a Semana 2.**

### Fim de semana 17 e 18/10
Sem código: termo de consentimento simples, questionário SUS e 3 tarefas dos testes de usabilidade (cadastrar-se, pedir um ponto, ler uma mensagem). Recrutar 5 a 8 pessoas, de preferência ambulantes.

### Semana 2 (19 a 23/10)
- [x] **Feito em 11/10 (adiantado), testado pelo usuário:** `js/mapa.js` com Leaflet 1.9.4 (SRI), filtro, legenda, lista acessível e login que preserva `?ponto=`. Google Maps removido do site e do README (falta no artigo).
- Seg 19: **mapa Leaflet** (index e `mapa.html`) com `GET /api/pontos`, cor por status e botão "Solicitar este ponto" levando a `situacao.html?ponto=ID#nova` (a `situacao.js` já lê o parâmetro `ponto`). Tirar as menções a Google Maps do site.
- [x] **Formalização com API feita em 11/10 (adiantada), testada pelo usuário:** `GET`/`PATCH /api/ambulantes/me`, `js/formalizacao.js`, `testar-formalizacao.js` (16 verificações OK), `npm start` criado. Os botões "Entrar" do topo e do menu do celular voltam para a página atual depois do login.
- Ter 20: **formalização mínima com API**: `PATCH /api/ambulantes/me` (valida o CNPJ com módulo 11, atualiza `possui_mei` e `cnpj_mei`) e campo de CNPJ na Formalização. Hoje marcar a etapa só grava no navegador, então o 422 continua, o que deixa um beco sem saída na demonstração. Tarde: melhorias de front (estados de tela, 404, mostrar regras da senha, aviso de CPF já existente, revisão do português). **Feito em 11/10**, mais o turno salvo de verdade (decisão do usuário: banco completo para o TCC; migração 004 aplicada no banco local).
- [ ] **Deploy adiantado para 11/10 — decidido: GitHub Pages (front) + Render grátis (API) + Neon grátis (banco com PostGIS; não expira).** Código pronto: `DATABASE_URL` com SSL em `database.js`, `trust proxy` com `NODE_ENV=production`, `engines` Node 20+, `.env.example` documentado e `scripts/preparar-banco-publicado.js` (testado em banco temporário local). `preparar-demo.js` agora lê o host da `DATABASE_URL` (antes poderia apagar o banco publicado achando que era local). Falta: usuário criar contas Neon e Render, configurar variáveis, trocar `API_BASE` em `api.js`, `CORS_ORIGINS`.
- Qua 21: **deploy em 1 dia só** (back-end e banco em serviço gratuito, front no GitHub Pages ou Vercel). No fim do dia, decidir: se não subiu, os testes e a demonstração são locais. Antes: `app.set('trust proxy', 1)` no Express, endereço do front em `CORS_ORIGINS`, `API_BASE` real em `api.js`, `deploy.yml` em `.github/workflows/`, e conferir se o serviço escolhido tem PostGIS (a API usa `ST_AsGeoJSON`).
- Qui 22 e sex 23: testes de usabilidade e Lighthouse (evidência do RNF06 no artigo).

### Semana 3 (26 a 30/10)
Seg 26: corrigir o que os testes acharam e **fim de funcionalidades novas**. Ter 27: Resultados, Resumo e Abstract do artigo, e primeira versão dos slides. Qua 28: slides finais, roteiro da demonstração e vídeo de reserva. Qui 29: ensaio completo cronometrado 2 vezes, backup do banco e do `.env`. Sex 30: pré-banca.

### Ordem de corte se o tempo apertar
1. Formalização com API (vira limitação no artigo). 2. Deploy (demonstrar local com o vídeo de reserva). 3. Reduzir os testes de usabilidade para 3 pessoas.
**Não cortar:** o fluxo completo da Semana 1, os slides e o ensaio.

## Pontos de atenção já identificados

- Artigo: a cópia que li ainda mostrava "23.10" na Tabela 4 (conferir se o original foi corrigido); a data "06.08" de Ideação provavelmente é 06.06; o texto fala em React Native/PWA, mas o front é HTML/CSS/JS puro e o PWA (RNF04) não está implementado; cita Google Maps, mas a decisão é Leaflet.
- Segurança: não versionar `.env`; trocar `JWT_SECRET` e `DB_PASSWORD` se algum valor real foi compartilhado.
- Limite de 20 logins por 15 minutos: atrás do proxy de um serviço de hospedagem, sem `trust proxy`, todos os testadores compartilham esse limite.
- `Sair` apaga a sessão e o estado local; a sessão fica só na aba (`sessionStorage`).
