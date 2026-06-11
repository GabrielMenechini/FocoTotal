import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import type { Venda, Produto, Cliente, ItemVenda } from '../types';

const Vendas: React.FC = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modal, setModal] = useState(false);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const [v, p, c] = await Promise.all([
      api.get('/vendas'),
      api.get('/produtos'),
      api.get('/clientes'),
    ]);
    setVendas(v.data);
    setProdutos(p.data);
    setClientes(c.data);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNova = () => {
    setItens([{ produto_id: 0, quantidade: 1 }]);
    setClienteId('');
    setDesconto('0');
    setObs('');
    setMsg('');
    setModal(true);
  };

  const addItem = () => setItens(i => [...i, { produto_id: 0, quantidade: 1 }]);
  const removeItem = (idx: number) => setItens(i => i.filter((_, j) => j !== idx));
  const setItem = (idx: number, field: keyof ItemVenda, val: unknown) =>
    setItens(i => i.map((item, j) => j === idx ? { ...item, [field]: val } : item));

  const subtotal = (item: ItemVenda) => {
    const p = produtos.find(x => x.id === Number(item.produto_id));
    return p ? p.preco_venda * item.quantidade : 0;
  };
  const total = itens.reduce((s, i) => s + subtotal(i), 0);
  const final = total - Number(desconto);

  const salvar = async () => {
    if (itens.some(i => !i.produto_id)) { setMsg('Selecione todos os produtos.'); return; }
    setLoading(true);
    try {
      await api.post('/vendas', {
        cliente_id: clienteId || null,
        itens,
        desconto: Number(desconto),
        observacoes: obs,
      });
      setModal(false);
      carregar();
    } catch (err: any) {
      setMsg(err.response?.data?.erro || 'Erro ao registrar venda.');
    } finally { setLoading(false); }
  };

  const cancelar = async (id: number) => {
    if (!confirm('Cancelar esta venda? O estoque será restaurado.')) return;
    await api.patch(`/vendas/${id}/cancelar`);
    carregar();
  };

  const statusBadge = (s: string) => ({
    concluida: 'badge-success', cancelada: 'badge-danger', pendente: 'badge-warning',
  }[s] || 'badge-neutral');

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Vendas</div>
          <div className="page-subtitle">Registro e acompanhamento de vendas</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNova}>+ Nova Venda</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr><th>#</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Desconto</th><th>Final</th><th>Status</th><th>Data</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {vendas.length === 0 && <tr><td colSpan={9} className="empty-state">Nenhuma venda registrada.</td></tr>}
                {vendas.map(v => (
                  <tr key={v.id}>
                    <td className="fw-600">{v.id}</td>
                    <td>{v.cliente_nome || '— Consumidor Final —'}</td>
                    <td className="text-muted">{v.usuario_nome}</td>
                    <td>{masks.moeda(Number(v.valor_total))}</td>
                    <td>{masks.moeda(Number(v.desconto))}</td>
                    <td className="fw-600">{masks.moeda(Number(v.valor_final))}</td>
                    <td><span className={`badge ${statusBadge(v.status || '')}`}>{v.status}</span></td>
                    <td className="text-muted">{masks.dataHora(v.criado_em || '')}</td>
                    <td>
                      {v.status === 'concluida' && (
                        <button className="btn btn-warning btn-sm" onClick={() => cancelar(v.id!)}>Cancelar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 780 }}>
            <div className="modal-header">
              Nova Venda
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className="alert alert-danger">{msg}</div>}
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group span-2">
                  <label>Cliente (opcional)</label>
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
                    <option value="">— Consumidor Final —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="card-header" style={{ background: '#F7F7F7', padding: '8px 0', marginBottom: 12 }}>Itens da Venda</div>
              {itens.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div className="form-group">
                    {idx === 0 && <label>Produto</label>}
                    <select value={item.produto_id} onChange={e => setItem(idx, 'produto_id', Number(e.target.value))}>
                      <option value={0}>Selecione...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    {idx === 0 && <label>Qtd.</label>}
                    <input type="number" min="1" value={item.quantidade}
                      onChange={e => setItem(idx, 'quantidade', Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    {idx === 0 && <label>Subtotal</label>}
                    <input value={masks.moeda(subtotal(item))} readOnly style={{ background: '#F7F7F7' }} />
                  </div>
                  <div>
                    {idx === 0 && <label style={{ display: 'block', visibility: 'hidden' }}>x</label>}
                    <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={() => removeItem(idx)}>✕</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginBottom: 16 }}>+ Adicionar item</button>

              <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <div className="form-group" style={{ width: 160 }}>
                    <label>Desconto (R$)</label>
                    <input type="number" min="0" step="0.01" value={desconto} onChange={e => setDesconto(e.target.value)} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted" style={{ fontSize: 12 }}>Total: {masks.moeda(total)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Final: {masks.moeda(final)}</div>
                  </div>
                </div>
              </div>

              <div className="form-group mt-16">
                <label>Observações</label>
                <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} />
              </div>

              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={loading}>
                  {loading ? 'Salvando...' : `Confirmar Venda – ${masks.moeda(final)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Vendas;
