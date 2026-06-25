import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { masks } from '../utils/masks';
import type {
  VendaLista, VendaDetalhe, ItemVendaDetalhe,
  Produto, Cliente, FormaPagamento,
} from '../types';
import { FORMA_LABELS, FORMAS_PAGAMENTO } from '../types';

// ── Constantes ────────────────────────────────────────────────────
const PARCELAS_OPT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

const STATUS_BADGE: Record<string, string> = {
  concluida: 'badge-success',
  cancelada:  'badge-danger',
  pendente:   'badge-warning',
};
const STATUS_LABEL: Record<string, string> = {
  concluida: 'Concluída',
  cancelada:  'Cancelada',
  pendente:   'Pendente',
};

const PAY_ICON: Record<string, string> = {
  DINHEIRO:       '💵',
  PIX:            '⚡',
  CARTAO_CREDITO: '💳',
  CARTAO_DEBITO:  '💳',
  BOLETO:         '📄',
  CHEQUE:         '📝',
};

// ── Item no formulário ────────────────────────────────────────────
interface ItemForm { produto_id: number; quantidade: number; }

function calcSubtotal(item: ItemForm, produtos: Produto[]): number {
  const p = produtos.find(x => Number(x.id) === Number(item.produto_id));
  return p ? Number(p.preco_venda) * Number(item.quantidade) : 0;
}

function descParcelas(valor: number, parcelas: number, forma: string): string {
  if (forma !== 'CARTAO_CREDITO' || parcelas <= 1) return masks.moeda(valor);
  return `${parcelas}× de ${masks.moeda(valor / parcelas)} = ${masks.moeda(valor)}`;
}

