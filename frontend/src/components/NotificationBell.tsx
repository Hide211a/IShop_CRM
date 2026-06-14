import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
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

export function NotificationBell() {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const enabled = !!user && ["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationData>("/dashboard/notifications").then((r) => r.data),
    enabled,
    refetchInterval: 60_000,
  });

  if (!enabled) return null;

  const canManageDocs = user?.role === "MANAGER" || user?.role === "ADMIN";
  const count = data?.totalCount ?? 0;

  return (
    <>
      <Tooltip title={count > 0 ? `${count} сповіщень` : "Сповіщення"}>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Сповіщення"
          sx={{ color: "text.primary" }}
        >
          <Badge badgeContent={count} color="error" invisible={count === 0} max={99}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 340, maxWidth: "calc(100vw - 32px)", mt: 1 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Сповіщення
          </Typography>
          {count > 0 && (
            <Typography variant="caption" color="text.secondary">
              {count} активних
            </Typography>
          )}
        </Box>

        <Divider />

        {count === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Немає нових сповіщень
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ py: 0.5 }}>
            {data!.lowStockCount > 0 && (
              <>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningAmberIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Низький залишок (${data!.lowStockCount})`}
                    secondary={data!.lowStockPreview
                      .map((p) => `${p.name} — ${p.quantity}/${p.minStock}`)
                      .join(", ")}
                    slotProps={{
                      primary: { variant: "body2", sx: { fontWeight: 600 } },
                      secondary: { variant: "caption" },
                    }}
                  />
                </ListItem>
                <Box sx={{ px: 2, pb: 1 }}>
                  <Button
                    component={RouterLink}
                    to="/stock?lowOnly=1"
                    size="small"
                    onClick={() => setAnchorEl(null)}
                  >
                    Переглянути залишки
                  </Button>
                </Box>
              </>
            )}

            {canManageDocs && data!.overdueReservationCount > 0 && (
              <>
                {data!.lowStockCount > 0 && <Divider sx={{ my: 0.5 }} />}
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ScheduleIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Прострочені резерви (${data!.overdueReservationCount})`}
                    secondary={data!.overdueReservations
                      .slice(0, 3)
                      .map((r) => `${r.number} — ${r.daysOverdue} дн.`)
                      .join(", ")}
                    slotProps={{
                      primary: { variant: "body2", sx: { fontWeight: 600 } },
                      secondary: { variant: "caption" },
                    }}
                  />
                </ListItem>
                <Box sx={{ px: 2, pb: 1 }}>
                  <Button
                    component={RouterLink}
                    to="/documents?type=RESERVATION&status=POSTED"
                    size="small"
                    color="error"
                    onClick={() => setAnchorEl(null)}
                  >
                    Відкрити резерви
                  </Button>
                </Box>
              </>
            )}
          </List>
        )}
      </Menu>
    </>
  );
}
