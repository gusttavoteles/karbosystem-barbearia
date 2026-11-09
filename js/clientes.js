/*
  clientes.js
  -----------
  Lógica da tela admin/clientes.html — "Clientes e fidelidade"
  (RF43-RF45 da documentação): lista de clientes com busca,
  aniversariantes do mês com botão de WhatsApp, e o detalhe de um
  cliente (progresso/resgate de fidelidade + histórico de
  atendimentos).

  Depende de js/admin.js já ter rodado antes (expõe `sessaoAdmin`,
  `mostrarToast` e `escaparHtml`). Toda leitura e gravação passa
  pelas camadas Dados / Whatsapp / Fidelidade — este arquivo só
  decide o que a TELA mostra e faz com o que elas dão.
*/

// Estado só desta tela: busca e qual cliente está aberto no
// detalhe. Nada que precise sobreviver a um recarregamento de página.
const estadoClientes = {
  busca: "",
  clienteSelecionadoId: null,
};

const NOMES_MES_CLIENTES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* ---------------------------------------------------------------
   Aniversariantes do mês (RF44).
   ------------------------------------------------------------- */
function renderizarAniversariantes(barbeariaId, clientes, configuracoes) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();

  // Lê o dia do mês direto da string "AAAA-MM-DD" (sem passar por
  // Date) para não correr risco de fuso horário mudar o dia — mesma
  // precaução de js/agenda.js.
  const aniversariantes = clientes
    .filter((c) => c.dataNascimento)
    .map((c) => {
      const [, mesTexto, diaTexto] = c.dataNascimento.split("-");
      return { cliente: c, mes: Number(mesTexto) - 1, dia: Number(diaTexto) };
    })
    .filter((item) => item.mes === mesAtual)
    .sort((a, b) => a.dia - b.dia);

  const secao = document.getElementById("secao-aniversariantes");

  if (aniversariantes.length === 0) {
    secao.style.display = "none";
    return;
  }
  secao.style.display = "";

  document.getElementById("lista-aniversariantes").innerHTML = aniversariantes
    .map(({ cliente, dia }) => {
      const link = Whatsapp.linkAniversario(configuracoes, cliente.nome, cliente.telefone);
      return `
        <div class="item-cadastro">
          <div class="item-cadastro__info">
            <h4>${escaparHtml(cliente.nome)}</h4>
            <span class="item-cadastro__detalhe">Aniversário em ${String(dia).padStart(2, "0")} de ${NOMES_MES_CLIENTES[mesAtual]}</span>
          </div>
          <a class="botao botao--whatsapp botao--pequeno" href="${link}" target="_blank" rel="noopener">Parabenizar</a>
        </div>
      `;
    })
    .join("");
}

/* ---------------------------------------------------------------
   Lista de todos os clientes, com busca por nome/telefone.
   ------------------------------------------------------------- */
