/* Ambulante Conecta — formalização (protótipo em localStorage; solicitação e mensagens já usam a API: js/situacao.js e js/comunicacao.js) */

const $ = (s) => document.querySelector(s);
let estado = lerEstado();
const salvar = () => { salvarEstado(estado); renderMenu(); };

/* ---------- Formalização ---------- */
function paginaFormalizacao() {
  const docs = ["Documento com foto e CPF", "Comprovante de residência", "Comprovante de inscrição no MEI (CCMEI)", "Foto do seu ponto ou carrinho"];

  function render() {
    ["mei", "licenca"].forEach((k) => {
      const ok = estado.formalizacao[k];
      $("#status-" + k).className = "status " + (ok ? "green" : "gray");
      $("#status-" + k).textContent = ok ? "Concluída" : "Não iniciada";
      $("#toggle-" + k).textContent = ok ? "Desmarcar etapa" : "Marcar como concluída";
    });
    $("#contagem").textContent = `${Object.values(estado.formalizacao).filter(Boolean).length} de 2 etapas`;
    $("#docs").innerHTML = docs.map((d, i) =>
      `<li><label class="check"><input type="checkbox" data-i="${i}" ${estado.docs.includes(i) ? "checked" : ""}> ${d}</label></li>`).join("");
  }

  ["mei", "licenca"].forEach((k) => $("#toggle-" + k).addEventListener("click", () => {
    estado.formalizacao[k] = !estado.formalizacao[k];
    salvar(); render();
  }));
  $("#docs").addEventListener("change", (e) => {
    const i = +e.target.dataset.i;
    estado.docs = e.target.checked ? [...new Set([...estado.docs, i])] : estado.docs.filter((x) => x !== i);
    salvar();
  });
  render();
}

({ formalizacao: paginaFormalizacao }[document.body.dataset.pagina] || (() => {}))();