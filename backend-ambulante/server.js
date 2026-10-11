require('dotenv').config(); // carrega o .env antes de qualquer outra coisa
const express = require('express');
const cors = require('cors');
const listEndpoints = require('express-list-endpoints');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Banco de dados: conexão única, definida em src/config/database.js (credenciais no .env)
const pool = require('./src/config/database');

// 2. Middlewares
// CORS: só as origens do front. Para liberar outra (ex.: GitHub Pages), use CORS_ORIGINS no .env, separadas por vírgula.
const origens = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()) : [])
];
app.use(cors({ origin: origens }));
app.use(express.json({ limit: '100kb' })); // transforma o corpo JSON em req.body (precisa vir antes das rotas)

// 3. Rotas
const { getSolicitacoesComDetalhes } = require('./src/controllers/solicitacaoController');
const { autenticar, exigirPerfil } = require('./src/middlewares/auth');

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do Ambulante Conecta rodando com sucesso!' });
});
app.get('/api/solicitacoes', autenticar, exigirPerfil('gestor'), getSolicitacoesComDetalhes);
app.use('/api', require('./src/routes')(pool)); // cadastro, pontos e criação de solicitações

// 4. Rota inexistente e tratamento de erros (sempre respondem em JSON)
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo da requisição grande demais.' });
  console.error('Erro não tratado:', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// 5. Iniciar o servidor e exibir a tabela de rotas automaticamente
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // Exibe a tabela automática no terminal assim que o servidor arranca
  console.log("\n📌 TABELA AUTOMÁTICA DE ROTAS DA API:");
  console.table(listEndpoints(app));
});