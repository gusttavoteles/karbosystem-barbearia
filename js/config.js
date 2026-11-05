/*
  config.js
  ---------
  Constantes TÉCNICAS do sistema — coisas que não mudam de uma
  barbearia para outra, por isso não entram na tabela
  `configuracoes` (ver seção 4 da documentação e js/configuracoes.js,
  que trata as REGRAS DE NEGÓCIO de cada barbearia).

  Não colocar aqui nada que deva ser decidido por um administrador
  dentro do sistema — isso vai para a tabela `configuracoes`.
*/

const Config = {
  // Nome exibido no título das páginas e em telas de carregamento.
  NOME_SISTEMA: "Karbo Barber",

  // Formas de pagamento aceitas em todo o sistema (caixa, vendas,
  // comissões). Lista fechada, igual ao CHECK do banco na seção 7.
  FORMAS_PAGAMENTO: [
    { valor: "DINHEIRO", rotulo: "Dinheiro" },
    { valor: "PIX", rotulo: "PIX" },
    { valor: "DEBITO", rotulo: "Débito" },
    { valor: "CREDITO", rotulo: "Crédito" },
  ],

  // Tipos de comissão que um barbeiro pode ter (RF22 da documentação).
  TIPOS_COMISSAO: [
    { valor: "PERCENTUAL", rotulo: "Percentual do valor" },
    { valor: "FIXO", rotulo: "Valor fixo por atendimento" },
  ],
};
