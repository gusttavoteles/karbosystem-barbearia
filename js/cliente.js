/*
  cliente.js
  ----------
  Lógica da tela pública de agendamento (cliente/agendar.html),
  RF01-RF06 da documentação: a única tela do sistema sem login,
  acessada pelo link da barbearia (`cliente/agendar.html?barbearia=
  <slug>`, que no produto final seria `/b/<slug>`).

  Passo a passo (nesta ordem, por causa do RF01: "data → horário →
  barbeiro"):
    1. Data — dias sem nenhum horário livre (de nenhum barbeiro)
       aparecem desabilitados.
    2. Horário — união dos horários livres de todos os barbeiros
       naquele dia (ainda não se sabe quem vai atender).
    3. Barbeiro — só os que estão livres EXATAMENTE naquele horário.
    4. Dados do cliente (nome e telefone obrigatórios, nascimento
       opcional).
    5. Resumo + link para confirmar pelo WhatsApp da barbearia.

  O agendamento é gravado ao passar do passo 4 para o 5 (quando o
  cliente termina o formulário) — é o ponto mais próximo que dá para
  chegar de "grava no envio da mensagem" (RF05), já que o link
  `wa.me` não avisa o sistema se a mensagem foi realmente enviada
  (limitação registrada na seção 9 da documentação). O horário fica
  reservado a partir daí, mesmo que o cliente não chegue a mandar a
  mensagem — mesma leitura da questão em aberto nº 6 da documentação.

  Depende de js/dados.js, js/agenda.js e js/whatsapp.js (carregados
  antes deste arquivo).
*/

// Estado da tela inteira: tudo que o cliente já escolheu, até criar
// o agendamento. Não é persistido — some se a página recarregar.
const estadoCliente = {
  barbearia: null,
  configuracoes: null,
  duracaoMin: 30,
  dataEscolhida: null, // "AAAA-MM-DD"
  horaEscolhida: null, // "HH:MM"
  barbeiroEscolhido: null,
  agendamentoCriado: null, // { id } — preenchido ao gerar o agendamento
};

inicializar();

/* ---------------------------------------------------------------
   Ponto de entrada: lê o slug da URL e decide o que mostrar
   ------------------------------------------------------------- */
function inicializar() {
  const parametros = new URLSearchParams(window.location.search);
  const slug = parametros.get("barbearia");

  if (!slug) {
    mostrarErro("Link incompleto: falta dizer qual barbearia (parâmetro \"barbearia\" na URL).");
    return;
  }

  const barbearia = Dados.obterBarbeariaPorSlug(slug);
  if (!barbearia) {
    mostrarErro("Não encontramos nenhuma barbearia com este link. Confira o endereço com quem te enviou.");
    return;
  }
  if (barbearia.status !== "ATIVA") {
    mostrarErro(barbearia.nome + " não está disponível para agendamento no momento.");
    return;
  }

  estadoCliente.barbearia = barbearia;
  estadoCliente.configuracoes = Dados.obterConfiguracoes(barbearia.id);
  estadoCliente.duracaoMin = (estadoCliente.configuracoes && estadoCliente.configuracoes.duracaoPadraoMin) || 30;

  document.getElementById("texto-nome-barbearia").textContent = barbearia.nome;
  document.getElementById("tela-agendamento").style.display = "";

  inicializarNavegacao();
  renderizarDias();
  irParaPasso(1);
}

function mostrarErro(mensagem) {
  document.getElementById("texto-erro").textContent = mensagem;
  document.getElementById("tela-erro").style.display = "";
}

/* ---------------------------------------------------------------
   Navegação entre os 5 passos
   ------------------------------------------------------------- */
function irParaPasso(numero) {
  document.querySelectorAll(".passo").forEach((secao) => {
    secao.style.display = Number(secao.dataset.passo) === numero ? "" : "none";
  });

  document.querySelectorAll(".passos__item").forEach((item) => {
    const passoItem = Number(item.dataset.passo);
    item.classList.toggle("atual", passoItem === numero);
    item.classList.toggle("concluido", passoItem < numero);
  });

  window.scrollTo({ top: 0, behavior: "instant" });
}

