/*
  finalizacao.js
  --------------
  Orquestra os efeitos da finalização de um atendimento (seção 5.4
  e RF18-RF21 da documentação): o momento em que o barbeiro confirma
  se o corte foi realizado ou não.

  Em sua forma final (a partir da fase 8 do roadmap), este arquivo
  vai disparar QUATRO efeitos juntos, numa única transação: cartão
  fidelidade, entrada no caixa, comissão do barbeiro e baixa de
  estoque dos produtos vendidos. Caixa (fase 8), comissão (fase 9) e
  estoque (fase 11) ainda não existem neste protótipo — por isso,
  por enquanto, este arquivo dispara só o efeito que já existe
  (fidelidade), mas já no formato final, para que ligar os outros
  três mais tarde não exija mudar quem CHAMA esta função, só o que
  ela faz por dentro.
*/

const Finalizacao = (function () {
  /** Marca um atendimento como realizado. Gera o ponto de
   *  fidelidade e devolve um resumo pronto para a tela mostrar uma
   *  mensagem de confirmação (e, se for o caso, avisar que o
   *  cliente completou o cartão). */
  function marcarRealizado(barbeariaId, agendamentoId, dadosFinalizacao) {
    const resultado = Dados.finalizarAtendimento(barbeariaId, agendamentoId, {
      status: "REALIZADO",
      valorCobrado: dadosFinalizacao && dadosFinalizacao.valorCobrado,
      formaPagamento: dadosFinalizacao && dadosFinalizacao.formaPagamento,
      finalizadoPor: dadosFinalizacao && dadosFinalizacao.finalizadoPor,
    });

    // TODO (fase 8): lançar a entrada correspondente no caixa.
    // TODO (fase 9): gerar a comissão do barbeiro, com a taxa
    //                congelada no momento desta finalização.
    // TODO (fase 11): dar baixa nos produtos vendidos junto, quando
    //                 o produto controla estoque.

    const configuracoes = Dados.obterConfiguracoes(barbeariaId);
    const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;
    const saldo = Dados.saldoFidelidade(resultado.agendamento.clienteId);

    return {
      agendamento: resultado.agendamento,
      completouCartao: saldo >= meta && saldo - 1 < meta, // virou meta JUSTO agora
      saldoAtual: saldo,
      meta,
    };
  }

  /** Marca que o cliente não compareceu. Nenhum efeito financeiro
   *  ou de fidelidade é disparado (regra 6 da seção 6 da
   *  documentação) — só o registro do evento no agendamento. */
  function marcarNaoCompareceu(barbeariaId, agendamentoId, dadosFinalizacao) {
    const resultado = Dados.finalizarAtendimento(barbeariaId, agendamentoId, {
      status: "NAO_COMPARECEU",
      finalizadoPor: dadosFinalizacao && dadosFinalizacao.finalizadoPor,
    });

    return { agendamento: resultado.agendamento };
  }

  return {
    marcarRealizado,
    marcarNaoCompareceu,
  };
})();
