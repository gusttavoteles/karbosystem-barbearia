# Karbo System — Barber

**Versão do documento:** 0.3 (escopo ampliado: caixa, custos, produtos, comissão e aniversário)
**Data:** 05/11/2026
**Repositório:** https://github.com/gusttavoteles/karbosystem-barbearia

> Documento principal do sistema. A análise de mercado que motivou a ampliação do escopo está em [`ANALISE-APPBARBER.md`](./ANALISE-APPBARBER.md).

---

## 1. Visão geral

O Karbo System — Barber é um sistema web de **agendamento e gestão para barbearias**. Nasceu como agenda e cresceu para cobrir também o financeiro do negócio.

O cliente agenda por um link público, sem criar conta, e confirma pelo WhatsApp. O barbeiro vê a própria agenda, encaixa clientes e confirma os atendimentos realizados. O administrador acompanha tudo, controla o caixa, os custos, os produtos vendidos e as comissões da equipe.

O eixo do sistema é a **confirmação do atendimento pelo barbeiro**. Um único gesto dele alimenta quatro coisas ao mesmo tempo: o status do agendamento, o cartão fidelidade do cliente, a entrada no caixa e a comissão do próprio barbeiro. Esse encadeamento é intencional e deve ser preservado — ele evita que alguém tenha de redigitar os mesmos valores em telas diferentes no fim do dia.

### Objetivos

- Eliminar a marcação de horário feita por conversa.
- Reduzir faltas, com confirmação via WhatsApp.
- Dar ao dono visão clara da agenda, do caixa e do resultado do mês.
- Fidelizar clientes com um cartão automático e confiável.
- Calcular a comissão da equipe sem planilha paralela.

---

## 2. Perfis de usuário

| Perfil | Descrição | Acesso |
|---|---|---|
| **Cliente** | Pessoa que agenda o corte. | Link público, sem login. |
| **Barbeiro** | Profissional que realiza o corte. | Login próprio. |
| **Administrador** | Dono ou gerente da barbearia. | Login próprio, acesso total. |

### 2.1 Permissões

O barbeiro tem login próprio, para que a confirmação do atendimento e a comissão tenham responsável identificado.

| Ação | Barbeiro | Admin |
|---|---|---|
| Ver a própria agenda | Sim | Sim |
| Ver a agenda dos colegas | Não | Sim |
| Agendar na própria agenda | Sim | Sim |
| Agendar na agenda de um colega | Não | Sim |
| Excluir ou cancelar agendamento | Não | Sim |
| Confirmar atendimento realizado | Sim (só os seus) | Sim |
| Registrar venda de produto | Sim | Sim |
| Ver as próprias comissões | Sim | Sim |
| Ver o caixa, os custos e o faturamento | **Não** | Sim |
| Cadastrar barbeiros, serviços, produtos e comissões | Não | Sim |

> Essa divisão é a configuração inicial. Se o dono quiser abrir mais acesso a um barbeiro de confiança, isso vira uma configuração por usuário, e não uma mudança de código.

---

## 3. Requisitos funcionais

### 3.1 Agendamento pelo cliente (link público)

- **RF01** — O cliente acessa um link e escolhe, nesta ordem: **data → horário → barbeiro**.
- **RF02** — O sistema mostra apenas horários livres, dentro da jornada do barbeiro escolhido.
- **RF03** — O cliente informa **nome** e **telefone (WhatsApp)**. A **data de nascimento é opcional**.
- **RF04** — Ao finalizar, o sistema abre o WhatsApp com mensagem pré-preenchida (data, horário, barbeiro, serviço) para o número da barbearia.
- **RF05** — O agendamento é gravado no envio da mensagem e passa a ocupar o horário.
- **RF06** — O cliente é identificado pelo telefone, o que liga o agendamento ao seu cartão fidelidade.

### 3.2 Painel do administrador

