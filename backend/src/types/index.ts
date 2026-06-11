export interface Usuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  cargo: 'admin' | 'vendedor' | 'estoquista';
  ativo: boolean;
  criado_em?: Date;
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
  ativo: boolean;
  criado_em?: Date;
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
  ativo: boolean;
  criado_em?: Date;
}

export interface Venda {
  id?: number;
  cliente_id?: number;
  usuario_id: number;
  valor_total: number;
  desconto: number;
  valor_final: number;
  status: 'pendente' | 'concluida' | 'cancelada';
  observacoes?: string;
  criado_em?: Date;
  itens?: ItemVenda[];
}

export interface ItemVenda {
  id?: number;
  venda_id?: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface MovimentacaoEstoque {
  id?: number;
  produto_id: number;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  usuario_id: number;
  criado_em?: Date;
}

export interface JwtPayload {
  id: number;
  nome: string;
  cargo: string;
}
