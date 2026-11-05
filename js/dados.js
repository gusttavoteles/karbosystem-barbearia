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
  numa consulta de outra. Essa é a regra mais importante deste
  arquivo, e o motivo de existirem duas barbearias fictícias nos
  dados de exemplo abaixo: para provar, desde já, que o isolamento
  funciona, antes mesmo de existir um banco de verdade.
*/

const Dados = (function () {
  const CHAVE_ARMAZENAMENTO = "karbo_barber_dados_v1";

  /* ---------------------------------------------------------------
     Dados de exemplo (seed)
     Duas barbearias fictícias e independentes, para já desenvolver
     e demonstrar o isolamento entre elas. Nenhum dado real deve
     entrar aqui — isto desaparece quando o banco definitivo entrar.
     ------------------------------------------------------------- */
  function dadosIniciais() {
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
        {
          id: "cli-1",
          barbeariaId: "barb-carlos",
          nome: "João Pedro",
          telefone: "5562988880001",
          dataNascimento: "1995-03-12",
        },
        {
          id: "cli-2",
          barbeariaId: "barb-navalha",
          nome: "Marcos Vinícius",
          telefone: "5562988880002",
          dataNascimento: null,
        },
      ],
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

  /** Apaga todo o banco provisório e recomeça do zero com o seed.
   *  Útil só em desenvolvimento, para resetar o protótipo. */
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
     API pública do módulo
     ------------------------------------------------------------- */
  return {
    reiniciar,

    listarBarbearias,
    obterBarbearia,

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
    criarServico,
    atualizarServico,
    excluirServico,

    listarClientes,
    buscarClientePorTelefone,
    criarOuObterCliente,
  };
})();
