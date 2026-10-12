// RF07 — Painel do gestor: números agregados, sem nenhum dado pessoal (RN06)
const express = require("express");
const { autenticar, exigirPerfil } = require("../middlewares/auth");

module.exports = (pool) => {
  const router = express.Router();

  // Condições de status dos pontos (aceita "disponível" com ou sem acento)
  const DISPONIVEL = "lower(translate(status, 'íÍ', 'ii')) = 'disponivel'";
  const OCUPADO = "lower(status) = 'ocupado'";

  // GET /api/painel
  router.get("/painel", autenticar, exigirPerfil("gestor"), async (req, res) => {
    try {
      const [amb, pts, sol, atv, bai, msg] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE possui_mei)::int AS com_mei FROM ambulantes`),
        pool.query(`SELECT COUNT(*)::int AS total,
                           COUNT(*) FILTER (WHERE ${DISPONIVEL})::int AS disponiveis,
                           COUNT(*) FILTER (WHERE ${OCUPADO})::int AS ocupados
                      FROM pontos_venda`),
        pool.query(`SELECT COUNT(*)::int AS total,
                           COUNT(*) FILTER (WHERE status_solicitacao = 'Pendente')::int AS pendentes,
                           COUNT(*) FILTER (WHERE status_solicitacao = 'Aprovada')::int AS aprovadas,
                           COUNT(*) FILTER (WHERE status_solicitacao = 'Recusada')::int AS recusadas
                      FROM solicitacao`),
        pool.query(`SELECT COALESCE(NULLIF(trim(tipo_atividade), ''), 'Não informado') AS atividade, COUNT(*)::int AS total
                      FROM ambulantes GROUP BY 1 ORDER BY 2 DESC, 1`),
        pool.query(`SELECT COALESCE(NULLIF(trim(bairro), ''), 'Não informado') AS bairro, COUNT(*)::int AS total,
                           COUNT(*) FILTER (WHERE ${DISPONIVEL})::int AS disponiveis,
                           COUNT(*) FILTER (WHERE ${OCUPADO})::int AS ocupados
                      FROM pontos_venda GROUP BY 1 ORDER BY 2 DESC, 1`),
        pool.query(`SELECT COUNT(*)::int AS total FROM mensagens WHERE remetente = 'ambulante' AND NOT lida`),
      ]);

      res.json({
        ambulantes: amb.rows[0],
        pontos: pts.rows[0],
        solicitacoes: sol.rows[0],
        mensagens_nao_lidas: msg.rows[0].total,
        por_atividade: atv.rows,
        por_bairro: bai.rows,
      });
    } catch (e) {
      console.error("Erro no painel:", e.message);
      res.status(500).json({ erro: "Erro interno ao montar o painel." });
    }
  });

  return router;
};