/* Ambulante Conecta — mapa de pontos de venda com Leaflet + OpenStreetMap (RF03), ligado à API.
   Depende de js/api.js, js/app.js e do Leaflet (carregue-os antes).
   Rota: GET /pontos (GeoJSON). Usado em index.html (mapa compacto) e em mapa.html (mapa, filtro e lista). */

(function () {
  const elMapa = document.getElementById("map");
  if (!elMapa) return;

  const porId = (id) => document.getElementById(id);
  const listaPontos = porId("listaPontos");   // só existe em mapa.html
  const filtro = porId("filtroStatus");       // só existe em mapa.html

  // Estado da tela (carregando, vazio, erro) logo abaixo do mapa
  const estado = document.createElement("div");
  estado.className = "mapa-estado";
  estado.setAttribute("aria-live", "polite");
  elMapa.after(estado);

  if (typeof L === "undefined") {
    estado.innerHTML = '<p class="vazio estado-erro" role="alert">Não foi possível carregar o mapa. Verifique a conexão com a internet e recarregue a página.</p>';
    return;
  }

  const podeSolicitar = perfilAtual() !== "gestor"; // o gestor não pede ponto
  const CENTRO_MANAUS = [-3.119, -60.0217];
  const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

  // O banco grava "disponível" (com acento) e "ocupado". As cores são as de --green e --red do style.css.
  const STATUS = {
    disponivel: { rotulo: "Disponível", classe: "green", cor: "#057A55" },
    ocupado:    { rotulo: "Ocupado",    classe: "red",   cor: "#DC2626" }
  };
  const infoStatus = (chave, original) => STATUS[chave] || { rotulo: original || "Sem status", classe: "gray", cor: "#6B7280" };

  const mapa = L.map(elMapa, { scrollWheelZoom: false }).setView(CENTRO_MANAUS, 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  const camada = L.layerGroup().addTo(mapa);

  // Legenda com a contagem por status
  const legenda = L.control({ position: "bottomright" });
  legenda.onAdd = () => L.DomUtil.create("div", "mapa-legenda");
  legenda.addTo(mapa);

  let pontos = [];
  const marcadores = new Map(); // id -> marcador, para o "Ver no mapa" da lista

  const linkSolicitar = (p) =>
    `<a class="btn btn-primary btn-sm" href="situacao.html?ponto=${Number(p.id)}#nova">Solicitar este ponto</a>`;

  function conteudoPopup(p) {
    const st = infoStatus(p.chave, p.status);
    return `<strong>${escHtml(p.descricao_local || "Ponto " + p.id)}</strong>
      ${p.bairro ? `<br><span class="muted">${escHtml(p.bairro)}</span>` : ""}
      <br><span class="status ${st.classe}">${escHtml(st.rotulo)}</span>
      ${p.chave === "disponivel" && podeSolicitar ? `<div class="popup-acao">${linkSolicitar(p)}</div>` : ""}`;
  }

  function criarCartao(p) {
    const st = infoStatus(p.chave, p.status);
    return `<article class="card solic-card">
      <div class="solic-top">
        <div><h3>${escHtml(p.descricao_local || "Ponto " + p.id)}</h3>${p.bairro ? `<p class="muted">${escHtml(p.bairro)}</p>` : ""}</div>
        <span class="status ${st.classe}">${escHtml(st.rotulo)}</span>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost btn-sm" data-ver="${Number(p.id)}">Ver no mapa</button>
        ${p.chave === "disponivel" && podeSolicitar ? linkSolicitar(p) : ""}
      </div>
    </article>`;
  }

  function desenhar({ enquadrar = true } = {}) {
    const escolhido = filtro?.querySelector("input:checked")?.value || "todos";
    const visiveis = escolhido === "todos" ? pontos : pontos.filter((p) => p.chave === escolhido);

    camada.clearLayers();
    marcadores.clear();
    visiveis.forEach((p) => {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 10, color: "#fff", weight: 3, fillColor: infoStatus(p.chave).cor, fillOpacity: 1
      }).bindPopup(conteudoPopup(p)).bindTooltip(escHtml(p.descricao_local || "Ponto " + p.id)); // o Leaflet insere como HTML
      m.addTo(camada);
      marcadores.set(p.id, m);
    });

    const conta = (chave) => pontos.filter((p) => p.chave === chave).length;
    legenda.getContainer().innerHTML =
      `<span><i class="ponto-cor" style="background:${STATUS.disponivel.cor}"></i>Disponível (${conta("disponivel")})</span>
       <span><i class="ponto-cor" style="background:${STATUS.ocupado.cor}"></i>Ocupado (${conta("ocupado")})</span>`;

    if (enquadrar && visiveis.length) {
      mapa.fitBounds(L.latLngBounds(visiveis.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
    }

    if (!pontos.length) estado.innerHTML = '<p class="vazio">Ainda não há pontos de venda cadastrados.</p>';
    else if (!visiveis.length) estado.innerHTML = '<p class="vazio">Nenhum ponto com esse filtro.</p>';
    else estado.innerHTML = "";

    if (listaPontos) listaPontos.innerHTML = visiveis.map(criarCartao).join("");
  }

  async function carregar() {
    estado.innerHTML = '<p class="vazio">Carregando pontos...</p>';
    try {
      const geo = await chamarApi("/pontos");
      pontos = (geo.features || [])
        .filter((f) => f.geometry?.type === "Point")
        .map((f) => ({
          ...f.properties,
          id: Number(f.properties.id),
          chave: normalizar(f.properties.status),
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1]
        }));
      desenhar();
    } catch (erro) {
      if (erro.status === 401) return; // api.js já levou para o login
      estado.innerHTML = `<div class="vazio estado-erro" role="alert"><p>${escHtml(erro.message)}</p>
        <div class="btn-row"><button type="button" class="btn btn-ghost">Tentar de novo</button></div></div>`;
      estado.querySelector("button").addEventListener("click", carregar);
    }
  }

  /* ---------- Início ---------- */
  filtro?.addEventListener("change", () => desenhar());

  // "Ver no mapa": centraliza o ponto e abre o balão (alternativa ao mapa para teclado e leitor de tela)
  listaPontos?.addEventListener("click", (e) => {
    const botao = e.target.closest("button[data-ver]");
    const m = botao && marcadores.get(Number(botao.dataset.ver));
    if (!m) return;
    elMapa.scrollIntoView({ behavior: "smooth", block: "center" });
    mapa.setView(m.getLatLng(), 17);
    m.openPopup();
  });

  // O gestor não pede ponto: some o botão do topo da página do mapa
  if (!podeSolicitar) document.querySelector('.page-head a[href^="situacao.html"]')?.setAttribute("hidden", "");

  carregar();
})();
