# Base de conhecimento — Karbo System Barber

> **Para quem for alterar o sistema:** este arquivo existe para que mudar
> uma tela ou uma função não quebre outra parte sem a gente perceber.
> Antes de alterar algo aqui listado, leia a seção correspondente. Depois
> de adicionar uma tela, um botão ou uma função nova, **atualize este
> arquivo no mesmo commit** — ele só serve se continuar verdadeiro.
>
> Este documento descreve o COMPORTAMENTO (o que cada tela e cada botão
> faz). Para o MODELO DE DADOS, o escopo completo e o roadmap de fases,
> ver `docs/DOCUMENTACAO.md`. Para a análise de concorrência e as
> decisões de arquitetura, ver `docs/ANALISE-APPBARBER.md`.

## 1. Como o sistema é organizado (visão geral)

O Karbo Barber é **multiusuário**: um único sistema atende várias
barbearias (SaaS), e cada barbearia só vê os próprios dados. Isso é
garantido por uma única regra, aplicada em um único arquivo:

> **`js/dados.js` é o ÚNICO arquivo do sistema que lê ou grava "o banco
> de dados".** Nenhuma tela, nenhum outro arquivo JS, acessa
> `localStorage` diretamente. Toda função de `dados.js` que lê ou grava
> dado de uma barbearia específica exige `barbeariaId` como primeiro
> parâmetro, e filtra/grava só dentro daquela barbearia.

Isso significa: se um dia o banco real (Supabase/Postgres, fase 5)
entrar no lugar do `localStorage`, só `dados.js` muda — nenhuma tela
precisa ser tocada, porque todas conversam com o sistema só através das
funções que ele expõe.

### Camadas do JavaScript (ordem de carregamento em toda tela do painel)

```
js/utils.js        → funções pequenas de formatação (telefone, moeda, data), sem acessar dado nenhum
js/config.js        → constantes de configuração do app (ver arquivo)
js/dados.js         → ÚNICA porta de entrada/saída de dado (ver seção 2)
js/auth.js          → sessão do administrador (simulada, ver seção 3)
js/whatsapp.js       → monta os links wa.me (ver seção 4)
js/fidelidade.js     → regras do cartão fidelidade acima dos dados crus (ver seção 5)
js/finalizacao.js    → orquestra os efeitos de finalizar um atendimento (ver seção 6)
js/admin.js          → código comum a toda tela do painel (barra, toast) — ver seção 7
js/cadastros.js       → lógica só da tela admin/cadastros.html
js/dashboard.js      → lógica só da tela admin/proximos-dias.html
```

Cada script de tela (`cadastros.js`, `dashboard.js`, ...) é carregado
**depois** de `admin.js` na página, e usa a constante `sessaoAdmin` e as
funções `mostrarToast`/`escaparHtml` que `admin.js` declara — scripts
`<script>` comuns na mesma página compartilham esse escopo, não existe
import. **Se criar uma nova tela do painel, sempre carregue os scripts
nesta mesma ordem**, terminando no arquivo de lógica da tela.

### Camadas do CSS (ordem de carregamento em toda tela)

```
css/base.css         → variáveis da paleta de cores, reset, tipografia
css/componentes.css    → botões, cards, formulários, tabelas, selos, abas, toast
css/admin.css         → específico do painel do administrador (barra superior, menu lateral, dashboard)
```

---

## 2. `js/dados.js` — o que cada função faz

Todas as funções abaixo exigem `barbeariaId` como primeiro parâmetro
(exceto as de `fidelidadePontos`/`fidelidadeResgates`, que são por
`clienteId`, já único por barbearia). Chamar sem `barbeariaId` lança um
erro de propósito — é para pegar bug de isolamento rápido, em
desenvolvimento, em vez de silenciosamente misturar dados de barbearias
diferentes.

