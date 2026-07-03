import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StatusBadge from '../StatusBadge.jsx';
import NewProposalModal from '../NewProposalModal.jsx';

const STATUSES = ['', 'borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada'];

export default function Dashboard() {
  const [proposals, setProposals] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewProposal, setShowNewProposal] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProposals({ status, q });
      setProposals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function onSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Dashboard de propuestas</h2>
        <button onClick={() => setShowNewProposal(true)}>+ Nueva propuesta</button>
      </div>

      <form className="toolbar" onSubmit={onSearchSubmit}>
        <input
          placeholder="Buscar por cliente o titulo..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'Todos los estados'}
            </option>
          ))}
        </select>
        <button type="submit">Buscar</button>
      </form>

      <div className="card">
        {error && <p className="error-text">{error}</p>}
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : proposals.length === 0 ? (
          <p className="empty-state">No hay propuestas que coincidan con el filtro.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Propuesta</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Actualizada</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="link" to={`/propuestas/${p.id}`}>
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <Link className="link" to={`/clientes/${p.client_id}`}>
                      {p.client_name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{new Date(p.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewProposal && (
        <NewProposalModal onClose={() => setShowNewProposal(false)} onCreated={load} />
      )}
    </>
  );
}
