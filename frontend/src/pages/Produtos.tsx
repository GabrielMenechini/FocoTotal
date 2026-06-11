import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import { validators } from '../utils/validators';
import type { Produto } from '../types';

const CATEGORIAS = ['Armação', 'Solar', 'Lente', 'Acessório', 'Outro'];

const empty: Produto = {
  codigo: '', nome: '', descricao: '', categoria: '',
  preco_custo: 0, preco_venda: 0, quantidade_estoque: 0, estoque_minimo: 5,
};

const Produtos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Produto>(empty);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const params: Record<string, string> = {};
    if (busca) params.busca = busca;
    const { data } = await api.get('/produtos', { params });
    setProdutos(data);
  };

  useEffect(() => { carregar(); }, [busca]);

  const abrirNovo = () => { setEditando(empty); setErros({}); setMsg(''); setModal(true); };
  const abrirEditar = (p: Produto) => { setEditando({ ...p }); setErros({}); setMsg(''); setModal(true); };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!validators.obrigatorio(editando.codigo)) e.codigo = 'Obrigatório';
    if (!validators.obrigatorio(editando.nome)) e.nome = 'Obrigatório';
    if (!validators.obrigatorio(editando.categoria)) e.categoria = 'Obrigatório';
    if (Number(editando.preco_venda) <= 0) e.preco_venda = 'Deve ser maior que zero';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setLoading(true);
    try {
      if (editando.id) {
        await api.put(`/produtos/${editando.id}`, editando);
      } else {
        await api.post('/produtos', editando);
      }
      setModal(false);
      carregar();
    } catch (err: any) {
      setMsg(err.response?.data?.erro || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este produto?')) return;
    await api.delete(`/produtos/${id}`);
    carregar();
  };

  const set = (field: keyof Produto, val: unknown) =>
    setEditando(p => ({ ...p, [field]: val }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Produtos</div>
          <div className="page-subtitle">Cadastro e gestão de produtos</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="toolbar-search form-group">
              <input
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Código</th><th>Nome</th><th>Categoria</th>
                  <th>Custo</th><th>Venda</th><th>Estoque</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 && (
                  <tr><td colSpan={8} className="empty-state">Nenhum produto encontrado.</td></tr>
                )}
                {produtos.map(p => (
                  <tr key={p.id}>
                    <td className="fw-600">{p.codigo}</td>
                    <td>{p.nome}</td>
                    <td>{p.categoria}</td>
                    <td>{masks.moeda(Number(p.preco_custo))}</td>
                    <td className="fw-600">{masks.moeda(Number(p.preco_venda))}</td>
                    <td>
                      <span className={`badge ${p.quantidade_estoque <= p.estoque_minimo ? 'badge-danger' : 'badge-success'}`}>
                        {p.quantidade_estoque}
                      </span>
                    </td>
                    <td>
                      {p.quantidade_estoque <= p.estoque_minimo
                        ? <span className="badge badge-danger">Baixo</span>
                        : <span className="badge badge-success">OK</span>}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => excluir(p.id!)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              {editando.id ? 'Editar Produto' : 'Novo Produto'}
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className="alert alert-danger">{msg}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Código *</label>
                  <input value={editando.codigo} onChange={e => set('codigo', e.target.value)}
                    className={erros.codigo ? 'error' : ''} disabled={!!editando.id} />
                  {erros.codigo && <span className="field-error">{erros.codigo}</span>}
                </div>
                <div className="form-group">
                  <label>Categoria *</label>
                  <select value={editando.categoria} onChange={e => set('categoria', e.target.value)}
                    className={erros.categoria ? 'error' : ''}>
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {erros.categoria && <span className="field-error">{erros.categoria}</span>}
                </div>
                <div className="form-group span-2">
                  <label>Nome *</label>
                  <input value={editando.nome} onChange={e => set('nome', e.target.value)}
                    className={erros.nome ? 'error' : ''} />
                  {erros.nome && <span className="field-error">{erros.nome}</span>}
                </div>
                <div className="form-group">
                  <label>Preço de Custo (R$)</label>
                  <input type="number" step="0.01" min="0" value={editando.preco_custo}
                    onChange={e => set('preco_custo', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Preço de Venda (R$) *</label>
                  <input type="number" step="0.01" min="0" value={editando.preco_venda}
                    onChange={e => set('preco_venda', e.target.value)}
                    className={erros.preco_venda ? 'error' : ''} />
                  {erros.preco_venda && <span className="field-error">{erros.preco_venda}</span>}
                </div>
                <div className="form-group">
                  <label>Qtd. em Estoque</label>
                  <input type="number" min="0" value={editando.quantidade_estoque}
                    onChange={e => set('quantidade_estoque', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Estoque Mínimo</label>
                  <input type="number" min="0" value={editando.estoque_minimo}
                    onChange={e => set('estoque_minimo', e.target.value)} />
                </div>
                <div className="form-group span-2">
                  <label>Descrição</label>
                  <textarea rows={2} value={editando.descricao || ''}
                    onChange={e => set('descricao', e.target.value)} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Produtos;
