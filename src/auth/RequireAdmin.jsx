import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth.js";
import { getViewAsCompany } from "../api/client.js";

// This gate protects the operational company workspace. Recruiters share
// operational access with admins; company controls use RequireAdminOnly.
export default function RequireAdmin({ children }) {
  const { isAuthenticated, user } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role === "superadmin") {
    if (getViewAsCompany()) return children; // read-only, server-enforced
    return <Navigate to="/platform" replace />;
  }

  if (user?.role !== "admin" && user?.role !== "recruiter") {
    return <Navigate to="/login" replace state={{ from: location.pathname, roleDenied: true }} />;
  }

  return children;
}
