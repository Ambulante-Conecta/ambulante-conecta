// RF03 — Pontos de venda em GeoJSON (para o mapa)
// Tabela: pontos_venda (id, ambulante_id, descricao_local, bairro, geometria, criado_em, status)
const express = require("express");

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/pontos?status=disponivel&bairro=Centro
  router.get("/pontos", async (req, res) => {
    const status = req.query.status ? String(req.query.status).trim().toLowerCase() : null;
    const bairro = req.query.bairro ? `%${String(req.query.bairro).trim()}%` : null;
    if (status && !/^[a-z_]{3,20}$/.test(status)) {
      return res.status(400).json({ erro: "status inválido (use, por exemplo, 'disponivel' ou 'ocupado')." });
    }
    try {
      // lower(translate(...)) deixa "Disponível" e "disponivel" equivalentes
      const r = await pool.query(
        `SELECT id, descricao_local, bairro, status, ST_AsGeoJSON(geometria)::json AS geometry
           FROM pontos_venda
          WHERE geometria IS NOT NULL
            AND ($1::text IS NULL OR lower(translate(status, 'íÍ', 'ii')) = $1)
            AND ($2::text IS NULL OR bairro ILIKE $2)
          ORDER BY id`,
        [status, bairro]
      );
      res.json({
        type: "FeatureCollection",
        features: r.rows.map((p) => ({
          type: "Feature",
          geometry: p.geometry,
          properties: { id: p.id, descricao_local: p.descricao_local, bairro: p.bairro, status: p.status },
        })),
      });
    } catch (e) {
      console.error("Erro ao listar pontos:", e.message);
      res.status(500).json({ erro: "Erro interno ao listar pontos." });
    }
  });

  return router;
};