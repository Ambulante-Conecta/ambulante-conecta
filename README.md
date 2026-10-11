# 🛒 Ambulante Conecta

**Sistema web para apoiar a formalização, a organização e a comunicação de trabalhadores ambulantes em Manaus/AM.**

O **Ambulante Conecta** é um projeto de Trabalho de Conclusão de Curso (TCC) do curso de **Análise e Desenvolvimento de Sistemas do Centro Universitário CEUNI FAMETRO**. A aplicação reúne funcionalidades para cadastro de ambulantes, orientação sobre formalização, consulta e solicitação de pontos de venda, acompanhamento de solicitações e comunicação entre ambulantes e gestores públicos.

> **Status do projeto:** funcionalidades descritas neste README implementadas e testadas, incluindo testes automatizados e testes manuais da API.

---

## 📌 Sumário

- [Contexto e objetivo](#-contexto-e-objetivo)
- [Funcionalidades](#-funcionalidades)
- [Requisitos funcionais e regras de negócio](#-requisitos-funcionais-e-regras-de-negócio)
- [Diferenciais do back-end](#-diferenciais-do-back-end)
- [Segurança e LGPD](#-segurança-e-lgpd)
- [Tecnologias utilizadas](#-tecnologias-utilizadas)
- [Arquitetura](#-arquitetura)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como executar](#-como-executar-o-projeto)
- [API e autenticação](#-api-e-autenticação)
- [Testes](#-testes-e-validação)
- [Interface, IHC e acessibilidade](#-interface-ihc-e-acessibilidade)
- [Autores](#-autores)

---

## 🎯 Contexto e objetivo

Os trabalhadores ambulantes podem encontrar dificuldades para reunir informações sobre o registro como Microempreendedor Individual (MEI), a licença municipal e os locais autorizados para exercer suas atividades. Essas informações e procedimentos podem estar distribuídos em canais diferentes.

O Ambulante Conecta propõe centralizar os principais fluxos em um único sistema, com uma interface responsiva e serviços de back-end responsáveis por validar dados, aplicar regras de negócio, persistir informações e controlar o acesso às funcionalidades.

### Objetivo geral

Apoiar a formalização e a organização dos trabalhadores ambulantes de Manaus, integrando orientação sobre formalização, gestão de pontos de venda e comunicação com os responsáveis pela análise das solicitações.

---

## ✨ Funcionalidades

### 👤 Cadastro de ambulantes — RF01

- Cadastro de dados pessoais e da atividade comercial.
- Validação de CPF e CNPJ por seus dígitos verificadores.
- Verificação de idade mínima de 18 anos.
- Validação dos requisitos de força da senha.
- Criação do cadastro do ambulante e do respectivo usuário de acesso dentro de uma transação.
- Registro do consentimento e da data correspondente.

### 🔐 Autenticação e perfis

- Login utilizando CPF e senha.
- Autenticação baseada em token JWT.
- Consulta dos dados do usuário autenticado.
- Perfis de acesso: **ambulante** e **gestor**.
- Controle de permissões por perfil, com resposta `403 Forbidden` para acessos não autorizados.

### 📍 Pontos de venda — RF03

- Consulta dos pontos de venda cadastrados.
- Retorno dos dados geográficos em formato GeoJSON.
- Armazenamento das coordenadas como geometrias espaciais no PostGIS.
- Filtros por status e bairro, conforme disponibilizado pela API.
- Suporte à apresentação dos pontos em mapa no front-end.

### 📝 Solicitação de ponto — RF04

- Envio de solicitação por usuário autenticado.
- Exigência de CNPJ/MEI para solicitar um ponto.
- Criação da solicitação com status inicial **Pendente**.
- Bloqueio de solicitação duplicada para o mesmo caso, conforme as regras implementadas.
- Associação da solicitação ao ambulante e ao ponto pretendido.

### ⚖️ Avaliação pelo gestor — RF06

- Aprovação ou recusa de solicitações.
- Justificativa obrigatória quando uma solicitação é recusada.
- Controle de acesso para que somente um gestor autorizado execute a avaliação.
- Atualização consistente do status e comunicação do resultado aos envolvidos.

### 💬 Comunicação — RF05

- Envio e resposta de mensagens.
- Caixa de entrada.
- Consulta de mensagens não lidas.
- Marcação de mensagens como lidas.
- Comunicação entre ambulante e gestor.

### 📊 Painel do gestor — RF07

- Visualização de totais agregados por status, atividade e bairro.
- Apoio à análise das solicitações e à organização dos pontos de venda.
- Apresentação de informações consolidadas sem expor dados pessoais desnecessários.

---

## 📋 Requisitos funcionais e regras de negócio

| Requisito | Implementação |
|---|---|
| **RF01 — Cadastro** | Validação de dados, senha forte e criação do ambulante e usuário em uma única transação. |
| **RF03 — Pontos de venda** | Consulta de pontos georreferenciados, retorno GeoJSON e filtros. |
| **RF04 — Solicitação de ponto** | Autenticação obrigatória, CNPJ/MEI, status inicial Pendente e prevenção de duplicidades. |
| **RF05 — Comunicação** | Envio, resposta, caixa de entrada, consulta de não lidas e marcação de leitura. |
| **RF06 — Avaliação** | Aprovação ou recusa pelo gestor, com justificativa obrigatória para recusa. |
| **RF07 — Painel do gestor** | Indicadores agregados por status, atividade e bairro. |

### Regras de negócio destacadas

- **RN01:** somente usuário autenticado pode enviar uma solicitação de ponto.
- **RN02:** para solicitar um ponto, o ambulante deve possuir CNPJ/MEI conforme a regra do sistema.
- **RN03:** uma solicitação nova começa com status **Pendente**.
- **RN04:** uma recusa exige justificativa.
- **RN05:** o consentimento é registrado com a data correspondente.

---

## 🚀 Diferenciais do back-end

O back-end implementa regras de negócio do sistema, além das funções de autenticação.

### 🗺️ Banco de dados geoespacial

O PostgreSQL com PostGIS armazena pontos como geometrias `Point`, utilizando o sistema de referência espacial **SRID 4326**. A API pode retornar essas informações em GeoJSON para apresentação no mapa do front-end.

### 🔒 Decisão transacional e concorrência

No fluxo de aprovação, a aplicação trata a mudança de status do ponto e das solicitações concorrentes dentro de uma transação, com bloqueio das linhas envolvidas. A regra busca evitar que duas avaliações simultâneas aprovem solicitações incompatíveis para o mesmo ponto. As solicitações afetadas e as notificações correspondentes são tratadas pelo fluxo implementado.

### 🧱 Integridade de dados

O banco utiliza recursos como:

- CPF único;
- chaves estrangeiras;
- restrições para os perfis permitidos;
- regras de integridade que relacionam o perfil ao cadastro correspondente.

### 🧩 Arquitetura em camadas

O código separa responsabilidades entre rotas, middlewares, controllers, validações e configuração de banco de dados. Essa organização facilita a manutenção e a evolução da API.

### 🧪 Testabilidade e reprodutibilidade

O repositório contém scripts de testes automatizados, documentação dos endpoints, estrutura SQL, dados iniciais e migrações numeradas do banco de dados.

---

## 🔐 Segurança e LGPD

A aplicação adota mecanismos de segurança relacionados à autenticação, autorização e proteção de dados:

- Senhas armazenadas em hash com **bcrypt**.
- JWT para autenticação das requisições protegidas.
- Verificação de perfil e permissões nos endpoints.
- CPF mascarado nas listagens destinadas ao gestor e não exposto nas respostas em que não é necessário.
- Consultas SQL parametrizadas para reduzir o risco de injeção de SQL.
- CORS restrito às origens configuradas.
- Limite de tentativas de login por meio de `express-rate-limit`.
- Credenciais e segredos configurados por variáveis de ambiente.
- Registro de consentimento com data.
- Restrições de integridade no banco de dados.

Como o sistema trata dados pessoais, sua operação e evolução devem observar a **Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD)**. Nunca publique credenciais reais, tokens ou o arquivo local `.env` no repositório.

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologias |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript puro (Vanilla JavaScript) |
| Comunicação com a API | Fetch API |
| Estilos responsivos | CSS, incluindo `responsivo.css` |
| Back-end | Node.js e Express.js |
| Autenticação | JSON Web Token (JWT) |
| Hash de senhas | bcrypt |
| Proteção contra tentativas excessivas de login | express-rate-limit |
| Banco de dados | PostgreSQL |
| Dados geográficos | PostGIS |
| Driver do PostgreSQL | `pg` |
| Mapa | Estrutura preparada para Leaflet ou Google Maps, conforme a integração configurada |
| Testes de API | Scripts automatizados em JavaScript e testes manuais com Thunder Client |
| Versionamento | Git e GitHub |
| Integração contínua/deploy | GitHub Actions, conforme configuração do workflow |

---

## 🧱 Arquitetura

De forma resumida, o fluxo de comunicação funciona assim:

```text
Navegador
   │
   ▼
Front-end HTML, CSS e JavaScript
   │  Fetch API + token JWT quando necessário
   ▼
API REST — Node.js + Express
   │
   ├── Rotas
   ├── Middlewares de autenticação e autorização
   ├── Controllers e regras de negócio
   ├── Validações
   │
   ▼
PostgreSQL + PostGIS
```

O front-end consome a API para cadastro, login, consulta de pontos, solicitação, avaliação e comunicação. As rotas protegidas verificam a autenticação e as permissões correspondentes antes de executar operações restritas.

---

## 📁 Estrutura do projeto

A estrutura principal do repositório está organizada da seguinte forma:

```text
definitivo/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── backend-ambulante/
│   ├── resultados-testes/
│   ├── scripts/
│   │   ├── criar-gestor.js
│   │   └── inserir-api-js.js
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   └── solicitacaoController.js
│   │   ├── middlewares/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── ambulantes.js
│   │   │   ├── auth.js
│   │   │   ├── avaliacoes.js
│   │   │   ├── index.js
│   │   │   ├── mensagens.js
│   │   │   ├── painel.js
│   │   │   ├── pontos.js
│   │   │   └── solicitacoes.js
│   │   └── utils/
│   │   │     └── validacoes.js
│   │   │── test-api.js
│   │    │── test-avaliacao.js
│   │    │── test-mensagens.js
│   │    │── test-painel.js
│   │    └── test-tudo.js
│   │   
│   ├── .env.example
│   ├── api.md
│   ├── package.json
│   └── server.js
│
├── database/
│   ├── migracoes/
│   │   ├── 001_cadastro.sql
│   │   ├── 002_auth_mensagens.sql
│   │   ├── 003_fk_avaliador.sql
│   │   └── migracao_cadastro.sql
│   ├── resetar_pontos.sql
│   ├── schema.sql
│   └── seed.sql
│
├── frontend/
│   ├── css/
│   │   ├── responsivo.css
│   │   └── style.css
│   ├── img/
│   │   └── logo.png
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   └── login.js
│   ├── cadastro.html
│   ├── comunicacao.html
│   ├── formalizacao.html
│   ├── index.html
│   ├── login.html
│   ├── mapa.html
│   └── situacao.html
│
├── .gitignore
└── README.md
```

> A árvore destaca os arquivos e diretórios principais. Arquivos auxiliares podem existir além dos representados. O `.env` local deve permanecer fora do Git; compartilhe apenas o `.env.example`, sem segredos.

---

## ▶️ Como executar o projeto

### 1. Pré-requisitos

- Node.js e npm instalados.
- PostgreSQL instalado e em execução.
- Extensão PostGIS habilitada no banco utilizado.
- Git para clonar o repositório.
- Navegador moderno para acessar o front-end.

### 2. Obter o código

Clone o repositório:

```bash
git clone <https://franksbjr4-eng.github.io/ambulante-conecta/>
cd definitivo
```


### 3. Configurar o back-end

```bash
cd backend-ambulante
npm install
```

Crie o arquivo local `.env` com base no `.env.example` e preencha as configurações necessárias para a conexão com o PostgreSQL, a porta da API e o segredo JWT. Use os nomes de variáveis definidos no arquivo de exemplo; não compartilhe os valores secretos.

Consulte `package.json` para identificar os scripts disponíveis de inicialização e teste.

### 4. Preparar o banco de dados

No PostgreSQL, crie/seleciona o banco de dados da aplicação e habilite o PostGIS. Aplique o esquema, os dados iniciais e as migrações conforme a organização e as instruções existentes no diretório `database/`.

> Execute cada script SQL de acordo com o estado do banco. Em uma instalação já preparada, não reaplique migrações ou scripts de inicialização sem conferir se já foram executados.

### 5. Iniciar a API e acessar o front-end

Inicie a API usando o comando de execução definido no `package.json`. Em seguida, sirva os arquivos da pasta `frontend/` usando o servidor estático configurado para o projeto ou outra opção local compatível com a configuração da aplicação.

Consulte `backend-ambulante/api.md` para os endpoints, parâmetros, respostas e requisitos de autenticação.

### 6. Conta de gestor

O projeto inclui um script auxiliar para criação de gestor. Utilize o procedimento previsto no repositório e configure a senha de forma segura. Não publique credenciais de teste ou de produção no README.

---

## 🔌 API e autenticação

A API utiliza rotas REST sob o prefixo `/api` para os recursos da aplicação e endpoints de autenticação.

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/auth/login` | Autenticar com CPF e senha e obter JWT. |
| `GET` | `/auth/me` | Consultar os dados do usuário autenticado. |
| `POST` | `/api/ambulantes` | Cadastrar ambulante e acesso. |
| `GET` | `/api/pontos` | Consultar pontos georreferenciados, com filtros suportados. |
| `POST` | `/api/solicitacoes` | Criar solicitação de ponto autenticada. |
| `PATCH` | `/api/solicitacoes/:id` | Avaliar uma solicitação conforme as permissões do gestor. |

O módulo de comunicação oferece rotas adicionais para envio, resposta, caixa de entrada, mensagens não lidas e marcação de leitura. O painel do gestor disponibiliza dados agregados.

A lista acima é resumida. Para consultar **todos os endpoints, parâmetros, cabeçalhos, exemplos de requisição e respostas**, veja [`backend-ambulante/api.md`](backend-ambulante/api.md).

### Fluxo principal de ponta a ponta

```text
Cadastro do ambulante
        │
        ▼
Login e obtenção de JWT
        │
        ▼
Consulta de pontos disponíveis
        │
        ▼
Solicitação de ponto
        │
        ▼
Avaliação pelo gestor
        │
        ├── Aprovação ──► atualização do ponto e das solicitações concorrentes
        │
        └── Recusa ─────► justificativa obrigatória
        │
        ▼
Comunicação do resultado aos envolvidos
```

---

## 🧪 Testes e validação

O projeto inclui testes automatizados dos fluxos da API, avaliação de solicitações, mensagens e painel, além de testes manuais feitos com o Thunder Client.

Os testes contemplam cenários de sucesso e erro, validações de entrada, regras de negócio e controle de permissões. Os resultados de execução ficam organizados em `backend-ambulante/resultados-testes/`.

Scripts presentes no projeto incluem, conforme a versão disponível no repositório:

- `testar-api.js`
- `testar-avaliacao.js`
- `testar-mensagens.js`
- `testar-painel.js`
- `testar-tudo.js`

Para reproduzir os testes, entre em `backend-ambulante/`, confira os comandos configurados em `package.json` e execute a suíte desejada com a API e o banco preparados.

As evidências dos testes ajudam a documentar a validação funcional e técnica do projeto no TCC.

---

## ♿ Interface, IHC e acessibilidade

A interface foi organizada para uso mobile-first, com navegação objetiva, componentes consistentes, formulários com validações e apresentação clara do status das solicitações.

O projeto considera as **10 Heurísticas de Usabilidade de Jakob Nielsen**, além das recomendações de acessibilidade WCAG e e-MAG:

1. **Visibilidade do status do sistema:** feedback sobre cadastro e solicitações.
2. **Correspondência com o mundo real:** linguagem simples e familiar.
3. **Controle e liberdade do usuário:** retorno e revisão das informações.
4. **Consistência e padrões:** componentes e comportamentos coerentes.
5. **Prevenção de erros:** validação de campos e regras antes das operações.
6. **Reconhecimento em vez de memorização:** instruções e informações visíveis.
7. **Flexibilidade e eficiência:** acesso direto às funções principais.
8. **Estética e design minimalista:** hierarquia visual e redução de distrações.
9. **Reconhecimento e recuperação de erros:** mensagens que explicam o problema e indicam como corrigi-lo.
10. **Ajuda e documentação:** orientação sobre MEI e licença municipal.

A avaliação contínua deve considerar contraste, legibilidade, navegação por teclado, leitores de tela, mensagens de validação e uso em diferentes larguras de tela.

---

## 🗺️ Relação com os objetivos do projeto

| Necessidade identificada | Resposta do sistema |
|---|---|
| Informações de formalização dispersas | Orientação sobre MEI e licença municipal. |
| Dificuldade em encontrar pontos de venda | Consulta geográfica dos pontos no mapa. |
| Falta de acompanhamento dos pedidos | Status de solicitação e avaliação pelo gestor. |
| Comunicação institucional fragmentada | Módulo de mensagens entre ambulante e gestor. |
| Informações difíceis de organizar para a gestão | Painel com indicadores agregados. |

---

## 👨‍💻 Autores

**Vagner Matheus Ramos Alves**  
**Frank dos Santos Bezerra Junior**

**Curso:** Análise e Desenvolvimento de Sistemas  
**Instituição:** Centro Universitário CEUNI FAMETRO  
**Orientadora:** Luana Leal

---

## 📚 Referências e contexto acadêmico

O projeto está relacionado às áreas de Engenharia de Software, Interação Humano-Computador (IHC), usabilidade e acessibilidade, proteção de dados pessoais e ao **Objetivo de Desenvolvimento Sustentável 8 (ODS 8) — Trabalho Decente e Crescimento Econômico**.

Referências utilizadas no desenvolvimento acadêmico incluem as heurísticas de Jakob Nielsen, WCAG, e-MAG, a Lei nº 13.709/2018 (LGPD) e as referências bibliográficas apresentadas no pré-projeto do TCC.

---

## 🏛️ Ambulante Conecta

**Formalize. Organize. Cresça.**

Tecnologia para apoiar os trabalhadores ambulantes e contribuir para uma atividade mais organizada em Manaus.