// ═════════════════════════════════════════════════════════════════════
const Vendas: React.FC = () => {
  // ── Dados ────────────────────────────────────────────────────────
  const [vendas,       setVendas]       = useState<VendaLista[]>([]);
  const [produtos,     setProdutos]     = useState<Produto[]>([]);
  const [clientes,     setClientes]     = useState<Cliente[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [erroLista,    setErroLista]    = useState('');

  // ── Modal principal ───────────────────────────────────────────────
  type ModalTipo = 'nova' | 'editar' | 'detalhes' | 'cancelar' | null;
  const [modal,      setModal]      = useState<ModalTipo>(null);
  const [vendaAtual, setVendaAtual] = useState<VendaDetalhe | null>(null);
  const [loadingDet, setLoadingDet] = useState(false);

  // ── Form (nova + editar) ─────────────────────────────────────────
  const [fItens,     setFItens]     = useState<ItemForm[]>([{ produto_id: 0, quantidade: 1 }]);
  const [fClienteId, setFClienteId] = useState('');
  const [fDesconto,  setFDesconto]  = useState('0');
  const [fForma,     setFForma]     = useState<FormaPagamento>('DINHEIRO');
  const [fParcelas,  setFParcelas]  = useState(1);
  const [fObs,       setFObs]       = useState('');
  const [fMsg,       setFMsg]       = useState('');
  const [fLoad,      setFLoad]      = useState(false);

  // ── Quick cliente ─────────────────────────────────────────────────
  const [showQC, setShowQC] = useState(false);
  const [qc,     setQc]     = useState({ nome: '', cpf: '', telefone: '', email: '' });
  const [qcMsg,  setQcMsg]  = useState('');
  const [qcLoad, setQcLoad] = useState(false);

  // ── Cancelamento ─────────────────────────────────────────────────
  const [cancelId,    setCancelId]    = useState<number | null>(null);
  const [cancelMotiv, setCancelMotiv] = useState('');
  const [cancelMsg,   setCancelMsg]   = useState('');
  const [cancelLoad,  setCancelLoad]  = useState(false);

  // ── Carregar tudo ─────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setErroLista('');
    try {
      const [rv, rp, rc] = await Promise.all([
        api.get<VendaLista[]>('/vendas'),
        api.get<Produto[]>('/produtos'),
        api.get<Cliente[]>('/clientes'),
      ]);
      setVendas(rv.data   ?? []);
      setProdutos(rp.data ?? []);
      setClientes(rc.data ?? []);
    } catch (err: any) {
      setErroLista(
        err?.response?.data?.erro
          || 'Erro ao carregar vendas. Verifique a conexão com o servidor.'
      );
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Totais calculados ────────────────────────────────────────────
  const totalItens = fItens.reduce((s, i) => s + calcSubtotal(i, produtos), 0);
  const totalFinal = Math.max(0, totalItens - Number(fDesconto || 0));

  // ── Abrir modal de detalhes ou edição ────────────────────────────
  const abrirDetalhes = async (id: number, modo: 'detalhes' | 'editar') => {
    setLoadingDet(true);
    setModal(modo);
    setFMsg('');
    setVendaAtual(null);
    try {
      const { data } = await api.get<VendaDetalhe>(`/vendas/${id}`);
      setVendaAtual(data);
      if (modo === 'editar') {
        setFItens((data.itens ?? []).map(i => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
        })));
        setFClienteId(String(data.cliente_id ?? ''));
        setFDesconto(String(data.desconto ?? 0));
        setFForma((data.forma_pagamento as FormaPagamento) || 'DINHEIRO');
        setFParcelas(data.parcelas ?? 1);
        setFObs(data.observacoes ?? '');
        setShowQC(false);
      }
    } catch {
      setFMsg('Erro ao carregar detalhes da venda.');
    } finally {
      setLoadingDet(false);
    }
  };

  // ── Abrir nova venda ──────────────────────────────────────────────
  const abrirNova = () => {
    setFItens([{ produto_id: 0, quantidade: 1 }]);
    setFClienteId('');
    setFDesconto('0');
    setFForma('DINHEIRO');
    setFParcelas(1);
    setFObs('');
    setFMsg('');
    setShowQC(false);
    setQc({ nome: '', cpf: '', telefone: '', email: '' });
    setQcMsg('');
    setVendaAtual(null);
    setModal('nova');
  };

  const fecharModal = () => { setModal(null); setVendaAtual(null); };

  // ── Manipular itens ───────────────────────────────────────────────
  const addItem    = () => setFItens(p => [...p, { produto_id: 0, quantidade: 1 }]);
  const removeItem = (idx: number) => setFItens(p => p.filter((_, j) => j !== idx));
  const setItemVal = (idx: number, field: keyof ItemForm, val: number) =>
    setFItens(p => p.map((item, j) => j === idx ? { ...item, [field]: val } : item));

  // ── Salvar venda ──────────────────────────────────────────────────
  const salvarVenda = async () => {
    if (fItens.some(i => !i.produto_id || i.produto_id === 0)) {
      setFMsg('Selecione o produto em todos os itens.');
      return;
    }
    if (fItens.some(i => Number(i.quantidade) < 1)) {
      setFMsg('A quantidade deve ser pelo menos 1 em todos os itens.');
      return;
    }

    setFLoad(true);
    setFMsg('');
    try {
      const payload = {
        cliente_id:      fClienteId ? Number(fClienteId) : null,
        itens:           fItens.map(i => ({
          produto_id: Number(i.produto_id),
          quantidade: Number(i.quantidade),
        })),
        desconto:        Number(fDesconto) || 0,
        forma_pagamento: fForma,
        parcelas:        fForma === 'CARTAO_CREDITO' ? fParcelas : 1,
        observacoes:     fObs.trim() || null,
      };

      if (modal === 'editar' && vendaAtual) {
        await api.put(`/vendas/${vendaAtual.id}`, payload);
      } else {
        await api.post('/vendas', payload);
      }
      fecharModal();
      await carregar();
    } catch (err: any) {
      setFMsg(
        err?.response?.data?.erro
          || 'Erro ao salvar venda. Verifique os dados e tente novamente.'
      );
    } finally {
      setFLoad(false);
    }
  };

  // ── Cancelar venda ────────────────────────────────────────────────
  const abrirCancelar = (id: number) => {
    setCancelId(id);
    setCancelMotiv('');
    setCancelMsg('');
    setModal('cancelar');
  };

  const confirmarCancelamento = async () => {
    if (!cancelId) return;
    const motivo = cancelMotiv.trim();
    if (motivo.length < 20) {
      setCancelMsg('O motivo deve ter pelo menos 20 caracteres.');
      return;
    }
    setCancelLoad(true);
    setCancelMsg('');
    try {
      await api.patch(`/vendas/${cancelId}/cancelar`, { motivo_cancelamento: motivo });
      setModal(null);
      setCancelId(null);
      setCancelMotiv('');
      await carregar();
    } catch (err: any) {
      setCancelMsg(err?.response?.data?.erro || 'Erro ao cancelar venda.');
    } finally {
      setCancelLoad(false);
    }
  };

  // ── Quick: salvar novo cliente ────────────────────────────────────
  const salvarQC = async () => {
    if (!qc.nome.trim())     { setQcMsg('Nome é obrigatório.');     return; }
    if (!qc.telefone.trim()) { setQcMsg('Telefone é obrigatório.'); return; }
    setQcLoad(true);
    setQcMsg('');
    try {
      const { data } = await api.post<{ id: number }>('/clientes', {
        nome:     qc.nome.trim(),
        cpf:      qc.cpf.replace(/\D/g, '') || undefined,
        telefone: qc.telefone.trim(),
        email:    qc.email.trim() || undefined,
      });
      const { data: novos } = await api.get<Cliente[]>('/clientes');
      setClientes(novos);
      setFClienteId(String(data.id));
      setShowQC(false);
      setQc({ nome: '', cpf: '', telefone: '', email: '' });
    } catch (err: any) {
      setQcMsg(err?.response?.data?.erro || 'Erro ao cadastrar cliente.');
    } finally {
      setQcLoad(false);
    }
  };

  // ═══════════════════════ RENDER ════════════════════════════════════
  return (
    <>
      {/* ── Cabeçalho ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Vendas</div>
          <div className="page-subtitle">
            {loadingLista
              ? 'Carregando...'
              : `${vendas.length} venda${vendas.length !== 1 ? 's' : ''} registrada${vendas.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirNova}>+ Nova Venda</button>
      </div>

      {/* ── Tabela de vendas ── */}
      <div className="card">
        <div style={{ padding: 0 }}>
          {erroLista && (
            <div className="alert alert-danger" style={{ margin: 16 }}>{erroLista}</div>
          )}
          {loadingLista ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Total</th>
                    <th>Desconto</th>
                    <th>Final</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th>Data / Hora</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="empty-state">
                        Nenhuma venda registrada.
                        <br />
                        <small>Clique em "+ Nova Venda" para começar.</small>
                      </td>
                    </tr>
                  ) : (
                    vendas.map(v => (
                      <tr key={v.id}>
                        <td className="fw-600" style={{ color: 'var(--primary)' }}>
                          #{v.id}
                        </td>
                        <td>
                          {v.cliente_nome
                            ? v.cliente_nome
                            : <span className="text-muted">Consumidor Final</span>}
                        </td>
                        <td className="text-muted">{v.usuario_nome}</td>
                        <td>{masks.moeda(Number(v.valor_total))}</td>
                        <td className="text-muted">
                          {Number(v.desconto) > 0
                            ? `– ${masks.moeda(Number(v.desconto))}`
                            : '—'}
                        </td>
                        <td className="fw-600">{masks.moeda(Number(v.valor_final))}</td>
                        <td>
                          <span className="pay-badge">
                            {PAY_ICON[v.forma_pagamento] ?? '💲'}&nbsp;
                            {FORMA_LABELS[v.forma_pagamento] ?? v.forma_pagamento}
                            {Number(v.parcelas) > 1 && ` ${v.parcelas}×`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[v.status] ?? 'badge-neutral'}`}>
                            {STATUS_LABEL[v.status] ?? v.status}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {masks.dataHora(v.criado_em)}
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => abrirDetalhes(v.id, 'detalhes')}
                            >
                              Detalhes
                            </button>
                            {v.status === 'concluida' && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => abrirDetalhes(v.id, 'editar')}
                                >
                                  Editar
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => abrirCancelar(v.id)}
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Modal: DETALHES DA VENDA
      ══════════════════════════════════════════════════════════════ */}
      {modal === 'detalhes' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              Detalhes da Venda {vendaAtual ? `#${vendaAtual.id}` : ''}
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>
            <div className="modal-body">
              {loadingDet && (
                <div className="loading-center"><div className="spinner" /></div>
              )}
              {!loadingDet && !vendaAtual && (
                <div className="alert alert-danger">{fMsg || 'Erro ao carregar venda.'}</div>
              )}
              {!loadingDet && vendaAtual && (
                <>
                  {/* Grid de informações */}
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">ID</span>
                      <span className="detail-val">#{vendaAtual.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Data / Hora</span>
                      <span className="detail-val">{masks.dataHora(vendaAtual.criado_em)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Cliente</span>
                      <span className="detail-val">
                        {vendaAtual.cliente_nome || '— Consumidor Final —'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Responsável</span>
                      <span className="detail-val">{vendaAtual.usuario_nome}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className={`badge ${STATUS_BADGE[vendaAtual.status] ?? 'badge-neutral'}`}>
                        {STATUS_LABEL[vendaAtual.status] ?? vendaAtual.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Pagamento</span>
                      <span className="detail-val">
                        {PAY_ICON[vendaAtual.forma_pagamento] ?? '💲'}&nbsp;
                        {FORMA_LABELS[vendaAtual.forma_pagamento] ?? vendaAtual.forma_pagamento}
                        {(vendaAtual.parcelas ?? 1) > 1 && (
                          <span className="text-muted">
                            &nbsp;— {vendaAtual.parcelas}× de{' '}
                            {masks.moeda(
                              Number(vendaAtual.valor_final) / (vendaAtual.parcelas ?? 1)
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de itens */}
                  <div style={{
                    fontWeight: 600, fontSize: 13, marginTop: 16, marginBottom: 8,
                    paddingBottom: 8, borderBottom: '1px solid #F0F0F0',
                  }}>
                    Produtos Vendidos
                  </div>
                  <div className="table-wrap">
                    <table className="ft-table">
                      <thead>
                        <tr>
                          <th>Código</th><th>Produto</th>
                          <th>Qtd.</th><th>Preço Unit.</th><th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(vendaAtual.itens ?? []).map((item: ItemVendaDetalhe, i) => (
                          <tr key={i}>
                            <td className="text-muted">{item.produto_codigo}</td>
                            <td>{item.produto_nome}</td>
                            <td>{item.quantidade}</td>
                            <td>{masks.moeda(Number(item.preco_unitario))}</td>
                            <td className="fw-600">{masks.moeda(Number(item.subtotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totais */}
                  <div className="detail-totals">
                    <div className="detail-total-row">
                      <span>Subtotal</span>
                      <span>{masks.moeda(Number(vendaAtual.valor_total))}</span>
                    </div>
                    {Number(vendaAtual.desconto) > 0 && (
                      <div className="detail-total-row text-muted">
                        <span>Desconto</span>
                        <span>– {masks.moeda(Number(vendaAtual.desconto))}</span>
                      </div>
                    )}
                    <div className="detail-total-row total-final">
                      <span>Total Final</span>
                      <span>{masks.moeda(Number(vendaAtual.valor_final))}</span>
                    </div>
                    {(vendaAtual.parcelas ?? 1) > 1 && (
                      <div className="detail-total-row text-muted" style={{ fontSize: 12 }}>
                        <span>Valor por parcela</span>
                        <span>
                          {masks.moeda(
                            Number(vendaAtual.valor_final) / (vendaAtual.parcelas ?? 1)
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {vendaAtual.observacoes && (
                    <div className="detail-obs">
                      <strong>Observações:</strong> {vendaAtual.observacoes}
                    </div>
                  )}
                  {vendaAtual.motivo_cancelamento && (
                    <div className="alert alert-danger" style={{ marginTop: 12 }}>
                      <strong>Motivo do Cancelamento:</strong> {vendaAtual.motivo_cancelamento}
                    </div>
                  )}
                </>
              )}

              <div className="form-actions">
                <button className="btn btn-ghost" onClick={fecharModal}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Modal: NOVA VENDA / EDITAR VENDA
      ══════════════════════════════════════════════════════════════ */}
      {(modal === 'nova' || modal === 'editar') && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 820 }}>
            <div className="modal-header">
              {modal === 'editar' && vendaAtual
                ? `Editar Venda #${vendaAtual.id}`
                : 'Nova Venda'}
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>
            <div className="modal-body">
              {fMsg && <div className="alert alert-danger">{fMsg}</div>}

              {loadingDet ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : (
                <>
                  {/* ── Linha 1: Cliente + Forma de Pagamento + Parcelas ── */}
                  <div className="form-grid" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label>Cliente (opcional)</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          style={{ flex: 1 }}
                          value={fClienteId}
                          onChange={e => setFClienteId(e.target.value)}
                        >
                          <option value="">— Consumidor Final —</option>
                          {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setShowQC(v => !v); setQcMsg(''); }}
                        >
                          {showQC ? '✕' : '+ Cliente'}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Forma de Pagamento</label>
                      <select
                        value={fForma}
                        onChange={e => {
                          const v = e.target.value as FormaPagamento;
                          setFForma(v);
                          if (v !== 'CARTAO_CREDITO') setFParcelas(1);
                        }}
                      >
                        {FORMAS_PAGAMENTO.map(f => (
                          <option key={f} value={f}>{FORMA_LABELS[f]}</option>
                        ))}
                      </select>
                    </div>

                    {fForma === 'CARTAO_CREDITO' && (
                      <div className="form-group">
                        <label>Parcelas</label>
                        <select
                          value={fParcelas}
                          onChange={e => setFParcelas(Number(e.target.value))}
                        >
                          {PARCELAS_OPT.map(n => (
                            <option key={n} value={n}>
                              {n === 1
                                ? '1× à vista'
                                : `${n}× de ${masks.moeda(totalFinal > 0 ? totalFinal / n : 0)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* ── Quick: Cadastrar novo cliente ── */}
                  {showQC && (
                    <div className="quick-client-box">
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                        Cadastrar Novo Cliente
                      </div>
                      {qcMsg && <div className="alert alert-danger">{qcMsg}</div>}
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Nome *</label>
                          <input
                            value={qc.nome}
                            onChange={e => setQc(q => ({ ...q, nome: e.target.value }))}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="form-group">
                          <label>CPF</label>
                          <input
                            value={qc.cpf}
                            onChange={e => setQc(q => ({ ...q, cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            maxLength={14}
                          />
                        </div>
                        <div className="form-group">
                          <label>Telefone *</label>
                          <input
                            value={qc.telefone}
                            onChange={e => setQc(q => ({ ...q, telefone: e.target.value }))}
                            placeholder="(11) 99999-0000"
                          />
                        </div>
                        <div className="form-group">
                          <label>E-mail</label>
                          <input
                            type="email"
                            value={qc.email}
                            onChange={e => setQc(q => ({ ...q, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={salvarQC}
                          disabled={qcLoad}
                        >
                          {qcLoad ? 'Salvando...' : '✓ Salvar Cliente'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setShowQC(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Itens da venda ── */}
                  <div style={{
                    background: '#F8F8F8', padding: '8px 12px',
                    borderRadius: 6, marginBottom: 10,
                    fontWeight: 600, fontSize: 13,
                  }}>
                    Itens da Venda
                  </div>

                  {fItens.map((item, idx) => {
                    const sub = calcSubtotal(item, produtos);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 110px 40px',
                          gap: 8, marginBottom: 8, alignItems: 'end',
                        }}
                      >
                        <div className="form-group">
                          {idx === 0 && <label>Produto</label>}
                          <select
                            value={item.produto_id}
                            onChange={e => setItemVal(idx, 'produto_id', Number(e.target.value))}
                            style={item.produto_id === 0
                              ? { borderColor: 'var(--warning)' } : {}}
                          >
                            <option value={0}>Selecione um produto...</option>
                            {produtos.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nome} ({p.codigo}) — Estq: {p.quantidade_estoque}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          {idx === 0 && <label>Qtd.</label>}
                          <input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={e =>
                              setItemVal(idx, 'quantidade', Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="form-group">
                          {idx === 0 && <label>Subtotal</label>}
                          <input value={masks.moeda(sub)} readOnly />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ visibility: 'hidden' }}>x</label>}
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ width: '100%' }}
                            onClick={() => removeItem(idx)}
                            disabled={fItens.length === 1}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={addItem}
                    style={{ marginBottom: 16 }}
                  >
                    + Adicionar Item
                  </button>

                  {/* ── Desconto + Total ── */}
                  <div style={{ borderTop: '1px solid #EBEBEB', paddingTop: 14 }}>
                    <div style={{
                      display: 'flex', gap: 16,
                      alignItems: 'flex-end', justifyContent: 'flex-end',
                    }}>
                      <div className="form-group" style={{ width: 170 }}>
                        <label>Desconto (R$)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={fDesconto}
                          onChange={e => setFDesconto(e.target.value)}
                        />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          Subtotal: {masks.moeda(totalItens)}
                        </div>
                        <div style={{
                          fontSize: 20, fontWeight: 800,
                          color: 'var(--primary)', marginTop: 2,
                        }}>
                          {descParcelas(totalFinal, fParcelas, fForma)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Observações ── */}
                  <div className="form-group mt-16">
                    <label>Observações</label>
                    <textarea
                      rows={2}
                      value={fObs}
                      onChange={e => setFObs(e.target.value)}
                      placeholder="Informações adicionais sobre a venda..."
                    />
                  </div>

                  <div className="form-actions">
                    <button className="btn btn-ghost" onClick={fecharModal}>
                      Cancelar
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={salvarVenda}
                      disabled={fLoad || totalFinal <= 0}
                    >
                      {fLoad
                        ? 'Salvando...'
                        : modal === 'editar'
                          ? `Salvar Alterações — ${masks.moeda(totalFinal)}`
                          : `Confirmar Venda — ${masks.moeda(totalFinal)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Modal: CANCELAR VENDA
      ══════════════════════════════════════════════════════════════ */}
      {modal === 'cancelar' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              Cancelar Venda #{cancelId}
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                ⚠️ O cancelamento é <strong>irreversível</strong>. Os produtos serão devolvidos
                ao estoque e esta venda não contará como receita.
              </div>

              {cancelMsg && <div className="alert alert-danger">{cancelMsg}</div>}

              <div className="form-group mt-16">
                <label>
                  Motivo do Cancelamento *
                  <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                    ({cancelMotiv.trim().length}/20 mínimo)
                  </span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva detalhadamente o motivo do cancelamento..."
                  value={cancelMotiv}
                  onChange={e => setCancelMotiv(e.target.value)}
                  style={{
                    borderColor:
                      cancelMotiv.trim().length >= 20
                        ? 'var(--success)'
                        : cancelMotiv.trim().length > 0
                        ? 'var(--danger)'
                        : undefined,
                  }}
                />
                {cancelMotiv.trim().length > 0 && cancelMotiv.trim().length < 20 && (
                  <span className="field-error">
                    Ainda faltam {20 - cancelMotiv.trim().length} caractere(s).
                  </span>
                )}
              </div>

              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>
                  Voltar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={confirmarCancelamento}
                  disabled={cancelLoad || cancelMotiv.trim().length < 20}
                >
                  {cancelLoad ? 'Cancelando...' : 'Confirmar Cancelamento'}
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
