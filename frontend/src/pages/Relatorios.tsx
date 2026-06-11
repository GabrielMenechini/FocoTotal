import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';

type Aba = 'mais-vendidos' | 'movimentacoes' | 'margem';

const Relatorios: React.FC = () => {
  const [aba, setAba] = useState<Aba>('mais-vendidos');
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const endpoint = {
        'mais-vendidos': '/relatorios/mais-vendidos',
        movimentacoes: '/relatorios/movimentacoes',
        margem: '/relatorios/margem-lucro',
      }[aba];
      const params: Record<string, string> = {};
      if (inicio) params.inicio = inicio;
      if (fim) params.fim = fim + ' 23:59:59';
      const { data } = await api.get(endpoint, { params });
      setDados(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [aba]);

  const tabStyle = (t: Aba) => ({
    padding: '9px 18px',
    background: aba === t ? '#0070F2' : '#F5F6F7',
    color: aba === t ? 'white' : '#354A5E',
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
          <div className="page-subtitle">Análises de vendas, estoque e margem</div>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: 0, borderBottom: '2px solid #E5E5E5' }}>
        <button style={tabStyle('mais-vendidos')} onClick={() => setAba('mais-vendidos')}>Produtos Mais Vendidos</button>
        <button style={tabStyle('movimentacoes')} onClick={() => setAba('movimentacoes')}>Movimentações de Estoque</button>
        <button style={tabStyle('margem')} onClick={() => setAba('margem')}>Margem de Lucro</button>
      </div>

      <div className="card" style={{ borderTopLeftRadius: 0 }}>
        <div className="card-body">
          {aba !== 'margem' && (
            <div className="toolbar">
              <div className="form-group">
                <label>Data Início</label>
                <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Data Fim</label>
                <input type="date" value={fim} onChange={e => setFim(e.target.value)} />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button className="btn btn-primary" onClick={carregar}>Filtrar</button>
              </div>
            </div>
          )}

          {loading && <p className="text-muted">Carregando...</p>}

          {!loading && aba === 'mais-vendidos' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>#</th><th>Código</th><th>Produto</th><th>Categoria</th><th>Qtd. Vendida</th><th>Total (R$)</th></tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={6} className="empty-state">Nenhum dado encontrado.</td></tr>}
                  {dados.map((d, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{d.codigo}</td>
                      <td className="fw-600">{d.nome}</td>
                      <td>{d.categoria}</td>
                      <td>{d.total_vendido}</td>
                      <td className="fw-600">{masks.moeda(Number(d.total_valor))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && aba === 'movimentacoes' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>Tipo</th><th>Produto</th><th>Código</th><th>Qtd.</th><th>Motivo</th><th>Usuário</th><th>Data</th></tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={7} className="empty-state">Nenhum dado encontrado.</td></tr>}
                  {dados.map((d, i) => (
                    <tr key={i}>
                      <td><span className={`badge ${d.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}`}>{d.tipo}</span></td>
                      <td className="fw-600">{d.produto_nome}</td>
                      <td>{d.codigo}</td>
                      <td>{d.quantidade}</td>
                      <td className="text-muted">{d.motivo}</td>
                      <td>{d.usuario_nome}</td>
                      <td className="text-muted">{masks.dataHora(d.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && aba === 'margem' && (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Custo</th><th>Venda</th><th>Margem (R$)</th><th>Margem (%)</th><th>Estoque</th></tr>
                </thead>
                <tbody>
                  {dados.length === 0 && <tr><td colSpan={8} className="empty-state">Nenhum produto encontrado.</td></tr>}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Relatorios;
