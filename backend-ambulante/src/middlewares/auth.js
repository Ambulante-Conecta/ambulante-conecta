// Autenticação por token JWT e controle de perfil (RN01 e RN06)
const jwt = require("jsonwebtoken");

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

// Exige "Authorization: Bearer <token>" e preenche req.usuario
function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ erro: "Faça login para continuar." });
  try {
    const p = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    req.usuario = { id: Number(p.sub), perfil: p.perfil, ambulante_id: p.ambulante_id ?? null };
    next();
  } catch (e) {
    const expirou = e.name === "TokenExpiredError";
    res.status(401).json({ erro: expirou ? "Sessão expirada. Entre novamente." : "Sessão inválida. Entre novamente." });
  }
}

// Uso: exigirPerfil("gestor") ou exigirPerfil("ambulante", "gestor")
const exigirPerfil = (...perfis) => (req, res, next) =>
  perfis.includes(req.usuario?.perfil) ? next() : res.status(403).json({ erro: "Você não tem permissão para esta ação." });

module.exports = { autenticar, exigirPerfil, gerarToken };