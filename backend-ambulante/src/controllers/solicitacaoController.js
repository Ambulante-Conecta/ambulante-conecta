const pool = require('../config/database');

const STATUS_VALIDOS = ['Pendente', 'Aprovada', 'Recusada'];

// GET /api/solicitacoes?status=Pendente   (só gestor; o filtro é opcional)
const getSolicitacoesComDetalhes = async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: "status deve ser Pendente, Aprovada ou Recusada." });
  }
  try {
    // O CPF sai mascarado: o gestor identifica a pessoa sem receber o número completo (LGPD)
    const query = `
      SELECT
        s.id_solicitacao AS id,
        s.status_solicitacao AS status,
        s.data_solicitacao,
        s.justificativa,
        s.data_avaliacao,
        a.id AS ambulante_id,
        a.nome_completo AS ambulante,
        a.turno AS ambulante_turno,
        '***.' || substr(regexp_replace(a.cpf, '\\D', '', 'g'), 4, 3) || '.' ||
                  substr(regexp_replace(a.cpf, '\\D', '', 'g'), 7, 3) || '-**' AS ambulante_cpf,
        p.descricao_local AS ponto,
        p.bairro,
        p.id AS ponto_id
      FROM solicitacao s
      JOIN ambulantes a ON a.id = s.id_ambulante
      JOIN pontos_venda p ON p.id = s.id_ponto
      WHERE ($1::text IS NULL OR s.status_solicitacao = $1)
      ORDER BY s.id_solicitacao DESC;
    `;

    const { rows } = await pool.query(query, [status]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error.message);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = {
  getSolicitacoesComDetalhes
};