| Função | O que faz |
|---|---|
| `listarBarbearias()` | Lista todas as barbearias cadastradas no sistema (uso do super-admin e da tela de login simulada). |
| `obterBarbearia(barbeariaId)` | Devolve uma barbearia pelo id, ou `null`. |
| `obterConfiguracoes(barbeariaId)` | Devolve o registro de configurações daquela barbearia (meta de fidelidade, duração padrão, textos de WhatsApp, etc.) — ver seção 4 de `DOCUMENTACAO.md`. |
| `salvarConfiguracoes(barbeariaId, dados)` | Substitui as configurações daquela barbearia. |
| `listarBarbeiros(barbeariaId)` | Lista os barbeiros daquela barbearia. |
| `obterBarbeiro(barbeariaId, barbeiroId)` | Devolve um barbeiro, confirmando que pertence àquela barbearia. |
| `criarBarbeiro(barbeariaId, dados)` | Cria um barbeiro com nome, tipo de comissão (`PERCENTUAL`/`FIXO`), valor da comissão e comissão sobre produto. |
| `atualizarBarbeiro(barbeariaId, barbeiroId, dados)` | Atualiza campos de um barbeiro já existente. |
| `excluirBarbeiro(barbeariaId, barbeiroId)` | Remove um barbeiro e os horários de trabalho dele. **Não** remove ou impede a exclusão se houver agendamentos futuros ligados a ele — isso ainda não foi tratado (ver seção 10, pendências). |
| `listarHorarios(barbeariaId, barbeiroId)` | Lista os horários de trabalho de um barbeiro. |
| `definirHorarios(barbeariaId, barbeiroId, horarios)` | Substitui TODOS os horários daquele barbeiro pelos informados. |
| `listarServicos(barbeariaId)` / `obterServico` / `criarServico` / `atualizarServico` / `excluirServico` | CRUD de serviços (nome, duração, preço). |
| `listarClientes(barbeariaId)` / `obterCliente` | Consultas de cliente. |
| `buscarClientePorTelefone(barbeariaId, telefone)` | Busca pelo telefone normalizado — único **por barbearia**, não globalmente. |
| `criarOuObterCliente(barbeariaId, dados)` | Cria o cliente se o telefone ainda não existir naquela barbearia, ou devolve o já existente. Usado no futuro fluxo público de agendamento (fase 2/3), para não duplicar cliente a cada agendamento. |
| `listarAgendamentos(barbeariaId, filtros)` | Lista agendamentos, com filtros opcionais `{ barbeiroId, desde, ate }` (`desde`/`ate` são `Date`). Sempre ordenado por data/hora crescente. |
| `obterAgendamento(barbeariaId, agendamentoId)` | Devolve um agendamento. |
| `ehStatusAtivo(status)` | `true` para `AGENDADO` ou `CONFIRMADO` — os únicos status que ainda "ocupam" um horário. |
| `criarAgendamento(barbeariaId, dados)` | Cria um agendamento com status inicial `AGENDADO`. Lança erro se o barbeiro já tiver outro agendamento ativo no mesmo horário exato. |
| `confirmarAgendamento(barbeariaId, agendamentoId)` | Muda o status para `CONFIRMADO` (RF12 — depois que o cliente respondeu no WhatsApp). |
| `cancelarAgendamento(barbeariaId, agendamentoId)` | Muda o status para `CANCELADO`, liberando o horário. |
| `finalizarAtendimento(barbeariaId, agendamentoId, { status, ... })` | **Não chame direto de uma tela.** É a função de baixo nível usada por `js/finalizacao.js` (seção 6). Muda o status para `REALIZADO` ou `NAO_COMPARECEU` e, se `REALIZADO`, gera 1 ponto de fidelidade. |
| `saldoFidelidade(clienteId)` | Pontos ganhos − pontos resgatados daquele cliente. |
| `listarSaldosFidelidade(barbeariaId)` | Clientes daquela barbearia com saldo > 0, ordenados do maior para o menor. |
| `resgatarFidelidade(clienteId, pontosUsados)` | **Não chame direto.** Use `Fidelidade.resgatar` (seção 5), que valida a meta antes. |
| `obterInstantaneo(barbeariaId)` / `restaurarInstantaneo(barbeariaId, instantaneo)` | Tira e restaura uma "foto" dos agendamentos e da fidelidade de uma barbearia — é o mecanismo por trás do botão **Desfazer** dos toasts. Qualquer ação que mude agendamento ou fidelidade deve tirar o instantâneo ANTES de agir, para poder oferecer desfazer. |
| `reiniciar()` | Apaga tudo e recoloca os dados de exemplo (seed), ancorados em "hoje" de novo. Só para desenvolvimento — não é um botão da interface ainda. |

**Dados de exemplo (seed):** duas barbearias fictícias, `barb-carlos`
("Barbearia do Carlos") e `barb-navalha` ("Studio Navalha"), com
barbeiros, serviços, clientes e agendamentos próprios — nunca
compartilhados entre si. Servem para testar o isolamento e já nascem
com agendamentos de hoje/amanhã/depois de amanhã (recalculados a cada
`reiniciar()` ou na primeira vez que o navegador abre o sistema).

