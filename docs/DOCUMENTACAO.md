# Karbo System — Barber

**Versão do documento:** 0.4 (multiusuário: várias barbearias em um só sistema, com regras configuráveis por cada uma)
**Data:** 05/11/2026
**Repositório:** https://github.com/gusttavoteles/karbosystem-barbearia

> Documento principal do sistema. A análise de mercado que motivou a ampliação do escopo está em [`ANALISE-APPBARBER.md`](./ANALISE-APPBARBER.md). A análise comercial e de preço está em [`analise-preco-karbo-barber.md`](./analise-preco-karbo-barber.md).

---

## 1. Visão geral

O Karbo System — Barber é um sistema web de **agendamento e gestão para barbearias**, vendido por assinatura. **Uma única instalação atende várias barbearias ao mesmo tempo** — cada uma com os próprios dados, isolados das demais, sem saber que as outras existem.

O cliente agenda por um link público, sem criar conta, e confirma pelo WhatsApp. O barbeiro vê a própria agenda, encaixa clientes e confirma os atendimentos realizados. O administrador da barbearia acompanha tudo, controla o caixa, os custos, os produtos vendidos e as comissões da equipe — **e configura o sistema do jeito que a própria barbearia trabalha**, porque cada negócio é diferente.

O eixo do sistema é a **confirmação do atendimento pelo barbeiro**. Um único gesto dele alimenta quatro coisas ao mesmo tempo: o status do agendamento, o cartão fidelidade do cliente, a entrada no caixa e a comissão do próprio barbeiro. Esse encadeamento é intencional e deve ser preservado — ele evita que alguém tenha de redigitar os mesmos valores em telas diferentes no fim do dia.

### Objetivos

- Eliminar a marcação de horário feita por conversa.
- Reduzir faltas, com confirmação via WhatsApp.
- Dar ao dono visão clara da agenda, do caixa e do resultado do mês.
- Fidelizar clientes com um cartão automático e confiável.
- Calcular a comissão da equipe sem planilha paralela.
- Atender muitas barbearias com o mesmo sistema, cada uma configurando as próprias regras.

---

## 2. Multiusuário: uma plataforma, várias barbearias

Esta é a decisão de arquitetura mais importante do documento, tomada em 05/11/2026, e vale explicar o porquê antes de entrar nos detalhes.

O Karbo Barber é um produto que será vendido a dezenas de barbearias (ver a análise de preço). Há dois jeitos de atender várias barbearias com um sistema:

1. **Uma cópia do sistema e um banco por barbearia.** Simples de programar agora, mas 50 clientes viram 50 atualizações, 50 backups e 50 lugares onde um bug pode se esconder.
2. **Um sistema só, um banco só, com os dados de cada barbearia isolados por uma coluna de identificação.** Mais disciplina para programar agora, mas corrigir um bug ou lançar uma funcionalidade nova vale para todo mundo de uma vez.

**Escolhemos a opção 2.** Trocar de uma para a outra depois, com dados financeiros reais de clientes pagantes, é a migração mais arriscada que existe nesse tipo de produto — por isso a decisão entra na documentação antes da primeira linha de código.

Na prática, isso significa que **toda tabela do banco que guarda dado de uma barbearia carrega uma coluna `barbearia_id`**, e toda consulta do sistema filtra por ela. Isso aparece em detalhe na seção 7 (modelo de dados).

### 2.1 Como a barbearia entra no sistema

- Você (dono da Karbo System) cadastra a barbearia quando ela contrata o plano.
- Cada barbearia recebe um **identificador único** (`slug`), que vira parte do link público de agendamento: `karbobarber.com.br/b/barbearia-do-carlos`.
- O administrador daquela barbearia faz login e só vê os próprios dados — jamais os de outra barbearia.

---

## 3. Perfis de usuário

| Perfil | Descrição | Acesso | Enxerga |
|---|---|---|---|
| **Super administrador** | Você, dono da Karbo System. Gerencia a plataforma. | Login próprio. | Todas as barbearias, em nível de cadastro e cobrança — **não entra no dia a dia de nenhuma**, como caixa, agenda ou clientes. |
| **Administrador** | Dono ou gerente de uma barbearia. | Login próprio. | Só a própria barbearia, com acesso total a ela. |
| **Barbeiro** | Profissional que realiza o corte. | Login próprio. | Só a própria barbearia, com acesso limitado (ver 3.1). |
| **Cliente** | Pessoa que agenda o corte. | Link público, sem login. | Só os próprios dados: seu histórico e saldo de fidelidade. |

> O super administrador existe porque o sistema passou a ser multiusuário. Ele **cadastra e desativa barbearias e confere a cobrança**, mas não acessa caixa, agenda ou clientes de nenhuma delas — isso evita que a Karbo System vire responsável pelo sigilo comercial de cada cliente.

### 3.1 Permissões dentro de uma barbearia

O barbeiro tem login próprio, para que a confirmação do atendimento e a comissão tenham responsável identificado.

