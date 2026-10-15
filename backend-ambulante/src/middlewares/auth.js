// Autenticação por token JWT e controle de perfil (RN01 e RN06)
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error("Defina JWT_SECRET no .env (mínimo de 32 caracteres).");
  process.exit(1);
}
const EXPIRA_EM = process.env.JWT_EXPIRA_EM || "8h";

function gerarToken(usuario) {
  return jwt.sign(
    { perfil: usuario.perfil, ambulante_id: usuario.ambulante_id ?? null },
    SECRET,
    { algorithm: "HS256", subject: String(usuario.id), expiresIn: EXPIRA_EM }
  );
}

// Token de recuperação de senha: vale 10 minutos e só serve para criar a senha nova (nunca como login)
function gerarTokenRecuperacao(usuarioId) {
  return jwt.sign({ tipo: "recuperacao" }, SECRET, { algorithm: "HS256", subject: String(usuarioId), expiresIn: "10m" });
}
function lerTokenRecuperacao(token) {
  try {
    const p = jwt.verify(String(token ?? ""), SECRET, { algorithms: ["HS256"] });
    return p.tipo === "recuperacao" ? { usuarioId: Number(p.sub), emitidoEm: p.iat } : null;
  } catch (_) {
    return null;
  }
}

// Quando a senha muda, os tokens emitidos ANTES deixam de valer (encerra sessões abertas em outros aparelhos).
// Comparação em segundos: um token emitido no mesmo segundo da troca continua valendo.
// Se o banco ainda não tem a coluna (migração 005 não aplicada), a checagem é pulada para a API não parar.
let avisouSemColuna = false;
async function senhaMudouDepois(usuarioId, emitidoEm) {
  try {
    const r = await pool.query("SELECT senha_alterada_em FROM usuarios WHERE id = $1", [usuarioId]);
    if (!r.rowCount) return true; // usuário não existe mais
    const alterada = r.rows[0].senha_alterada_em;
    return !!alterada && emitidoEm < Math.floor(new Date(alterada).getTime() / 1000);
  } catch (e) {
    if (e.code === "42703") { // coluna inexistente
      if (!avisouSemColuna) { console.error("Aplique database/migracoes/005_senha_alterada.sql: sessões antigas não são encerradas após trocar a senha."); avisouSemColuna = true; }
      return false;
    }
    throw e;
  }
}

// Exige "Authorization: Bearer <token>" e preenche req.usuario
async function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ erro: "Faça login para continuar." });
  let p;
  try {
    p = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
  } catch (e) {
    const expirou = e.name === "TokenExpiredError";
    return res.status(401).json({ erro: expirou ? "Sessão expirada. Entre novamente." : "Sessão inválida. Entre novamente." });
  }
  if (p.tipo === "recuperacao") return res.status(401).json({ erro: "Sessão inválida. Entre novamente." });
  try {
    if (await senhaMudouDepois(Number(p.sub), p.iat)) {
      return res.status(401).json({ erro: "Sua senha foi alterada. Entre novamente." });
    }
  } catch (e) {
    console.error("Erro ao conferir a sessão:", e.message);
    return res.status(500).json({ erro: "Erro interno." });
  }
  req.usuario = { id: Number(p.sub), perfil: p.perfil, ambulante_id: p.ambulante_id ?? null };
  next();
}

// Uso: exigirPerfil("gestor") ou exigirPerfil("ambulante", "gestor")
const exigirPerfil = (...perfis) => (req, res, next) =>
  perfis.includes(req.usuario?.perfil) ? next() : res.status(403).json({ erro: "Você não tem permissão para esta ação." });

module.exports = { autenticar, exigirPerfil, gerarToken, gerarTokenRecuperacao, lerTokenRecuperacao, senhaMudouDepois };
