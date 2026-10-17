# Kit de teste com usuários · Cupcake Store

Material para recrutar e conduzir os testes da **Situação 3** (tarefa E9-01 do plano de execução). Cada pessoa testa sozinha, no próprio celular, em cerca de 10 minutos. As perguntas do questionário seguem os campos da tabela "Testes da Solução" do modelo da universidade, então as respostas entram no relatório sem reescrita.

- **Aplicação (produção):** https://cupcake-app-iota.vercel.app
- **Quantas pessoas:** 5 testadores + 1 reserva (prazo para confirmar: 31 de outubro; janela de testes: 7 a 10 de novembro, E9-02)
- **Regra de ouro:** as respostas registradas são **somente** as de pessoas reais que usaram a aplicação. Não complete, "melhore" ou invente respostas.

---

## 1. Mensagem de convite (WhatsApp)

> Oi, [nome]! Tudo bem? 🧁
> Estou fazendo um trabalho da faculdade (Engenharia de Software) e preciso de 5 pessoas para testar uma loja de cupcakes que eu desenvolvi. Leva uns 10 minutos, pelo celular, e você não precisa instalar nada.
>
> 1) Abra: https://cupcake-app-iota.vercel.app
> 2) Siga as 6 tarefas do roteiro que vou te mandar
> 3) Responda ao questionário curto: [link do Google Forms]
>
> Pode usar nome e celular fictícios no pedido. Não existe pagamento: é só um pedido de teste, e o pagamento seria feito na loja. Consegue fazer até [data]? Muito obrigado!

---

## 2. Consentimento e privacidade

Texto para o início do questionário (R-06, A-08, NFR-06):

> Este teste faz parte de um trabalho acadêmico (PIT II). Ao participar, você concorda que **seu nome e suas respostas** apareçam no relatório de testes entregue à universidade. Nenhum dado pessoal real é necessário: no pedido você pode usar um nome e um celular fictícios (por exemplo, `(11) 91234-5678`). Os pedidos feitos no teste não são entregues nem cobrados.

Campo obrigatório do formulário: **"Concordo em participar e em ter meu nome e minhas respostas no relatório"** (Sim / Não). Quem responder "Não" não entra no relatório.

---

## 3. Roteiro de tarefas

Enviar junto com o convite. Peça que a pessoa **pense em voz alta** (ou anote o que estranhou) e **não ajude** durante o teste: dúvidas do testador são o dado mais valioso.

| # | Tarefa (texto para o testador) | O que observar (não mostrar ao testador) |
|---|---|---|
| T1 | Abra a loja e encontre os cupcakes de **chocolate** usando os filtros. Diga quais estão disponíveis e se algum está acabando ou esgotado. | Acha os filtros? Entende "Restam N" e "Esgotado"? (US-01, US-02, US-04) |
| T2 | Adicione **2 unidades** de um cupcake ao carrinho. Depois escolha o **Cookies & Cream** e tente colocar mais unidades do que a loja tem. | Entende o limite de estoque e a mensagem? Percebe o contador do carrinho? (US-05, US-06, US-07) |
| T3 | Abra o **carrinho**, mude uma quantidade e **remova** um item. | Acha o controle de quantidade e a confirmação ao remover? Entende o total? (US-08, US-09) |
| T4 | Siga para **Finalizar pedido**. Primeiro digite um celular errado (por exemplo `123`) e veja o que acontece. Depois corrija e faça o pedido com um nome e um celular fictícios. | A mensagem de erro é clara? Entende que o pagamento é na loja? (US-12, US-14, US-15) |
| T5 | Na tela **Meu pedido**, copie o código. Volte ao início e reabra o pedido pelo cartão "Seu pedido". | Encontra o código? O cartão do início aparece? (US-16, US-18, US-22) |
| T6 | **Uso livre (1 a 2 minutos):** navegue como quiser. Diga o que sentiu falta ou o que esperava encontrar. | Não sugerir nada (pagamento online, histórico, entrega, login). Anotar o que a pessoa menciona sozinha. |

