const express = require("express");

module.exports = (pool) => {
  const router = express.Router();
  router.use(require("./auth")(pool));
  router.use(require("./ambulantes")(pool));
  router.use(require("./pontos")(pool));
  router.use(require("./solicitacoes")(pool));
  router.use(require("./avaliacoes")(pool));
  router.use(require("./mensagens")(pool));
  router.use(require("./painel")(pool));
  return router;
};