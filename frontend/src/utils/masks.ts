export const masks = {
  cpf: (v: string): string => {
    const n = v.replace(/\D/g, '').slice(0, 11);
    return n
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  cnpj: (v: string): string => {
    const n = v.replace(/\D/g, '').slice(0, 14);
    return n
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  },

  telefone: (v: string): string => {
    const n = v.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 10)
      return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  },

  cep: (v: string): string => {
    const n = v.replace(/\D/g, '').slice(0, 8);
    return n.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  },

  moeda: (v: number): string =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),

  data: (v: string): string => {
    const n = v.replace(/\D/g, '').slice(0, 8);
    return n
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2');
  },

  dataHora: (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR');
  },
};
