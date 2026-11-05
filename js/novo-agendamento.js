/*
  novo-agendamento.js
  --------------------
  Lógica da tela admin/novo-agendamento.html (RF08 da documentação):
  o administrador encaixa manualmente um cliente na agenda, sem ele
  passar pelo link público.

  Passo a passo da tela:
    1. Telefone do cliente — se já existir cadastro nesta barbearia,
       o nome é preenchido sozinho; se não, pede nome (e nascimento,
       opcional) para cadastrar na hora.
    2. Serviço e barbeiro.
    3. Data e horário — a lista de horários só aparece depois que
       serviço, barbeiro e data estão escolhidos, e só mostra os
       horários realmente livres (dentro da jornada do barbeiro
       naquele dia da semana, sem conflito com outro agendamento
       ativo do mesmo barbeiro).

  Depende de js/admin.js (sessaoAdmin, mostrarToast, escaparHtml).
*/

if (sessaoAdmin) {
  inicializarBarraTopo();
  inicializarFormulario();
}

/* ---------------------------------------------------------------
   Preenchimento inicial dos campos fixos (serviço, barbeiro, data)
   ------------------------------------------------------------- */
function inicializarFormulario() {
  const barbeariaId = sessaoAdmin.barbeariaId;
  const servicos = Dados.listarServicos(barbeariaId);
  const barbeiros = Dados.listarBarbeiros(barbeariaId);

  const campoServico = document.getElementById("campo-servico");
  servicos.forEach((servico) => {
    const opcao = document.createElement("option");
    opcao.value = servico.id;
    opcao.textContent = servico.nome + " — " + formatarMoeda(servico.preco);
    campoServico.appendChild(opcao);
  });

  const campoBarbeiro = document.getElementById("campo-barbeiro");
  barbeiros.forEach((barbeiro) => {
    const opcao = document.createElement("option");
    opcao.value = barbeiro.id;
    opcao.textContent = barbeiro.nome;
    campoBarbeiro.appendChild(opcao);
  });

  // A data mínima é hoje — não faz sentido encaixar num dia que já
  // passou. (A antecedência mínima em horas, configurável por
  // barbearia, é aplicada mais abaixo, ao listar os horários do dia.)
  const campoData = document.getElementById("campo-data");
  campoData.min = formatarDataIsoCurta(new Date());

  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  if (configuracoes && configuracoes.antecedenciaMaximaDias) {
    const maxima = new Date();
    maxima.setDate(maxima.getDate() + configuracoes.antecedenciaMaximaDias);
    campoData.max = formatarDataIsoCurta(maxima);
  }

  inicializarCampoTelefone();
  [campoServico, campoBarbeiro, campoData].forEach((campo) => {
    campo.addEventListener("change", atualizarHorariosDisponiveis);
  });

  document.getElementById("formulario-agendamento").addEventListener("submit", criarAgendamentoManual);
}

/** "AAAA-MM-DD" de um objeto Date, no fuso local (não usar
 *  toISOString() aqui — ela converte para UTC e pode voltar um dia). */
