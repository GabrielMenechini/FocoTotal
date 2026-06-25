import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { masks } from '../utils/masks';
import { type CaixaData } from '../types';

const TIPO_DESPESA_LABELS: Record<string, string> = {
  compra_estoque:         'Compra de Estoque',
  despesa_administrativa: 'Despesa Administrativa',
  pagamento_fornecedor:   'Pagamento a Fornecedor',
  outro:                  'Outro',
};

// ── Gráfico de barras verticais por hora ──────────────────────────
const HourlyChart: React.FC<{ data: CaixaData['vendasPorHora'] }> = ({ data }) => {
  const HOURS  = Array.from({ length: 14 }, (_, i) => i + 7);
  const map    = new Map(data.map(d => [d.hora, d]));
  const maxQtd = Math.max(1, ...data.map(d => Number(d.qtd)));
  const W = 620, H = 110, PAD_L = 8, BAR_W = 32, GAP = 11;

  return (
    <div className="hourly-wrap">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="hourly-svg" aria-label="Vendas por horário">
        {HOURS.map((h, i) => {
          const item = map.get(h);
          const qtd  = item ? Number(item.qtd) : 0;
          const barH = Math.max(3, (qtd / maxQtd) * H);
          const x    = PAD_L + i * (BAR_W + GAP);
          const y    = H - barH;
          return (
            <g key={h}>
              <rect x={x} y={y} width={BAR_W} height={barH}
                fill={qtd > 0 ? 'var(--primary)' : '#E8E8E8'} rx={4} opacity={qtd > 0 ? 0.88 : 1} />
              {qtd > 0 && (
                <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle"
                  fontSize={10} fill="var(--primary)" fontWeight={700}>{qtd}</text>
              )}
              <text x={x + BAR_W / 2} y={H + 18} textAnchor="middle" fontSize={10} fill="var(--text-sec)">
                {h}h
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Barra horizontal de produto ───────────────────────────────────
const ProdBar: React.FC<{
  nome: string; qtd: number; maxQtd: number; total: number; rank: number;
}> = ({ nome, qtd, maxQtd, total, rank }) => {
  const pct = maxQtd > 0 ? (qtd / maxQtd) * 100 : 0;
  const colors = ['#0070F2','#107E3E','#6366F1','#E9730C','#BB0000',
                  '#0891B2','#7C3AED','#D97706','#059669','#DC2626'];
  return (
    <div className="prod-bar-row">
      <span className="prod-bar-rank" style={{ background: colors[rank] ?? '#999' }}>{rank + 1}</span>
      <span className="prod-bar-name">{nome}</span>
      <div className="prod-bar-track">
        <div className="prod-bar-fill" style={{ width: `${pct}%`, background: colors[rank] ?? '#999' }} />
      </div>
      <span className="prod-bar-qty">{qtd} un</span>
      <span className="prod-bar-val">{masks.moeda(Number(total))}</span>
    </div>
  );
};

// ── Barra horizontal genérica (produto/categoria) ─────────────────
const HBarItem: React.FC<{
  label: string; total: number; maxTotal: number; sub: string; cor: string;
}> = ({ label, total, maxTotal, sub, cor }) => {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  return (
    <div className="pay-row">
      <div className="pay-info" style={{ flex: 1 }}>
        <div className="pay-name">{label}</div>
        <div className="pay-bar-track">
          <div className="pay-bar-fill" style={{ width: `${pct}%`, background: cor }} />
        </div>
      </div>
      <div className="pay-right">
        <div className="pay-total">{masks.moeda(Number(total))}</div>
        <div className="pay-count">{sub}</div>
      </div>
    </div>
  );
};

const CAT_COLORS = ['#BB0000','#E9730C','#6366F1','#0891B2','#107E3E',
                    '#D97706','#7C3AED','#059669','#DC2626','#0070F2'];

// ═══════════════════════════════════════════════════════════════════
const Caixa: React.FC = () => {
  const navigate = useNavigate();
  const [data,         setData]         = useState<CaixaData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [erro,         setErro]         = useState('');
  const [atualizadoEm, setAtualizadoEm] = useState('');

  const carregar = async () => {
    setLoading(true); setErro('');
    try {
      const r = await api.get<CaixaData>('/relatorios/caixa');
      setData(r.data);
      setAtualizadoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setErro('Não foi possível carregar os dados do caixa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <p className="text-muted" style={{ marginTop: 12 }}>Carregando caixa...</p>
    </div>
  );
  if (erro)  return <div className="alert alert-danger">{erro}</div>;
  if (!data) return null;

  const {
    resumoHoje, lucro, produtosMaisVendidos,
    vendasPorHora, ultimasVendas, estoqueBaixo, comparacaoOntem,
    despesasHoje         = { total_despesas: 0, qtd_despesas: 0 },
    ultimasDespesas      = [],
    despesasPorCategoria = [],
    gastosReabastecimento  = { total_gasto: 0, qtd_entradas: 0 },
    produtosReabastecidos  = [],
  } = data;

  const totalEntradas        = Number(resumoHoje.total_vendido);
  const totalReabastecimento = Number(gastosReabastecimento.total_gasto);
  const totalSaidas          = totalReabastecimento; // mesma fonte do "Total Investido Hoje"
  const saldoHoje            = totalEntradas - totalSaidas;
  const lucroEstimado        = Number(lucro.lucro_estimado);
  const totalVendidoOntem    = Number(comparacaoOntem.total_vendido);
  const maxReabTotal         = Math.max(1, ...produtosReabastecidos.map(p => Number(p.total_gasto)));

  const variacaoPct = totalVendidoOntem > 0
    ? ((totalEntradas - totalVendidoOntem) / totalVendidoOntem) * 100
    : null;

  const maxQtdProd = Math.max(1, ...produtosMaisVendidos.map(p => Number(p.qtd)));

  const dataLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      {/* ── Cabeçalho ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Caixa – Resumo Diário</div>
          <div className="page-subtitle" style={{ textTransform: 'capitalize' }}>
            {dataLabel}
            {atualizadoEm && <span className="updated-tag">Atualizado às {atualizadoEm}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={carregar}>↻ Atualizar</button>
        </div>
      </div>

      {/* ── Alerta estoque ── */}
      {estoqueBaixo.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️&nbsp;<strong>{estoqueBaixo.length} produto(s)</strong> com estoque abaixo do mínimo.
        </div>
      )}

      {/* ── Tira de Fluxo Financeiro ── */}
      <div className="fluxo-strip">
        <div className="fluxo-item fluxo-entrada">
          <div className="fluxo-arrow">↑</div>
          <div className="fluxo-info">
            <div className="fluxo-label">Total de Entradas</div>
            <div className="fluxo-value">{masks.moeda(totalEntradas)}</div>
            <div className="fluxo-sub">{resumoHoje.qtd_vendas} venda(s) hoje</div>
          </div>
        </div>

        <div className="fluxo-divider" />

        <div className="fluxo-item fluxo-saida">
          <div className="fluxo-arrow">↓</div>
          <div className="fluxo-info">
            <div className="fluxo-label">Saídas do Caixa Hoje</div>
            <div className="fluxo-value">{masks.moeda(totalSaidas)}</div>
            <div className="fluxo-sub">{gastosReabastecimento.qtd_entradas} entrada(s) de estoque</div>
          </div>
        </div>

        <div className="fluxo-divider" />

        <div className={`fluxo-item ${saldoHoje >= 0 ? 'fluxo-saldo-pos' : 'fluxo-saldo-neg'}`}>
          <div className="fluxo-arrow">=</div>
          <div className="fluxo-info">
            <div className="fluxo-label">Saldo do Período</div>
            <div className="fluxo-value">{masks.moeda(saldoHoje)}</div>
            <div className="fluxo-sub">Entradas – Saídas</div>
          </div>
        </div>

        <div className="fluxo-divider" />

        <div className="fluxo-item fluxo-lucro">
          <div className="fluxo-arrow">📈</div>
          <div className="fluxo-info">
            <div className="fluxo-label">Lucro Estimado</div>
            <div className="fluxo-value">{masks.moeda(lucroEstimado)}</div>
            <div className="fluxo-sub">{Number(lucro.margem_percentual).toFixed(1)}% de margem</div>
          </div>
        </div>
      </div>

      {/* ── KPIs secundários ── */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Vendas Realizadas</div>
          <div className="kpi-value">{resumoHoje.qtd_vendas}</div>
          {comparacaoOntem.qtd_vendas > 0 && (
            <div className="kpi-sub">Ontem: {comparacaoOntem.qtd_vendas} vendas</div>
          )}
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">📊</div>
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value">{masks.moeda(Number(resumoHoje.ticket_medio))}</div>
        </div>

        <div className="kpi-card kpi-orange">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Receita Bruta</div>
          <div className="kpi-value">{masks.moeda(Number(lucro.receita))}</div>
          <div className="kpi-sub">Custo: {masks.moeda(Number(lucro.custo))}</div>
        </div>

        <div className="kpi-card kpi-teal">
          <div className="kpi-icon">📅</div>
          <div className="kpi-label">Variação vs. Ontem</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {variacaoPct !== null ? (
              <span style={{ color: variacaoPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {variacaoPct >= 0 ? '▲' : '▼'} {Math.abs(variacaoPct).toFixed(1)}%
              </span>
            ) : '—'}
          </div>
          <div className="kpi-sub">Ontem: {masks.moeda(totalVendidoOntem)}</div>
        </div>
      </div>

      {/* ── Reabastecimento de Estoque + Comparação ── */}
      <div className="two-col-grid" style={{ marginBottom: 20 }}>
        {/* Gastos com Reabastecimento de Estoque */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span>📦 Gastos com Reabastecimento de Estoque</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '3px 10px' }}
              onClick={() => navigate('/estoque')}
            >Ver Movimentações →</button>
          </div>
          <div className="card-body">
            {totalReabastecimento === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p className="text-muted">
                  Nenhum reabastecimento de estoque hoje.
                </p>
              </div>
            ) : (
              <>
                <div className="despesa-resumo-box">
                  <div>
                    <div className="despesa-resumo-label">Total Investido Hoje</div>
                    <div className="despesa-resumo-val">{masks.moeda(totalReabastecimento)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="despesa-resumo-label">Entradas de Estoque</div>
                    <div className="despesa-resumo-val" style={{ color: 'var(--text)' }}>
                      {gastosReabastecimento.qtd_entradas}
                    </div>
                  </div>
                </div>
                {produtosReabastecidos.map((p, i) => (
                  <HBarItem
                    key={`${p.codigo}-${i}`}
                    label={`${p.codigo} – ${p.nome}`}
                    total={Number(p.total_gasto)}
                    maxTotal={maxReabTotal}
                    sub={`${p.qtd_adicionada} un. × ${masks.moeda(Number(p.preco_custo))}`}
                    cor={CAT_COLORS[i % CAT_COLORS.length]}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Comparação com ontem */}
        <div className="card">
          <div className="card-header">📅 Comparação com Ontem</div>
          <div className="card-body">
            <div className="cmp-row">
              <span className="cmp-day">Hoje</span>
              <span className="cmp-val">{masks.moeda(totalEntradas)}</span>
              <span className="cmp-qtd">{resumoHoje.qtd_vendas} vendas</span>
            </div>
            <div className="cmp-divider" />
            <div className="cmp-row">
              <span className="cmp-day text-muted">Ontem</span>
              <span className="cmp-val text-muted">{masks.moeda(totalVendidoOntem)}</span>
              <span className="cmp-qtd">{comparacaoOntem.qtd_vendas} vendas</span>
            </div>

            {variacaoPct !== null ? (
              <div className={`variation-pill ${variacaoPct >= 0 ? 'var-up' : 'var-down'}`}>
                {variacaoPct >= 0 ? '▲' : '▼'}&nbsp;
                {Math.abs(variacaoPct).toFixed(1)}%&nbsp;
                <span style={{ fontWeight: 400 }}>
                  {variacaoPct >= 0 ? 'acima de ontem' : 'abaixo de ontem'}
                </span>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: 13, marginTop: 12 }}>
                Sem dados de ontem para comparar.
              </p>
            )}

            <div className="cmp-divider" />
            <div className="cmp-row" style={{ marginTop: 8 }}>
              <span className="cmp-day text-muted">Receita bruta</span>
              <span className="cmp-val">{masks.moeda(Number(lucro.receita))}</span>
            </div>
            <div className="cmp-row">
              <span className="cmp-day text-muted">Custo dos produtos</span>
              <span className="cmp-val" style={{ color: 'var(--danger)' }}>
                – {masks.moeda(Number(lucro.custo))}
              </span>
            </div>
            <div className="cmp-row">
              <span className="cmp-day text-muted">Ticket médio</span>
              <span className="cmp-val" style={{ fontSize: 14 }}>
                {masks.moeda(Number(resumoHoje.ticket_medio))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Produtos mais vendidos ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">🏆 Produtos Mais Vendidos Hoje</div>
        <div className="card-body">
          {produtosMaisVendidos.length === 0 ? (
            <p className="text-muted">Nenhuma venda registrada hoje.</p>
          ) : (
            produtosMaisVendidos.slice(0, 8).map((p, i) => (
              <ProdBar key={i} nome={p.nome} qtd={Number(p.qtd)}
                maxQtd={maxQtdProd} total={Number(p.total)} rank={i} />
            ))
          )}
        </div>
      </div>

      {/* ── Vendas por horário ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">🕐 Vendas por Horário</div>
        <div className="card-body">
          {vendasPorHora.length === 0 ? (
            <p className="text-muted">Nenhuma venda registrada hoje.</p>
          ) : <HourlyChart data={vendasPorHora} />}
        </div>
      </div>

      {/* ── Últimas vendas + Estoque crítico ── */}
      <div className="two-col-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">🧾 Últimas Vendas do Dia</div>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr><th>#</th><th>Cliente</th><th>Pagamento</th><th>Valor</th><th>Hora</th></tr>
              </thead>
              <tbody>
                {ultimasVendas.length === 0 && (
                  <tr><td colSpan={5} className="empty-state">Sem vendas hoje.</td></tr>
                )}
                {ultimasVendas.map(v => (
                  <tr key={v.id}>
                    <td className="fw-600">#{v.id}</td>
                    <td>{v.cliente_nome ?? '— Final —'}</td>
                    <td><span className="pay-badge">{v.forma_pagamento}</span></td>
                    <td className="fw-600">{masks.moeda(Number(v.valor_final))}</td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(v.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            ⚠️ Estoque Crítico
            {estoqueBaixo.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 8 }}>{estoqueBaixo.length}</span>
            )}
          </div>
          {estoqueBaixo.length === 0 ? (
            <div className="empty-state" style={{ color: 'var(--success)' }}>
              ✓ Todos os produtos acima do mínimo
            </div>
          ) : (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>Produto</th><th>Atual</th><th>Mínimo</th></tr>
                </thead>
                <tbody>
                  {estoqueBaixo.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nome}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{p.codigo}</div>
                      </td>
                      <td>
                        <span className={`badge ${p.quantidade_estoque === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {p.quantidade_estoque}
                        </span>
                      </td>
                      <td className="text-muted">{p.estoque_minimo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Últimas Despesas do Dia ── */}
      {ultimasDespesas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span>📤 Últimas Despesas do Dia</span>
          </div>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>#</th><th>Tipo</th><th>Categoria</th>
                  <th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {ultimasDespesas.map(d => (
                  <tr key={d.id}>
                    <td className="fw-600">#{d.id}</td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: 11 }}>
                        {TIPO_DESPESA_LABELS[d.tipo as keyof typeof TIPO_DESPESA_LABELS] ?? d.tipo}
                      </span>
                    </td>
                    <td>{d.categoria}</td>
                    <td className="text-muted">{d.descricao ?? '—'}</td>
                    <td className="text-muted">{d.fornecedor ?? '—'}</td>
                    <td className="fw-600" style={{ color: 'var(--danger)' }}>
                      {masks.moeda(Number(d.valor_total))}
                    </td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default Caixa;
