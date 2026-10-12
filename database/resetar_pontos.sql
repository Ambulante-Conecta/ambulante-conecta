-- Libera de novo os pontos usados nos testes (deixa so os pontos 1 e 2 ocupados, como no seed).
-- Nao apaga ambulantes, usuarios nem solicitacoes.
-- U&'...' escreve o acento sem usar caracteres fora do ASCII (dispon\00EDvel = disponivel com acento).
UPDATE pontos_venda
   SET status = U&'dispon\00EDvel', ambulante_id = NULL
 WHERE id > 2;