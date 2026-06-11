/**
 * TESTES UNITÁRIOS – ValidatorService
 * Tipo: Unitário (sem dependências externas)
 * Rubrica: "Pelo menos 2 tipos de teste em um CRUD completo"
 */
import { ValidatorService } from '../src/utils/validators';

describe('ValidatorService – Testes Unitários', () => {
  // --- CPF ---
  describe('validarCPF', () => {
    it('deve aceitar CPF válido com máscara', () => {
      expect(ValidatorService.validarCPF('529.982.247-25')).toBe(true);
    });
    it('deve aceitar CPF válido sem máscara', () => {
      expect(ValidatorService.validarCPF('52998224725')).toBe(true);
    });
    it('deve rejeitar CPF com todos os dígitos iguais', () => {
      expect(ValidatorService.validarCPF('111.111.111-11')).toBe(false);
    });
    it('deve rejeitar CPF com dígito verificador errado', () => {
      expect(ValidatorService.validarCPF('123.456.789-00')).toBe(false);
    });
    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      expect(ValidatorService.validarCPF('123.456')).toBe(false);
    });
  });

  // --- CNPJ ---
  describe('validarCNPJ', () => {
    it('deve aceitar CNPJ válido com máscara', () => {
      expect(ValidatorService.validarCNPJ('11.222.333/0001-81')).toBe(true);
    });
    it('deve rejeitar CNPJ com todos os dígitos iguais', () => {
      expect(ValidatorService.validarCNPJ('11.111.111/1111-11')).toBe(false);
    });
    it('deve rejeitar CNPJ com menos de 14 dígitos', () => {
      expect(ValidatorService.validarCNPJ('123456')).toBe(false);
    });
    it('deve rejeitar CNPJ com dígito verificador errado', () => {
      expect(ValidatorService.validarCNPJ('11.222.333/0001-00')).toBe(false);
    });
  });

  // --- Email ---
  describe('validarEmail', () => {
    it('deve aceitar email válido', () => {
      expect(ValidatorService.validarEmail('admin@focototal.com')).toBe(true);
    });
    it('deve rejeitar email sem @', () => {
      expect(ValidatorService.validarEmail('adminfocototal.com')).toBe(false);
    });
    it('deve rejeitar email sem domínio', () => {
      expect(ValidatorService.validarEmail('admin@')).toBe(false);
    });
    it('deve rejeitar email com espaços', () => {
      expect(ValidatorService.validarEmail('admin @focototal.com')).toBe(false);
    });
  });

  // --- Campo Obrigatório ---
  describe('campoObrigatorio', () => {
    it('deve retornar false para string vazia', () => {
      expect(ValidatorService.campoObrigatorio('')).toBe(false);
    });
    it('deve retornar false para string só com espaços', () => {
      expect(ValidatorService.campoObrigatorio('   ')).toBe(false);
    });
    it('deve retornar false para null', () => {
      expect(ValidatorService.campoObrigatorio(null)).toBe(false);
    });
    it('deve retornar false para undefined', () => {
      expect(ValidatorService.campoObrigatorio(undefined)).toBe(false);
    });
    it('deve retornar true para string com conteúdo', () => {
      expect(ValidatorService.campoObrigatorio('FocoTotal')).toBe(true);
    });
    it('deve retornar true para número zero', () => {
      expect(ValidatorService.campoObrigatorio(0)).toBe(true);
    });
    it('deve retornar true para número positivo', () => {
      expect(ValidatorService.campoObrigatorio(42)).toBe(true);
    });
  });
});