---

## 3. `js/auth.js` — sessão do administrador

Nesta fase (1 a 4 do roadmap), **não existe autenticação real**. "Fazer
login" é só escolher, numa lista, qual barbearia fictícia você quer
administrar — a autenticação de verdade (senha, Supabase Auth) entra na
fase 5. A sessão fica em `sessionStorage` (some ao fechar a aba).

Funções relevantes: `Auth.entrarComoAdmin(barbeariaId)` (abre a sessão),
`Auth.exigirSessaoAdmin()` (lida por toda tela do painel — redireciona
para `login.html` se não houver sessão), `Auth.sair()` (encerra).

---

## 4. `js/whatsapp.js` — montagem dos links `wa.me`

Não envia nada por conta própria — o envio é sempre um toque da pessoa
no WhatsApp (limitação conhecida do link `wa.me`, documentada na seção 9
de `DOCUMENTACAO.md`). Monta o texto a partir do **modelo configurado
pela barbearia** (`configuracoes.mensagemLembrete` /
`mensagemAniversario`), ou de um modelo padrão se ela ainda não
personalizou.

| Função | Uso |
|---|---|
| `linkConfirmacaoParaCliente(configuracoes, dadosAgendamento)` | Botão **Confirmar** da lista de próximos dias. |
| `linkConversaComCliente(telefoneCliente)` | Botão **Conversa**, quando o agendamento já está confirmado. |
| `linkAniversario(configuracoes, nome, telefone)` | Reservado para a tela de aniversariantes (fase 12 — ainda não construída). |

---

## 5. `js/fidelidade.js` — regras do cartão fidelidade

Fica ACIMA de `dados.js`: decide o que os números SIGNIFICAM (progresso,
"completou a meta"), enquanto `dados.js` só soma pontos e resgates.

| Função | O que faz |
|---|---|
| `progresso(saldo, meta)` | Devolve `{ saldo, meta, completou, percentual, rotulo }`, pronto para desenhar a barra e o texto. |
| `maioresSaldos(barbeariaId, n)` | Os `n` clientes mais perto da meta, já com `progresso` calculado contra a meta **daquela barbearia**. Usada no painel "Cartão fidelidade" do dashboard. |
| `resgatar(barbeariaId, clienteId)` | Valida que o saldo atingiu a meta e then chama `Dados.resgatarFidelidade`. Lança erro se ainda não atingiu — **sempre chame esta função, nunca `Dados.resgatarFidelidade` direto**, senão a validação é pulada. |

---

## 6. `js/finalizacao.js` — o que acontece ao finalizar um atendimento

Ponto único de entrada para os botões **Realizado** e **Não
compareceu**. Hoje só dispara o efeito de fidelidade (porque é o único
que existe), mas já está no formato final: quando caixa (fase 8),
comissão (fase 9) e baixa de estoque (fase 11) existirem, eles entram
AQUI dentro, numa única chamada — **quem chama esta função não vai
precisar mudar**.

| Função | O que faz |
|---|---|
| `marcarRealizado(barbeariaId, agendamentoId, dadosFinalizacao)` | Marca `REALIZADO`, gera o ponto de fidelidade, devolve `{ agendamento, completouCartao, saldoAtual, meta }` — `completouCartao` é `true` só no atendimento que FEZ o cliente atingir a meta (não continua `true` depois). |
| `marcarNaoCompareceu(barbeariaId, agendamentoId, dadosFinalizacao)` | Marca `NAO_COMPARECEU`. Nenhum ponto, nenhum efeito financeiro — é regra do sistema (seção 6 de `DOCUMENTACAO.md`), não esquecimento. |

---

## 7. `js/admin.js` — comum a toda tela do painel

Toda página do painel (atualmente `cadastros.html` e
`proximos-dias.html`) carrega este arquivo e precisa ter no HTML:
- `#texto-barbearia-logada` e `#botao-sair` (nome da barbearia logada e botão de saída — aparecem na barra ou, como em `proximos-dias.html`, ficam visualmente escondidos quando a informação já aparece em outro lugar da tela, como o menu lateral);
- `#toast`, com um `[data-toast-texto]` e um `[data-toast-desfazer]` dentro — o aviso de retorno.

