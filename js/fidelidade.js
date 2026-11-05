/*
  fidelidade.js
  -------------
  Regras do cartão fidelidade que ficam ACIMA da camada de dados: o
  que significa "completar o cartão", como calcular o progresso em
  percentual, e a orquestração de um resgate. js/dados.js guarda e
  soma os pontos; este arquivo decide o que esses números SIGNIFICAM
  para quem olha a tela.

  A meta de pontos (quantos cortes completam o cartão) é definida
  por cada barbearia na tela de Configurações (seção 4 da
  documentação) — nunca um número fixo aqui.
*/

const Fidelidade = (function () {
  /** Monta um resumo do progresso de um cliente até a meta,
   *  pronto para a tela desenhar a barrinha e o rótulo. */
  function progresso(saldo, meta) {
    const completou = saldo >= meta;
    const percentual = meta > 0 ? Math.min(100, Math.round((saldo / meta) * 100)) : 0;

    return {
      saldo,
      meta,
      completou,
      percentual,
      rotulo: completou ? "Meta atingida" : saldo + "/" + meta,
    };
  }

  /** Lista, para o painel "Cartão fidelidade" do dashboard, os
   *  clientes com saldo de uma barbearia, já com o progresso
   *  calculado contra a meta configurada por ela, limitado às `n`
   *  primeiras posições (os mais perto da recompensa primeiro). */
  function maioresSaldos(barbeariaId, n) {
    const configuracoes = Dados.obterConfiguracoes(barbeariaId);
    const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;

    return Dados.listarSaldosFidelidade(barbeariaId)
      .slice(0, n || 4)
      .map((item) => ({
        cliente: item.cliente,
        progresso: progresso(item.saldo, meta),
      }));
  }

  /** Resgata a recompensa de um cliente que já atingiu a meta,
   *  descontando exatamente a quantidade de pontos da meta (o
   *  excedente, se houver, continua valendo para o próximo ciclo). */
  function resgatar(barbeariaId, clienteId) {
    const configuracoes = Dados.obterConfiguracoes(barbeariaId);
    const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;
    const saldoAtual = Dados.saldoFidelidade(clienteId);

    if (saldoAtual < meta) {
      throw new Error("Este cliente ainda não atingiu a meta do cartão fidelidade.");
    }

    return Dados.resgatarFidelidade(clienteId, meta);
  }

  return {
    progresso,
    maioresSaldos,
    resgatar,
  };
})();
