// Catalogo de las plantillas VDH reales (ver server/assets/templates/*.pptx). Se usa tanto
// para importarlas una vez desde la carpeta local del usuario (scripts/importVdhTemplates.js)
// como para auto-sembrar la base de datos en cada arranque cuando esta vacia (seedTemplates.js) -
// necesario porque en Vercel la base vive en /tmp y se resetea entre arranques en frio.
export const TEMPLATE_CATALOG = [
  { name: 'Coaching', service_type: 'coaching', language: 'es', has_client_placeholder: 1, category: 'Español' },
  { name: 'Executive Search', service_type: 'executive_search', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Talent Acquisition', service_type: 'talent_acquisition', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Talent Search', service_type: 'talent_search', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Market Insights', service_type: 'market_insights', language: 'es', has_client_placeholder: 1, category: 'Español' },
  { name: 'Assessment', service_type: 'assessment', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Selfplacement', service_type: 'selfplacement', language: 'es', has_client_placeholder: 1, category: 'Español' },
  { name: 'Future Quest', service_type: 'future_quest', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Presentacion Comercial VDH', service_type: 'institucional', language: 'es', has_client_placeholder: 0, category: 'Español' },
  { name: 'Executive Search (EN)', service_type: 'executive_search', language: 'en', has_client_placeholder: 0, category: 'English' },
  { name: 'Talent Acquisition (EN)', service_type: 'talent_acquisition', language: 'en', has_client_placeholder: 0, category: 'English' },
  { name: 'Talent Search (EN)', service_type: 'talent_search', language: 'en', has_client_placeholder: 0, category: 'English' },
  { name: 'Assessment (EN)', service_type: 'assessment', language: 'en', has_client_placeholder: 0, category: 'English' },
  { name: 'Selfplacement (EN)', service_type: 'selfplacement', language: 'en', has_client_placeholder: 0, category: 'English' },
];

// La propuesta real ya enviada, usada como dato de ejemplo/historial.
export const SEED_PROPOSAL = {
  clientName: 'Desol',
  templateName: 'Market Insights',
  title: 'Market Insights - Desol',
  serviceType: 'market_insights',
  status: 'enviada',
  sentAt: '2026-05-29 00:00:00',
  file: 'Desol - Market Insights.pptx',
};
