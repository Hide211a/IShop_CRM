import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomeRedirect } from "./components/HomeRedirect";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RoleDashboardPage } from "./pages/RoleDashboardPage";
import { StockPage } from "./pages/StockPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DocumentCreatePage } from "./pages/DocumentCreatePage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { ProductsPage } from "./pages/ProductsPage";
import { DirectoriesPage } from "./pages/DirectoriesPage";
import { UsersPage } from "./pages/UsersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { theme } from "./theme";

const queryClient = new QueryClient();

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<HomeRedirect />} />
                  <Route path="dashboard" element={<RoleDashboardPage />} />

                  <Route element={<ProtectedRoute roles={["DIRECTOR", "ADMIN", "MANAGER"]} />}>
                    <Route path="stock" element={<StockPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={["MANAGER", "ADMIN"]} />}>
                    <Route path="documents">
                      <Route index element={<DocumentsPage />} />
                      <Route path="new" element={<DocumentCreatePage />} />
                      <Route path=":id" element={<DocumentDetailPage />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="directories" element={<DirectoriesPage />} />
                    <Route path="users" element={<UsersPage />} />
                  </Route>

                  <Route element={<ProtectedRoute roles={["DIRECTOR", "ADMIN"]} />}>
                    <Route path="reports" element={<ReportsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
