async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  getClients: () => request('/clients'),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (body) => request('/clients', { method: 'POST', body: JSON.stringify(body) }),
  updateClient: (id, body) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  getProposals: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/proposals${suffix}`);
  },
  getProposal: (id) => request(`/proposals/${id}`),
  createProposal: (body) => request('/proposals', { method: 'POST', body: JSON.stringify(body) }),
  createProposalFromTemplate: (body) =>
    request('/proposals/from-template', { method: 'POST', body: JSON.stringify(body) }),
  updateProposal: (id, body) => request(`/proposals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setProposalStatus: (id, status) =>
    request(`/proposals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getTemplates: () => request('/templates'),
  createTemplate: (body) => request('/templates', { method: 'POST', body: JSON.stringify(body) }),
};
