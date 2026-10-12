// Roteiro de teste da API (Node 18+). Com o servidor ligado: node testar-api.js
// Para testar também o gestor, defina TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA (criados com scripts/criar-gestor.js).
const BASE = process.env.API || "http://localhost:3000/api";
const SENHA = "Teste@12345";

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
function conferir(rotulo, obtido, esperado) {
  const ok = obtido === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? "OK   " : "FALHA"} ${rotulo} (esperado ${esperado}, veio ${obtido})`);
}

(async () => {
  const cpfA = gerarCpf(), cpfB = gerarCpf();
  const base = { nome_completo: "Maria Teste Santos", cpf: cpfA, data_nascimento: "1990-05-10", telefone: "92912345678",
    tipo_atividade: "Alimentação", possui_mei: true, cnpj_mei: "11.222.333/0001-81", local_pretendido: "Centro",
    turno: "Manhã", senha: SENHA, consentimento: true };

  console.log("--- Cadastro ---");
  conferir("cadastro válido", (await chamar("POST", "/ambulantes", base)).status, 201);
  conferir("CPF duplicado", (await chamar("POST", "/ambulantes", base)).status, 409);
  conferir("CPF inválido", (await chamar("POST", "/ambulantes", { ...base, cpf: "111.111.111-11" })).status, 400);
  conferir("sem senha", (await chamar("POST", "/ambulantes", { ...base, cpf: gerarCpf(), senha: "" })).status, 400);
  conferir("senha fraca (só letras)", (await chamar("POST", "/ambulantes", { ...base, cpf: gerarCpf(), senha: "somenteletras" })).status, 400);
  conferir("sem turno", (await chamar("POST", "/ambulantes", { ...base, cpf: gerarCpf(), turno: "" })).status, 400);
  conferir("turno fora da lista", (await chamar("POST", "/ambulantes", { ...base, cpf: gerarCpf(), turno: "Madrugada" })).status, 400);
  conferir("sem consentimento LGPD", (await chamar("POST", "/ambulantes", { ...base, cpf: gerarCpf(), consentimento: false })).status, 400);
  conferir("cadastro sem MEI", (await chamar("POST", "/ambulantes", { ...base, cpf: cpfB, possui_mei: false, cnpj_mei: null })).status, 201);

  console.log("--- Login ---");
  conferir("login com senha errada", (await chamar("POST", "/auth/login", { cpf: cpfA, senha: "SenhaErrada1" })).status, 401);
  conferir("login com CPF inexistente", (await chamar("POST", "/auth/login", { cpf: gerarCpf(), senha: SENHA })).status, 401);
  let r = await chamar("POST", "/auth/login", { cpf: cpfA, senha: SENHA });
  conferir("login correto", r.status, 200);
  const tokenA = r.dados.token;
  conferir("/auth/me sem token", (await chamar("GET", "/auth/me")).status, 401);
  r = await chamar("GET", "/auth/me", null, tokenA);
  conferir("/auth/me com token", r.status, 200);
  console.log("     perfil:", r.dados.perfil);
  conferir("token adulterado", (await chamar("GET", "/auth/me", null, tokenA + "x")).status, 401);

  console.log("--- Permissões ---");
  conferir("ambulante não lista solicitações (só gestor)", (await chamar("GET", "/solicitacoes", null, tokenA)).status, 403);
  conferir("solicitar sem login", (await chamar("POST", "/solicitacoes", { ponto_id: 1 })).status, 401);

  console.log("--- Pontos e solicitações ---");
  r = await chamar("GET", "/pontos?status=disponivel");
  conferir("lista de pontos (GeoJSON)", r.status, 200);
  const ponto = r.dados.features?.[0]?.properties?.id;
  console.log("     pontos disponíveis:", r.dados.features?.length ?? 0);
  if (!ponto) { console.log("Sem ponto disponível no banco: confira o seed.sql."); }
  else {
    const tokenB = (await chamar("POST", "/auth/login", { cpf: cpfB, senha: SENHA })).dados.token;
    conferir("RN02: sem MEI não solicita", (await chamar("POST", "/solicitacoes", { ponto_id: ponto }, tokenB)).status, 422);
    r = await chamar("POST", "/solicitacoes", { ponto_id: ponto }, tokenA);
    conferir("RN03: solicitação criada como Pendente", r.status, 201);
        const msgs = await chamar("GET", "/mensagens", null, tokenA);
    conferir("RN03: aviso de solicitação em análise", msgs.dados.some((m) => m.assunto === "Solicitação recebida"), true);
    console.log("     status:", r.dados.status);
    conferir("solicitação pendente duplicada", (await chamar("POST", "/solicitacoes", { ponto_id: ponto }, tokenA)).status, 409);
  }

  if (process.env.TESTE_GESTOR_CPF && process.env.TESTE_GESTOR_SENHA) {
    console.log("--- Gestor ---");
    r = await chamar("POST", "/auth/login", { cpf: process.env.TESTE_GESTOR_CPF, senha: process.env.TESTE_GESTOR_SENHA });
    conferir("login do gestor", r.status, 200);
    const tokenG = r.dados.token;
    conferir("gestor lista solicitações", (await chamar("GET", "/solicitacoes", null, tokenG)).status, 200);
    conferir("gestor não cria solicitação", (await chamar("POST", "/solicitacoes", { ponto_id: ponto || 1 }, tokenG)).status, 403);
  } else {
    console.log("(Teste do gestor ignorado: defina TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA)");
  }
  console.log(falhas ? `\n${falhas} teste(s) com FALHA` : "\nTodos os testes passaram");
})();