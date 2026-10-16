import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth.js";

export default function RequireAdminOnly({ children }) {
  const { isAuthenticated, user } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== "admin") {
    return <Navigate to={user?.role === "superadmin" ? "/platform" : "/"} replace />;
  }

  return children;
}
