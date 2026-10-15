/* Ambulante Conecta — recuperação de senha pelo próprio site.
   Depende de js/api.js e js/icones.js (carregue-os antes).
   Rotas: POST /auth/recuperar-senha/verificar · POST /auth/recuperar-senha/nova
   Não há envio de código por SMS ou e-mail: a pessoa confirma CPF + nascimento + celular OU e-mail do cadastro.
   Heurísticas: etapa visível (1), escolha entre celular e e-mail (7), regras da senha ao vivo (5),
   erro que não revela qual dado está errado, mas diz o que conferir (9), ajuda para quem não lembra (10). */

(function () {
  // Quem já está logado não precisa recuperar a senha
  if (Sessao.token()) { location.replace("index.html"); return; }

  const porId = (id) => document.getElementById(id);
  const formDados = porId("formDados");
  const formSenha = porId("formSenha");
  const campoContato = porId("contato");
  let tokenRecuperacao = null;

  const digitos = (v) => String(v ?? "").replace(/\D/g, "");
  const meio = () => formDados.querySelector('input[name="meio"]:checked').value;
  const REGRAS_SENHA = {
    tamanho: (s) => s.length >= 8 && s.length <= 72,
    letra: (s) => /[A-Za-z]/.test(s),
    numero: (s) => /\d/.test(s)
  };

  function mostrarErro(form, campo, msg) {
    porId("erro-" + campo).textContent = msg;
    const el = form.elements[campo];
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    el.classList.toggle("invalido", !!msg);
  }

  function ocupado(botao, sim, texto) {
    botao.disabled = sim;
    botao.classList.toggle("carregando", sim);
    if (texto) botao.innerHTML = texto;
  }

  function irParaEtapa(n) {
    porId("etapaTexto").innerHTML = n === 1 ? "<strong>Etapa 1 de 2:</strong> confirmar seus dados" : "<strong>Etapa 2 de 2:</strong> criar a senha nova";
    porId("etapaBarra").style.width = n === 1 ? "50%" : "100%";
    document.querySelector(".etapas-barra").setAttribute("aria-valuenow", String(n));
    formDados.hidden = n !== 1;
    formSenha.hidden = n !== 2;
  }

  /* ---------- Máscaras e escolha do meio ---------- */
  const mascaraCpf = (n) => n.slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  const mascaraCel = (n) => n.slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");

  formDados.elements.cpf.addEventListener("input", (e) => { e.target.value = mascaraCpf(digitos(e.target.value)); mostrarErro(formDados, "cpf", ""); });
  formDados.elements.nascimento.addEventListener("input", () => mostrarErro(formDados, "nascimento", ""));
  campoContato.addEventListener("input", () => {
    if (meio() === "celular") campoContato.value = mascaraCel(digitos(campoContato.value));
    mostrarErro(formDados, "contato", "");
  });

  // Celular ou e-mail: muda o rótulo, o teclado do celular e o preenchimento automático
  formDados.addEventListener("change", (e) => {
    if (e.target.name !== "meio") return;
    const celular = meio() === "celular";
    porId("rotuloContato").textContent = celular ? "Celular do cadastro, com DDD" : "E-mail do cadastro";
    campoContato.type = celular ? "tel" : "email";
    campoContato.inputMode = celular ? "numeric" : "email";
    campoContato.autocomplete = celular ? "tel-national" : "email";
    campoContato.placeholder = celular ? "(92) 91234-5678" : "nome@email.com";
    campoContato.maxLength = celular ? 15 : 120;
    campoContato.value = "";
    mostrarErro(formDados, "contato", "");
    porId("erroDados").textContent = "";
  });

  /* ---------- Etapa 1: confirmar os dados ---------- */
  formDados.addEventListener("submit", async (e) => {
    e.preventDefault();
    porId("erroDados").textContent = "";
    const cpf = digitos(formDados.elements.cpf.value);
    const nascimento = formDados.elements.nascimento.value;
    const contato = campoContato.value.trim();
    const celular = meio() === "celular";
    const erros = {
      cpf: cpf.length === 11 ? "" : "Informe os 11 números do seu CPF.",
      nascimento: /^\d{4}-\d{2}-\d{2}$/.test(nascimento) ? "" : "Informe a data de nascimento (dia, mês e ano).",
      contato: celular
        ? (digitos(contato).length === 11 ? "" : "Informe o celular com DDD: são 11 números.")
        : (/^\S+@\S+\.\S+$/.test(contato) ? "" : "Informe o e-mail completo, como nome@email.com.")
    };
    Object.entries(erros).forEach(([c, m]) => mostrarErro(formDados, c, m));
    const primeiro = Object.keys(erros).find((c) => erros[c]);
    if (primeiro) return formDados.elements[primeiro].focus();

    const botao = porId("btnDados");
    ocupado(botao, true, "Conferindo...");
    try {
      const r = await chamarApi("/auth/recuperar-senha/verificar", {
        metodo: "POST",
        corpo: { cpf, data_nascimento: nascimento, meio: meio(), contato: celular ? digitos(contato) : contato }
      });
      tokenRecuperacao = r.token;
      irParaEtapa(2);
      porId("dadosOk").focus();
    } catch (erro) {
      // 401: dados não conferem (mensagem única); 429: muitas tentativas; 0: sem conexão
      porId("erroDados").textContent = erro.message;
    } finally {
      ocupado(botao, false, `Confirmar meus dados${icone("avancar")}`);
    }
  });

  /* ---------- Etapa 2: senha nova ---------- */
  function atualizaRegras() {
    const senha = formSenha.elements.novaSenha.value;
    document.querySelectorAll("#regrasSenha li").forEach((li) => {
      const ok = REGRAS_SENHA[li.dataset.regra](senha);
      li.classList.toggle("ok", ok);
      li.querySelector(".sr-only")?.remove();
      li.insertAdjacentHTML("beforeend", `<span class="sr-only">${ok ? " (cumprida)" : " (falta)"}</span>`);
    });
  }
  formSenha.elements.novaSenha.addEventListener("input", () => { atualizaRegras(); mostrarErro(formSenha, "novaSenha", ""); });
  formSenha.elements.repetirSenha.addEventListener("input", () => mostrarErro(formSenha, "repetirSenha", ""));
  document.querySelectorAll(".mostrar-senha").forEach((b) => b.addEventListener("click", () => {
    const campo = porId(b.dataset.alvo);
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    b.textContent = mostrar ? "Ocultar" : "Mostrar";
    b.setAttribute("aria-pressed", mostrar ? "true" : "false");
  }));

  formSenha.addEventListener("submit", async (e) => {
    e.preventDefault();
    porId("erroSenha").textContent = "";
    const nova = formSenha.elements.novaSenha.value;
    const repetir = formSenha.elements.repetirSenha.value;
    const fraca = !Object.values(REGRAS_SENHA).every((r) => r(nova));
    mostrarErro(formSenha, "novaSenha", fraca ? "A senha ainda não cumpre as regras marcadas acima." : "");
    mostrarErro(formSenha, "repetirSenha", !fraca && nova !== repetir ? "As duas senhas estão diferentes. Digite a mesma senha nos dois campos." : "");
    if (fraca) return formSenha.elements.novaSenha.focus();
    if (nova !== repetir) return formSenha.elements.repetirSenha.focus();

    const botao = porId("btnSenha");
    ocupado(botao, true, "Salvando...");
    try {
      await chamarApi("/auth/recuperar-senha/nova", { metodo: "POST", corpo: { token: tokenRecuperacao, nova_senha: nova } });
      tokenRecuperacao = null;
      formSenha.hidden = true;
      porId("etapasRec").hidden = true;
      porId("ajudaDados").hidden = true;
      porId("sucesso").hidden = false;
      porId("sucesso").focus();
    } catch (erro) {
      if (erro.status === 401) {
        // Passaram os 10 minutos (ou o link já foi usado): volta para confirmar os dados
        tokenRecuperacao = null;
        formSenha.reset();
        atualizaRegras();
        irParaEtapa(1);
        porId("erroDados").textContent = erro.message;
        formDados.elements.cpf.focus();
      } else {
        porId("erroSenha").textContent = erro.campos?.nova_senha || erro.message;
      }
    } finally {
      ocupado(botao, false, `${icone("check")}Salvar senha nova`);
    }
  });

  formDados.elements.nascimento.max = new Date().toISOString().slice(0, 10);
  atualizaRegras();
})();
