/*
  dashboard.js
  ------------
  Lógica da tela admin/proximos-dias.html — a tela inicial do
  painel (RF07-RF12 e RF18-RF21 da documentação): indicadores,
  filtro por barbeiro e busca, a lista dos próximos 3 dias com os
  botões de confirmar e cancelar, o painel de "aguardando
  finalização" (que gera o ponto de fidelidade), o resumo do cartão
  fidelidade e um mini calendário do mês.

  Depende de js/admin.js já ter rodado antes (expõe `sessaoAdmin`,
  `mostrarToast` e `escaparHtml`). Toda leitura e gravação passa
  pelas camadas Dados / Fidelidade / Finalizacao / Whatsapp — este
  arquivo só decide o que a TELA mostra e faz com o que elas dão.

  Links de navegação para telas que ainda não existem (Agenda
  mensal, Novo agendamento, Clientes e fidelidade — fase 3 do
  roadmap) mostram um aviso em vez de levar a uma página quebrada;
  ver tratarBotoesEmConstrucao().
*/

// Estado só desta tela: filtros e seleção, nada que precise
// sobreviver a um recarregamento de página.
const estadoDashboard = {
  barbeiroId: "TODOS",
  diaSelecionado: 0, // 0 = hoje, 1 = amanhã, 2 = depois de amanhã
  busca: "",
  diaCalendarioSelecionado: new Date().getDate(),
};

if (sessaoAdmin) {
  inicializarCabecalho();
  inicializarFiltros();
  tratarBotoesEmConstrucao();
  renderizarTudo();
}

/* ---------------------------------------------------------------
   Cabeçalho: saudação, data e link público
   ------------------------------------------------------------- */
function inicializarCabecalho() {
  const agora = new Date();
  const barbearia = Dados.obterBarbearia(sessaoAdmin.barbeariaId);

  document.getElementById("texto-data-hoje").textContent = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  document.getElementById("texto-saudacao").textContent = saudacao;

  const linkPublico = window.location.origin + "/b/" + barbearia.slug;
  const elementoLink = document.getElementById("texto-link-publico");
  elementoLink.textContent = linkPublico;

  document.getElementById("botao-copiar-link").addEventListener("click", async function (evento) {
    try {
      await navigator.clipboard.writeText(linkPublico);
      evento.target.textContent = "Link copiado";
    } catch (erro) {
      // Alguns navegadores/ambientes bloqueiam a área de
      // transferência; cai para uma seleção manual do texto.
      console.warn("Não foi possível copiar automaticamente.", erro);
      evento.target.textContent = "Copie manualmente acima";
    }
    setTimeout(() => { evento.target.textContent = "Copiar link"; }, 2000);
  });
}

/** Botões que levam a telas de fases futuras do roadmap mostram um
 *  aviso em vez de um link quebrado (nenhum href="#" morto). */
function tratarBotoesEmConstrucao() {
  document.querySelectorAll('[data-acao="em-construcao"]').forEach((botao) => {
    botao.addEventListener("click", function () {
      mostrarToast(botao.dataset.nome + ": tela da próxima fase do roadmap.");
    });
  });
}

/* ---------------------------------------------------------------
   Filtros: barbeiro e busca
   ------------------------------------------------------------- */
function inicializarFiltros() {
  document.getElementById("campo-busca").addEventListener("input", function (evento) {
    estadoDashboard.busca = evento.target.value;
    renderizarTudo();
  });
}

/* ---------------------------------------------------------------
   Datas auxiliares: "hoje", "amanhã" e "depois de amanhã", sempre
   calculadas a partir do relógio real — nada fixo no código.
   ------------------------------------------------------------- */
function inicioDoDia(offsetDias) {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() + offsetDias);
  return data;
}

function horaCurta(data) {
  return String(data.getHours()).padStart(2, "0") + ":" + String(data.getMinutes()).padStart(2, "0");
}

function dataCurta(data) {
  return String(data.getDate()).padStart(2, "0") + "/" + String(data.getMonth() + 1).padStart(2, "0");
}

