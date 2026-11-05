# Karbo System — Sistema de Agendamento para Barbearia

**Versão do documento:** 0.2 (stack definida: HTML, CSS e JavaScript)
**Data:** 05/11/2026
**Repositório:** https://github.com/gusttavoteles/karbosystem-barbearia

---

## 1. Visão geral

O Karbo System é um sistema web de agendamento para barbearias. O cliente agenda por um link público, sem precisar criar conta, e confirma o agendamento enviando uma mensagem pelo WhatsApp. O administrador acompanha a agenda, inclui e exclui agendamentos manualmente e confirma os próximos atendimentos com o cliente. Ao final de cada atendimento, o barbeiro confirma que o corte foi realizado, e isso alimenta automaticamente o cartão fidelidade do cliente.

### Objetivos

- Eliminar a marcação de horário feita manualmente por conversa.
- Reduzir faltas, com confirmação via WhatsApp.
- Dar ao administrador visão clara da agenda mensal e dos próximos dias.
- Fidelizar clientes com um cartão fidelidade automático e confiável (só pontua corte confirmado pelo barbeiro).

---

## 2. Perfis de usuário

| Perfil | Descrição | Acesso |
|---|---|---|
| **Cliente** | Pessoa que agenda o corte. | Link público, sem login. |
| **Administrador** | Dono/gerente da barbearia. | Painel com login. |
| **Barbeiro** | Profissional que realiza o corte. | Confirma atendimentos realizados (login ou painel simplificado). |

> **A definir:** se o barbeiro terá login próprio ou se o administrador confirma em nome dele. Recomendação: login próprio, para a confirmação do corte ter responsável identificado.

---

## 3. Requisitos funcionais

### 3.1 Agendamento pelo cliente (link público)

- **RF01** — O cliente acessa um link e escolhe, nesta ordem: **data → horário → barbeiro**.
- **RF02** — O sistema mostra apenas horários disponíveis para o barbeiro escolhido (sem conflito com outros agendamentos ou bloqueios).
- **RF03** — O cliente informa **nome** e **telefone (WhatsApp)**.
- **RF04** — Ao finalizar, o sistema abre o WhatsApp com uma mensagem pré-preenchida (data, horário, barbeiro, serviço) para o número da barbearia.
- **RF05** — O agendamento é registrado no momento do envio da mensagem e passa a ocupar o horário.
- **RF06** — O cliente é identificado pelo telefone, para acumular pontos no cartão fidelidade.

### 3.2 Painel do administrador

- **RF07** — **Agenda mensal:** visualização de todos os atendimentos do mês, com filtro por barbeiro.
- **RF08** — **Incluir agendamento manualmente** (cliente que ligou ou chegou no balcão).
- **RF09** — **Excluir/cancelar agendamento**.
- **RF10** — **Visão dos próximos 3 dias** (a partir da data atual): lista de agendamentos agrupados por dia.
- **RF11** — Cada agendamento dessa visão tem um botão **"Confirmar"**, que abre o WhatsApp direto na conversa com o cliente (`https://wa.me/55DDDNUMERO?text=...`) com mensagem de confirmação pré-preenchida.
- **RF12** — Marcar o agendamento como "confirmado pelo cliente" (manual, após resposta no WhatsApp).

### 3.3 Finalização do atendimento e fidelidade

- **RF13** — Após o horário do atendimento, o agendamento fica como **"Aguardando finalização"**.
- **RF14** — O **barbeiro confirma se o corte foi realizado** (Realizado / Não compareceu).
- **RF15** — Ao confirmar "Realizado", o sistema **lança automaticamente 1 ponto** no cartão fidelidade do cliente.
- **RF16** — Se "Não compareceu", nenhum ponto é lançado e o evento fica registrado.
- **RF17** — O administrador consulta o saldo de pontos/selos de qualquer cliente.
- **RF18** — Ao atingir a meta do cartão, o cliente recebe a recompensa e o ciclo reinicia.

---

## 4. Regras de negócio

