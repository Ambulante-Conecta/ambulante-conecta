// Validações compartilhadas pelas rotas

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");

function cpfValido(valor) {
  const n = soDigitos(valor);
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  const dv = (t) => {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(n[i]) * (t + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
}

function cnpjValido(valor) {
  const n = soDigitos(valor);
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const dv = (t) => {
    const pesos = t === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(n[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(n[12]) && dv(13) === Number(n[13]);
}

// Aceita "AAAA-MM-DD" e confere se a data existe
function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === iso && d.getUTCFullYear() >= 1900;
}

function maiorDeIdade(iso) {
  const hoje = new Date();
  const limite = new Date(Date.UTC(hoje.getUTCFullYear() - 18, hoje.getUTCMonth(), hoje.getUTCDate()));
  return new Date(iso + "T00:00:00Z") <= limite;
}

// "Sim"/"Não"/true/false -> boolean (ou null se não der para entender)
function paraBooleano(v) {
  if (typeof v === "boolean") return v;
  const t = String(v ?? "").trim().toLowerCase();
  if (["true", "sim", "1"].includes(t)) return true;
  if (["false", "nao", "não", "0"].includes(t)) return false;
  return null;
}

module.exports = { soDigitos, cpfValido, cnpjValido, dataValida, maiorDeIdade, paraBooleano };