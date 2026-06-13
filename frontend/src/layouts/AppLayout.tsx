import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  alpha,
  AppBar,
  Avatar,
  Badge,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import DescriptionIcon from "@mui/icons-material/Description";
import CategoryIcon from "@mui/icons-material/Category";
import FolderIcon from "@mui/icons-material/Folder";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import { useAuth } from "../context/AuthContext";
import { NotificationBanner } from "../components/NotificationBanner";
import type { Role } from "../types";
import { roleLabels } from "../utils/labels";

const drawerWidth = 272;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Робочий стіл", path: "/dashboard", icon: <DashboardIcon fontSize="small" />, roles: ["MANAGER"] },
  { label: "Панель адміна", path: "/dashboard", icon: <DashboardIcon fontSize="small" />, roles: ["ADMIN"] },
  { label: "Огляд", path: "/dashboard", icon: <DashboardIcon fontSize="small" />, roles: ["DIRECTOR"] },
  { label: "Залишки", path: "/stock", icon: <InventoryIcon fontSize="small" />, roles: ["DIRECTOR", "ADMIN", "MANAGER"] },
  { label: "Документи", path: "/documents", icon: <DescriptionIcon fontSize="small" />, roles: ["MANAGER", "ADMIN"] },
  { label: "Товари", path: "/products", icon: <CategoryIcon fontSize="small" />, roles: ["ADMIN"] },
  { label: "Довідники", path: "/directories", icon: <FolderIcon fontSize="small" />, roles: ["ADMIN"] },
  { label: "Користувачі", path: "/users", icon: <PeopleIcon fontSize="small" />, roles: ["ADMIN"] },
  { label: "Звіти", path: "/reports", icon: <AssessmentIcon fontSize="small" />, roles: ["DIRECTOR", "ADMIN"] },
];

function userInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  const { data: lowCount } = useQuery({
    queryKey: ["low-stock-count"],
    queryFn: () => api.get<{ count: number }>("/stock/low-count").then((r) => r.data.count),
    enabled: !!user && ["MANAGER", "ADMIN", "DIRECTOR"].includes(user.role),
    refetchInterval: 60_000,
  });

  const items = navItems.filter((item) => user && item.roles.includes(user.role));

  const currentPage =
    items.find((i) => location.pathname === i.path || location.pathname.startsWith(`${i.path}/`))?.label ??
    "iShop Рівне";

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "sidebar.main", color: "sidebar.contrastText" }}>
      <Toolbar sx={{ display: { sm: "none" } }} />
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SmartphoneIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#F8FAFC", lineHeight: 1.2 }}>
              iShop Рівне
            </Typography>
            <Typography variant="caption" sx={{ color: alpha("#F8FAFC", 0.55) }}>
              мобільна техніка · Рівне
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: alpha("#FFFFFF", 0.08) }} />

      <List sx={{ flex: 1, py: 1.5 }}>
        {items.map((item) => {
          const selected =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <ListItemButton
              key={`${item.path}-${item.label}`}
              component={Link}
              to={item.path}
              selected={selected}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>
                {item.path === "/stock" && lowCount ? (
                  <Badge badgeContent={lowCount} color="warning">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>

      {user && (
        <Box sx={{ p: 2, borderTop: `1px solid ${alpha("#FFFFFF", 0.08)}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: alpha("#6366F1", 0.3),
                color: "#C7D2FE",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {userInitials(user.fullName)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#F8FAFC" }} noWrap>
                {user.fullName}
              </Typography>
              <Chip
                label={roleLabels[user.role]}
                size="small"
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: alpha("#6366F1", 0.2),
                  color: "#C7D2FE",
                  border: "none",
                }}
              />
            </Box>
          </Box>
          <Button
            fullWidth
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={() => {
              logout();
              navigate("/login");
            }}
            sx={{
              color: alpha("#F8FAFC", 0.75),
              justifyContent: "flex-start",
              "&:hover": { bgcolor: alpha("#FFFFFF", 0.06), color: "#F8FAFC" },
            }}
          >
            Вийти
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1 }}>
          <IconButton
            edge="start"
            sx={{ mr: 1, display: { sm: "none" }, color: "text.primary" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.125rem" } }} noWrap>
              {currentPage}
            </Typography>
          </Box>
          {!isMobile && user && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }} noWrap>
              {user.fullName}
            </Typography>
          )}
          {isMobile && user && (
            <Chip label={roleLabels[user.role]} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 3, sm: 4 }, pt: { xs: 1, sm: 0 } }}>
          <NotificationBanner />
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
