import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import CalendarioPage from './pages/CalendarioPage';
import EmpresasPage from './pages/EmpresasPage';
import EmpresaDetallePage from './pages/EmpresaDetallePage';
import ProductosPage from './pages/ProductosPage';
import OfertasPage from './pages/OfertasPage';
import OfertaDetallePage from './pages/OfertaDetallePage';
import UsuariosPage from './pages/UsuariosPage';
import InformesPage from './pages/InformesPage';
import DashboardPage from './pages/DashboardPage';
import AuditLogPage from './pages/AuditLogPage';

dayjs.locale('es');

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={{
      token: {
        colorPrimary: '#13468A',
        colorLink: '#13468A',
        borderRadius: 6,
      },
      components: {
        Layout: {
          siderBg: '#0a2a54',
        },
        Menu: {
          darkItemBg: '#0a2a54',
          darkItemSelectedBg: '#13468A',
          darkItemHoverBg: '#0f3a72',
        },
      },
    }}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="calendario" element={<CalendarioPage />} />
                <Route path="empresas" element={<EmpresasPage />} />
                <Route path="empresas/:id" element={<EmpresaDetallePage />} />
                <Route path="productos" element={<ProductosPage />} />
                <Route path="ofertas" element={<OfertasPage />} />
                <Route path="ofertas/:id" element={<OfertaDetallePage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="informes" element={<InformesPage />} />
                <Route path="historial" element={<AuditLogPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
