/*
  utils.js
  --------
  Funções pequenas e genéricas de formatação e validação, usadas em
  várias telas do sistema (datas, telefone, moeda, geração de ids).
  Não acessa dado nenhum — só transforma valores que já estão em mãos.
*/

/**
 * Gera um identificador simples, único o bastante para o protótipo
 * (fase 1 a 4, antes do banco de dados real). Quando o Supabase ou
 * outro banco entrar (fase 5), o próprio banco passa a gerar os ids,
 * e esta função deixa de ser usada.
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Remove tudo que não for dígito de um telefone e garante o DDI 55
 * na frente, para que o mesmo número sempre vire a mesma chave,
 * não importa como a pessoa o digitou (com espaço, traço, parênteses).
 */
function normalizarTelefone(telefone) {
  let digitos = String(telefone || "").replace(/\D/g, "");

  // Remove um "55" duplicado se a pessoa já digitou o DDI e o campo
  // acabar concatenando de novo (proteção simples, não essencial).
  if (digitos.length === 13 && digitos.startsWith("5555")) {
    digitos = digitos.slice(2);
  }

  // Se não começar com 55 e tiver o tamanho de um celular com DDD
  // (11 dígitos: DDD + 9 + número), adiciona o DDI do Brasil.
  if (!digitos.startsWith("55") && digitos.length === 11) {
    digitos = "55" + digitos;
  }

  return digitos;
}

/**
 * Valida se o telefone normalizado tem um tamanho plausível
 * (55 + DDD + número = 12 ou 13 dígitos). Não garante que o número
 * exista de verdade — só filtra entradas claramente erradas no
 * formulário antes de gravar.
 */
function validarTelefone(telefone) {
  const digitos = normalizarTelefone(telefone);
  return digitos.length === 12 || digitos.length === 13;
}

/**
 * Formata um telefone normalizado (só dígitos, com DDI 55) para
 * exibição na tela, no padrão "+55 (62) 99999-9999".
 */
function formatarTelefone(telefoneNormalizado) {
  const d = String(telefoneNormalizado || "");
  if (d.length < 12) return telefoneNormalizado || "";

  const ddi = d.slice(0, 2);
  const ddd = d.slice(2, 4);
  const resto = d.slice(4);
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);

  return `+${ddi} (${ddd}) ${meio}-${fim}`;
}

/**
 * Formata um número para moeda brasileira (R$ 1.234,50), usado em
 * preços de serviço e produto, valores de caixa, comissão etc.
 */
function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma data (string ISO "AAAA-MM-DD" ou objeto Date) para o
 * padrão brasileiro "DD/MM/AAAA".
 */
function formatarData(data) {
  const d = data instanceof Date ? data : new Date(data + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

/**
 * Formata um horário (string "HH:MM" ou "HH:MM:SS") cortando os
 * segundos, para exibir "08:00" em vez de "08:00:00".
 */
function formatarHora(hora) {
  return String(hora || "").slice(0, 5);
}

/**
 * Nomes dos dias da semana, na ordem usada pelo banco (0 = domingo,
 * conforme o CHECK da tabela horarios_trabalho na documentação).
 */
const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