1. Um barbeiro não pode ter dois agendamentos no mesmo horário.
2. Um horário só aparece para o cliente se estiver livre e dentro do expediente do barbeiro.
3. Só é possível pontuar no fidelidade com atendimento **confirmado pelo barbeiro**. Um agendamento sozinho não gera ponto.
4. Cada atendimento gera **no máximo um** ponto (evitar lançamento duplicado).
5. A exclusão de um agendamento libera o horário imediatamente.
6. O telefone é a chave de identificação do cliente (normalizado: somente dígitos, com DDI 55).

### Pontos a decidir (valores sugeridos)

| Tema | Sugestão |
|---|---|
| Meta do cartão fidelidade | 10 cortes = 1 corte grátis |
| Duração padrão do atendimento | 30 min (configurável por serviço) |
| Antecedência mínima para agendar | 1 hora |
| Antecedência máxima | 30 dias |
| Cancelamento pelo cliente | Pelo WhatsApp, o administrador exclui no painel |
| Pontos expiram? | Não, na v1 |

---

## 5. Fluxos principais

### 5.1 Cliente agenda

```
Cliente abre o link
  → escolhe a data
  → escolhe o horário (apenas livres)
  → escolhe o barbeiro
  → informa nome e telefone
  → clica em "Agendar"
  → sistema grava o agendamento (status: AGENDADO)
  → abre o WhatsApp com a mensagem pronta
  → cliente envia a mensagem
```

### 5.2 Administrador confirma os próximos dias

```
Admin abre o painel
  → vê os agendamentos dos próximos 3 dias
  → clica em "Confirmar" em um agendamento
  → abre o WhatsApp do cliente com a mensagem pronta
  → admin marca o agendamento como CONFIRMADO
```

### 5.3 Finalização e fidelidade

```
Horário do atendimento passa
  → agendamento fica "Aguardando finalização"
  → barbeiro marca "Realizado" ou "Não compareceu"
  → se Realizado: sistema cria 1 ponto no cartão fidelidade
  → ao atingir a meta: recompensa disponível
```

### 5.4 Estados do agendamento

```
AGENDADO → CONFIRMADO → REALIZADO
    │           │
    └───────────┴──→ CANCELADO
                └──→ NAO_COMPARECEU
```

---

## 6. Modelo de dados

O modelo abaixo é **relacional e independente de tecnologia**. O banco de dados ainda será escolhido; o SQL serve como referência das tabelas, campos e regras, e pode ser adaptado ao banco definido.