- **RF07** — **Agenda mensal**, com filtro por barbeiro.
- **RF08** — **Incluir agendamento manualmente.**
- **RF09** — **Excluir ou cancelar agendamento.**
- **RF10** — **Visão dos próximos 3 dias**, com os agendamentos agrupados por dia.
- **RF11** — Cada agendamento dessa visão tem o botão **"Confirmar"**, que abre o WhatsApp na conversa do cliente com a mensagem pronta.
- **RF12** — Marcar o agendamento como confirmado pelo cliente, após a resposta no WhatsApp.

### 3.3 Painel do barbeiro

- **RF13** — Ver a **própria agenda** do dia e da semana.
- **RF14** — **Incluir agendamento manualmente na própria agenda** (encaixe de cliente que chegou no balcão).
- **RF15** — **Confirmar o atendimento**: "Realizado" ou "Não compareceu".
- **RF16** — Registrar **produtos vendidos** junto ao atendimento.
- **RF17** — Consultar as **próprias comissões** do período e o que já foi pago.

### 3.4 Finalização do atendimento

Esta é a operação central do sistema.

- **RF18** — Passado o horário, o agendamento fica como **"Aguardando finalização"**.
- **RF19** — Ao marcar **"Realizado"**, o barbeiro informa o **valor cobrado** e a **forma de pagamento**, e pode adicionar produtos vendidos.
- **RF20** — A confirmação dispara automaticamente, em uma única transação:
  - **1 ponto** no cartão fidelidade do cliente;
  - **entrada no caixa**, com o valor do serviço e dos produtos;
  - **comissão** do barbeiro, calculada conforme o cadastro dele;
  - **baixa de estoque** dos produtos vendidos, quando o produto controla estoque.
- **RF21** — Em **"Não compareceu"**, nada disso é lançado, e o evento fica registrado para histórico.

### 3.5 Comissão

- **RF22** — O administrador define a comissão **de cada barbeiro**, que pode ser **percentual** (ex.: 40% do serviço) ou **valor fixo** por atendimento (ex.: R$ 20,00).
- **RF23** — A comissão sobre **venda de produtos** é configurada em separado, como percentual, e pode ser zero.
- **RF24** — A comissão é gerada automaticamente na finalização do atendimento.
- **RF25** — O percentual ou valor usado fica **congelado no lançamento**. Alterar a comissão do barbeiro hoje **não altera** as comissões já geradas.
- **RF26** — O administrador consulta o **total a pagar por barbeiro** em um período e registra o pagamento.
- **RF27** — O pagamento da comissão gera uma **saída no caixa**.

### 3.6 Controle de caixa

- **RF28** — **Abertura do caixa** no início do dia, com valor inicial (troco).
- **RF29** — **Lançamento automático de entrada** a cada atendimento finalizado e a cada venda.
- **RF30** — **Lançamento manual** de entrada e de saída, com descrição e categoria.
- **RF31** — Toda entrada registra a **forma de pagamento**: dinheiro, PIX, débito ou crédito.
- **RF32** — **Fechamento do caixa**, comparando o valor calculado pelo sistema com o valor conferido na gaveta, e registrando a diferença, se houver.
- **RF33** — **Resumo do dia e do mês**, com total por forma de pagamento.

### 3.7 Controle de custos

- **RF34** — Cadastro de **categorias de custo** (aluguel, produtos, energia, comissão, material, outros).
- **RF35** — Lançamento de custo com **descrição, valor, categoria e vencimento**.
- **RF36** — Custo **recorrente**: cadastrado uma vez, gerado automaticamente todo mês.
- **RF37** — Marcação de **pago** ou **em aberto**, com alerta de vencidos.
- **RF38** — **Resultado do período**: entradas − saídas.

### 3.8 Produtos

- **RF39** — Cadastro de produto com **nome, preço de venda e preço de custo**.
- **RF40** — **Venda avulsa** (sem agendamento) ou **vinculada ao atendimento**.
- **RF41** — A venda alimenta o caixa e, se configurado, gera comissão.
- **RF42** — Controle de estoque **opcional por produto**: quem controla tem saldo, entrada e baixa automática na venda, com alerta de estoque baixo.

### 3.9 Clientes e aniversário