| Ação | Barbeiro | Admin da barbearia |
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
| Configurar regras da barbearia (seção 4) | Não | Sim |
| Cadastrar barbeiros, serviços, produtos | Não | Sim |

> Essa divisão é a configuração inicial de cada barbearia. Se um dono quiser abrir mais acesso a um barbeiro de confiança, isso é uma configuração daquela barbearia, não uma mudança de código.

---

## 4. Configurações: cada barbearia define as próprias regras

Esta seção existe porque cortes diferentes de regra de negócio — meta de fidelidade, forma de calcular comissão, duração do corte — **não são escolhas da Karbo System, e sim de cada barbearia**. O sistema não embute um valor fixo em lugar nenhum; ele oferece uma tela de configuração, e cada administrador preenche do jeito que o próprio negócio funciona.

Isso é o que diferencia "valor sugerido no documento" (que existia até a v0.3) de "campo configurável no sistema" (a partir de agora). Nenhum dos itens abaixo é decidido por nós — é decidido pelo administrador, dentro do próprio sistema, na tela **Configurações**.

| Configuração | O que o administrador define | Onde é usada |
|---|---|---|
| **Comissão por barbeiro** | Tipo (percentual ou valor fixo) e valor, individualmente para cada barbeiro | Geração da comissão na finalização |
| **Comissão sobre produto** | Percentual por barbeiro, podendo ser zero | Venda de produto |
| **Periodicidade do pagamento de comissão** | Semanal, quinzenal ou mensal | Tela de comissões, para agrupar o período sugerido |
| **Meta do cartão fidelidade** | Quantos atendimentos dão direito à recompensa, e qual é a recompensa | Fidelidade |
| **Produto pontua fidelidade?** | Sim ou não | Geração de ponto na venda |
| **Duração padrão do atendimento** | Em minutos, com exceção por serviço | Cálculo de horários livres |
| **Antecedência mínima e máxima para agendar** | Em horas e em dias | Tela pública do cliente |
| **Forma como o caixa trata taxa de cartão** | Registrar valor bruto, ou líquido com taxa configurada por bandeira | Lançamento no caixa |
| **Categorias de custo** | A lista de categorias usadas naquela barbearia | Tela de custos |
| **Mensagens do WhatsApp** | O texto padrão de confirmação, lembrete e aniversário | Montagem do link `wa.me` |

Essa tabela é a referência de produto para a tela de **Configurações** do administrador (seção 8) e para a tabela `configuracoes` do banco (seção 7.8). Qualquer regra de negócio nova que surgir no projeto deve, por padrão, entrar aqui — e não como um valor fixo no código.

---

## 5. Requisitos funcionais

### 5.1 Agendamento pelo cliente (link público da barbearia)

- **RF01** — O cliente acessa o link da barbearia (`/b/<slug-da-barbearia>`) e escolhe, nesta ordem: **data → horário → barbeiro**.
- **RF02** — O sistema mostra apenas horários livres, dentro da jornada do barbeiro e das regras daquela barbearia.
- **RF03** — O cliente informa **nome** e **telefone (WhatsApp)**. A **data de nascimento é opcional**.
- **RF04** — Ao finalizar, o sistema abre o WhatsApp com mensagem pré-preenchida (conforme o texto configurado pela barbearia) para o número daquela barbearia.
- **RF05** — O agendamento é gravado no envio da mensagem e passa a ocupar o horário.
- **RF06** — O cliente é identificado pelo telefone **dentro daquela barbearia**, o que liga o agendamento ao seu cartão fidelidade.

### 5.2 Painel do administrador da barbearia

- **RF07** — **Agenda mensal**, com filtro por barbeiro.
- **RF08** — **Incluir agendamento manualmente.**
- **RF09** — **Excluir ou cancelar agendamento.**
- **RF10** — **Visão dos próximos 3 dias**, com os agendamentos agrupados por dia.
- **RF11** — Cada agendamento dessa visão tem o botão **"Confirmar"**, que abre o WhatsApp na conversa do cliente com a mensagem pronta.
- **RF12** — Marcar o agendamento como confirmado pelo cliente, após a resposta no WhatsApp.

### 5.3 Painel do barbeiro

- **RF13** — Ver a **própria agenda** do dia e da semana.
- **RF14** — **Incluir agendamento manualmente na própria agenda** (encaixe de cliente que chegou no balcão).
- **RF15** — **Confirmar o atendimento**: "Realizado" ou "Não compareceu".
- **RF16** — Registrar **produtos vendidos** junto ao atendimento.
- **RF17** — Consultar as **próprias comissões** do período e o que já foi pago.

### 5.4 Finalização do atendimento

Esta é a operação central do sistema.

- **RF18** — Passado o horário, o agendamento fica como **"Aguardando finalização"**.
- **RF19** — Ao marcar **"Realizado"**, o barbeiro informa o **valor cobrado** e a **forma de pagamento**, e pode adicionar produtos vendidos.
- **RF20** — A confirmação dispara automaticamente, em uma única transação:
  - **pontos** no cartão fidelidade do cliente, conforme a configuração da barbearia;
  - **entrada no caixa**, com o valor do serviço e dos produtos;
  - **comissão** do barbeiro, calculada conforme a configuração daquele barbeiro naquela barbearia;
  - **baixa de estoque** dos produtos vendidos, quando o produto controla estoque.
