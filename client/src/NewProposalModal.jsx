import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SEARCH_SERVICE_TYPES } from './api.js';

const emptyPricing = { base_salary: '', payments_per_year: 13, bonus_pct: '', fee_pct: '' };

// Modal generico para crear una propuesta desde una plantilla. Se usa desde Templates
// (plantilla preseleccionada), Dashboard y ClientDetail (cliente preseleccionado, si aplica).
export default function NewProposalModal({ initialTemplateId, initialClientId, onClose, onCreated }) {
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [templateId, setTemplateId] = useState(initialTemplateId || '');
  const [clientId, setClientId] = useState(initialClientId || '');
  const [title, setTitle] = useState('');
  const [pricing, setPricing] = useState(emptyPricing);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const activeTemplate = templates.find((t) => String(t.id) === String(templateId));
  const isSearchService = activeTemplate && SEARCH_SERVICE_TYPES.includes(activeTemplate.service_type);

  useEffect(() => {
    Promise.all([api.getTemplates(), api.getClients()]).then(([tpl, cl]) => {
      setTemplates(tpl.templates);
      setClients(cl);
      if (!initialClientId && cl.length > 0) setClientId(cl[0].id);
      if (!initialTemplateId && tpl.templates.length > 0) setTemplateId(tpl.templates[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTemplate) setTitle((t) => t || `Propuesta - ${activeTemplate.name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate]);

  useEffect(() => {
    if (!isSearchService || !pricing.base_salary || !pricing.fee_pct) {
      setFeeBreakdown(null);
      return;
    }
    const timer = setTimeout(() => {
      api.calculateFee(pricing).then(setFeeBreakdown).catch(() => setFeeBreakdown(null));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing, isSearchService]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const body = { template_id: Number(templateId), client_id: Number(clientId), title };
      if (isSearchService && pricing.base_salary && pricing.fee_pct) {
        Object.assign(body, pricing);
      }
      const proposal = await api.createProposalFromTemplate(body);
      onCreated?.(proposal);
      navigate(`/propuestas/${proposal.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <h3>Nueva propuesta</h3>

        {clients.length === 0 || templates.length === 0 ? (
          <p className="empty-state">
            Necesitas al menos un cliente y una plantilla para crear una propuesta.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              Plantilla
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.service_type_label}
                    {t.language === 'en' ? ', EN' : ''})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              Cliente
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              Titulo de la propuesta
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>

            {activeTemplate && (
              activeTemplate.has_client_placeholder ? (
                <p className="empty-state">El nombre del cliente se completa automaticamente en la portada.</p>
              ) : (
                <p className="empty-state">
                  Esta plantilla no tiene un cuadro editable en la portada: despues de generarla,
                  escribi el nombre del cliente a mano en PowerPoint.
                </p>
              )
            )}

            {isSearchService && (
              <>
                <h4 style={{ marginBottom: 4 }}>Calculadora de honorarios</h4>
                <p className="empty-state" style={{ marginTop: 0 }}>
                  Calcula el fee para copiarlo a mano en la tabla del PPT.
                </p>
                <div className="form-grid">
                  <label>
                    Salario mensual bruto
                    <input
                      type="number"
                      value={pricing.base_salary}
                      onChange={(e) => setPricing({ ...pricing, base_salary: e.target.value })}
                    />
                  </label>
                  <label>
                    Pagos por año
                    <input
                      type="number"
                      value={pricing.payments_per_year}
                      onChange={(e) => setPricing({ ...pricing, payments_per_year: e.target.value })}
                    />
                  </label>
                  <label>
                    Bono (%)
                    <input
                      type="number"
                      value={pricing.bonus_pct}
                      onChange={(e) => setPricing({ ...pricing, bonus_pct: e.target.value })}
                    />
                  </label>
                  <label>
                    Fee (%)
                    <input
                      type="number"
                      value={pricing.fee_pct}
                      onChange={(e) => setPricing({ ...pricing, fee_pct: e.target.value })}
                    />
                  </label>
                </div>

                {feeBreakdown && (
                  <table style={{ marginTop: 12 }}>
                    <tbody>
                      <tr><td>Compensacion anual</td><td>{feeBreakdown.annual_compensation.toLocaleString()}</td></tr>
                      <tr><td>Fee</td><td>{feeBreakdown.fee_amount.toLocaleString()}</td></tr>
                      {feeBreakdown.installments.map((i) => (
                        <tr key={i.label}><td>{i.label}</td><td>{i.amount.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {error && <p className="error-text">{error}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" disabled={creating}>
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
