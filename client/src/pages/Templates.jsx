import { useEffect, useState } from 'react';
import { api } from '../api.js';
import NewProposalModal from '../NewProposalModal.jsx';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [clientCount, setClientCount] = useState(0);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  async function load() {
    const [tpl, cl] = await Promise.all([api.getTemplates(), api.getClients()]);
    setTemplates(tpl.templates);
    setDriveConfigured(tpl.driveConfigured);
    setClientCount(cl.length);
  }

  useEffect(() => {
    load();
  }, []);

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
                    <button onClick={() => setActiveTemplateId(t.id)} disabled={clientCount === 0}>
                      Crear propuesta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {clientCount === 0 && (
          <p className="empty-state">Agrega al menos un cliente antes de crear propuestas.</p>
        )}
      </div>

      {activeTemplateId && (
        <NewProposalModal
          initialTemplateId={activeTemplateId}
          onClose={() => setActiveTemplateId(null)}
        />
      )}
    </>
  );
}