function renderizarListaClientes(barbeariaId, clientes, configuracoes) {
  const termoBusca = estadoClientes.busca.trim().toLowerCase();
  const termoBuscaDigitos = termoBusca.replace(/\D/g, "");

  const filtrados = clientes
    .filter((c) => {
      if (!termoBusca) return true;
      const nomeBate = c.nome.toLowerCase().includes(termoBusca);
      const telefoneBate = termoBuscaDigitos.length > 0 && c.telefone.includes(termoBuscaDigitos);
      return nomeBate || telefoneBate;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const container = document.getElementById("lista-clientes");
  const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;

  if (filtrados.length === 0) {
    container.innerHTML = `<p class="lista-vazia">${clientes.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado com essa busca."}</p>`;
    return;
  }

  container.innerHTML = filtrados
    .map((cliente) => {
      const saldo = Dados.saldoFidelidade(cliente.id);
      const progresso = Fidelidade.progresso(saldo, meta);
      const ativo = estadoClientes.clienteSelecionadoId === cliente.id;

      return `
        <button type="button" class="item-cadastro item-cadastro--clicavel ${ativo ? "ativo" : ""}" data-cliente="${cliente.id}" style="width: 100%; text-align: left; cursor: pointer;">
          <div class="item-cadastro__info">
            <h4>${escaparHtml(cliente.nome)}</h4>
            <span class="item-cadastro__detalhe">${formatarTelefone(cliente.telefone)}</span>
          </div>
          <span class="selo ${progresso.completou ? "selo--sucesso" : "selo--neutro"} numero-tabular">${progresso.rotulo}</span>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("[data-cliente]").forEach((botao) => {
    botao.addEventListener("click", () => {
      estadoClientes.clienteSelecionadoId =
        estadoClientes.clienteSelecionadoId === botao.dataset.cliente ? null : botao.dataset.cliente;
      renderizarTudoClientes();
    });
  });
}

/* ---------------------------------------------------------------
   Detalhe do cliente selecionado: fidelidade + histórico (RF45).
   ------------------------------------------------------------- */
function renderizarDetalheCliente(barbeariaId, configuracoes) {
  const secao = document.getElementById("secao-detalhe-cliente");

  if (!estadoClientes.clienteSelecionadoId) {
    secao.style.display = "none";
    return;
  }

  const cliente = Dados.obterCliente(barbeariaId, estadoClientes.clienteSelecionadoId);
  if (!cliente) {
    // Cliente pode não existir mais (ex.: trocou de barbearia); evita tela quebrada.
    estadoClientes.clienteSelecionadoId = null;
    secao.style.display = "none";
    return;
  }
  secao.style.display = "";

  document.getElementById("titulo-detalhe-cliente").textContent = cliente.nome;
  document.getElementById("texto-contato-detalhe-cliente").textContent =
    formatarTelefone(cliente.telefone) + (cliente.dataNascimento ? " · nasceu em " + formatarData(cliente.dataNascimento) : "");

  const meta = configuracoes ? configuracoes.metaFidelidadeQtd : 10;
  const saldo = Dados.saldoFidelidade(cliente.id);
  const progresso = Fidelidade.progresso(saldo, meta);

  document.getElementById("texto-progresso-fidelidade-cliente").textContent = progresso.rotulo;
  document.getElementById("barra-fidelidade-cliente").querySelector("div").style.width = progresso.percentual + "%";
  document.getElementById("barra-fidelidade-cliente").querySelector("div").style.backgroundColor =
    progresso.completou ? "var(--cor-sucesso)" : "var(--cor-primaria)";

  const botaoResgatar = document.getElementById("botao-resgatar-fidelidade-cliente");
  botaoResgatar.style.display = progresso.completou ? "" : "none";
  botaoResgatar.onclick = () => acaoResgatarFidelidadeCliente(cliente.id);

  const barbeiros = Dados.listarBarbeiros(barbeariaId);
  const mapaBarbeiros = {};
  barbeiros.forEach((b) => { mapaBarbeiros[b.id] = b; });

  const historico = Dados.listarAgendamentos(barbeariaId)
    .filter((a) => a.clienteId === cliente.id)
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora)); // mais recente primeiro

  const container = document.getElementById("lista-historico-cliente");

  if (historico.length === 0) {
    container.innerHTML = '<p class="lista-vazia">Este cliente ainda não tem nenhum agendamento.</p>';
    return;
  }

  const rotuloStatus = {
    AGENDADO: { texto: "Agendado", classe: "selo--neutro" },
    CONFIRMADO: { texto: "Confirmado", classe: "selo--sucesso" },
    REALIZADO: { texto: "Realizado", classe: "selo--sucesso" },
    NAO_COMPARECEU: { texto: "Não compareceu", classe: "selo--erro" },
    CANCELADO: { texto: "Cancelado", classe: "selo--neutro" },
  };

  container.innerHTML = historico
    .map((agendamento) => {
      const barbeiro = mapaBarbeiros[agendamento.barbeiroId];
      const data = new Date(agendamento.dataHora);
      const dataFormatada = String(data.getDate()).padStart(2, "0") + "/" + String(data.getMonth() + 1).padStart(2, "0") + "/" + data.getFullYear();
      const hora = String(data.getHours()).padStart(2, "0") + ":" + String(data.getMinutes()).padStart(2, "0");
      const status = rotuloStatus[agendamento.status] || { texto: agendamento.status, classe: "selo--neutro" };

      return `
        <div class="item-cadastro">
          <div class="item-cadastro__info">
            <h4 class="numero-tabular" style="font-weight: 600; font-size: 14px;">${dataFormatada} · ${hora}</h4>
            <span class="item-cadastro__detalhe">${barbeiro ? escaparHtml(barbeiro.nome) : "—"} · ${agendamento.duracaoMin} min</span>
          </div>
          <span class="selo ${status.classe}">${status.texto}</span>
        </div>
      `;
    })
    .join("");
}

function acaoResgatarFidelidadeCliente(clienteId) {
  const cliente = Dados.obterCliente(sessaoAdmin.barbeariaId, clienteId);
  Fidelidade.resgatar(sessaoAdmin.barbeariaId, clienteId);

  renderizarTudoClientes();
  // Resgate não tem Desfazer — mesma decisão já tomada no dashboard
  // (ver BASE-DE-CONHECIMENTO.md, pendências conhecidas).
  mostrarToast((cliente ? cliente.nome : "Cliente") + ": recompensa resgatada. Novo ciclo iniciado.", null);
}

/* ---------------------------------------------------------------
   Função central: recalcula tudo e redesenha a tela inteira.
   ------------------------------------------------------------- */
function renderizarTudoClientes() {
  const barbeariaId = sessaoAdmin.barbeariaId;
  const clientes = Dados.listarClientes(barbeariaId);
  const configuracoes = Dados.obterConfiguracoes(barbeariaId);

  renderizarAniversariantes(barbeariaId, clientes, configuracoes);
  renderizarListaClientes(barbeariaId, clientes, configuracoes);
  renderizarDetalheCliente(barbeariaId, configuracoes);
}

/* ---------------------------------------------------------------
   Cabeçalho: nome da barbearia logada, botão Sair e busca — mesmo
   padrão repetido em todas as telas do painel.
   ------------------------------------------------------------- */
function inicializarTelaClientes() {
  const barbearia = Dados.obterBarbearia(sessaoAdmin.barbeariaId);
  document.getElementById("texto-barbearia-logada").textContent = barbearia.nome;

  document.getElementById("campo-busca-cliente").addEventListener("input", function (evento) {
    estadoClientes.busca = evento.target.value;
    renderizarListaClientes(sessaoAdmin.barbeariaId, Dados.listarClientes(sessaoAdmin.barbeariaId), Dados.obterConfiguracoes(sessaoAdmin.barbeariaId));
  });

  document.getElementById("botao-fechar-detalhe-cliente").addEventListener("click", () => {
    estadoClientes.clienteSelecionadoId = null;
    renderizarTudoClientes();
  });
}

/* ---------------------------------------------------------------
   Início: só agora, com todas as funções e constantes acima já
   declaradas, é seguro rodar a primeira renderização da tela.
   (Ver BASE-DE-CONHECIMENTO.md §9 — rodar isto antes das
   declarações já causou um ReferenceError real em outra tela.)
   ------------------------------------------------------------- */
if (sessaoAdmin) {
  inicializarTelaClientes();
  renderizarTudoClientes();
}
