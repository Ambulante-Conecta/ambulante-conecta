// RF04 — Solicitação de ponto de venda (RN01 a RN03)
// Tabela: solicitacao (id_solicitacao, id_ambulante, id_ponto, data_solicitacao, status_solicitacao,
//                      justificativa, data_avaliacao, id_avaliador)
const express = require("express");
const { autenticar, exigirPerfil } = require("../middlewares/auth");

const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/solicitacoes  { ponto_id }   (RN01: exige login de ambulante)
  router.post("/solicitacoes", autenticar, exigirPerfil("ambulante"), async (req, res) => {
    const ambulanteId = req.usuario.ambulante_id; // vem do token, nunca do corpo da requisição
    const pontoId = Number(req.body?.ponto_id);
    if (!Number.isInteger(pontoId) || pontoId <= 0) {
      return res.status(400).json({ erro: "Informe um ponto_id válido." });
    }
    try {
      const amb = await pool.query("SELECT id, possui_mei, cnpj_mei FROM ambulantes WHERE id = $1", [ambulanteId]);
      if (!amb.rowCount) return res.status(404).json({ erro: "Ambulante não encontrado." });

      // RN02: só quem tem MEI (com CNPJ) pode solicitar
      if (!amb.rows[0].possui_mei || !amb.rows[0].cnpj_mei) {
        return res.status(422).json({ erro: "É necessário ter MEI ativo para solicitar um ponto. Consulte a página de Formalização." });
      }

      const pt = await pool.query("SELECT id, status FROM pontos_venda WHERE id = $1", [pontoId]);
      if (!pt.rowCount) return res.status(404).json({ erro: "Ponto de venda não encontrado." });
      if (normalizar(pt.rows[0].status) !== "disponivel") return res.status(409).json({ erro: "Este ponto não está disponível." });

      const dup = await pool.query(
        "SELECT 1 FROM solicitacao WHERE id_ambulante = $1 AND id_ponto = $2 AND status_solicitacao = 'Pendente'",
        [ambulanteId, pontoId]
      );
      if (dup.rowCount) return res.status(409).json({ erro: "Você já tem uma solicitação pendente para este ponto." });

      // RN03: toda solicitação nasce como "Pendente"
      const r = await pool.query(
        `INSERT INTO solicitacao (id_ambulante, id_ponto, data_solicitacao, status_solicitacao)
         VALUES ($1, $2, NOW(), 'Pendente')
         RETURNING id_solicitacao AS id, id_ambulante AS ambulante_id, id_ponto AS ponto_id,
                   status_solicitacao AS status, data_solicitacao AS criado_em`,
        [ambulanteId, pontoId]
      );
            // RN03: aviso automático de que o pedido está em análise (se falhar, a solicitação continua valendo)
      try {
        await pool.query(
          "INSERT INTO mensagens (ambulante_id, remetente, assunto, texto) VALUES ($1, 'sistema', $2, $3)",
          [ambulanteId, "Solicitação recebida", `Sua solicitação (nº ${r.rows[0].id}) foi registrada como Pendente e está em análise.`]
        );
      } catch (e) {
        console.error("Não foi possível criar o aviso da solicitação:", e.message);
      }
      res.status(201).json(r.rows[0]);
    } catch (e) {
      console.error("Erro ao criar solicitação:", e.message);
      res.status(500).json({ erro: "Erro interno ao criar solicitação." });
    }
  });

  return router;
};