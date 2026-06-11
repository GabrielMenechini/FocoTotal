import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';

export class RelatoriosController {
  static async resumoDashboard(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      const [vendasHoje] = await db.query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valor_final), 0) AS valor
         FROM vendas WHERE DATE(criado_em) = ? AND status = 'concluida'`,
        [hoje]
      );
      const [totalProdutos] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1'
      );
      const [totalClientes] = await db.query(
        'SELECT COUNT(*) AS total FROM clientes WHERE ativo = 1'
      );
      const [estoqueBaixo] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1 AND quantidade_estoque <= estoque_minimo'
      );
      const [ultimasVendas] = await db.query(
        `SELECT v.id, v.valor_final, v.criado_em, c.nome AS cliente_nome
         FROM vendas v LEFT JOIN clientes c ON v.cliente_id = c.id
         WHERE v.status = 'concluida' ORDER BY v.criado_em DESC LIMIT 5`
      );

      res.json({
        vendasHoje: (vendasHoje as any[])[0],
        totalProdutos: (totalProdutos as any[])[0].total,
        totalClientes: (totalClientes as any[])[0].total,
        estoqueBaixo: (estoqueBaixo as any[])[0].total,
        ultimasVendas,
      });
    } catch (err) {
      logger.erro('Erro no dashboard', err);
      res.status(500).json({ erro: 'Erro ao gerar dashboard' });
    }
  }

  static async produtosMaisVendidos(req: Request, res: Response): Promise<void> {
    try {
      const { inicio, fim } = req.query;
      let filtro = `WHERE v.status = 'concluida'`;
      const params: unknown[] = [];
      if (inicio && fim) {
        filtro += ' AND v.criado_em BETWEEN ? AND ?';
        params.push(inicio, fim);
      }

      const [rows] = await db.query(
        `SELECT p.codigo, p.nome, p.categoria,
                SUM(iv.quantidade) AS total_vendido,
                SUM(iv.subtotal)   AS total_valor
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v ON iv.venda_id = v.id
         ${filtro}
         GROUP BY p.id
         ORDER BY total_vendido DESC
         LIMIT 20`,
        params
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }

  static async movimentacoesEstoque(req: Request, res: Response): Promise<void> {
    try {
      const { inicio, fim, tipo } = req.query;
      let query = `
        SELECT me.tipo, me.quantidade, me.motivo, me.criado_em,
               p.nome AS produto_nome, p.codigo,
               u.nome AS usuario_nome
        FROM movimentacoes_estoque me
        JOIN produtos p ON me.produto_id = p.id
        JOIN usuarios u ON me.usuario_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (inicio && fim) { query += ' AND me.criado_em BETWEEN ? AND ?'; params.push(inicio, fim); }
      if (tipo) { query += ' AND me.tipo = ?'; params.push(tipo); }
      query += ' ORDER BY me.criado_em DESC LIMIT 500';

      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }

  static async margemLucro(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await db.query(`
        SELECT p.codigo, p.nome, p.categoria,
               p.preco_custo, p.preco_venda,
               (p.preco_venda - p.preco_custo) AS margem_valor,
               ROUND(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100, 2) AS margem_percentual,
               p.quantidade_estoque
        FROM produtos p
        WHERE p.ativo = 1 AND p.preco_custo > 0
        ORDER BY margem_percentual DESC
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }
}
