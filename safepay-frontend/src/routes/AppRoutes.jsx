import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/public/LandingPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ProtectedRoute from "../components/dashboard/ProtectedRoute";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import TransactionHistoryPage from "../pages/dashboard/TransactionHistoryPage";
import TransferPage from "../pages/dashboard/TransferPage";
import AccountPage from "../pages/dashboard/AccountPage";
import AISecurityPage from "../pages/dashboard/AISecurityPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminTransactionsPage from "../pages/admin/AdminTransactionsPage";
import AdminMerchantsPage from "../pages/admin/AdminMerchantsPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/transactions" element={<TransactionHistoryPage />} />
            <Route path="/transfer" element={<TransferPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
            <Route path="/admin/merchants" element={<AdminMerchantsPage />} />
            <Route path="/admin/ai-security" element={<AISecurityPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["MERCHANT"]} />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/merchant/dashboard"
              element={<AdminDashboardPage merchantMode />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
