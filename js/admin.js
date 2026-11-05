/*
  admin.js
  --------
  Código COMUM a toda tela do painel do administrador: exige sessão
  aberta (ou manda para o login), preenche a barra superior com o
  nome da barbearia logada, o botão "Sair", e o aviso (toast) usado
  para dar retorno de uma ação, com "Desfazer" opcional.

  A lógica de CADA tela fica em um arquivo próprio (js/cadastros.js,
  js/dashboard.js, ...), carregado depois deste na página. Esses
  arquivos usam a constante `sessaoAdmin` definida aqui embaixo —
  scripts carregados na mesma página compartilham esse escopo, então
  não é preciso passá-la adiante.

  Toda página do painel precisa ter, no HTML:
    - #texto-barbearia-logada e #botao-sair (barra superior)
    - #toast (container do aviso, pode ficar vazio e escondido)
*/

// Sessão atual. Se não houver ninguém logado, volta para o login
// antes de montar qualquer coisa na tela.
const sessaoAdmin = Auth.exigirSessaoAdmin();

if (sessaoAdmin) {
  inicializarBarraTopo();
}

/* ---------------------------------------------------------------
   Barra superior
   ------------------------------------------------------------- */
function inicializarBarraTopo() {
  const elementoNome = document.getElementById("texto-barbearia-logada");
  if (elementoNome) elementoNome.textContent = sessaoAdmin.barbeariaNome;

  const botaoSair = document.getElementById("botao-sair");
  if (botaoSair) {
    botaoSair.addEventListener("click", function () {
      Auth.sair();
      window.location.href = "login.html";
    });
  }
}

/* ---------------------------------------------------------------
   Aviso (toast) com "Desfazer" opcional
   Usado depois de confirmar, cancelar ou finalizar um agendamento,
   para dar retorno imediato da ação — e uma saída rápida para quem
   clicou errado.
   ------------------------------------------------------------- */
let temporizadorToast = null;

function mostrarToast(mensagem, aoDesfazer) {
  const toast = document.getElementById("toast");
  if (!toast) return; // página sem toast: segue sem quebrar

  clearTimeout(temporizadorToast);

  const textoSpan = toast.querySelector("[data-toast-texto]");
  const botaoDesfazer = toast.querySelector("[data-toast-desfazer]");

  if (textoSpan) textoSpan.textContent = mensagem;

  if (botaoDesfazer) {
    if (aoDesfazer) {
      botaoDesfazer.style.display = "";
      // Remove um listener anterior antes de adicionar outro, para
      // não acumular cliques de toasts passados no mesmo botão.
      const novoBotao = botaoDesfazer.cloneNode(true);
      botaoDesfazer.parentNode.replaceChild(novoBotao, botaoDesfazer);
      novoBotao.addEventListener("click", function () {
        aoDesfazer();
        esconderToast();
      });
    } else {
      botaoDesfazer.style.display = "none";
    }
  }

  toast.style.display = "flex";
  temporizadorToast = setTimeout(esconderToast, 6000);
}

function esconderToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.style.display = "none";
}

/* ---------------------------------------------------------------
   Utilidade comum: evita que nome de cliente/barbeiro/serviço com
   caracteres de HTML (<, >, &) quebre a tela ao ser exibido.
   ------------------------------------------------------------- */
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}
