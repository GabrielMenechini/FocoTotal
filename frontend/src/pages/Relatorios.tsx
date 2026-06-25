import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import { FORMA_LABELS } from '../types';

type Aba = 'mais-vendidos' | 'movimentacoes' | 'margem';

interface DetalheState {
  tipo: 'venda' | 'produto' | 'movimentacao';
  dados: any;
}

// ── Modal Venda Detalhe ───────────────────────────────────────────
const VendaDetalheModal: React.FC<{ dados: any; onClose: () => void }> = ({ dados, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-title">Detalhes da Venda #{dados.id}</div>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Cliente</span>
            <span className="detail-val">{dados.cliente_nome ?? 'Consumidor Final'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Responsável</span>
            <span className="detail-val">{dados.usuario_nome ?? dados.responsavel ?? '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Data / Hora</span>
            <span className="detail-val">{masks.dataHora(dados.criado_em ?? dados.data)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Pagamento</span>
            <span className="detail-val">
              {FORMA_LABELS[dados.forma_pagamento] ?? dados.forma_pagamento ?? '—'}
              {dados.parcelas > 1 ? ` (${dados.parcelas}×)` : ''}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className={`badge ${
              dados.status === 'concluida' ? 'badge-success' :
              dados.status === 'cancelada' ? 'badge-danger'  : 'badge-warning'
            }`}>{dados.status ?? '—'}</span>
          </div>
        </div>

        {dados.itens && dados.itens.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 8px' }}>Produtos</div>
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>Código</th><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {dados.itens.map((item: any, i: number) => (
                    <tr key={i}>
                      <td>{item.produto_codigo}</td>
                      <td className="fw-600">{item.produto_nome}</td>
                      <td>{item.quantidade}</td>
                      <td>{masks.moeda(Number(item.preco_unitario))}</td>
                      <td className="fw-600">{masks.moeda(Number(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="detail-totals">
          <div className="detail-total-row">
            <span>Subtotal</span>
            <span>{masks.moeda(Number(dados.valor_total ?? dados.valor))}</span>
          </div>
          {Number(dados.desconto) > 0 && (
            <div className="detail-total-row" style={{ color: 'var(--danger)' }}>
              <span>Desconto</span>
              <span>– {masks.moeda(Number(dados.desconto))}</span>
            </div>
          )}
          <div className="detail-total-row total-final">
            <span>Total Final</span>
            <span>{masks.moeda(Number(dados.valor_final ?? dados.valor))}</span>
          </div>
        </div>

        {dados.observacoes && (
          <div className="detail-obs">📝 {dados.observacoes}</div>
        )}
        {dados.motivo_cancelamento && (
          <div className="detail-obs" style={{ borderLeftColor: 'var(--danger)', background: 'var(--danger-lt)' }}>
            ❌ Cancelamento: {dados.motivo_cancelamento}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ── Modal Genérico (produto / movimentação) ───────────────────────
const GenDetalheModal: React.FC<{
  titulo: string;
  dados: any;
  campos: Array<{ label: string; key: string; format?: (v: any) => string }>;
  onClose: () => void;
}> = ({ titulo, dados, campos, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal modal-md" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <div className="modal-title">{titulo}</div>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="detail-grid">
          {campos.map(c => (
            <div className="detail-item" key={c.key}>
              <span className="detail-label">{c.label}</span>
              <span className="detail-val">
                {c.format ? c.format(dados[c.key]) : (dados[c.key] ?? '—')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
const Relatorios: React.FC = () => {
  const [aba,           setAba]          = useState<Aba>('mais-vendidos');
  const [dados,         setDados]        = useState<any[]>([]);
  const [loading,       setLoading]      = useState(false);
  const [inicio,        setInicio]       = useState('');
  const [fim,           setFim]          = useState('');
  const [detalhe, setDetalhe] = useState<DetalheState | null>(null);
  const [loadDet, setLoadDet] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const endpoints: Record<string, string> = {
        'mais-vendidos': '/relatorios/mais-vendidos',
        movimentacoes:   '/relatorios/movimentacoes',
        margem:          '/relatorios/margem-lucro',
      };
      const params: Record<string, string> = {};
      if (inicio) params.inicio = inicio;
      if (fim)    params.fim    = fim + ' 23:59:59';
      const { data } = await api.get(endpoints[aba], { params });
      setDados(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [aba]);

  const abrirDetalhe = async (tipo: DetalheState['tipo'], row: any) => {
    if (tipo === 'venda') {
      setLoadDet(true);
      setDetalhe({ tipo, dados: row });
      try {
        const { data } = await api.get(`/vendas/${row.id}`);
        setDetalhe({ tipo: 'venda', dados: data });
      } catch {
        setDetalhe({ tipo: 'venda', dados: row });
      } finally { setLoadDet(false); }
    } else {
      setDetalhe({ tipo, dados: row });
    }
  };

  const tabStyle = (t: Aba) => ({
    padding: '9px 18px',
    background: aba === t ? '#0070F2' : '#F5F6F7',
    color:      aba === t ? 'white'   : '#354A5E',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    fontWeight: 600 as const,
    fontSize: 13,
    marginRight: 2,
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios</div>
          <div className="page-subtitle">Análises de vendas, estoque e margem de lucro</div>
        </div>
      </div>

      {/* ── Abas ── */}
      <div style={{ display: 'flex', marginBottom: 0, borderBottom: '2px solid #E5E5E5', flexWrap: 'wrap' }}>
        <button style={tabStyle('mais-vendidos')} onClick={() => setAba('mais-vendidos')}>
          Produtos Mais Vendidos
        </button>
        <button style={tabStyle('movimentacoes')} onClick={() => setAba('movimentacoes')}>
          Movimentações de Estoque
        </button>
        <button style={tabStyle('margem')} onClick={() => setAba('margem')}>
          Margem de Lucro
        </button>
      </div>

      <div className="card" style={{ borderTopLeftRadius: 0 }}>
        <div className="card-body">

          {/* ── Filtros ── */}
          <div className="toolbar" style={{ marginBottom: 16 }}>
            {aba !== 'margem' && (
              <>
                <div className="form-group">
                  <label>Data Início</label>
                  <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Data Fim</label>
                  <input type="date" value={fim} onChange={e => setFim(e.target.value)} />
                </div>
              </>
            )}
            <div style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-primary" onClick={carregar}>Filtrar</button>
            </div>
          </div>

          {loading && <p className="text-muted" style={{ padding: '20px 0' }}>Carregando...</p>}

          {/* ── Mais Vendidos ── */}
          {!loading && aba === 'mais-vendidos' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>#</th><th>Código</th><th>Produto</th><th>Categoria</th>
                    <th>Qtd. Vendida</th><th>Total (R$)</th><th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={7} className="empty-state">Nenhum dado encontrado.</td></tr>}
                  {dados.map((d, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{d.codigo}</td>
                      <td className="fw-600">{d.nome}</td>
                      <td>{d.categoria}</td>
                      <td>{d.total_vendido}</td>
                      <td className="fw-600">{masks.moeda(Number(d.total_valor))}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => abrirDetalhe('produto', d)}>Ver Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Movimentações ── */}
          {!loading && aba === 'movimentacoes' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>Tipo</th><th>Produto</th><th>Código</th><th>Qtd.</th>
                    <th>Custo Unit.</th><th>Total Investido</th>
                    <th>Motivo</th><th>Usuário</th><th>Data</th><th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={10} className="empty-state">Nenhum dado encontrado.</td></tr>}
                  {dados.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`badge ${d.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}`}>
                          {d.tipo}
                        </span>
                      </td>
                      <td className="fw-600">{d.produto_nome}</td>
                      <td>{d.codigo}</td>
                      <td>{d.quantidade}</td>
                      <td className="text-muted">
                        {d.tipo === 'entrada' ? masks.moeda(Number(d.preco_custo)) : '—'}
                      </td>
                      <td>
                        {d.tipo === 'entrada' && d.total_gasto != null
                          ? <span className="fw-600" style={{ color: 'var(--danger)' }}>
                              {masks.moeda(Number(d.total_gasto))}
                            </span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className="text-muted">{d.motivo}</td>
                      <td>{d.usuario_nome}</td>
                      <td className="text-muted">{masks.dataHora(d.criado_em)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => abrirDetalhe('movimentacao', d)}>Ver Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Margem de Lucro ── */}
          {!loading && aba === 'margem' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>Código</th><th>Produto</th><th>Categoria</th>
                    <th>Custo</th><th>Venda</th><th>Margem (R$)</th>
                    <th>Margem (%)</th><th>Estoque</th><th style={{ width: 120 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={9} className="empty-state">Nenhum produto encontrado.</td></tr>}
                  {dados.map((d, i) => (
                    <tr key={i}>
                      <td>{d.codigo}</td>
                      <td className="fw-600">{d.nome}</td>
                      <td>{d.categoria}</td>
                      <td>{masks.moeda(Number(d.preco_custo))}</td>
                      <td>{masks.moeda(Number(d.preco_venda))}</td>
                      <td className="fw-600 text-success">{masks.moeda(Number(d.margem_valor))}</td>
                      <td>
                        <span className={`badge ${Number(d.margem_percentual) >= 30 ? 'badge-success' : 'badge-warning'}`}>
                          {d.margem_percentual}%
                        </span>
                      </td>
                      <td>{d.quantidade_estoque}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => abrirDetalhe('produto', d)}>Ver Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* ── Modais ── */}
      {detalhe?.tipo === 'venda' && (
        <VendaDetalheModal dados={detalhe.dados} onClose={() => setDetalhe(null)} />
      )}
      {detalhe?.tipo === 'produto' && (
        <GenDetalheModal
          titulo={`Produto — ${detalhe.dados.nome ?? detalhe.dados.codigo}`}
          dados={detalhe.dados}
          onClose={() => setDetalhe(null)}
          campos={[
            { label: 'Código',          key: 'codigo' },
            { label: 'Nome',            key: 'nome' },
            { label: 'Categoria',       key: 'categoria' },
            { label: 'Preço de Custo',  key: 'preco_custo',         format: v => masks.moeda(Number(v)) },
            { label: 'Preço de Venda',  key: 'preco_venda',         format: v => masks.moeda(Number(v)) },
            { label: 'Margem (R$)',     key: 'margem_valor',        format: v => v != null ? masks.moeda(Number(v)) : '—' },
            { label: 'Margem (%)',      key: 'margem_percentual',   format: v => v != null ? `${v}%` : '—' },
            { label: 'Qtd. Vendida',    key: 'total_vendido',       format: v => v ?? '—' },
            { label: 'Faturamento',     key: 'total_valor',         format: v => v != null ? masks.moeda(Number(v)) : '—' },
            { label: 'Estoque Atual',   key: 'quantidade_estoque' },
          ]}
        />
      )}
      {detalhe?.tipo === 'movimentacao' && (
        <GenDetalheModal
          titulo="Movimentação de Estoque"
          dados={detalhe.dados}
          onClose={() => setDetalhe(null)}
          campos={[
            { label: 'Tipo',             key: 'tipo' },
            { label: 'Produto',          key: 'produto_nome' },
            { label: 'Código',           key: 'codigo' },
            { label: 'Quantidade',       key: 'quantidade' },
            { label: 'Custo Unitário',   key: 'preco_custo',  format: v => v != null ? masks.moeda(Number(v)) : '—' },
            { label: 'Total Investido',  key: 'total_gasto',  format: v => v != null ? masks.moeda(Number(v)) : '—' },
            { label: 'Motivo',           key: 'motivo' },
            { label: 'Usuário',          key: 'usuario_nome' },
            { label: 'Data/Hora',        key: 'criado_em',    format: v => masks.dataHora(v) },
          ]}
        />
      )}
    </>
  );
};

export default Relatorios;
