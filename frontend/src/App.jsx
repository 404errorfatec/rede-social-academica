import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import GruposPage from './pages/GruposPage.jsx';
import ComponentesPage from './pages/ComponentesPage.jsx';
import MuralPage from './pages/MuralPage.jsx';

// Shell simples com navegação entre os módulos do CRUD inicial.
// Chat e Mapa de Salas ainda não têm tela: ficam como próximos passos.
export default function App() {
  return (
    <>
      <nav>
        <NavLink to="/grupos" className={({ isActive }) => (isActive ? 'active' : '')}>
          Grupos (Salas)
        </NavLink>
        <NavLink to="/componentes" className={({ isActive }) => (isActive ? 'active' : '')}>
          Componentes (Matérias)
        </NavLink>
        <NavLink to="/mural" className={({ isActive }) => (isActive ? 'active' : '')}>
          Mural
        </NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/grupos" replace />} />
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/componentes" element={<ComponentesPage />} />
          <Route path="/mural" element={<MuralPage />} />
        </Routes>
      </main>
    </>
  );
}
