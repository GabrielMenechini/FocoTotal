import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import type { MovimentacaoEstoque, Produto } from '../types';

const Estoque: React.FC = () => {
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [alertas, setAlertas] = useState<Produto[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ produto_id: '', tipo: 'entrada', quantidade: '1', motivo: '' });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const [m, p, a] = await Promise.all([
      api.get('/estoque'),
      api.get('/produtos'),
      api.get('/produtos/alertas'),
    ]);
    setMovs(m.data);
    setProdutos(p.data);
    setAlertas(a.data);
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    setErro('');
    if (!form.produto_id || !form.motivo) { setErro('Produto e motivo são obrigatórios.'); return; }
    setLoading(true);
    try {
      await api.post('/estoque', {
        produto_id: Number(form.produto_id),
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        motivo: form.motivo,
      });
      setMsg('Movimentação registrada com sucesso!');
      setModal(false);
      carregar();
    } catch (err: any) {
      setErro(err.response?.data?.erro || 'Erro ao registrar.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Controle de Estoque</div>
          <div className="page-subtitle">Entradas, saídas e alertas de estoque</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ produto_id: '', tipo: 'entrada', quantidade: '1', motivo: '' }); setErro(''); setModal(true); }}>
          + Registrar Movimentação
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {alertas.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          ⚠️ <strong>{alertas.length} produto(s) com estoque baixo:</strong>{' '}
          {alertas.map(a => `${a.nome} (${a.quantidade_estoque}/${a.estoque_minimo})`).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="card-header">Histórico de Movimentações</div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr><th>Tipo</th><th>Produto</th><th>Código</th><th>Qtd.</th><th>Motivo</th><th>Usuário</th><th>Data/Hora</th></tr>
              </thead>
              <tbody>
                {movs.length === 0 && <tr><td colSpan={7} className="empty-state">Nenhuma movimentação registrada.</td></tr>}
                {movs.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className={`badge ${m.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}`}>
                        {m.tipo === 'entrada' ? '▲ Entrada' : '▼ Saída'}
                      </span>
                    </td>
                    <td className="fw-600">{m.produto_nome}</td>
                    <td>{m.produto_codigo}</td>
                    <td>{m.quantidade}</td>
                    <td className="text-muted">{m.motivo}</td>
                    <td>{m.usuario_nome}</td>
                    <td className="text-muted">{masks.dataHora(m.criado_em || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              Registrar Movimentação de Estoque
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-danger">{erro}</div>}
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Produto *</label>
                  <select value={form.produto_id} onChange={e => setForm(f => ({ ...f, produto_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} — Estoque atual: {p.quantidade_estoque}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input type="number" min="1" value={form.quantidade}
                    onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div className="form-group span-2">
                  <label>Motivo *</label>
                  <input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                    placeholder="Ex: Compra de fornecedor, Ajuste de inventário..." />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={loading}>
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Estoque;