function inicializarNavegacao() {
  // Todo botão "Voltar" tem data-voltar="<passo>" — exceto o do
  // passo 5, que também desfaz o agendamento já criado (ver
  // voltarDoResumo), porque reenviar o formulário criaria um
  // segundo agendamento em vez de corrigir o primeiro.
  document.querySelectorAll("[data-voltar]").forEach((botao) => {
    const destino = Number(botao.dataset.voltar);
    botao.addEventListener("click", function () {
      if (destino === 4 && estadoCliente.agendamentoCriado) {
        voltarDoResumo();
      }
      irParaPasso(destino);
    });
  });

  document.getElementById("formulario-cliente-publico").addEventListener("submit", confirmarDadosCliente);

  const linkFinal = document.getElementById("link-whatsapp-final");
  linkFinal.addEventListener("click", function () {
    // O clique abre o WhatsApp numa aba nova (target="_blank"); aqui
    // só trocamos o que esta aba mostra, para o cliente ver que o
    // horário já está reservado mesmo que feche a aba do WhatsApp.
    document.getElementById("link-whatsapp-confirmado").href = linkFinal.href;
    document.getElementById("tela-agendamento").style.display = "none";
    document.getElementById("tela-confirmado").style.display = "";
  });

  document.getElementById("botao-novo-agendamento-publico").addEventListener("click", function () {
    window.location.reload();
  });
}

/* ---------------------------------------------------------------
   Passo 1: data
   ------------------------------------------------------------- */
function renderizarDias() {
  const barbeariaId = estadoCliente.barbearia.id;
  const configuracoes = estadoCliente.configuracoes;
  const duracaoMin = estadoCliente.duracaoMin;
  const diasParaMostrar = (configuracoes && configuracoes.antecedenciaMaximaDias) || 30;

  const nomesDiaSemanaCurto = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const container = document.getElementById("lista-dias");
  container.innerHTML = "";

  for (let i = 0; i < diasParaMostrar; i++) {
    const data = new Date();
    data.setDate(data.getDate() + i);
    const dataTexto = Agenda.formatarDataIsoCurta(data);
    const temVaga = Agenda.diaTemHorarioLivre(barbeariaId, dataTexto, duracaoMin, configuracoes);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "dia-opcao";
    botao.disabled = !temVaga;
    botao.setAttribute("aria-pressed", String(dataTexto === estadoCliente.dataEscolhida));
    botao.innerHTML =
      '<span class="dia-opcao__semana">' + nomesDiaSemanaCurto[data.getDay()] + "</span>" +
      '<span class="dia-opcao__numero">' + data.getDate() + "</span>";

    if (temVaga) {
      botao.addEventListener("click", () => selecionarDia(dataTexto));
    }
    container.appendChild(botao);
  }
}

function selecionarDia(dataTexto) {
  estadoCliente.dataEscolhida = dataTexto;
  // Trocar o dia invalida as escolhas de horário e barbeiro feitas
  // antes, porque elas eram baseadas no dia anterior.
  estadoCliente.horaEscolhida = null;
  estadoCliente.barbeiroEscolhido = null;

  renderizarDias(); // redesenha para marcar o novo dia escolhido
  renderizarHorarios();
  irParaPasso(2);
}

/* ---------------------------------------------------------------
   Passo 2: horário (RF02 — só os livres, de qualquer barbeiro)
   ------------------------------------------------------------- */
function renderizarHorarios() {
  const { barbearia, configuracoes, duracaoMin, dataEscolhida } = estadoCliente;

  document.getElementById("texto-data-escolhida").textContent =
    formatarData(dataEscolhida) + " — escolha um horário para ver quem está disponível.";

  const horarios = Agenda.horariosLivresTodosBarbeiros(barbearia.id, dataEscolhida, duracaoMin, configuracoes);
  const container = document.getElementById("grade-horarios");
  container.innerHTML = "";

  horarios.forEach((hora) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "horario-opcao";
    botao.textContent = hora;
    botao.setAttribute("aria-pressed", String(hora === estadoCliente.horaEscolhida));
    botao.addEventListener("click", () => selecionarHorario(hora));
    container.appendChild(botao);
  });
}

function selecionarHorario(hora) {
  estadoCliente.horaEscolhida = hora;
  estadoCliente.barbeiroEscolhido = null;

  renderizarHorarios();
  renderizarBarbeiros();
  irParaPasso(3);
}

/* ---------------------------------------------------------------
   Passo 3: barbeiro (só os livres exatamente naquele horário)
   ------------------------------------------------------------- */
function renderizarBarbeiros() {
  const { barbearia, configuracoes, duracaoMin, dataEscolhida, horaEscolhida } = estadoCliente;

  document.getElementById("texto-horario-escolhido").textContent =
    formatarData(dataEscolhida) + " às " + horaEscolhida + " — quem vai te atender?";

  const livres = Agenda.barbeirosLivresNoHorario(barbearia.id, dataEscolhida, horaEscolhida, duracaoMin, configuracoes);
  const container = document.getElementById("lista-barbeiros-publico");
  container.innerHTML = "";

  livres.forEach((barbeiro) => {
    const iniciais = barbeiro.nome
      .split(" ")
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "barbeiro-opcao";
    botao.setAttribute("aria-pressed", String(estadoCliente.barbeiroEscolhido && estadoCliente.barbeiroEscolhido.id === barbeiro.id));
    botao.innerHTML =
      '<span class="barbeiro-opcao__avatar">' + iniciais + "</span>" +
      "<strong>" + barbeiro.nome + "</strong>";
    botao.addEventListener("click", () => selecionarBarbeiro(barbeiro));
    container.appendChild(botao);
  });
}