- **RF43** — Cadastro de cliente com **nome, telefone e data de nascimento** (opcional).
- **RF44** — Tela de **aniversariantes do mês**, com botão de WhatsApp para parabenizar.
- **RF45** — Histórico de atendimentos e saldo de fidelidade por cliente.

---

## 4. Regras de negócio

### Agenda
1. Um barbeiro não pode ter dois agendamentos no mesmo horário.
2. Um horário só aparece para o cliente se estiver livre e dentro da jornada do barbeiro.
3. Excluir um agendamento libera o horário imediatamente.
4. O telefone é a chave do cliente, normalizado para apenas dígitos com DDI 55.

### Fidelidade
5. Só pontua atendimento **confirmado pelo barbeiro**. Agendamento sozinho não gera ponto.
6. Cada atendimento gera **no máximo um** ponto, garantido por restrição no banco.
7. **Compra de produto não pontua** na v1 (ver questão em aberto nº 3).

### Comissão
8. A comissão é gerada **apenas** na finalização com status "Realizado".
9. A taxa aplicada é **congelada no momento da geração**, para que alterações futuras não reescrevam o passado.
10. A comissão **gerada** é uma provisão: ela ainda não saiu do caixa. Só o **pagamento** da comissão vira saída de caixa. Isso evita contar o mesmo dinheiro duas vezes.
11. Comissão de atendimento cancelado ou estornado é cancelada junto.

### Caixa
12. Só existe **um caixa aberto por vez**.
13. Lançamento automático **não pode ser editado** à mão; corrige-se estornando o atendimento de origem, o que preserva a trilha.
14. O fechamento registra a diferença entre o calculado e o conferido, sem apagá-la.
15. A v1 registra o **valor bruto**. Taxa de cartão e parcelamento ficam para depois (ver questão em aberto nº 6).

### Pontos a decidir (valores sugeridos)

| Tema | Sugestão |
|---|---|
| Meta do cartão fidelidade | 10 cortes = 1 corte grátis |
| Duração padrão do atendimento | 30 min, configurável por serviço |
| Antecedência mínima para agendar | 1 hora |
| Antecedência máxima | 30 dias |
| Comissão padrão de serviço | 40% (percentual) |
| Comissão padrão de produto | 10% |
| Periodicidade do pagamento de comissão | Quinzenal |
| Pontos expiram? | Não, na v1 |

---

## 5. Fluxos principais

### 5.1 Cliente agenda

```
Cliente abre o link
  → escolhe a data
  → escolhe o horário (apenas livres)
  → escolhe o barbeiro
  → informa nome e telefone (aniversário opcional)
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

### 5.3 Finalização: um gesto, quatro efeitos

```
Horário do atendimento passa
  → agendamento fica "Aguardando finalização"
  → barbeiro abre o atendimento
  → marca "Realizado"
  → informa valor cobrado e forma de pagamento
  → adiciona produtos vendidos (se houver)
  → confirma
        │
        ├──→ FIDELIDADE: +1 ponto para o cliente
        ├──→ CAIXA: entrada (serviço + produtos)
        ├──→ COMISSÃO: lançamento para o barbeiro (taxa congelada)
        └──→ ESTOQUE: baixa dos produtos que controlam saldo

  → se "Não compareceu": nada é lançado, só o registro do evento
```

### 5.4 Pagamento da comissão

```
Admin abre "Comissões"
  → escolhe o período e o barbeiro
  → vê o total gerado e o que já foi pago
  → registra o pagamento
  → sistema marca as comissões como pagas
  → sistema lança a SAÍDA no caixa
```

### 5.5 Estados do agendamento

```
AGENDADO → CONFIRMADO → REALIZADO
    │           │
    └───────────┴──→ CANCELADO
                └──→ NAO_COMPARECEU