- **RF21** — Em **"Não compareceu"**, nada disso é lançado, e o evento fica registrado para histórico.

### 5.5 Comissão

- **RF22** — O administrador define, na tela de **Configurações**, a comissão **de cada barbeiro**: percentual ou valor fixo.
- **RF23** — A comissão sobre **venda de produtos** é configurada em separado, como percentual, e pode ser zero.
- **RF24** — A comissão é gerada automaticamente na finalização do atendimento.
- **RF25** — O percentual ou valor usado fica **congelado no lançamento**. Alterar a comissão do barbeiro hoje **não altera** as comissões já geradas.
- **RF26** — O administrador consulta o **total a pagar por barbeiro** em um período e registra o pagamento.
- **RF27** — O pagamento da comissão gera uma **saída no caixa**.

### 5.6 Controle de caixa

- **RF28** — **Abertura do caixa** no início do dia, com valor inicial (troco).
- **RF29** — **Lançamento automático de entrada** a cada atendimento finalizado e a cada venda.
- **RF30** — **Lançamento manual** de entrada e de saída, com descrição e categoria.
- **RF31** — Toda entrada registra a **forma de pagamento**: dinheiro, PIX, débito ou crédito.
- **RF32** — **Fechamento do caixa**, comparando o valor calculado pelo sistema com o valor conferido na gaveta, e registrando a diferença, se houver.
- **RF33** — **Resumo do dia e do mês**, com total por forma de pagamento.

### 5.7 Controle de custos

- **RF34** — Cadastro de **categorias de custo**, definidas por cada barbearia.
- **RF35** — Lançamento de custo com **descrição, valor, categoria e vencimento**.
- **RF36** — Custo **recorrente**: cadastrado uma vez, gerado automaticamente todo mês.
- **RF37** — Marcação de **pago** ou **em aberto**, com alerta de vencidos.
- **RF38** — **Resultado do período**: entradas − saídas.

### 5.8 Produtos

- **RF39** — Cadastro de produto com **nome, preço de venda e preço de custo**.
- **RF40** — **Venda avulsa** (sem agendamento) ou **vinculada ao atendimento**.
- **RF41** — A venda alimenta o caixa e, se configurado, gera comissão e pontos de fidelidade.
- **RF42** — Controle de estoque **opcional por produto**: quem controla tem saldo, entrada e baixa automática na venda, com alerta de estoque baixo.

### 5.9 Clientes e aniversário

- **RF43** — Cadastro de cliente com **nome, telefone e data de nascimento** (opcional).
- **RF44** — Tela de **aniversariantes do mês**, com botão de WhatsApp para parabenizar, usando a mensagem configurada.
- **RF45** — Histórico de atendimentos e saldo de fidelidade por cliente.

### 5.10 Plataforma (super administrador)

- **RF46** — Cadastrar uma nova barbearia, com nome, slug do link público e dados de contato.
- **RF47** — Ativar, suspender ou cancelar o acesso de uma barbearia, conforme a cobrança.
- **RF48** — Listar as barbearias ativas e o plano de cada uma.
- **RF49** — O super administrador **não acessa** agenda, caixa, clientes ou qualquer dado operacional de uma barbearia — apenas o cadastro dela.

---

## 6. Regras de negócio

### Isolamento entre barbearias
1. Toda consulta ao banco filtra por `barbearia_id`. Não existe tela ou endpoint que devolva dado de mais de uma barbearia ao mesmo tempo, exceto o painel do super administrador (RF46–RF49), que só vê cadastro, nunca operação.
2. O telefone do cliente é único **dentro de cada barbearia**, não globalmente — duas barbearias diferentes podem ter clientes com o mesmo telefone, como pessoas diferentes.

### Agenda
3. Um barbeiro não pode ter dois agendamentos no mesmo horário.
4. Um horário só aparece para o cliente se estiver livre e dentro da jornada do barbeiro.
5. Excluir um agendamento libera o horário imediatamente.

### Fidelidade
6. Só pontua atendimento **confirmado pelo barbeiro**. Agendamento sozinho não gera ponto.
7. Cada atendimento gera **no máximo um** lançamento de ponto, garantido por restrição no banco.
8. Produto pontuar ou não é definido na configuração da barbearia (seção 4), não fixo no sistema.

### Comissão
9. A comissão é gerada **apenas** na finalização com status "Realizado".
10. A taxa aplicada é **congelada no momento da geração**, para que alterações futuras na configuração não reescrevam o passado.
11. A comissão **gerada** é uma provisão: ela ainda não saiu do caixa. Só o **pagamento** da comissão vira saída de caixa. Isso evita contar o mesmo dinheiro duas vezes.
12. Comissão de atendimento cancelado ou estornado é cancelada junto.

