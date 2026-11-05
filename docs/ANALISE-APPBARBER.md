# Análise do AppBarber e definição de escopo da Karbo Barber

**Versão do documento:** 1.0
**Data:** 05/11/2026
**Objetivo:** usar o AppBarber como referência de mercado, mapear os novos módulos pedidos para a Karbo Barber e avaliar o que é viável implementar.

---

## 1. O que é o AppBarber

É um dos sistemas de gestão para barbearia mais usados no Brasil. Funciona como plataforma na nuvem, com app nativo para o profissional (iOS e Android) e app/site para o cliente. É **pago, a partir de cerca de R$ 89/mês** no plano inicial (valor citado por um concorrente em abril/2026, não confirmado no site oficial — tratar como estimativa).

Serve como referência do que o mercado considera "completo". Não é um alvo a copiar: boa parte do que ele faz está além do que a Karbo Barber precisa na primeira versão.

---

## 2. Funcionalidades do AppBarber

Levantadas na página oficial de funcionalidades.

| Módulo | O que oferece |
|---|---|
| **Agenda** | Agendamento online 24h pelo app ou site; jornada de trabalho por profissional, por dia da semana ou período; bloqueio de horários fora da jornada; encaixes; lista de espera com aviso automático quando vaga um horário. |
| **Financeiro** | Controle de caixa, contas a pagar e a receber, fluxo de caixa, taxas de cartão. |
| **Comandas** | Todo agendamento gera uma comanda, onde se adicionam serviços e produtos; desconto, parcelamento e forma de pagamento. |
| **Pagamento online** | Cliente paga pelo app, o que reduz faltas. |
| **Estoque** | Saldo por produto, entradas e saídas, custo e lucro por produto, alerta de estoque baixo, controle de validade, valor do inventário. |
| **Comissões** | Comissão por serviço realizado e por produto vendido; vales e adiantamentos; relatório para pagamento da equipe. |
| **Fidelidade** | Pontos por serviço e por produto, extrato e resgate pelo app; clube de clientes com desconto automático; pacotes de serviços com controle de sessões. |
| **Aniversariantes** | Lista de quem faz aniversário, para envio de mensagem ou promoção. |
| **Notificações** | Lembrete de horário por push e e-mail; envio de promoções em massa; mensagem automática de retorno. |
| **Relatórios** | Agendamentos por dia da semana, horário, plataforma e mês. |
| **Outros** | Pesquisa de satisfação, site do estabelecimento, módulo fiscal. |

**Limitações apontadas por concorrentes** (fontes interessadas, portanto enviesadas, mas úteis como pista): lembretes só por push e e-mail, **sem automação por WhatsApp**; sem exportação de relatórios em PDF ou Excel; sem DRE nem previsão de caixa; sem plano gratuito.

A ausência de WhatsApp é relevante para nós: é justamente onde a Karbo Barber já se diferencia, porque o fluxo de confirmação foi desenhado em cima do WhatsApp desde o início.

---

## 3. Escopo da Karbo Barber frente ao AppBarber

| Módulo | AppBarber | Karbo Barber (escopo atual) |
|---|---|---|
| Agendamento pelo cliente | Sim, app e site | Sim, link público + WhatsApp |
| Agendamento manual pelo admin | Sim | Sim |
| Agendamento manual pelo barbeiro | Sim | **Novo** |
| Confirmação por WhatsApp | Não | **Sim — diferencial** |
| Fidelidade | Pontos, clube, pacotes | Cartão fidelidade por corte confirmado |
| Aniversário do cliente | Sim | **Novo** |
| Controle de caixa | Sim | **Novo** |
| Controle de custos | Sim (contas a pagar) | **Novo** |
| Produtos à venda | Sim, com estoque | **Novo** |
| Comissão por barbeiro | Sim | **Sim — decidido em 05/11**, definida pelo admin para cada barbeiro |
| Lembrete automático | Push e e-mail | Futuro (WhatsApp API) |
| Lista de espera | Sim | Fora de escopo |
| Pagamento online | Sim | Fora de escopo |
| Relatórios gerenciais | Sim | Parcial (ver fase 4) |
| Módulo fiscal / nota fiscal | Sim | **Fora de escopo** |

---

## 4. Análise dos novos módulos

### 4.1 Controle de caixa

**Viável e recomendado.** É o módulo de maior valor depois da agenda, porque responde a pergunta que o dono faz todo dia: quanto entrou hoje.

O caminho natural é ligar o caixa ao agendamento já existente. Quando o barbeiro confirma que o corte foi realizado (fluxo que já está documentado e que hoje só alimenta a fidelidade), o sistema abre o lançamento da receita, com o valor do serviço, a forma de pagamento e os produtos vendidos junto. Um só gesto do barbeiro alimenta três coisas: o status do agendamento, a fidelidade e o caixa.

Esse encadeamento é o ponto forte do desenho atual e deve ser preservado. O risco oposto, de criar um caixa desacoplado em que alguém digita os valores de novo no fim do dia, produz retrabalho e divergência.

