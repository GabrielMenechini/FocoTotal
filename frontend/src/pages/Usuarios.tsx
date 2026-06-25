import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import { validators } from '../utils/validators';
import type { Usuario } from '../types';

// Cargo sempre admin — único perfil do sistema
const empty: Usuario = { nome: '', email: '', cargo: 'admin', ativo: true };

const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modal,    setModal]    = useState(false);
  const [editando, setEditando] = useState<Usuario & { senha?: string }>(empty);
  const [erros,    setErros]    = useState<Record<string, string>>({});
  const [msg,      setMsg]      = useState('');
  const [loading,  setLoading]  = useState(false);

  const carregar = async () => {
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setUsuarios(data);
    } catch { /* silencioso */ }
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo    = () => { setEditando({ ...empty, senha: '' }); setErros({}); setMsg(''); setModal(true); };
  const abrirEditar  = (u: Usuario) => { setEditando({ ...u, senha: '' }); setErros({}); setMsg(''); setModal(true); };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!validators.obrigatorio(editando.nome))   e.nome  = 'Obrigatório';
    if (!validators.obrigatorio(editando.email))  e.email = 'Obrigatório';
    if (!validators.email(editando.email))         e.email = 'Email inválido';
    if (!editando.id && !validators.obrigatorio(editando.senha))        e.senha = 'Obrigatório para novo usuário';
    if (!editando.id && editando.senha && editando.senha.length < 6)    e.senha = 'Mínimo 6 caracteres';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async () => {
    if (!validar()) return;
    setLoading(true);
    try {
      if (editando.id) {
        await api.put(`/usuarios/${editando.id}`, {
          nome:  editando.nome,
          cargo: 'admin',          // sempre admin
          ativo: editando.ativo,
        });
      } else {
        await api.post('/usuarios', {
          nome:  editando.nome,
          email: editando.email,
          senha: editando.senha,
          cargo: 'admin',          // sempre admin
        });
      }
      setModal(false);
      carregar();
    } catch (err: any) {
      setMsg(err.response?.data?.erro || 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  const set = (field: string, val: unknown) => setEditando(p => ({ ...p, [field]: val }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">Gerenciamento de administradores do sistema</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Usuário</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Nome</th><th>Email</th><th>Perfil</th>
                  <th>Status</th><th>Criado em</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">Nenhum usuário cadastrado.</td></tr>
                )}
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="fw-600">{u.nome}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-info">Administrador</span>
                    </td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-success' : 'badge-neutral'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-muted">{masks.dataHora(u.criado_em || '')}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(u)}>
                        Editar
                      </button>
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
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              {editando.id ? 'Editar Usuário' : 'Novo Administrador'}
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {msg && <div className="alert alert-danger">{msg}</div>}

              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Nome *</label>
                  <input
                    value={editando.nome}
                    onChange={e => set('nome', e.target.value)}
                    className={erros.nome ? 'error' : ''}
                    placeholder="Nome completo"
                  />
                  {erros.nome && <span className="field-error">{erros.nome}</span>}
                </div>

                <div className="form-group span-2">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={editando.email}
                    onChange={e => set('email', e.target.value)}
                    className={erros.email ? 'error' : ''}
                    disabled={!!editando.id}
                    placeholder="email@exemplo.com"
                  />
                  {erros.email && <span className="field-error">{erros.email}</span>}
                </div>

                {!editando.id && (
                  <div className="form-group span-2">
                    <label>Senha * (mínimo 6 caracteres)</label>
                    <input
                      type="password"
                      value={editando.senha || ''}
                      onChange={e => set('senha', e.target.value)}
                      className={erros.senha ? 'error' : ''}
                    />
                    {erros.senha && <span className="field-error">{erros.senha}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label>Perfil</label>
                  <input value="Administrador" readOnly />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editando.ativo ? '1' : '0'}
                    onChange={e => set('ativo', e.target.value === '1')}
                  >
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
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

export default Usuarios;
