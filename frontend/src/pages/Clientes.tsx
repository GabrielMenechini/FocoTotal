import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import { validators } from '../utils/validators';
import type { Cliente } from '../types';

const empty: Cliente = { nome: '', cpf: '', cnpj: '', email: '', telefone: '', cep: '', endereco: '', cidade: '', estado: '' };

const Clientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Cliente>(empty);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const params: Record<string, string> = {};
    if (busca) params.busca = busca;
    const { data } = await api.get('/clientes', { params });
    setClientes(data);
  };

  useEffect(() => { carregar(); }, [busca]);

  const abrirNovo = () => { setEditando(empty); setErros({}); setMsg(''); setModal(true); };
  const abrirEditar = (c: Cliente) => { setEditando({ ...c }); setErros({}); setMsg(''); setModal(true); };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!validators.obrigatorio(editando.nome)) e.nome = 'Obrigatório';
    if (!validators.obrigatorio(editando.telefone)) e.telefone = 'Obrigatório';
    if (editando.cpf && !validators.cpf(editando.cpf)) e.cpf = 'CPF inválido';
    if (editando.cnpj && !validators.cnpj(editando.cnpj)) e.cnpj = 'CNPJ inválido';
    if (editando.email && !validators.email(editando.email)) e.email = 'Email inválido';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setLoading(true);
    try {
      const payload = { ...editando };
      if (editando.id) await api.put(`/clientes/${editando.id}`, payload);
      else await api.post('/clientes', payload);
      setModal(false);
      carregar();
    } catch (err: any) {
      setMsg(err.response?.data?.erro || 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    carregar();
  };

  const set = (field: keyof Cliente, val: string) => setEditando(p => ({ ...p, [field]: val }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">Cadastro e gestão de clientes</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Cliente</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="toolbar-search form-group">
              <input placeholder="Buscar por nome, CPF ou email..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr><th>Nome</th><th>CPF</th><th>Email</th><th>Telefone</th><th>Cidade/UF</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {clientes.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">Nenhum cliente encontrado.</td></tr>
                )}
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td className="fw-600">{c.nome}</td>
                    <td>{c.cpf ? masks.cpf(c.cpf) : '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.telefone ? masks.telefone(c.telefone) : '—'}</td>
                    <td>{c.cidade && c.estado ? `${c.cidade}/${c.estado}` : '—'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => excluir(c.id!)}>Excluir</button>
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
              {editando.id ? 'Editar Cliente' : 'Novo Cliente'}
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className="alert alert-danger">{msg}</div>}
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Nome *</label>
                  <input value={editando.nome} onChange={e => set('nome', e.target.value)} className={erros.nome ? 'error' : ''} />
                  {erros.nome && <span className="field-error">{erros.nome}</span>}
                </div>
                <div className="form-group">
                  <label>CPF</label>
                  <input value={editando.cpf || ''}
                    onChange={e => set('cpf', masks.cpf(e.target.value))}
                    placeholder="000.000.000-00" className={erros.cpf ? 'error' : ''} maxLength={14} />
                  {erros.cpf && <span className="field-error">{erros.cpf}</span>}
                </div>
                <div className="form-group">
                  <label>CNPJ</label>
                  <input value={editando.cnpj || ''}
                    onChange={e => set('cnpj', masks.cnpj(e.target.value))}
                    placeholder="00.000.000/0000-00" className={erros.cnpj ? 'error' : ''} maxLength={18} />
                  {erros.cnpj && <span className="field-error">{erros.cnpj}</span>}
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editando.email || ''} onChange={e => set('email', e.target.value)} className={erros.email ? 'error' : ''} />
                  {erros.email && <span className="field-error">{erros.email}</span>}
                </div>
                <div className="form-group">
                  <label>Telefone *</label>
                  <input value={editando.telefone}
                    onChange={e => set('telefone', masks.telefone(e.target.value))}
                    placeholder="(11) 99999-9999" className={erros.telefone ? 'error' : ''} maxLength={15} />
                  {erros.telefone && <span className="field-error">{erros.telefone}</span>}
                </div>
                <div className="form-group">
                  <label>CEP</label>
                  <input value={editando.cep || ''}
                    onChange={e => set('cep', masks.cep(e.target.value))}
                    placeholder="00000-000" maxLength={9} />
                </div>
                <div className="form-group span-2">
                  <label>Endereço</label>
                  <input value={editando.endereco || ''} onChange={e => set('endereco', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Cidade</label>
                  <input value={editando.cidade || ''} onChange={e => set('cidade', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Estado (UF)</label>
                  <input value={editando.estado || ''} onChange={e => set('estado', e.target.value.toUpperCase())} maxLength={2} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Clientes;
