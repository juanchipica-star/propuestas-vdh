import { NavLink, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Templates from './pages/Templates.jsx';
import ProposalDetail from './pages/ProposalDetail.jsx';

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Propuestas</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/clientes" className={({ isActive }) => (isActive ? 'active' : '')}>
            Clientes
          </NavLink>
          <NavLink to="/plantillas" className={({ isActive }) => (isActive ? 'active' : '')}>
            Plantillas
          </NavLink>
        </nav>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetail />} />
          <Route path="/plantillas" element={<Templates />} />
          <Route path="/propuestas/:id" element={<ProposalDetail />} />
        </Routes>
      </main>
    </div>
  );
}
