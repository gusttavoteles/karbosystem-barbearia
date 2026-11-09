/*
  agenda-mensal.js
  ----------------
  Lógica da tela admin/agenda.html — a "Agenda mensal" (RF07 da
  documentação): mostra o mês inteiro em forma de calendário, com
  filtro por barbeiro, e ao clicar num dia abre o detalhe com a
  lista de agendamentos daquele dia (mesmas ações de
  confirmar/cancelar/finalizar que o início do painel).

  Depende de js/admin.js já ter rodado antes (expõe `sessaoAdmin`,
  `mostrarToast` e `escaparHtml`). Toda leitura e gravação passa
  pela camada Dados / Whatsapp / Finalizacao — este arquivo só
  decide o que a TELA mostra e faz com o que elas dão.
*/

// Estado só desta tela: mês exibido, filtro de barbeiro e dia
// selecionado no detalhe. Nada que precise sobreviver a um
// recarregamento de página.
const estadoAgendaMensal = {
  barbeiroId: "TODOS",
  anoExibido: new Date().getFullYear(),
  mesExibido: new Date().getMonth(), // 0 = janeiro
  diaSelecionado: null, // "AAAA-MM-DD" ou null (nenhum dia aberto no detalhe)
};

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* ---------------------------------------------------------------
   Pequenos formatadores — mesmo padrão usado em dashboard.js.
   ------------------------------------------------------------- */
function horaCurtaMensal(data) {
  return String(data.getHours()).padStart(2, "0") + ":" + String(data.getMinutes()).padStart(2, "0");
}

function pluralMensal(n, singular, pluralForma) {
  return n + " " + (n === 1 ? singular : pluralForma);
}

