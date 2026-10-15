# 🛒 Ambulante Conecta

**Sistema web para apoiar a formalização, a organização e a comunicação de trabalhadores ambulantes em Manaus/AM.**

*Seu ponto certo, do jeito certo.*

O **Ambulante Conecta** é o Trabalho de Conclusão de Curso (TCC) do curso de **Análise e Desenvolvimento de Sistemas do Centro Universitário CEUNI FAMETRO**. O sistema reúne, num só lugar, o cadastro do ambulante, a orientação sobre formalização (MEI e licença municipal), o mapa e o pedido de pontos de venda, a conversa com a prefeitura e um painel para o gestor público.

> **Status:** todos os requisitos funcionais (RF01 a RF07) implementados, publicados e testados. A suíte automatizada da API tem **120 verificações, todas passando** (15/10/2026).

**Acesse:** [site publicado](https://ambulante-conecta.github.io/ambulante-conecta/) · [API](https://ambulante-conecta.onrender.com/api/pontos) · [repositório](https://github.com/Ambulante-Conecta/ambulante-conecta)  
<sub>A API usa o plano gratuito do Render: depois de 15 minutos sem uso, a primeira chamada pode levar cerca de 1 minuto. O site avisa "o servidor está acordando" enquanto isso.</sub>

---

## 📌 Sumário

- [Contexto e objetivo](#-contexto-e-objetivo)
- [Funcionalidades](#-funcionalidades)
- [Requisitos e regras de negócio](#-requisitos-e-regras-de-negócio)
- [Segurança e LGPD](#-segurança-e-lgpd)
- [Interface, usabilidade e acessibilidade](#-interface-usabilidade-e-acessibilidade)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Como executar localmente](#-como-executar-localmente)
- [Publicação (deploy)](#-publicação-deploy)
- [API](#-api)
- [Testes](#-testes)
- [Limitações conhecidas](#-limitações-conhecidas)
- [Autores](#-autores)

---

## 🎯 Contexto e objetivo

Cerca de 90% dos vendedores ambulantes de Manaus permanecem na informalidade (Bezerra; Silva, 2021). As informações sobre o registro como Microempreendedor Individual (MEI), a licença municipal e os locais autorizados para vender estão espalhadas em canais diferentes, e não há um canal direto de conversa com a prefeitura.

**Objetivo:** apoiar a formalização e a organização dos trabalhadores ambulantes de Manaus, centralizando a orientação, a gestão de pontos de venda e a comunicação com a administração municipal, alinhado ao **ODS 8 (Meta 8.3)** da Agenda 2030.

---

## ✨ Funcionalidades

### 👤 Cadastro — RF01
- Cadastro em 5 etapas com barra de progresso: dados pessoais, contato e senha, atividade, local e turno, revisão.
- CPF e CNPJ validados pelo módulo 11; idade mínima de 18 anos; senha com 8 a 72 caracteres, letras e números (regras mostradas ao vivo).
- Turno de trabalho (Manhã, Tarde, Noite ou Dia todo) e local pretendido.
- Revisão com "Corrigir" em cada bloco e rascunho guardado no aparelho (sem CPF e sem senha).
- Ambulante e acesso criados na mesma transação; consentimento LGPD registrado com a data.

### 🔐 Login e recuperação de senha
- Login com CPF e senha; sessão por token JWT guardado só na aba (`sessionStorage`).
- Perfis **ambulante** e **gestor**, com páginas e menus próprios.
- **Esqueci minha senha:** o ambulante confirma CPF, data de nascimento e **celular ou e-mail** do cadastro (ele escolhe) e cria uma senha nova. A troca encerra as sessões abertas em outros aparelhos e gera um aviso em Mensagens.

### 📋 Formalização — RF02
- Etapa 1 (MEI): passo a passo para tirar o MEI no Portal do Empreendedor e campo para informar o CNPJ, que libera o pedido de ponto.
- Etapa 2 (autorização da prefeitura): mostra a situação real do pedido de ponto (não iniciada, em análise ou concluída).

### 🗺️ Mapa de pontos de venda — RF03
- Mapa Leaflet + OpenStreetMap com os pontos da API (GeoJSON do PostGIS).
- Cor, ícone e texto por situação (Livre / Ocupado), legenda com contagem, filtro e lista acessível ao lado do mapa.
- "Pedir este ponto" leva direto ao pedido, já com o ponto escolhido (inclusive passando pelo login).

### 📝 Meu pedido — RF04
- Pontos livres em cartões; pontos já pedidos ficam bloqueados.
- Andamento em linha do tempo: Enviado → Análise da prefeitura → Aprovado ou Recusado (com o motivo).
- Sem MEI, o pedido é recusado com um aviso que leva direto à Formalização.

### 💬 Mensagens — RF05
- Conversa com a prefeitura em formato de chat, com os avisos automáticos (pedido recebido, aprovado, recusado, senha alterada).
- Assunto em botões (opcional), contador de caracteres e mensagem preservada se o envio falhar.
- Contador de mensagens novas no menu; abrir a conversa marca as recebidas como lidas.

### ⚖️ Avaliação pelo gestor — RF06
- Pedidos aguardando decisão em tabela (cartões no celular), com o CPF mascarado e o turno do ambulante.
- Aprovar com confirmação; recusar exige justificativa (5 a 500 caracteres).
- Conflitos (pedido já avaliado ou ponto já ocupado) aparecem no próprio diálogo, sem perder o que foi feito.

### 📊 Painel do gestor — RF07
- Indicadores do dia: pedidos aguardando, mensagens não lidas, pontos livres e ambulantes cadastrados (com MEI).
- Conversas com os ambulantes; o menu "Mensagens" abre sozinho a conversa mais importante (não lidas primeiro).

---

## 📋 Requisitos e regras de negócio

| Requisito | Onde está |
|---|---|
| **RF01** Cadastro e diagnóstico do trabalhador | `cadastro.html`, `POST /api/ambulantes` |
| **RF02** Orientação sobre formalização (MEI e licença municipal) | `formalizacao.html`, `GET`/`PATCH /api/ambulantes/me` |
| **RF03** Consulta de pontos no mapa | `mapa.html`, `index.html`, `GET /api/pontos` |
| **RF04** Solicitação de ponto disponível | `situacao.html` (Meu pedido), `POST /api/solicitacoes` |
| **RF05** Comunicação com a prefeitura | `comunicacao.html`, painel do gestor, rotas `/api/mensagens` |
| **RF06** Avaliação das solicitações pelo gestor | `painel.html`, `PATCH /api/solicitacoes/:id` |
| **RF07** Painel de gestão | `painel.html`, `GET /api/painel` |

### Regras de negócio (iguais à Tabela 4 do artigo)

- **RN01 – Autenticação obrigatória:** a solicitação de pontos exige ambulante cadastrado e com sessão iniciada.
- **RN02 – MEI ativo:** o sistema só registra a solicitação se o ambulante tiver MEI/CNPJ ativo; caso contrário, o pedido é rejeitado (HTTP 422).
- **RN03 – Estado inicial e aviso:** toda solicitação nasce como **Pendente** e gera um aviso automático informando que o pedido está em análise.
- **RN04 – Avaliação exclusiva do gestor:** apenas o gestor aprova ou recusa solicitações; a recusa exige justificativa.
- **RN05 – Concorrência de pontos:** quando o gestor aprova um pedido, o ponto passa a ocupado e os outros pedidos pendentes para o mesmo ponto são recusados automaticamente, com a justificativa "Ponto concedido a outro solicitante." e aviso aos ambulantes. Tudo acontece numa transação com bloqueio das linhas (`FOR UPDATE`), para que duas avaliações ao mesmo tempo não concedam o mesmo ponto.
- **RN06 – Acesso ao painel:** o painel de gestão é exclusivo do perfil gestor.

### Requisitos não funcionais, na prática

| RNF | Como foi atendido |
|---|---|
| **RNF01** Interface simples e acessível | Heurísticas de Nielsen, WCAG 2.1 AA e e-MAG (detalhes abaixo) |
| **RNF02** Autenticação e proteção | JWT, perfis, senha com hash, limite de tentativas, recuperação de senha que encerra sessões antigas |
| **RNF03** Funcionamento em celulares | Telas pensadas primeiro para o celular; testadas em 360, 390, 768 e 1024 px |
| **RNF04** Navegadores atuais, sem instalação | Site web em HTML, CSS e JavaScript puros |
| **RNF05** LGPD | Ver [Segurança e LGPD](#-segurança-e-lgpd) |
| **RNF06** Conectividade limitada | Sem frameworks nem fontes externas; tempo limite e nova tentativa automática; avisos de "sem internet" e "servidor acordando"; a tela se atualiza sozinha quando a conexão volta |

---

## 🔐 Segurança e LGPD

- Senhas guardadas com hash **bcrypt** (biblioteca `bcryptjs`); nunca devolvidas pela API.
- Token **JWT** com validade de 8 horas; sessões antigas deixam de valer quando a senha é trocada.
- Controle de acesso por perfil em cada rota (`403` para quem não tem permissão).
- **CPF mascarado** para o gestor (ex.: `***.444.777-**`); o painel mostra só números agregados.
- **Consentimento** do ambulante registrado com a data no cadastro.
- Consultas SQL parametrizadas; CORS restrito ao endereço do site; limite de tentativas no login (20 a cada 15 min) e na recuperação de senha (5 a cada 15 min).
- Login e recuperação com mensagem de erro única, que não revela se um CPF tem conta.
- Segredos só em variáveis de ambiente: o `.env` nunca vai para o Git.

O tratamento de dados segue a **Lei nº 13.709/2018 (LGPD)**.

---

## ♿ Interface, usabilidade e acessibilidade

Identidade visual **"Amazônico acolhedor"**: verde-floresta, laranja tucumã e fundo em verde opaco, com o logo do alfinete com a barraca.

**Acessibilidade (WCAG 2.1 AA e e-MAG):**
- Contraste conferido em todas as combinações: texto com pelo menos 4,5:1; bordas de campo e contorno de foco com pelo menos 3:1.
- Nenhum texto abaixo de 16 px; botões com 48 px de altura e áreas de toque de pelo menos 44 px.
- **Cor nunca sozinha:** todo status tem ícone e texto (✓ aprovado, relógio em análise, ✕ recusado).
- HTML semântico, navegação completa por teclado, contorno de foco visível, link "Ir para o conteúdo" e textos para leitor de tela.

**Heurísticas de Nielsen, aplicadas:**

| Heurística | Exemplos no sistema |
|---|---|
| 1. Visibilidade do status | Etapas com barra de progresso, linha do tempo do pedido, avisos de conexão |
| 2. Linguagem do usuário | "Em análise", "Livre", "Meu pedido" |
| 3. Controle e liberdade | Voltar, "Corrigir" na revisão, cancelar, mostrar senha |
| 4. Consistência | Os mesmos botões, cartões e selos em todas as telas |
| 5. Prevenção de erros | Regras da senha ao vivo, pontos já pedidos bloqueados, confirmação antes de aprovar |
| 6. Reconhecimento | Opções em botões, "Seu próximo passo" na página inicial |
| 7. Flexibilidade | Menu no topo (computador) e menu inferior com gaveta (celular), atalhos para o ponto no mapa |
| 8. Design minimalista | Uma ação principal por tela, listas compactas |
| 9. Mensagens de erro | Erro embaixo do campo certo, dizendo o que fazer |
| 10. Ajuda | "O que é MEI?", "Veja como tirar", "Não lembro desses dados" |

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript puro (sem frameworks), Fetch API |
| Mapa | Leaflet 1.9.4 + OpenStreetMap |
| Back-end | Node.js 20+ e Express |
| Autenticação e segurança | jsonwebtoken (JWT), bcryptjs, express-rate-limit, cors |
| Banco de dados | PostgreSQL + PostGIS (biblioteca `pg`) |
| Testes | Roteiros automatizados em Node.js (`npm test`) e testes manuais com Thunder Client/Postman |
| Publicação | GitHub Pages (front-end), Render (API) e Neon (banco PostgreSQL com PostGIS) |
| Versionamento | Git e GitHub, com GitHub Actions publicando o front-end a cada push na `main` |

---

## 🧱 Arquitetura

```text
Navegador (celular ou computador)
   │  HTML, CSS e JavaScript — GitHub Pages
   │  Fetch API + token JWT
   ▼
API REST — Node.js + Express — Render
   ├── Rotas (/api/...)
   ├── Middlewares: autenticação (JWT) e perfil (ambulante / gestor)
   ├── Regras de negócio e validações (CPF, CNPJ, senha)
   ▼
PostgreSQL + PostGIS — Neon
```

---

## 📁 Estrutura do repositório

```text
ambulante-conecta/
├── .github/workflows/deploy.yml     publica a pasta frontend no GitHub Pages
├── backend-ambulante/
│   ├── server.js                    API Express (CORS, rotas, erros)
│   ├── api.md                       documentação de todas as rotas
│   ├── .env.example                 variáveis de ambiente (sem segredos)
│   ├── scripts/
│   │   ├── criar-gestor.js          cria o gestor ou redefine a senha dele
│   │   ├── preparar-demo.js         contas de demonstração (npm run demo)
│   │   └── preparar-banco-publicado.js   monta o banco do Neon
│   ├── resultados-testes/           relatórios do npm test (evidências)
│   └── src/
│       ├── config/database.js       conexão (local ou DATABASE_URL)
│       ├── controllers/             listagem de solicitações do gestor
│       ├── middlewares/auth.js      JWT, perfis e sessões
│       ├── routes/                  ambulantes, auth, pontos, solicitacoes, avaliacoes, mensagens, painel
│       ├── utils/validacoes.js      CPF, CNPJ, data, senha
│       └── testar-*.js              roteiros de teste (testar-tudo.js roda todos)
├── database/
│   ├── schema.sql                   estrutura completa do banco
│   ├── seed.sql                     pontos de venda e dados de exemplo
│   ├── resetar_pontos.sql
│   └── migracoes/                   001 a 005 (005 = recuperação de senha)
├── frontend/
│   ├── index.html                   início (próximo passo e mapa)
│   ├── login.html · recuperar-senha.html · cadastro.html
│   ├── formalizacao.html · mapa.html · situacao.html (Meu pedido) · comunicacao.html (Mensagens)
│   ├── painel.html                  painel do gestor
│   ├── 404.html
│   ├── css/style.css                todo o visual
│   ├── img/                         logo e ícones do site
│   └── js/                          api.js (rede), app.js (menus e estados), icones.js e um script por página
├── CLAUDE.md                        contexto e cronograma do projeto
└── README.md
```

---

## ▶️ Como executar localmente

**Pré-requisitos:** Node.js 20 ou mais novo, PostgreSQL com a extensão **PostGIS**, Git e a extensão **Live Server** do VS Code.

```bash
git clone https://github.com/Ambulante-Conecta/ambulante-conecta.git
cd ambulante-conecta/backend-ambulante
npm install
```

1. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `JWT_SECRET` (gere um com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). No desenvolvimento, mantenha `LOGIN_LIMITE=200`.
2. **Banco:** crie o banco e rode `database/schema.sql` e depois `database/seed.sql`. Num banco que já existia, aplique só as migrações que faltam em `database/migracoes/` (todas podem rodar mais de uma vez).
3. **Gestor e contas de demonstração:**
   ```bash
   node scripts/criar-gestor.js <CPF válido>
   npm run demo
   ```
   As senhas aparecem uma única vez no terminal. **Atenção:** `npm run demo` apaga cadastros, pedidos e mensagens do banco local.
4. **API:** `npm start` (porta 3000).
5. **Front-end:** abra `frontend/index.html` com o **Live Server** (porta 5500). A API só aceita o front nas portas 5500 de `localhost` e `127.0.0.1`.

> Rode `npm install` **somente** dentro de `backend-ambulante` (é a única pasta com `package.json`).

---

## ☁️ Publicação (deploy)

| Parte | Serviço | Como atualiza |
|---|---|---|
| Front-end | GitHub Pages | Sozinho, a cada push na `main` (GitHub Actions) |
| API | Render (plano gratuito) | Sozinho, a cada push na `main` |
| Banco | Neon (PostgreSQL + PostGIS) | Migrações novas com `scripts/preparar-banco-publicado.js` **antes** do push |

Variáveis no Render: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production` e `CORS_ORIGINS=https://ambulante-conecta.github.io`.

---

## 🔌 API

Todas as rotas ficam em `/api`. As protegidas exigem `Authorization: Bearer <token>`.

| Método | Rota | Quem |
|---|---|---|
| `POST` | `/api/ambulantes` | pública (cadastro) |
| `POST` | `/api/auth/login` | pública |
| `GET` | `/api/auth/me` | logado |
| `POST` | `/api/auth/recuperar-senha/verificar` · `/api/auth/recuperar-senha/nova` | pública |
| `GET` · `PATCH` | `/api/ambulantes/me` | ambulante (situação e CNPJ do MEI) |
| `GET` | `/api/pontos` | pública (GeoJSON) |
| `POST` | `/api/solicitacoes` | ambulante |
| `GET` | `/api/solicitacoes/minhas` | ambulante |
| `GET` | `/api/solicitacoes` | gestor |
| `PATCH` | `/api/solicitacoes/:id` | gestor (aprovar ou recusar) |
| `GET` · `POST` | `/api/mensagens` | logado |
| `GET` | `/api/mensagens/conversas` · `/api/mensagens/nao-lidas` | gestor · logado |
| `PATCH` | `/api/mensagens/:id/lida` · `/api/mensagens/lidas` | logado |
| `GET` | `/api/painel` | gestor |

Parâmetros, corpos e códigos de resposta de cada rota: [`backend-ambulante/api.md`](backend-ambulante/api.md).

### Fluxo principal

```text
Cadastro ─► Login ─► Formalização (CNPJ do MEI) ─► Mapa / Meu pedido ─► Pedido "Pendente" + aviso (RN03)
                                                                              │
                                                     Gestor avalia (RN04) ◄───┘
                                                       ├── Aprova ─► ponto ocupado; concorrentes recusados (RN05)
                                                       └── Recusa ─► justificativa obrigatória
                                                                              │
                                                     Resultado em Mensagens ◄─┘
```

---

## 🧪 Testes

Com a API ligada, em `backend-ambulante`:

```powershell
$env:TESTE_GESTOR_CPF="<CPF do gestor>"; $env:TESTE_GESTOR_SENHA="<senha do gestor>"; npm test
```

| Roteiro | O que confere |
|---|---|
| `testar-api.js` | cadastro, login, permissões, RN01 a RN03 |
| `testar-avaliacao.js` | aprovação e recusa (RN04), concorrência de pontos (RN05), CPF mascarado |
| `testar-mensagens.js` | conversas, não lidas e isolamento entre ambulantes |
| `testar-painel.js` | painel só do gestor (RN06) e sem dados pessoais |
| `testar-formalizacao.js` | CNPJ do MEI: 422 antes de informar, 201 depois |
| `testar-recuperacao.js` | recuperação de senha: dados errados, celular ou e-mail, token de uso único, sessões encerradas |

Última execução: **120 verificações, 0 problemas** (15/10/2026). Cada execução salva um relatório em `backend-ambulante/resultados-testes/`.

---

## ⚠️ Limitações conhecidas

- Sem integração com os sistemas oficiais (Portal do Empreendedor e Semef Atende); o sistema orienta e leva até eles.
- A recuperação de senha confere os dados do cadastro, mas **não envia código** por SMS ou e-mail.
- A autorização da prefeitura é representada pelo pedido de ponto aprovado no próprio sistema.
- No plano gratuito do Render, a API "dorme" após 15 minutos sem uso.
- Protótipo acadêmico, ainda não implantado pela Prefeitura de Manaus.

---

## 👨‍💻 Autores

**Vagner Matheus Ramos Alves** · **Frank dos Santos Bezerra Junior**

**Curso:** Análise e Desenvolvimento de Sistemas · **Instituição:** Centro Universitário CEUNI FAMETRO  
**Orientadora:** Luana Magalhães Leal

---

## 📚 Referências e contexto acadêmico

Engenharia de Software (Sommerville; Pressman e Maxim), refatoração (Fowler), usabilidade (Nielsen), WCAG 2.1, e-MAG, Lei nº 13.709/2018 (LGPD), Lei Complementar nº 128/2008 (MEI) e o **ODS 8 — Trabalho decente e crescimento econômico**. As referências completas estão no artigo do TCC.

---

**Ambulante Conecta — Formalize. Organize. Cresça.**
