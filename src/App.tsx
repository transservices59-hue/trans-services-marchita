import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DemandePage from './pages/DemandePage';
import ClientDashboard from './pages/client/Dashboard';
import ClientDossier from './pages/client/Dossier';
import ClientPaiement from './pages/client/Paiement';
import ClientPaiementSuccess from './pages/client/PaiementSuccess';
import ClientSuivi from './pages/client/Suivi';
import StoreDossiers from './pages/store/Dossiers';
import StoreMap from './pages/store/Map';
import StoreTransporteurs from './pages/store/Transporteurs';
import StoreAudit from './pages/store/Audit';
import StoreAnalytics from './pages/store/Analytics';
import StoreDossierDetail from './pages/store/DossierDetail';
import MFAEnroll from './pages/MFAEnroll';
import LegalPage from './pages/Legal';
import PrivacyPage from './pages/Privacy';
import CookieBanner from './components/CookieBanner';
import TrackerPage from './pages/transporter/Tracker';
import DevisAccepte from './pages/DevisAccepte';
import DevisRefuse from './pages/DevisRefuse';
import RegisterPage from './pages/RegisterPage';
import StoreDemande from './pages/store/StoreDemande';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demande" element={<DemandePage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/mfa/enroll" element={<MFAEnroll />} />
        <Route path="/devis-accepte" element={<DevisAccepte />} />
        <Route path="/devis-refuse"  element={<DevisRefuse />} />
        <Route path="/register"      element={<RegisterPage />} />

        {/* Client (rôle : client) */}
        <Route path="/client" element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="dossier/:id" element={<ClientDossier />} />
          {/* success avant :dossierId pour éviter le conflit de matching */}
          <Route path="paiement/success" element={<ClientPaiementSuccess />} />
          <Route path="paiement/:dossierId" element={<ClientPaiement />} />
          <Route path="suivi/:id" element={<ClientSuivi />} />
        </Route>

        {/* Store (rôle : store) */}
        <Route path="/store" element={<ProtectedRoute allowedRoles={['store']} />}>
          <Route index element={<Navigate to="dossiers" replace />} />
          <Route path="dossiers" element={<StoreDossiers />} />
          <Route path="dossier/:id" element={<StoreDossierDetail />} />
          <Route path="transporteurs" element={<StoreTransporteurs />} />
          <Route path="map" element={<StoreMap />} />
          <Route path="analytics" element={<StoreAnalytics />} />
          <Route path="audit"        element={<StoreAudit />} />
          <Route path="demande/:id"  element={<StoreDemande />} />
        </Route>

        {/* Tracker (rôle : transporter / broker) */}
        <Route path="/tracker" element={<ProtectedRoute allowedRoles={['transporter', 'broker']} />}>
          <Route index element={<TrackerPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <CookieBanner />
    </BrowserRouter>
  );
}
