import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth';

export class VendasController {
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(`
        SELECT v.id, v.valor_total, v.desconto, v.valor_final, v.status, v.criado_em,
               c.nome AS cliente_nome, u.nome AS usuario_nome
        FROM vendas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        JOIN usuarios u ON v.usuario_id = u.id
        ORDER BY v.criado_em DESC
        LIMIT 100
      `);
      res.json(rows);
    } catch (err) {
      logger.erro('Erro ao listar vendas', err);
      res.status(500).json({ erro: 'Erro ao listar vendas' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const [vendas] = await db.query(
        `SELECT v.*, c.nome AS cliente_nome, u.nome AS usuario_nome
         FROM vendas v
         LEFT JOIN clientes c ON v.cliente_id = c.id
         JOIN usuarios u ON v.usuario_id = u.id
         WHERE v.id = ?`,
        [req.params.id]
      );
      const lista = vendas as any[];
      if (lista.length === 0) {
        res.status(404).json({ erro: 'Venda não encontrada' });
        return;
      }
      const [itens] = await db.query(
        `SELECT iv.*, p.nome AS produto_nome, p.codigo
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         WHERE iv.venda_id = ?`,
        [req.params.id]
      );
      res.json({ ...lista[0], itens });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar venda' });
    }
  }

  static async criar(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { cliente_id, itens, desconto, observacoes } = req.body;

      if (!itens || itens.length === 0) {
        res.status(400).json({ erro: 'Venda deve ter pelo menos um item' });
        await conn.rollback();
        conn.release();
        return;
      }

      let valor_total = 0;
      for (const item of itens) {
        const [prods] = await conn.query(
          'SELECT preco_venda, quantidade_estoque FROM produtos WHERE id = ? AND ativo = 1',
          [item.produto_id]
        );
        const produto = (prods as any[])[0];
        if (!produto) throw new Error(`Produto ${item.produto_id} não encontrado`);
        if (produto.quantidade_estoque < item.quantidade) {
          throw new Error(`Estoque insuficiente para o produto ID ${item.produto_id}`);
        }
        item.preco_unitario = produto.preco_venda;
        item.subtotal = produto.preco_venda * item.quantidade;
        valor_total += item.subtotal;
      }

      const desc = Number(desconto) || 0;
      const valor_final = valor_total - desc;
      const usuarioId = req.usuario?.id;

      const [vendaResult] = await conn.query(
        `INSERT INTO vendas (cliente_id, usuario_id, valor_total, desconto, valor_final, status, observacoes)
         VALUES (?, ?, ?, ?, ?, 'concluida', ?)`,
        [cliente_id || null, usuarioId, valor_total, desc, valor_final, observacoes || null]
      );
      const vendaId = (vendaResult as any).insertId;

      for (const item of itens) {
        await conn.query(
          'INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
        );
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
        await conn.query(
          `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, usuario_id)
           VALUES (?, 'saida', ?, ?, ?)`,
          [item.produto_id, item.quantidade, `Venda #${vendaId}`, usuarioId]
        );
      }

      await conn.commit();
      logger.info('Venda criada', { vendaId, valor_final, itens: itens.length });
      res.status(201).json({ id: vendaId, mensagem: 'Venda criada com sucesso' });
    } catch (err: any) {
      await conn.rollback();
      logger.erro('Erro ao criar venda', err?.message);
      res.status(400).json({ erro: err?.message || 'Erro ao criar venda' });
    } finally {
      conn.release();
    }
  }

  static async cancelar(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [vendas] = await conn.query(
        `SELECT * FROM vendas WHERE id = ? AND status = 'concluida'`,
        [req.params.id]
      );
      const venda = (vendas as any[])[0];
      if (!venda) {
        res.status(404).json({ erro: 'Venda não encontrada ou já cancelada' });
        await conn.rollback();
        conn.release();
        return;
      }

      const [itens] = await conn.query(
        'SELECT * FROM itens_venda WHERE venda_id = ?',
        [req.params.id]
      );
      for (const item of itens as any[]) {
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
        await conn.query(
          `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, usuario_id)
           VALUES (?, 'entrada', ?, ?, ?)`,
          [item.produto_id, item.quantidade, `Cancelamento venda #${req.params.id}`, req.usuario?.id]
        );
      }
      await conn.query(
        `UPDATE vendas SET status = 'cancelada' WHERE id = ?`,
        [req.params.id]
      );
      await conn.commit();
      logger.info('Venda cancelada', { vendaId: req.params.id });
      res.json({ mensagem: 'Venda cancelada com sucesso' });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ erro: 'Erro ao cancelar venda' });
    } finally {
      conn.release();
    }
  }
}
