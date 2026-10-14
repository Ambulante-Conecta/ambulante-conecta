/* Ambulante Conecta — página inicial.
   Depende de js/api.js, js/icones.js e js/app.js (carregue-os antes).
   Visitante: "Como funciona" em 3 passos (já está no HTML).
   Ambulante: o destaque mostra o PRÓXIMO PASSO calculado pelos dados (MEI, pedido, mensagens) e, abaixo, a situação em lista.
   Gestor: o destaque leva aos pedidos pendentes e a lista mostra os números do dia.
   Rotas: GET /ambulantes/me · GET /solicitacoes/minhas · GET /mensagens/nao-lidas · GET /painel */

(function () {
  const usuario = Sessao.usuario();
  if (!usuario || !Sessao.token()) return; // visitante: o HTML já tem tudo

  const porId = (id) => document.getElementById(id);
  const bloco = porId("blocoPrincipal");
  const primeiroNome = escHtml(String(usuario.nome || "").trim().split(/\s+/)[0] || "");

  const STATUS_PEDIDO = {
    Pendente: { texto: "Em análise", cor: "orange" },
    Aprovada: { texto: "Aprovado", cor: "green" },
    Recusada: { texto: "Recusado", cor: "red" }
  };

  // Destaque: pequena linha de cima, título, texto e botões
  function destaque({ sobre, titulo, texto, acoes }) {
    porId("destaqueSobre").textContent = sobre;
    porId("saudacao").innerHTML = titulo;
    porId("destaqueTexto").innerHTML = texto;
    porId("destaqueAcoes").innerHTML = acoes;
  }
  const botao = (href, rotulo, classe = "btn-destaque", ic = "avancar") =>
    `<a class="btn ${classe}" href="${href}">${rotulo}${ic ? icone(ic) : ""}</a>`;

  // Uma linha da lista de situação: ícone, título, detalhe, selo e seta
  const linha = ({ href, ic, titulo, detalhe, selo, cor }) => `<li>
      <a class="situacao-linha" href="${href}">
        <span class="situacao-icone">${icone(ic)}</span>
        <span class="situacao-texto"><strong>${titulo}</strong>${detalhe ? `<span class="muted">${detalhe}</span>` : ""}</span>
        ${selo ? `<span class="status ${cor}">${selo}</span>` : ""}
        <span class="situacao-seta">${icone("avancar")}</span>
      </a></li>`;

  function prepararBloco(titulo) {
    bloco.innerHTML = `<h2 class="inicio-titulo" id="t-principal">${titulo}</h2><div id="situacao"></div>`;
    return porId("situacao");
  }

  /* ---------- Ambulante ---------- */
  async function inicioAmbulante() {
    destaque({
      sobre: "Sua conta",
      titulo: `Olá, ${primeiroNome}!`,
      texto: "Carregando sua situação...",
      acoes: ""
    });
    const area = prepararBloco("Sua situação");
    mostrarCarregando(area, 1, "Carregando sua situação...");

    try {
      const [eu, minhas] = await Promise.all([chamarApi("/ambulantes/me"), chamarApi("/solicitacoes/minhas"), atualizarNaoLidas()]);
      const pendente = minhas.find((s) => s.status === "Pendente");
      const ultimo = minhas[0];
      const nomePonto = (s) => escHtml(s.ponto || "Ponto " + s.ponto_id);
      const msgs = totalNaoLidas;
      const linkMsgs = msgs ? botao("comunicacao.html", `Ler ${msgs} ${msgs > 1 ? "mensagens novas" : "mensagem nova"}`, "btn-contorno-claro", "") : "";

      // Próximo passo: uma só ação principal, a que destrava o caminho
      let passo;
      if (!eu.possui_mei) {
        passo = { texto: "Seu próximo passo: <strong>informar o CNPJ do seu MEI</strong>. Sem ele não é possível pedir um ponto.",
          acoes: botao("formalizacao.html#mei", "Informar meu MEI") };
      } else if (pendente) {
        passo = { texto: `Seu pedido para <strong>${nomePonto(pendente)}</strong> está em análise. Avisamos em Mensagens quando houver resposta.`,
          acoes: botao("situacao.html", "Acompanhar pedido") };
      } else if (ultimo?.status === "Aprovada") {
        passo = { texto: `O ponto <strong>${nomePonto(ultimo)}</strong> é seu. Tudo certo por aqui.`,
          acoes: botao("situacao.html", "Ver meu pedido") };
      } else if (ultimo?.status === "Recusada") {
        passo = { texto: "Seu último pedido foi recusado. Veja o motivo e escolha outro ponto livre.",
          acoes: botao("situacao.html", "Ver o motivo") };
      } else {
        passo = { texto: "Está tudo pronto para você <strong>pedir seu ponto de venda</strong>.",
          acoes: botao("situacao.html#nova", "Escolher um ponto") };
      }
      destaque({ sobre: "Seu próximo passo", titulo: `Olá, ${primeiroNome}!`, texto: passo.texto, acoes: passo.acoes + linkMsgs });

      const pedido = ultimo ? STATUS_PEDIDO[ultimo.status] : null;
      area.removeAttribute("aria-busy");
      area.innerHTML = `<ul class="situacao-lista">
        ${linha({ href: "formalizacao.html#mei", ic: "selo", titulo: "MEI",
          detalhe: eu.possui_mei ? "CNPJ informado" : "Informe o CNPJ para pedir um ponto",
          selo: eu.possui_mei ? "Informado" : "Pendente", cor: eu.possui_mei ? "green" : "orange" })}
        ${linha({ href: "situacao.html", ic: "pedido", titulo: "Pedido de ponto",
          detalhe: ultimo ? nomePonto(ultimo) : "Você ainda não fez nenhum pedido",
          selo: pedido ? pedido.texto : "Nenhum", cor: pedido ? pedido.cor : "gray" })}
        ${linha({ href: "comunicacao.html", ic: "mensagem", titulo: "Mensagens",
          detalhe: msgs ? "Chegou novidade da prefeitura" : "Converse com a prefeitura",
          selo: msgs ? `${msgs} ${msgs > 1 ? "novas" : "nova"}` : "Em dia", cor: msgs ? "orange" : "green" })}
      </ul>`;
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      destaque({ sobre: "Sua conta", titulo: `Olá, ${primeiroNome}!`, texto: "Não foi possível carregar sua situação agora.", acoes: botao("situacao.html", "Ir para Meu pedido") });
      mostrarErroCarga(area, erro, inicioAmbulante);
    }
  }

  /* ---------- Gestor ---------- */
  async function inicioGestor() {
    destaque({ sobre: "Painel da prefeitura", titulo: `Olá, ${primeiroNome}!`, texto: "Carregando os números de hoje...", acoes: "" });
    const area = prepararBloco("Hoje no sistema");
    mostrarCarregando(area, 1, "Carregando os números...");
    try {
      const p = await chamarApi("/painel");
      const pend = p.solicitacoes.pendentes;
      const msgs = p.mensagens_nao_lidas;
      destaque({
        sobre: "Painel da prefeitura",
        titulo: `Olá, ${primeiroNome}!`,
        texto: pend
          ? `<strong>${pend} ${pend > 1 ? "pedidos aguardam" : "pedido aguarda"}</strong> a sua decisão.`
          : "Nenhum pedido aguardando decisão no momento.",
        acoes: botao("painel.html#pendentes", pend ? "Avaliar pedidos" : "Abrir o painel") +
          (msgs ? botao("painel.html#mensagens", `${msgs} ${msgs > 1 ? "mensagens novas" : "mensagem nova"}`, "btn-contorno-claro", "") : "")
      });
      area.removeAttribute("aria-busy");
      area.innerHTML = `<ul class="situacao-lista">
        ${linha({ href: "painel.html#pendentes", ic: "relogio", titulo: "Pedidos pendentes", detalhe: "Aguardando aprovação ou recusa",
          selo: String(pend), cor: pend ? "orange" : "green" })}
        ${linha({ href: "painel.html#mensagens", ic: "mensagem", titulo: "Mensagens não lidas", detalhe: "Enviadas pelos ambulantes",
          selo: String(msgs), cor: msgs ? "orange" : "green" })}
        ${linha({ href: "mapa.html", ic: "mapa", titulo: "Pontos de venda", detalhe: `${p.pontos.ocupados} ocupados`,
          selo: `${p.pontos.disponiveis} livres`, cor: "blue" })}
        ${linha({ href: "painel.html", ic: "usuario", titulo: "Ambulantes cadastrados", detalhe: `${p.ambulantes.com_mei} com MEI`,
          selo: String(p.ambulantes.total), cor: "gray" })}
      </ul>`;
    } catch (erro) {
      if (erro.status === 401) return;
      destaque({ sobre: "Painel da prefeitura", titulo: `Olá, ${primeiroNome}!`, texto: "Não foi possível carregar os números agora.", acoes: botao("painel.html", "Abrir o painel") });
      mostrarErroCarga(area, erro, inicioGestor);
    }
  }

  if (usuario.perfil === "gestor") inicioGestor();
  else inicioAmbulante();
})();
