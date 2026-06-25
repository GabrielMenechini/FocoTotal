import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth';

// Formas de pagamento válidas (padrão interno uppercase)
const FORMAS_VALIDAS = ['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'CHEQUE'];

function validarFormaPagamento(forma: unknown): string {
  const f = String(forma || 'DINHEIRO').toUpperCase();
  return FORMAS_VALIDAS.includes(f) ? f : 'DINHEIRO';
}

function validarParcelas(parcelas: unknown, forma: string): number {
  if (forma !== 'CARTAO_CREDITO') return 1;
  const p = Number(parcelas);
  return Number.isInteger(p) && p >= 1 && p <= 12 ? p : 1;
}

export class VendasController {

  // ── GET /api/vendas ───────────────────────────────────────────────
  static async listar(_req: Request, res: Response): Promise<void> {
    try {
      // Tenta query completa (migration_v2 + v3 rodadas)
      let rows: any[];
      try {
        const [r] = await db.query(`
          SELECT
            v.id, v.valor_total, v.desconto, v.valor_final,
            v.status, v.criado_em,
            COALESCE(v.forma_pagamento, 'DINHEIRO') AS forma_pagamento,
            COALESCE(v.parcelas, 1)                  AS parcelas,
            c.nome AS cliente_nome,
            u.nome AS usuario_nome
          FROM vendas v
          LEFT JOIN clientes c ON v.cliente_id = c.id
          JOIN  usuarios u     ON v.usuario_id  = u.id
          ORDER BY v.criado_em DESC
          LIMIT 200
        `) as [any[], any];
        rows = r;
      } catch {
        // Fallback: colunas de migration_v2/v3 ainda não existem
        const [r] = await db.query(`
          SELECT
            v.id, v.valor_total, v.desconto, v.valor_final,
            v.status, v.criado_em,
            'DINHEIRO' AS forma_pagamento,
            1           AS parcelas,
            c.nome      AS cliente_nome,
            u.nome      AS usuario_nome
          FROM vendas v
          LEFT JOIN clientes c ON v.cliente_id = c.id
          JOIN  usuarios u     ON v.usuario_id  = u.id
          ORDER BY v.criado_em DESC
          LIMIT 200
        `) as [any[], any];
        rows = r;
      }
      res.json(rows);
    } catch (err) {
      logger.erro('Erro ao listar vendas', err);
      res.status(500).json({ erro: 'Erro ao listar vendas' });
    }
  }

  // ── GET /api/vendas/:id ───────────────────────────────────────────
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      let vendas: any[];
      try {
        const [r] = await db.query(
          `SELECT v.*,
             COALESCE(v.forma_pagamento, 'DINHEIRO') AS forma_pagamento,
             COALESCE(v.parcelas, 1)                  AS parcelas,
             c.nome AS cliente_nome,
             u.nome AS usuario_nome
           FROM vendas v
           LEFT JOIN clientes c ON v.cliente_id = c.id
           JOIN  usuarios u     ON v.usuario_id  = u.id
           WHERE v.id = ?`,
          [req.params.id]
        ) as [any[], any];
        vendas = r;
      } catch {
        const [r] = await db.query(
          `SELECT v.*,
             'DINHEIRO' AS forma_pagamento,
             1           AS parcelas,
             c.nome AS cliente_nome,
             u.nome AS usuario_nome
           FROM vendas v
           LEFT JOIN clientes c ON v.cliente_id = c.id
           JOIN  usuarios u     ON v.usuario_id  = u.id
           WHERE v.id = ?`,
          [req.params.id]
        ) as [any[], any];
        vendas = r;
      }

      if (vendas.length === 0) {
        res.status(404).json({ erro: 'Venda não encontrada' });
        return;
      }

      const [itens] = await db.query(
        `SELECT
           iv.produto_id,
           iv.quantidade,
           iv.preco_unitario,
           iv.subtotal,
           p.nome  AS produto_nome,
           p.codigo AS produto_codigo
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         WHERE iv.venda_id = ?`,
        [req.params.id]
      ) as [any[], any];

      res.json({ ...vendas[0], itens });
    } catch (err) {
      logger.erro('Erro ao buscar venda', err);
      res.status(500).json({ erro: 'Erro ao buscar venda' });
    }
  }

  // ── POST /api/vendas ──────────────────────────────────────────────
  static async criar(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const { cliente_id, itens, desconto, observacoes, forma_pagamento, parcelas } = req.body;

      if (!itens || itens.length === 0) {
        res.status(400).json({ erro: 'A venda deve ter pelo menos um item' });
        await conn.rollback();
        conn.release();
        return;
      }

      const formaPgto = validarFormaPagamento(forma_pagamento);
      const qtdParcelas = validarParcelas(parcelas, formaPgto);

      // Calcula total validando estoque
      let valor_total = 0;
      for (const item of itens) {
        const [prods] = await conn.query(
          'SELECT preco_venda, quantidade_estoque FROM produtos WHERE id = ? AND ativo = 1',
          [item.produto_id]
        ) as [any[], any];
        const produto = prods[0];
        if (!produto) throw new Error(`Produto ${item.produto_id} não encontrado`);
        if (produto.quantidade_estoque < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para produto ${item.produto_id} ` +
            `(disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantidade})`
          );
        }
        item.preco_unitario = produto.preco_venda;
        item.subtotal       = Number(produto.preco_venda) * Number(item.quantidade);
        valor_total        += item.subtotal;
      }

      const desc       = Number(desconto) || 0;
      const valor_final = valor_total - desc;
      const usuarioId  = req.usuario?.id;

      // Insere venda (com fallback se parcelas/forma_pagamento não existirem ainda)
      let vendaId: number;
      try {
        const [res2] = await conn.query(
          `INSERT INTO vendas
             (cliente_id, usuario_id, valor_total, desconto, valor_final,
              forma_pagamento, parcelas, status, observacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'concluida', ?)`,
          [cliente_id || null, usuarioId, valor_total, desc, valor_final,
           formaPgto, qtdParcelas, observacoes || null]
        ) as [any, any];
        vendaId = res2.insertId;
      } catch {
        // Fallback: colunas nova ainda não migradas
        const [res2] = await conn.query(
          `INSERT INTO vendas
             (cliente_id, usuario_id, valor_total, desconto, valor_final, status, observacoes)
           VALUES (?, ?, ?, ?, ?, 'concluida', ?)`,
          [cliente_id || null, usuarioId, valor_total, desc, valor_final, observacoes || null]
        ) as [any, any];
        vendaId = res2.insertId;
      }

      // Insere itens e atualiza estoque
      for (const item of itens) {
        await conn.query(
          `INSERT INTO itens_venda
             (venda_id, produto_id, quantidade, preco_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
        );
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
        await conn.query(
          `INSERT INTO movimentacoes_estoque
             (produto_id, tipo, quantidade, motivo, usuario_id)
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

  // ── PUT /api/vendas/:id ───────────────────────────────────────────
  static async editar(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const vendaId = req.params.id;
      const { cliente_id, itens, desconto, observacoes, forma_pagamento, parcelas } = req.body;

      if (!itens || itens.length === 0) {
        res.status(400).json({ erro: 'A venda deve ter pelo menos um item' });
        conn.release();
        return;
      }

      // Verifica que a venda existe e está concluída
      const [vendas] = await conn.query(
        `SELECT id FROM vendas WHERE id = ? AND status = 'concluida'`,
        [vendaId]
      ) as [any[], any];
      if (vendas.length === 0) {
        res.status(404).json({ erro: 'Venda não encontrada ou não pode ser editada (cancelada)' });
        conn.release();
        return;
      }

      // Busca itens originais
      const [itensOriginais] = await conn.query(
        'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = ?',
        [vendaId]
      ) as [any[], any];

      // Restaura estoque dos itens originais
      for (const item of itensOriginais as any[]) {
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
      }

      // Valida estoque para os novos itens (com o estoque já restaurado)
      const formaPgto    = validarFormaPagamento(forma_pagamento);
      const qtdParcelas  = validarParcelas(parcelas, formaPgto);
      let valor_total    = 0;

      for (const item of itens) {
        const [prods] = await conn.query(
          'SELECT preco_venda, quantidade_estoque FROM produtos WHERE id = ? AND ativo = 1',
          [item.produto_id]
        ) as [any[], any];
        const produto = prods[0];
        if (!produto) throw new Error(`Produto ${item.produto_id} não encontrado`);
        if (produto.quantidade_estoque < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para produto ${item.produto_id} ` +
            `(disponível: ${produto.quantidade_estoque}, solicitado: ${item.quantidade})`
          );
        }
        item.preco_unitario = produto.preco_venda;
        item.subtotal       = Number(produto.preco_venda) * Number(item.quantidade);
        valor_total        += item.subtotal;
      }

      const desc        = Number(desconto) || 0;
      const valor_final = valor_total - desc;
      const usuarioId   = req.usuario?.id;

      // Atualiza venda
      try {
        await conn.query(
          `UPDATE vendas SET
             cliente_id = ?, valor_total = ?, desconto = ?,
             valor_final = ?, forma_pagamento = ?, parcelas = ?, observacoes = ?
           WHERE id = ?`,
          [cliente_id || null, valor_total, desc, valor_final,
           formaPgto, qtdParcelas, observacoes || null, vendaId]
        );
      } catch {
        // Fallback sem colunas novas
        await conn.query(
          `UPDATE vendas SET
             cliente_id = ?, valor_total = ?, desconto = ?,
             valor_final = ?, observacoes = ?
           WHERE id = ?`,
          [cliente_id || null, valor_total, desc, valor_final, observacoes || null, vendaId]
        );
      }

      // Remove itens antigos e adiciona novos
      await conn.query('DELETE FROM itens_venda WHERE venda_id = ?', [vendaId]);

      for (const item of itens) {
        await conn.query(
          `INSERT INTO itens_venda
             (venda_id, produto_id, quantidade, preco_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
        );
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
        await conn.query(
          `INSERT INTO movimentacoes_estoque
             (produto_id, tipo, quantidade, motivo, usuario_id)
           VALUES (?, 'saida', ?, ?, ?)`,
          [item.produto_id, item.quantidade, `Edição venda #${vendaId}`, usuarioId]
        );
      }

      await conn.commit();
      logger.info('Venda editada', { vendaId, valor_final });
      res.json({ mensagem: 'Venda atualizada com sucesso' });

    } catch (err: any) {
      await conn.rollback();
      logger.erro('Erro ao editar venda', err?.message);
      res.status(400).json({ erro: err?.message || 'Erro ao editar venda' });
    } finally {
      conn.release();
    }
  }

  // ── PATCH /api/vendas/:id/cancelar ───────────────────────────────
  static async cancelar(req: AuthRequest, res: Response): Promise<void> {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const { motivo_cancelamento } = req.body;

      // Motivo obrigatório (mínimo 20 caracteres)
      if (!motivo_cancelamento || String(motivo_cancelamento).trim().length < 20) {
        res.status(400).json({
          erro: 'Motivo do cancelamento é obrigatório (mínimo 20 caracteres)',
        });
        conn.release();
        return;
      }

      const [vendas] = await conn.query(
        `SELECT id FROM vendas WHERE id = ? AND status = 'concluida'`,
        [req.params.id]
      ) as [any[], any];
      if ((vendas as any[]).length === 0) {
        res.status(404).json({ erro: 'Venda não encontrada ou já cancelada' });
        conn.release();
        return;
      }

      // Restaura estoque
      const [itens] = await conn.query(
        'SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = ?',
        [req.params.id]
      ) as [any[], any];
      for (const item of itens as any[]) {
        await conn.query(
          'UPDATE produtos SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?',
          [item.quantidade, item.produto_id]
        );
        await conn.query(
          `INSERT INTO movimentacoes_estoque
             (produto_id, tipo, quantidade, motivo, usuario_id)
           VALUES (?, 'entrada', ?, ?, ?)`,
          [
            item.produto_id,
            item.quantidade,
            `Cancelamento venda #${req.params.id}`,
            req.usuario?.id,
          ]
        );
      }

      // Atualiza status e motivo
      try {
        await conn.query(
          `UPDATE vendas SET status = 'cancelada', motivo_cancelamento = ? WHERE id = ?`,
          [String(motivo_cancelamento).trim(), req.params.id]
        );
      } catch {
        // Fallback sem coluna motivo_cancelamento
        await conn.query(
          `UPDATE vendas SET status = 'cancelada' WHERE id = ?`,
          [req.params.id]
        );
      }

      await conn.commit();
      logger.info('Venda cancelada', { vendaId: req.params.id });
      res.json({ mensagem: 'Venda cancelada com sucesso' });

    } catch (err) {
      await conn.rollback();
      logger.erro('Erro ao cancelar venda', err);
      res.status(500).json({ erro: 'Erro ao cancelar venda' });
    } finally {
      conn.release();
    }
  }
}
