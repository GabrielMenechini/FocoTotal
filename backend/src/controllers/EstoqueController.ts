import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth';

export class EstoqueController {
  static async listarMovimentacoes(req: Request, res: Response): Promise<void> {
    try {
      const { produto_id, tipo } = req.query;
      let query = `
        SELECT me.id, me.tipo, me.quantidade, me.motivo, me.criado_em,
               p.nome AS produto_nome, p.codigo AS produto_codigo,
               u.nome AS usuario_nome
        FROM movimentacoes_estoque me
        JOIN produtos p ON me.produto_id = p.id
        JOIN usuarios u ON me.usuario_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (produto_id) { query += ' AND me.produto_id = ?'; params.push(produto_id); }
      if (tipo) { query += ' AND me.tipo = ?'; params.push(tipo); }
      query += ' ORDER BY me.criado_em DESC LIMIT 200';

      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (err) {
      logger.erro('Erro ao listar movimentações', err);
      res.status(500).json({ erro: 'Erro ao listar movimentações' });
    }
  }

  static async registrarMovimentacao(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { produto_id, tipo, quantidade, motivo } = req.body;

      if (!produto_id || !tipo || !quantidade || !motivo) {
        res.status(400).json({ erro: 'produto_id, tipo, quantidade e motivo são obrigatórios' });
        await conn.rollback();
        conn.release();
        return;
      }
      if (!['entrada', 'saida'].includes(tipo)) {
        res.status(400).json({ erro: 'Tipo deve ser "entrada" ou "saida"' });
        await conn.rollback();
        conn.release();
        return;
      }

      const [prods] = await conn.query(
        'SELECT quantidade_estoque FROM produtos WHERE id = ? AND ativo = 1',
        [produto_id]
      );
      const produto = (prods as any[])[0];
      if (!produto) throw new Error('Produto não encontrado');
      if (tipo === 'saida' && produto.quantidade_estoque < Number(quantidade)) {
        throw new Error('Quantidade em estoque insuficiente');
      }

      const operacao = tipo === 'entrada' ? '+' : '-';
      await conn.query(
        `UPDATE produtos SET quantidade_estoque = quantidade_estoque ${operacao} ? WHERE id = ?`,
        [quantidade, produto_id]
      );
      const [result] = await conn.query(
        'INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [produto_id, tipo, quantidade, motivo, req.usuario?.id]
      );

      await conn.commit();
      logger.info('Movimentação de estoque registrada', { tipo, produto_id, quantidade });
      res.status(201).json({ id: (result as any).insertId, mensagem: 'Movimentação registrada com sucesso' });
    } catch (err: any) {
      await conn.rollback();
      logger.erro('Erro na movimentação', err?.message);
      res.status(400).json({ erro: err?.message || 'Erro ao registrar movimentação' });
    } finally {
      conn.release();
    }
  }
}
