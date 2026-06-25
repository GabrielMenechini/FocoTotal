import { Request, Response } from 'express';
import db from '../database';
import { logger } from '../utils/logger';

// ── Tipos ─────────────────────────────────────────────────────────
type Prioridade = 'alta' | 'media' | 'baixa';
type InsightTipo =
  | 'reposicao'
  | 'estoque_zerado'
  | 'produto_parado'
  | 'crescimento'
  | 'sazonalidade'
  | 'combo'
  | 'queda';

export interface BiInsight {
  id:         string;
  tipo:       InsightTipo;
  titulo:     string;
  mensagem:   string;
  prioridade: Prioridade;
  tag:        'Estoque' | 'Vendas' | 'Sazonalidade' | 'Promoção';
  produto?:   string;
  categoria?: string;
  dados?:     Record<string, string | number>;
}

const ORDEM_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

const MESES_PT = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// ── Helpers ───────────────────────────────────────────────────────
function slug(str: string): string {
  return String(str).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function calcPct(a: number, b: number): number {
  return b > 0 ? Math.round(((a - b) / b) * 100) : 0;
}

// Executa uma query e retorna [] em vez de lançar erro.
// Assim, uma query que falha não derruba as outras.
async function safeQuery(sql: string, params: unknown[] = []): Promise<any[]> {
  try {
    const [rows] = await db.query(sql, params) as [any[], any];
    return rows as any[];
  } catch (err: any) {
    logger.erro(`[BI] query falhou: ${err?.message ?? err}`, null);
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════
export class BiController {

  // GET /api/bi/insights
  static async insights(_req: Request, res: Response): Promise<void> {
    try {
      // Roda todas as queries em paralelo; cada uma é independente
      const [
        reposicaoRows,
        estoqueZeradoRows,
        produtosParadosRows,
        crescimentoRows,
        sazonalidadeRows,
        comboRows,
        quedaRows,
      ] = await Promise.all([

        // ── [0] Reposição urgente ──────────────────────────────────
        // Estoque ≤ mínimo E vendeu > 2 unidades nos últimos 30 dias
        safeQuery(`
          SELECT
            p.nome, p.codigo, p.categoria,
            p.quantidade_estoque, p.estoque_minimo,
            COALESCE(v30.vendas_30d, 0) AS vendas_30d
          FROM produtos p
          LEFT JOIN (
            SELECT iv.produto_id, SUM(iv.quantidade) AS vendas_30d
            FROM itens_venda iv
            JOIN vendas v ON iv.venda_id = v.id
            WHERE v.status = 'concluida'
              AND v.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY iv.produto_id
          ) v30 ON v30.produto_id = p.id
          WHERE p.ativo = 1
            AND p.quantidade_estoque <= p.estoque_minimo
            AND COALESCE(v30.vendas_30d, 0) > 2
          ORDER BY vendas_30d DESC
          LIMIT 6
        `),

        // ── [1] Estoque zerado ─────────────────────────────────────
        safeQuery(`
          SELECT nome, codigo, categoria, quantidade_estoque
          FROM produtos
          WHERE ativo = 1 AND quantidade_estoque = 0
          ORDER BY nome
          LIMIT 6
        `),

        // ── [2] Produto parado (sem venda há ≥ 60 dias) ───────────
        safeQuery(`
          SELECT
            p.nome, p.codigo, p.categoria,
            p.quantidade_estoque,
            COALESCE(
              DATEDIFF(NOW(), MAX(v.criado_em)),
              999
            ) AS dias_sem_venda
          FROM produtos p
          LEFT JOIN itens_venda iv ON iv.produto_id = p.id
          LEFT JOIN vendas v
            ON iv.venda_id = v.id AND v.status = 'concluida'
          WHERE p.ativo = 1 AND p.quantidade_estoque > 0
          GROUP BY p.id, p.nome, p.codigo, p.categoria, p.quantidade_estoque
          HAVING COALESCE(DATEDIFF(NOW(), MAX(v.criado_em)), 999) >= 60
          ORDER BY dias_sem_venda DESC
          LIMIT 5
        `),

        // ── [3] Categorias em crescimento (+20% vs 30d anterior) ──
        safeQuery(`
          SELECT
            p.categoria,
            SUM(CASE
              WHEN v.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN iv.quantidade ELSE 0
            END) AS atual,
            SUM(CASE
              WHEN v.criado_em >= DATE_SUB(NOW(), INTERVAL 60 DAY)
               AND v.criado_em <  DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN iv.quantidade ELSE 0
            END) AS anterior
          FROM itens_venda iv
          JOIN produtos p ON iv.produto_id = p.id
          JOIN vendas v   ON iv.venda_id   = v.id AND v.status = 'concluida'
          WHERE v.criado_em >= DATE_SUB(NOW(), INTERVAL 60 DAY)
          GROUP BY p.categoria
          HAVING
            anterior > 0
            AND atual > anterior * 1.2
            AND atual >= 4
          ORDER BY (atual - anterior) DESC
          LIMIT 4
        `),

        // ── [4] Sazonalidade: top categorias no mesmo mês do ano passado ──
        safeQuery(`
          SELECT
            p.categoria,
            SUM(iv.quantidade) AS total_historico
          FROM itens_venda iv
          JOIN produtos p ON iv.produto_id = p.id
          JOIN vendas v   ON iv.venda_id   = v.id AND v.status = 'concluida'
          WHERE
            MONTH(v.criado_em) = MONTH(DATE_ADD(NOW(), INTERVAL 1 MONTH))
            AND YEAR(v.criado_em) < YEAR(NOW())
          GROUP BY p.categoria
          ORDER BY total_historico DESC
          LIMIT 4
        `),

        // ── [5] Combos: pares comprados juntos ≥ 2 vezes ──────────
        // IMPORTANT: inclui p1.nome, p2.nome, p1.categoria no GROUP BY
        // para ser compatível com ONLY_FULL_GROUP_BY do MySQL 5.7+
        safeQuery(`
          SELECT
            p1.nome       AS produto1,
            p2.nome       AS produto2,
            p1.categoria  AS categoria1,
            COUNT(*)      AS vezes_juntos
          FROM itens_venda iv1
          JOIN itens_venda iv2
            ON  iv1.venda_id   = iv2.venda_id
            AND iv1.produto_id < iv2.produto_id
          JOIN produtos p1 ON iv1.produto_id = p1.id
          JOIN produtos p2 ON iv2.produto_id = p2.id
          JOIN vendas v    ON iv1.venda_id   = v.id AND v.status = 'concluida'
          GROUP BY
            iv1.produto_id, iv2.produto_id,
            p1.nome, p2.nome, p1.categoria
          HAVING COUNT(*) >= 2
          ORDER BY vezes_juntos DESC
          LIMIT 4
        `),

        // ── [6] Queda nas vendas (caiu ≥ 50% vs período anterior) ─
        safeQuery(`
          SELECT
            p.nome, p.codigo, p.categoria,
            SUM(CASE
              WHEN v.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN iv.quantidade ELSE 0
            END) AS atual,
            SUM(CASE
              WHEN v.criado_em >= DATE_SUB(NOW(), INTERVAL 60 DAY)
               AND v.criado_em <  DATE_SUB(NOW(), INTERVAL 30 DAY)
              THEN iv.quantidade ELSE 0
            END) AS anterior
          FROM itens_venda iv
          JOIN produtos p ON iv.produto_id = p.id
          JOIN vendas v   ON iv.venda_id   = v.id AND v.status = 'concluida'
          WHERE v.criado_em >= DATE_SUB(NOW(), INTERVAL 60 DAY)
          GROUP BY p.id, p.nome, p.codigo, p.categoria
          HAVING anterior >= 4 AND atual < anterior * 0.5
          ORDER BY (anterior - atual) DESC
          LIMIT 4
        `),
      ]);

      const insights: BiInsight[] = [];

      // ── Regra 1: Estoque Zerado (Alta) ───────────────────────────
      for (const r of estoqueZeradoRows) {
        insights.push({
          id:         `zero_${slug(r.codigo)}`,
          tipo:       'estoque_zerado',
          titulo:     `Estoque Zerado – ${r.nome}`,
          mensagem:   `${r.nome} (${r.categoria}) está completamente sem estoque. Vendas deste item serão recusadas até a reposição. Realize a compra com urgência.`,
          prioridade: 'alta',
          tag:        'Estoque',
          produto:    r.nome,
          categoria:  r.categoria,
          dados:      { estoque_atual: 0 },
        });
      }

      // ── Regra 2: Reposição Urgente (Alta) ────────────────────────
      for (const r of reposicaoRows) {
        const qtdAtual = Number(r.quantidade_estoque);
        const qtdMin   = Number(r.estoque_minimo);
        const vend30   = Number(r.vendas_30d);
        if (qtdAtual === 0) continue; // já coberto pela regra anterior

        insights.push({
          id:         `rep_${slug(r.codigo)}`,
          tipo:       'reposicao',
          titulo:     `Reposição Urgente – ${r.nome}`,
          mensagem:   `Produto vendeu ${vend30} unidade(s) nos últimos 30 dias e tem apenas ${qtdAtual} em estoque (mínimo: ${qtdMin}). Déficit de ${qtdMin - qtdAtual} unidade(s). Reponha antes do próximo pico de vendas.`,
          prioridade: 'alta',
          tag:        'Estoque',
          produto:    r.nome,
          categoria:  r.categoria,
          dados: {
            estoque_atual:  qtdAtual,
            estoque_minimo: qtdMin,
            vendas_30d:     vend30,
            deficit:        qtdMin - qtdAtual,
          },
        });
      }

      // ── Regra 3: Produto Parado (Média / Baixa) ───────────────────
      for (const r of produtosParadosRows) {
        const dias: number       = Number(r.dias_sem_venda);
        const diasLabel: string  = dias >= 999 ? 'mais de 60' : String(dias);
        const prioridade: Prioridade = dias >= 120 ? 'media' : 'baixa';

        insights.push({
          id:         `parado_${slug(r.codigo)}`,
          tipo:       'produto_parado',
          titulo:     `Produto Sem Movimentação – ${r.nome}`,
          mensagem:   `${r.nome} não registra vendas há ${diasLabel} dias com ${r.quantidade_estoque} unidade(s) em estoque. Capital parado. Considere criar uma promoção ou liquidação.`,
          prioridade,
          tag:        'Promoção',
          produto:    r.nome,
          categoria:  r.categoria,
          dados: {
            dias_sem_venda:     dias >= 999 ? 60 : dias,
            quantidade_estoque: Number(r.quantidade_estoque),
          },
        });
      }

      // ── Regra 4: Categoria em Crescimento (Baixa / Média) ─────────
      for (const r of crescimentoRows) {
        const atual    = Number(r.atual);
        const anterior = Number(r.anterior);
        const varPct   = calcPct(atual, anterior);

        insights.push({
          id:         `cresc_${slug(r.categoria)}`,
          tipo:       'crescimento',
          titulo:     `Categoria em Alta – ${r.categoria}`,
          mensagem:   `A categoria ${r.categoria} cresceu ${varPct}% em volume de vendas (${anterior} → ${atual} unidades nos últimos 30 dias). Considere ampliar o mix ou antecipar compras para não perder vendas.`,
          prioridade: varPct >= 50 ? 'media' : 'baixa',
          tag:        'Vendas',
          categoria:  r.categoria,
          dados: {
            crescimento_pct: varPct,
            vendas_atual:    atual,
            vendas_anterior: anterior,
          },
        });
      }

      // ── Regra 5: Sazonalidade (Média) ────────────────────────────
      const mesAtual  = new Date().getMonth() + 1;
      const mesAlvo   = mesAtual === 12 ? 1 : mesAtual + 1;
      const mesLabel  = MESES_PT[mesAlvo] ?? '';
      const mesMaiusc = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

      for (const r of sazonalidadeRows) {
        insights.push({
          id:         `saz_${slug(r.categoria)}_${mesAlvo}`,
          tipo:       'sazonalidade',
          titulo:     `Prepare para ${mesMaiusc} – ${r.categoria}`,
          mensagem:   `Historicamente, ${r.categoria} tem alta procura em ${mesLabel} (${r.total_historico} unidades vendidas no mesmo mês em anos anteriores). Planeje compras com antecedência para garantir disponibilidade.`,
          prioridade: 'media',
          tag:        'Sazonalidade',
          categoria:  r.categoria,
          dados: {
            historico_unidades: Number(r.total_historico),
          },
        });
      }

      // ── Regra 6: Combo Sugerido (Baixa) ──────────────────────────
      for (const r of comboRows) {
        const n1 = String(r.produto1);
        const n2 = String(r.produto2);
        insights.push({
          id:         `combo_${slug(n1)}_${slug(n2)}`,
          tipo:       'combo',
          titulo:     'Oportunidade de Combo',
          mensagem:   `"${n1}" e "${n2}" foram comprados juntos em ${r.vezes_juntos} venda(s). Crie um pacote promocional para aumentar o ticket médio e facilitar a decisão de compra.`,
          prioridade: 'baixa',
          tag:        'Promoção',
          dados: {
            produto1:     n1,
            produto2:     n2,
            vezes_juntos: Number(r.vezes_juntos),
          },
        });
      }

      // ── Regra 7: Queda nas Vendas (Baixa / Média) ─────────────────
      for (const r of quedaRows) {
        const atual    = Number(r.atual);
        const anterior = Number(r.anterior);
        const quedaPct = Math.abs(calcPct(atual, anterior));

        insights.push({
          id:         `queda_${slug(r.codigo)}`,
          tipo:       'queda',
          titulo:     `Queda nas Vendas – ${r.nome}`,
          mensagem:   `${r.nome} vendeu ${anterior} unidades no período anterior, mas apenas ${atual} nos últimos 30 dias (queda de ${quedaPct}%). Avalie desconto promocional ou revisão de preço.`,
          prioridade: quedaPct >= 75 ? 'media' : 'baixa',
          tag:        'Vendas',
          produto:    r.nome,
          categoria:  r.categoria,
          dados: {
            vendas_atual:    atual,
            vendas_anterior: anterior,
            queda_pct:       quedaPct,
          },
        });
      }

      // Ordena: Alta → Média → Baixa
      insights.sort(
        (a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]
      );

      res.json(insights);
    } catch (err) {
      logger.erro('Erro ao gerar BI insights', err);
      res.status(500).json({ erro: 'Erro ao gerar insights de BI' });
    }
  }
}
