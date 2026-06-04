import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DemandePage from './pages/DemandePage';
import ClientDashboard from './pages/client/Dashboard';
import ClientDossier from './pages/client/Dossier';
import ClientPaiement from './pages/client/Paiement';
import ClientPaiementSuccess from './pages/client/PaiementSuccess';
import StoreDossiers from './pages/store/Dossiers';
import StoreMap from './pages/store/Map';
import StoreTransporteurs from './pages/store/Transporteurs';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demande" element={<DemandePage />} />

        {/* Client (rôle : client) */}
        <Route path="/client" element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="dossier/:id" element={<ClientDossier />} />
          {/* success avant :dossierId pour éviter le conflit de matching */}
          <Route path="paiement/success" element={<ClientPaiementSuccess />} />
          <Route path="paiement/:dossierId" element={<ClientPaiement />} />
        </Route>

        {/* Store (rôle : store) */}
        <Route path="/store" element={<ProtectedRoute allowedRoles={['store']} />}>
          <Route index element={<Navigate to="dossiers" replace />} />
          <Route path="dossiers" element={<StoreDossiers />} />
          <Route path="transporteurs" element={<StoreTransporteurs />} />
          <Route path="map" element={<StoreMap />} />
        </Route>

        {/* Tracker (rôle : transporter / broker) */}
        <Route path="/tracker" element={<ProtectedRoute allowedRoles={['transporter', 'broker']} />}>
          <Route index element={<div style={{ padding: '2rem' }}>Tableau de bord transporteur — en construction</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