function formatarDataIsoCurta(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

/* ---------------------------------------------------------------
   Cliente: busca por telefone, com cadastro na hora se for novo
   ------------------------------------------------------------- */
function inicializarCampoTelefone() {
  const campoTelefone = document.getElementById("campo-telefone");
  const campoNomeWrapper = document.getElementById("campo-nome-wrapper");
  const campoNascimentoWrapper = document.getElementById("campo-nascimento-wrapper");
  const campoNome = document.getElementById("campo-nome");
  const textoStatus = document.getElementById("texto-status-cliente");

  // Começa escondendo os campos de cadastro — só aparecem quando o
  // telefone digitado não pertence a nenhum cliente já cadastrado.
  campoNomeWrapper.style.display = "none";
  campoNascimentoWrapper.style.display = "none";

  campoTelefone.addEventListener("input", function () {
    const telefone = campoTelefone.value;
    if (!validarTelefone(telefone)) {
      campoNomeWrapper.style.display = "none";
      campoNascimentoWrapper.style.display = "none";
      textoStatus.textContent = "Digite o telefone — se o cliente já tiver cadastro nesta barbearia, o nome aparece sozinho.";
      return;
    }

    const existente = Dados.buscarClientePorTelefone(sessaoAdmin.barbeariaId, telefone);
    if (existente) {
      campoNome.value = existente.nome;
      campoNomeWrapper.style.display = "none";
      campoNascimentoWrapper.style.display = "none";
      textoStatus.textContent = "Cliente já cadastrado: " + existente.nome + ".";
    } else {
      campoNome.value = "";
      campoNomeWrapper.style.display = "";
      campoNascimentoWrapper.style.display = "";
      textoStatus.textContent = "Cliente novo — será cadastrado junto com este agendamento.";
    }
  });
}

/* ---------------------------------------------------------------
   Horários disponíveis: recalculados sempre que serviço, barbeiro
   ou data mudam.
   ------------------------------------------------------------- */
function atualizarHorariosDisponiveis() {
  const barbeariaId = sessaoAdmin.barbeariaId;
  const campoHorario = document.getElementById("texto-status-horario");
  const selectHorario = document.getElementById("campo-horario");

  const servicoId = document.getElementById("campo-servico").value;
  const barbeiroId = document.getElementById("campo-barbeiro").value;
  const dataTexto = document.getElementById("campo-data").value;

  selectHorario.innerHTML = '<option value="" disabled selected>Escolha serviço, barbeiro e data</option>';
  selectHorario.disabled = true;
  campoHorario.textContent = "";

  if (!servicoId || !barbeiroId || !dataTexto) return;

  const servico = Dados.obterServico(barbeariaId, servicoId);
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  const duracaoMin = (servico && servico.duracaoMin) || (configuracoes && configuracoes.duracaoPadraoMin) || 30;

  const horarios = horariosLivres(barbeariaId, barbeiroId, dataTexto, duracaoMin, configuracoes);

  if (horarios.length === 0) {
    selectHorario.innerHTML = '<option value="" disabled selected>Nenhum horário livre</option>';
    const barbeiro = Dados.obterBarbeiro(barbeariaId, barbeiroId);
    const todosHorarios = Dados.listarHorarios(barbeariaId, barbeiroId);
    campoHorario.textContent =
      todosHorarios.length === 0
        ? barbeiro.nome + " ainda não tem horário de trabalho cadastrado (ver aba Cadastros)."
        : "Sem horários livres para " + barbeiro.nome + " neste dia — tente outra data.";
    return;
  }

  selectHorario.innerHTML = '<option value="" disabled selected>Escolha um horário</option>';
  horarios.forEach((hora) => {
    const opcao = document.createElement("option");
    opcao.value = hora;
    opcao.textContent = hora;
    selectHorario.appendChild(opcao);
  });
  selectHorario.disabled = false;
  campoHorario.textContent = horarios.length + " horário(s) livre(s), de " + duracaoMin + " minutos cada.";
}

/** Calcula os horários livres de um barbeiro, num dia específico,
 *  para um serviço de `duracaoMin` minutos: dentro da jornada de
 *  trabalho dele naquele dia da semana (js/dados.js,
 *  listarHorarios), em intervalos do tamanho do próprio serviço, e
 *  sem bater no horário exato de outro agendamento ativo dele
 *  (mesma regra de conflito usada por Dados.criarAgendamento).
 *  Devolve uma lista de textos "HH:MM". */
function horariosLivres(barbeariaId, barbeiroId, dataTexto, duracaoMin, configuracoes) {
  const [ano, mes, dia] = dataTexto.split("-").map(Number);
  const dataBase = new Date(ano, mes - 1, dia);
  const diaSemana = dataBase.getDay();

  const jornadas = Dados.listarHorarios(barbeariaId, barbeiroId).filter(
    (h) => h.diaSemana === diaSemana
  );
  if (jornadas.length === 0) return [];

  const agendamentosDoDia = Dados.listarAgendamentos(barbeariaId, {
    barbeiroId,
    desde: dataBase,
    ate: new Date(ano, mes - 1, dia + 1),
  }).filter((a) => Dados.ehStatusAtivo(a.status));

  const agora = new Date();
  const antecedenciaMinimaHoras = (configuracoes && configuracoes.antecedenciaMinimaHoras) || 0;
  const limiteMinimo = new Date(agora.getTime() + antecedenciaMinimaHoras * 60 * 60 * 1000);

  const livres = [];
  jornadas.forEach((jornada) => {
    const [horaInicioH, horaInicioM] = jornada.horaInicio.split(":").map(Number);
    const [horaFimH, horaFimM] = jornada.horaFim.split(":").map(Number);

    let inicioSlot = new Date(ano, mes - 1, dia, horaInicioH, horaInicioM, 0, 0);
    const fimJornada = new Date(ano, mes - 1, dia, horaFimH, horaFimM, 0, 0);

    while (inicioSlot.getTime() + duracaoMin * 60 * 1000 <= fimJornada.getTime()) {
      const ocupado = agendamentosDoDia.some(
        (a) => new Date(a.dataHora).getTime() === inicioSlot.getTime()
      );
      if (!ocupado && inicioSlot >= limiteMinimo) {
        livres.push(
          String(inicioSlot.getHours()).padStart(2, "0") + ":" + String(inicioSlot.getMinutes()).padStart(2, "0")
        );
      }
      inicioSlot = new Date(inicioSlot.getTime() + duracaoMin * 60 * 1000);
    }
  });

  return livres;
}

/* ---------------------------------------------------------------
   Criação do agendamento
   ------------------------------------------------------------- */
function criarAgendamentoManual(evento) {
  evento.preventDefault();
  const barbeariaId = sessaoAdmin.barbeariaId;
  const avisoErro = document.getElementById("aviso-erro");
  avisoErro.style.display = "none";

  const telefone = document.getElementById("campo-telefone").value;
  const nome = document.getElementById("campo-nome").value;
  const nascimento = document.getElementById("campo-nascimento").value || null;
  const servicoId = document.getElementById("campo-servico").value;
  const barbeiroId = document.getElementById("campo-barbeiro").value;
  const dataTexto = document.getElementById("campo-data").value;
  const horaTexto = document.getElementById("campo-horario").value;

  if (!validarTelefone(telefone)) {
    mostrarErro(avisoErro, "Telefone inválido. Confira o DDD e o número.");
    return;
  }

  const clienteExistente = Dados.buscarClientePorTelefone(barbeariaId, telefone);
  if (!clienteExistente && !nome.trim()) {
    mostrarErro(avisoErro, "Informe o nome do cliente novo.");
    return;
  }

  const servico = Dados.obterServico(barbeariaId, servicoId);
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);
  const duracaoMin = (servico && servico.duracaoMin) || (configuracoes && configuracoes.duracaoPadraoMin) || 30;

  const [ano, mes, dia] = dataTexto.split("-").map(Number);
  const [hora, minuto] = horaTexto.split(":").map(Number);
  const dataHora = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

  // Tira o instantâneo ANTES de qualquer gravação, para o toast
  // poder oferecer "Desfazer" (ver padrão na seção 9 da base de
  // conhecimento). Desfazer remove o agendamento criado; o cadastro
  // do cliente novo, se houver, permanece — como ficaria num sistema
  // real ao apagar só o agendamento.
  const instantaneo = Dados.obterInstantaneo(barbeariaId);

  let cliente;
  try {
    cliente = Dados.criarOuObterCliente(barbeariaId, { nome, telefone, dataNascimento: nascimento });
    const agendamento = Dados.criarAgendamento(barbeariaId, {
      clienteId: cliente.id,
      barbeiroId,
      servicoId,
      dataHora: dataHora.toISOString(),
      duracaoMin,
      origem: "MANUAL",
    });

    // A confirmação de retorno aparece na tela de destino
    // (Próximos 3 dias), porque é para lá que o fluxo volta — ver
    // dashboard.js, verificarAvisoPendente().
    sessionStorage.setItem(
      "karbo_aviso_pendente",
      JSON.stringify({
        mensagem:
          "Agendamento de " + cliente.nome + " criado para " + formatarData(dataTexto) + " às " + horaTexto + ".",
        instantaneo,
      })
    );
    window.location.href = "proximos-dias.html";
  } catch (erro) {
    mostrarErro(avisoErro, erro.message);
  }
}

function mostrarErro(elemento, mensagem) {
  elemento.textContent = mensagem;
  elemento.style.display = "flex";
}
