import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import StatusBadge from '../StatusBadge.jsx';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getClient(id).then(setClient).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error-text">{error}</p>;
  if (!client) return <p className="empty-state">Cargando...</p>;

  return (
    <>
      <h2>{client.name}</h2>

      <div className="card">
        <p><strong>Contacto:</strong> {client.contact_name || '-'}</p>
        <p><strong>Email:</strong> {client.email || '-'}</p>
        <p><strong>Telefono:</strong> {client.phone || '-'}</p>
        {client.notes && <p><strong>Notas:</strong> {client.notes}</p>}
      </div>

      <div className="card">
        <h3>Propuestas</h3>
        {client.proposals.length === 0 ? (
          <p className="empty-state">Este cliente todavia no tiene propuestas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Estado</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              {client.proposals.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="link" to={`/propuestas/${p.id}`}>
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
