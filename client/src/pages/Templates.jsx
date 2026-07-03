import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, SEARCH_SERVICE_TYPES } from '../api.js';

const emptyPricing = { base_salary: '', payments_per_year: 13, bonus_pct: '', fee_pct: '' };

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [form, setForm] = useState({ client_id: '', title: '' });
  const [pricing, setPricing] = useState(emptyPricing);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const isSearchService = activeTemplate && SEARCH_SERVICE_TYPES.includes(activeTemplate.service_type);

  async function load() {
    const [tpl, cl] = await Promise.all([api.getTemplates(), api.getClients()]);
    setTemplates(tpl.templates);
    setDriveConfigured(tpl.driveConfigured);
    setClients(cl);
  }

  useEffect(() => {
    load();
  }, []);

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

  function openModal(template) {
    setActiveTemplate(template);
    setForm({ client_id: clients[0]?.id || '', title: `Propuesta - ${template.name}` });
    setPricing(emptyPricing);
    setFeeBreakdown(null);
    setError('');
  }

  async function onCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const body = {
        template_id: activeTemplate.id,
        client_id: Number(form.client_id),
        title: form.title,
      };
      if (isSearchService && pricing.base_salary && pricing.fee_pct) {
        Object.assign(body, pricing);
      }
      const proposal = await api.createProposalFromTemplate(body);
      setActiveTemplate(null);
      navigate(`/propuestas/${proposal.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <h2>Plantillas de propuestas</h2>

      {!driveConfigured && (
        <div className="card">
          <p className="empty-state">
            Google Drive no esta configurado: las plantillas y propuestas generadas se guardan
            localmente en el servidor. Ver README para conectar Drive mas adelante.
          </p>
        </div>
      )}

      <div className="card">
        {templates.length === 0 ? (
          <p className="empty-state">No hay plantillas todavia.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Servicio</th>
                <th>Idioma</th>
                <th>Nombre de cliente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.file_url || t.drive_link ? (
                      <a className="link" href={t.file_url || t.drive_link} target="_blank" rel="noreferrer">
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}
                  </td>
                  <td>{t.service_type_label}</td>
                  <td>{t.language === 'en' ? 'Ingles' : 'Espanol'}</td>
                  <td>
                    {t.has_client_placeholder ? (
                      <span className="badge badge-aprobada">automatico</span>
                    ) : (
                      <span className="badge badge-borrador">manual en PowerPoint</span>
                    )}
                  </td>
                  <td>
                    <button onClick={() => openModal(t)} disabled={clients.length === 0}>
                      Crear propuesta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {clients.length === 0 && (
          <p className="empty-state">Agrega al menos un cliente antes de crear propuestas.</p>
        )}
      </div>

      {activeTemplate && (
        <div className="modal-backdrop" onClick={() => setActiveTemplate(null)}>
          <div className="modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3>Crear propuesta desde "{activeTemplate.name}"</h3>

            {activeTemplate.has_client_placeholder ? (
              <p className="empty-state">El nombre del cliente se completa automaticamente en la portada.</p>
            ) : (
              <p className="empty-state">
                Esta plantilla no tiene un cuadro editable en la portada: despues de generarla, escribi
                el nombre del cliente a mano en PowerPoint.
              </p>
            )}

            <form onSubmit={onCreate}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                Cliente
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                Titulo de la propuesta
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>

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
                <button type="button" className="secondary" onClick={() => setActiveTemplate(null)}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
