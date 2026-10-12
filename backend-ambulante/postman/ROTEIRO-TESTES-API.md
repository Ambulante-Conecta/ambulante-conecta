# Roteiro de testes manuais da API (96 requisições)

Back-end do Ambulante Conecta. Cada requisição traz o resultado esperado. Use na ordem, de 00 a 09.

## Antes de começar

1. Servidor ligado (`npm start` em `backend-ambulante`) e banco limpo (`npm run demo`).
2. Ambiente com as variáveis: `url` (http://localhost:3000), `senha` (Teste@12345), `gestorCpf`, `gestorSenha` e `demoSenha` (esta é a senha impressa pelo `npm run demo`). **Não versione as senhas.**
3. As variáveis `tokenA`, `tokenB`, `tokenC`, `tokenG`, `tokenJ`, `tokenM` e os ids são preenchidos pelas próprias requisições (coluna *Guardar*).
4. Para as rotas protegidas: aba **Auth**, tipo **Bearer**, valor `{{tokenX}}` (a letra indicada na coluna *Token*).

**Legenda de *Token*:** A, B e C = ambulantes de teste; G = gestor; J e M = João e Maria da demonstração; — = rota pública.


## 00 Preparação

Confirma que o servidor está no ar.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 00.01 | GET `/` | — | — | **200**: Mensagem 'API do Ambulante Conecta rodando com sucesso!' | — |

## 01 Cadastro (RF01)

Rode `npm run demo` antes: o banco precisa estar limpo para o 201.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 01.01 | POST `/api/ambulantes` | — | CPF 296.422.158-88, MEI sim | **201**: { id, nome_completo }, sem CPF | `idA` ← `json.id` |
| 01.02 | POST `/api/ambulantes` | — | mesmo corpo do 01.01 | **409**: 'CPF já cadastrado.' | — |
| 01.03 | POST `/api/ambulantes` | — | CPF 111.111.111-11 | **400**: campos.cpf = 'CPF inválido.' | — |
| 01.04 | POST `/api/ambulantes` | — | senha vazia | **400**: campos.senha | — |
| 01.05 | POST `/api/ambulantes` | — | senha 'somenteletras' | **400**: campos.senha | — |
| 01.06 | POST `/api/ambulantes` | — | consentimento false | **400**: campos.consentimento (RN05) | — |
| 01.07 | POST `/api/ambulantes` | — | nascimento 2015-01-01 | **400**: campos.data_nascimento | — |
| 01.08 | POST `/api/ambulantes` | — | nascimento 11111-05-10 | **400**: campos.data_nascimento | — |
| 01.09 | POST `/api/ambulantes` | — | possui_mei true, cnpj null | **400**: campos.cnpj_mei | — |
| 01.10 | POST `/api/ambulantes` | — | CPF 461.991.563-74, MEI sim | **201**: { id, nome_completo } | `idB` ← `json.id` |
| 01.11 | POST `/api/ambulantes` | — | CPF 996.179.073-13, MEI não | **201**: { id, nome_completo } | `idC` ← `json.id` |

## 02 Autenticação

Limite: 20 tentativas de login a cada 15 minutos (reinicie o servidor para zerar).

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 02.01 | POST `/api/auth/login` | — | senha errada | **401**: 'CPF ou senha incorretos.' | — |
| 02.02 | POST `/api/auth/login` | — | CPF sem conta | **401**: Mesma mensagem do 02.01 (não revela se o CPF existe) | — |
| 02.03 | POST `/api/auth/login` | — | CPF com 3 dígitos | **400**: 'Informe CPF e senha.' | — |
| 02.04 | POST `/api/auth/login` | — | — | **200**: { token, usuario { perfil: 'ambulante' } } | `tokenA` ← `json.token` |
| 02.05 | POST `/api/auth/login` | — | — | **200**: { token, usuario } | `tokenB` ← `json.token` |
| 02.06 | POST `/api/auth/login` | — | — | **200**: { token, usuario } | `tokenC` ← `json.token` |
| 02.07 | POST `/api/auth/login` | — | — | **200**: { token, usuario { perfil: 'gestor' } } | `tokenG` ← `json.token` |
| 02.08 | GET `/api/auth/me` | — | — | **401**: 'Faça login para continuar.' | — |
| 02.09 | GET `/api/auth/me` | A | — | **200**: { id, perfil: 'ambulante', ambulante_id, nome } | — |
| 02.10 | GET `/api/auth/me` | A (+x) | token com 'x' no fim | **401**: 'Sessão inválida. Entre novamente.' | — |

## 03 Pontos de venda (RF03)

Rode `npm run demo` antes: os pontos 3 e 4 viram o 2º e o 3º disponíveis.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 03.01 | GET `/api/pontos` | — | — | **200**: GeoJSON FeatureCollection (features com geometry e properties id, descricao_local, bairro, status) | — |
| 03.02 | GET `/api/pontos?status=disponivel` | — | ?status=disponivel | **200**: Só status 'disponível'. Guarda o 2º e o 3º ponto | `pontoId` ← `json.features[1].properties.id`; `pontoId2` ← `json.features[2].properties.id` |
| 03.03 | GET `/api/pontos?status=ocupado` | — | ?status=ocupado | **200**: Só status 'ocupado' | — |
| 03.04 | GET `/api/pontos?bairro=Centro` | — | ?bairro=Centro | **200**: Pontos do Centro | — |
| 03.05 | GET `/api/pontos?status=123` | — | ?status=123 | **400**: 'status inválido...' | — |
| 03.06 | GET `/api/pontos?bairro=Centro' OR '1'='1` | — | bairro com aspas | **200**: features vazio: o texto é tratado como dado, não como comando | — |

## 04 Solicitações do ambulante (RF04)

Cobre RN01, RN02 e RN03.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 04.01 | POST `/api/solicitacoes` | — | — | **401**: 'Faça login para continuar.' | — |
| 04.02 | POST `/api/solicitacoes` | G | — | **403**: 'Você não tem permissão para esta ação.' | — |
| 04.03 | POST `/api/solicitacoes` | C | token do C | **422**: 'É necessário ter MEI ativo...' | — |
| 04.04 | POST `/api/solicitacoes` | A | corpo vazio | **400**: 'Informe um ponto_id válido.' | — |
| 04.05 | POST `/api/solicitacoes` | A | ponto_id 99999999 | **404**: 'Ponto de venda não encontrado.' | — |
| 04.06 | POST `/api/solicitacoes` | A | — | **201**: status 'Pendente' | `solId` ← `json.id` |
| 04.07 | POST `/api/solicitacoes` | A | — | **409**: 'Você já tem uma solicitação pendente...' | — |
| 04.08 | POST `/api/solicitacoes` | B | — | **201**: status 'Pendente' (dois pedidos no mesmo ponto) | `solId2` ← `json.id` |
| 04.09 | POST `/api/solicitacoes` | B | — | **201**: status 'Pendente' | `solId3` ← `json.id` |
| 04.10 | GET `/api/solicitacoes/minhas` | A | — | **200**: Lista só as de A, com ponto e bairro | — |
| 04.11 | GET `/api/solicitacoes/minhas` | G | — | **403**: Sem permissão | — |
| 04.12 | GET `/api/mensagens` | A | — | **200**: Mensagem do sistema 'Solicitação recebida' | — |

## 05 Avaliação pelo gestor (RF06)

Cobre RN04 e RN06. A aprovação ocupa o ponto e recusa os outros pedidos pendentes dele.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 05.01 | GET `/api/solicitacoes` | — | — | **401**: Exige login | — |
| 05.02 | GET `/api/solicitacoes` | A | — | **403**: Só o gestor lista | — |
| 05.03 | GET `/api/solicitacoes` | G | — | **200**: Lista com CPF mascarado (***.xxx.xxx-**) | — |
| 05.04 | GET `/api/solicitacoes?status=Pendente` | G | ?status=Pendente | **200**: Só as pendentes | — |
| 05.05 | GET `/api/solicitacoes?status=Xyz` | G | ?status=Xyz | **400**: 'status deve ser Pendente, Aprovada ou Recusada.' | — |
| 05.06 | PATCH `/api/solicitacoes/{{solId}}` | A | — | **403**: Sem permissão | — |
| 05.07 | PATCH `/api/solicitacoes/{{solId3}}` | G | — | **400**: 'status deve ser Aprovada ou Recusada.' | — |
| 05.08 | PATCH `/api/solicitacoes/{{solId3}}` | G | — | **400**: 'Informe a justificativa da recusa...' | — |
| 05.09 | PATCH `/api/solicitacoes/99999999` | G | — | **404**: 'Solicitação não encontrada.' | — |
| 05.10 | PATCH `/api/solicitacoes/{{solId3}}` | G | — | **200**: status 'Recusada' com justificativa | — |
| 05.11 | PATCH `/api/solicitacoes/{{solId}}` | G | — | **200**: status 'Aprovada'; ponto vira ocupado; o pedido de B no mesmo ponto é recusado | — |
| 05.12 | PATCH `/api/solicitacoes/{{solId}}` | G | — | **409**: 'Esta solicitação já foi avaliada.' | — |
| 05.13 | GET `/api/solicitacoes/minhas` | B | — | **200**: Duas 'Recusada': 'Ponto concedido a outro solicitante.' e a justificativa do gestor | — |
| 05.14 | GET `/api/pontos?status=ocupado` | — | ?status=ocupado | **200**: O ponto aprovado aparece entre os ocupados | — |
| 05.15 | POST `/api/solicitacoes` | B | — | **409**: 'Este ponto não está disponível.' | — |

## 06 Mensagens (RF05)

Cada conversa pertence a um ambulante.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 06.01 | POST `/api/mensagens` | — | — | **401**: Exige login | — |
| 06.02 | POST `/api/mensagens` | A | — | **400**: campos.assunto | — |
| 06.03 | POST `/api/mensagens` | A | — | **400**: campos.texto | — |
| 06.04 | POST `/api/mensagens` | A | — | **201**: remetente 'ambulante', lida false | `msgId` ← `json.id` |
| 06.05 | GET `/api/mensagens/conversas` | A | — | **403**: Só o gestor | — |
| 06.06 | GET `/api/mensagens/conversas` | G | — | **200**: Conversa de A com nao_lidas >= 1 | — |
| 06.07 | GET `/api/mensagens` | G | — | **400**: 'Informe o ambulante_id da conversa.' | — |
| 06.08 | GET `/api/mensagens?ambulante_id={{idA}}` | G | ?ambulante_id={{idA}} | **200**: Mensagem do 06.04 e avisos do sistema | — |
| 06.09 | GET `/api/mensagens/nao-lidas` | G | — | **200**: { total >= 1 } | — |
| 06.10 | POST `/api/mensagens` | G | — | **400**: 'Informe o ambulante_id...' | — |
| 06.11 | POST `/api/mensagens` | G | — | **404**: 'Ambulante não encontrado.' | — |
| 06.12 | POST `/api/mensagens` | G | — | **201**: remetente 'gestor' | `respId` ← `json.id` |
| 06.13 | GET `/api/mensagens/nao-lidas` | A | — | **200**: { total >= 1 } | — |
| 06.14 | GET `/api/mensagens` | A | — | **200**: Resposta do gestor em primeiro lugar, mais os avisos do sistema | — |
| 06.15 | PATCH `/api/mensagens/{{msgId}}/lida` | A | — | **404**: Só marca as recebidas | — |
| 06.16 | PATCH `/api/mensagens/{{respId}}/lida` | A | — | **200**: { id, lida: true } | — |
| 06.17 | PATCH `/api/mensagens/lidas` | G | — | **200**: { atualizadas: 1 } | — |
| 06.18 | GET `/api/mensagens` | C | — | **200**: Lista vazia [] | — |
| 06.19 | PATCH `/api/mensagens/{{respId}}/lida` | C | — | **404**: Isolamento entre ambulantes | — |

## 07 Painel do gestor (RF07)

Números agregados, sem dados pessoais (RN06).

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 07.01 | GET `/api/painel` | — | — | **401**: Exige login | — |
| 07.02 | GET `/api/painel` | A | — | **403**: Só o gestor | — |
| 07.03 | GET `/api/painel` | G | — | **200**: ambulantes, pontos, solicitacoes, mensagens_nao_lidas, por_atividade, por_bairro (sem cpf, nome ou telefone) | — |

## 08 Segurança e erros

Bom para mostrar à banca como a API se defende.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 08.01 | GET `/api/rota-que-nao-existe` | — | — | **404**: 'Rota não encontrada.' | — |
| 08.02 | POST `/api/ambulantes` | — | corpo de texto: {"cpf":  | **400**: 'JSON inválido no corpo da requisição.' | — |
| 08.03 | POST `/api/auth/login` | — | cpf com aspas | **400**: 'Informe CPF e senha.' (nada de SQL é executado) | — |

## 09 Demonstração ao vivo

Rode `npm run demo` e coloque a senha impressa em demoSenha. Roteiro de uns 5 minutos.

| Cód. | Requisição | Token | Detalhe | Esperado | Guardar |
|---|---|---|---|---|---|
| 09.01 | POST `/api/auth/login` | — | — | **200**: Token de João | `tokenJ` ← `json.token` |
| 09.02 | POST `/api/auth/login` | — | — | **200**: Token de Maria | `tokenM` ← `json.token` |
| 09.03 | POST `/api/auth/login` | — | — | **200**: Token do gestor | `tokenG` ← `json.token` |
| 09.04 | GET `/api/pontos?status=disponivel` | — | ?status=disponivel | **200**: GeoJSON dos pontos livres. Guarda o 2º | `pontoDemo` ← `json.features[1].properties.id` |
| 09.05 | POST `/api/solicitacoes` | M | — | **422**: Bloqueada por não ter MEI | — |
| 09.06 | POST `/api/solicitacoes` | J | — | **201**: status 'Pendente' | `solDemo` ← `json.id` |
| 09.07 | GET `/api/solicitacoes?status=Pendente` | G | ?status=Pendente | **200**: Duas pendentes (Ana e João), CPF mascarado | — |
| 09.08 | PATCH `/api/solicitacoes/{{solDemo}}` | G | — | **400**: Justificativa obrigatória | — |
| 09.09 | PATCH `/api/solicitacoes/{{solDemo}}` | G | — | **200**: status 'Aprovada' | — |
| 09.10 | GET `/api/solicitacoes/minhas` | J | — | **200**: Solicitação 'Aprovada' | — |
| 09.11 | GET `/api/mensagens` | J | — | **200**: 'Solicitação recebida' e 'Solicitação aprovada' | — |
| 09.12 | GET `/api/pontos?status=ocupado` | — | ?status=ocupado | **200**: O ponto aprovado agora está ocupado | — |
| 09.13 | GET `/api/painel` | G | — | **200**: Números atualizados | — |
| 09.14 | GET `/api/painel` | M | — | **403**: Sem permissão | — |
| 09.15 | GET `/api/mensagens/conversas` | G | — | **200**: Maria com 1 não lida. Guarda o ambulante | `idM` ← `json[0].ambulante_id` |
| 09.16 | POST `/api/mensagens` | G | — | **201**: remetente 'gestor' | — |

## Corpos-modelo

**Cadastro (POST /api/ambulantes)**
```json
{
  "nome_completo": "Ana Teste Mensagens",
  "cpf": "296.422.158-88",
  "data_nascimento": "1990-05-10",
  "telefone": "92912345678",
  "tipo_atividade": "Alimentação",
  "possui_mei": true,
  "cnpj_mei": "11.222.333/0001-81",
  "local_pretendido": "Centro",
  "senha": "{{senha}}",
  "consentimento": true
}
```

**Login (POST /api/auth/login)**
```json
{ "cpf": "296.422.158-88", "senha": "{{senha}}" }
```

**Solicitação (POST /api/solicitacoes)** `{ "ponto_id": 3 }`

**Avaliação (PATCH /api/solicitacoes/:id)** `{ "status": "Aprovada" }` ou `{ "status": "Recusada", "justificativa": "..." }`

**Mensagem (POST /api/mensagens)** `{ "assunto": "...", "texto": "..." }` (o gestor acrescenta `ambulante_id`)


## Ensaios opcionais

- **Limite de tentativas:** 21 logins errados seguidos devolvem 429. Faça só no ensaio e reinicie o servidor depois.
- **Expiração do token:** com `JWT_EXPIRA_EM=30s` no `.env`, espere 30 segundos e chame `GET /api/auth/me`: 401 'Sessão expirada. Entre novamente.'
- **CORS:** só vale no navegador. O Thunder Client não é bloqueado; o site só funciona pelo Live Server (porta 5500).