### Caixa
13. Só existe **um caixa aberto por vez, por barbearia**.
14. Lançamento automático **não pode ser editado** à mão; corrige-se estornando o atendimento de origem, o que preserva a trilha.
15. O fechamento registra a diferença entre o calculado e o conferido, sem apagá-la.

---

## 7. Modelo de dados

Modelo relacional, independente de tecnologia. O SQL abaixo serve de referência das tabelas, campos e regras, e será adaptado ao banco escolhido.

**Convenção de isolamento:** toda tabela que guarda dado operacional de uma barbearia tem a coluna `barbearia_id NOT NULL REFERENCES barbearias(id)`. Está destacada com comentário em cada tabela. Tabelas sem essa coluna (como `comissoes`, que referencia `barbeiros`) estão isoladas indiretamente, porque todo `barbeiro_id` já pertence a uma barbearia só.

### 7.1 Plataforma

```sql
CREATE TABLE barbearias (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  slug          VARCHAR(60) UNIQUE NOT NULL,   -- usado no link público: /b/<slug>
  telefone      VARCHAR(15) NOT NULL,          -- número de WhatsApp da barbearia
  plano         VARCHAR(20) NOT NULL DEFAULT 'BARBEARIA'
                CHECK (plano IN ('SOLO','BARBEARIA','PLUS')),
  status        VARCHAR(12) NOT NULL DEFAULT 'ATIVA'
                CHECK (status IN ('ATIVA','SUSPENSA','CANCELADA')),
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 7.2 Configurações por barbearia

```sql
CREATE TABLE configuracoes (
  barbearia_id              INT PRIMARY KEY REFERENCES barbearias(id),  -- 1 por barbearia

  meta_fidelidade_qtd       INT NOT NULL DEFAULT 10,   -- quantos atendimentos para a recompensa
  fidelidade_recompensa     VARCHAR(100) NOT NULL DEFAULT '1 corte grátis',
  produto_pontua_fidelidade BOOLEAN NOT NULL DEFAULT FALSE,

  duracao_padrao_min        INT NOT NULL DEFAULT 30,
  antecedencia_minima_horas INT NOT NULL DEFAULT 1,
  antecedencia_maxima_dias  INT NOT NULL DEFAULT 30,

  comissao_periodicidade    VARCHAR(10) NOT NULL DEFAULT 'QUINZENAL'
                            CHECK (comissao_periodicidade IN ('SEMANAL','QUINZENAL','MENSAL')),

  caixa_registra_taxa_cartao BOOLEAN NOT NULL DEFAULT FALSE,  -- FALSE = registra valor bruto

  mensagem_confirmacao      TEXT,   -- modelo da mensagem do cliente ao agendar
  mensagem_lembrete         TEXT,   -- modelo da mensagem do admin ao confirmar
  mensagem_aniversario      TEXT    -- modelo da mensagem de parabéns
);
```

> Esta tabela é o espelho direto da seção 4. Cada linha dela é preenchida pelo próprio administrador na tela de Configurações, nunca pelo código do sistema.

### 7.3 Usuários e equipe

```sql
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  barbearia_id  INT REFERENCES barbearias(id),  -- NULO para o super administrador
  nome          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,
  perfil        VARCHAR(20) NOT NULL
                CHECK (perfil IN ('SUPER_ADMIN','ADMIN','BARBEIRO')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),

  -- um e-mail pode existir em barbearias diferentes, mas não duas vezes na mesma
  UNIQUE (barbearia_id, email)
);

CREATE TABLE barbeiros (
  id            SERIAL PRIMARY KEY,
  barbearia_id  INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  usuario_id    INT REFERENCES usuarios(id),
  nome          VARCHAR(100) NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Comissão definida pelo administrador daquela barbearia, na tela de Configurações
  comissao_tipo         VARCHAR(10) NOT NULL DEFAULT 'PERCENTUAL'
                        CHECK (comissao_tipo IN ('PERCENTUAL','FIXO')),
  comissao_valor        NUMERIC(10,2) NOT NULL DEFAULT 0,  -- % se PERCENTUAL, R$ se FIXO
  comissao_produto_perc NUMERIC(5,2)  NOT NULL DEFAULT 0   -- % sobre produtos vendidos
);

CREATE TABLE horarios_trabalho (
  id            SERIAL PRIMARY KEY,
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),  -- isolado via barbeiro
  dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio   TIME NOT NULL,
  hora_fim      TIME NOT NULL
);
```

### 7.4 Clientes e serviços

```sql
CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  barbearia_id    INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  nome            VARCHAR(100) NOT NULL,
  telefone        VARCHAR(15) NOT NULL,   -- só dígitos, ex.: 5562999999999
  data_nascimento DATE,                    -- opcional: aniversariantes do mês
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),

  -- único DENTRO da barbearia, não globalmente
  UNIQUE (barbearia_id, telefone)
);