function selecionarBarbeiro(barbeiro) {
  estadoCliente.barbeiroEscolhido = barbeiro;
  renderizarBarbeiros();
  irParaPasso(4);
}

/* ---------------------------------------------------------------
   Passo 4 → 5: dados do cliente, criação do agendamento e resumo
   ------------------------------------------------------------- */
function confirmarDadosCliente(evento) {
  evento.preventDefault();
  const { barbearia, dataEscolhida, horaEscolhida, barbeiroEscolhido, duracaoMin, configuracoes } = estadoCliente;

  const nome = document.getElementById("campo-nome-publico").value.trim();
  const telefone = document.getElementById("campo-telefone-publico").value;
  const nascimento = document.getElementById("campo-nascimento-publico").value || null;

  if (!validarTelefone(telefone)) {
    alert("Telefone inválido. Confira o DDD e o número.");
    return;
  }

  const [ano, mes, dia] = dataEscolhida.split("-").map(Number);
  const [hora, minuto] = horaEscolhida.split(":").map(Number);
  const dataHora = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

  let cliente;
  let agendamento;
  try {
    cliente = Dados.criarOuObterCliente(barbearia.id, { nome, telefone, dataNascimento: nascimento });
    agendamento = Dados.criarAgendamento(barbearia.id, {
      clienteId: cliente.id,
      barbeiroId: barbeiroEscolhido.id,
      servicoId: null,
      dataHora: dataHora.toISOString(),
      duracaoMin,
      origem: "LINK",
    });
  } catch (erro) {
    // Em teoria, alguém pode ter ocupado o mesmo horário um instante
    // antes (ex.: outra aba). Manda de volta para a escolha de
    // horário, já atualizada, em vez de travar na mensagem de erro.
    alert(erro.message + " Escolha outro horário.");
    estadoCliente.horaEscolhida = null;
    estadoCliente.barbeiroEscolhido = null;
    renderizarHorarios();
    irParaPasso(2);
    return;
  }

  estadoCliente.agendamentoCriado = { id: agendamento.id, clienteNome: cliente.nome };

  const linkWhatsapp = Whatsapp.linkAgendamentoParaBarbearia(configuracoes, barbearia.telefone, {
    dataFormatada: formatarData(dataEscolhida),
    hora: horaEscolhida,
    nomeBarbeiro: barbeiroEscolhido.nome,
    nomeCliente: cliente.nome,
  });

  document.getElementById("resumo-final").innerHTML = `
    <div class="resumo-agendamento__linha"><span class="texto-secundario">Barbearia</span><strong>${escaparHtmlPublico(barbearia.nome)}</strong></div>
    <div class="resumo-agendamento__linha"><span class="texto-secundario">Data</span><strong>${formatarData(dataEscolhida)}</strong></div>
    <div class="resumo-agendamento__linha"><span class="texto-secundario">Horário</span><strong>${horaEscolhida}</strong></div>
    <div class="resumo-agendamento__linha"><span class="texto-secundario">Barbeiro</span><strong>${escaparHtmlPublico(barbeiroEscolhido.nome)}</strong></div>
    <div class="resumo-agendamento__linha"><span class="texto-secundario">Cliente</span><strong>${escaparHtmlPublico(cliente.nome)}</strong></div>
  `;
  document.getElementById("link-whatsapp-final").href = linkWhatsapp;

  irParaPasso(5);
}

/** Chamada ao voltar do resumo (passo 5) para o formulário (passo
 *  4): cancela o agendamento já criado, liberando o horário (regra 5
 *  da seção 6 da documentação), para que corrigir um dado não deixe
 *  um agendamento "fantasma" ocupando a vaga. */
function voltarDoResumo() {
  Dados.cancelarAgendamento(estadoCliente.barbearia.id, estadoCliente.agendamentoCriado.id);
  estadoCliente.agendamentoCriado = null;
  // O horário que acabou de ser liberado pode voltar a aparecer como
  // livre — refaz a lista antes de mostrar o passo 2 outra vez.
  renderizarHorarios();
}

/** Versão local de escaparHtml (js/admin.js não é carregado nesta
 *  tela pública — ela não tem sessão de administrador). Mesma
 *  lógica: evita que um nome com `<`/`>`/`&` quebre o HTML montado
 *  via innerHTML. */
function escaparHtmlPublico(texto) {
  const divisor = document.createElement("div");
  divisor.textContent = texto;
  return divisor.innerHTML;
}
