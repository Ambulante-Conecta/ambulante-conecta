// Uso único (na pasta backend-ambulante): node scripts/inserir-api-js.js
// Acrescenta js/api.js e css/responsivo.css em todas as páginas do front (menos o login, que já vem pronto).
// Não precisa fazer commit deste arquivo.
const fs = require("fs");
const path = require("path");

const pasta = path.join(__dirname, "..", "..", "frontend");
for (const arquivo of fs.readdirSync(pasta).filter((n) => n.endsWith(".html") && n !== "login.html")) {
  const caminho = path.join(pasta, arquivo);
  let html = fs.readFileSync(caminho, "utf8");
  let mudou = false;

  if (!html.includes("js/api.js") && /<script src="js\/app\.js"><\/script>/.test(html)) {
    html = html.replace(/([ \t]*)<script src="js\/app\.js"><\/script>/, (m, esp) => `${esp}<script src="js/api.js"></script>\n${esp}<script src="js/app.js"></script>`);
    mudou = true;
  }
  if (!html.includes("css/responsivo.css") && /<link rel="stylesheet" href="css\/style\.css">/.test(html)) {
    html = html.replace(/([ \t]*)<link rel="stylesheet" href="css\/style\.css">/, (m, esp) => `${esp}<link rel="stylesheet" href="css/style.css">\n${esp}<link rel="stylesheet" href="css/responsivo.css">`);
    mudou = true;
  }
  if (mudou) { fs.writeFileSync(caminho, html, "utf8"); console.log("atualizado:", arquivo); }
  else console.log("sem mudanças:", arquivo);
}