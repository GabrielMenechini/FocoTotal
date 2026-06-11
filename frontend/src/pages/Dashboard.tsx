import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import type { DashboardData } from '../types';

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/relatorios/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Carregando dashboard...</p>;
  if (!data) return <p className="text-danger">Erro ao carregar dados.</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral do sistema</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card success">
          <div className="stat-label">Vendas Hoje</div>
          <div className="stat-value">{data.vendasHoje.total}</div>
          <div className="stat-hint">Total: {masks.moeda(Number(data.vendasHoje.valor))}</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Produtos Cadastrados</div>
          <div className="stat-value">{data.totalProdutos}</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Clientes</div>
          <div className="stat-value">{data.totalClientes}</div>
        </div>
        <div className={`stat-card ${Number(data.estoqueBaixo) > 0 ? 'danger' : 'success'}`}>
          <div className="stat-label">Estoque Baixo</div>
          <div className="stat-value">{data.estoqueBaixo}</div>
          <div className="stat-hint">produtos abaixo do mínimo</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Últimas Vendas</div>
        <div className="card-body" style={{ padding: 0 }}>
          {data.ultimasVendas.length === 0 ? (
            <div className="empty-state">Nenhuma venda registrada hoje.</div>
          ) : (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Valor Final</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ultimasVendas.map(v => (
                    <tr key={v.id}>
                      <td className="fw-600">{v.id}</td>
                      <td>{v.cliente_nome || '— Consumidor Final —'}</td>
                      <td className="fw-600">{masks.moeda(Number(v.valor_final))}</td>
                      <td className="text-muted">{masks.dataHora(v.criado_em || '')}</td>
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

export default Dashboard;