const NOMES_DIA_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function descricaoDosDias() {
  const rotulos = ["Hoje", "Amanhã", "Depois de amanhã"];
  const palavraRelativa = ["hoje", "amanhã", "depois de amanhã"];

  return [0, 1, 2].map((offset) => {
    const inicio = inicioDoDia(offset);
    return {
      offset,
      rotulo: rotulos[offset],
      palavraRelativa: palavraRelativa[offset],
      subRotulo: NOMES_DIA_SEMANA_CURTO[inicio.getDay()] + " · " + dataCurta(inicio),
      dataFormatada: dataCurta(inicio),
      inicio,
      fim: inicioDoDia(offset + 1),
    };
  });
}

/* ---------------------------------------------------------------
   Função central: recalcula tudo e redesenha a tela inteira. É
   chamada sempre que um filtro muda ou uma ação altera algum dado.
   ------------------------------------------------------------- */
function renderizarTudo() {
  const barbeariaId = sessaoAdmin.barbeariaId;
  const barbeiros = Dados.listarBarbeiros(barbeariaId);
  const clientes = Dados.listarClientes(barbeariaId);
  const agora = new Date();

  const mapaClientes = {};
  clientes.forEach((c) => { mapaClientes[c.id] = c; });
  const mapaBarbeiros = {};
  barbeiros.forEach((b) => { mapaBarbeiros[b.id] = b; });

  const todosAgendamentos = Dados.listarAgendamentos(barbeariaId);
  const agendamentosFiltrados =
    estadoDashboard.barbeiroId === "TODOS"
      ? todosAgendamentos
      : todosAgendamentos.filter((a) => a.barbeiroId === estadoDashboard.barbeiroId);

  const ehAtivo = (a) => a.status === "AGENDADO" || a.status === "CONFIRMADO";
  const jaPassou = (a) => new Date(a.dataHora) < agora;

  renderizarChipsBarbeiro(barbeiros, todosAgendamentos, agora);
  renderizarKpis(barbeariaId, agendamentosFiltrados, mapaClientes, agora, ehAtivo, jaPassou);
  renderizarAbasDia(agendamentosFiltrados, ehAtivo, jaPassou);
  renderizarListaAgendamentos(agendamentosFiltrados, mapaClientes, mapaBarbeiros, ehAtivo, jaPassou);
  renderizarAguardandoFinalizacao(barbeariaId, agendamentosFiltrados, mapaClientes, mapaBarbeiros, ehAtivo, jaPassou);
  renderizarFidelidade(barbeariaId);
  renderizarMiniCalendario(barbeariaId, agendamentosFiltrados);
}

/* ---------------------------------------------------------------
   Chips de barbeiro
   ------------------------------------------------------------- */
function renderizarChipsBarbeiro(barbeiros, todosAgendamentos, agora) {
  const container = document.getElementById("chips-barbeiro");
  const ehAtivo = (a) => a.status === "AGENDADO" || a.status === "CONFIRMADO";
  const naoPassou = (a) => new Date(a.dataHora) >= agora;
  const proximos = todosAgendamentos.filter((a) => ehAtivo(a) && naoPassou(a));

  const opcoes = [{ id: "TODOS", nome: "Todos" }].concat(
    barbeiros.map((b) => ({ id: b.id, nome: b.nome }))
  );

  container.innerHTML =
    '<span class="texto-secundario" style="margin-right: 4px;">Barbeiro</span>' +
    opcoes
      .map((opcao) => {
        const ativo = estadoDashboard.barbeiroId === opcao.id;
        const contagem =
          opcao.id === "TODOS" ? proximos.length : proximos.filter((a) => a.barbeiroId === opcao.id).length;

        return `
          <button class="chip" aria-pressed="${ativo}" data-barbeiro="${opcao.id}">
            ${escaparHtml(opcao.nome)}
            <span class="chip__contagem">${contagem}</span>
          </button>
        `;
      })
      .join("");

  container.querySelectorAll("[data-barbeiro]").forEach((botao) => {
    botao.addEventListener("click", function () {
      estadoDashboard.barbeiroId = botao.dataset.barbeiro;
      renderizarTudo();
    });
  });
}