Precisa ter:
- Abertura e fechamento de caixa por dia, com valor inicial e conferência no fim.
- Lançamento de entrada automático na finalização do atendimento.
- Lançamento manual de entrada e de saída.
- Forma de pagamento (dinheiro, PIX, débito, crédito).
- Resumo do dia e do mês, por forma de pagamento.

**Atenção:** taxa de cartão e parcelamento mudam o valor que de fato entra na conta. Sugiro deixar fora da v1 e registrar o valor bruto, para não complicar cedo demais. Se o dono quiser o valor líquido, isso vira uma configuração de taxa por forma de pagamento.

### 4.2 Controle de custos

**Viável.** É a contrapartida do caixa e, junto com ele, fecha o resultado do mês.

- Categorias de custo (aluguel, produtos, energia, comissão, material, outros).
- Custo fixo (recorrente mensal) e custo variável (avulso).
- Data de vencimento e marcação de pago ou em aberto.
- Resultado do período: entradas − saídas.

A parte recorrente merece cuidado. Um aluguel que se repete todo mês deve ser cadastrado uma vez e gerado automaticamente, não digitado doze vezes. Isso é simples de fazer e evita que o módulo caia em desuso.

### 4.3 Produtos à venda

**Viável, com uma ressalva de escopo.** Há dois níveis possíveis, e convém escolher conscientemente:

1. **Venda simples:** cadastro de produto com preço, e venda lançada junto ao atendimento ou avulsa. Alimenta o caixa. É rápido de construir.
2. **Venda com estoque:** o acima, mais saldo, entradas, baixa automática na venda, custo de compra, lucro por produto e alerta de estoque baixo.

O nível 2 é o que o AppBarber faz. É bem mais trabalho, e só compensa se a barbearia realmente revende volume (pomada, óleo, shampoo). Para uma barbearia que vende cinco ou seis itens no balcão, o nível 1 resolve.

**Sugestão:** começar pelo nível 1 e modelar o banco já prevendo o nível 2, para que a evolução não exija refazer as tabelas.

### 4.4 Agendamento manual pelo barbeiro

**Viável e simples.** O barbeiro já vai ter acesso ao sistema para confirmar os atendimentos. Dar a ele a mesma tela de inclusão manual que o admin tem é pouco esforço.

A questão real não é técnica, e sim de permissão: o barbeiro pode agendar só para si, ou para qualquer colega? Pode excluir agendamento? Pode ver o caixa? Minha sugestão é que o barbeiro agende apenas na própria agenda, não exclua nada e não veja o financeiro — e que isso seja configurável depois, se o dono quiser.

### 4.5 Agendamento manual pelo cliente

Entendi como o fluxo público que já está documentado: o cliente escolhe data, horário e barbeiro pelo link. Já está previsto e é a fase 2 do roadmap. Se a intenção for outra coisa — por exemplo, o cliente ter login e uma área para ver o histórico e remarcar sozinho —, isso é um módulo a mais e precisa ser dito, porque muda bastante.

### 4.6 Cadastro de aniversário

**Viável e barato.** É um campo a mais no cadastro do cliente e uma tela que lista os aniversariantes do mês, com botão de WhatsApp para parabenizar — o mesmo mecanismo de link que já usamos na confirmação.

Vale um alerta de produto, não técnico: pedir data de nascimento no agendamento público aumenta o atrito e faz gente desistir. Sugiro que o campo seja **opcional** no link do cliente e preenchido com calma pelo admin, ou pedido só na segunda visita.

### 4.7 Fidelidade

Já está documentado e continua válido. Com a entrada dos produtos, surge uma pergunta nova: **compra de produto pontua?** No AppBarber, sim. Na Karbo, a regra hoje é "1 ponto por corte confirmado". Se produto também pontuar, o modelo de dados precisa de ajuste, porque hoje o ponto está amarrado ao agendamento.

---

## 5. Impacto na arquitetura — ponto crítico

Este é o item mais importante deste documento.

A documentação atual deixa o banco de dados em aberto e prevê uma camada provisória (`js/dados.js`) com dados em memória ou `localStorage`. **Essa decisão não se sustenta com o novo escopo.** Os motivos:

1. **Dinheiro.** Caixa, custos e vendas são dados financeiros. `localStorage` fica no navegador de cada pessoa: some ao limpar o cache, não tem backup e não é auditável. Perder o caixa do mês é perda real.
2. **Várias pessoas ao mesmo tempo.** O barbeiro confirma no celular dele, o admin lança um custo no computador, o cliente agenda pelo link. Os três precisam enxergar os mesmos dados. Com `localStorage`, cada um teria a sua cópia isolada, e o sistema simplesmente não funciona.
3. **Permissão.** Barbeiro não deve ver o faturamento. Isso exige autenticação de verdade, validada no servidor. Esconder um botão no JavaScript não é controle de acesso: qualquer pessoa abre o código da página no navegador e vê tudo.

