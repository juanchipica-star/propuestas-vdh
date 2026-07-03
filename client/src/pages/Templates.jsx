import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [form, setForm] = useState({ client_id: '', title: '' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function load() {
    const [tpl, cl] = await Promise.all([api.getTemplates(), api.getClients()]);
    setTemplates(tpl.templates);
    setDriveConfigured(tpl.driveConfigured);
    setClients(cl);
  }

  useEffect(() => {
    load();
  }, []);

  function openModal(template) {
    setActiveTemplate(template);
    setForm({ client_id: clients[0]?.id || '', title: `Propuesta - ${template.name}` });
    setError('');
  }

  async function onCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const proposal = await api.createProposalFromTemplate({
        template_id: activeTemplate.id,
        client_id: Number(form.client_id),
        title: form.title,
      });
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
          <p className="error-text">
            Google Drive no esta configurado (o falta DRIVE_TEMPLATES_FOLDER_ID). Configura las
            credenciales en server/.env para sincronizar plantillas automaticamente. Ver README.
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
                <th>Categoria</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.drive_link ? (
                      <a className="link" href={t.drive_link} target="_blank" rel="noreferrer">
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}
                  </td>
                  <td>{t.category || '-'}</td>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Crear propuesta desde "{activeTemplate.name}"</h3>
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
              {error && <p className="error-text">{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
