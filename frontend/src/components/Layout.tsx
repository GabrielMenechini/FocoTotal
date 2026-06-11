import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navLinks = [
  { to: '/', label: 'Dashboard', icon: '▣', end: true },
  { to: '/produtos', label: 'Produtos', icon: '📦' },
  { to: '/estoque', label: 'Estoque', icon: '🏭' },
  { to: '/clientes', label: 'Clientes', icon: '👤' },
  { to: '/vendas', label: 'Vendas', icon: '🛒' },
  { to: '/relatorios', label: 'Relatórios', icon: '📊' },
  { to: '/usuarios', label: 'Usuários', icon: '⚙️', adminOnly: true },
];

const Layout: React.FC = () => {
  const { usuario, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const cargoLabel: Record<string, string> = {
    admin: 'Administrador',
    vendedor: 'Vendedor',
    estoquista: 'Estoquista',
  };

  return (
    <div className="layout">
      <header className="header">
        <span className="header-logo">FocoTotal</span>
        <span style={{ fontSize: 12, opacity: .6 }}>| Sistema de Gestão Óptica</span>
        <span className="header-sep" />
        <span className="header-user">
          {usuario?.nome}
          <span className="header-cargo">{cargoLabel[usuario?.cargo || '']}</span>
        </span>
        <button className="btn-logout" onClick={handleLogout}>Sair</button>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="sidebar-group">
            <div className="sidebar-label">Menu</div>
            {navLinks
              .filter(l => !l.adminOnly || isAdmin)
              .map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-icon">{l.icon}</span>
                  {l.label}
                </NavLink>
              ))}
          </div>
        </nav>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
