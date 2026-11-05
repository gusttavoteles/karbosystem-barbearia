/*
  cadastros.js
  ------------
  Lógica da tela admin/cadastros.html: troca de abas, e os
  formulários e listas de barbeiros (com comissão e horários),
  serviços e clientes.

  Depende de js/admin.js já ter rodado antes (ele expõe a constante
  `sessaoAdmin` e a função `escaparHtml`, usadas aqui). Toda leitura
  e gravação passa por Dados (js/dados.js), sempre informando o
  barbeariaId da sessão atual — nunca um id fixo.
*/

if (sessaoAdmin) {
  inicializarAbas();
  inicializarAbaBarbeiros();
  inicializarAbaServicos();
  inicializarAbaClientes();
}

/* ---------------------------------------------------------------
   Abas (Barbeiros / Serviços / Clientes)
   ------------------------------------------------------------- */
function inicializarAbas() {
  const botoes = document.querySelectorAll(".abas__item");
  const paineis = document.querySelectorAll(".aba__painel");

  botoes.forEach((botao) => {
    botao.addEventListener("click", function () {
      const alvo = botao.dataset.aba;

      botoes.forEach((b) => b.classList.toggle("ativo", b === botao));
      paineis.forEach((p) => p.classList.toggle("ativo", p.dataset.painel === alvo));
    });
  });
}

/* ---------------------------------------------------------------
   Aba: Barbeiros (cadastro + comissão + horários de trabalho)
   ------------------------------------------------------------- */
function inicializarAbaBarbeiros() {
  const formulario = document.getElementById("formulario-barbeiro");
  const campoTipoComissao = document.getElementById("barbeiro-comissao-tipo");
  const rotuloComissaoValor = document.getElementById("rotulo-comissao-valor");

  // O rótulo do campo de valor muda conforme o tipo escolhido, para
  // deixar claro se é "%" ou "R$" o que está sendo digitado.
  campoTipoComissao.addEventListener("change", function () {
    rotuloComissaoValor.textContent =
      campoTipoComissao.value === "FIXO" ? "Valor fixo (R$)" : "Percentual (%)";
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    Dados.criarBarbeiro(sessaoAdmin.barbeariaId, {
      nome: document.getElementById("barbeiro-nome").value.trim(),
      comissaoTipo: campoTipoComissao.value,
      comissaoValor: document.getElementById("barbeiro-comissao-valor").value,
      comissaoProdutoPerc: document.getElementById("barbeiro-comissao-produto").value,
    });

    formulario.reset();
    rotuloComissaoValor.textContent = "Percentual (%)";
    renderizarBarbeiros();
  });

  renderizarBarbeiros();
}

/** Desenha a lista de barbeiros da barbearia logada, cada um com um
 *  botão para abrir/fechar a grade de horários daquele profissional. */
function renderizarBarbeiros() {
  const lista = document.getElementById("lista-barbeiros");
  const barbeiros = Dados.listarBarbeiros(sessaoAdmin.barbeariaId);

  if (barbeiros.length === 0) {
    lista.innerHTML = '<p class="lista-vazia">Nenhum barbeiro cadastrado ainda.</p>';
    return;
  }

  lista.innerHTML = barbeiros
    .map((barbeiro) => {
      const resumoComissao =
        barbeiro.comissaoTipo === "FIXO"
          ? `${formatarMoeda(barbeiro.comissaoValor)} por atendimento`
          : `${barbeiro.comissaoValor}% do serviço`;

      const comissaoProduto =
        barbeiro.comissaoProdutoPerc > 0
          ? ` · ${barbeiro.comissaoProdutoPerc}% sobre produtos`
          : "";

      return `
        <div class="item-cadastro" style="flex-direction: column; align-items: stretch;">
          <div class="flex--entre">
            <div class="item-cadastro__info">
              <h4>${escaparHtml(barbeiro.nome)}</h4>
              <span class="item-cadastro__detalhe">${resumoComissao}${comissaoProduto}</span>
            </div>
            <div class="lista-acoes">
              <button class="botao botao--secundario botao--pequeno" data-acao="horarios" data-id="${barbeiro.id}">
                Horários
              </button>
              <button class="botao botao--perigo botao--pequeno" data-acao="excluir-barbeiro" data-id="${barbeiro.id}">
                Excluir
              </button>
            </div>
          </div>
          <div class="espaco-acima" data-painel-horarios="${barbeiro.id}" style="display: none;"></div>
        </div>
      `;
    })
    .join("");

  // Liga os botões recém-criados aos seus comportamentos.
  lista.querySelectorAll('[data-acao="horarios"]').forEach((botao) => {
    botao.addEventListener("click", () => alternarPainelHorarios(botao.dataset.id));
  });

  lista.querySelectorAll('[data-acao="excluir-barbeiro"]').forEach((botao) => {
    botao.addEventListener("click", () => {
      if (confirm("Excluir este barbeiro? Os horários dele também serão removidos.")) {
        Dados.excluirBarbeiro(sessaoAdmin.barbeariaId, botao.dataset.id);
        renderizarBarbeiros();
      }
    });
  });
}

/** Abre (ou fecha, se já estiver aberto) a grade de horários de um
 *  barbeiro específico, com um campo de início e fim por dia da
 *  semana. Cada dia começa desmarcado se o barbeiro ainda não
 *  trabalha nele. */
