# FocoTotal – Sistema de Gestão para Ótica
## TCC – Guia Completo de Instalação, Execução e Apresentação

---

## ESTRUTURA DO PROJETO

```
FocoTotalTCC/
├── backend/            ← API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/    ← Lógica de cada módulo
│   │   ├── routes/         ← Definição das rotas HTTP
│   │   ├── middlewares/    ← Autenticação JWT + Error Handler
│   │   ├── utils/          ← logger.ts (com lock) + validators.ts
│   │   ├── types/          ← Interfaces TypeScript
│   │   ├── database.ts     ← Pool de conexões MySQL
│   │   └── server.ts       ← Ponto de entrada da API
│   └── tests/              ← Testes unitários e de integração
├── frontend/           ← React + TypeScript + Vite
│   └── src/
│       ├── pages/      ← Login, Dashboard, Produtos, Clientes...
│       ├── components/ ← Layout, Sidebar
│       ├── contexts/   ← AuthContext (estado global de autenticação)
│       ├── services/   ← api.ts (Axios com interceptors)
│       └── utils/      ← masks.ts + validators.ts
└── database/
    └── focototal.sql   ← Script completo do banco MySQL
```

---

## PASSO 1 – BANCO DE DADOS (MySQL / DBeaver)

1. Abra o **DBeaver** e conecte ao seu servidor MySQL
2. Clique com o botão direito → **SQL Editor** → **New SQL Script**
3. Cole o conteúdo de `database/focototal.sql` e execute (F5)
4. O banco `focototal` será criado com tabelas e dados de exemplo

**Usuários padrão de teste:**
- Admin:      admin@focototal.com  / senha: `password`
- Vendedor:   maria@focototal.com  / senha: `password`
- Estoquista: joao@focototal.com   / senha: `password`

> **IMPORTANTE:** Para gerar senhas reais, execute no terminal:
> ```
> node -e "const b=require('bcryptjs');b.hash('suaSenha',10).then(h=>console.log(h))"
> ```

---

## PASSO 2 – CONFIGURAR O BACKEND

```bash
# Entrar na pasta do backend
cd backend

# Instalar dependências
npm install

# Criar arquivo de configuração
copy .env.example .env
```

Abra o arquivo `.env` e configure:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=focototal
JWT_SECRET=focototal_tcc_2024
PORT=3001
```

```bash
# Iniciar o servidor em modo desenvolvimento
npm run dev
```

O backend estará em: http://localhost:3001
Teste abrindo: http://localhost:3001/health

---

## PASSO 3 – CONFIGURAR O FRONTEND

```bash
# Em outro terminal, entrar na pasta do frontend
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O frontend estará em: http://localhost:5173

---

## PASSO 4 – EXECUTAR OS TESTES

```bash
cd backend

# Executar todos os testes
npm test

# Com relatório de cobertura
npm run test:coverage
```

**Resultado esperado:**
- `tests/validators.test.ts` → 14 testes unitários ✓
- `tests/produtos.test.ts`   → 9 testes de integração ✓

---

## PRINCÍPIOS SOLID IMPLEMENTADOS

### 1. SRP – Single Responsibility Principle (Responsabilidade Única)

**Onde está:** `backend/src/utils/validators.ts` e `backend/src/utils/logger.ts`

**Como explicar na banca:**
> "Cada classe tem UMA responsabilidade. O `ValidatorService` só valida dados.
> O `Logger` só registra logs. Nenhum controller valida CPF nem escreve em arquivo —
> eles delegam essas responsabilidades para as classes especializadas."

**Prova no código:**
- `ValidatorService` → só tem métodos de validação (CPF, CNPJ, email, campo obrigatório)
- `Logger` → só tem métodos de escrita de log (info, erro, aviso)
- Os controllers chamam essas classes mas não duplicam essa lógica

### 2. OCP – Open/Closed Principle (Aberto para extensão, fechado para modificação)

**Onde está:** `backend/src/utils/validators.ts`

**Como explicar na banca:**
> "O `ValidatorService` é aberto para extensão — posso adicionar um método
> `validarTelefone()` sem modificar nenhum método existente. Os controllers
> que já usam `validarCPF()` continuam funcionando sem nenhuma alteração."

**Exemplo prático:** Para adicionar validação de placa de veículo, basta adicionar
`static validarPlaca(placa: string)` sem tocar nos métodos existentes.

---

## LOCK NO LOGGER (Rubrica: Logs com Lock)

**Onde está:** `backend/src/utils/logger.ts`

**Como funciona:**
```
Requisição 1 → acquireLock() → locked=true → escreve → releaseLock()
Requisição 2 → acquireLock() → locked=true → vai para fila → espera
Requisição 3 → acquireLock() → locked=true → vai para fila → espera
              ← após release → fila processa em ordem
```

**Como explicar na banca:**
> "Quando múltiplas requisições chegam ao mesmo tempo, o sistema usa um lock
> (mutex) para garantir que apenas uma operação de escrita aconteça por vez.
> As demais ficam em fila. Isso evita que logs se misturem e garante
> consistência dos arquivos de log."

**Os logs ficam em:** `backend/logs/focototal-YYYY-MM-DD.log`

---

## VALIDAÇÕES IMPLEMENTADAS

