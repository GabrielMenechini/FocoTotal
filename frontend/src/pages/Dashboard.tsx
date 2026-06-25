import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import type { DashboardBiData, BiInsight, BiInsightTag } from '../types';

// ── Mini gráfico de barras verticais (últimos 7 dias) ─────────────
const WeekChart: React.FC<{ data: DashboardBiData['vendasSemana'] }> = ({ data }) => {
  // Preenche os 7 últimos dias mesmo sem vendas
  const days: { label: string; total: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const found = data.find(x => x.data?.slice(0, 10) === iso);
    days.push({
      label:   d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      total:   found ? Number(found.total) : 0,
      isToday: i === 0,
    });
  }
  const maxTotal = Math.max(1, ...days.map(d => d.total));

  return (
    <div className="week-chart">
      {days.map((d, i) => {
        const pct = (d.total / maxTotal) * 100;
        return (
          <div key={i} className="week-bar-col">
            <div className="week-bar-track">
              <div
                className={`week-bar-fill ${d.isToday ? 'today' : ''}`}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            <div className={`week-bar-label ${d.isToday ? 'today' : ''}`}>{d.label}</div>
            {d.total > 0 && (
              <div className="week-bar-val">{masks.moeda(d.total)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Barra horizontal de produto/categoria ─────────────────────────
const HBar: React.FC<{
  label: string; value: number; maxValue: number;
  color?: string; subLabel?: string;
}> = ({ label, value, maxValue, color = 'var(--primary)', subLabel }) => {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="hbar-row">
      <div className="hbar-label">
        <span>{label}</span>
        {subLabel && <span className="text-muted" style={{ fontSize: 11 }}>&nbsp;{subLabel}</span>}
      </div>
      <div className="hbar-track">
        <div className="hbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="hbar-val">{masks.moeda(value)}</div>
    </div>
  );
};

// ── Configurações visuais dos insights ───────────────────────────
const PRIO_CFG = {
  alta:  { label: 'Alta',  cls: 'bi-prio-alta',  dot: '#BB0000' },
  media: { label: 'Média', cls: 'bi-prio-media', dot: '#E9730C' },
  baixa: { label: 'Baixa', cls: 'bi-prio-baixa', dot: '#0070F2' },
} as const;

const TIPO_ICON: Record<string, string> = {
  reposicao:      '📦',
  estoque_zerado: '🚨',
  produto_parado: '😴',
  crescimento:    '📈',
  sazonalidade:   '📅',
  combo:          '🤝',
  queda:          '📉',
};

const TAG_COLORS: Record<string, string> = {
  'Estoque':      '#107E3E',
  'Vendas':       '#0070F2',
  'Sazonalidade': '#6366F1',
  'Promoção':     '#E9730C',
};

const ALL_TAGS: BiInsightTag[] = ['Estoque', 'Vendas', 'Sazonalidade', 'Promoção'];

// ── Componente de seção BI ────────────────────────────────────────
const BiSection: React.FC = () => {
  const [insights,  setInsights]  = useState<BiInsight[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState<BiInsightTag | 'Todos'>('Todos');
  const [expandido, setExpandido] = useState(true);

  useEffect(() => {
    api.get<BiInsight[]>('/bi/insights')
      .then(r => setInsights(r.data))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, []);

  const visíveis = filtro === 'Todos'
    ? insights
    : insights.filter(i => i.tag === filtro);

  const contagem = {
    Todos:        insights.length,
    Estoque:      insights.filter(i => i.tag === 'Estoque').length,
    Vendas:       insights.filter(i => i.tag === 'Vendas').length,
    Sazonalidade: insights.filter(i => i.tag === 'Sazonalidade').length,
    'Promoção':   insights.filter(i => i.tag === 'Promoção').length,
  };

  const altaCount = insights.filter(i => i.prioridade === 'alta').length;

  return (
    <div className="bi-section">
      {/* ── Cabeçalho da seção ── */}
      <div className="bi-section-header" onClick={() => setExpandido(e => !e)}>
        <div className="bi-section-title">
          <span className="bi-section-icon">🧠</span>
          <span>BI Inteligente</span>
          <span className="bi-title-sub">Dicas para Futuras Vendas e Compras</span>
        </div>
        <div className="bi-section-meta">
          {altaCount > 0 && (
            <span className="bi-alert-pill">
              🔴 {altaCount} urgente{altaCount > 1 ? 's' : ''}
            </span>
          )}
          {!loading && (
            <span className="bi-count-badge">{insights.length} recomendação{insights.length !== 1 ? 'ões' : ''}</span>
          )}
          <span className="bi-toggle">{expandido ? '▲' : '▼'}</span>
        </div>
      </div>

      {expandido && (
        <>
          {/* ── Chips de filtro ── */}
          <div className="bi-filters">
            {(['Todos', ...ALL_TAGS] as const).map(tag => (
              <button
                key={tag}
                className={`bi-chip ${filtro === tag ? 'bi-chip-active' : ''}`}
                onClick={() => setFiltro(tag)}
              >
                {tag}
                {contagem[tag] > 0 && (
                  <span className="bi-chip-count">{contagem[tag]}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Corpo ── */}
          {loading ? (
            <div className="bi-loading">
              <div className="spinner" />
              <span>Analisando dados...</span>
            </div>
          ) : visíveis.length === 0 ? (
            <div className="bi-empty">
              <div className="bi-empty-icon">✅</div>
              <div className="bi-empty-title">Nenhuma recomendação no momento</div>
              <div className="bi-empty-sub">
                {filtro === 'Todos'
                  ? 'O sistema está monitorando os dados. Novas dicas surgirão conforme as vendas avançam.'
                  : `Nenhuma dica na categoria "${filtro}" no momento.`}
              </div>
            </div>
          ) : (
            <div className="bi-grid">
              {visíveis.map(insight => {
                const prio = PRIO_CFG[insight.prioridade];
                const icon = TIPO_ICON[insight.tipo] ?? '💡';
                const tagColor = TAG_COLORS[insight.tag] ?? '#666';
                return (
                  <div key={insight.id} className={`bi-card bi-card-${insight.prioridade}`}>
                    {/* Cabeçalho do card */}
                    <div className="bi-card-head">
                      <span className="bi-card-icon">{icon}</span>
                      <div className="bi-card-badges">
                        <span className={`bi-prio-badge ${prio.cls}`}>
                          <span className="bi-prio-dot" style={{ background: prio.dot }} />
                          {prio.label}
                        </span>
                        <span className="bi-tag-chip" style={{ color: tagColor, borderColor: tagColor }}>
                          {insight.tag}
                        </span>
                      </div>
                    </div>

                    {/* Título */}
                    <div className="bi-card-title">{insight.titulo}</div>

                    {/* Mensagem */}
                    <div className="bi-card-msg">{insight.mensagem}</div>

                    {/* Mini-dados opcionais */}
                    {insight.dados && Object.keys(insight.dados).length > 0 && (
                      <div className="bi-card-data">
                        {Object.entries(insight.dados)
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <span key={k} className="bi-data-pill">
                              <span className="bi-data-key">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="bi-data-val">
                                {typeof v === 'number' && k.includes('pct')
                                  ? `${v}%`
                                  : typeof v === 'number' && (k.includes('total') || k.includes('receita') || k.includes('custo'))
                                    ? masks.moeda(v)
                                    : v}
                              </span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const [data,    setData]    = useState<DashboardBiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState('');

  useEffect(() => {
    api.get<DashboardBiData>('/relatorios/dashboard-bi')
      .then(r => setData(r.data))
      .catch(() => setErro('Erro ao carregar dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <p className="text-muted" style={{ marginTop: 12 }}>Carregando dashboard...</p>
      </div>
    );
  }

  if (erro || !data) {
    return <div className="alert alert-danger">{erro || 'Sem dados.'}</div>;
  }

  const {
    vendasHoje, totalProdutos, totalClientes, estoqueBaixo,
    ultimasVendas, ticketMedio, lucroHoje,
    topProdutos, vendasSemana, categorias,
  } = data;

  const maxTopProd = Math.max(1, ...topProdutos.map(p => Number(p.total_valor)));
  const maxCateg   = Math.max(1, ...categorias.map(c => Number(c.total)));

  const CATEG_COLORS = ['#0070F2','#107E3E','#6366F1','#E9730C','#BB0000'];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral e indicadores de negócio</div>
        </div>
        <span className="updated-tag" style={{ alignSelf: 'center' }}>
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* ── Alerta estoque baixo ── */}
      {Number(estoqueBaixo) > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️&nbsp;<strong>{estoqueBaixo} produto(s)</strong> com estoque abaixo do mínimo.
          &nbsp;<a href="/estoque" style={{ color: 'inherit', fontWeight: 600 }}>Ver estoque →</a>
        </div>
      )}

      {/* ── KPIs principais ── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Receita Hoje</div>
          <div className="kpi-value">{masks.moeda(Number(vendasHoje.valor))}</div>
          <div className="kpi-sub">{vendasHoje.total} venda(s) realizadas</div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Lucro Estimado</div>
          <div className="kpi-value">{masks.moeda(Number(lucroHoje.lucro))}</div>
          <div className="kpi-sub">{Number(lucroHoje.margem_pct).toFixed(1)}% de margem</div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">🛒</div>
          <div className="kpi-label">Vendas Hoje</div>
          <div className="kpi-value">{vendasHoje.total}</div>
          <div className="kpi-sub">Ticket médio: {masks.moeda(Number(ticketMedio))}</div>
        </div>

        <div className={`kpi-card ${Number(estoqueBaixo) > 0 ? 'kpi-red' : 'kpi-teal'}`}>
          <div className="kpi-icon">{Number(estoqueBaixo) > 0 ? '⚠️' : '✅'}</div>
          <div className="kpi-label">Estoque Crítico</div>
          <div className="kpi-value">{estoqueBaixo}</div>
          <div className="kpi-sub">produto(s) abaixo do mínimo</div>
        </div>
      </div>

      {/* ── Contadores secundários ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card primary">
          <div className="stat-label">Total de Produtos</div>
          <div className="stat-value">{totalProdutos}</div>
          <div className="stat-hint">produtos cadastrados ativos</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Total de Clientes</div>
          <div className="stat-value">{totalClientes}</div>
          <div className="stat-hint">clientes cadastrados ativos</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Receita Acumulada (30d)</div>
          <div className="stat-value">
            {masks.moeda(vendasSemana.reduce((s, v) => s + Number(v.total), 0))}
          </div>
          <div className="stat-hint">últimos 7 dias exibidos abaixo</div>
        </div>
      </div>

      {/* ── Tendência semanal + Top produtos ── */}
      <div className="two-col-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">📅 Vendas – Últimos 7 Dias</div>
          <div className="card-body">
            {vendasSemana.length === 0 ? (
              <p className="text-muted">Sem dados de vendas recentes.</p>
            ) : (
              <WeekChart data={vendasSemana} />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">🏆 Top Produtos (30 dias)</div>
          <div className="card-body">
            {topProdutos.length === 0 ? (
              <p className="text-muted">Sem vendas no período.</p>
            ) : (
              topProdutos.map((p, i) => (
                <HBar
                  key={i}
                  label={p.nome}
                  subLabel={`${p.total_vendido} un`}
                  value={Number(p.total_valor)}
                  maxValue={maxTopProd}
                  color={CATEG_COLORS[i] ?? 'var(--primary)'}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Categorias + Últimas vendas ── */}
      <div className="two-col-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">🗂️ Categorias Mais Vendidas (30 dias)</div>
          <div className="card-body">
            {categorias.length === 0 ? (
              <p className="text-muted">Sem dados no período.</p>
            ) : (
              categorias.map((c, i) => (
                <HBar
                  key={i}
                  label={c.categoria}
                  value={Number(c.total)}
                  maxValue={maxCateg}
                  color={CATEG_COLORS[i] ?? 'var(--primary)'}
                />
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">🧾 Últimas Vendas</div>
          <div style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>#</th><th>Cliente</th><th>Valor</th><th>Data/Hora</th></tr>
                </thead>
                <tbody>
                  {ultimasVendas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="empty-state">Nenhuma venda registrada.</td>
                    </tr>
                  )}
                  {ultimasVendas.map(v => (
                    <tr key={v.id}>
                      <td className="fw-600">#{v.id}</td>
                      <td>{v.cliente_nome ?? '— Consumidor Final —'}</td>
                      <td className="fw-600">{masks.moeda(Number(v.valor_final))}</td>
                      <td className="text-muted" style={{ fontSize: 12 }}>
                        {masks.dataHora(v.criado_em ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── BI Inteligente ── */}
      <BiSection />
    </>
  );
};

export default Dashboard;
