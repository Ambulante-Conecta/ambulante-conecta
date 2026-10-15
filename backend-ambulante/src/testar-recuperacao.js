// Roteiro de teste da recuperação de senha. Com o servidor ligado: node src/testar-recuperacao.js
// Precisa da migração 005 (database/migracoes/005_senha_alterada.sql) aplicada no banco.
const BASE = process.env.API || "http://localhost:3000/api";
const SENHA = "Teste@12345";
const NOVA = "NovaSenha2026";

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (a) => { let s = 0; a.forEach((d, i) => (s += d * (a.length + 1 - i))); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  return n.join("");
}
async function chamar(metodo, caminho, corpo, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch(BASE + caminho, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}
let falhas = 0;
let avisou429 = false;
function conferir(rotulo, obtido, esperado) {
  if (obtido === 429 && !avisou429) {
    avisou429 = true;
    console.log("AVISO limite de tentativas atingido (429): coloque LOGIN_LIMITE=200 no .env do desenvolvimento e reinicie a API (o limite de produção é 5).");
  }
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${rotulo} (esperado ${esperado}, veio ${obtido})`);
}
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const VERIFICAR = "/auth/recuperar-senha/verificar";
const NOVA_SENHA = "/auth/recuperar-senha/nova";

(async () => {
  const cpf = gerarCpf(), cpfSemEmail = gerarCpf();
  const base = { nome_completo: "Rita Teste Recuperacao", data_nascimento: "1991-07-20", telefone: "92981234567",
    tipo_atividade: "Alimentação", possui_mei: false, turno: "Tarde", senha: SENHA, consentimento: true };

  console.log("--- Preparação ---");
  conferir("cadastro com e-mail", (await chamar("POST", "/ambulantes", { ...base, cpf, email: "rita.teste@email.com" })).status, 201);
  conferir("cadastro sem e-mail", (await chamar("POST", "/ambulantes", { ...base, cpf: cpfSemEmail })).status, 201);
  const tokenAntigo = (await chamar("POST", "/auth/login", { cpf, senha: SENHA })).dados.token;
  conferir("login antes da troca", typeof tokenAntigo, "string");

  console.log("--- Confirmar os dados ---");
  conferir("sem dados", (await chamar("POST", VERIFICAR, {})).status, 400);
  conferir("meio inválido", (await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1991-07-20", meio: "sms", contato: "x" })).status, 400);
  let r = await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1990-01-01", meio: "celular", contato: "92981234567" });
  conferir("nascimento errado", r.status, 401);
  const msgErro = r.dados.erro;
  r = await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1991-07-20", meio: "celular", contato: "92999999999" });
  conferir("celular errado", r.status, 401);
  conferir("mesma mensagem para qualquer dado errado", r.dados.erro, msgErro);
  conferir("CPF sem conta", (await chamar("POST", VERIFICAR, { cpf: gerarCpf(), data_nascimento: "1991-07-20", meio: "celular", contato: "92981234567" })).status, 401);
  conferir("e-mail errado", (await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1991-07-20", meio: "email", contato: "outra@email.com" })).status, 401);
  conferir("e-mail sem cadastro de e-mail", (await chamar("POST", VERIFICAR, { cpf: cpfSemEmail, data_nascimento: "1991-07-20", meio: "email", contato: "rita.teste@email.com" })).status, 401);
  conferir("confirma pelo e-mail (maiúsculas não importam)", (await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1991-07-20", meio: "email", contato: "Rita.Teste@Email.com" })).status, 200);
  r = await chamar("POST", VERIFICAR, { cpf, data_nascimento: "1991-07-20", meio: "celular", contato: "(92) 98123-4567" });
  conferir("confirma pelo celular (com máscara)", r.status, 200);
  const tokenRec = r.dados.token;
  conferir("token de recuperação NÃO serve como login", (await chamar("GET", "/auth/me", null, tokenRec)).status, 401);

  console.log("--- Criar a senha nova ---");
  await esperar(1100); // a troca precisa ser num segundo depois do login antigo para encerrar a sessão
  conferir("token inválido", (await chamar("POST", NOVA_SENHA, { token: "x", nova_senha: NOVA })).status, 401);
  r = await chamar("POST", NOVA_SENHA, { token: tokenRec, nova_senha: "somenteletras" });
  conferir("senha fraca", r.status, 400);
  conferir("erro aponta o campo nova_senha", typeof r.dados.campos?.nova_senha, "string");
  conferir("senha nova salva", (await chamar("POST", NOVA_SENHA, { token: tokenRec, nova_senha: NOVA })).status, 200);
  conferir("mesmo token não serve duas vezes", (await chamar("POST", NOVA_SENHA, { token: tokenRec, nova_senha: "OutraSenha99" })).status, 401);

  console.log("--- Depois da troca ---");
  conferir("sessão antiga encerrada", (await chamar("GET", "/auth/me", null, tokenAntigo)).status, 401);
  conferir("senha antiga não entra", (await chamar("POST", "/auth/login", { cpf, senha: SENHA })).status, 401);
  r = await chamar("POST", "/auth/login", { cpf, senha: NOVA });
  conferir("senha nova entra", r.status, 200);
  conferir("sessão nova funciona", (await chamar("GET", "/auth/me", null, r.dados.token)).status, 200);
  const msgs = await chamar("GET", "/mensagens", null, r.dados.token);
  conferir("aviso de senha alterada em Mensagens", msgs.dados.some?.((m) => m.assunto === "Senha alterada"), true);

  if (process.env.TESTE_GESTOR_CPF) {
    console.log("--- Gestor ---");
    conferir("gestor não usa a recuperação do ambulante", (await chamar("POST", VERIFICAR, { cpf: process.env.TESTE_GESTOR_CPF, data_nascimento: "1980-01-01", meio: "celular", contato: "92900000000" })).status, 401);
  }

  console.log(falhas ? `\n${falhas} falha(s)` : "\nTodos os testes passaram");
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
