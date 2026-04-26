import { ThemeProvider, CssBaseline } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import theme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';

import AdminLayout from './components/layout/AdminLayout';
import OwnerLayout from './components/layout/OwnerLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CenterQueuePage from './pages/centers/CenterQueuePage';
import CenterDetailPage from './pages/centers/CenterDetailPage';
import UsersPage from './pages/users/UsersPage';
import UnlinkRequestsPage from './pages/users/UnlinkRequestsPage';
import BillingDashboardPage from './pages/billing/BillingDashboardPage';
import CenterBillingPage from './pages/billing/CenterBillingPage';
import InvoicesPage from './pages/billing/InvoicesPage';
import FeedModerationPage from './pages/content/FeedModerationPage';
import SettingsPage from './pages/settings/SettingsPage';
import DuplicatesPage from './pages/students/DuplicatesPage';
import StudentManagementPage from './pages/students/StudentManagementPage';
import OwnerManagementPage from './pages/owners/OwnerManagementPage';
import ParentManagementPage from './pages/parents/ParentManagementPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import SubscriptionManagePage from './pages/subscription/SubscriptionManagePage';
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import OwnerCentersPage from './pages/owner/OwnerCentersPage';
import OwnerCenterDetailPage from './pages/owner/OwnerCenterDetailPage';
import OwnerStudentsPage from './pages/owner/OwnerStudentsPage';
import OwnerBatchesPage from './pages/owner/OwnerBatchesPage';
import OwnerTeachersPage from './pages/owner/OwnerTeachersPage';
import OwnerAttendancePage from './pages/owner/OwnerAttendancePage';
import OwnerParentsPage from './pages/owner/OwnerParentsPage';
import OwnerReportsPage from './pages/owner/OwnerReportsPage';
import OwnerRolesPage from './pages/owner/OwnerRolesPage';
import OwnerNotificationsPage from './pages/owner/OwnerNotificationsPage';
import OwnerSettingsPage from './pages/owner/OwnerSettingsPage';
import { CircularProgress, Box } from '@mui/material';

function LoadingScreen() {
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress />
    </Box>
  );
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isAdmin, isOwner, activePortal, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    // Logged in but not admin — bounce to owner portal if they have it, else login
    if (isOwner) return <Navigate to="/owner/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  if (activePortal !== 'admin') return <Navigate to="/owner/dashboard" replace />;
  return <>{children}</>;
}

function RequireOwner({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isAdmin, isOwner, activePortal, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!isOwner) {
    // Logged in but not owner — bounce to admin if they have it, else login
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  if (activePortal !== 'owner') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function CatchAll() {
  const { firebaseUser, isAdmin, isOwner, activePortal, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (isAdmin && activePortal === 'admin') return <Navigate to="/dashboard" replace />;
  if (isOwner && activePortal === 'owner') return <Navigate to="/owner/dashboard" replace />;
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  if (isOwner) return <Navigate to="/owner/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SnackbarProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* ── Admin portal ── */}
            <Route
              path="/"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="centers" element={<CenterQueuePage />} />
              <Route path="centers/:id" element={<CenterDetailPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="unlink-requests" element={<UnlinkRequestsPage />} />
              <Route path="billing" element={<BillingDashboardPage />} />
              <Route path="billing/centers" element={<CenterBillingPage />} />
              <Route path="billing/invoices" element={<InvoicesPage />} />
              <Route path="content" element={<FeedModerationPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="students" element={<DuplicatesPage />} />
              <Route path="student-management" element={<StudentManagementPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="subscription/manage" element={<SubscriptionManagePage />} />
              <Route path="owners" element={<OwnerManagementPage />} />
              <Route path="parents" element={<ParentManagementPage />} />
            </Route>

            {/* ── Owner portal ── */}
            <Route
              path="/owner"
              element={
                <RequireOwner>
                  <OwnerLayout />
                </RequireOwner>
              }
            >
              <Route index element={<Navigate to="/owner/dashboard" replace />} />
              <Route path="dashboard" element={<OwnerDashboardPage />} />
              <Route path="centers" element={<OwnerCentersPage />} />
              <Route path="centers/:id" element={<OwnerCenterDetailPage />} />
              <Route path="students" element={<OwnerStudentsPage />} />
              <Route path="batches" element={<OwnerBatchesPage />} />
              <Route path="teachers" element={<OwnerTeachersPage />} />
              <Route path="attendance" element={<OwnerAttendancePage />} />
              <Route path="parents" element={<OwnerParentsPage />} />
              <Route path="reports" element={<OwnerReportsPage />} />
              <Route path="roles" element={<OwnerRolesPage />} />
              <Route path="notifications" element={<OwnerNotificationsPage />} />
              <Route path="settings" element={<OwnerSettingsPage />} />
            </Route>

            <Route path="*" element={<CatchAll />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
