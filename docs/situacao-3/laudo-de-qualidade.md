# Laudo de Qualidade · Cupcake Store v1.1.0

Tarefa E9-04 do plano de execução. Cinco usuários testaram a versão **1.0.0** em produção, pelo celular. O fluxo principal (catálogo → carrinho → pedido → código de retirada) funcionou para todos. Foram encontrados **4 problemas**, todos corrigidos na versão **1.1.0**.

## Problemas e correções

| # | Problema relatado | Testadores | Severidade | Correção |
|---|---|---|---|---|
| 1 | O horário de retirada ignorava o funcionamento da loja (ex.: um pedido às 22h ficava pronto com a loja fechada) | 1, 4 | Alta | O horário de retirada segue o funcionamento (ter. a dom., 10h–19h). Um pedido feito com a loja fechada fica pronto na próxima abertura (BR-12) |
| 2 | O cartão do pedido sumia da página inicial na virada do dia | 2, 4 | Alta | A regra "só pedidos de hoje" foi removida. O cartão aparece enquanto o pedido aguarda retirada. Pedidos não retirados expiram no fechamento e o estoque volta (BR-19, BR-20) |
| 3 | Com mais de um pedido, só o último ficava acessível | 1, 3, 5 | Média | Até 5 pedidos ativos aparecem na página inicial, um cartão por pedido, e cada cartão abre o seu pedido (US-22) |
| 4 | Faltava orientação para encomendas acima de 20 unidades | 5 | Baixa | Ao atingir o limite aparece "Máximo de 20 unidades. Para encomendas maiores, fale com a loja." (US-06) |

## Verificação

Cada correção tem testes automatizados que rodam na integração contínua (GitHub Actions): testes unitários, testes de API contra um banco PostgreSQL real e testes de ponta a ponta.

| # | Testes (o nome cita a regra) |
|---|---|
| 1 | `BR-12 pickup schedule` (`packages/shared`), `BR-12 pickup schedule from the store's opening hours` (API): pedidos às 22h, na segunda-feira e às 18h31 |
| 2 | `BR-19 active orders store`, `BR-20 order expiry and stock release`: estoque devolvido uma única vez, inclusive com requisições simultâneas |
| 3 | `US-22 active order cards on the home page`: um pedido do dia anterior continua visível |
| 4 | `US-06 client quantity limits`: a mensagem aparece só quando o limite é o de 20, não o estoque |

Correções no commit [`66d6054`](https://github.com/tiagopacedev/cupcake-app/commit/66d6054).

## Evidências

O "antes" está registrado no relato de cada testador. O "depois" é comprovado pelas capturas de tela da versão corrigida e pela execução dos testes:

- [ ] Meu pedido feito fora do horário, com o horário de retirada na próxima abertura
- [ ] Página inicial com dois ou mais cartões de pedido
- [ ] Meu pedido com o prazo de retirada ("Retire até …")
- [ ] Mensagem do limite de 20 unidades
- [ ] Execução dos testes (GitHub Actions ou `pnpm test`) com todos passando

## Resultado

Os 4 problemas foram corrigidos e nenhum ficou em aberto. Pagamento online continua fora do escopo: o pagamento é feito na loja (BR-09).
