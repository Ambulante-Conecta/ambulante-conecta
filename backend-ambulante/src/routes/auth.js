// Login (RN01), dados do usuário logado e recuperação de senha pelo próprio site
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { soDigitos, dataValida, senhaValida } = require("../utils/validacoes");
const { autenticar, gerarToken, gerarTokenRecuperacao, lerTokenRecuperacao, senhaMudouDepois } = require("../middlewares/auth");

// Hash falso: quando o CPF não existe, comparamos com ele para gastar o mesmo tempo
// e não revelar quais CPFs têm conta.
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-o-tempo", 10);

module.exports = (pool) => {
  const router = express.Router();

  // 20 tentativas a cada 15 minutos por IP. No desenvolvimento, LOGIN_LIMITE no .env pode aumentar o valor:
  // o npm test faz cerca de 16 logins por execução e estouraria o limite na segunda rodada.
  // Em produção (NODE_ENV=production) o valor é sempre 20.
  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "production" ? 20 : Number(process.env.LOGIN_LIMITE) || 20,
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

  /* ---------- Recuperação de senha (ambulante) ----------
     1) A pessoa confirma CPF + data de nascimento + celular OU e-mail do cadastro (ela escolhe qual).
     2) Se conferir, recebe um token que vale 10 minutos e só serve para criar a senha nova.
     3) Com a senha nova, os logins antigos deixam de valer e um aviso vai para Mensagens.
     Não há envio de código por SMS ou e-mail: os dados são conferidos com o cadastro.
     A mensagem de erro é sempre a mesma, para não revelar qual dado está errado nem quais CPFs têm conta. */
  // Contadores separados: errar os dados algumas vezes não pode impedir de salvar a senha nova depois de acertar.
  // Confirmar dados: 5 a cada 15 min (é aqui que alguém tentaria adivinhar). Salvar a senha: 10 a cada 15 min.
  // No desenvolvimento, LOGIN_LIMITE no .env aumenta os dois (o npm test faz várias tentativas seguidas).
  const limite = (producao, msg) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "production" ? producao : Number(process.env.LOGIN_LIMITE) || producao,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: msg },
  });
  const limiteVerificar = limite(5, "Muitas tentativas. Por segurança, aguarde 15 minutos e tente de novo.");
  const limiteNovaSenha = limite(10, "Muitas tentativas de salvar a senha. Aguarde 15 minutos e tente de novo.");
  const NAO_CONFERE = "Não encontramos um cadastro com esses dados. Confira o CPF, a data de nascimento e o celular ou o e-mail.";
  const TEMPO_ACABOU = "O tempo para criar a senha nova acabou. Confirme seus dados de novo.";

  // POST /api/auth/recuperar-senha/verificar  { cpf, data_nascimento, meio: "celular" | "email", contato }
  router.post("/auth/recuperar-senha/verificar", limiteVerificar, async (req, res) => {
    const cpf = soDigitos(req.body?.cpf);
    const nascimento = String(req.body?.data_nascimento ?? "").trim();
    const meio = String(req.body?.meio ?? "");
    const contato = String(req.body?.contato ?? "").trim();
    const erros = {};
    if (cpf.length !== 11) erros.cpf = "Informe os 11 números do CPF.";
    if (!dataValida(nascimento)) erros.data_nascimento = "Informe a data de nascimento.";
    if (!["celular", "email"].includes(meio)) erros.meio = "Escolha confirmar pelo celular ou pelo e-mail.";
    else if (meio === "celular" && soDigitos(contato).length !== 11) erros.contato = "Informe o celular com DDD (11 números).";
    else if (meio === "email" && !/^\S+@\S+\.\S+$/.test(contato)) erros.contato = "Informe o e-mail completo, como nome@email.com.";
    if (Object.keys(erros).length) return res.status(400).json({ erro: "Dados inválidos.", campos: erros });

    try {
      const r = await pool.query(
        `SELECT u.id, a.telefone, a.email
           FROM usuarios u JOIN ambulantes a ON a.id = u.ambulante_id
          WHERE u.cpf = $1 AND u.perfil = 'ambulante' AND a.data_nascimento = $2::date`,
        [cpf, nascimento]
      );
      const u = r.rows[0];
      const confere = !!u && (meio === "celular"
        ? soDigitos(u.telefone) === soDigitos(contato)
        : !!u.email && u.email.trim().toLowerCase() === contato.toLowerCase());
      if (!confere) return res.status(401).json({ erro: NAO_CONFERE });
      res.json({ token: gerarTokenRecuperacao(u.id) });
    } catch (e) {
      console.error("Erro ao conferir dados da recuperação:", e.message);
      res.status(500).json({ erro: "Erro interno. Tente de novo em instantes." });
    }
  });

  // POST /api/auth/recuperar-senha/nova  { token, nova_senha }
  router.post("/auth/recuperar-senha/nova", limiteNovaSenha, async (req, res) => {
    const dados = lerTokenRecuperacao(req.body?.token);
    if (!dados) return res.status(401).json({ erro: TEMPO_ACABOU });
    const novaSenha = String(req.body?.nova_senha ?? "");
    if (!senhaValida(novaSenha)) {
      return res.status(400).json({ erro: "Dados inválidos.", campos: { nova_senha: "A senha deve ter de 8 a 72 caracteres, com letras e números." } });
    }
    const client = await pool.connect();
    try {
      // O mesmo token não pode ser usado duas vezes: se a senha já mudou depois dele, recusa
      if (await senhaMudouDepois(dados.usuarioId, dados.emitidoEm)) return res.status(401).json({ erro: TEMPO_ACABOU });
      await client.query("BEGIN");
      const u = await client.query(
        `UPDATE usuarios SET senha_hash = $1, senha_alterada_em = NOW()
          WHERE id = $2 AND perfil = 'ambulante' RETURNING ambulante_id`,
        [await bcrypt.hash(novaSenha, 10), dados.usuarioId]
      );
      if (!u.rowCount) { await client.query("ROLLBACK"); return res.status(401).json({ erro: TEMPO_ACABOU }); }
      // Aviso na conversa: se não foi a pessoa, ela fica sabendo
      await client.query(
        "INSERT INTO mensagens (ambulante_id, remetente, assunto, texto) VALUES ($1, 'sistema', $2, $3)",
        [u.rows[0].ambulante_id, "Senha alterada", "A senha da sua conta foi alterada. Se não foi você, procure a prefeitura o quanto antes."]
      );
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("Erro ao salvar a senha nova:", e.message);
      res.status(500).json({ erro: "Erro interno. Tente de novo em instantes." });
    } finally {
      client.release();
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