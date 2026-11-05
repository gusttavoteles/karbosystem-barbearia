/*
  whatsapp.js
  -----------
  Monta os links `wa.me` usados em todo o sistema (ver seção 9 da
  documentação). Não envia nada sozinho — apenas devolve a URL
  pronta, que a tela abre numa nova aba (o envio em si é sempre um
  toque da pessoa, limitação conhecida do `wa.me`, ver seção 9).

  O TEXTO de cada mensagem pode ser personalizado por barbearia, na
  tabela `configuracoes` (campos mensagemConfirmacao, mensagemLembrete,
  mensagemAniversario). Quando a barbearia ainda não personalizou o
  texto, usamos o modelo padrão definido aqui.
*/

const Whatsapp = (function () {
  /** Troca os marcadores {{algo}} de um modelo de mensagem pelos
   *  valores informados. Ex.: substituirMarcadores("Olá, {{nome}}!",
   *  { nome: "João" }) devolve "Olá, João!". */
  function substituirMarcadores(modelo, valores) {
    return modelo.replace(/\{\{(\w+)\}\}/g, function (correspondencia, chave) {
      return Object.prototype.hasOwnProperty.call(valores, chave)
        ? String(valores[chave])
        : correspondencia;
    });
  }

  /** Monta a URL do wa.me para um número e um texto já prontos. O
   *  número precisa estar normalizado (só dígitos, com DDI 55) —
   *  ver js/utils.js, normalizarTelefone(). */
  function montarLink(telefoneNormalizado, texto) {
    return "https://wa.me/" + telefoneNormalizado + "?text=" + encodeURIComponent(texto);
  }

  /** RF11: mensagem do administrador confirmando um horário com o
   *  cliente, usada no botão "Confirmar" da lista de próximos dias.
   *  Usa o texto configurado pela barbearia (mensagemLembrete), ou
   *  o padrão abaixo se ela ainda não personalizou. */
  function linkConfirmacaoParaCliente(configuracoes, dadosAgendamento) {
    const modeloPadrao =
      "Olá, {{primeiroNome}}! Passando para confirmar seu horário {{diaRelativo}} " +
      "({{dataFormatada}}) às {{hora}} com o {{barbeiro}}. Pode confirmar?";

    const modelo = (configuracoes && configuracoes.mensagemLembrete) || modeloPadrao;

    const texto = substituirMarcadores(modelo, {
      primeiroNome: dadosAgendamento.nomeCliente.split(" ")[0],
      diaRelativo: dadosAgendamento.diaRelativo,
      dataFormatada: dadosAgendamento.dataFormatada,
      hora: dadosAgendamento.hora,
      barbeiro: dadosAgendamento.nomeBarbeiro,
    });

    return montarLink(dadosAgendamento.telefoneCliente, texto);
  }

  /** RF04: mensagem que o CLIENTE envia para o WhatsApp da
   *  BARBEARIA ao terminar o agendamento pelo link público —
   *  diferente de linkConfirmacaoParaCliente, que é o admin
   *  escrevendo PARA o cliente. Usa o texto configurado
   *  (mensagemConfirmacao) ou o padrão sugerido na seção 9 da
   *  documentação. */
  function linkAgendamentoParaBarbearia(configuracoes, telefoneBarbearia, dadosAgendamento) {
    const modeloPadrao =
      "Olá! Gostaria de confirmar meu agendamento: dia {{dataFormatada}} às {{hora}} " +
      "com o barbeiro {{barbeiro}}.";

    const modelo = (configuracoes && configuracoes.mensagemConfirmacao) || modeloPadrao;

    const texto = substituirMarcadores(modelo, {
      dataFormatada: dadosAgendamento.dataFormatada,
      hora: dadosAgendamento.hora,
      barbeiro: dadosAgendamento.nomeBarbeiro,
      nomeCliente: dadosAgendamento.nomeCliente,
    });

    return montarLink(telefoneBarbearia, texto);
  }

  /** Link para abrir a conversa já existente com o cliente, sem um
   *  texto novo — usado quando o agendamento já está confirmado e
   *  só se quer continuar a conversa (botão "Conversa"). */
  function linkConversaComCliente(telefoneCliente) {
    return "https://wa.me/" + telefoneCliente;
  }

  /** RF44: mensagem de aniversário, usada na tela de clientes
   *  (fase 12 do roadmap). Já implementada aqui porque a montagem do
   *  link é idêntica à de confirmação — só muda o texto. */
  function linkAniversario(configuracoes, nomeCliente, telefoneCliente) {
    const modeloPadrao =
      "Olá, {{primeiroNome}}! A equipe da barbearia deseja um feliz aniversário. " +
      "Passa aqui para comemorar com um corte!";

    const modelo = (configuracoes && configuracoes.mensagemAniversario) || modeloPadrao;

    const texto = substituirMarcadores(modelo, {
      primeiroNome: nomeCliente.split(" ")[0],
    });

    return montarLink(telefoneCliente, texto);
  }

  return {
    montarLink,
    linkConfirmacaoParaCliente,
    linkAgendamentoParaBarbearia,
    linkConversaComCliente,
    linkAniversario,
  };
})();
