import { Navigate, Outlet, useLocation } from "react-router-dom";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("safepay_user") || "{}");
  } catch {
    return {};
  }
}

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const token = localStorage.getItem("safepay_token");
  const user = getStoredUser();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRoles?.length) {
    const role = String(user.role || "").toUpperCase();

    if (!allowedRoles.includes(role)) {
      const fallbackRoutes = {
        ADMIN: "/admin/dashboard",
        MERCHANT: "/merchant/dashboard",
        USER: "/dashboard",
      };

      return (
        <Navigate
          to={fallbackRoutes[role] || "/login"}
          replace
        />
      );
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;