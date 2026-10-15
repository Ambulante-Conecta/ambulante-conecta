# API do Ambulante Conecta

Back-end em Node.js, Express e PostgreSQL com PostGIS. Base: `http://localhost:3000/api`.
Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>` (token do login, válido por 8 horas).

## Como rodar

1. `cd backend-ambulante` e `npm install`
2. Copie `.env.example` para `.env` e preencha as variáveis (`DB_*` e `JWT_SECRET`)
3. Banco: execute `database/schema.sql` e depois `database/seed.sql`
4. Crie o gestor de teste: `node scripts/criar-gestor.js <CPF válido>`
5. `npm start`
6. Testes: defina `TESTE_GESTOR_CPF` e `TESTE_GESTOR_SENHA` e rode `npm test`

## Rotas

# 📋 Inventário de Rotas da API — Ambulante Conecta

| # | Método | Caminho da Rota | Autenticação | Campos do Corpo (Body JSON) | Respostas Principais |
|---|:---:|:---|:---|:---|:---|
| 1 | `GET` | `/` | Pública | Nenhum | `200` (Servidor no ar) |
| 2 | `POST` | `/api/ambulantes` | Pública | `nome_completo`, `cpf`, `data_nascimento`, `telefone`, `tipo_atividade`, `possui_mei`, `cnpj_mei`, `local_pretendido`, `turno` (Manhã, Tarde, Noite ou Dia todo), `senha`, `consentimento` | `201` (Criado), `400` (Erro validação/LGPD), `409` (CPF duplicado) |
| 3 | `POST` | `/api/auth/login` | Pública | `cpf`, `senha` | `200` (Retorna token JWT), `401` (Credenciais inválidas) |
| 4 | `GET` | `/api/auth/me` | Bearer Token | Nenhum | `200` (Dados do usuário logado), `401` (Sem token) |
| 5 | `GET` | `/api/pontos` | Pública | Nenhum *(Filtros query: `?status=disponivel`, `?bairro=Centro`)* | `200` (Lista pontos em GeoJSON) |
| 6 | `POST` | `/api/solicitacoes` | Bearer (Ambulante) | `ponto_id` | `201` (Criada), `403` (Gestor não solicita), `422` (Sem MEI), `409` (Ocupado) |
| 7 | `GET` | `/api/solicitacoes/minhas` | Bearer (Ambulante) | Nenhum | `200` (Lista pedidos do ambulante), `403` (Gestor bloqueado) |
| 8 | `GET` | `/api/solicitacoes` | Bearer (Gestor) | Nenhum *(Filtro query: `?status=Pendente`)* | `200` (Lista todas do sistema), `403` (Ambulante bloqueado) |
| 9 | `PATCH` | `/api/solicitacoes/:id` | Bearer (Gestor) | `status` ("Aprovada"/"Recusada"), `justificativa` *(se recusado)* | `200` (Avaliado), `400` (Sem justificativa), `409` (Já avaliado) |
| 10 | `POST` | `/api/mensagens` | Bearer Token | `assunto`, `texto`, `ambulante_id` *(opcional, se gestor responder)* | `201` (Enviada), `400` (Falta dados), `401` (Sem login) |
| 11 | `GET` | `/api/mensagens` | Bearer Token | Nenhum *(Query opcional para gestor: `?ambulante_id=X`)* | `200` (Lista conversa), `401` (Sem login) |
| 12 | `GET` | `/api/mensagens/conversas` | Bearer (Gestor) | Nenhum | `200` (Lista todas conversas), `403` (Ambulante bloqueado) |
| 13 | `GET` | `/api/mensagens/nao-lidas` | Bearer Token | Nenhum | `200` (Retorna total não lidas) |
| 14 | `PATCH` | `/api/mensagens/:id/lida` | Bearer Token | Nenhum | `200` (Marca mensagem como lida), `404` (Não encontrada) |
| 15 | `PATCH` | `/api/mensagens/lidas` | Bearer (Gestor) | `ambulante_id` | `200` (Marca conversas de um ambulante como lidas) |
| 16 | `GET` | `/api/painel` | Bearer (Gestor) | Nenhum | `200` (Métricas do painel administrativo), `403` (Bloqueado) |
| 17 | `GET` | `/api/ambulantes/me` | Bearer (Ambulante) | Nenhum | `200` (`id`, `nome_completo`, `possui_mei`, `cnpj_mei`, `turno`; sem CPF), `403` (Gestor bloqueado) |
| 18 | `PATCH` | `/api/ambulantes/me` | Bearer (Ambulante) | `cnpj_mei` (com ou sem máscara) | `200` (`possui_mei` passa a `true`), `400` (CNPJ inválido, em `campos.cnpj_mei`), `403` (Gestor bloqueado) |
| 19 | `POST` | `/api/auth/recuperar-senha/verificar` | Pública | `cpf`, `data_nascimento`, `meio` ("celular" ou "email"), `contato` | `200` (`token` de recuperação, vale 10 min), `400` (campos), `401` (dados não conferem; mensagem única), `429` (5 tentativas a cada 15 min) |
| 20 | `POST` | `/api/auth/recuperar-senha/nova` | Token de recuperação | `token`, `nova_senha` | `200` (senha trocada, sessões antigas encerradas, aviso em Mensagens), `400` (senha fraca), `401` (token vencido ou já usado) |
## Códigos de resposta

`200` ou `201` sucesso · `400` dados inválidos (a lista `campos` indica o campo) · `401` sem login ou sessão expirada ·
`403` perfil sem permissão · `404` não encontrado · `409` conflito (CPF repetido, ponto indisponível, solicitação já avaliada) ·
`422` regra de negócio (sem MEI) · `429` muitas tentativas · `500` erro interno.

## Regras de negócio no código

| Regra | Onde |
|---|---|
| RN01 solicitar exige login de ambulante | `POST /solicitacoes` usa o ambulante do token |
| RN02 só quem tem MEI com CNPJ válido solicita | cadastro e `PATCH /ambulantes/me` validam o CNPJ (módulo 11); solicitação confere `possui_mei` e `cnpj_mei` |
| RN03 a solicitação nasce Pendente | `POST /solicitacoes` |
| RN04 recusa exige justificativa | `PATCH /solicitacoes/:id` |
| RN05 concorrência de pontos: aprovar um pedido recusa os outros pendentes do mesmo ponto | `PATCH /solicitacoes/:id` (transação com `FOR UPDATE`; justificativa "Ponto concedido a outro solicitante." e aviso em Mensagens) |
| RN06 o painel de gestão é exclusivo do perfil gestor | `exigirPerfil("gestor")` em `GET /painel`, `GET /solicitacoes`, `PATCH /solicitacoes/:id` e `GET /mensagens/conversas` |

**RNF05 (LGPD), no código:** consentimento registrado em `ambulantes.consentimento_em`, senhas com hash bcrypt, CPF mascarado em `GET /solicitacoes` e só números agregados em `GET /painel`.

## Segurança

Senha com hash bcrypt, consultas parametrizadas, CORS restrito, limite de tentativas no login e nas mensagens,
token JWT com validade, CPF nunca devolvido por completo, credenciais fora do código (`.env`).

## Testes automatizados

`testar-api.js` (cadastro, login, permissões, solicitação), `testar-avaliacao.js` (aprovação e recusa),
`testar-mensagens.js` (conversas e isolamento), `testar-painel.js` (painel agregado), `testar-formalizacao.js`
(MEI pela Formalização: 422 antes, 201 depois), `testar-recuperacao.js` (recuperação de senha) e `testar-tudo.js`
(roda todos e salva o relatório em `resultados-testes/`).