/* ---------------------------------------------------------------
   Indicadores (KPIs)
   ------------------------------------------------------------- */
function renderizarKpis(barbeariaId, agendamentos, mapaClientes, agora, ehAtivo, jaPassou) {
  const dias = descricaoDosDias();
  const hoje = dias[0];

  const doHoje = agendamentos.filter((a) => {
    const d = new Date(a.dataHora);
    return d >= hoje.inicio && d < hoje.fim && a.status !== "CANCELADO";
  });
  const realizadosHoje = doHoje.filter((a) => a.status === "REALIZADO").length;
  const restantesHoje = doHoje.filter((a) => ehAtivo(a) && !jaPassou(a)).length;

  const proximos3Dias = agendamentos.filter((a) => {
    const d = new Date(a.dataHora);
    return ehAtivo(a) && !jaPassou(a) && d < dias[2].fim;
  });
  const confirmados = proximos3Dias.filter((a) => a.status === "CONFIRMADO").length;
  const percentualConfirmado = proximos3Dias.length ? Math.round((confirmados / proximos3Dias.length) * 100) : 0;

  // "Aguardando finalização" olha TODO o histórico, não só os
  // próximos 3 dias: um atendimento de ontem que ninguém finalizou
  // continua pendente hoje.
  const aguardando = agendamentos.filter((a) => ehAtivo(a) && jaPassou(a));

  const clientesComSaldoMeta = Dados.listarSaldosFidelidade(barbeariaId);
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;
  const cortesGratisDisponiveis = clientesComSaldoMeta.filter((item) => item.saldo >= meta).length;

  const kpis = [
    {
      rotulo: "Atendimentos hoje",
      valor: String(doHoje.length),
      sub: realizadosHoje + " realizados · " + restantesHoje + " restantes",
      barra: null,
    },
    {
      rotulo: "Confirmados · 3 dias",
      valor: confirmados + "/" + proximos3Dias.length,
      sub: percentualConfirmado + "% dos próximos horários",
      barra: percentualConfirmado,
    },
    {
      rotulo: "Aguardando finalização",
      valor: String(aguardando.length),
      sub: aguardando.length ? "Barbeiros precisam registrar" : "Tudo em dia",
      barra: null,
    },
    {
      rotulo: "Cortes grátis disponíveis",
      valor: String(cortesGratisDisponiveis),
      sub: "Cartões completos para resgate",
      barra: null,
    },
  ];

  document.getElementById("area-kpis").innerHTML = kpis
    .map(
      (k) => `
        <div class="kpi">
          <div class="texto-secundario">${k.rotulo}</div>
          <div class="kpi__valor numero-tabular">${k.valor}</div>
          ${
            k.barra !== null
              ? `<div class="kpi__barra" role="img" aria-label="${k.barra}% confirmados"><div style="width: ${k.barra}%;"></div></div>`
              : ""
          }
          <div class="texto-secundario" style="font-size: 13px;">${k.sub}</div>
        </div>
      `
    )
    .join("");

  const totalAConfirmar = proximos3Dias.length - confirmados;
  document.getElementById("texto-resumo").textContent =
    aguardando.length === 0 && totalAConfirmar === 0
      ? "Tudo em dia: nada pendente de confirmação ou finalização."
      : plural(aguardando.length, "atendimento aguardando finalização", "atendimentos aguardando finalização") +
        " · " +
        plural(totalAConfirmar, "horário a confirmar", "horários a confirmar") +
        " nos próximos 3 dias";
}

function plural(n, singular, pluralForma) {
  return n + " " + (n === 1 ? singular : pluralForma);
}

/* ---------------------------------------------------------------
   Abas de dia
   ------------------------------------------------------------- */
