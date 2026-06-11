export const validators = {
  cpf: (cpf: string): boolean => {
    const n = cpf.replace(/\D/g, '');
    if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i);
    let r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    if (r !== parseInt(n[9])) return false;
    s = 0;
    for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i);
    r = (s * 10) % 11;
    if (r === 10 || r === 11) r = 0;
    return r === parseInt(n[10]);
  },

  cnpj: (cnpj: string): boolean => {
    const n = cnpj.replace(/\D/g, '');
    if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;
    const calc = (base: string, pesos: number[]) => {
      let s = 0;
      for (let i = 0; i < pesos.length; i++) s += parseInt(base[i]) * pesos[i];
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    if (calc(n, [5,4,3,2,9,8,7,6,5,4,3,2]) !== parseInt(n[12])) return false;
    if (calc(n, [6,5,4,3,2,9,8,7,6,5,4,3,2]) !== parseInt(n[13])) return false;
    return true;
  },

  email: (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  obrigatorio: (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  },
};