| Item | O que faz |
|---|---|
| `sessaoAdmin` (constante) | A sessão atual. Se não houver sessão, `Auth.exigirSessaoAdmin()` já redireciona para `login.html` — por isso todo código de tela deve ficar dentro de `if (sessaoAdmin) { ... }`. |
| `mostrarToast(mensagem, aoDesfazer)` | Mostra o aviso na parte de baixo da tela por 6 segundos. Se `aoDesfazer` for uma função, mostra também o botão **Desfazer**, que a chama e esconde o toast. Se for `null`/omitido, o botão fica escondido (ação sem desfazer, como um resgate de fidelidade). |
| `escaparHtml(texto)` | Evita que nome de cliente/barbeiro com `<`, `>` ou `&` quebre o HTML montado via `innerHTML`. **Sempre** passe nomes vindos de `Dados` por aqui antes de colocá-los no HTML. |

**Se criar uma tela nova:** carregue `admin.js` antes do arquivo de
lógica da tela, e garanta que o HTML tem os elementos acima — sem eles,
`mostrarToast`/`inicializarBarraTopo` simplesmente não fazem nada (não
quebram, mas também não funcionam).

---

## 8. Telas

### 8.1 `index.html` (raiz do repositório)

Porta de entrada provisória. Mostra a marca Karbo e um botão **Entrar no
painel**, que leva a `admin/login.html`. Em produção (fase 2+), o
cliente chegaria direto por um link com o identificador da barbearia
(`/b/<slug>`) — ninguém passaria por aqui. **Fica fora de qualquer
pasta de propósito, para o GitHub Pages/qualquer host estático
reconhecer como página inicial.**

### 8.2 `admin/login.html`

Tela de "login" simulado (ver seção 3). Mostra uma lista (`<select>`)
com as barbearias cadastradas (`Dados.listarBarbearias()`).

| Elemento | Comportamento |
|---|---|
| `#campo-barbearia` | Lista de barbearias, preenchida ao carregar a página. |
| Botão **Entrar** (submit do `#formulario-login`) | Chama `Auth.entrarComoAdmin(barbeariaId)` e redireciona para `proximos-dias.html` (a tela inicial do painel). |

### 8.3 `admin/proximos-dias.html` + `js/dashboard.js` — tela inicial do painel

A tela que o administrador vê ao entrar. Mostra o panorama do dia e dos
próximos dias, e é de onde ele confirma, cancela e finaliza
atendimentos.

**Menu lateral** (`.menu-lateral`):
- **Início** — link real, leva a esta própria tela (`aria-current="page"`).
- **Agenda mensal**, **Novo agendamento**, **Clientes e fidelidade** — ainda não construídas (fases seguintes do roadmap). São `<button>` com `data-acao="em-construcao"`, que mostram um toast avisando que a tela é de uma fase futura, em vez de levar a um link quebrado.
- **Cadastros** — link real, leva a `cadastros.html`.
- Rodapé: link público de agendamento (texto + botão **Copiar link**, que copia `origin + "/b/" + slug` para a área de transferência via `navigator.clipboard`), bloco com o nome do administrador, e botão **Sair** (comportamento vem de `admin.js`).

**Cabeçalho** (`.cabecalho-painel`):
- Data de hoje e saudação (Bom dia/Boa tarde/Boa noite, calculada pela hora real do navegador).
- `#texto-resumo`: frase com quantos atendimentos aguardam finalização e quantos horários dos próximos 3 dias ainda faltam confirmar.
- Botão **Novo agendamento** (também `data-acao="em-construcao"`, mesma tela ainda não construída).

**Filtros:**
- **Chips de barbeiro** (`#chips-barbeiro`): "Todos" + um chip por barbeiro da barbearia logada, cada um com a contagem de atendimentos ativos e futuros daquele barbeiro. Clicar troca `estadoDashboard.barbeiroId` e redesenha a tela inteira (indicadores, lista, aguardando, calendário — tudo que depende do filtro).
- **Busca** (`#campo-busca`): filtra a lista de "Próximos 3 dias" por nome ou telefone do cliente (não filtra o painel de "Aguardando finalização" nem o cartão fidelidade).

