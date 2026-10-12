require('dotenv').config();
const { Pool } = require('pg');

// Duas formas de configurar (as credenciais ficam sempre no .env ou nas variáveis do serviço de hospedagem):
// 1. Publicado (Neon): DATABASE_URL com a string de conexão completa. O Neon exige SSL, que já vem na URL (sslmode=require).
// 2. Local: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME.
let config;
if (process.env.DATABASE_URL) {
  config = { connectionString: process.env.DATABASE_URL, max: 5 };
} else {
  if (!process.env.DB_PASSWORD) {
    console.error('Defina DATABASE_URL ou DB_PASSWORD no arquivo .env');
    process.exit(1);
  }
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME || 'ambulante_conecta'
  };
}

const pool = new Pool(config);

pool.on('error', (e) => console.error('Erro inesperado no pool do banco:', e.message));

module.exports = pool;
