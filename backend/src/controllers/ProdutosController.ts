import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';
import { ValidatorService } from '../utils/validators';

export class ProdutosController {
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const { busca, categoria } = req.query;
      let query = 'SELECT * FROM produtos WHERE ativo = 1';
      const params: unknown[] = [];

      if (busca) {
        query += ' AND (nome LIKE ? OR codigo LIKE ?)';
        params.push(`%${busca}%`, `%${busca}%`);
      }
      if (categoria) {
        query += ' AND categoria = ?';
        params.push(categoria);
      }
      query += ' ORDER BY nome ASC';

      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (err) {
      logger.erro('Erro ao listar produtos', err);
      res.status(500).json({ erro: 'Erro ao listar produtos' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(
        'SELECT * FROM produtos WHERE id = ? AND ativo = 1',
        [req.params.id]
      );
      const produtos = rows as any[];
      if (produtos.length === 0) {
        res.status(404).json({ erro: 'Produto não encontrado' });
        return;
      }
      res.json(produtos[0]);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar produto' });
    }
  }

  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const { codigo, nome, categoria, preco_custo, preco_venda, quantidade_estoque, estoque_minimo, descricao } = req.body;

      if (
        !ValidatorService.campoObrigatorio(codigo) ||
        !ValidatorService.campoObrigatorio(nome) ||
        !ValidatorService.campoObrigatorio(categoria)
      ) {
        res.status(400).json({ erro: 'Código, nome e categoria são obrigatórios' });
        return;
      }
      if (Number(preco_venda) <= 0 || Number(preco_custo) < 0) {
        res.status(400).json({ erro: 'Preços devem ser maiores que zero' });
        return;
      }

      const [existente] = await db.query('SELECT id FROM produtos WHERE codigo = ?', [codigo]);
      if ((existente as any[]).length > 0) {
        res.status(409).json({ erro: 'Código de produto já cadastrado' });
        return;
      }

      const [result] = await db.query(
        'INSERT INTO produtos (codigo, nome, descricao, categoria, preco_custo, preco_venda, quantidade_estoque, estoque_minimo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [codigo, nome, descricao || null, categoria, preco_custo, preco_venda, quantidade_estoque || 0, estoque_minimo || 5]
      );
      const r = result as any;
      logger.info('Produto criado', { produtoId: r.insertId, codigo });
      res.status(201).json({ id: r.insertId, mensagem: 'Produto criado com sucesso' });
    } catch (err) {
      logger.erro('Erro ao criar produto', err);
      res.status(500).json({ erro: 'Erro ao criar produto' });
    }
  }

  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const { nome, categoria, preco_custo, preco_venda, estoque_minimo, descricao } = req.body;

      if (!ValidatorService.campoObrigatorio(nome) || !ValidatorService.campoObrigatorio(categoria)) {
        res.status(400).json({ erro: 'Nome e categoria são obrigatórios' });
        return;
      }

      const [result] = await db.query(
        'UPDATE produtos SET nome=?, descricao=?, categoria=?, preco_custo=?, preco_venda=?, estoque_minimo=? WHERE id=? AND ativo=1',
        [nome, descricao || null, categoria, preco_custo, preco_venda, estoque_minimo, req.params.id]
      );
      const r = result as any;
      if (r.affectedRows === 0) {
        res.status(404).json({ erro: 'Produto não encontrado' });
        return;
      }
      logger.info('Produto atualizado', { produtoId: req.params.id });
      res.json({ mensagem: 'Produto atualizado com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao atualizar produto' });
    }
  }

  static async excluir(req: Request, res: Response): Promise<void> {
    try {
      const [result] = await db.query(
        'UPDATE produtos SET ativo=0 WHERE id=?',
        [req.params.id]
      );
      const r = result as any;
      if (r.affectedRows === 0) {
        res.status(404).json({ erro: 'Produto não encontrado' });
        return;
      }
      logger.info('Produto desativado', { produtoId: req.params.id });
      res.json({ mensagem: 'Produto excluído com sucesso' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao excluir produto' });
    }
  }

  static async alertasEstoque(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(
        `SELECT id, codigo, nome, quantidade_estoque, estoque_minimo
         FROM produtos WHERE ativo=1 AND quantidade_estoque <= estoque_minimo
         ORDER BY quantidade_estoque ASC`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao verificar estoque' });
    }
  }
}
