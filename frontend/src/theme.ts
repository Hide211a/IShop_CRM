import { alpha, createTheme } from "@mui/material/styles";

const primary = "#4F46E5";
const primaryDark = "#3730A3";
const secondary = "#0EA5E9";

declare module "@mui/material/styles" {
  interface Palette {
    sidebar: Palette["primary"];
    surface: { main: string; elevated: string };
  }
  interface PaletteOptions {
    sidebar?: PaletteOptions["primary"];
    surface?: { main: string; elevated: string };
  }
}

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: primary,
      dark: primaryDark,
      light: "#818CF8",
      contrastText: "#fff",
    },
    secondary: {
      main: secondary,
      dark: "#0284C7",
      light: "#38BDF8",
    },
    background: {
      default: "#F1F5F9",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A",
      secondary: "#64748B",
    },
    divider: alpha("#0F172A", 0.08),
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    info: { main: "#3B82F6" },
    sidebar: {
      main: "#0F172A",
      dark: "#020617",
      light: "#1E293B",
      contrastText: "#F8FAFC",
    },
    surface: {
      main: "#FFFFFF",
      elevated: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: "0.8125rem", letterSpacing: "0.02em", textTransform: "uppercase" as const, color: "#64748B" },
    button: { textTransform: "none" as const, fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F1F5F9",
          WebkitFontSmoothing: "antialiased",
        },
        "#root": { minHeight: "100vh" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "8px 16px",
        },
        contained: {
          "&.MuiButton-containedPrimary": {
            background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${primaryDark} 0%, #312E81 100%)`,
            },
          },
        },
        outlined: {
          borderColor: alpha("#0F172A", 0.12),
          "&:hover": {
            borderColor: alpha(primary, 0.4),
            backgroundColor: alpha(primary, 0.04),
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${alpha("#0F172A", 0.08)}`,
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: {
          backgroundColor: alpha("#FFFFFF", 0.85),
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${alpha("#0F172A", 0.08)}`,
          color: "#0F172A",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: "2px 12px",
          padding: "10px 12px",
          "&.Mui-selected": {
            backgroundColor: alpha(primary, 0.15),
            color: "#C7D2FE",
            "& .MuiListItemIcon-root": { color: "#A5B4FC" },
            "&:hover": { backgroundColor: alpha(primary, 0.22) },
          },
          "&:hover": { backgroundColor: alpha("#FFFFFF", 0.06) },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 40, color: alpha("#F8FAFC", 0.7) },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: "0.9375rem", fontWeight: 500 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "#64748B",
          backgroundColor: "#F8FAFC",
          borderBottom: `1px solid ${alpha("#0F172A", 0.08)}`,
        },
        body: {
          fontSize: "0.875rem",
          borderBottom: `1px solid ${alpha("#0F172A", 0.06)}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&.MuiTableRow-hover:hover": { backgroundColor: alpha(primary, 0.03) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.75rem" },
        filled: { border: "1px solid transparent" },
        outlined: { borderColor: alpha("#0F172A", 0.12) },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backgroundColor: "#FFFFFF",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderBottom: `1px solid ${alpha("#0F172A", 0.08)}`,
        },
        indicator: { height: 3, borderRadius: "3px 3px 0 0" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          minHeight: 44,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
        standard: {
          "&.MuiAlert-standardSuccess": { backgroundColor: alpha("#10B981", 0.1), color: "#065F46" },
          "&.MuiAlert-standardWarning": { backgroundColor: alpha("#F59E0B", 0.1), color: "#92400E" },
          "&.MuiAlert-standardError": { backgroundColor: alpha("#EF4444", 0.1), color: "#991B1B" },
          "&.MuiAlert-standardInfo": { backgroundColor: alpha("#3B82F6", 0.1), color: "#1E40AF" },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${alpha("#0F172A", 0.08)}`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});
