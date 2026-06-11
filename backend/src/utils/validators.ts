/**
 * SOLID – SRP (Single Responsibility Principle)
 * Esta classe tem UMA responsabilidade: validar dados de entrada.
 * Nenhuma lógica de negócio, acesso a banco ou log aqui.
 */
export class ValidatorService {
  static validarCPF(cpf: string): boolean {
    const n = cpf.replace(/\D/g, '');
    if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(n[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(n[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(n[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(n[10]);
  }

  static validarCNPJ(cnpj: string): boolean {
    const n = cnpj.replace(/\D/g, '');
    if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false;

    const calc = (base: string, pesos: number[]): number => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i++) soma += parseInt(base[i]) * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };

    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    if (calc(n, p1) !== parseInt(n[12])) return false;
    if (calc(n, p2) !== parseInt(n[13])) return false;
    return true;
  }

  static validarEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static campoObrigatorio(valor: unknown): boolean {
    if (valor === null || valor === undefined) return false;
    if (typeof valor === 'string') return valor.trim().length > 0;
    return true;
  }
}
