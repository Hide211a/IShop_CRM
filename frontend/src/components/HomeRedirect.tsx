import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function HomeRedirect() {
  const { user } = useAuth();

  if (user?.role === "DIRECTOR") {
    return <Navigate to="/dashboard" replace />;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
