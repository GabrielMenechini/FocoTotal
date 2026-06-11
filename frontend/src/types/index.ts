export interface UsuarioAuth {
  id: number;
  nome: string;
  cargo: 'admin' | 'vendedor' | 'estoquista';
}

export interface Produto {
  id?: number;
  codigo: string;
  nome: string;
  descricao?: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  quantidade_estoque: number;
  estoque_minimo: number;
  ativo?: boolean;
}

export interface Cliente {
  id?: number;
  nome: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
}

export interface ItemVenda {
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario?: number;
  subtotal?: number;
}

export interface Venda {
  id?: number;
  cliente_id?: number;
  cliente_nome?: string;
  usuario_nome?: string;
  valor_total?: number;
  desconto?: number;
  valor_final?: number;
  status?: 'pendente' | 'concluida' | 'cancelada';
  observacoes?: string;
  criado_em?: string;
  itens?: ItemVenda[];
}

export interface MovimentacaoEstoque {
  id?: number;
  produto_id?: number;
  produto_nome?: string;
  produto_codigo?: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  usuario_nome?: string;
  criado_em?: string;
}

export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  cargo: 'admin' | 'vendedor' | 'estoquista';
  ativo?: boolean;
  criado_em?: string;
}

export interface DashboardData {
  vendasHoje: { total: number; valor: number };
  totalProdutos: number;
  totalClientes: number;
  estoqueBaixo: number;
  ultimasVendas: Venda[];
}