| Campo    | Frontend (masks.ts)     | Backend (validators.ts)     |
|----------|-------------------------|-----------------------------|
| CPF      | Máscara 000.000.000-00  | Validação dígitos verificadores |
| CNPJ     | Máscara 00.000.000/0000-00 | Validação dígitos verificadores |
| Email    | Campo HTML type="email" | Regex de validação          |
| Telefone | Máscara (00) 00000-0000 | Campo obrigatório           |
| CEP      | Máscara 00000-000       | —                           |
| Campos   | Verificação no submit   | `campoObrigatorio()` na API |

---

## DIAGRAMA DER (Entidade-Relacionamento)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│  usuarios   │       │   clientes  │       │    produtos     │
│─────────────│       │─────────────│       │─────────────────│
│ PK id       │       │ PK id       │       │ PK id           │
│ nome        │       │ nome        │       │ codigo (UNIQUE) │
│ email       │       │ cpf         │       │ nome            │
│ senha       │       │ cnpj        │       │ categoria       │
│ cargo       │       │ email       │       │ preco_custo     │
│ ativo       │       │ telefone    │       │ preco_venda     │
└──────┬──────┘       └──────┬──────┘       │ qtd_estoque     │
       │                     │              │ estoque_minimo  │
       │         ┌───────────┘              └────────┬────────┘
       │         │                                   │
       └────┬────┘                    ┌──────────────┤
            │                         │              │
      ┌─────▼──────┐          ┌───────▼──────┐ ┌────▼────────────────┐
      │   vendas   │          │  itens_venda │ │ movimentacoes_estoque│
      │────────────│◄──────── │──────────────│ │─────────────────────│
      │ PK id      │ 1      N │ PK id        │ │ PK id               │
      │ FK cliente │          │ FK venda_id  │ │ FK produto_id       │
      │ FK usuario │          │ FK produto_id│ │ tipo (entrada/saída)│
      │ valor_total│          │ quantidade   │ │ quantidade          │
      │ desconto   │          │ preco_unit.  │ │ motivo              │
      │ valor_final│          │ subtotal     │ │ FK usuario_id       │
      │ status     │          └──────────────┘ └─────────────────────┘
      └────────────┘
```

---

## SEGURANÇA IMPLEMENTADA

1. **Senhas criptografadas** com bcrypt (custo 10)
2. **Autenticação JWT** com expiração de 8 horas
3. **Controle de acesso por cargo** (admin/vendedor/estoquista)
4. **Soft delete** – registros nunca são deletados fisicamente
5. **Transações MySQL** nas vendas (rollback em caso de erro)
6. **CORS configurado** – apenas o frontend autorizado acessa a API
7. **Validação dupla** – frontend + backend

---

## ROTEIRO DE APRESENTAÇÃO PARA A BANCA

### 1. Introdução (2 min)
> "O FocoTotal é um sistema de gestão para óticas que controla produtos,
> estoque, clientes e vendas. Desenvolvido em TypeScript tanto no backend
> quanto no frontend, com banco MySQL."

### 2. Demonstração do sistema (8 min)
1. Faça login com admin@focototal.com
2. Mostre o Dashboard com os cards de resumo
3. Cadastre um novo produto (com validações visíveis)
4. Registre uma movimentação de estoque (entrada)
5. Registre uma venda (mostre o estoque diminuindo)
6. Abra os Relatórios → Margem de Lucro
7. Mostre o alerta de estoque baixo

### 3. Arquitetura técnica (3 min)
- Mostre a estrutura de pastas
- Explique: "Frontend React se comunica com o backend Express via API REST"
- Mostre uma rota e seu controller correspondente

### 4. Rubrica técnica (5 min)
- **Testes:** `npm test` → mostre os 23 testes passando
- **SOLID SRP:** Abra `validators.ts` e `logger.ts` — responsabilidade única
- **SOLID OCP:** Mostre que novos validadores são adicionados sem modificar os existentes
- **Lock:** Abra `logger.ts` e explique o mutex (acquireLock/releaseLock)
- **Validações:** Tente criar um cliente com CPF inválido — veja o erro
- **Máscaras:** Mostre o campo CPF sendo preenchido com máscara automática

---

## PERGUNTAS FREQUENTES DA BANCA

**P: Por que TypeScript e não JavaScript?**
R: TypeScript adiciona tipagem estática, detectando erros em tempo de desenvolvimento.
   Interfaces definem contratos claros entre módulos, tornando o código mais seguro e documentado.

**P: O que é JWT?**
R: JSON Web Token. É um token assinado digitalmente que comprova a identidade do usuário.
   Após o login, o frontend envia esse token em toda requisição. O backend valida a assinatura
   e extrai o cargo do usuário para controle de acesso.

**P: Como funciona a transação MySQL na venda?**
R: Inicio uma transação, processo todos os itens (verifico estoque, subtraio), crio a venda e
   os itens. Se qualquer etapa falhar (ex: estoque insuficiente), faço ROLLBACK e nenhuma
   alteração fica no banco. Isso garante consistência dos dados.

**P: O que é Soft Delete?**
R: Em vez de DELETE, faço UPDATE ativo=0. O registro fica no banco (preserva histórico de
   vendas) mas não aparece nas listagens. Isso é importante para auditoria.