```

---

## 6. Modelo de dados

Modelo relacional, independente de tecnologia. O SQL abaixo serve de referência das tabelas, campos e regras, e será adaptado ao banco escolhido.

### 6.1 Usuários e equipe

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
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Comissão definida pelo administrador, por barbeiro
  comissao_tipo         VARCHAR(10) NOT NULL DEFAULT 'PERCENTUAL'
                        CHECK (comissao_tipo IN ('PERCENTUAL','FIXO')),
  comissao_valor        NUMERIC(10,2) NOT NULL DEFAULT 0,  -- % se PERCENTUAL, R$ se FIXO
  comissao_produto_perc NUMERIC(5,2)  NOT NULL DEFAULT 0   -- % sobre produtos vendidos
);

CREATE TABLE horarios_trabalho (
  id            SERIAL PRIMARY KEY,
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio   TIME NOT NULL,
  hora_fim      TIME NOT NULL
);
```

### 6.2 Clientes e serviços

```sql
CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  telefone        VARCHAR(15) UNIQUE NOT NULL,  -- só dígitos, ex.: 5562999999999
  data_nascimento DATE,                          -- opcional: aniversariantes do mês
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE servicos (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  duracao_min   INT NOT NULL DEFAULT 30,
  preco         NUMERIC(10,2),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 6.3 Agendamentos

```sql
CREATE TABLE agendamentos (
  id             SERIAL PRIMARY KEY,
  cliente_id     INT NOT NULL REFERENCES clientes(id),
  barbeiro_id    INT NOT NULL REFERENCES barbeiros(id),
  servico_id     INT REFERENCES servicos(id),
  data_hora      TIMESTAMP NOT NULL,
  duracao_min    INT NOT NULL DEFAULT 30,
  status         VARCHAR(20) NOT NULL DEFAULT 'AGENDADO'
                 CHECK (status IN ('AGENDADO','CONFIRMADO','REALIZADO','NAO_COMPARECEU','CANCELADO')),
  origem         VARCHAR(10) NOT NULL DEFAULT 'LINK'
                 CHECK (origem IN ('LINK','MANUAL')),

  -- Preenchidos na finalização
  valor_cobrado  NUMERIC(10,2),      -- pode diferir do preço de tabela do serviço
  forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO')),
  finalizado_por INT REFERENCES barbeiros(id),
  finalizado_em  TIMESTAMP,

  criado_em      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Impede dois agendamentos ativos do mesmo barbeiro no mesmo horário
CREATE UNIQUE INDEX uq_barbeiro_horario
  ON agendamentos (barbeiro_id, data_hora)
  WHERE status IN ('AGENDADO','CONFIRMADO');
```

### 6.4 Fidelidade

```sql
CREATE TABLE fidelidade_pontos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT NOT NULL REFERENCES clientes(id),
  agendamento_id  INT UNIQUE NOT NULL REFERENCES agendamentos(id),  -- 1 ponto por atendimento
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
O `UNIQUE` em `agendamento_id` garante, no banco, que um atendimento nunca pontue duas vezes.

### 6.5 Produtos e vendas

```sql
CREATE TABLE produtos (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(100) NOT NULL,
  preco_venda      NUMERIC(10,2) NOT NULL,
  preco_custo      NUMERIC(10,2),
  controla_estoque BOOLEAN NOT NULL DEFAULT FALSE,  -- permite o nível 2 sem refazer o modelo
  estoque_atual    INT NOT NULL DEFAULT 0,
  estoque_minimo   INT NOT NULL DEFAULT 0,          -- alerta de estoque baixo
  ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vendas (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT REFERENCES clientes(id),      -- nulo em venda de balcão
  barbeiro_id     INT REFERENCES barbeiros(id),     -- quem vendeu, para a comissão
  agendamento_id  INT REFERENCES agendamentos(id),  -- nulo em venda avulsa
  data_hora       TIMESTAMP NOT NULL DEFAULT NOW(),
  total           NUMERIC(10,2) NOT NULL,
  forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO'))
);

CREATE TABLE venda_itens (
  id             SERIAL PRIMARY KEY,
  venda_id       INT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id     INT NOT NULL REFERENCES produtos(id),
  quantidade     INT NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,  -- congelado na venda
  subtotal       NUMERIC(10,2) NOT NULL
);

CREATE TABLE estoque_movimentos (
  id          SERIAL PRIMARY KEY,
  produto_id  INT NOT NULL REFERENCES produtos(id),
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA','AJUSTE')),
  quantidade  INT NOT NULL,
  venda_id    INT REFERENCES vendas(id),
  observacao  VARCHAR(200),
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 6.6 Comissões

```sql
CREATE TABLE comissao_pagamentos (
  id            SERIAL PRIMARY KEY,
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),
  periodo_ini   DATE NOT NULL,
  periodo_fim   DATE NOT NULL,
  valor_total   NUMERIC(10,2) NOT NULL,
  pago_em       TIMESTAMP NOT NULL DEFAULT NOW(),
  usuario_id    INT REFERENCES usuarios(id)
);

