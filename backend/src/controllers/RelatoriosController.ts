import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';

export class RelatoriosController {

  // ── Dashboard clássico (mantido para compatibilidade) ─────────────
  static async resumoDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const [vendasHoje] = await db.query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valor_final), 0) AS valor
         FROM vendas
         WHERE DATE(criado_em) = CURDATE() AND status = 'concluida'`
      ) as [any[], any];

      const [totalProdutos] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1'
      ) as [any[], any];

      const [totalClientes] = await db.query(
        'SELECT COUNT(*) AS total FROM clientes WHERE ativo = 1'
      ) as [any[], any];

      const [estoqueBaixo] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1 AND quantidade_estoque <= estoque_minimo'
      ) as [any[], any];

      const [ultimasVendas] = await db.query(
        `SELECT v.id, v.valor_final, v.criado_em, c.nome AS cliente_nome
         FROM vendas v
         LEFT JOIN clientes c ON v.cliente_id = c.id
         WHERE v.status = 'concluida'
         ORDER BY v.criado_em DESC
         LIMIT 5`
      ) as [any[], any];

      res.json({
        vendasHoje:    vendasHoje[0],
        totalProdutos: totalProdutos[0].total,
        totalClientes: totalClientes[0].total,
        estoqueBaixo:  estoqueBaixo[0].total,
        ultimasVendas,
      });
    } catch (err) {
      logger.erro('Erro no dashboard', err);
      res.status(500).json({ erro: 'Erro ao gerar dashboard' });
    }
  }

  // ── Dashboard BI ampliado ─────────────────────────────────────────
  static async dashboardBi(_req: Request, res: Response): Promise<void> {
    try {
      // Resumo do dia — usa CURDATE() do MySQL (sem timezone JS)
      const [vendasHojeRows] = await db.query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valor_final), 0) AS valor
         FROM vendas
         WHERE DATE(criado_em) = CURDATE() AND status = 'concluida'`
      ) as [any[], any];
      const vendasHoje = vendasHojeRows[0];
      const ticketMedio = vendasHoje.total > 0
        ? Number(vendasHoje.valor) / Number(vendasHoje.total) : 0;

      const [totalProdutosRows] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1'
      ) as [any[], any];
      const [totalClientesRows] = await db.query(
        'SELECT COUNT(*) AS total FROM clientes WHERE ativo = 1'
      ) as [any[], any];
      const [estoqueBaixoRows] = await db.query(
        'SELECT COUNT(*) AS total FROM produtos WHERE ativo = 1 AND quantidade_estoque <= estoque_minimo'
      ) as [any[], any];

      const [ultimasVendas] = await db.query(
        `SELECT v.id, v.valor_final, v.criado_em, c.nome AS cliente_nome
         FROM vendas v
         LEFT JOIN clientes c ON v.cliente_id = c.id
         WHERE v.status = 'concluida'
         ORDER BY v.criado_em DESC
         LIMIT 5`
      ) as [any[], any];

      // Lucro estimado hoje
      const [lucroRows] = await db.query(
        `SELECT
           COALESCE(SUM(iv.subtotal), 0)                    AS receita,
           COALESCE(SUM(iv.quantidade * p.preco_custo), 0)  AS custo
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v   ON iv.venda_id   = v.id
         WHERE DATE(v.criado_em) = CURDATE() AND v.status = 'concluida'`
      ) as [any[], any];
      const lucroRow = lucroRows[0];
      const lucroHoje  = Number(lucroRow.receita) - Number(lucroRow.custo);
      const margemHoje = lucroRow.receita > 0
        ? (lucroHoje / Number(lucroRow.receita)) * 100 : 0;

      // Top 5 produtos (últimos 30 dias)
      const [topProdutos] = await db.query(
        `SELECT p.nome, p.codigo,
                SUM(iv.quantidade) AS total_vendido,
                SUM(iv.subtotal)   AS total_valor
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v   ON iv.venda_id   = v.id
         WHERE v.status = 'concluida'
           AND v.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY p.id, p.nome, p.codigo
         ORDER BY total_vendido DESC
         LIMIT 5`
      ) as [any[], any];

      // Vendas por dia – últimos 7 dias
      const [vendasSemana] = await db.query(
        `SELECT
           DATE(criado_em)                AS data,
           COUNT(*)                       AS qtd,
           COALESCE(SUM(valor_final), 0)  AS total
         FROM vendas
         WHERE status = 'concluida'
           AND criado_em >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(criado_em)
         ORDER BY data`
      ) as [any[], any];

      // Top categorias por receita – últimos 30 dias
      const [categorias] = await db.query(
        `SELECT p.categoria, SUM(iv.subtotal) AS total
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v   ON iv.venda_id   = v.id
         WHERE v.status = 'concluida'
           AND v.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY p.categoria
         ORDER BY total DESC
         LIMIT 5`
      ) as [any[], any];

      res.json({
        vendasHoje,
        totalProdutos: totalProdutosRows[0].total,
        totalClientes: totalClientesRows[0].total,
        estoqueBaixo:  estoqueBaixoRows[0].total,
        ultimasVendas,
        ticketMedio,
        lucroHoje: {
          receita:    lucroRow.receita,
          custo:      lucroRow.custo,
          lucro:      lucroHoje,
          margem_pct: margemHoje,
        },
        topProdutos,
        vendasSemana,
        categorias,
      });
    } catch (err) {
      logger.erro('Erro no dashboard BI', err);
      res.status(500).json({ erro: 'Erro ao gerar dashboard BI' });
    }
  }

  // ── Resumo de Caixa – Dia Atual ───────────────────────────────────
  static async resumoCaixa(_req: Request, res: Response): Promise<void> {
    try {
      // KPIs do dia — CURDATE() garante timezone consistente com o MySQL
      const [resumoRows] = await db.query(
        `SELECT COUNT(*) AS qtd_vendas,
                COALESCE(SUM(valor_final), 0) AS total_vendido
         FROM vendas
         WHERE DATE(criado_em) = CURDATE() AND status = 'concluida'`
      ) as [any[], any];
      const resumoRow   = resumoRows[0];
      const ticketMedio = resumoRow.qtd_vendas > 0
        ? Number(resumoRow.total_vendido) / Number(resumoRow.qtd_vendas) : 0;

      // Lucro estimado
      const [lucroRows] = await db.query(
        `SELECT
           COALESCE(SUM(iv.subtotal), 0)                   AS receita,
           COALESCE(SUM(iv.quantidade * p.preco_custo), 0) AS custo
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v   ON iv.venda_id   = v.id
         WHERE DATE(v.criado_em) = CURDATE() AND v.status = 'concluida'`
      ) as [any[], any];
      const lucroRow         = lucroRows[0];
      const lucroEstimado    = Number(lucroRow.receita) - Number(lucroRow.custo);
      const margemPercentual = lucroRow.receita > 0
        ? (lucroEstimado / Number(lucroRow.receita)) * 100 : 0;

      // Produtos mais vendidos hoje
      const [produtosMaisVendidos] = await db.query(
        `SELECT p.nome, p.categoria,
                SUM(iv.quantidade) AS qtd,
                SUM(iv.subtotal)   AS total
         FROM itens_venda iv
         JOIN produtos p ON iv.produto_id = p.id
         JOIN vendas v   ON iv.venda_id   = v.id
         WHERE DATE(v.criado_em) = CURDATE() AND v.status = 'concluida'
         GROUP BY p.id, p.nome, p.categoria
         ORDER BY qtd DESC
         LIMIT 10`
      ) as [any[], any];

      // Formas de pagamento
      let formasPagamento: any[] = [];
      try {
        const [fp] = await db.query(
          `SELECT
             COALESCE(forma_pagamento, 'DINHEIRO') AS forma_pagamento,
             COUNT(*)          AS qtd,
             SUM(valor_final)  AS total
           FROM vendas
           WHERE DATE(criado_em) = CURDATE() AND status = 'concluida'
           GROUP BY forma_pagamento
           ORDER BY total DESC`
        ) as [any[], any];
        formasPagamento = fp;
      } catch { formasPagamento = []; }

      // Distribuição por hora
      const [vendasPorHora] = await db.query(
        `SELECT HOUR(criado_em) AS hora,
                COUNT(*)        AS qtd,
                SUM(valor_final) AS total
         FROM vendas
         WHERE DATE(criado_em) = CURDATE() AND status = 'concluida'
         GROUP BY hora
         ORDER BY hora`
      ) as [any[], any];

      // Últimas vendas com parcelas e forma de pagamento
      let ultimasVendas: any[] = [];
      try {
        const [uv] = await db.query(
          `SELECT
             v.id, v.valor_final, v.desconto,
             COALESCE(v.forma_pagamento, 'DINHEIRO') AS forma_pagamento,
             COALESCE(v.parcelas, 1)                  AS parcelas,
             v.criado_em,
             c.nome AS cliente_nome,
             u.nome AS vendedor_nome
           FROM vendas v
           LEFT JOIN clientes c ON v.cliente_id = c.id
           JOIN  usuarios u     ON v.usuario_id  = u.id
           WHERE DATE(v.criado_em) = CURDATE() AND v.status = 'concluida'
           ORDER BY v.criado_em DESC
           LIMIT 10`
        ) as [any[], any];
        ultimasVendas = uv;
      } catch {
        const [uv] = await db.query(
          `SELECT v.id, v.valor_final, v.desconto, v.criado_em,
                  c.nome AS cliente_nome, u.nome AS vendedor_nome
           FROM vendas v
           LEFT JOIN clientes c ON v.cliente_id = c.id
           JOIN  usuarios u     ON v.usuario_id  = u.id
           WHERE DATE(v.criado_em) = CURDATE() AND v.status = 'concluida'
           ORDER BY v.criado_em DESC
           LIMIT 10`
        ) as [any[], any];
        ultimasVendas = (uv as any[]).map(v => ({
          ...v, forma_pagamento: '—', parcelas: 1,
        }));
      }

      // Estoque crítico
      const [estoqueBaixo] = await db.query(
        `SELECT nome, codigo, quantidade_estoque, estoque_minimo
         FROM produtos
         WHERE ativo = 1 AND quantidade_estoque <= estoque_minimo
         ORDER BY quantidade_estoque ASC
         LIMIT 10`
      ) as [any[], any];

      // Comparação com ontem
      const [ontemRows] = await db.query(
        `SELECT COUNT(*) AS qtd_vendas,
                COALESCE(SUM(valor_final), 0) AS total_vendido
         FROM vendas
         WHERE DATE(criado_em) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
           AND status = 'concluida'`
      ) as [any[], any];

      // Gastos com reabastecimento de estoque hoje
      const [gastosReabRows] = await db.query(
        `SELECT
           COUNT(*)                                      AS qtd_entradas,
           COALESCE(SUM(me.quantidade * p.preco_custo), 0) AS total_gasto
         FROM movimentacoes_estoque me
         JOIN produtos p ON me.produto_id = p.id
         WHERE me.tipo = 'entrada' AND DATE(me.criado_em) = CURDATE()`
      ) as [any[], any];

      const [produtosReabRows] = await db.query(
        `SELECT
           p.nome, p.codigo, p.categoria,
           SUM(me.quantidade)                            AS qtd_adicionada,
           p.preco_custo,
           COALESCE(SUM(me.quantidade * p.preco_custo), 0) AS total_gasto
         FROM movimentacoes_estoque me
         JOIN produtos p ON me.produto_id = p.id
         WHERE me.tipo = 'entrada' AND DATE(me.criado_em) = CURDATE()
         GROUP BY p.id, p.nome, p.codigo, p.categoria, p.preco_custo
         ORDER BY total_gasto DESC
         LIMIT 8`
      ) as [any[], any];

      // Despesas do dia (try/catch — tabela existe apenas após migration_v4)
      let despesasHoje   = { total_despesas: 0, qtd_despesas: 0 };
      let ultimasDespesas: any[] = [];
      let despesasPorCategoria: any[] = [];
      try {
        const [dTot] = await db.query(
          `SELECT COALESCE(SUM(valor_total), 0) AS total_despesas,
                  COUNT(*) AS qtd_despesas
           FROM despesas WHERE DATE(criado_em) = CURDATE()`
        ) as [any[], any];
        despesasHoje = dTot[0];

        const [dUlt] = await db.query(
          `SELECT d.id, d.tipo, d.categoria, d.descricao, d.fornecedor,
                  d.valor_total, d.criado_em, u.nome AS usuario_nome
           FROM despesas d
           JOIN usuarios u ON d.usuario_id = u.id
           WHERE DATE(d.criado_em) = CURDATE()
           ORDER BY d.criado_em DESC LIMIT 5`
        ) as [any[], any];
        ultimasDespesas = dUlt;

        const [dCat] = await db.query(
          `SELECT categoria,
                  COALESCE(SUM(valor_total), 0) AS total,
                  COUNT(*) AS qtd
           FROM despesas
           WHERE DATE(criado_em) = CURDATE()
           GROUP BY categoria
           ORDER BY total DESC`
        ) as [any[], any];
        despesasPorCategoria = dCat;
      } catch {
        // migration_v4 ainda não foi executada — retorna zerado
      }

      res.json({
        resumoHoje: { ...resumoRow, ticket_medio: ticketMedio },
        lucro: {
          receita:           lucroRow.receita,
          custo:             lucroRow.custo,
          lucro_estimado:    lucroEstimado,
          margem_percentual: margemPercentual,
        },
        produtosMaisVendidos,
        formasPagamento,
        vendasPorHora,
        ultimasVendas,
        estoqueBaixo,
        comparacaoOntem: ontemRows[0],
        despesasHoje,
        ultimasDespesas,
        despesasPorCategoria,
        gastosReabastecimento: gastosReabRows[0],
        produtosReabastecidos: produtosReabRows,
      });
    } catch (err) {
      logger.erro('Erro no resumo de caixa', err);
      res.status(500).json({ erro: 'Erro ao gerar resumo de caixa' });
    }
  }

  // ── Produtos mais vendidos ────────────────────────────────────────
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
         JOIN vendas v   ON iv.venda_id   = v.id
         ${filtro}
         GROUP BY p.id, p.codigo, p.nome, p.categoria
         ORDER BY total_vendido DESC
         LIMIT 20`,
        params
      ) as [any[], any];
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }

  // ── Movimentações de estoque ──────────────────────────────────────
  static async movimentacoesEstoque(req: Request, res: Response): Promise<void> {
    try {
      const { inicio, fim, tipo } = req.query;
      let query = `
        SELECT me.tipo, me.quantidade, me.motivo, me.criado_em,
               p.nome AS produto_nome, p.codigo,
               p.preco_custo,
               CASE WHEN me.tipo = 'entrada'
                    THEN (me.quantidade * p.preco_custo)
                    ELSE NULL END AS total_gasto,
               u.nome AS usuario_nome
        FROM movimentacoes_estoque me
        JOIN produtos p ON me.produto_id = p.id
        JOIN usuarios u ON me.usuario_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (inicio && fim) { query += ' AND me.criado_em BETWEEN ? AND ?'; params.push(inicio, fim); }
      if (tipo)          { query += ' AND me.tipo = ?'; params.push(tipo); }
      query += ' ORDER BY me.criado_em DESC LIMIT 500';
      const [rows] = await db.query(query, params) as [any[], any];
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }

  // ── Margem de lucro ───────────────────────────────────────────────
  static async margemLucro(_req: Request, res: Response): Promise<void> {
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
      `) as [any[], any];
      res.json(rows);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  }
}
