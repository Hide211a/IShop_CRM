import { useAuth } from "../context/AuthContext";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { DashboardPage } from "./DashboardPage";
import { ManagerDashboardPage } from "./ManagerDashboardPage";

export function RoleDashboardPage() {
  const { user } = useAuth();
  if (user?.role === "MANAGER") return <ManagerDashboardPage />;
  if (user?.role === "ADMIN") return <AdminDashboardPage />;
  return <DashboardPage />;
}
