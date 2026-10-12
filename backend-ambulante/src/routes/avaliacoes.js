// RF06 — Gestor aprova ou recusa solicitações (RN04) e ambulante acompanha as suas
// Tabelas: solicitacao, pontos_venda, mensagens
const express = require("express");
const { autenticar, exigirPerfil } = require("../middlewares/auth");

// Se o seu banco usa outros textos de status (restrição CHECK), troque aqui
const STATUS = { PENDENTE: "Pendente", APROVADA: "Aprovada", RECUSADA: "Recusada" };

const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// Aviso automático na caixa de mensagens do ambulante
const notificar = (client, ambulanteId, assunto, texto) =>
  client.query(
    "INSERT INTO mensagens (ambulante_id, remetente, assunto, texto) VALUES ($1, 'sistema', $2, $3)",
    [ambulanteId, assunto, texto]
  );

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/solicitacoes/minhas  (ambulante vê só as próprias)
  router.get("/solicitacoes/minhas", autenticar, exigirPerfil("ambulante"), async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT s.id_solicitacao AS id, s.status_solicitacao AS status, s.data_solicitacao,
                s.justificativa, s.data_avaliacao,
                p.id AS ponto_id, p.descricao_local AS ponto, p.bairro
           FROM solicitacao s
           JOIN pontos_venda p ON p.id = s.id_ponto
          WHERE s.id_ambulante = $1
          ORDER BY s.id_solicitacao DESC`,
        [req.usuario.ambulante_id]
      );
      res.json(r.rows);
    } catch (e) {
      console.error("Erro ao listar minhas solicitações:", e.message);
      res.status(500).json({ erro: "Erro interno ao listar solicitações." });
    }
  });

  // PATCH /api/solicitacoes/:id  { status: "Aprovada" | "Recusada", justificativa }  (só gestor)
  router.patch("/solicitacoes/:id", autenticar, exigirPerfil("gestor"), async (req, res) => {
    const id = Number(req.params.id);
    const novoStatus = req.body?.status;
    const justificativa = String(req.body?.justificativa ?? "").trim();

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "Identificador de solicitação inválido." });
    if (![STATUS.APROVADA, STATUS.RECUSADA].includes(novoStatus)) {
      return res.status(400).json({ erro: `status deve ser '${STATUS.APROVADA}' ou '${STATUS.RECUSADA}'.` });
    }
    // RN04: recusa exige justificativa
    if (novoStatus === STATUS.RECUSADA && justificativa.length < 5) {
      return res.status(400).json({ erro: "Informe a justificativa da recusa (mínimo de 5 caracteres)." });
    }
    if (justificativa.length > 500) return res.status(400).json({ erro: "A justificativa pode ter no máximo 500 caracteres." });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Trava a solicitação e o ponto: dois gestores não decidem ao mesmo tempo
      const sel = await client.query(
        `SELECT s.id_ambulante, s.id_ponto, s.status_solicitacao,
                p.status AS ponto_status, p.descricao_local, p.bairro
           FROM solicitacao s
           JOIN pontos_venda p ON p.id = s.id_ponto
          WHERE s.id_solicitacao = $1
            FOR UPDATE OF s, p`,
        [id]
      );
      if (!sel.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ erro: "Solicitação não encontrada." }); }

      const s = sel.rows[0];
      if (s.status_solicitacao !== STATUS.PENDENTE) {
        await client.query("ROLLBACK");
        return res.status(409).json({ erro: "Esta solicitação já foi avaliada." });
      }
      const ponto = `${s.descricao_local ?? "ponto " + s.id_ponto}${s.bairro ? " (" + s.bairro + ")" : ""}`;

      if (novoStatus === STATUS.APROVADA) {
        if (normalizar(s.ponto_status) !== "disponivel") {
          await client.query("ROLLBACK");
          return res.status(409).json({ erro: "O ponto não está mais disponível." });
        }
        // O ponto passa a ocupado e recebe o ambulante
        await client.query("UPDATE pontos_venda SET status = 'ocupado', ambulante_id = $1 WHERE id = $2", [s.id_ambulante, s.id_ponto]);

        // Os outros pedidos pendentes para o mesmo ponto são recusados e avisados
        const motivo = "Ponto concedido a outro solicitante.";
        const outras = await client.query(
          `UPDATE solicitacao
              SET status_solicitacao = $1, justificativa = $2, data_avaliacao = NOW(), id_avaliador = $3
            WHERE id_ponto = $4 AND status_solicitacao = $5 AND id_solicitacao <> $6
        RETURNING id_ambulante`,
          [STATUS.RECUSADA, motivo, req.usuario.id, s.id_ponto, STATUS.PENDENTE, id]
        );
        for (const o of outras.rows) {
          await notificar(client, o.id_ambulante, "Solicitação recusada", `Sua solicitação para ${ponto} foi recusada. Motivo: ${motivo}`);
        }
      }

      const upd = await client.query(
        `UPDATE solicitacao
            SET status_solicitacao = $1, justificativa = $2, data_avaliacao = NOW(), id_avaliador = $3
          WHERE id_solicitacao = $4
      RETURNING id_solicitacao AS id, status_solicitacao AS status, justificativa, data_avaliacao,
                id_ponto AS ponto_id, id_ambulante AS ambulante_id`,
        [novoStatus, justificativa || null, req.usuario.id, id]
      );

      await notificar(
        client, s.id_ambulante,
        novoStatus === STATUS.APROVADA ? "Solicitação aprovada" : "Solicitação recusada",
        novoStatus === STATUS.APROVADA
          ? `Sua solicitação para ${ponto} foi aprovada.`
          : `Sua solicitação para ${ponto} foi recusada. Motivo: ${justificativa}`
      );

      await client.query("COMMIT"); // tudo ou nada: ponto, solicitações e avisos
      res.json(upd.rows[0]);
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("Erro ao avaliar solicitação:", e.message, e.constraint ? `(restrição: ${e.constraint})` : "");
      res.status(500).json({ erro: "Erro interno ao avaliar a solicitação." });
    } finally {
      client.release();
    }
  });

  return router;
};