// Transforma um Date em chave "AAAA-MM-DD" usando o fuso local
// (nunca toISOString, que converte para UTC e pode mudar o dia).
function chaveDia(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

/* ---------------------------------------------------------------
   Filtro por barbeiro — mesmo padrão de chips do dashboard.
   ------------------------------------------------------------- */
function renderizarChipsBarbeiroMensal(barbeiros, agendamentosDoMes) {
  const container = document.getElementById("chips-barbeiro");
  const ehAtivo = (a) => a.status === "AGENDADO" || a.status === "CONFIRMADO";

  const opcoes = [{ id: "TODOS", nome: "Todos" }].concat(
    barbeiros.map((b) => ({ id: b.id, nome: b.nome }))
  );

  container.innerHTML =
    '<span class="texto-secundario" style="margin-right: 4px;">Barbeiro</span>' +
    opcoes
      .map((opcao) => {
        const ativo = estadoAgendaMensal.barbeiroId === opcao.id;
        const contagem = agendamentosDoMes.filter(
          (a) => ehAtivo(a) && (opcao.id === "TODOS" || a.barbeiroId === opcao.id)
        ).length;

        return `
          <button class="chip" aria-pressed="${ativo}" data-barbeiro="${opcao.id}">
            ${escaparHtml(opcao.nome)}
            <span class="chip__contagem">${contagem}</span>
          </button>
        `;
      })
      .join("");

  container.querySelectorAll("[data-barbeiro]").forEach((botao) => {
    botao.addEventListener("click", () => {
      estadoAgendaMensal.barbeiroId = botao.dataset.barbeiro;
      renderizarTudoAgendaMensal();
    });
  });
}

/* ---------------------------------------------------------------
   Função central: recalcula tudo e redesenha a tela inteira. É
   chamada sempre que o mês, o filtro de barbeiro ou o dia
   selecionado mudam, ou quando uma ação altera algum dado.
   ------------------------------------------------------------- */
function renderizarTudoAgendaMensal() {
  const barbeariaId = sessaoAdmin.barbeariaId;
  const barbeiros = Dados.listarBarbeiros(barbeariaId);
  const clientes = Dados.listarClientes(barbeariaId);
  const todosAgendamentos = Dados.listarAgendamentos(barbeariaId);

  const mapaClientes = {};
  clientes.forEach((c) => { mapaClientes[c.id] = c; });
  const mapaBarbeiros = {};
  barbeiros.forEach((b) => { mapaBarbeiros[b.id] = b; });

  const inicioMes = new Date(estadoAgendaMensal.anoExibido, estadoAgendaMensal.mesExibido, 1);
  const inicioMesSeguinte = new Date(estadoAgendaMensal.anoExibido, estadoAgendaMensal.mesExibido + 1, 1);

  const agendamentosDoMesFiltrados = todosAgendamentos.filter((a) => {
    const d = new Date(a.dataHora);
    const dentroDoMes = d >= inicioMes && d < inicioMesSeguinte;
    const dentroDoFiltro = estadoAgendaMensal.barbeiroId === "TODOS" || a.barbeiroId === estadoAgendaMensal.barbeiroId;
    return dentroDoMes && dentroDoFiltro;
  });

  renderizarChipsBarbeiroMensal(barbeiros, todosAgendamentos.filter((a) => {
    const d = new Date(a.dataHora);
    return d >= inicioMes && d < inicioMesSeguinte;
  }));
  renderizarGradeMensal(agendamentosDoMesFiltrados);
  renderizarDetalheDia(barbeariaId, todosAgendamentos, mapaClientes, mapaBarbeiros);
}

/* ---------------------------------------------------------------
   Grade do mês (7 colunas, com dias "fora do mês" para completar
   as semanas da primeira e da última linha).
   ------------------------------------------------------------- */
function renderizarGradeMensal(agendamentosDoMesFiltrados) {
  const ano = estadoAgendaMensal.anoExibido;
  const mes = estadoAgendaMensal.mesExibido;
  const hoje = new Date();
  const chaveHoje = chaveDia(hoje);

  const nomeMes = NOMES_MES[mes];
  document.getElementById("texto-mes-ano").textContent =
    nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + " de " + ano;

  const ehAtivo = (a) => a.status === "AGENDADO" || a.status === "CONFIRMADO";

  // Conta, por dia do mês, quantos agendamentos ativos existem.
  const contagemPorDia = {};
  agendamentosDoMesFiltrados.forEach((a) => {
    if (!ehAtivo(a)) return;
    const chave = chaveDia(new Date(a.dataHora));
    contagemPorDia[chave] = (contagemPorDia[chave] || 0) + 1;
  });

  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0);
  const diaDaSemanaInicial = primeiroDiaDoMes.getDay(); // 0 = domingo

  const celulas = [];

  // Preenche os dias do mês anterior que aparecem na primeira linha.
  for (let i = 0; i < diaDaSemanaInicial; i++) {
    celulas.push({ foraDoMes: true });
  }

  for (let dia = 1; dia <= ultimoDiaDoMes.getDate(); dia++) {
    const data = new Date(ano, mes, dia);
    const chave = chaveDia(data);
    celulas.push({
      foraDoMes: false,
      dia,
      chave,
      ehHoje: chave === chaveHoje,
      ehPassado: data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
      ehSelecionado: chave === estadoAgendaMensal.diaSelecionado,
      contagem: contagemPorDia[chave] || 0,
    });
  }

  // Completa a última linha com dias do mês seguinte, para a grade
  // sempre ter um número de células múltiplo de 7.
  while (celulas.length % 7 !== 0) {
    celulas.push({ foraDoMes: true });
  }

  document.getElementById("grade-calendario-mensal").innerHTML = celulas
    .map((c) => {
      if (c.foraDoMes) {
        return `<div class="calendario-mensal__celula fora-do-mes" aria-hidden="true"></div>`;
      }
      const classes = [
        "calendario-mensal__celula",
        c.ehHoje ? "hoje" : "",
        c.ehSelecionado ? "selecionada" : "",
        c.ehPassado && !c.ehHoje ? "passado" : "",
      ].filter(Boolean).join(" ");

      return `
        <button type="button" class="${classes}" data-dia="${c.chave}" aria-pressed="${c.ehSelecionado}">
          <span>${c.dia}</span>
          ${c.contagem > 0 ? `<span class="calendario-mensal__celula__contagem">${c.contagem}</span>` : ""}
        </button>
      `;
    })
    .join("");

  document.getElementById("grade-calendario-mensal").querySelectorAll("[data-dia]").forEach((botao) => {
    botao.addEventListener("click", () => {
      estadoAgendaMensal.diaSelecionado = botao.dataset.dia === estadoAgendaMensal.diaSelecionado ? null : botao.dataset.dia;
      renderizarTudoAgendaMensal();
    });
  });
}

/* ---------------------------------------------------------------
   Navegação de mês (anterior / próximo / hoje).
   ------------------------------------------------------------- */
function irParaMesAnterior() {
  estadoAgendaMensal.mesExibido--;
  if (estadoAgendaMensal.mesExibido < 0) {
    estadoAgendaMensal.mesExibido = 11;
    estadoAgendaMensal.anoExibido--;
  }
  renderizarTudoAgendaMensal();
}

function irParaMesProximo() {
  estadoAgendaMensal.mesExibido++;
  if (estadoAgendaMensal.mesExibido > 11) {
    estadoAgendaMensal.mesExibido = 0;
    estadoAgendaMensal.anoExibido++;
  }
  renderizarTudoAgendaMensal();
}

function irParaMesDeHoje() {
  const hoje = new Date();
  estadoAgendaMensal.anoExibido = hoje.getFullYear();
  estadoAgendaMensal.mesExibido = hoje.getMonth();
  estadoAgendaMensal.diaSelecionado = chaveDia(hoje);
  renderizarTudoAgendaMensal();
}

