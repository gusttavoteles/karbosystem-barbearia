/*
  agenda.js
  ---------
  Cálculo de horários livres e conflitos — usado tanto pelo
  administrador (admin/novo-agendamento.html, encaixe manual) quanto
  pelo cliente (cliente/agendar.html, link público). Ficar num só
  lugar evita que as duas telas calculem "horário livre" de um jeito
  cada uma, o que um dia divergiria sem ninguém notar (ver seção 9 da
  base de conhecimento).

  Não lê nem grava nada em localStorage diretamente — só chama
  js/dados.js (listarHorarios, listarAgendamentos, ehStatusAtivo) e
  faz a conta por cima. A regra de conflito usada aqui é a MESMA da
  seção 6 da documentação (regra 3): só compara o horário EXATO de
  início, não a sobreposição de intervalos — consistente com o que
  Dados.criarAgendamento já verifica.
*/

const Agenda = (function () {
  /** "AAAA-MM-DD" de um objeto Date, no fuso local — não usar
   *  toISOString() aqui, que converte para UTC e pode voltar um dia
   *  diferente perto da meia-noite. */
  function formatarDataIsoCurta(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
  }

  /** Calcula os horários livres de UM barbeiro, num dia específico,
   *  para um atendimento de `duracaoMin` minutos: dentro da jornada
   *  de trabalho dele naquele dia da semana (js/dados.js,
   *  listarHorarios), em intervalos do tamanho do próprio
   *  atendimento, sem bater no horário exato de outro agendamento
   *  ativo dele, e respeitando a antecedência mínima configurada.
   *  Devolve uma lista de textos "HH:MM", em ordem. */
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

  /** Horários livres de QUALQUER barbeiro da barbearia, num dia —
   *  a união dos horários livres de cada um, sem repetir. Usada pela
   *  tela pública do cliente (RF01: o cliente escolhe o horário
   *  ANTES de escolher o barbeiro, então aqui ainda não há um
   *  barbeiro definido). */
  function horariosLivresTodosBarbeiros(barbeariaId, dataTexto, duracaoMin, configuracoes) {
    const barbeiros = Dados.listarBarbeiros(barbeariaId);
    const conjunto = new Set();

    barbeiros.forEach((barbeiro) => {
      horariosLivres(barbeariaId, barbeiro.id, dataTexto, duracaoMin, configuracoes).forEach((hora) =>
        conjunto.add(hora)
      );
    });

    return Array.from(conjunto).sort();
  }

  /** Os barbeiros que estão livres EXATAMENTE naquele horário
   *  (dentro da própria jornada e sem conflito) — usada no passo 3
   *  do agendamento público, depois que o cliente já escolheu data e
   *  horário e falta só dizer com quem. */
  function barbeirosLivresNoHorario(barbeariaId, dataTexto, horaTexto, duracaoMin, configuracoes) {
    const barbeiros = Dados.listarBarbeiros(barbeariaId);
    return barbeiros.filter((barbeiro) =>
      horariosLivres(barbeariaId, barbeiro.id, dataTexto, duracaoMin, configuracoes).includes(horaTexto)
    );
  }

  /** Se existe ALGUM horário livre, de ALGUM barbeiro, naquele dia —
   *  usada para desabilitar dias sem nenhuma vaga no seletor de data
   *  da tela pública (RF01: "dias sem horário livre desabilitados"). */
  function diaTemHorarioLivre(barbeariaId, dataTexto, duracaoMin, configuracoes) {
    return horariosLivresTodosBarbeiros(barbeariaId, dataTexto, duracaoMin, configuracoes).length > 0;
  }

  return {
    formatarDataIsoCurta,
    horariosLivres,
    horariosLivresTodosBarbeiros,
    barbeirosLivresNoHorario,
    diaTemHorarioLivre,
  };
})();
