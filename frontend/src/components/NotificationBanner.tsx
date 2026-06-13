import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface NotificationData {
  lowStockCount: number;
  lowStockPreview: Array<{ id: string; name: string; quantity: number; minStock: number }>;
  overdueReservationCount: number;
  overdueReservations: Array<{
    id: string;
    number: string;
    buyerName: string | null;
    daysOverdue: number;
  }>;
  totalCount: number;
}

export function NotificationBanner() {
  const { user } = useAuth();
  const enabled = !!user && ["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationData>("/dashboard/notifications").then((r) => r.data),
    enabled,
    refetchInterval: 60_000,
  });

  if (!data || data.totalCount === 0) return null;

  const canManageDocs = user?.role === "MANAGER" || user?.role === "ADMIN";

  return (
    <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {data.lowStockCount > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          action={
            <Button component={Link} to="/stock" size="small" color="inherit">
              Залишки
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Низький залишок: {data.lowStockCount} позицій
          </Typography>
          {data.lowStockPreview.length > 0 && (
            <Typography variant="caption" color="inherit">
              {data.lowStockPreview.map((p) => `${p.name} (${p.quantity}/${p.minStock})`).join(" · ")}
            </Typography>
          )}
        </Alert>
      )}

      {canManageDocs && data.overdueReservationCount > 0 && (
        <Alert
          severity="error"
          icon={<ScheduleIcon />}
          action={
            <Button
              component={Link}
              to="/documents?type=RESERVATION&status=POSTED"
              size="small"
              color="inherit"
            >
              Резерви
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Прострочені резерви (&gt;3 днів): {data.overdueReservationCount}
          </Typography>
          <Typography variant="caption" color="inherit">
            {data.overdueReservations
              .slice(0, 3)
              .map((r) => `${r.number} — ${r.buyerName ?? "клієнт"} (${r.daysOverdue} дн.)`)
              .join(" · ")}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