```sql
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,
  perfil        VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMIN', 'BARBEIRO')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE barbeiros (
  id            SERIAL PRIMARY KEY,
  usuario_id    INT REFERENCES usuarios(id),
  nome          VARCHAR(100) NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE horarios_trabalho (
  id            SERIAL PRIMARY KEY,
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio   TIME NOT NULL,
  hora_fim      TIME NOT NULL
);

CREATE TABLE servicos (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  duracao_min   INT NOT NULL DEFAULT 30,
  preco         NUMERIC(10,2),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE clientes (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  telefone      VARCHAR(15) UNIQUE NOT NULL,   -- somente dígitos, ex.: 5562999999999
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE agendamentos (
  id            SERIAL PRIMARY KEY,
  cliente_id    INT NOT NULL REFERENCES clientes(id),
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),
  servico_id    INT REFERENCES servicos(id),
  data_hora     TIMESTAMP NOT NULL,
  duracao_min   INT NOT NULL DEFAULT 30,
  status        VARCHAR(20) NOT NULL DEFAULT 'AGENDADO'
                CHECK (status IN ('AGENDADO','CONFIRMADO','REALIZADO','NAO_COMPARECEU','CANCELADO')),
  origem        VARCHAR(10) NOT NULL DEFAULT 'LINK' CHECK (origem IN ('LINK','MANUAL')),
  finalizado_por INT REFERENCES barbeiros(id),
  finalizado_em TIMESTAMP,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Impede dois agendamentos ativos do mesmo barbeiro no mesmo horário
CREATE UNIQUE INDEX uq_barbeiro_horario
  ON agendamentos (barbeiro_id, data_hora)
  WHERE status IN ('AGENDADO','CONFIRMADO');

CREATE TABLE fidelidade_pontos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT NOT NULL REFERENCES clientes(id),
  agendamento_id  INT UNIQUE NOT NULL REFERENCES agendamentos(id), -- 1 ponto por atendimento
  pontos          INT NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fidelidade_resgates (
  id            SERIAL PRIMARY KEY,
  cliente_id    INT NOT NULL REFERENCES clientes(id),
  pontos_usados INT NOT NULL,
  resgatado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Saldo do cliente** = soma de `fidelidade_pontos.pontos` − soma de `fidelidade_resgates.pontos_usados`.

O `UNIQUE` em `fidelidade_pontos.agendamento_id` garante no banco que um atendimento nunca pontua duas vezes.

---

## 7. Telas

### Cliente (público)
1. **Escolha de data** (calendário, dias sem horário livre desabilitados).
2. **Escolha de horário** (lista de horários livres).
3. **Escolha de barbeiro**.
4. **Dados** (nome e telefone) e resumo.
5. **Redirecionamento para o WhatsApp** com mensagem pronta.

### Administrador
1. **Login**.
2. **Próximos 3 dias** (tela inicial): agendamentos por dia, com botão "Confirmar" (WhatsApp).
3. **Agenda mensal**: calendário do mês com filtro por barbeiro.
4. **Novo agendamento manual**.
5. **Clientes e fidelidade**: busca por nome/telefone e saldo de pontos.
6. **Cadastros**: barbeiros, horários de trabalho e serviços.

### Barbeiro
1. **Meus atendimentos do dia** com os botões "Realizado" e "Não compareceu".

---

## 8. Integração com WhatsApp

Na v1, a integração usa **links `wa.me`**, sem API paga e sem aprovação da Meta:

- **Cliente → barbearia:** `https://wa.me/<NUMERO_BARBEARIA>?text=<mensagem codificada>`
- **Admin → cliente:** `https://wa.me/<TELEFONE_CLIENTE>?text=<mensagem codificada>`

Exemplo de mensagem do cliente:
> Olá! Gostaria de confirmar meu agendamento: dia 05/11 às 14:00 com o barbeiro Carlos.

Exemplo de mensagem de confirmação (admin → cliente):
> Olá, João! Passando para confirmar seu horário amanhã (05/11) às 14:00 com o Carlos. Pode confirmar?

**Limitação:** com `wa.me` o envio é sempre manual (a pessoa precisa tocar em "enviar"), e o sistema não sabe se a mensagem foi realmente enviada nem se o cliente respondeu. Uma evolução futura é a **WhatsApp Business API** para envio automático de lembretes.

---

## 9. Requisitos não funcionais

- **Responsivo e mobile-first:** o cliente vai usar principalmente pelo celular.
- **Segurança:** senhas com hash (bcrypt/argon2), HTTPS, rotas do painel protegidas por autenticação.
- **LGPD:** coletar apenas nome e telefone, com aviso de uso dos dados.
- **Concorrência:** evitar duplo agendamento do mesmo horário (índice único + transação).
- **Fuso horário:** America/Sao_Paulo.
- **Backup** diário do banco.

---

## 10. Stack e padrões de desenvolvimento

### 10.1 Tecnologias

| Camada | Definição |
|---|---|
| Frontend | **HTML, CSS e JavaScript** (sem frameworks) |
| Banco de dados | **A definir** (decisão adiada; ver 10.4) |
| Identidade visual | Paleta de cores e logos da Karbo System já definidas (arquivos no projeto) |

### 10.2 Padrões de código

- **Arquivos separados** por responsabilidade: HTML só estrutura, CSS só estilo, JS só comportamento. Nada de CSS ou JS dentro do HTML.
- **Todo código comentado:** cada função deve ter um comentário dizendo o que ela faz dentro do sistema.
- Nomes de arquivos, funções e variáveis em português ou inglês, mas **sempre no mesmo padrão** em todo o projeto.

### 10.3 Estrutura de pastas proposta