**Indicadores** (`#area-kpis`, 4 cartões, recalculados a cada mudança de filtro):
1. **Atendimentos hoje** — total de hoje (exceto cancelados), com quantos já foram realizados e quantos ainda restam.
2. **Confirmados · 3 dias** — quantos dos horários ativos e futuros dos próximos 3 dias já estão `CONFIRMADO`, com barra de percentual.
3. **Aguardando finalização** — quantos atendimentos ativos (`AGENDADO`/`CONFIRMADO`) já passaram do horário sem ter sido marcados como realizados ou não comparecidos. **Olha todo o histórico**, não só os próximos 3 dias — um atendimento de ontem sem finalizar continua contando hoje.
4. **Cortes grátis disponíveis** — quantos clientes já atingiram a meta de fidelidade e ainda não resgataram.

**Próximos 3 dias** (coluna principal):
- Abas **Hoje / Amanhã / Depois de amanhã**, cada uma com a contagem de horários ativos e futuros daquele dia. Clicar troca `estadoDashboard.diaSelecionado`.
- Lista de linhas, uma por agendamento ativo e futuro do dia escolhido (respeitando os filtros de barbeiro e busca), com hora, cliente, telefone, barbeiro e:
  - Se `AGENDADO`: botão **Confirmar** (link `wa.me` com a mensagem de confirmação, abre em nova aba — **não muda o status por si só**, é o cliente que responde) + botão **Marcar confirmado** (muda o status para `CONFIRMADO` direto no sistema, para quando a confirmação chegou por outro canal) + botão **Cancelar**.
  - Se `CONFIRMADO`: botão **Conversa** (abre o WhatsApp do cliente sem texto pronto, para continuar a conversa) + botão **Cancelar**.
- **Cancelar** sempre muda o status para `CANCELADO` (libera o horário) e mostra toast com **Desfazer** (restaura o instantâneo tirado antes da ação).
- Lista vazia: mostra uma mensagem orientando a trocar dia/barbeiro/busca.

**Aguardando finalização** (coluna lateral):
- Lista todos os atendimentos ativos e já passados (de qualquer dia, filtrados por barbeiro se houver filtro), mostrando o progresso do cliente no cartão fidelidade e, se faltar só 1 ponto, o aviso **"Completa o cartão"**.
- Botão **Realizado** → chama `Finalizacao.marcarRealizado`: gera o ponto, mostra toast (com +1 ponto ou aviso de cartão completo) e **Desfazer** (restaura o instantâneo, removendo o ponto também).
- Botão **Não compareceu** → chama `Finalizacao.marcarNaoCompareceu`: nenhum ponto, toast com **Desfazer**.
- Vazio: mostra "Tudo em dia".

**Cartão fidelidade** (coluna lateral):
- Até 4 clientes mais perto da meta (`Fidelidade.maioresSaldos`), com barra de progresso e, para quem já atingiu a meta, botão **Resgatar** → chama `Fidelidade.resgatar` e mostra toast (sem desfazer — resgate não é revertido pela interface nesta fase).

**Mini calendário** (coluna lateral):
- Mês atual, com cada dia colorido por intensidade conforme a quantidade de agendamentos daquele dia (considerando o filtro de barbeiro). Clicar num dia muda o resumo embaixo (`#texto-dia-selecionado` / `#texto-resumo-dia-selecionado`) — **não** muda a aba "Próximos 3 dias" acima, são seleções independentes.
- Botão **Abrir agenda** → `data-acao="em-construcao"` (tela "Agenda mensal" ainda não construída).

### 8.4 `admin/cadastros.html` + `js/cadastros.js`

Tela de cadastro de barbeiros, serviços e clientes, em 3 abas
(`.abas`/`.abas__item`, uma só visível por vez via classe `.ativo`).

**Aba Barbeiros:**
- Formulário: nome, tipo de comissão (`PERCENTUAL`/`FIXO` — troca o rótulo do campo de valor entre "Percentual (%)" e "Valor fixo (R$)") e valor, comissão sobre produto vendido (%). Submeter chama `Dados.criarBarbeiro` e redesenha a lista.
- Lista de barbeiros cadastrados, cada um com um painel de horários de trabalho que expande/recolhe (`alternarPainelHorarios`) e salva via `Dados.definirHorarios` (substitui TODOS os horários daquele barbeiro).

**Aba Serviços:** formulário de nome, duração (opcional — em branco usa a duração padrão da barbearia) e preço. `Dados.criarServico` / lista.

**Aba Clientes:** formulário de nome, telefone (WhatsApp) e data de nascimento (opcional). `Dados.criarOuObterCliente` / lista.