Observações para o organizador:

- O **Lemon Cream** está esgotado de propósito e o **Cookies & Cream** tem poucas unidades (dados de teste do seed), para exercitar T1 e T2.
- Pedidos feitos pelos testadores **consomem o estoque de produção**. Antes da janela de testes confira o estoque. Repor o estoque ou limpar pedidos de produção só com autorização do dono do projeto e com uma nota por escrito nesta pasta (`06-development-workflow.md` §5).

---

## 4. Questionário (Google Forms)

As seções 4.1 a 4.3 espelham a tabela da universidade; 4.4 e 4.5 alimentam o Laudo de Qualidade (E9-04) e a matriz de dispositivos (E8-03).

### 4.1 Identificação (campos "Nome" e "Data do teste")

1. **Nome completo** (resposta curta, obrigatória)
2. **Data do teste** (data, obrigatória)
3. **Aparelho e navegador** (resposta curta; ex.: "iPhone 13, Safari" ou "Moto G, Chrome")

### 4.2 Resultado por tarefa

Para cada tarefa T1 a T6, uma grade de múltipla escolha mais um comentário opcional:

- **Resultado:** Consegui sem dificuldade · Consegui, mas tive dúvida · Não consegui · Não testei
- **Comentário** (parágrafo, opcional): "O que você estranhou ou o que deu errado?"

### 4.3 Campos da tabela da universidade (parágrafo, obrigatórios)

1. **O que você testou e funcionou?**
2. **O que você testou e não funcionou? O que deve ser corrigido?**
3. **O que você não conseguiu testar, ou que sentiu falta?** (campo "Funcionalidade não testada")

### 4.4 Satisfação (escala de 1 a 5)

1. De 1 (muito difícil) a 5 (muito fácil): **como foi a facilidade de uso?**
2. De 1 a 5: **o quanto você gostou da aparência da loja?**
3. De 1 a 5: **o quanto você usaria uma loja assim para encomendar cupcakes?**
4. **Em uma frase:** o que mudaria primeiro? (opcional)

### 4.5 Consentimento

**Concordo em participar e em ter meu nome e minhas respostas no relatório.** (Sim / Não, obrigatório; texto da seção 2)

---

## 5. Como as respostas viram o relatório

| Campo do questionário | Vai para |
|---|---|
| 4.1 Nome, Data do teste | Tabela "Testes da Solução" (uma tabela por testador) |
| 4.3 (1) funcionou | "O que testou e funcionou" |
| 4.3 (2) não funcionou | "O que testou e não funcionou – o que deve ser corrigido" |
| 4.3 (3) não testado / faltou | "Funcionalidade não testada" |
| 4.2 resultados por tarefa | Métricas do Laudo de Qualidade (taxa de sucesso por tarefa) |
| 4.4 notas | Satisfação média no Laudo de Qualidade |
| Aparelho e navegador | Matriz de dispositivos (E8-03) |

Os achados viram a lista de problemas do E9-03 (com severidade), cada um ligado a uma correção ou a uma decisão justificada. Sugestões fora do escopo (por exemplo, pagamento online) entram no laudo como **fora de escopo, com justificativa** (PRD §4), não como defeito.

---

## 6. Checklist do organizador

- [ ] Convidar 6 pessoas (5 + 1 reserva) e registrar quem aceitou até **31 de outubro**
- [ ] Criar o Google Forms com as seções 2 e 4 e colar o link na mensagem de convite
- [ ] Enviar o convite, o roteiro (seção 3) e o link do formulário
- [ ] Antes de **7 de novembro**: conferir o estoque de produção (seção 3, observações)
- [ ] Durante 7 a 10 de novembro: acompanhar as respostas; se alguém desistir, acionar o reserva
- [ ] Exportar as respostas em PDF para `docs/situacao-3/` e registrar o link do formulário e os nomes (com consentimento) em `docs/situacao-3/README.md`
- [ ] Entregar as respostas para montar as 5 tabelas da universidade e o `laudo-de-qualidade.md` (E9-04)