/* ---------------------------------------------------------------
   Detalhe do dia selecionado: lista de agendamentos, cada um com
   as mesmas ações do início do painel (dashboard.js).
   ------------------------------------------------------------- */
function renderizarDetalheDia(barbeariaId, todosAgendamentos, mapaClientes, mapaBarbeiros) {
  const secao = document.getElementById("secao-detalhe-dia");

  if (!estadoAgendaMensal.diaSelecionado) {
    secao.style.display = "none";
    return;
  }
  secao.style.display = "";

  const [ano, mes, dia] = estadoAgendaMensal.diaSelecionado.split("-").map(Number);
  const inicioDoDia = new Date(ano, mes - 1, dia);
  const fimDoDia = new Date(ano, mes - 1, dia + 1);
  const agora = new Date();
  const ehHoje = chaveDia(agora) === estadoAgendaMensal.diaSelecionado;

  const ehAtivo = (a) => a.status === "AGENDADO" || a.status === "CONFIRMADO";
  const jaPassou = (a) => new Date(a.dataHora) < agora;

  const configuracoes = Dados.obterConfiguracoes(barbeariaId);

  const doDia = todosAgendamentos
    .filter((a) => {
      const d = new Date(a.dataHora);
      if (!(d >= inicioDoDia && d < fimDoDia)) return false;
      if (estadoAgendaMensal.barbeiroId !== "TODOS" && a.barbeiroId !== estadoAgendaMensal.barbeiroId) return false;
      return ehAtivo(a) || a.status === "REALIZADO" || a.status === "NAO_COMPARECEU";
    })
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  document.getElementById("titulo-detalhe-dia").textContent =
    String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + ano + (ehHoje ? " · hoje" : "");
  document.getElementById("texto-resumo-detalhe-dia").textContent =
    doDia.length === 0 ? "Sem atendimentos" : pluralMensal(doDia.length, "agendamento", "agendamentos");

  const container = document.getElementById("lista-detalhe-dia");

  if (doDia.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 20px 32px; border-top: 1px solid var(--cor-borda); text-align: center;">
        <p class="texto-secundario" style="margin: 0;">Nenhum agendamento neste dia, com os filtros atuais.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = doDia
    .map((agendamento) => {
      const cliente = mapaClientes[agendamento.clienteId];
      const barbeiro = mapaBarbeiros[agendamento.barbeiroId];
      const confirmado = agendamento.status === "CONFIRMADO";
      const finalizado = agendamento.status === "REALIZADO" || agendamento.status === "NAO_COMPARECEU";
      const aguardandoFinalizacao = ehAtivo(agendamento) && jaPassou(agendamento);

      let selo = '<span class="selo selo--neutro">Agendado</span>';
      if (confirmado) selo = '<span class="selo selo--sucesso">Confirmado</span>';
      if (agendamento.status === "REALIZADO") selo = '<span class="selo selo--sucesso">Realizado</span>';
      if (agendamento.status === "NAO_COMPARECEU") selo = '<span class="selo selo--erro">Não compareceu</span>';
      if (agendamento.status === "CANCELADO") selo = '<span class="selo selo--neutro">Cancelado</span>';

      let acoes = "";
      if (aguardandoFinalizacao) {
        acoes = `
          <button class="botao botao--primario botao--pequeno" data-acao="finalizar-realizado" data-id="${agendamento.id}">Realizado</button>
          <button class="botao botao--secundario botao--pequeno" data-acao="finalizar-nao-compareceu" data-id="${agendamento.id}">Não compareceu</button>
        `;
      } else if (ehAtivo(agendamento)) {
        const linkConfirmar = Whatsapp.linkConfirmacaoParaCliente(configuracoes, {
          nomeCliente: cliente.nome,
          telefoneCliente: cliente.telefone,
          diaRelativo: ehHoje ? "hoje" : "no dia " + String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0"),
          dataFormatada: String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0"),
          hora: horaCurtaMensal(new Date(agendamento.dataHora)),
          nomeBarbeiro: barbeiro.nome,
        });
        const linkConversa = Whatsapp.linkConversaComCliente(cliente.telefone);

        acoes = confirmado
          ? `<a class="botao botao--secundario botao--pequeno" href="${linkConversa}" target="_blank" rel="noopener">Conversa</a>`
          : `<a class="botao botao--whatsapp botao--pequeno" href="${linkConfirmar}" target="_blank" rel="noopener">Confirmar</a>
             <button class="botao botao--secundario botao--pequeno" data-acao="marcar-confirmado" data-id="${agendamento.id}">Marcar confirmado</button>`;
        acoes += `<button class="botao botao--perigo botao--pequeno" data-acao="cancelar" data-id="${agendamento.id}" aria-label="Cancelar agendamento de ${escaparHtml(cliente.nome)}">Cancelar</button>`;
      }

      return `
        <div class="linha-agendamento">
          <div class="linha-agendamento__hora">
            <strong class="numero-tabular">${horaCurtaMensal(new Date(agendamento.dataHora))}</strong>
            <span>${agendamento.duracaoMin} min</span>
          </div>
          <div class="linha-agendamento__cliente">
            <strong>${escaparHtml(cliente.nome)}</strong>
            <span class="numero-tabular">${formatarTelefone(cliente.telefone)}</span>
          </div>
          <div class="linha-agendamento__barbeiro">
            <div class="item-cadastro__detalhe" style="font-weight: 500; color: var(--cor-texto);">${escaparHtml(barbeiro.nome)}</div>
          </div>
          <div>${selo}</div>
          <div class="linha-agendamento__acoes">${acoes}</div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll('[data-acao="marcar-confirmado"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoConfirmarMensal(botao.dataset.id));
  });
  container.querySelectorAll('[data-acao="cancelar"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoCancelarMensal(botao.dataset.id));
  });
  container.querySelectorAll('[data-acao="finalizar-realizado"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoFinalizarRealizadoMensal(botao.dataset.id));
  });
  container.querySelectorAll('[data-acao="finalizar-nao-compareceu"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoFinalizarNaoCompareceuMensal(botao.dataset.id));
  });
}

/* ---------------------------------------------------------------
   Ações que mutam dados — sempre: instantâneo ANTES, muda o dado,
   redesenha, mostra toast com Desfazer que restaura o instantâneo.
   ------------------------------------------------------------- */
function acaoConfirmarMensal(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const agendamento = Dados.confirmarAgendamento(sessaoAdmin.barbeariaId, agendamentoId);
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, agendamento.clienteId);

  renderizarTudoAgendaMensal();
  mostrarToast(cliente.nome + " confirmado para " + horaCurtaMensal(new Date(agendamento.dataHora)) + ".", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudoAgendaMensal();
  });
}

function acaoCancelarMensal(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const agendamento = Dados.cancelarAgendamento(sessaoAdmin.barbeariaId, agendamentoId);
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, agendamento.clienteId);

  renderizarTudoAgendaMensal();
  mostrarToast("Agendamento de " + cliente.nome + " cancelado. Horário liberado.", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudoAgendaMensal();
  });
}

function acaoFinalizarRealizadoMensal(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const resultado = Finalizacao.marcarRealizado(sessaoAdmin.barbeariaId, agendamentoId, {
    finalizadoPor: null, // TODO (fase 5): id de quem está logado (admin ou barbeiro)
  });
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, resultado.agendamento.clienteId);
  const primeiroNome = cliente.nome.split(" ")[0];

  renderizarTudoAgendaMensal();
  mostrarToast(
    resultado.completouCartao
      ? cliente.nome + " completou o cartão: " + (Dados.obterConfiguracoes(sessaoAdmin.barbeariaId).fidelidadeRecompensa) + " disponível."
      : "+1 ponto para " + primeiroNome + " (" + resultado.saldoAtual + "/" + resultado.meta + ").",
    () => {
      Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
      renderizarTudoAgendaMensal();
    }
  );
}

function acaoFinalizarNaoCompareceuMensal(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const resultado = Finalizacao.marcarNaoCompareceu(sessaoAdmin.barbeariaId, agendamentoId, {});
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, resultado.agendamento.clienteId);

  renderizarTudoAgendaMensal();
  mostrarToast("Falta de " + cliente.nome.split(" ")[0] + " registrada. Nenhum ponto lançado.", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudoAgendaMensal();
  });
}

/* ---------------------------------------------------------------
   Cabeçalho: nome da barbearia logada e botão Sair — mesmo padrão
   repetido em todas as telas do painel.
   ------------------------------------------------------------- */
function inicializarBarraTopoMensal() {
  const barbearia = Dados.obterBarbearia(sessaoAdmin.barbeariaId);
  document.getElementById("texto-barbearia-logada").textContent = barbearia.nome;

  document.getElementById("botao-mes-anterior").addEventListener("click", irParaMesAnterior);
  document.getElementById("botao-mes-proximo").addEventListener("click", irParaMesProximo);
  document.getElementById("botao-mes-hoje").addEventListener("click", irParaMesDeHoje);
}

/* ---------------------------------------------------------------
   Início: só agora, com todas as funções e constantes acima já
   declaradas, é seguro rodar a primeira renderização da tela.
   (Ver BASE-DE-CONHECIMENTO.md §9 — rodar isto antes das
   declarações já causou um ReferenceError real em outra tela.)
   ------------------------------------------------------------- */
if (sessaoAdmin) {
  inicializarBarraTopoMensal();
  estadoAgendaMensal.diaSelecionado = chaveDia(new Date());
  renderizarTudoAgendaMensal();
}