Todas as três abas usam o mesmo padrão: formulário no topo, submit cria
e redesenha a lista (`renderizarBarbeiros`/`renderizarServicos`/
`renderizarClientes`), sem recarregar a página.

### 8.5 Telas ainda não construídas

`cliente/`, `barbeiro/` e `super-admin/` existem como pastas vazias
(`.gitkeep`) — reservadas pela estrutura de pastas de `DOCUMENTACAO.md`
§11.3, para as fases seguintes do roadmap (fluxo público de
agendamento, área do barbeiro, e painel do super-admin). Qualquer botão
do painel que apontaria para uma tela destas fases usa
`data-acao="em-construcao"` em vez de um link quebrado.

---

## 9. Padrões que toda tela nova deve seguir

1. **Nunca ler/gravar dado fora de `dados.js`.** Se precisar de uma
   consulta nova, adicione a função em `dados.js` (com `barbeariaId`
   como primeiro parâmetro) em vez de acessar `localStorage` na tela.
2. **Toda ação que muda agendamento ou fidelidade** deve: (a) tirar
   `Dados.obterInstantaneo(barbeariaId)` antes de agir; (b) redesenhar a
   tela; (c) mostrar `mostrarToast(mensagem, () => { restaura o
   instantâneo e redesenha })` — exceto ações que a interface já decidiu
   não oferecer desfazer (hoje, só o resgate de fidelidade).
3. **Nomes vindos de `Dados` (cliente, barbeiro, serviço) sempre passam
   por `escaparHtml()`** antes de entrar num `innerHTML`.
4. **Links para telas que não existem ainda** usam
   `data-acao="em-construcao" data-nome="<nome da tela>"` em vez de
   `href="#"` — `tratarBotoesEmConstrucao()` (em `dashboard.js`, copiar
   o padrão em qualquer tela nova) cuida de mostrar o aviso.
5. **Declare funções e constantes antes de qualquer código de topo que
   as use.** Scripts de tela colocam a chamada de inicialização (que
   dispara a primeira renderização) **no final do arquivo**, depois de
   todas as `function`/`const` — colocá-la no topo pode esbarrar na
   zona morta temporal (`ReferenceError: Cannot access '...' before
   initialization`) de um `const` declarado mais abaixo. Foi exatamente
   esse bug que os testes do dashboard pegaram (ver seção 10).
6. **Ao criar uma tela nova do painel**, carregue os scripts na mesma
   ordem da seção 1, e garanta os elementos que `admin.js` espera
   (`#texto-barbearia-logada`, `#botao-sair`, `#toast` com seus filhos).
7. **Depois de mudar `dados.js`, `whatsapp.js`, `fidelidade.js` ou
   `finalizacao.js`, rode de novo os testes de todas as telas que os
   usam** (hoje, cadastros e dashboard) — uma mudança numa função
   compartilhada pode quebrar uma tela que não estava sendo olhada.
   Atualize esta seção e a tabela da função alterada se o
   comportamento mudar.

---

## 10. Testes automatizados e pendências conhecidas

Os testes de ponta a ponta (Playwright) cobrem, para o dashboard e para
a regressão de cadastros: carga inicial e KPIs, abas de dia, filtro por
barbeiro, busca, confirmar/marcar confirmado/cancelar com Desfazer,
finalizar (Realizado/Não compareceu) com geração e remoção de ponto de
fidelidade, completar o cartão e resgatar, calendário, copiar link,
botões "em construção", **isolamento entre barbearias** (trocar de
barbearia não mostra nenhum dado da anterior) e que a tela de Cadastros
continua funcionando depois da separação de `admin.js` em
`admin.js`/`cadastros.js`/`dashboard.js`. Não ficam no repositório como
arquivo de teste permanente ainda (fase de automatizar testes em CI é
posterior); foram escritos e rodados manualmente para validar este
lote de trabalho.

**Pendências conhecidas (não são bugs, são escopo de fases futuras):**
- Excluir um barbeiro não avisa nem impede a exclusão se ele tiver
  agendamentos futuros.
- O botão **Resgatar** fidelidade não tem Desfazer.
- "Agenda mensal", "Novo agendamento manual" e "Clientes e fidelidade"
  ainda não são telas reais — mostram apenas um aviso.
- `finalizadoPor` (quem registrou a finalização) fica `null` — depende
  de autenticação real de barbeiro (fase 5).