CREATE TABLE comissoes (
  id             SERIAL PRIMARY KEY,
  barbeiro_id    INT NOT NULL REFERENCES barbeiros(id),
  agendamento_id INT REFERENCES agendamentos(id),  -- comissão de serviço
  venda_id       INT REFERENCES vendas(id),        -- comissão de produto
  origem         VARCHAR(10) NOT NULL CHECK (origem IN ('SERVICO','PRODUTO')),

  -- Taxa congelada: mudar o cadastro do barbeiro não reescreve o passado
  base_calculo   NUMERIC(10,2) NOT NULL,  -- valor sobre o qual a comissão incidiu
  tipo_aplicado  VARCHAR(10)   NOT NULL CHECK (tipo_aplicado IN ('PERCENTUAL','FIXO')),
  taxa_aplicada  NUMERIC(10,2) NOT NULL,  -- o % ou R$ vigente na geração
  valor          NUMERIC(10,2) NOT NULL,  -- comissão calculada

  pagamento_id   INT REFERENCES comissao_pagamentos(id),  -- nulo = ainda não paga
  criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),

  CHECK (agendamento_id IS NOT NULL OR venda_id IS NOT NULL)
);

-- Uma comissão de serviço por atendimento
CREATE UNIQUE INDEX uq_comissao_agendamento
  ON comissoes (agendamento_id) WHERE agendamento_id IS NOT NULL;
```

**Comissão a pagar** de um barbeiro = soma de `comissoes.valor` com `pagamento_id IS NULL`.

### 6.7 Caixa e custos

```sql
CREATE TABLE caixas (
  id                     SERIAL PRIMARY KEY,
  aberto_em              TIMESTAMP NOT NULL DEFAULT NOW(),
  valor_inicial          NUMERIC(10,2) NOT NULL DEFAULT 0,
  fechado_em             TIMESTAMP,
  valor_final_conferido  NUMERIC(10,2),   -- o que havia de fato na gaveta
  valor_final_calculado  NUMERIC(10,2),   -- o que o sistema esperava
  diferenca              NUMERIC(10,2),   -- conferido − calculado, registrada e não apagada
  status                 VARCHAR(10) NOT NULL DEFAULT 'ABERTO'
                         CHECK (status IN ('ABERTO','FECHADO')),
  usuario_abertura_id    INT REFERENCES usuarios(id),
  usuario_fechamento_id  INT REFERENCES usuarios(id)
);

-- Garante um único caixa aberto por vez
CREATE UNIQUE INDEX uq_caixa_aberto ON caixas ((status)) WHERE status = 'ABERTO';

CREATE TABLE categorias_custo (
  id    SERIAL PRIMARY KEY,
  nome  VARCHAR(60) NOT NULL,
  tipo  VARCHAR(10) NOT NULL CHECK (tipo IN ('FIXO','VARIAVEL'))
);

