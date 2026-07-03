import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', contact_name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setClients(await api.getClients());
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createClient(form);
      setForm({ name: '', contact_name: '', email: '', phone: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h2>Clientes</h2>

      <div className="card">
        <h3>Nuevo cliente</h3>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Nombre *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Persona de contacto
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Telefono
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Agregar cliente'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <p className="empty-state">Todavia no hay clientes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Propuestas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="link" to={`/clientes/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.contact_name || c.email || '-'}</td>
                  <td>{c.proposal_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
