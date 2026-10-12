// Testa o bloco 5 (mensagens). Precisa do gestor de teste:
//   $env:TESTE_GESTOR_CPF="..."; $env:TESTE_GESTOR_SENHA="..."; node testar-mensagens.js
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
async function novoAmbulante() {
  const cpf = gerarCpf();
  const c = await chamar("POST", "/ambulantes", { nome_completo: "Teste Mensagens Souza", cpf, data_nascimento: "1992-07-15", telefone: "92922223333",
    tipo_atividade: "Artesanato", possui_mei: false, local_pretendido: "Centro", turno: "Manhã", senha: SENHA, consentimento: true });
  const token = (await chamar("POST", "/auth/login", { cpf, senha: SENHA })).dados.token;
  return { id: c.dados.id, token };
}

(async () => {
  const tokenG = (await chamar("POST", "/auth/login", { cpf: process.env.TESTE_GESTOR_CPF, senha: process.env.TESTE_GESTOR_SENHA })).dados.token;
  if (!tokenG) return console.error("Login do gestor falhou: confira CPF e senha.");
  const A = await novoAmbulante(), B = await novoAmbulante();

  console.log("--- Envio pelo ambulante ---");
  conferir("enviar sem login", (await chamar("POST", "/mensagens", { assunto: "Oi", texto: "Olá" })).status, 401);
  conferir("sem assunto", (await chamar("POST", "/mensagens", { assunto: "", texto: "Olá" }, A.token)).status, 400);
  conferir("texto grande demais", (await chamar("POST", "/mensagens", { assunto: "Oi", texto: "x".repeat(1001) }, A.token)).status, 400);
  let r = await chamar("POST", "/mensagens", { assunto: "Dúvida sobre o ponto", texto: "Posso trocar o turno do meu pedido?" }, A.token);
  conferir("ambulante envia", r.status, 201);
  conferir("remetente registrado como ambulante", r.dados.remetente, "ambulante");
  const msgA = r.dados.id;

  console.log("--- Caixa de entrada do gestor ---");
  conferir("ambulante não vê conversas do gestor", (await chamar("GET", "/mensagens/conversas", null, A.token)).status, 403);
  conferir("gestor sem ambulante_id", (await chamar("GET", "/mensagens", null, tokenG)).status, 400);
  r = await chamar("GET", "/mensagens/conversas", null, tokenG);
  conferir("gestor lista conversas", r.status, 200);
  conferir("conversa do ambulante aparece com 1 não lida", r.dados.find((c) => c.ambulante_id === A.id)?.nao_lidas, 1);
  r = await chamar("GET", `/mensagens?ambulante_id=${A.id}`, null, tokenG);
  conferir("gestor lê a conversa", r.dados.some((m) => m.id === msgA), true);

  console.log("--- Resposta do gestor ---");
  conferir("gestor sem ambulante_id ao responder", (await chamar("POST", "/mensagens", { assunto: "Re", texto: "Resposta" }, tokenG)).status, 400);
  conferir("ambulante inexistente", (await chamar("POST", "/mensagens", { ambulante_id: 999999999, assunto: "Re", texto: "Resposta" }, tokenG)).status, 404);
  r = await chamar("POST", "/mensagens", { ambulante_id: A.id, assunto: "Re: Dúvida sobre o ponto", texto: "Sim, abra uma nova solicitação." }, tokenG);
  conferir("gestor responde", r.status, 201);
  conferir("remetente registrado como gestor", r.dados.remetente, "gestor");
  const respostaId = r.dados.id;

  console.log("--- Leitura pelo ambulante ---");
  conferir("ambulante tem 1 não lida", (await chamar("GET", "/mensagens/nao-lidas", null, A.token)).dados.total, 1);
  r = await chamar("GET", "/mensagens", null, A.token);
  conferir("ambulante vê a resposta", r.dados.some((m) => m.id === respostaId), true);
  conferir("ambulante não marca a própria como lida", (await chamar("PATCH", `/mensagens/${msgA}/lida`, null, A.token)).status, 404);
  conferir("marca a resposta como lida", (await chamar("PATCH", `/mensagens/${respostaId}/lida`, null, A.token)).status, 200);
  conferir("contador zera", (await chamar("GET", "/mensagens/nao-lidas", null, A.token)).dados.total, 0);

  console.log("--- Isolamento entre ambulantes ---");
  conferir("B não vê mensagens de A", (await chamar("GET", "/mensagens", null, B.token)).dados.length, 0);
  conferir("B não marca mensagem de A", (await chamar("PATCH", `/mensagens/${respostaId}/lida`, null, B.token)).status, 404);

  console.log("--- Leitura pelo gestor ---");
  r = await chamar("PATCH", "/mensagens/lidas", { ambulante_id: A.id }, tokenG);
  conferir("gestor marca a conversa como lida", r.dados.atualizadas, 1);
  r = await chamar("GET", "/mensagens/conversas", null, tokenG);
  conferir("conversa sem não lidas", r.dados.find((c) => c.ambulante_id === A.id)?.nao_lidas, 0);

  console.log(falhas ? `\n${falhas} teste(s) com FALHA` : "\nTodos os testes passaram");
})();