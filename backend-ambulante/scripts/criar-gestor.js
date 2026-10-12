// Cria (ou redefine a senha de) um usuário gestor.
// Uso: node scripts/criar-gestor.js <CPF válido> [senha]
// Sem senha, gera uma aleatória e mostra uma única vez. Prefira isso: senha digitada no comando fica no histórico do terminal.
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");
const { soDigitos, cpfValido } = require("../src/utils/validacoes");

(async () => {
  const cpf = soDigitos(process.argv[2]);
  if (!cpfValido(cpf)) {
    console.error("Uso: node scripts/criar-gestor.js <CPF válido> [senha]");
    return pool.end();
  }
  let senha = process.argv[3];
  const gerada = !senha;
  if (gerada) senha = crypto.randomBytes(9).toString("base64url") + "a1";
  if (senha.length < 8 || senha.length > 72) {
    console.error("A senha deve ter de 8 a 72 caracteres.");
    return pool.end();
  }
  try {
    const hash = await bcrypt.hash(senha, 10);
    const r = await pool.query(
      `INSERT INTO usuarios (cpf, senha_hash, perfil) VALUES ($1, $2, 'gestor')
       ON CONFLICT (cpf) DO UPDATE SET senha_hash = EXCLUDED.senha_hash WHERE usuarios.perfil = 'gestor'`,
      [cpf, hash]
    );
    if (!r.rowCount) console.error("Este CPF já pertence a um ambulante. Use outro CPF para o gestor.");
    else console.log(`Gestor pronto. CPF: ${cpf}` + (gerada ? `\nSenha gerada (guarde, não será mostrada de novo): ${senha}` : ""));
  } catch (e) {
    console.error("Erro ao criar o gestor:", e.message);
  } finally {
    await pool.end();
  }
})();