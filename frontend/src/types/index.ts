// ── Autenticação ──────────────────────────────────────────────────
export interface UsuarioAuth {
  id:    number;
  nome:  string;
  cargo: 'admin';           // único perfil aceito no sistema
}

// ── Produto ───────────────────────────────────────────────────────
export interface Produto {
  id?:                 number;
  codigo:              string;
  nome:                string;
  descricao?:          string;
  categoria:           string;
  preco_custo:         number;
  preco_venda:         number;
  quantidade_estoque:  number;
  estoque_minimo:      number;
  ativo?:              boolean;
}

// ── Cliente ───────────────────────────────────────────────────────
export interface Cliente {
  id?:       number;
  nome:      string;
  cpf?:      string;
  cnpj?:     string;
  email?:    string;
  telefone:  string;
  cep?:      string;
  endereco?: string;
  cidade?:   string;
  estado?:   string;
}

// ── Formas de pagamento (padrão interno) ─────────────────────────
export type FormaPagamento =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'
  | 'CHEQUE';

export const FORMA_LABELS: Record<string, string> = {
  DINHEIRO:      'Dinheiro',
  PIX:           'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO:  'Cartão de Débito',
  BOLETO:        'Boleto',
  CHEQUE:        'Cheque',
};

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  'DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'CHEQUE',
];

// ── Item de Venda ─────────────────────────────────────────────────
export interface ItemVenda {
  produto_id:      number;
  produto_nome?:   string;
  produto_codigo?: string;
  quantidade:      number;
  preco_unitario?: number;
  subtotal?:       number;
}

// ── Venda (para formulário e base) ───────────────────────────────
export interface Venda {
  id?:                   number;
  cliente_id?:           number;
  cliente_nome?:         string;
  usuario_nome?:         string;
  valor_total?:          number;
  desconto?:             number;
  valor_final?:          number;
  forma_pagamento?:      FormaPagamento | string;
  parcelas?:             number;
  status?:               'pendente' | 'concluida' | 'cancelada';
  observacoes?:          string;
  motivo_cancelamento?:  string;
  criado_em?:            string;
  itens?:                ItemVenda[];
}

// ── VendaLista (linha na tabela de listagem) ──────────────────────
export interface VendaLista {
  id:               number;
  cliente_nome:     string | null;
  usuario_nome:     string;
  valor_total:      number;
  desconto:         number;
  valor_final:      number;
  forma_pagamento:  string;
  parcelas:         number;
  status:           'pendente' | 'concluida' | 'cancelada';
  criado_em:        string;
}

// ── VendaDetalhe (visão completa com itens) ───────────────────────
export interface ItemVendaDetalhe {
  produto_id:      number;
  produto_nome:    string;
  produto_codigo:  string;
  quantidade:      number;
  preco_unitario:  number;
  subtotal:        number;
}

export interface VendaDetalhe extends VendaLista {
  cliente_id?:          number;
  observacoes?:         string;
  motivo_cancelamento?: string;
  itens:                ItemVendaDetalhe[];
}

// ── Movimentação de Estoque ───────────────────────────────────────
export interface MovimentacaoEstoque {
  id?:              number;
  produto_id?:      number;
  produto_nome?:    string;
  produto_codigo?:  string;
  tipo:             'entrada' | 'saida';
  quantidade:       number;
  motivo:           string;
  usuario_nome?:    string;
  criado_em?:       string;
}

// ── Usuário ───────────────────────────────────────────────────────
export interface Usuario {
  id?:        number;
  nome:       string;
  email:      string;
  cargo:      'admin';
  ativo?:     boolean;
  criado_em?: string;
}

// ── Dashboard clássico ────────────────────────────────────────────
export interface DashboardData {
  vendasHoje:    { total: number; valor: number };
  totalProdutos: number;
  totalClientes: number;
  estoqueBaixo:  number;
  ultimasVendas: Venda[];
}

// ── Dashboard BI estendido ────────────────────────────────────────
export interface DashboardBiData {
  vendasHoje:    { total: number; valor: number };
  totalProdutos: number;
  totalClientes: number;
  estoqueBaixo:  number;
  ultimasVendas: Venda[];
  ticketMedio:   number;
  lucroHoje: {
    receita:    number;
    custo:      number;
    lucro:      number;
    margem_pct: number;
  };
  topProdutos: Array<{
    nome:          string;
    codigo:        string;
    total_vendido: number;
    total_valor:   number;
  }>;
  vendasSemana: Array<{
    data:  string;
    qtd:   number;
    total: number;
  }>;
  categorias: Array<{
    categoria: string;
    total:     number;
  }>;
}

// ── BI Inteligente – Insights ─────────────────────────────────────
export type BiInsightTipo =
  | 'reposicao'
  | 'estoque_zerado'
  | 'produto_parado'
  | 'crescimento'
  | 'sazonalidade'
  | 'combo'
  | 'queda';

export type BiInsightPrioridade = 'alta' | 'media' | 'baixa';
export type BiInsightTag = 'Estoque' | 'Vendas' | 'Sazonalidade' | 'Promoção';

export interface BiInsight {
  id:          string;
  tipo:        BiInsightTipo;
  titulo:      string;
  mensagem:    string;
  prioridade:  BiInsightPrioridade;
  tag:         BiInsightTag;
  produto?:    string;
  categoria?:  string;
  dados?:      Record<string, string | number>;
}

// ── Caixa – Resumo Diário ─────────────────────────────────────────
export interface CaixaData {
  resumoHoje: {
    qtd_vendas:    number;
    total_vendido: number;
    ticket_medio:  number;
  };
  lucro: {
    receita:           number;
    custo:             number;
    lucro_estimado:    number;
    margem_percentual: number;
  };
  produtosMaisVendidos: Array<{
    nome:      string;
    categoria: string;
    qtd:       number;
    total:     number;
  }>;
  formasPagamento: Array<{
    forma_pagamento: string;
    qtd:             number;
    total:           number;
  }>;
  vendasPorHora: Array<{
    hora:  number;
    qtd:   number;
    total: number;
  }>;
  ultimasVendas: Array<{
    id:              number;
    cliente_nome:    string | null;
    vendedor_nome:   string;
    valor_final:     number;
    desconto:        number;
    forma_pagamento: string;
    parcelas:        number;
    criado_em:       string;
  }>;
  estoqueBaixo: Array<{
    nome:               string;
    codigo:             string;
    quantidade_estoque: number;
    estoque_minimo:     number;
  }>;
  comparacaoOntem: {
    qtd_vendas:    number;
    total_vendido: number;
  };
  despesasHoje: {
    total_despesas: number;
    qtd_despesas:   number;
  };
  ultimasDespesas: Array<{
    id:           number;
    tipo:         string;
    categoria:    string;
    descricao:    string | null;
    fornecedor:   string | null;
    valor_total:  number;
    criado_em:    string;
    usuario_nome: string;
  }>;
  despesasPorCategoria: Array<{
    categoria: string;
    total:     number;
    qtd:       number;
  }>;
  gastosReabastecimento: {
    total_gasto:   number;
    qtd_entradas:  number;
  };
  produtosReabastecidos: Array<{
    nome:           string;
    codigo:         string;
    categoria:      string;
    qtd_adicionada: number;
    preco_custo:    number;
    total_gasto:    number;
  }>;
}
