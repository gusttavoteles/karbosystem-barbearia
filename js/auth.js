/*
  auth.js
  -------
  Login e sessão do painel administrativo.

  NESTA FASE (1 a 4 do roadmap), não existe banco de usuários nem
  senha de verdade — isso é a fase 5 (login e permissões reais,
  validados no servidor). Por enquanto, "entrar" significa apenas
  escolher QUAL barbearia fictícia está logada, para que as telas de
  cadastro já possam ser construídas e testadas respeitando o
  isolamento entre barbearias (seção 2 da documentação).

  Quando o login real entrar, só este arquivo muda: as telas que
  chamam `Auth.sessaoAtual()` continuam funcionando do mesmo jeito.
*/

const Auth = (function () {
  const CHAVE_SESSAO = "karbo_barber_sessao_v1";

  /** Abre a sessão do painel como administrador de uma barbearia.
   *  `barbeariaId` precisa existir em Dados.listarBarbearias(). */
  function entrarComoAdmin(barbeariaId) {
    const barbearia = Dados.obterBarbearia(barbeariaId);
    if (!barbearia) {
      throw new Error("Barbearia não encontrada para abrir a sessão.");
    }

    const sessao = {
      perfil: "ADMIN",
      barbeariaId: barbearia.id,
      barbeariaNome: barbearia.nome,
    };

    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    return sessao;
  }

  /** Devolve a sessão atual, ou null se ninguém "entrou" ainda. */
  function sessaoAtual() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO);
      return bruto ? JSON.parse(bruto) : null;
    } catch (erro) {
      console.warn("Não foi possível ler a sessão atual.", erro);
      return null;
    }
  }

  /** Encerra a sessão (equivalente a "sair" do painel). */
  function sair() {
    sessionStorage.removeItem(CHAVE_SESSAO);
  }

  /** Protege uma página do painel: se não houver sessão de admin,
   *  manda a pessoa de volta para o login. Toda página em admin/,
   *  exceto login.html, deve chamar isto logo no início. */
  function exigirSessaoAdmin() {
    const sessao = sessaoAtual();
    if (!sessao || sessao.perfil !== "ADMIN") {
      window.location.href = "login.html";
      return null;
    }
    return sessao;
  }

  return {
    entrarComoAdmin,
    sessaoAtual,
    sair,
    exigirSessaoAdmin,
  };
})();
