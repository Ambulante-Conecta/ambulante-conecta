// Login (RN01) e dados do usuário logado
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { soDigitos } = require("../utils/validacoes");
const { autenticar, gerarToken } = require("../middlewares/auth");

// Hash falso: quando o CPF não existe, comparamos com ele para gastar o mesmo tempo
// e não revelar quais CPFs têm conta.
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-o-tempo", 10);

module.exports = (pool) => {
  const router = express.Router();

  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas tentativas de login. Tente novamente em alguns minutos." },
  });

  // POST /api/auth/login  { cpf, senha }
  router.post("/auth/login", limiteLogin, async (req, res) => {
    const cpf = soDigitos(req.body?.cpf);
    const senha = String(req.body?.senha ?? "");
    if (cpf.length !== 11 || !senha || senha.length > 128) {
      return res.status(400).json({ erro: "Informe CPF e senha." });
    }
    try {
      const r = await pool.query(
        `SELECT u.id, u.senha_hash, u.perfil, u.ambulante_id, a.nome_completo
           FROM usuarios u LEFT JOIN ambulantes a ON a.id = u.ambulante_id
          WHERE u.cpf = $1`,
        [cpf]
      );
      const u = r.rows[0];
      const senhaOk = await bcrypt.compare(senha, u ? u.senha_hash : HASH_FALSO);
      if (!u || !senhaOk) return res.status(401).json({ erro: "CPF ou senha incorretos." }); // mensagem única, de propósito

      res.json({
        token: gerarToken(u),
        usuario: { id: u.id, perfil: u.perfil, ambulante_id: u.ambulante_id, nome: u.nome_completo ?? "Gestor" },
      });
    } catch (e) {
      console.error("Erro no login:", e.message);
      res.status(500).json({ erro: "Erro interno ao entrar." });
    }
  });

  // GET /api/auth/me  (exige token)
  router.get("/auth/me", autenticar, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT u.id, u.perfil, u.ambulante_id, a.nome_completo
           FROM usuarios u LEFT JOIN ambulantes a ON a.id = u.ambulante_id
          WHERE u.id = $1`,
        [req.usuario.id]
      );
      if (!r.rowCount) return res.status(401).json({ erro: "Sessão inválida. Entre novamente." });
      const u = r.rows[0];
      res.json({ id: u.id, perfil: u.perfil, ambulante_id: u.ambulante_id, nome: u.nome_completo ?? "Gestor" });
    } catch (e) {
      console.error("Erro em /auth/me:", e.message);
      res.status(500).json({ erro: "Erro interno." });
    }
  });

  return router;
};