CREATE TABLE custos (
  id            SERIAL PRIMARY KEY,
  categoria_id  INT NOT NULL REFERENCES categorias_custo(id),
  descricao     VARCHAR(200) NOT NULL,
  valor         NUMERIC(10,2) NOT NULL,
  vencimento    DATE NOT NULL,
  pago          BOOLEAN NOT NULL DEFAULT FALSE,
  pago_em       DATE,
  recorrente    BOOLEAN NOT NULL DEFAULT FALSE,
  dia_recorrencia SMALLINT CHECK (dia_recorrencia BETWEEN 1 AND 31),
  origem_id     INT REFERENCES custos(id),  -- custo-modelo que gerou esta parcela
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lancamentos (
  id             SERIAL PRIMARY KEY,
  caixa_id       INT NOT NULL REFERENCES caixas(id),
  tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  descricao      VARCHAR(200) NOT NULL,
  valor          NUMERIC(10,2) NOT NULL,
  forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO')),
  origem         VARCHAR(12) NOT NULL DEFAULT 'MANUAL'
                 CHECK (origem IN ('AUTOMATICO','MANUAL')),

  -- Rastreio: de onde veio o lançamento automático
  agendamento_id INT REFERENCES agendamentos(id),
  venda_id       INT REFERENCES vendas(id),
  custo_id       INT REFERENCES custos(id),
  comissao_pagamento_id INT REFERENCES comissao_pagamentos(id),

  usuario_id     INT REFERENCES usuarios(id),
  criado_em      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Saldo do caixa** = `valor_inicial` + entradas − saídas do caixa aberto.

> Observação contábil: a **comissão gerada** não entra como saída no caixa. Só entra quando é **paga**, via `comissao_pagamentos`. Lançar as duas coisas contaria o mesmo dinheiro duas vezes e distorceria o resultado do mês.

---

## 7. Telas

### Cliente (público)
1. Escolha de data, com dias sem horário livre desabilitados.
2. Escolha de horário.
3. Escolha de barbeiro.
4. Dados do cliente e resumo.
5. Redirecionamento para o WhatsApp.

### Barbeiro
1. **Minha agenda** (hoje e semana).
2. **Novo agendamento** na própria agenda.
3. **Finalizar atendimento**: valor, forma de pagamento, produtos, "Realizado" ou "Não compareceu".
4. **Minhas comissões**: gerado no período, pago e a receber.

### Administrador
1. **Login.**
2. **Próximos 3 dias** (tela inicial), com botão "Confirmar" via WhatsApp.
3. **Agenda mensal**, com filtro por barbeiro.
4. **Novo agendamento manual.**
5. **Caixa**: abertura, lançamentos do dia, fechamento e resumo por forma de pagamento.
6. **Custos**: lançamento, recorrentes, em aberto e vencidos.
7. **Produtos**: cadastro, venda avulsa e estoque.
8. **Comissões**: total por barbeiro no período e registro de pagamento.
9. **Clientes**: busca, histórico, fidelidade e **aniversariantes do mês** com botão de WhatsApp.
10. **Cadastros**: barbeiros (com a comissão de cada um), serviços, horários de trabalho e categorias de custo.
11. **Relatórios**: faturamento por período e por barbeiro, serviços e produtos mais vendidos.

---

## 8. Integração com WhatsApp

Na v1 a integração usa **links `wa.me`**, sem API paga e sem aprovação da Meta:

- **Cliente → barbearia:** `https://wa.me/<NUMERO_BARBEARIA>?text=<mensagem codificada>`
- **Admin → cliente:** `https://wa.me/<TELEFONE_CLIENTE>?text=<mensagem codificada>`

Exemplos de mensagem:

> **Cliente agendando:** Olá! Gostaria de confirmar meu agendamento: dia 05/11 às 14:00 com o barbeiro Carlos.

> **Admin confirmando:** Olá, João! Passando para confirmar seu horário amanhã (05/11) às 14:00 com o Carlos. Pode confirmar?

> **Aniversário:** Olá, João! A equipe da barbearia deseja um feliz aniversário. Passa aqui para comemorar com um corte!

**Limitação:** com `wa.me` o envio é sempre manual — alguém precisa tocar em "enviar" —, e o sistema não sabe se a mensagem foi enviada nem se houve resposta. A evolução futura é a **WhatsApp Business API**, que é paga e exige aprovação.

---

## 9. Requisitos não funcionais

- **Responsivo e mobile-first.** O cliente usa o celular, e o barbeiro também.
- **Segurança.** Senhas com hash (bcrypt ou argon2), HTTPS e rotas protegidas. As permissões da seção 2.1 são validadas **no servidor**: esconder um botão no JavaScript não protege nada, porque qualquer pessoa abre o código da página no navegador.
- **Integridade financeira.** A finalização do atendimento grava fidelidade, caixa, comissão e estoque **em uma única transação**: ou tudo é gravado, ou nada é.
- **Trilha de auditoria.** Lançamento automático não se edita; corrige-se por estorno, que fica registrado.
- **LGPD.** Coletar apenas nome, telefone e, se o cliente quiser, data de nascimento, com aviso de uso dos dados.
- **Concorrência.** Índice único e transação para impedir agendamento duplicado.
- **Fuso horário:** America/Sao_Paulo.
- **Backup diário** do banco, obrigatório a partir do momento em que houver dado financeiro.

---

## 10. Stack e padrões de desenvolvimento

### 10.1 Tecnologias

| Camada | Definição |
|---|---|
| Frontend | **HTML, CSS e JavaScript**, sem frameworks |
| Banco de dados | **A definir** — mas agora é pré-requisito, não mais adiável (ver 10.4) |
| Identidade visual | Paleta e logos da Karbo System (ver 10.5) |

### 10.2 Padrões de código

- **Arquivos separados** por responsabilidade: HTML só estrutura, CSS só estilo, JS só comportamento. Nada de CSS ou JS embutido no HTML.
- **Todo código comentado:** cada função leva um comentário dizendo o que faz dentro do sistema.
- Nomenclatura em português, consistente em todo o projeto.

### 10.3 Estrutura de pastas

```
karbosystem-barbearia/
├── docs/
│   ├── DOCUMENTACAO.md
│   └── ANALISE-APPBARBER.md
├── index.html                      # Entrada: redireciona para o agendamento
├── cliente/
│   └── agendar.html
├── admin/
│   ├── login.html
│   ├── proximos-dias.html
│   ├── agenda.html
│   ├── novo-agendamento.html
│   ├── caixa.html
│   ├── custos.html
│   ├── produtos.html
│   ├── comissoes.html
│   ├── clientes.html               # Inclui aniversariantes do mês
│   ├── relatorios.html
│   └── cadastros.html
├── barbeiro/
│   ├── minha-agenda.html
│   ├── finalizar.html
│   └── minhas-comissoes.html
├── css/
│   ├── base.css                    # Variáveis da paleta, reset e tipografia
│   ├── componentes.css             # Botões, cards, formulários, tabelas, calendário
│   ├── cliente.css
│   ├── admin.css
│   └── barbeiro.css
├── js/
│   ├── config.js                   # WhatsApp, meta da fidelidade, comissão padrão
│   ├── dados.js                    # Camada de dados: único arquivo que fala com o banco
│   ├── auth.js                     # Login e verificação de permissão
│   ├── agenda.js                   # Horários livres e conflitos
│   ├── whatsapp.js                 # Montagem dos links wa.me
│   ├── fidelidade.js               # Pontos, saldo e resgates
│   ├── caixa.js                    # Abertura, lançamentos e fechamento
│   ├── custos.js                   # Custos e recorrência
│   ├── produtos.js                 # Produtos, vendas e estoque
│   ├── comissao.js                 # Cálculo, acúmulo e pagamento
│   ├── finalizacao.js              # Orquestra os quatro efeitos da finalização
│   ├── utils.js                    # Datas, telefone, moeda
│   ├── cliente.js
│   ├── admin.js
│   └── barbeiro.js
└── assets/
    ├── img/
    └── fonts/
```

### 10.4 Banco de dados: agora é pré-requisito

Na v0.2 a escolha do banco era adiável, porque o sistema só tinha agenda. **Com caixa, custos, produtos e comissão, deixou de ser.** Os motivos estão detalhados na análise, e em resumo são três:

1. **Dinheiro.** `localStorage` vive no navegador de cada pessoa: some ao limpar o cache, não tem backup e não é auditável.
2. **Várias pessoas ao mesmo tempo.** O barbeiro finaliza no celular, o admin lança um custo no computador, o cliente agenda pelo link. Os três precisam ver os mesmos dados.
3. **Permissão.** O barbeiro não pode ver o faturamento, e isso só se garante no servidor.

A restrição de HTML, CSS e JS puros **continua valendo**: ela é da interface, e não impede um banco na nuvem.

**Recomendação: Supabase.** É PostgreSQL — o modelo da seção 6 roda praticamente como está —, tem login e permissão por tabela prontos, plano gratuito para começar, e o front continua em JavaScript puro chamando por `fetch`. Alternativas: Firebase, que não é SQL e exigiria repensar o modelo, ou backend próprio em Node ou PHP, que dá mais controle e mais trabalho.

Em qualquer caso, **a troca fica isolada no `js/dados.js`**. Até a fase 5, esse arquivo pode servir dados de teste, para desenvolver as telas sem depender do banco.

### 10.5 Identidade visual

Paleta extraída dos arquivos oficiais da marca:

| Papel | Cor |
|---|---|
| Preto (fundo) | `#0A0A0A` |
| Verde principal | `#00D26A` |
| Verde claro (detalhe) | `#B6FFD3` |

Cinzas de apoio e cores de estado (erro, aviso, sucesso) serão derivados dessas três e definidos no `base.css`.

---

## 11. Roadmap

| Fase | Entrega | Exige banco real? |
|---|---|---|
| **1** | Estrutura de pastas, `base.css` com a paleta, camada de dados provisória, cadastros (barbeiros com comissão, serviços, horários, clientes) | Não |
| **2** | Agendamento pelo cliente via link + WhatsApp | Não |
| **3** | Painel do admin: próximos 3 dias, agenda mensal, inclusão e exclusão manual | Não |
| **4** | Painel do barbeiro: agenda própria, agendamento manual, finalização do atendimento | Não |
| **5** | **Banco de dados definitivo + login e permissões reais** | — |
| **6** | Fidelidade automática | Sim |
| **7** | Caixa: abertura, fechamento, entradas automáticas e manuais | Sim |
| **8** | Comissão: geração automática, consulta e pagamento | Sim |
| **9** | Custos: categorias, recorrência e resultado do período | Sim |
| **10** | Produtos: cadastro, venda e estoque opcional | Sim |
| **11** | Aniversariantes e relatórios gerenciais | Sim |

As fases 1 a 4 entregam um sistema de agendamento que já funciona e já tem valor, e permitem colocar algo no ar cedo. A gestão financeira vem depois da fase 5.

---

## 12. Questões em aberto

1. **Comissão: percentual ou valor fixo?** O modelo aceita os dois, e o padrão é percentual. Qual dos dois a barbearia usa de fato?
2. **Comissão sobre produto** existe, ou o barbeiro só ganha pelo serviço?
3. **Compra de produto pontua** na fidelidade? Hoje a regra é só corte.
4. **Quantos cortes** formam o cartão fidelidade, e qual é a recompensa?
5. **Produtos:** venda simples agora, com estoque depois? (É o que a fase 10 assume.)
6. **Taxa de cartão:** registramos o valor bruto na v1, ou já calculamos o líquido?
7. **Periodicidade do pagamento de comissão:** semanal, quinzenal ou mensal?
8. Quantos barbeiros, e quais os horários de trabalho de cada um?
9. A barbearia terá **um único número de WhatsApp** para receber as mensagens?
10. Haverá mais de um serviço (corte, barba, combo) com durações e preços diferentes?
11. Como tratar o cliente que agenda no link e **não envia** a mensagem no WhatsApp? O horário já fica reservado. Sugestão: o admin cancela, ou o agendamento expira sozinho.
12. O cliente poderá cancelar ou remarcar sozinho, ou apenas pelo WhatsApp?
