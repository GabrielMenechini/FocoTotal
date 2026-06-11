import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { validators } from '../utils/validators';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!validators.obrigatorio(email) || !validators.obrigatorio(senha)) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (!validators.email(email)) {
      setErro('Email inválido.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      login(data.token, data.usuario);
      navigate('/');
    } catch (err: any) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">FocoTotal</div>
        <div className="login-sub">Sistema de Gestão para Ótica</div>

        {erro && <div className="alert alert-danger">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@focototal.com"
                autoFocus
              />
            </div>
          </div>
          <div className="login-field">
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
          Acesso restrito a funcionários autorizados
        </p>
      </div>
    </div>
  );
};

export default Login;