CREATE TABLE servicos (
  id            SERIAL PRIMARY KEY,
  barbearia_id  INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  nome          VARCHAR(100) NOT NULL,
  duracao_min   INT,              -- NULO = usa duracao_padrao_min da configuração
  preco         NUMERIC(10,2),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 7.5 Agendamentos

```sql
CREATE TABLE agendamentos (
  id             SERIAL PRIMARY KEY,
  barbearia_id   INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  cliente_id     INT NOT NULL REFERENCES clientes(id),
  barbeiro_id    INT NOT NULL REFERENCES barbeiros(id),
  servico_id     INT REFERENCES servicos(id),
  data_hora      TIMESTAMP NOT NULL,
  duracao_min    INT NOT NULL,
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

### 7.6 Fidelidade

```sql
CREATE TABLE fidelidade_pontos (
  id              SERIAL PRIMARY KEY,
  cliente_id      INT NOT NULL REFERENCES clientes(id),  -- isolado via cliente
  agendamento_id  INT REFERENCES agendamentos(id),        -- ponto de corte
  venda_id        INT,                                     -- ponto de produto (FK definida em 7.7)
  pontos          INT NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),

  CHECK (agendamento_id IS NOT NULL OR venda_id IS NOT NULL)
);

-- No máximo um lançamento de ponto por atendimento
CREATE UNIQUE INDEX uq_ponto_agendamento
  ON fidelidade_pontos (agendamento_id) WHERE agendamento_id IS NOT NULL;

