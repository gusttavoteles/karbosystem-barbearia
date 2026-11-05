/*
  dados.js
  --------
  ÚNICO arquivo do sistema que fala diretamente com "o banco de
  dados" (ver docs/DOCUMENTACAO.md, seções 11.3 e 11.4). Nenhuma
  tela ou outro arquivo JS deve ler ou gravar dado por fora daqui.

  NESTA FASE (1 a 4 do roadmap), este arquivo é PROVISÓRIO: guarda
  tudo em memória e em localStorage, só para desenvolver e validar
  as telas sem depender de um banco de verdade. Quando o banco real
  entrar (fase 5, Supabase recomendado), TODAS as funções abaixo são
  reescritas para chamar a API do banco — e, como são as únicas
  portas de entrada e saída de dado do sistema, nenhuma tela precisa
  mudar uma linha sequer.

  REGRA DE ISOLAMENTO (seção 2 e 11.2 da documentação): o sistema é
  multiusuário — várias barbearias no mesmo sistema. Por isso, TODA
  função abaixo que lê ou grava dado operacional exige um
  `barbeariaId` como primeiro parâmetro, e filtra OU grava sempre
  dentro daquela barbearia. Nunca um dado de uma barbearia aparece
  numa consulta de outra.

  PARA QUEM FOR MEXER NESTE ARQUIVO: antes de adicionar ou mudar uma
  função, leia docs/BASE-DE-CONHECIMENTO.md — ele lista o que cada
  tela e cada botão do sistema espera encontrar aqui, para que um
  ajuste numa função não quebre uma tela que você não estava olhando.
*/

