import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navGroups = [
  {
    label: 'Início',
    links: [
      { to: '/',           label: 'Dashboard',    icon: '▣',  end: true },
      { to: '/caixa',      label: 'Caixa / Diário', icon: '💵' },
    ],
  },
  {
    label: 'Cadastros',
    links: [
      { to: '/produtos',   label: 'Produtos',     icon: '📦' },
      { to: '/clientes',   label: 'Clientes',     icon: '👤' },
    ],
  },
  {
    label: 'Operações',
    links: [
      { to: '/vendas',    label: 'Vendas',    icon: '🛒' },
      { to: '/estoque',   label: 'Estoque',   icon: '🏭' },
    ],
  },
  {
    label: 'Análise',
    links: [
      { to: '/relatorios', label: 'Relatórios',   icon: '📊' },
    ],
  },
  {
    label: 'Administração',
    links: [
      { to: '/usuarios',   label: 'Usuários',     icon: '⚙️' },
    ],
  },
];

const Layout: React.FC = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <span className="header-logo">FocoTotal</span>
          <span className="header-tagline">Sistema de Gestão Óptica</span>
        </div>
        <span className="header-sep" />
        <div className="header-user-wrap">
          <div className="header-user-avatar">
            {usuario?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{usuario?.nome}</span>
            <span className="header-cargo">Administrador</span>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Sair</button>
      </header>

      <div className="layout-body">
        {/* ── Sidebar ── */}
        <nav className="sidebar">
          {navGroups.map(group => (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-label">{group.label}</div>
              {group.links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="sidebar-icon">{l.icon}</span>
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Conteúdo principal ── */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
