# 🤝 Guia de Contribuição

O Ambulante Conecta é desenvolvido em dupla. Este guia reúne as combinações para os dois trabalharem no mesmo repositório sem atrapalhar o site publicado.

## Antes de começar

```bash
git config --global pull.rebase true   # uma vez só: evita commits de merge
git pull                               # sempre, antes de mexer em qualquer coisa
```

- Cada um tem o próprio `.env`, banco local e `JWT_SECRET`. Copie de `backend-ambulante/.env.example`.
- No `.env` de desenvolvimento, use `LOGIN_LIMITE=200` (o `npm test` faz uns 16 logins por execução).
- Rode `npm install` **somente** dentro de `backend-ambulante`.
- Um Live Server por vez: a API só aceita o front na porta 5500.

## Branches e pull requests

> ⚠️ **Todo push na `main` publica o site** (GitHub Actions) e, se mexer no back-end, a API no Render.

1. Crie uma branch a partir da `main` atualizada:
   - `feature/...` para funcionalidade nova
   - `fix/...` para correção
   - `docs/...` para documentação
2. Faça commits pequenos e envie a branch: `git push -u origin nome-da-branch`.
3. Abra um Pull Request e peça a revisão do colega.
4. Depois do merge, apague a branch.

Correções pequenas e urgentes podem ir direto na `main`, desde que testadas localmente.

## Mensagens de commit

Use um prefixo e escreva em português, no presente:

| Prefixo | Quando usar | Exemplo |
|---|---|---|
| `feat:` | funcionalidade nova | `feat: filtro por bairro no mapa` |
| `fix:` | correção de defeito | `fix: legenda da tabela do painel` |
| `docs:` | README, `api.md`, `CLAUDE.md` | `docs: README no modelo da orientadora` |
| `style:` | só visual ou formatação | `style: espaçamento dos cartões` |
| `refactor:` | reorganização sem mudar o comportamento | `refactor: extrai validação de CNPJ` |
| `test:` | roteiros de teste | `test: recusa sem justificativa` |
| `chore:` | configuração e arquivos de apoio | `chore: .editorconfig` |

## Padrões de código

- **Formatação:** UTF-8, fim de linha LF, 2 espaços de indentação, sem espaços no fim da linha (o `.editorconfig` e o `.gitattributes` cuidam disso).
- **Nomes de arquivos e pastas:** minúsculas, sem acento nem espaço, palavras separadas por hífen (`recuperar-senha.html`) ou juntas, como já existe (`situacao.js`).
- **Código completo:** nada de trechos omitidos ou `// TODO` no lugar de código.
- **Front-end:** antes de criar uma tela, leia `frontend/situacao.html` e `frontend/js/situacao.js` e siga o mesmo padrão. Reutilize as classes de `css/style.css` e as funções de `js/api.js` e `js/app.js`.
- **Dados da API na tela:** sempre com `escHtml()` ou `textContent`, nunca HTML cru.
- **Responsivo:** confira em 360, 390, 768 e 1024 px. No celular, tabelas viram cartões.
- **Regras de negócio:** a numeração (RN01 a RN06, RNF01 a RNF06) segue a Tabela 4 do artigo. Não renumere sem combinar com o artigo.

## Testes

Antes de mexer em rota ou regra, e de novo antes do push:

```bash
cd backend-ambulante
npm start            # em um terminal
npm test             # em outro, com TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA definidos
```

A suíte precisa continuar verde. Desligue a API depois (no Windows, confira se a porta 3000 ficou livre).

## Banco de dados

- Mudança na estrutura vira uma migração nova e numerada em `database/migracoes/` (`006_descricao.sql`), que pode rodar mais de uma vez sem erro (`IF NOT EXISTS`).
- Atualize também `database/schema.sql`.
- No banco publicado (Neon), rode `scripts/preparar-banco-publicado.js` **antes** do push que depende da migração.

## Segurança

- Nunca versione, copie ou mostre o conteúdo do `.env`.
- Nunca compartilhe a `DATABASE_URL` do Neon nem segredos do Render em grupos de mensagens.
- Se algum segredo vazar, troque `JWT_SECRET` e a senha do banco na hora.

## Depois de concluir um item

Marque `[x]` no plano do `CLAUDE.md` e atualize a "Situação atual" no mesmo commit, para o colega saber.
