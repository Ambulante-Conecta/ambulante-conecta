/* Ambulante Conecta — ícones SVG embutidos (traço no estilo Lucide, licença ISC).
   Carregue antes de app.js. Uso no JS: icone("casa") ; no HTML: <svg class="ico" aria-hidden="true"><use href="#i-casa"/></svg>
   Os ícones são decorativos (aria-hidden): o texto ao lado é que dá o significado. */

const ICONES = {
  casa:       '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
  mapa:       '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  selo:       '<circle cx="12" cy="9" r="6"/><path d="M8.5 13.8 7 22l5-3 5 3-1.5-8.2"/>',
  ficha:      '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  pedido:     '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M5 13.5V21h14v-7.5"/><path d="M10 21v-5h4v5"/>',
  mensagem:   '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/>',
  painel:     '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  entrar:     '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  sair:       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu:       '<path d="M4 6h16M4 12h16M4 18h16"/>',
  fechar:     '<path d="M18 6 6 18M6 6l12 12"/>',
  check:      '<path d="M20 6 9 17l-5-5"/>',
  "check-circulo": '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  relogio:    '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  "x-circulo": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  alerta:     '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info:       '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  ajuda:      '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  "sem-rede": '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.4-1.7M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01"/>',
  recarregar: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  voltar:     '<path d="m12 19-7-7 7-7M19 12H5"/>',
  avancar:    '<path d="M5 12h14M12 5l7 7-7 7"/>',
  enviar:     '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mais:       '<path d="M12 5v14M5 12h14"/>',
  olho:       '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  "olho-fechado": '<path d="M2 2l20 20M6.7 6.7C3.9 8.3 2 12 2 12s3.5 7 10 7c2 0 3.8-.6 5.3-1.6M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  editar:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  documento:  '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/>',
  usuario:    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};

// Devolve o <svg> de um ícone. Com "rotulo", o ícone é lido pelo leitor de tela; sem ele, é só decoração.
function icone(nome, rotulo) {
  const acess = rotulo ? `role="img" aria-label="${String(rotulo).replace(/"/g, "&quot;")}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="ico" ${acess}><use href="#i-${nome}"/></svg>`;
}

// Coloca a "folha" de ícones no início da página, para os <use href="#i-..."> funcionarem
(function () {
  const simbolos = Object.entries(ICONES).map(([nome, d]) => `<symbol id="i-${nome}" viewBox="0 0 24 24">${d}</symbol>`).join("");
  // Tamanho zero em vez de display:none: alguns navegadores não desenham <use> de um bloco escondido
  const folha = document.createElement("div");
  folha.setAttribute("aria-hidden", "true");
  folha.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  folha.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${simbolos}</svg>`;
  document.body.prepend(folha);
})();
