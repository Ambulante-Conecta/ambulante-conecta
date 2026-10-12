// RF05 — Mensagens entre ambulante e gestor
// Tabela: mensagens (id, ambulante_id, remetente, usuario_id, assunto, texto, lida, criado_em)
// Cada conversa pertence a um ambulante. O ambulante só enxerga a própria; o gestor enxerga qualquer uma.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { autenticar, exigirPerfil } = require("../middlewares/auth");

module.exports = (pool) => {
  const router = express.Router();
  const ambosPerfis = exigirPerfil("ambulante", "gestor");

  const limiteEnvio = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas mensagens enviadas. Aguarde alguns minutos." },
  });

  // Evita repetir try/catch em cada rota
  const tratar = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error("Erro em mensagens:", e.message); res.status(500).json({ erro: "Erro interno." }); }
  };

  // Dono da conversa: o próprio ambulante, ou o ambulante_id informado pelo gestor
  function donoDaConversa(req) {
    if (req.usuario.perfil === "ambulante") return req.usuario.ambulante_id;
    const id = Number(req.query.ambulante_id ?? req.body?.ambulante_id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  // GET /api/mensagens?limite=50            (ambulante: a própria conversa)
  // GET /api/mensagens?ambulante_id=3       (gestor: conversa de um ambulante)
  router.get("/mensagens", autenticar, ambosPerfis, tratar(async (req, res) => {
    const dono = donoDaConversa(req);
    if (!dono) return res.status(400).json({ erro: "Informe o ambulante_id da conversa." });
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);
    const r = await pool.query(
      `SELECT id, remetente, assunto, texto, lida, criado_em
         FROM mensagens WHERE ambulante_id = $1 ORDER BY id DESC LIMIT $2`,
      [dono, limite]
    );
    res.json(r.rows);
  }));

  // GET /api/mensagens/nao-lidas  -> { total }   (para o contador do menu)
  router.get("/mensagens/nao-lidas", autenticar, ambosPerfis, tratar(async (req, res) => {
    const r = req.usuario.perfil === "gestor"
      ? await pool.query("SELECT COUNT(*)::int AS total FROM mensagens WHERE remetente = 'ambulante' AND NOT lida")
      : await pool.query(
          "SELECT COUNT(*)::int AS total FROM mensagens WHERE ambulante_id = $1 AND remetente <> 'ambulante' AND NOT lida",
          [req.usuario.ambulante_id]
        );
    res.json(r.rows[0]);
  }));

  // GET /api/mensagens/conversas  (gestor: caixa de entrada, com quem escreveu e o que não foi lido)
  router.get("/mensagens/conversas", autenticar, exigirPerfil("gestor"), tratar(async (req, res) => {
    const r = await pool.query(
      `SELECT a.id AS ambulante_id, a.nome_completo AS ambulante,
              COUNT(*) FILTER (WHERE m.remetente = 'ambulante' AND NOT m.lida)::int AS nao_lidas,
              MAX(m.criado_em) AS ultima_em
         FROM mensagens m
         JOIN ambulantes a ON a.id = m.ambulante_id
        WHERE m.remetente IN ('ambulante', 'gestor')
        GROUP BY a.id, a.nome_completo
        ORDER BY nao_lidas DESC, ultima_em DESC`
    );
    res.json(r.rows);
  }));

  // POST /api/mensagens  { assunto, texto }                 (ambulante escreve para a prefeitura)
  // POST /api/mensagens  { ambulante_id, assunto, texto }   (gestor responde a um ambulante)
  router.post("/mensagens", autenticar, ambosPerfis, limiteEnvio, tratar(async (req, res) => {
    const assunto = String(req.body?.assunto ?? "").trim();
    const texto = String(req.body?.texto ?? "").trim();
    const erros = {};
    if (!assunto || assunto.length > 120) erros.assunto = "Informe o assunto (até 120 caracteres).";
    if (!texto || texto.length > 1000) erros.texto = "Escreva a mensagem (até 1000 caracteres).";
    if (Object.keys(erros).length) return res.status(400).json({ erro: "Dados inválidos.", campos: erros });

    const dono = donoDaConversa(req);
    if (!dono) return res.status(400).json({ erro: "Informe o ambulante_id para quem a mensagem vai." });

    const gestor = req.usuario.perfil === "gestor";
    if (gestor) {
      const existe = await pool.query("SELECT 1 FROM ambulantes WHERE id = $1", [dono]);
      if (!existe.rowCount) return res.status(404).json({ erro: "Ambulante não encontrado." });
    }
    const r = await pool.query(
      `INSERT INTO mensagens (ambulante_id, remetente, usuario_id, assunto, texto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, remetente, assunto, texto, lida, criado_em`,
      [dono, gestor ? "gestor" : "ambulante", req.usuario.id, assunto, texto]
    );
    res.status(201).json(r.rows[0]);
  }));

  // PATCH /api/mensagens/lidas  (ambulante: todas as recebidas; gestor: { ambulante_id } da conversa)
  router.patch("/mensagens/lidas", autenticar, ambosPerfis, tratar(async (req, res) => {
    const dono = donoDaConversa(req);
    if (!dono) return res.status(400).json({ erro: "Informe o ambulante_id da conversa." });
    const gestor = req.usuario.perfil === "gestor";
    const r = await pool.query(
      `UPDATE mensagens SET lida = TRUE
        WHERE ambulante_id = $1 AND NOT lida AND remetente ${gestor ? "=" : "<>"} 'ambulante'`,
      [dono]
    );
    res.json({ atualizadas: r.rowCount });
  }));

  // PATCH /api/mensagens/:id/lida  (só mensagens recebidas: o ambulante não marca as próprias)
  router.patch("/mensagens/:id/lida", autenticar, ambosPerfis, tratar(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "Identificador inválido." });
    const r = req.usuario.perfil === "gestor"
      ? await pool.query("UPDATE mensagens SET lida = TRUE WHERE id = $1 AND remetente = 'ambulante' RETURNING id", [id])
      : await pool.query(
          "UPDATE mensagens SET lida = TRUE WHERE id = $1 AND ambulante_id = $2 AND remetente <> 'ambulante' RETURNING id",
          [id, req.usuario.ambulante_id]
        );
    if (!r.rowCount) return res.status(404).json({ erro: "Mensagem não encontrada." });
    res.json({ id, lida: true });
  }));

  return router;
};