function alternarPainelHorarios(barbeiroId) {
  const painel = document.querySelector(`[data-painel-horarios="${barbeiroId}"]`);
  const estaAberto = painel.style.display !== "none";

  if (estaAberto) {
    painel.style.display = "none";
    painel.innerHTML = "";
    return;
  }

  const horariosAtuais = Dados.listarHorarios(sessaoAdmin.barbeariaId, barbeiroId);

  const linhasPorDia = DIAS_SEMANA.map((nomeDia, diaSemana) => {
    const horarioDoDia = horariosAtuais.find((h) => h.diaSemana === diaSemana);
    const marcado = horarioDoDia ? "checked" : "";
    const inicio = horarioDoDia ? horarioDoDia.horaInicio : "09:00";
    const fim = horarioDoDia ? horarioDoDia.horaFim : "19:00";

    return `
      <div class="grade-horarios" style="margin-bottom: var(--espaco-2);">
        <label class="flex">
          <input type="checkbox" data-dia="${diaSemana}" data-campo="ativo" ${marcado} />
          <span class="grade-horarios__dia">${nomeDia}</span>
        </label>
        <input type="time" data-dia="${diaSemana}" data-campo="inicio" value="${inicio}" />
        <input type="time" data-dia="${diaSemana}" data-campo="fim" value="${fim}" />
      </div>
    `;
  }).join("");

  painel.innerHTML = `
    <div class="card">
      <h4 class="card__titulo">Horários de trabalho</h4>
      ${linhasPorDia}
      <button class="botao botao--primario botao--pequeno espaco-acima" data-acao="salvar-horarios" data-id="${barbeiroId}">
        Salvar horários
      </button>
    </div>
  `;
  painel.style.display = "block";

  painel.querySelector('[data-acao="salvar-horarios"]').addEventListener("click", () => {
    salvarHorarios(barbeiroId, painel);
  });
}

/** Lê os checkboxes e horários marcados na grade e grava só os dias
 *  que estiverem ativos, substituindo os horários anteriores
 *  daquele barbeiro. */
function salvarHorarios(barbeiroId, painel) {
  const horarios = [];

  painel.querySelectorAll('[data-campo="ativo"]').forEach((checkbox) => {
    if (!checkbox.checked) return;

    const dia = checkbox.dataset.dia;
    const inicio = painel.querySelector(`[data-dia="${dia}"][data-campo="inicio"]`).value;
    const fim = painel.querySelector(`[data-dia="${dia}"][data-campo="fim"]`).value;

    horarios.push({ diaSemana: dia, horaInicio: inicio, horaFim: fim });
  });

  Dados.definirHorarios(sessaoAdmin.barbeariaId, barbeiroId, horarios);
  alert("Horários salvos.");
}

/* ---------------------------------------------------------------
   Aba: Serviços
   ------------------------------------------------------------- */
function inicializarAbaServicos() {
  const formulario = document.getElementById("formulario-servico");

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    Dados.criarServico(sessaoAdmin.barbeariaId, {
      nome: document.getElementById("servico-nome").value.trim(),
      duracaoMin: document.getElementById("servico-duracao").value,
      preco: document.getElementById("servico-preco").value,
    });

    formulario.reset();
    renderizarServicos();
  });

  renderizarServicos();
}

function renderizarServicos() {
  const lista = document.getElementById("lista-servicos");
  const servicos = Dados.listarServicos(sessaoAdmin.barbeariaId);

  if (servicos.length === 0) {
    lista.innerHTML = '<p class="lista-vazia">Nenhum serviço cadastrado ainda.</p>';
    return;
  }

  lista.innerHTML = servicos
    .map((servico) => {
      const duracao = servico.duracaoMin ? `${servico.duracaoMin} min` : "duração padrão da barbearia";

      return `
        <div class="item-cadastro">
          <div class="item-cadastro__info">
            <h4>${escaparHtml(servico.nome)}</h4>
            <span class="item-cadastro__detalhe">${formatarMoeda(servico.preco)} · ${duracao}</span>
          </div>
          <button class="botao botao--perigo botao--pequeno" data-acao="excluir-servico" data-id="${servico.id}">
            Excluir
          </button>
        </div>
      `;
    })
    .join("");

  lista.querySelectorAll('[data-acao="excluir-servico"]').forEach((botao) => {
    botao.addEventListener("click", () => {
      Dados.excluirServico(sessaoAdmin.barbeariaId, botao.dataset.id);
      renderizarServicos();
    });
  });
}

/* ---------------------------------------------------------------
   Aba: Clientes
   ------------------------------------------------------------- */
function inicializarAbaClientes() {
  const formulario = document.getElementById("formulario-cliente");

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const telefone = document.getElementById("cliente-telefone").value;

    if (!validarTelefone(telefone)) {
      alert("Telefone inválido. Informe o DDD e o número, ex.: (62) 99999-9999.");
      return;
    }

    Dados.criarOuObterCliente(sessaoAdmin.barbeariaId, {
      nome: document.getElementById("cliente-nome").value.trim(),
      telefone: telefone,
      dataNascimento: document.getElementById("cliente-nascimento").value || null,
    });

    formulario.reset();
    renderizarClientes();
  });

  renderizarClientes();
}

function renderizarClientes() {
  const lista = document.getElementById("lista-clientes");
  const clientes = Dados.listarClientes(sessaoAdmin.barbeariaId);

  if (clientes.length === 0) {
    lista.innerHTML = '<p class="lista-vazia">Nenhum cliente cadastrado ainda.</p>';
    return;
  }

  lista.innerHTML = clientes
    .map((cliente) => {
      const nascimento = cliente.dataNascimento
        ? `· nasceu em ${formatarData(cliente.dataNascimento)}`
        : "";

      return `
        <div class="item-cadastro">
          <div class="item-cadastro__info">
            <h4>${escaparHtml(cliente.nome)}</h4>
            <span class="item-cadastro__detalhe">${formatarTelefone(cliente.telefone)} ${nascimento}</span>
          </div>
        </div>
      `;
    })
    .join("");
}
