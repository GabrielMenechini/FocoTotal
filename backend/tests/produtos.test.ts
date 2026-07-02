/**
 * TESTES DE INTEGRAÇÃO – Produtos API
 * Tipo: Integração (testa endpoints HTTP com banco mockado)
 * Rubrica: "Pelo menos 2 tipos de teste em um CRUD completo"
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';

// Mock do banco de dados (evita precisar de MySQL rodando nos testes)
jest.mock('../src/database', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));

// Mock do logger para não criar arquivos durante os testes
jest.mock('../src/utils/logger', () => ({
  logger: { info: jest.fn(), erro: jest.fn(), aviso: jest.fn() },
}));

const mockDb = require('../src/database');

// Garante que o JWT_SECRET nos testes bate com o usado pelo middleware
const TEST_SECRET = 'focototal_secret';

// Token JWT de Admin para autenticação nos testes
const tokenAdmin = jwt.sign(
  { id: 1, nome: 'Admin Teste', cargo: 'admin' },
  TEST_SECRET
);

const produtoMock = {
  id: 1,
  codigo: 'OC001',
  nome: 'Óculos Solar Modelo A',
  categoria: 'Solar',
  preco_custo: 80,
  preco_venda: 150,
  quantidade_estoque: 10,
  estoque_minimo: 5,
  ativo: 1,
};

beforeAll(() => {
  // Garante que o middleware de autenticação usa o mesmo segredo do teste
  process.env.JWT_SECRET = TEST_SECRET;
});

describe('Produtos API – Testes de Integração', () => {
  beforeEach(() => jest.clearAllMocks());

  // ---- LISTAR ----
  describe('GET /api/produtos', () => {
    it('deve retornar lista de produtos autenticado', async () => {
      mockDb.query.mockResolvedValue([[produtoMock]]);
      const res = await request(app)
        .get('/api/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/produtos');
      expect(res.status).toBe(401);
    });
  });

  // ---- CRIAR ----
  describe('POST /api/produtos', () => {
    it('deve criar produto com dados válidos', async () => {
      mockDb.query
        .mockResolvedValueOnce([[]])               // verifica código duplicado
        .mockResolvedValueOnce([{ insertId: 1 }]); // insert

      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          codigo: 'OC001',
          nome: 'Óculos Solar',
          categoria: 'Solar',
          preco_custo: 80,
          preco_venda: 150,
          quantidade_estoque: 10,
          estoque_minimo: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('mensagem', 'Produto criado com sucesso');
    });

    it('deve retornar 400 quando código está ausente', async () => {
      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Óculos Solar', categoria: 'Solar', preco_custo: 80, preco_venda: 150 });
      expect(res.status).toBe(400);
    });

    it('deve retornar 400 quando preço de venda é zero', async () => {
      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ codigo: 'OC001', nome: 'Óculos', categoria: 'Solar', preco_custo: 0, preco_venda: 0 });
      expect(res.status).toBe(400);
    });

    it('deve retornar 409 para código de produto duplicado', async () => {
      mockDb.query.mockResolvedValueOnce([[produtoMock]]); // código já existe
      const res = await request(app)
        .post('/api/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ codigo: 'OC001', nome: 'Óculos', categoria: 'Solar', preco_custo: 80, preco_venda: 150 });
      expect(res.status).toBe(409);
    });
  });

  // ---- ATUALIZAR ----
  describe('PUT /api/produtos/:id', () => {
    it('deve atualizar produto existente', async () => {
      mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);
      const res = await request(app)
        .put('/api/produtos/1')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Óculos Atualizado', categoria: 'Solar', preco_custo: 90, preco_venda: 160, estoque_minimo: 3 });
      expect(res.status).toBe(200);
      expect(res.body.mensagem).toBe('Produto atualizado com sucesso');
    });

    it('deve retornar 404 para produto inexistente', async () => {
      mockDb.query.mockResolvedValue([{ affectedRows: 0 }]);
      const res = await request(app)
        .put('/api/produtos/999')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Teste', categoria: 'Solar', preco_custo: 90, preco_venda: 160, estoque_minimo: 3 });
      expect(res.status).toBe(404);
    });
  });

  // ---- EXCLUIR ----
  describe('DELETE /api/produtos/:id', () => {
    it('deve excluir (desativar) produto existente', async () => {
      mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);
      const res = await request(app)
        .delete('/api/produtos/1')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
    });

    it('deve retornar 404 ao excluir produto inexistente', async () => {
      mockDb.query.mockResolvedValue([{ affectedRows: 0 }]);
      const res = await request(app)
        .delete('/api/produtos/999')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(404);
    });
  });

  // ---- ALERTAS DE ESTOQUE ----
  describe('GET /api/produtos/alertas', () => {
    it('deve retornar produtos com estoque baixo', async () => {
      const produtoBaixo = { ...produtoMock, quantidade_estoque: 2, estoque_minimo: 5 };
      mockDb.query.mockResolvedValue([[produtoBaixo]]);
      const res = await request(app)
        .get('/api/produtos/alertas')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
