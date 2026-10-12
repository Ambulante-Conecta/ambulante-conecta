// Roteiro de teste da Formalização (RF02 + RN02). Com o servidor ligado: node src/testar-formalizacao.js
// O 403 do gestor só é testado se TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA estiverem definidos.
const BASE = process.env.API || "http://localhost:3000/api";
const SENHA = "Teste@12345";

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (a) => { let s = 0; a.forEach((d, i) => (s += d * (a.length + 1 - i))); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  return n.join("");
}
function gerarCnpj() {
  const n = [...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)), 0, 0, 0, 1];
  const dv = (a) => {
    const pesos = a.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = a.reduce((s, d, i) => s + d * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
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
  const cpf = gerarCpf();
  const cnpj = gerarCnpj();
  console.log("--- Preparação: ambulante sem MEI ---");
  let r = await chamar("POST", "/ambulantes", {
    nome_completo: "Paulo Teste Formalizacao", cpf, data_nascimento: "1988-03-15", telefone: "92987654321",
    tipo_atividade: "Bebidas", possui_mei: false, cnpj_mei: null, turno: "Manhã", senha: SENHA, consentimento: true
  });
  conferir("cadastro sem MEI", r.status, 201);
  const token = (await chamar("POST", "/auth/login", { cpf, senha: SENHA })).dados.token;

  console.log("--- Consulta ---");
  conferir("GET /ambulantes/me sem login", (await chamar("GET", "/ambulantes/me")).status, 401);
  r = await chamar("GET", "/ambulantes/me", null, token);
  conferir("GET /ambulantes/me", r.status, 200);
  conferir("começa sem MEI", r.dados.possui_mei, false);
  conferir("não devolve o CPF", "cpf" in r.dados, false);
  conferir("turno salvo no cadastro", r.dados.turno, "Manhã");

  console.log("--- Antes de informar o MEI ---");
  r = await chamar("GET", "/pontos?status=disponivel");
  const ponto = r.dados.features?.[0]?.properties?.id;
  if (ponto) conferir("RN02: sem MEI não solicita", (await chamar("POST", "/solicitacoes", { ponto_id: ponto }, token)).status, 422);
  else console.log("     sem ponto disponível: os testes de solicitação foram pulados (rode database/resetar_pontos.sql)");

  console.log("--- Informar o MEI ---");
  conferir("PATCH sem login", (await chamar("PATCH", "/ambulantes/me", { cnpj_mei: cnpj })).status, 401);
  r = await chamar("PATCH", "/ambulantes/me", { cnpj_mei: "11.111.111/1111-11" }, token);
  conferir("CNPJ com dígitos iguais", r.status, 400);
  conferir("erro aponta o campo cnpj_mei", typeof r.dados.campos?.cnpj_mei, "string");
  conferir("CNPJ com dígito verificador errado", (await chamar("PATCH", "/ambulantes/me", { cnpj_mei: cnpj.slice(0, 13) + ((+cnpj[13] + 1) % 10) }, token)).status, 400);
  conferir("CNPJ vazio", (await chamar("PATCH", "/ambulantes/me", {}, token)).status, 400);
  r = await chamar("GET", "/ambulantes/me", null, token);
  conferir("CNPJ inválido não altera nada", r.dados.possui_mei, false);

  r = await chamar("PATCH", "/ambulantes/me", { cnpj_mei: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") }, token);
  conferir("CNPJ válido com máscara", r.status, 200);
  conferir("passa a ter MEI", r.dados.possui_mei, true);
  conferir("CNPJ salvo só com números", r.dados.cnpj_mei, cnpj);

  console.log("--- Depois de informar o MEI ---");
  if (ponto) conferir("RN02: com MEI solicita", (await chamar("POST", "/solicitacoes", { ponto_id: ponto }, token)).status, 201);

  if (process.env.TESTE_GESTOR_CPF && process.env.TESTE_GESTOR_SENHA) {
    console.log("--- Gestor ---");
    const tokenG = (await chamar("POST", "/auth/login", { cpf: process.env.TESTE_GESTOR_CPF, senha: process.env.TESTE_GESTOR_SENHA })).dados.token;
    conferir("gestor não usa /ambulantes/me (GET)", (await chamar("GET", "/ambulantes/me", null, tokenG)).status, 403);
    conferir("gestor não usa /ambulantes/me (PATCH)", (await chamar("PATCH", "/ambulantes/me", { cnpj_mei: cnpj }, tokenG)).status, 403);
  }

  console.log(falhas ? `\n${falhas} falha(s)` : "\nTodos os testes passaram");
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
