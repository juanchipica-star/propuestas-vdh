import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import StatusBadge from '../StatusBadge.jsx';

const STATUSES = ['borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada'];

export default function ProposalDetail() {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  async function load() {
    const data = await api.getProposal(id);
    setProposal(data);
    setNotes(data.notes || '');
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function onStatusChange(e) {
    try {
      await api.setProposalStatus(id, e.target.value);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSaveNotes() {
    setSavingNotes(true);
    try {
      await api.updateProposal(id, { notes });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!proposal) return <p className="empty-state">Cargando...</p>;

  return (
    <>
      <h2>{proposal.title}</h2>
      <p>
        Cliente: <Link className="link" to={`/clientes/${proposal.client_id}`}>{proposal.client_name}</Link>
      </p>

      <div className="card">
        <div className="toolbar" style={{ alignItems: 'center' }}>
          <StatusBadge status={proposal.status} />
          <select value={proposal.status} onChange={onStatusChange}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {proposal.drive_link && (
            <a className="link" href={proposal.drive_link} target="_blank" rel="noreferrer">
              Abrir en Google Drive
            </a>
          )}
        </div>
        <p><strong>Enviada:</strong> {proposal.sent_at ? new Date(proposal.sent_at).toLocaleString() : '-'}</p>
        <p><strong>Respondida:</strong> {proposal.responded_at ? new Date(proposal.responded_at).toLocaleString() : '-'}</p>
      </div>

      <div className="card">
        <h3>Notas</h3>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button onClick={onSaveNotes} disabled={savingNotes}>
            {savingNotes ? 'Guardando...' : 'Guardar notas'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Historial de estados</h3>
        {proposal.history.length === 0 ? (
          <p className="empty-state">Sin historial.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {proposal.history.map((h) => (
                <tr key={h.id}>
                  <td><StatusBadge status={h.status} /></td>
                  <td>{new Date(h.changed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
