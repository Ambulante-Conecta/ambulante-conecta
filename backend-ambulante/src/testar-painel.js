// Testa o bloco 6 (painel do gestor). Precisa do gestor de teste:
//   $env:TESTE_GESTOR_CPF="..."; $env:TESTE_GESTOR_SENHA="..."; node testar-painel.js
const BASE = process.env.API || "http://localhost:3000/api";
const SENHA = "Teste@12345";
if (!process.env.TESTE_GESTOR_CPF || !process.env.TESTE_GESTOR_SENHA) {
  console.error("Defina TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA antes de rodar.");
  process.exit(1);
}

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
const soma = (lista, campo) => lista.reduce((t, x) => t + x[campo], 0);

(async () => {
  const tokenG = (await chamar("POST", "/auth/login", { cpf: process.env.TESTE_GESTOR_CPF, senha: process.env.TESTE_GESTOR_SENHA })).dados.token;
  if (!tokenG) return console.error("Login do gestor falhou: confira CPF e senha.");

  const antes = await chamar("GET", "/painel", null, tokenG); // foto do painel antes do cadastro de teste
  const cpf = gerarCpf();
  const cad = await chamar("POST", "/ambulantes", { nome_completo: "Teste Painel Lima", cpf, data_nascimento: "1989-11-20", telefone: "92933334444",
    tipo_atividade: "Vestuário", possui_mei: false, local_pretendido: "Centro", turno: "Manhã", senha: SENHA, consentimento: true });
  const tokenA = (await chamar("POST", "/auth/login", { cpf, senha: SENHA })).dados.token;

  console.log("--- Permissões ---");
  conferir("sem login", (await chamar("GET", "/painel")).status, 401);
  conferir("ambulante não acessa o painel", (await chamar("GET", "/painel", null, tokenA)).status, 403);

  console.log("--- Conteúdo ---");
  conferir("gestor acessa o painel", antes.status, 200);
  const p = antes.dados;
  conferir("por_atividade soma o total de ambulantes", soma(p.por_atividade, "total"), p.ambulantes.total);
  conferir("por_bairro soma o total de pontos", soma(p.por_bairro, "total"), p.pontos.total);
  conferir("disponíveis + ocupados não passam do total", p.pontos.disponiveis + p.pontos.ocupados <= p.pontos.total, true);
  conferir("status das solicitações não passam do total", p.solicitacoes.pendentes + p.solicitacoes.aprovadas + p.solicitacoes.recusadas <= p.solicitacoes.total, true);
  conferir("nenhum dado pessoal no painel (RNF05, LGPD)", /"(cpf|nome_completo|email|telefone|senha)"/.test(JSON.stringify(p)), false);

  console.log("--- O painel acompanha os dados ---");
  conferir("cadastro de teste criado", cad.status, 201);
  const depois = (await chamar("GET", "/painel", null, tokenG)).dados;
  conferir("total de ambulantes subiu 1", depois.ambulantes.total, p.ambulantes.total + 1);
  const atv = (lista) => lista.find((a) => a.atividade === "Vestuário")?.total ?? 0;
  conferir("atividade 'Vestuário' subiu 1", atv(depois.por_atividade), atv(p.por_atividade) + 1);

  console.log(falhas ? `\n${falhas} teste(s) com FALHA` : "\nTodos os testes passaram");
})();