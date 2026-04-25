import { ThemeProvider, CssBaseline } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import theme from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';

import AdminLayout from './components/layout/AdminLayout';
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
import { CircularProgress, Box } from '@mui/material';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SnackbarProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AdminLayout />
                </PrivateRoute>
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
