import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import RoleRouteGuard, { getRoleDashboardPath } from './components/auth/RoleRouteGuard';

// Pages
import LoginPage from './pages/LoginPage';
import MinesPage from './pages/MinesPage';
import ContractorsPage from './pages/ContractorsPage';
import WorkersPage from './pages/WorkersPage';
import InspectionsPage from './pages/InspectionsPage';
import ViolationsPage from './pages/ViolationsPage';
import CorrectiveActionsPage from './pages/CorrectiveActionsPage';
import AIInsightsPage from './pages/AIInsightsPage';
import ReportsPage from './pages/ReportsPage';
import GISMapPage from './pages/GISMapPage';
import DocumentsPage from './pages/DocumentsPage';
import AlertsPage from './pages/AlertsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import EscalationsPage from './pages/EscalationsPage';
import RecurringProblemsPage from './pages/RecurringProblemsPage';

// 5 Dedicated Role Dashboards
import ContractorDashboard from './pages/dashboards/ContractorDashboard';
import WorkerManagementDashboard from './pages/dashboards/WorkerManagementDashboard';
import FieldOfficerDashboard from './pages/dashboards/FieldOfficerDashboard';
import MineManagerDashboard from './pages/dashboards/MineManagerDashboard';
import CorporateDashboard from './pages/dashboards/CorporateDashboard';

function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Role-Specific Dashboards */}
          <Route
            path="/contractor/dashboard"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR']}>
                  <ContractorDashboard />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/worker-management/dashboard"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['WORKER MANAGEMENT']}>
                  <WorkerManagementDashboard />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/field-officer/dashboard"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['FIELD OFFICER']}>
                  <FieldOfficerDashboard />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/mine-manager/dashboard"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER']}>
                  <MineManagerDashboard />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/corporate/dashboard"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CORPORATE MANAGEMENT']}>
                  <CorporateDashboard />
                </RoleRouteGuard>
              </AppLayout>
            }
          />

          {/* Generic dashboard redirect */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Protected Business Feature Routes */}
          <Route
            path="/mines"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'FIELD OFFICER', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <MinesPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/contractors"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <ContractorsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/workers"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'WORKER MANAGEMENT', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <WorkersPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/inspections"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['FIELD OFFICER', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <InspectionsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/violations"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'FIELD OFFICER', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <ViolationsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/corrective-actions"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'MINE MANAGER', 'FIELD OFFICER', 'CORPORATE MANAGEMENT']}>
                  <CorrectiveActionsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/ai-insights"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <AIInsightsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <ReportsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/gis"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['FIELD OFFICER', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <GISMapPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/documents"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'WORKER MANAGEMENT', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <DocumentsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/alerts"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CONTRACTOR', 'WORKER MANAGEMENT', 'FIELD OFFICER', 'MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <AlertsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <AuditLogsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/escalations"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <EscalationsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/recurring-problems"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <RecurringProblemsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />

          {/* System Settings (Governance only) */}
          <Route
            path="/users"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['CORPORATE MANAGEMENT']}>
                  <UsersPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <RoleRouteGuard allowedRoles={['MINE MANAGER', 'CORPORATE MANAGEMENT']}>
                  <SettingsPage />
                </RoleRouteGuard>
              </AppLayout>
            }
          />

          {/* Legacy admin paths redirect to dynamic dashboard */}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin-dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

          {/* Root and Fallback redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