CREATE TABLE fidelidade_resgates (
  id            SERIAL PRIMARY KEY,
  cliente_id    INT NOT NULL REFERENCES clientes(id),
  pontos_usados INT NOT NULL,
  resgatado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Saldo do cliente** = soma de `fidelidade_pontos.pontos` − soma de `fidelidade_resgates.pontos_usados`.

### 7.7 Produtos e vendas

```sql
CREATE TABLE produtos (
  id               SERIAL PRIMARY KEY,
  barbearia_id     INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  nome             VARCHAR(100) NOT NULL,
  preco_venda      NUMERIC(10,2) NOT NULL,
  preco_custo      NUMERIC(10,2),
  controla_estoque BOOLEAN NOT NULL DEFAULT FALSE,
  estoque_atual    INT NOT NULL DEFAULT 0,
  estoque_minimo   INT NOT NULL DEFAULT 0,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vendas (
  id              SERIAL PRIMARY KEY,
  barbearia_id    INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  cliente_id      INT REFERENCES clientes(id),      -- nulo em venda de balcão
  barbeiro_id     INT REFERENCES barbeiros(id),     -- quem vendeu, para a comissão
  agendamento_id  INT REFERENCES agendamentos(id),  -- nulo em venda avulsa
  data_hora       TIMESTAMP NOT NULL DEFAULT NOW(),
  total           NUMERIC(10,2) NOT NULL,
  forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO'))
);

ALTER TABLE fidelidade_pontos
  ADD CONSTRAINT fk_ponto_venda FOREIGN KEY (venda_id) REFERENCES vendas(id);

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
  produto_id  INT NOT NULL REFERENCES produtos(id),  -- isolado via produto
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA','AJUSTE')),
  quantidade  INT NOT NULL,
  venda_id    INT REFERENCES vendas(id),
  observacao  VARCHAR(200),
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 7.8 Comissões

```sql
CREATE TABLE comissao_pagamentos (
  id            SERIAL PRIMARY KEY,
  barbeiro_id   INT NOT NULL REFERENCES barbeiros(id),  -- isolado via barbeiro
  periodo_ini   DATE NOT NULL,
  periodo_fim   DATE NOT NULL,
  valor_total   NUMERIC(10,2) NOT NULL,
  pago_em       TIMESTAMP NOT NULL DEFAULT NOW(),
  usuario_id    INT REFERENCES usuarios(id)
);

CREATE TABLE comissoes (
  id             SERIAL PRIMARY KEY,
  barbeiro_id    INT NOT NULL REFERENCES barbeiros(id),  -- isolado via barbeiro
  agendamento_id INT REFERENCES agendamentos(id),  -- comissão de serviço
  venda_id       INT REFERENCES vendas(id),        -- comissão de produto
  origem         VARCHAR(10) NOT NULL CHECK (origem IN ('SERVICO','PRODUTO')),

  -- Taxa congelada: mudar a configuração do barbeiro não reescreve o passado
  base_calculo   NUMERIC(10,2) NOT NULL,
  tipo_aplicado  VARCHAR(10)   NOT NULL CHECK (tipo_aplicado IN ('PERCENTUAL','FIXO')),
  taxa_aplicada  NUMERIC(10,2) NOT NULL,
  valor          NUMERIC(10,2) NOT NULL,

  pagamento_id   INT REFERENCES comissao_pagamentos(id),  -- nulo = ainda não paga
  criado_em      TIMESTAMP NOT NULL DEFAULT NOW(),

  CHECK (agendamento_id IS NOT NULL OR venda_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_comissao_agendamento
  ON comissoes (agendamento_id) WHERE agendamento_id IS NOT NULL;
```

**Comissão a pagar** de um barbeiro = soma de `comissoes.valor` com `pagamento_id IS NULL`.

### 7.9 Caixa e custos

```sql
CREATE TABLE caixas (
  id                     SERIAL PRIMARY KEY,
  barbearia_id           INT NOT NULL REFERENCES barbearias(id),  -- isolamento
  aberto_em              TIMESTAMP NOT NULL DEFAULT NOW(),
  valor_inicial          NUMERIC(10,2) NOT NULL DEFAULT 0,
  fechado_em             TIMESTAMP,
  valor_final_conferido  NUMERIC(10,2),
  valor_final_calculado  NUMERIC(10,2),
  diferenca              NUMERIC(10,2),
  status                 VARCHAR(10) NOT NULL DEFAULT 'ABERTO'
                         CHECK (status IN ('ABERTO','FECHADO')),
  usuario_abertura_id    INT REFERENCES usuarios(id),
  usuario_fechamento_id  INT REFERENCES usuarios(id)
);

-- Garante um único caixa aberto por vez, POR BARBEARIA
CREATE UNIQUE INDEX uq_caixa_aberto
  ON caixas (barbearia_id) WHERE status = 'ABERTO';

CREATE TABLE categorias_custo (
  id            SERIAL PRIMARY KEY,
  barbearia_id  INT NOT NULL REFERENCES barbearias(id),  -- isolamento: cada uma define as suas
  nome          VARCHAR(60) NOT NULL,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('FIXO','VARIAVEL'))
);

CREATE TABLE custos (
  id              SERIAL PRIMARY KEY,
  categoria_id    INT NOT NULL REFERENCES categorias_custo(id),  -- isolado via categoria
  descricao       VARCHAR(200) NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  vencimento      DATE NOT NULL,
  pago            BOOLEAN NOT NULL DEFAULT FALSE,
  pago_em         DATE,
  recorrente      BOOLEAN NOT NULL DEFAULT FALSE,
  dia_recorrencia SMALLINT CHECK (dia_recorrencia BETWEEN 1 AND 31),
  origem_id       INT REFERENCES custos(id),
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lancamentos (
  id              SERIAL PRIMARY KEY,
  caixa_id        INT NOT NULL REFERENCES caixas(id),  -- isolado via caixa
  tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  descricao       VARCHAR(200) NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  forma_pagamento VARCHAR(10) CHECK (forma_pagamento IN ('DINHEIRO','PIX','DEBITO','CREDITO')),
  origem          VARCHAR(12) NOT NULL DEFAULT 'MANUAL'
                  CHECK (origem IN ('AUTOMATICO','MANUAL')),

  agendamento_id        INT REFERENCES agendamentos(id),
  venda_id              INT REFERENCES vendas(id),
  custo_id              INT REFERENCES custos(id),
  comissao_pagamento_id INT REFERENCES comissao_pagamentos(id),

  usuario_id      INT REFERENCES usuarios(id),
  criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Saldo do caixa** = `valor_inicial` + entradas − saídas do caixa aberto daquela barbearia.

> Observação contábil: a **comissão gerada** não entra como saída no caixa. Só entra quando é **paga**, via `comissao_pagamentos`. Lançar as duas coisas contaria o mesmo dinheiro duas vezes.

---

## 8. Telas

### Cliente (público, em `/b/<slug-da-barbearia>`)
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

### Administrador da barbearia
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
11. **Configurações**: a tela da seção 4 — meta de fidelidade, duração padrão, antecedência, periodicidade de comissão, textos do WhatsApp.
12. **Relatórios**: faturamento por período e por barbeiro, serviços e produtos mais vendidos.

### Super administrador (você, dono da Karbo System)
1. **Login.**
2. **Barbearias**: lista com status e plano de cada uma.
3. **Nova barbearia**: nome, slug do link público, telefone de contato e plano.
4. **Ativar, suspender ou cancelar** uma barbearia.

---

## 9. Integração com WhatsApp

Na v1 a integração usa **links `wa.me`**, sem API paga e sem aprovação da Meta:

- **Cliente → barbearia:** `https://wa.me/<NUMERO_DA_BARBEARIA>?text=<mensagem codificada>`
- **Admin → cliente:** `https://wa.me/<TELEFONE_CLIENTE>?text=<mensagem codificada>`

O **texto** de cada mensagem é configurável por barbearia (seção 4, campos `mensagem_confirmacao`, `mensagem_lembrete`, `mensagem_aniversario`). Os exemplos abaixo são os textos padrão sugeridos, usados quando a barbearia ainda não personalizou os seus:

> **Cliente agendando:** Olá! Gostaria de confirmar meu agendamento: dia 05/11 às 14:00 com o barbeiro Carlos.

> **Admin confirmando:** Olá, João! Passando para confirmar seu horário amanhã (05/11) às 14:00 com o Carlos. Pode confirmar?

> **Aniversário:** Olá, João! A equipe da barbearia deseja um feliz aniversário. Passa aqui para comemorar com um corte!

**Limitação:** com `wa.me` o envio é sempre manual — alguém precisa tocar em "enviar" —, e o sistema não sabe se a mensagem foi enviada nem se houve resposta. A evolução futura é a **WhatsApp Business API**, que é paga e exige aprovação, e precisaria de um número por barbearia.

---

## 10. Requisitos não funcionais

- **Isolamento entre barbearias.** Nenhuma consulta pode devolver dado de mais de uma barbearia, exceto o painel do super administrador, que não acessa dado operacional (ver regra 1 da seção 6). Essa checagem deve fazer parte de todo código de acesso a dado, não só uma convenção de nomenclatura.
- **Responsivo e mobile-first.** O cliente usa o celular, e o barbeiro também.
- **Segurança.** Senhas com hash (bcrypt ou argon2), HTTPS e rotas protegidas. As permissões da seção 3.1 são validadas **no servidor**: esconder um botão no JavaScript não protege nada, porque qualquer pessoa abre o código da página no navegador.
- **Integridade financeira.** A finalização do atendimento grava fidelidade, caixa, comissão e estoque **em uma única transação**: ou tudo é gravado, ou nada é.
- **Trilha de auditoria.** Lançamento automático não se edita; corrige-se por estorno, que fica registrado.
- **LGPD.** Coletar apenas nome, telefone e, se o cliente quiser, data de nascimento, com aviso de uso dos dados. Dado de uma barbearia nunca é compartilhado com outra.
- **Concorrência.** Índice único e transação para impedir agendamento duplicado.
- **Fuso horário:** America/Sao_Paulo.
- **Backup diário** do banco, obrigatório a partir do momento em que houver dado financeiro.

---

## 11. Stack e padrões de desenvolvimento

### 11.1 Tecnologias

| Camada | Definição |
|---|---|
| Frontend | **HTML, CSS e JavaScript**, sem frameworks |
| Banco de dados | **A definir** — pré-requisito a partir da fase 5 (ver 11.4) |
| Identidade visual | Paleta e logos da Karbo System (ver 11.5) |

### 11.2 Padrões de código

- **Arquivos separados** por responsabilidade: HTML só estrutura, CSS só estilo, JS só comportamento. Nada de CSS ou JS embutido no HTML.
- **Todo código comentado:** cada função leva um comentário dizendo o que faz dentro do sistema.
- Nomenclatura em português, consistente em todo o projeto.
- **Toda função que lê ou grava dado sabe de qual barbearia está tratando.** Nenhuma função da camada de dados pode ser chamada sem o `barbearia_id` (ou um identificador de sessão do qual ele derive).

### 11.3 Estrutura de pastas

```
karbosystem-barbearia/
├── docs/
│   ├── DOCUMENTACAO.md
│   ├── ANALISE-APPBARBER.md
│   └── analise-preco-karbo-barber.md
├── index.html                      # Entrada: redireciona para o agendamento
├── cliente/
│   └── agendar.html                 # Lê o slug da barbearia pela URL
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
│   ├── configuracoes.html          # Tela da seção 4
│   ├── relatorios.html
│   └── cadastros.html
├── barbeiro/
│   ├── minha-agenda.html
│   ├── finalizar.html
│   └── minhas-comissoes.html
├── super-admin/
│   ├── login.html
│   ├── barbearias.html
│   └── nova-barbearia.html
├── css/
│   ├── base.css                    # Variáveis da paleta, reset e tipografia
│   ├── componentes.css             # Botões, cards, formulários, tabelas, calendário
│   ├── cliente.css
│   ├── admin.css
│   └── barbeiro.css
├── js/
│   ├── config.js                   # Constantes técnicas (não confundir com dados de configuracoes)
│   ├── dados.js                    # Camada de dados: único arquivo que fala com o banco
│   ├── auth.js                     # Login, sessão e barbearia_id atual
│   ├── agenda.js                   # Horários livres e conflitos
│   ├── whatsapp.js                 # Montagem dos links wa.me, com o texto configurado
│   ├── fidelidade.js               # Pontos, saldo e resgates
│   ├── caixa.js                    # Abertura, lançamentos e fechamento
│   ├── custos.js                   # Custos e recorrência
│   ├── produtos.js                 # Produtos, vendas e estoque
│   ├── comissao.js                 # Cálculo, acúmulo e pagamento
│   ├── finalizacao.js              # Orquestra os quatro efeitos da finalização
│   ├── configuracoes.js            # Leitura e gravação da tabela configuracoes
│   ├── utils.js                    # Datas, telefone, moeda
│   ├── cliente.js
│   ├── admin.js
│   ├── barbeiro.js
│   └── super-admin.js
└── assets/
    ├── img/
    └── fonts/
```

### 11.4 Banco de dados: pré-requisito a partir da fase 5

Os módulos financeiros e o isolamento entre barbearias exigem um banco compartilhado com permissão validada no servidor — os motivos estão detalhados na análise de mercado. Em resumo:

1. **Dinheiro.** `localStorage` vive no navegador de cada pessoa: some ao limpar o cache, não tem backup e não é auditável.
2. **Várias pessoas e várias barbearias ao mesmo tempo.** O barbeiro finaliza no celular, o admin lança um custo no computador, o cliente agenda pelo link — de potencialmente dezenas de barbearias diferentes, todas usando o mesmo sistema.
3. **Permissão e isolamento.** O barbeiro não pode ver o faturamento, e uma barbearia não pode ver a outra. Isso só se garante no servidor.

A restrição de HTML, CSS e JS puros **continua valendo**: ela é da interface, e não impede um banco na nuvem.

**Recomendação: Supabase.** É PostgreSQL — o modelo da seção 7 roda praticamente como está —, tem login pronto e suporta **isolamento por linha** (Row Level Security), que é exatamente o mecanismo para impedir uma barbearia de ler dado de outra mesmo que haja uma falha na tela. Tem plano gratuito para começar, e o front continua em JavaScript puro chamando por `fetch`. Alternativas: Firebase, que não é SQL e exigiria repensar o modelo, ou backend próprio em Node ou PHP, que dá mais controle e mais trabalho.

Em qualquer caso, **a troca fica isolada no `js/dados.js`**. Até a fase 5, esse arquivo pode servir dados de teste de uma ou duas barbearias fictícias, para já validar que o isolamento funciona antes de existir um banco de verdade.

### 11.5 Identidade visual

Paleta extraída dos arquivos oficiais da marca:

| Papel | Cor |
|---|---|
| Preto (fundo) | `#0A0A0A` |
| Verde principal | `#00D26A` |
| Verde claro (detalhe) | `#B6FFD3` |

Cinzas de apoio e cores de estado (erro, aviso, sucesso) serão derivados dessas três e definidos no `base.css`.

---

## 12. Roadmap

| Fase | Entrega | Exige banco real? |
|---|---|---|
| **1** | Estrutura de pastas, `base.css` com a paleta, camada de dados provisória **já simulando duas barbearias fictícias isoladas**, cadastros (barbeiros com comissão, serviços, horários, clientes) | Não |
| **2** | Agendamento pelo cliente via link `/b/<slug>` + WhatsApp | Não |
| **3** | Painel do admin: próximos 3 dias, agenda mensal, inclusão e exclusão manual, tela de Configurações | Não |
| **4** | Painel do barbeiro: agenda própria, agendamento manual, finalização do atendimento | Não |
| **5** | **Banco de dados definitivo + login, permissões e isolamento entre barbearias reais** | — |
| **6** | Painel do super administrador: cadastro e ativação de barbearias | Sim |
| **7** | Fidelidade automática, conforme a configuração de cada barbearia | Sim |
| **8** | Caixa: abertura, fechamento, entradas automáticas e manuais | Sim |
| **9** | Comissão: geração automática, consulta e pagamento | Sim |
| **10** | Custos: categorias, recorrência e resultado do período | Sim |
| **11** | Produtos: cadastro, venda e estoque opcional | Sim |
| **12** | Aniversariantes e relatórios gerenciais | Sim |

As fases 1 a 4 entregam um sistema de agendamento que já funciona e já tem valor, construído desde o início para várias barbearias, e permitem colocar algo no ar cedo. A gestão financeira e o cadastro comercial vêm depois da fase 5.

---

## 13. Questões em aberto

As regras de negócio que variam de barbearia para barbearia (comissão, meta de fidelidade, duração do atendimento, se produto pontua, periodicidade de pagamento) **deixaram de ser perguntas para nós** — são campos de configuração que cada administrador preenche dentro do próprio sistema (seção 4). O que resta em aberto é o que precisa de uma decisão nossa, de produto ou de arquitetura:

1. **Planos e limites:** o plano "Solo" (1 barbeiro) e "Plus" (6+ barbeiros) têm alguma diferença de funcionalidade, ou só de preço e quantidade de barbeiros? A análise de preço sugere só quantidade.
2. **Slug da barbearia:** quem escolhe o texto do link (`/b/<slug>`) — você, no cadastro, ou o próprio dono da barbearia pode sugerir?
3. **Suspensão por falta de pagamento:** o que o administrador e os clientes daquela barbearia veem quando ela é suspensa? Sugestão: o link público para de funcionar, mas os dados continuam guardados.
4. **Taxa de cartão:** registramos o valor bruto por padrão (já está assim na configuração), com a opção de calcular líquido por barbearia que quiser. Confirmar se isso é suficiente para a v1.
5. Quantos barbeiros, em média, as primeiras barbearias clientes têm? Isso ajuda a priorizar se o Plano Solo (1 barbeiro) merece uma tela simplificada.
6. Como tratar o cliente que agenda no link e **não envia** a mensagem no WhatsApp? O horário já fica reservado. Sugestão: o admin cancela, ou o agendamento expira sozinho depois de um tempo configurável.
7. O cliente poderá cancelar ou remarcar sozinho, ou apenas pelo WhatsApp?