**Conclusão:** o banco de dados deixa de ser uma decisão adiável e passa a ser pré-requisito dos módulos financeiros. Não é preciso decidir antes da fase 1 (telas e cadastros), mas precisa estar resolvido antes da fase 5.

### Caminho sugerido

A restrição do projeto é front-end em HTML, CSS e JavaScript puros, sem framework. Essa restrição **pode ser mantida**: ela vale para a interface, e não impede um banco na nuvem.

| Opção | Como funciona | Avaliação |
|---|---|---|
| **Supabase** | Banco PostgreSQL na nuvem, com API pronta, login e regras de permissão por tabela. O front chama por `fetch`, em JS puro. | **Recomendada.** Plano gratuito suficiente para começar, SQL de verdade (o modelo da documentação já é SQL), permissão no servidor. |
| **Firebase** | Banco de documentos do Google, com login pronto. | Boa alternativa. Não é SQL, então o modelo atual precisaria ser repensado. |
| **Backend próprio** (Node ou PHP) | Nós escrevemos a API e hospedamos. | Mais controle e mais trabalho. Só se houver intenção de manter servidor. |

Em qualquer das três, o front continua em HTML, CSS e JS puros, e a troca fica isolada no `js/dados.js`, como já está previsto. A arquitetura documentada aguenta a mudança — é por isso que o isolamento foi feito.

---

## 6. Roadmap revisado

| Fase | Entrega | Depende de banco real? |
|---|---|---|
| **1** | Estrutura de pastas, identidade visual, cadastros (barbeiros, serviços, horários, clientes com aniversário) | Não (dados de teste) |
| **2** | Agendamento pelo cliente via link + WhatsApp | Não |
| **3** | Painel do admin: próximos 3 dias, agenda mensal, inclusão e exclusão manual | Não |
| **4** | Painel do barbeiro: agenda própria, agendamento manual, confirmação do atendimento | Não |
| **5** | **Definição e integração do banco de dados + login real** | — |
| **6** | Fidelidade automática | Sim |
| **7** | Caixa: abertura/fechamento, entradas automáticas e manuais, formas de pagamento | Sim |
| **8** | Custos: categorias, recorrência, resultado do período | Sim |
| **9** | Produtos: cadastro e venda (nível 1) | Sim |
| **10** | Aniversariantes do mês com WhatsApp | Sim |
| **11** | Relatórios: faturamento por período, por barbeiro, serviços mais vendidos | Sim |

As fases 1 a 4 entregam um sistema de agendamento que já funciona e já tem valor. As fases 5 em diante constroem a gestão. Essa ordem permite colocar algo no ar cedo, em vez de esperar o sistema inteiro.

---

## 7. Fora de escopo (por ora)

| Item | Motivo |
|---|---|
| Pagamento online | Exige gateway, contrato e tratamento de dados de cartão. |
| Nota fiscal | Exige integração com a prefeitura e certificado digital. Área sensível. |
| App nativo (iOS/Android) | O sistema é web. Pode virar PWA, que instala na tela do celular sem loja de aplicativos. |
| Lembrete automático por WhatsApp | Exige WhatsApp Business API, que é paga e precisa de aprovação da Meta. Os links `wa.me` cobrem o essencial agora. |
| Lista de espera, pesquisa de satisfação, pacotes, clube de assinatura | Valor baixo frente ao custo, nesta altura. |

---

## 8. Decisões necessárias

1. **Banco de dados:** seguimos com Supabase? (Recomendação deste documento.)
2. ~~**Comissão por barbeiro:** entra no escopo?~~ **Decidido em 05/11: entra.** O administrador define a comissão de cada barbeiro. Especificado na [documentação principal](./DOCUMENTACAO.md), seções 3.5 e 6.6. Resta definir se é percentual ou valor fixo, e se há comissão sobre produto.
3. **Produtos:** nível 1 (venda simples) ou nível 2 (com estoque)?
4. **Fidelidade:** compra de produto também pontua, ou só corte?
5. **Permissões do barbeiro:** pode agendar para colegas? Pode excluir? Vê o caixa?
6. **Agendamento manual pelo cliente:** é o link público já previsto, ou o cliente terá login e área própria?
7. **Taxa de cartão:** registramos valor bruto na v1, ou já calculamos o líquido?

---

## Fontes

- [AppBarber — Funcionalidades](https://www.appbarber.com.br/funcionalidades/index.html)
- [AppBarber](https://www.appbarber.com.br/)
- [Melhor Sistema para Barbearia em 2026 — Barbeiro.app](https://www.barbeiro.app/blog/melhor-sistema-para-barbearia-2026)
- [Frizzar vs AppBarber](https://a.frizzar.com.br/frizzar-vs-appbarber/)

> As duas últimas fontes são de concorrentes do AppBarber e, portanto, interessadas. Os dados de preço e as limitações citadas devem ser confirmados antes de qualquer uso comercial.
