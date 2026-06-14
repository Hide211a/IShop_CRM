import { useMemo, useState } from "react";
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
import CloseIcon from "@mui/icons-material/Close";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  dismissAllNotifications,
  dismissNotification,
  loadNotificationDismissals,
  lowStockFingerprint,
  overdueFingerprint,
  type NotificationKind,
} from "../utils/notificationDismissals";

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

interface DismissedState {
  lowStock?: string;
  overdue?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dismissed, setDismissed] = useState<DismissedState>(() =>
    user ? loadNotificationDismissals(user.id) : {},
  );
  const open = Boolean(anchorEl);

  const enabled = !!user && ["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationData>("/dashboard/notifications").then((r) => r.data),
    enabled,
    refetchInterval: 60_000,
  });

  const canManageDocs = user?.role === "MANAGER" || user?.role === "ADMIN";

  const fingerprints = useMemo(() => {
    if (!data) return null;
    return {
      lowStock: lowStockFingerprint(data.lowStockCount),
      overdue: overdueFingerprint(
        data.overdueReservationCount,
        data.overdueReservations.map((r) => r.id),
      ),
    };
  }, [data]);

  const showLowStock =
    !!data &&
    data.lowStockCount > 0 &&
    dismissed.lowStock !== fingerprints?.lowStock;

  const showOverdue =
    !!data &&
    canManageDocs &&
    data.overdueReservationCount > 0 &&
    dismissed.overdue !== fingerprints?.overdue;

  const visibleCount = (showLowStock ? 1 : 0) + (showOverdue ? 1 : 0);
  const allDismissedWhileActive = !!data && data.totalCount > 0 && visibleCount === 0;

  if (!enabled) return null;

  const dismissOne = (kind: NotificationKind) => {
    if (!user || !fingerprints) return;
    const fingerprint = kind === "lowStock" ? fingerprints.lowStock : fingerprints.overdue;
    setDismissed(dismissNotification(user.id, kind, fingerprint));
  };

  const dismissAll = () => {
    if (!user || !fingerprints || !data) return;
    const next: Partial<Record<NotificationKind, string>> = {};
    if (data.lowStockCount > 0) next.lowStock = fingerprints.lowStock;
    if (canManageDocs && data.overdueReservationCount > 0) {
      next.overdue = fingerprints.overdue;
    }
    setDismissed(dismissAllNotifications(user.id, next));
  };

  return (
    <>
      <Tooltip title={visibleCount > 0 ? `${visibleCount} сповіщень` : "Сповіщення"}>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Сповіщення"
          sx={{ color: "text.primary" }}
        >
          <Badge badgeContent={visibleCount} color="error" invisible={visibleCount === 0} max={99}>
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
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Сповіщення
            </Typography>
            {visibleCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {visibleCount === 1 ? "1 сповіщення" : `${visibleCount} сповіщення`}
              </Typography>
            )}
          </Box>
          {visibleCount > 0 && (
            <Button size="small" onClick={dismissAll} sx={{ minWidth: 0, py: 0.25 }}>
              Очистити все
            </Button>
          )}
        </Box>

        <Divider />

        {visibleCount === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {allDismissedWhileActive
                ? "Сповіщення очищено. З’являться знову, якщо ситуація зміниться."
                : "Немає нових сповіщень"}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ py: 0.5 }}>
            {showLowStock && data && (
              <>
                <ListItem
                  sx={{ py: 0.5, alignItems: "flex-start" }}
                  secondaryAction={
                    <Tooltip title="Прибрати сповіщення">
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label="Прибрати сповіщення про залишки"
                        onClick={() => dismissOne("lowStock")}
                        sx={{ mt: 0.25 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <WarningAmberIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Потрібно замовити: ${data.lowStockCount} позицій нижче мінімального залишку.`}
                    secondary={
                      data.lowStockPreview.length > 0
                        ? data.lowStockPreview
                            .map((p) => `${p.name} — ${p.quantity}/${p.minStock}`)
                            .join(", ")
                        : undefined
                    }
                    slotProps={{
                      primary: { variant: "body2", sx: { fontWeight: 600, lineHeight: 1.45, pr: 3 } },
                      secondary: { variant: "caption", sx: { mt: 0.5, pr: 3 } },
                    }}
                  />
                </ListItem>
                <Box sx={{ px: 2, pb: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {canManageDocs && (
                    <Button
                      component={RouterLink}
                      to="/documents/new?type=RECEIPT"
                      size="small"
                      variant="contained"
                      onClick={() => setAnchorEl(null)}
                    >
                      Створити надходження
                    </Button>
                  )}
                  <Button
                    component={RouterLink}
                    to="/stock?lowOnly=1"
                    size="small"
                    variant={canManageDocs ? "outlined" : "contained"}
                    onClick={() => setAnchorEl(null)}
                  >
                    Переглянути залишки
                  </Button>
                </Box>
              </>
            )}

            {showOverdue && data && (
              <>
                {showLowStock && <Divider sx={{ my: 0.5 }} />}
                <ListItem
                  sx={{ py: 0.5, alignItems: "flex-start" }}
                  secondaryAction={
                    <Tooltip title="Прибрати сповіщення">
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label="Прибрати сповіщення про резерви"
                        onClick={() => dismissOne("overdue")}
                        sx={{ mt: 0.25 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                    <ScheduleIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Прострочені резерви (${data.overdueReservationCount})`}
                    secondary={data.overdueReservations
                      .slice(0, 3)
                      .map((r) => `${r.number} — ${r.daysOverdue} дн.`)
                      .join(", ")}
                    slotProps={{
                      primary: { variant: "body2", sx: { fontWeight: 600, pr: 3 } },
                      secondary: { variant: "caption", sx: { pr: 3 } },
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