```
karbosystem-barbearia/
├── docs/
│   └── DOCUMENTACAO.md
├── index.html                  # Entrada: redireciona para o agendamento do cliente
├── cliente/
│   └── agendar.html            # Fluxo público: data → horário → barbeiro
├── admin/
│   ├── login.html
│   ├── proximos-dias.html      # Próximos 3 dias + botão Confirmar (WhatsApp)
│   ├── agenda.html             # Agenda mensal
│   ├── novo-agendamento.html   # Inclusão manual
│   ├── clientes.html           # Clientes e fidelidade
│   └── cadastros.html          # Barbeiros, serviços e horários
├── barbeiro/
│   └── atendimentos.html       # Confirmar "Realizado" / "Não compareceu"
├── css/
│   ├── base.css                # Variáveis (paleta), reset e tipografia
│   ├── componentes.css         # Botões, cards, formulários, calendário
│   ├── cliente.css
│   ├── admin.css
│   └── barbeiro.css
├── js/
│   ├── config.js               # Número do WhatsApp, meta da fidelidade, regras
│   ├── dados.js                # Camada de dados (único arquivo que fala com o banco)
│   ├── agenda.js               # Regras de horários livres e conflitos
│   ├── whatsapp.js             # Geração dos links wa.me e das mensagens
│   ├── fidelidade.js           # Pontos, saldo e resgates
│   ├── utils.js                # Datas, telefone, formatação
│   ├── cliente.js
│   ├── admin.js
│   └── barbeiro.js
└── assets/
    ├── img/                    # Logos e ícones
    └── fonts/
```

### 10.4 Banco de dados: decisão adiada

Como o banco ainda não foi escolhido, o projeto isola o acesso a dados:

- **Todo acesso ao banco passa por `js/dados.js`.** As demais telas e regras só chamam funções desse arquivo (por exemplo `listarAgendamentos(data)`, `criarAgendamento(dados)`, `lancarPonto(agendamentoId)`).
- Na fase inicial, `dados.js` pode usar **dados de teste em memória ou `localStorage`**, só para desenvolver e validar as telas.
- Quando o banco for escolhido, **só o `dados.js` é reescrito**; o resto do sistema não muda.

**Ponto de atenção:** `localStorage` guarda dados apenas no navegador de cada pessoa. Ele serve para protótipo, mas **não funciona em produção**, porque o cliente e o administrador precisam enxergar a mesma agenda. Em produção, o sistema precisa de um banco compartilhado, acessado por um serviço (backend próprio ou um serviço de banco na nuvem). Isso também é necessário para proteger o painel com login e para impedir agendamentos duplicados no mesmo horário.

## 11. Roadmap por versões

| Versão | Entregas |
|---|---|
| **v0.1** | Estrutura de pastas, identidade visual (`base.css`), camada de dados provisória (`dados.js`) e cadastros (barbeiros, serviços, horários). |
| **v0.2** | Fluxo do cliente: data → horário → barbeiro → WhatsApp. |
| **v0.3** | Painel do admin: login, próximos 3 dias com botão de confirmação, agenda mensal. |
| **v0.4** | Inclusão e exclusão manual de agendamentos. |
| **v0.5** | Finalização pelo barbeiro e cartão fidelidade automático. |
| **v0.6** | Escolha e integração do banco de dados definitivo (troca do `dados.js`) e login real. |
| **v1.0** | Ajustes, testes, deploy em produção. |
| **Futuro** | Lembretes automáticos (WhatsApp API), relatórios, múltiplos serviços por agendamento, resgate de prêmios com histórico. |

---

## 12. Questões em aberto

1. Quantos barbeiros e quais os horários de trabalho de cada um?
2. A barbearia terá **um único número de WhatsApp** para receber as mensagens?
3. Quantos cortes formam o cartão fidelidade e qual é a recompensa?
4. O barbeiro terá login próprio ou o administrador confirma o corte?
5. Haverá mais de um serviço (corte, barba, combo) com durações diferentes?
6. Como tratar o cliente que agenda no link e **não envia** a mensagem no WhatsApp? Como o horário já fica reservado, sugere-se que o admin possa cancelar, ou que o agendamento sem confirmação expire.
7. O cliente poderá cancelar ou remarcar sozinho, ou apenas pelo WhatsApp?