const Dados = (function () {
  const CHAVE_ARMAZENAMENTO = "karbo_barber_dados_v2";

  /* ---------------------------------------------------------------
     Dados de exemplo (seed)
     Duas barbearias fictícias e independentes, para já desenvolver
     e demonstrar o isolamento entre elas. Nenhum dado real deve
     entrar aqui — isto desaparece quando o banco definitivo entrar.

     Os agendamentos de exemplo são gerados em torno da data em que
     o sistema é aberto pela primeira vez neste navegador (hoje,
     amanhã e depois de amanhã), para que o dashboard sempre tenha
     algo relevante para mostrar, não importa quando for testado.
     Chamar Dados.reiniciar() gera um novo lote, ancorado em "hoje".
     ------------------------------------------------------------- */
  function dadosIniciais() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Monta um horário ISO (string) a partir de quantos dias de hoje
    // e do horário "HH:MM", para os agendamentos de exemplo.
    function horarioDaqui(diasAFrente, horaMinuto) {
      const [h, m] = horaMinuto.split(":").map(Number);
      const data = new Date(hoje);
      data.setDate(data.getDate() + diasAFrente);
      data.setHours(h, m, 0, 0);
      return data.toISOString();
    }

    let proximoIdAgendamento = 1;
    function agendamentoSeed(barbeariaId, clienteId, barbeiroId, servicoId, diasAFrente, hora, duracaoMin, status) {
      return {
        id: "agd-" + proximoIdAgendamento++,
        barbeariaId,
        clienteId,
        barbeiroId,
        servicoId,
        dataHora: horarioDaqui(diasAFrente, hora),
        duracaoMin,
        status, // AGENDADO | CONFIRMADO | REALIZADO | NAO_COMPARECEU | CANCELADO
        origem: "LINK",
        valorCobrado: null,
        formaPagamento: null,
        finalizadoPor: null,
        finalizadoEm: null,
        criadoEm: new Date().toISOString(),
      };
    }

    return {
      barbearias: [
        {
          id: "barb-carlos",
          nome: "Barbearia do Carlos",
          slug: "barbearia-do-carlos",
          telefone: "5562999990001",
          plano: "BARBEARIA",
          status: "ATIVA",
        },
        {
          id: "barb-navalha",
          nome: "Studio Navalha",
          slug: "studio-navalha",
          telefone: "5562999990002",
          plano: "SOLO",
          status: "ATIVA",
        },
      ],

      // Uma configuração por barbearia (seção 4 e 7.2 da documentação).
      configuracoes: [
        {
          barbeariaId: "barb-carlos",
          metaFidelidadeQtd: 10,
          fidelidadeRecompensa: "1 corte grátis",
          produtoPontuaFidelidade: false,
          duracaoPadraoMin: 30,
          antecedenciaMinimaHoras: 1,
          antecedenciaMaximaDias: 30,
          comissaoPeriodicidade: "QUINZENAL",
          caixaRegistraTaxaCartao: false,
        },
        {
          barbeariaId: "barb-navalha",
          metaFidelidadeQtd: 8,
          fidelidadeRecompensa: "Combo barba grátis",
          produtoPontuaFidelidade: true,
          duracaoPadraoMin: 40,
          antecedenciaMinimaHoras: 2,
          antecedenciaMaximaDias: 15,
          comissaoPeriodicidade: "MENSAL",
          caixaRegistraTaxaCartao: false,
        },
      ],

      barbeiros: [
        {
          id: "brb-1",
          barbeariaId: "barb-carlos",
          nome: "Carlos Mendes",
          ativo: true,
          comissaoTipo: "PERCENTUAL",
          comissaoValor: 40,
          comissaoProdutoPerc: 10,
        },
        {
          id: "brb-2",
          barbeariaId: "barb-carlos",
          nome: "Jonas Lima",
          ativo: true,
          comissaoTipo: "PERCENTUAL",
          comissaoValor: 35,
          comissaoProdutoPerc: 10,
        },
        {
          id: "brb-3",
          barbeariaId: "barb-navalha",
          nome: "Rafael Souza",
          ativo: true,
          comissaoTipo: "FIXO",
          comissaoValor: 25,
          comissaoProdutoPerc: 0,
        },
      ],

      horariosTrabalho: [
        { id: "hor-1", barbeiroId: "brb-1", diaSemana: 2, horaInicio: "09:00", horaFim: "19:00" },
        { id: "hor-2", barbeiroId: "brb-1", diaSemana: 3, horaInicio: "09:00", horaFim: "19:00" },
        { id: "hor-3", barbeiroId: "brb-1", diaSemana: 4, horaInicio: "09:00", horaFim: "19:00" },
        { id: "hor-4", barbeiroId: "brb-1", diaSemana: 5, horaInicio: "09:00", horaFim: "19:00" },
        { id: "hor-5", barbeiroId: "brb-1", diaSemana: 6, horaInicio: "09:00", horaFim: "17:00" },
        { id: "hor-6", barbeiroId: "brb-3", diaSemana: 3, horaInicio: "10:00", horaFim: "20:00" },
        { id: "hor-7", barbeiroId: "brb-3", diaSemana: 5, horaInicio: "10:00", horaFim: "20:00" },
      ],

      servicos: [
        { id: "srv-1", barbeariaId: "barb-carlos", nome: "Corte", duracaoMin: 30, preco: 45, ativo: true },
        { id: "srv-2", barbeariaId: "barb-carlos", nome: "Corte + Barba", duracaoMin: 50, preco: 70, ativo: true },
        { id: "srv-3", barbeariaId: "barb-navalha", nome: "Corte degradê", duracaoMin: 40, preco: 55, ativo: true },
      ],

      clientes: [
        { id: "cli-1", barbeariaId: "barb-carlos", nome: "João Pedro", telefone: "5562988880001", dataNascimento: "1995-03-12" },
        { id: "cli-2", barbeariaId: "barb-carlos", nome: "Lucas Andrade", telefone: "5562988880011", dataNascimento: null },
        { id: "cli-3", barbeariaId: "barb-carlos", nome: "Pedro Henrique", telefone: "5562988880012", dataNascimento: null },
        { id: "cli-4", barbeariaId: "barb-carlos", nome: "Thiago Rocha", telefone: "5562988880013", dataNascimento: null },
        { id: "cli-5", barbeariaId: "barb-carlos", nome: "Bruno Martins", telefone: "5562988880014", dataNascimento: null },
        { id: "cli-6", barbeariaId: "barb-carlos", nome: "Felipe Costa", telefone: "5562988880015", dataNascimento: null },
        { id: "cli-7", barbeariaId: "barb-carlos", nome: "Gabriel Souza", telefone: "5562988880016", dataNascimento: null },
        { id: "cli-8", barbeariaId: "barb-carlos", nome: "Rodrigo Lima", telefone: "5562988880017", dataNascimento: null },
        { id: "cli-9", barbeariaId: "barb-navalha", nome: "Marcos Vinícius", telefone: "5562988880002", dataNascimento: null },
      ],

      agendamentos: [
        // ---- Barbearia do Carlos: hoje (dia 0) ----
        agendamentoSeed("barb-carlos", "cli-2", "brb-1", "srv-1", 0, "08:00", 30, "REALIZADO"),
        agendamentoSeed("barb-carlos", "cli-3", "brb-2", "srv-2", 0, "08:30", 50, "NAO_COMPARECEU"),
        agendamentoSeed("barb-carlos", "cli-4", "brb-1", "srv-1", 0, "09:00", 30, "CONFIRMADO"),
        agendamentoSeed("barb-carlos", "cli-5", "brb-2", "srv-1", 0, "11:00", 30, "CONFIRMADO"),
        agendamentoSeed("barb-carlos", "cli-6", "brb-1", "srv-1", 0, "14:00", 30, "AGENDADO"),
        agendamentoSeed("barb-carlos", "cli-7", "brb-2", "srv-2", 0, "16:00", 50, "AGENDADO"),
        agendamentoSeed("barb-carlos", "cli-8", "brb-1", "srv-1", 0, "18:00", 30, "AGENDADO"),

        // ---- Barbearia do Carlos: amanhã (dia 1) ----
        agendamentoSeed("barb-carlos", "cli-1", "brb-1", "srv-1", 1, "09:30", 30, "AGENDADO"),
        agendamentoSeed("barb-carlos", "cli-2", "brb-2", "srv-2", 1, "11:00", 50, "CONFIRMADO"),
        agendamentoSeed("barb-carlos", "cli-3", "brb-1", "srv-1", 1, "15:00", 30, "AGENDADO"),

        // ---- Barbearia do Carlos: depois de amanhã (dia 2) ----
        agendamentoSeed("barb-carlos", "cli-4", "brb-2", "srv-1", 2, "10:00", 30, "AGENDADO"),
        agendamentoSeed("barb-carlos", "cli-5", "brb-1", "srv-2", 2, "13:30", 50, "AGENDADO"),

        // ---- Studio Navalha: hoje e amanhã ----
        agendamentoSeed("barb-navalha", "cli-9", "brb-3", "srv-3", 0, "10:30", 40, "CONFIRMADO"),
        agendamentoSeed("barb-navalha", "cli-9", "brb-3", "srv-3", 1, "15:30", 40, "AGENDADO"),
      ],

      // Pontos já existentes, para o cartão fidelidade já nascer com
      // gente perto da meta e provar o cálculo de saldo.
      fidelidadePontos: [
        { id: "fid-1", clienteId: "cli-2", agendamentoId: null, pontos: 9, criadoEm: new Date().toISOString() },
        { id: "fid-2", clienteId: "cli-4", agendamentoId: null, pontos: 8, criadoEm: new Date().toISOString() },
        { id: "fid-3", clienteId: "cli-8", agendamentoId: null, pontos: 7, criadoEm: new Date().toISOString() },
        { id: "fid-4", clienteId: "cli-6", agendamentoId: null, pontos: 4, criadoEm: new Date().toISOString() },
      ],

      fidelidadeResgates: [],
    };
  }

  /* ---------------------------------------------------------------
     Persistência (provisória): localStorage
     ------------------------------------------------------------- */

  /** Lê todo o banco provisório do localStorage, criando o seed na
   *  primeira vez que o sistema roda neste navegador. */
  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (bruto) return JSON.parse(bruto);
    } catch (erro) {
      console.warn("Não foi possível ler o armazenamento local; usando dados de exemplo.", erro);
    }
    const inicial = dadosIniciais();
    salvar(inicial);
    return inicial;
  }

  /** Grava todo o banco provisório no localStorage. */
  function salvar(banco) {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(banco));
    } catch (erro) {
      console.warn("Não foi possível salvar no armazenamento local.", erro);
    }
  }

  /** Apaga todo o banco provisório e recomeça do zero com o seed,
   *  ancorado em "hoje" de novo. Útil em desenvolvimento, e também
   *  oferecido como botão no painel enquanto não há banco real. */
  function reiniciar() {
    const inicial = dadosIniciais();
    salvar(inicial);
    return inicial;
  }

  /** Confere que um barbeariaId foi informado. Lançar erro aqui, em
   *  vez de simplesmente devolver uma lista vazia, é proposital:
   *  um esquecimento de barbeariaId é um bug de isolamento, e deve
   *  travar ruidosamente em vez de falhar em silêncio. */
  function exigirBarbeariaId(barbeariaId) {
    if (!barbeariaId) {
      throw new Error(
        "Dados.js: toda função de dados exige um barbeariaId. " +
          "Chamar sem ele quebraria o isolamento entre barbearias."
      );
    }
  }

  /* ---------------------------------------------------------------
     Barbearias (uso do super administrador, fase 6 do roadmap;
     expostas desde já para o seletor de sessão do protótipo)
     ------------------------------------------------------------- */

  function listarBarbearias() {
    return carregar().barbearias.slice();
  }

  function obterBarbearia(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    return carregar().barbearias.find((b) => b.id === barbeariaId) || null;
  }

  /** Busca uma barbearia pelo slug do link público (RF01:
   *  `/b/<slug-da-barbearia>`, servido neste sistema como
   *  `cliente/agendar.html?barbearia=<slug>`). Não exige
   *  barbeariaId — é exatamente o ponto de entrada de quem AINDA
   *  não sabe o id, só o slug que está na URL. */
  function obterBarbeariaPorSlug(slug) {
    return carregar().barbearias.find((b) => b.slug === slug) || null;
  }

  /* ---------------------------------------------------------------
     Configurações (seção 4 e 7.2 da documentação)
     ------------------------------------------------------------- */

  function obterConfiguracoes(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    return banco.configuracoes.find((c) => c.barbeariaId === barbeariaId) || null;
  }

  function salvarConfiguracoes(barbeariaId, dadosConfig) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const indice = banco.configuracoes.findIndex((c) => c.barbeariaId === barbeariaId);
    const atualizado = Object.assign({ barbeariaId }, dadosConfig);

    if (indice === -1) {
      banco.configuracoes.push(atualizado);
    } else {
      banco.configuracoes[indice] = atualizado;
    }
    salvar(banco);
    return atualizado;
  }

  /* ---------------------------------------------------------------
     Barbeiros
     ------------------------------------------------------------- */

  /** Lista só os barbeiros DAQUELA barbearia — nunca de outra. */
  function listarBarbeiros(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    return carregar().barbeiros.filter((b) => b.barbeariaId === barbeariaId);
  }

  function obterBarbeiro(barbeariaId, barbeiroId) {
    exigirBarbeariaId(barbeariaId);
    return (
      carregar().barbeiros.find(
        (b) => b.id === barbeiroId && b.barbeariaId === barbeariaId
      ) || null
    );
  }

  /** Cria um barbeiro, já com a comissão definida pelo administrador
   *  (RF22/RF23): tipo (percentual ou fixo), valor e comissão sobre
   *  produto. */
  function criarBarbeiro(barbeariaId, dadosBarbeiro) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();

    const novo = {
      id: gerarId(),
      barbeariaId,
      nome: dadosBarbeiro.nome,
      ativo: true,
      comissaoTipo: dadosBarbeiro.comissaoTipo || "PERCENTUAL",
      comissaoValor: Number(dadosBarbeiro.comissaoValor) || 0,
      comissaoProdutoPerc: Number(dadosBarbeiro.comissaoProdutoPerc) || 0,
    };

    banco.barbeiros.push(novo);
    salvar(banco);
    return novo;
  }

  /** Atualiza um barbeiro já existente, confirmando antes que ele
   *  pertence mesmo à barbearia informada (nunca edita o de outra). */
  function atualizarBarbeiro(barbeariaId, barbeiroId, dadosBarbeiro) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const barbeiro = banco.barbeiros.find(
      (b) => b.id === barbeiroId && b.barbeariaId === barbeariaId
    );
    if (!barbeiro) return null;

    Object.assign(barbeiro, {
      nome: dadosBarbeiro.nome ?? barbeiro.nome,
      ativo: dadosBarbeiro.ativo ?? barbeiro.ativo,
      comissaoTipo: dadosBarbeiro.comissaoTipo ?? barbeiro.comissaoTipo,
      comissaoValor:
        dadosBarbeiro.comissaoValor !== undefined
          ? Number(dadosBarbeiro.comissaoValor)
          : barbeiro.comissaoValor,
      comissaoProdutoPerc:
        dadosBarbeiro.comissaoProdutoPerc !== undefined
          ? Number(dadosBarbeiro.comissaoProdutoPerc)
          : barbeiro.comissaoProdutoPerc,
    });

    salvar(banco);
    return barbeiro;
  }

  function excluirBarbeiro(barbeariaId, barbeiroId) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const antes = banco.barbeiros.length;
    banco.barbeiros = banco.barbeiros.filter(
      (b) => !(b.id === barbeiroId && b.barbeariaId === barbeariaId)
    );
    // Os horários daquele barbeiro deixam de fazer sentido sozinhos.
    banco.horariosTrabalho = banco.horariosTrabalho.filter(
      (h) => h.barbeiroId !== barbeiroId
    );
    salvar(banco);
    return banco.barbeiros.length < antes;
  }

  /* ---------------------------------------------------------------
     Horários de trabalho de um barbeiro
     ------------------------------------------------------------- */

  /** Lista os horários de um barbeiro, confirmando que ele pertence
   *  à barbearia informada antes de devolver qualquer coisa. */
  function listarHorarios(barbeariaId, barbeiroId) {
    const barbeiro = obterBarbeiro(barbeariaId, barbeiroId);
    if (!barbeiro) return [];
    return carregar().horariosTrabalho.filter((h) => h.barbeiroId === barbeiroId);
  }

  /** Substitui todos os horários de um barbeiro pelos informados.
   *  `horarios` é uma lista de { diaSemana, horaInicio, horaFim }. */
  function definirHorarios(barbeariaId, barbeiroId, horarios) {
    const barbeiro = obterBarbeiro(barbeariaId, barbeiroId);
    if (!barbeiro) {
      throw new Error("Barbeiro não encontrado nesta barbearia.");
    }

    const banco = carregar();
    banco.horariosTrabalho = banco.horariosTrabalho.filter(
      (h) => h.barbeiroId !== barbeiroId
    );

    const novos = horarios.map((h) => ({
      id: gerarId(),
      barbeiroId,
      diaSemana: Number(h.diaSemana),
      horaInicio: h.horaInicio,
      horaFim: h.horaFim,
    }));

    banco.horariosTrabalho.push(...novos);
    salvar(banco);
    return novos;
  }

  /* ---------------------------------------------------------------
     Serviços
     ------------------------------------------------------------- */

  function listarServicos(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    return carregar().servicos.filter((s) => s.barbeariaId === barbeariaId);
  }

  function obterServico(barbeariaId, servicoId) {
    exigirBarbeariaId(barbeariaId);
    return (
      carregar().servicos.find(
        (s) => s.id === servicoId && s.barbeariaId === barbeariaId
      ) || null
    );
  }

  function criarServico(barbeariaId, dadosServico) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();

    const novo = {
      id: gerarId(),
      barbeariaId,
      nome: dadosServico.nome,
      duracaoMin: dadosServico.duracaoMin ? Number(dadosServico.duracaoMin) : null,
      preco: Number(dadosServico.preco) || 0,
      ativo: true,
    };

    banco.servicos.push(novo);
    salvar(banco);
    return novo;
  }

  function atualizarServico(barbeariaId, servicoId, dadosServico) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const servico = banco.servicos.find(
      (s) => s.id === servicoId && s.barbeariaId === barbeariaId
    );
    if (!servico) return null;

    Object.assign(servico, {
      nome: dadosServico.nome ?? servico.nome,
      duracaoMin:
        dadosServico.duracaoMin !== undefined
          ? Number(dadosServico.duracaoMin) || null
          : servico.duracaoMin,
      preco: dadosServico.preco !== undefined ? Number(dadosServico.preco) : servico.preco,
      ativo: dadosServico.ativo ?? servico.ativo,
    });

    salvar(banco);
    return servico;
  }

  function excluirServico(barbeariaId, servicoId) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const antes = banco.servicos.length;
    banco.servicos = banco.servicos.filter(
      (s) => !(s.id === servicoId && s.barbeariaId === barbeariaId)
    );
    salvar(banco);
    return banco.servicos.length < antes;
  }

  /* ---------------------------------------------------------------
     Clientes
     ------------------------------------------------------------- */

  function listarClientes(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    return carregar().clientes.filter((c) => c.barbeariaId === barbeariaId);
  }

  /** Busca um cliente pelo id DENTRO da barbearia informada — nunca
   *  devolve um cliente de outra barbearia, mesmo que o id exista
   *  lá (o que não deveria acontecer, mas a checagem é a garantia). */
  function obterCliente(barbeariaId, clienteId) {
    exigirBarbeariaId(barbeariaId);
    return (
      carregar().clientes.find(
        (c) => c.id === clienteId && c.barbeariaId === barbeariaId
      ) || null
    );
  }

  /** Busca um cliente pelo telefone DENTRO da barbearia informada.
   *  O telefone é único por barbearia, não globalmente (regra 2 da
   *  seção 6 da documentação): duas barbearias podem ter clientes
   *  com o mesmo número, como pessoas diferentes. */
  function buscarClientePorTelefone(barbeariaId, telefone) {
    exigirBarbeariaId(barbeariaId);
    const normalizado = normalizarTelefone(telefone);
    return (
      carregar().clientes.find(
        (c) => c.barbeariaId === barbeariaId && c.telefone === normalizado
      ) || null
    );
  }

  /** Cria o cliente se o telefone ainda não existir naquela
   *  barbearia, ou devolve o já existente — assim o mesmo telefone
   *  nunca gera dois cadastros na mesma barbearia. */
  function criarOuObterCliente(barbeariaId, dadosCliente) {
    exigirBarbeariaId(barbeariaId);
    const telefoneNormalizado = normalizarTelefone(dadosCliente.telefone);

    const existente = buscarClientePorTelefone(barbeariaId, telefoneNormalizado);
    if (existente) return existente;

    const banco = carregar();
    const novo = {
      id: gerarId(),
      barbeariaId,
      nome: dadosCliente.nome,
      telefone: telefoneNormalizado,
      dataNascimento: dadosCliente.dataNascimento || null,
    };

    banco.clientes.push(novo);
    salvar(banco);
    return novo;
  }

  /* ---------------------------------------------------------------
     Agendamentos
     ------------------------------------------------------------- */

  /** Lista os agendamentos de uma barbearia, com filtros opcionais:
   *  { barbeiroId, desde, ate } — `desde`/`ate` são objetos Date,
   *  comparados contra o campo dataHora. Sempre devolve ordenado
   *  por data e hora, do mais cedo para o mais tarde. */
  function listarAgendamentos(barbeariaId, filtros) {
    exigirBarbeariaId(barbeariaId);
    filtros = filtros || {};

    let lista = carregar().agendamentos.filter((a) => a.barbeariaId === barbeariaId);

    if (filtros.barbeiroId) {
      lista = lista.filter((a) => a.barbeiroId === filtros.barbeiroId);
    }
    if (filtros.desde) {
      lista = lista.filter((a) => new Date(a.dataHora) >= filtros.desde);
    }
    if (filtros.ate) {
      lista = lista.filter((a) => new Date(a.dataHora) < filtros.ate);
    }

    return lista.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  }

  function obterAgendamento(barbeariaId, agendamentoId) {
    exigirBarbeariaId(barbeariaId);
    return (
      carregar().agendamentos.find(
        (a) => a.id === agendamentoId && a.barbeariaId === barbeariaId
      ) || null
    );
  }

  /** Agendamentos "ativos" são os que ainda ocupam um horário:
   *  AGENDADO ou CONFIRMADO. Usado tanto para checar conflito de
   *  horário quanto para achar o que está "aguardando finalização". */
  function ehStatusAtivo(status) {
    return status === "AGENDADO" || status === "CONFIRMADO";
  }

  /** Cria um agendamento (manual, pelo admin ou pelo barbeiro —
   *  RF08/RF14 — ou público, pelo cliente — RF01/RF05). Verifica
   *  antes que o barbeiro não tenha outro agendamento ativo no
   *  mesmo horário (regra 3 da seção 6 da documentação). */
  function criarAgendamento(barbeariaId, dadosAgendamento) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();

    const conflito = banco.agendamentos.some(
      (a) =>
        a.barbeariaId === barbeariaId &&
        a.barbeiroId === dadosAgendamento.barbeiroId &&
        a.dataHora === dadosAgendamento.dataHora &&
        ehStatusAtivo(a.status)
    );
    if (conflito) {
      throw new Error("Este barbeiro já tem um agendamento ativo neste horário.");
    }

    const novo = {
      id: gerarId(),
      barbeariaId,
      clienteId: dadosAgendamento.clienteId,
      barbeiroId: dadosAgendamento.barbeiroId,
      servicoId: dadosAgendamento.servicoId || null,
      dataHora: dadosAgendamento.dataHora,
      duracaoMin: Number(dadosAgendamento.duracaoMin) || 30,
      status: "AGENDADO",
      origem: dadosAgendamento.origem || "MANUAL",
      valorCobrado: null,
      formaPagamento: null,
      finalizadoPor: null,
      finalizadoEm: null,
      criadoEm: new Date().toISOString(),
    };

    banco.agendamentos.push(novo);
    salvar(banco);
    return novo;
  }

  /** Troca o status de um agendamento, confirmando que ele pertence
   *  à barbearia informada. Uso interno — as funções abaixo
   *  (confirmar, cancelar, finalizar) são a API pública, porque cada
   *  transição tem suas próprias regras. */
  function mudarStatus(barbeariaId, agendamentoId, novoStatus, extras) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    const agendamento = banco.agendamentos.find(
      (a) => a.id === agendamentoId && a.barbeariaId === barbeariaId
    );
    if (!agendamento) return null;

    agendamento.status = novoStatus;
    Object.assign(agendamento, extras || {});

    salvar(banco);
    return agendamento;
  }

  /** RF12: marca o agendamento como confirmado pelo cliente, depois
   *  que ele respondeu no WhatsApp. */
  function confirmarAgendamento(barbeariaId, agendamentoId) {
    return mudarStatus(barbeariaId, agendamentoId, "CONFIRMADO");
  }

  /** RF09: cancela (ou exclui, na prática) um agendamento, liberando
   *  o horário imediatamente (regra 5 da seção 6 da documentação). */
  function cancelarAgendamento(barbeariaId, agendamentoId) {
    return mudarStatus(barbeariaId, agendamentoId, "CANCELADO");
  }

  /** RF18-RF21: a operação central do sistema. O barbeiro confirma
   *  se o corte foi realizado ou não.
   *
   *  - "REALIZADO": gera o ponto de fidelidade (RF20), e devolve
   *    também o saldo atualizado do cliente, para a tela decidir se
   *    mostra "completou o cartão".
   *  - "NAO_COMPARECEU": nada é lançado, só o registro do evento
   *    (RF21).
   *
   *  Caixa, comissão e baixa de estoque (os outros três efeitos
   *  previstos na seção 5.4 da documentação) entram nas fases 8, 9
   *  e 11 do roadmap — ainda não existem neste protótipo. Quem
   *  dispara esta função de verdade é js/finalizacao.js, que no
   *  futuro vai orquestrar os quatro efeitos juntos; esta função
   *  cuida só do agendamento e da fidelidade. */
  function finalizarAtendimento(barbeariaId, agendamentoId, dadosFinalizacao) {
    exigirBarbeariaId(barbeariaId);
    const agendamento = obterAgendamento(barbeariaId, agendamentoId);
    if (!agendamento) {
      throw new Error("Agendamento não encontrado nesta barbearia.");
    }

    const status = dadosFinalizacao.status; // "REALIZADO" ou "NAO_COMPARECEU"
    mudarStatus(barbeariaId, agendamentoId, status, {
      valorCobrado: dadosFinalizacao.valorCobrado || null,
      formaPagamento: dadosFinalizacao.formaPagamento || null,
      finalizadoPor: dadosFinalizacao.finalizadoPor || null,
      finalizadoEm: new Date().toISOString(),
    });

    let pontoGerado = null;
    if (status === "REALIZADO") {
      pontoGerado = gerarPontoFidelidade(agendamento.clienteId, agendamentoId);
    }

    return { agendamento, pontoGerado };
  }

  /* ---------------------------------------------------------------
     Fidelidade
     ------------------------------------------------------------- */

  /** Gera 1 ponto de fidelidade para o cliente, ligado a este
   *  agendamento. Regra 7 da seção 6: cada atendimento gera no
   *  máximo um lançamento — aqui simulamos a restrição única do
   *  banco (UNIQUE em agendamento_id) checando antes de inserir. */
  function gerarPontoFidelidade(clienteId, agendamentoId) {
    const banco = carregar();

    const jaPontuado = banco.fidelidadePontos.some(
      (p) => p.agendamentoId === agendamentoId
    );
    if (jaPontuado) {
      return banco.fidelidadePontos.find((p) => p.agendamentoId === agendamentoId);
    }

    const novoPonto = {
      id: gerarId(),
      clienteId,
      agendamentoId,
      pontos: 1,
      criadoEm: new Date().toISOString(),
    };

    banco.fidelidadePontos.push(novoPonto);
    salvar(banco);
    return novoPonto;
  }

  /** Saldo de um cliente = soma dos pontos ganhos − soma dos pontos
   *  já resgatados (seção 7.6 da documentação). */
  function saldoFidelidade(clienteId) {
    const banco = carregar();

    const ganhos = banco.fidelidadePontos
      .filter((p) => p.clienteId === clienteId)
      .reduce((total, p) => total + p.pontos, 0);

    const usados = banco.fidelidadeResgates
      .filter((r) => r.clienteId === clienteId)
      .reduce((total, r) => total + r.pontosUsados, 0);

    return ganhos - usados;
  }

  /** Lista, para uma barbearia, o saldo de fidelidade de todos os
   *  clientes que já têm pelo menos 1 ponto — usada para montar o
   *  painel "Cartão fidelidade" do dashboard, ordenado dos mais
   *  próximos da meta para os mais distantes. */
  function listarSaldosFidelidade(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    const clientesDaBarbearia = listarClientes(barbeariaId);

    return clientesDaBarbearia
      .map((cliente) => ({ cliente, saldo: saldoFidelidade(cliente.id) }))
      .filter((item) => item.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }

  /** Resgata a recompensa de um cliente, descontando a quantidade
   *  de pontos da meta do saldo dele (RF18 — ao atingir a meta, o
   *  cliente recebe a recompensa e o ciclo reinicia). */
  function resgatarFidelidade(clienteId, pontosUsados) {
    const banco = carregar();

    const novoResgate = {
      id: gerarId(),
      clienteId,
      pontosUsados,
      resgatadoEm: new Date().toISOString(),
    };

    banco.fidelidadeResgates.push(novoResgate);
    salvar(banco);
    return novoResgate;
  }

  /* ---------------------------------------------------------------
     Instantâneo (snapshot) — usado só para o "Desfazer" das telas.
     Guarda e restaura agendamentos e fidelidade de UMA barbearia,
     sem tocar nos dados das outras.
     ------------------------------------------------------------- */

  function obterInstantaneo(barbeariaId) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();
    return {
      agendamentos: banco.agendamentos
        .filter((a) => a.barbeariaId === barbeariaId)
        .map((a) => Object.assign({}, a)),
      fidelidadePontos: banco.fidelidadePontos.map((p) => Object.assign({}, p)),
      fidelidadeResgates: banco.fidelidadeResgates.map((r) => Object.assign({}, r)),
    };
  }

  function restaurarInstantaneo(barbeariaId, instantaneo) {
    exigirBarbeariaId(barbeariaId);
    const banco = carregar();

    banco.agendamentos = banco.agendamentos
      .filter((a) => a.barbeariaId !== barbeariaId)
      .concat(instantaneo.agendamentos);
    banco.fidelidadePontos = instantaneo.fidelidadePontos;
    banco.fidelidadeResgates = instantaneo.fidelidadeResgates;

    salvar(banco);
  }

  /* ---------------------------------------------------------------
     API pública do módulo
     ------------------------------------------------------------- */
  return {
    reiniciar,

    listarBarbearias,
    obterBarbearia,
    obterBarbeariaPorSlug,

    obterConfiguracoes,
    salvarConfiguracoes,

    listarBarbeiros,
    obterBarbeiro,
    criarBarbeiro,
    atualizarBarbeiro,
    excluirBarbeiro,

    listarHorarios,
    definirHorarios,

    listarServicos,
    obterServico,
    criarServico,
    atualizarServico,
    excluirServico,

    listarClientes,
    obterCliente,
    buscarClientePorTelefone,
    criarOuObterCliente,

    listarAgendamentos,
    obterAgendamento,
    ehStatusAtivo,
    criarAgendamento,
    confirmarAgendamento,
    cancelarAgendamento,
    finalizarAtendimento,

    saldoFidelidade,
    listarSaldosFidelidade,
    resgatarFidelidade,

    obterInstantaneo,
    restaurarInstantaneo,
  };
})();