function renderizarAbasDia(agendamentos, ehAtivo, jaPassou) {
  const dias = descricaoDosDias();

  document.getElementById("abas-dia").innerHTML = dias
    .map((dia) => {
      const ativo = estadoDashboard.diaSelecionado === dia.offset;
      const contagem = agendamentos.filter((a) => {
        const d = new Date(a.dataHora);
        return ehAtivo(a) && !jaPassou(a) && d >= dia.inicio && d < dia.fim;
      }).length;

      return `
        <button class="aba-dia" aria-pressed="${ativo}" data-dia="${dia.offset}">
          <span>
            <span class="aba-dia__rotulo">${dia.rotulo}</span>
            <span class="aba-dia__sub numero-tabular">${dia.subRotulo}</span>
          </span>
          <span class="aba-dia__contagem numero-tabular">${contagem}</span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll("[data-dia]").forEach((botao) => {
    botao.addEventListener("click", function () {
      estadoDashboard.diaSelecionado = Number(botao.dataset.dia);
      renderizarTudo();
    });
  });
}

/* ---------------------------------------------------------------
   Lista de agendamentos do dia escolhido
   ------------------------------------------------------------- */
function renderizarListaAgendamentos(agendamentos, mapaClientes, mapaBarbeiros, ehAtivo, jaPassou) {
  const dias = descricaoDosDias();
  const dia = dias[estadoDashboard.diaSelecionado];
  const configuracoes = Dados.obterConfiguracoes(sessaoAdmin.barbeariaId);

  const termoBusca = estadoDashboard.busca.trim().toLowerCase();
  const termoBuscaDigitos = termoBusca.replace(/\D/g, "");

  const linhas = agendamentos
    .filter((a) => {
      const d = new Date(a.dataHora);
      if (!(ehAtivo(a) && !jaPassou(a) && d >= dia.inicio && d < dia.fim)) return false;

      if (!termoBusca) return true;
      const cliente = mapaClientes[a.clienteId];
      if (!cliente) return false;
      const nomeBate = cliente.nome.toLowerCase().includes(termoBusca);
      const telefoneBate = termoBuscaDigitos.length > 0 && cliente.telefone.includes(termoBuscaDigitos);
      return nomeBate || telefoneBate;
    })
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  const container = document.getElementById("lista-agendamentos");
  const aConfirmar = linhas.filter((a) => a.status !== "CONFIRMADO").length;
  document.getElementById("texto-resumo-lista").textContent =
    plural(linhas.length, "agendamento", "agendamentos") + " · " + plural(aConfirmar, "a confirmar", "a confirmar");

  if (linhas.length === 0) {
    container.innerHTML = `
      <div style="padding: 44px 20px 52px; border-top: 1px solid var(--cor-borda); text-align: center;">
        <div style="font-weight: 600; margin-bottom: 6px;">Nenhum agendamento por aqui</div>
        <p class="texto-secundario" style="max-width: 340px; margin: 0 auto;">
          Não há horários para este dia com os filtros atuais. Troque o dia, o barbeiro ou limpe a busca.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = linhas
    .map((agendamento) => {
      const cliente = mapaClientes[agendamento.clienteId];
      const barbeiro = mapaBarbeiros[agendamento.barbeiroId];
      const confirmado = agendamento.status === "CONFIRMADO";
      const corSelo = confirmado ? "selo--sucesso" : "selo--neutro";

      const linkConfirmar = Whatsapp.linkConfirmacaoParaCliente(configuracoes, {
        nomeCliente: cliente.nome,
        telefoneCliente: cliente.telefone,
        diaRelativo: dia.palavraRelativa,
        dataFormatada: dia.dataFormatada,
        hora: horaCurta(new Date(agendamento.dataHora)),
        nomeBarbeiro: barbeiro.nome,
      });
      const linkConversa = Whatsapp.linkConversaComCliente(cliente.telefone);

      return `
        <div class="linha-agendamento">
          <div class="linha-agendamento__hora">
            <strong class="numero-tabular">${horaCurta(new Date(agendamento.dataHora))}</strong>
            <span>${agendamento.duracaoMin} min</span>
          </div>
          <div class="linha-agendamento__cliente">
            <strong>${escaparHtml(cliente.nome)}</strong>
            <span class="numero-tabular">${formatarTelefone(cliente.telefone)}</span>
          </div>
          <div class="linha-agendamento__barbeiro">
            <div class="item-cadastro__detalhe" style="font-weight: 500; color: var(--cor-texto);">${escaparHtml(barbeiro.nome)}</div>
          </div>
          <div>
            <span class="selo ${corSelo}">${confirmado ? "Confirmado" : "Agendado"}</span>
          </div>
          <div class="linha-agendamento__acoes">
            ${
              confirmado
                ? `<a class="botao botao--secundario botao--pequeno" href="${linkConversa}" target="_blank" rel="noopener">Conversa</a>`
                : `<a class="botao botao--whatsapp botao--pequeno" href="${linkConfirmar}" target="_blank" rel="noopener" data-acao="confirmar-whatsapp">Confirmar</a>
                   <button class="botao botao--secundario botao--pequeno" data-acao="marcar-confirmado" data-id="${agendamento.id}">Marcar confirmado</button>`
            }
            <button class="botao botao--perigo botao--pequeno" data-acao="cancelar" data-id="${agendamento.id}" aria-label="Cancelar agendamento de ${escaparHtml(cliente.nome)}">
              Cancelar
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll('[data-acao="marcar-confirmado"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoConfirmar(botao.dataset.id));
  });
  container.querySelectorAll('[data-acao="cancelar"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoCancelar(botao.dataset.id));
  });
}

/* ---------------------------------------------------------------
   Ações sobre um agendamento, cada uma com Desfazer via snapshot
   ------------------------------------------------------------- */
function acaoConfirmar(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const agendamento = Dados.confirmarAgendamento(sessaoAdmin.barbeariaId, agendamentoId);
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, agendamento.clienteId);

  renderizarTudo();
  mostrarToast(cliente.nome + " confirmado para " + horaCurta(new Date(agendamento.dataHora)) + ".", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudo();
  });
}

function acaoCancelar(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const agendamento = Dados.cancelarAgendamento(sessaoAdmin.barbeariaId, agendamentoId);
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, agendamento.clienteId);

  renderizarTudo();
  mostrarToast("Agendamento de " + cliente.nome + " cancelado. Horário liberado.", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudo();
  });
}

/* ---------------------------------------------------------------
   Aguardando finalização
   ------------------------------------------------------------- */
function renderizarAguardandoFinalizacao(barbeariaId, agendamentos, mapaClientes, mapaBarbeiros, ehAtivo, jaPassou) {
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;

  const aguardando = agendamentos
    .filter((a) => ehAtivo(a) && jaPassou(a))
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  const selo = document.getElementById("selo-aguardando");
  selo.textContent = String(aguardando.length);
  selo.className = aguardando.length ? "selo selo--sucesso" : "selo selo--neutro";

  const container = document.getElementById("lista-aguardando");

  if (aguardando.length === 0) {
    container.innerHTML = `
      <div class="item-finalizar" style="flex-direction: row; align-items: center;">
        <span class="selo selo--sucesso">✓</span>
        <div>
          <div style="font-weight: 600;">Tudo em dia</div>
          <div class="texto-secundario" style="font-size: 13px;">Nenhum atendimento aguardando finalização.</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = aguardando
    .map((agendamento) => {
      const cliente = mapaClientes[agendamento.clienteId];
      const barbeiro = mapaBarbeiros[agendamento.barbeiroId];
      const saldoAtual = Dados.saldoFidelidade(cliente.id);
      const completa = saldoAtual + 1 === meta;

      return `
        <div class="item-finalizar">
          <div class="flex--entre" style="align-items: flex-start;">
            <div>
              <div style="font-weight: 600; font-size: 15px;">${escaparHtml(cliente.nome)}</div>
              <div class="texto-secundario" style="font-size: 13px;">
                <span class="numero-tabular">${horaCurta(new Date(agendamento.dataHora))}</span> · ${escaparHtml(barbeiro.nome)}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="texto-secundario numero-tabular" style="font-size: 13px;">${Math.min(saldoAtual, meta)}/${meta} pontos</div>
              ${completa ? '<div style="font-size: 12px; font-weight: 600; color: var(--cor-primaria);">Completa o cartão</div>' : ""}
            </div>
          </div>
          <div class="flex" style="gap: var(--espaco-2);">
            <button class="botao botao--primario botao--bloco botao--pequeno" data-acao="finalizar-realizado" data-id="${agendamento.id}">
              Realizado
            </button>
            <button class="botao botao--secundario botao--bloco botao--pequeno" data-acao="finalizar-nao-compareceu" data-id="${agendamento.id}">
              Não compareceu
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll('[data-acao="finalizar-realizado"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoFinalizarRealizado(botao.dataset.id));
  });
  container.querySelectorAll('[data-acao="finalizar-nao-compareceu"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoFinalizarNaoCompareceu(botao.dataset.id));
  });
}

function acaoFinalizarRealizado(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const resultado = Finalizacao.marcarRealizado(sessaoAdmin.barbeariaId, agendamentoId, {
    finalizadoPor: null, // TODO (fase 5): id de quem está logado (admin ou barbeiro)
  });
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, resultado.agendamento.clienteId);
  const primeiroNome = cliente.nome.split(" ")[0];

  renderizarTudo();
  mostrarToast(
    resultado.completouCartao
      ? cliente.nome + " completou o cartão: " + (Dados.obterConfiguracoes(sessaoAdmin.barbeariaId).fidelidadeRecompensa) + " disponível."
      : "+1 ponto para " + primeiroNome + " (" + resultado.saldoAtual + "/" + resultado.meta + ").",
    () => {
      Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
      renderizarTudo();
    }
  );
}

function acaoFinalizarNaoCompareceu(agendamentoId) {
  const antes = Dados.obterInstantaneo(sessaoAdmin.barbeariaId);
  const resultado = Finalizacao.marcarNaoCompareceu(sessaoAdmin.barbeariaId, agendamentoId, {});
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, resultado.agendamento.clienteId);

  renderizarTudo();
  mostrarToast("Falta de " + cliente.nome.split(" ")[0] + " registrada. Nenhum ponto lançado.", () => {
    Dados.restaurarInstantaneo(sessaoAdmin.barbeariaId, antes);
    renderizarTudo();
  });
}

/* ---------------------------------------------------------------
   Cartão fidelidade (resumo)
   ------------------------------------------------------------- */
function renderizarFidelidade(barbeariaId) {
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  const meta = configuracoes.metaFidelidadeQtd;
  document.getElementById("texto-meta-fidelidade").textContent =
    "Clientes mais perto de " + configuracoes.fidelidadeRecompensa.toLowerCase() + " (meta: " + meta + " cortes).";

  const maiores = Fidelidade.maioresSaldos(barbeariaId, 4);
  const container = document.getElementById("lista-fidelidade");

  if (maiores.length === 0) {
    container.innerHTML = '<p class="lista-vazia">Nenhum cliente com pontos ainda.</p>';
    return;
  }

  container.innerHTML = maiores
    .map(({ cliente, progresso }) => {
      const corBarra = progresso.completou ? "var(--cor-sucesso)" : "var(--cor-primaria)";
      return `
        <div class="item-fidelidade">
          <div class="flex--entre">
            <div style="font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escaparHtml(cliente.nome)}</div>
            <div class="numero-tabular" style="font-size: 13px; font-weight: 600; color: ${progresso.completou ? "var(--cor-sucesso)" : "var(--cor-texto-secundario)"};">${progresso.rotulo}</div>
          </div>
          <div class="flex" style="gap: var(--espaco-3);">
            <div class="kpi__barra" style="flex: 1;" role="img" aria-label="${Math.min(progresso.saldo, progresso.meta)} de ${progresso.meta} cortes">
              <div style="width: ${progresso.percentual}%; background-color: ${corBarra};"></div>
            </div>
            ${
              progresso.completou
                ? `<button class="botao botao--secundario botao--pequeno" data-acao="resgatar" data-cliente="${cliente.id}">Resgatar</button>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll('[data-acao="resgatar"]').forEach((botao) => {
    botao.addEventListener("click", () => acaoResgatarFidelidade(botao.dataset.cliente));
  });
}

function acaoResgatarFidelidade(clienteId) {
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, clienteId);
  Fidelidade.resgatar(sessaoAdmin.barbeariaId, clienteId);

  renderizarTudo();
  mostrarToast((cliente ? cliente.nome : "Cliente") + ": recompensa resgatada. Novo ciclo iniciado.", null);
}

/* ---------------------------------------------------------------
   Mini calendário do mês
   ------------------------------------------------------------- */
function renderizarMiniCalendario(barbeariaId, agendamentosFiltrados) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  const nomesDoMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  document.getElementById("texto-mes-calendario").textContent =
    nomesDoMes.charAt(0).toUpperCase() + nomesDoMes.slice(1);
  document.getElementById("texto-escopo-calendario").textContent =
    estadoDashboard.barbeiroId === "TODOS"
      ? "Todos os barbeiros"
      : (Dados.obterBarbeiro(barbeariaId, estadoDashboard.barbeiroId) || {}).nome || "—";

  // Quantidade de agendamentos (não cancelados) de cada dia do mês,
  // já considerando o filtro de barbeiro atual.
  function contagemDoDia(dia) {
    const inicio = new Date(ano, mes, dia, 0, 0, 0, 0);
    const fim = new Date(ano, mes, dia + 1, 0, 0, 0, 0);
    return agendamentosFiltrados.filter((a) => {
      const d = new Date(a.dataHora);
      return d >= inicio && d < fim && a.status !== "CANCELADO";
    }).length;
  }

  const celulas = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);

  const grade = document.getElementById("grade-calendario");
  grade.innerHTML = celulas
    .map((dia) => {
      if (dia === null) return '<span aria-hidden="true"></span>';

      const contagem = contagemDoDia(dia);
      const ehHoje = dia === hoje.getDate();
      const selecionada = dia === estadoDashboard.diaCalendarioSelecionado;
      const intensidade = Math.min(contagem / 10, 1) * 40;
      const classes = ["mini-calendario__celula", "numero-tabular"];
      if (ehHoje) classes.push("hoje");
      if (selecionada) classes.push("selecionada");
      if (dia < hoje.getDate()) classes.push("passado");

      return `
        <button
          class="${classes.join(" ")}"
          style="background-color: color-mix(in srgb, var(--cor-primaria) ${intensidade}%, var(--cor-fundo-elevado));"
          data-dia-calendario="${dia}"
          aria-pressed="${selecionada}"
          aria-label="${dia} de ${nomesDoMes}: ${contagem === 0 ? "sem atendimentos" : plural(contagem, "agendamento", "agendamentos")}"
        >${dia}</button>
      `;
    })
    .join("");

  grade.querySelectorAll("[data-dia-calendario]").forEach((botao) => {
    botao.addEventListener("click", function () {
      estadoDashboard.diaCalendarioSelecionado = Number(botao.dataset.diaCalendario);
      renderizarMiniCalendario(barbeariaId, agendamentosFiltrados);
    });
  });

  const diaSel = estadoDashboard.diaCalendarioSelecionado;
  const contagemSel = contagemDoDia(diaSel);
  const dataSel = new Date(ano, mes, diaSel);
  const nomeDiaSemana = dataSel.toLocaleDateString("pt-BR", { weekday: "long" });
  const ehHojeSel = diaSel === hoje.getDate();

  document.getElementById("texto-dia-selecionado").textContent =
    nomeDiaSemana.charAt(0).toUpperCase() + nomeDiaSemana.slice(1) + ", " + dataCurta(dataSel) + (ehHojeSel ? " · hoje" : "");
  document.getElementById("texto-resumo-dia-selecionado").textContent =
    contagemSel === 0 ? "Sem atendimentos" : plural(contagemSel, "agendamento", "agendamentos");
}
