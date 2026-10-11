// Roda todos os roteiros de teste e guarda o resultado em resultados-testes/ (evidência para os Resultados do artigo).
// Uso (servidor ligado):  $env:TESTE_GESTOR_CPF="..."; $env:TESTE_GESTOR_SENHA="..."; npm test
// Cada execução ocupa um ponto de venda. Para liberar de novo: database/resetar_pontos.sql
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (!process.env.TESTE_GESTOR_CPF || !process.env.TESTE_GESTOR_SENHA) {
  console.error("Defina TESTE_GESTOR_CPF e TESTE_GESTOR_SENHA antes de rodar.");
  process.exit(1);
}
const roteiros = ["testar-api.js", "testar-avaliacao.js", "testar-mensagens.js", "testar-painel.js"];
const agora = new Date();
let relatorio = `Teste completo da API - ${agora.toLocaleString("pt-BR")}\n`;
let totalOk = 0, totalFalhas = 0;

for (const roteiro of roteiros) {
  const r = spawnSync(process.execPath, [path.join(__dirname, roteiro)], { encoding: "utf8", env: process.env });
  const texto = `${r.stdout || ""}${r.stderr || ""}`;
  const ok = (texto.match(/^OK/gm) || []).length;
  const falhas = (texto.match(/^FALHA/gm) || []).length + (r.status !== 0 ? 1 : 0);
  totalOk += ok; totalFalhas += falhas;
  relatorio += `\n===== ${roteiro} =====\n${texto}`;
  console.log(`${falhas ? "FALHA" : "OK   "} ${roteiro}: ${ok} verificações corretas, ${falhas} problema(s)`);
}

relatorio += `\nResumo: ${totalOk} verificações corretas, ${totalFalhas} problema(s)\n`;
const pasta = path.join(__dirname, "..", "resultados-testes"); // fica na raiz do back-end, junto dos relatórios antigos
fs.mkdirSync(pasta, { recursive: true });
const nome = `${agora.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.txt`;
fs.writeFileSync(path.join(pasta, nome), relatorio, "utf8");
console.log(`\n${totalFalhas ? "Há problemas." : "Todos os testes passaram."} Relatório salvo em resultados-testes/${nome}`);
process.exit(totalFalhas ? 1 : 0);