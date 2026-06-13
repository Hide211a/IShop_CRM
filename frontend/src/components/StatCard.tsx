import { alpha, Box, Card, CardContent, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Accent = "primary" | "success" | "warning" | "info" | "neutral";

const accentMap: Record<Accent, { bg: string; icon: string }> = {
  primary: { bg: alpha("#4F46E5", 0.1), icon: "#4F46E5" },
  success: { bg: alpha("#10B981", 0.1), icon: "#10B981" },
  warning: { bg: alpha("#F59E0B", 0.12), icon: "#D97706" },
  info: { bg: alpha("#0EA5E9", 0.1), icon: "#0284C7" },
  neutral: { bg: alpha("#64748B", 0.08), icon: "#64748B" },
};

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  accent?: Accent;
  onClick?: () => void;
  highlight?: boolean;
}

export function StatCard({ title, value, subtitle, icon, accent = "primary", onClick, highlight }: Props) {
  const colors = accentMap[highlight ? "warning" : accent];

  return (
    <Card
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      sx={{
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...(highlight && { borderColor: alpha("#F59E0B", 0.35), bgcolor: alpha("#F59E0B", 0.04) }),
        ...(onClick && {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
          },
        }),
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.5rem", sm: "2rem" },
                lineHeight: 1.1,
                color: highlight ? "warning.dark" : "text.primary",
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: colors.bg,
                color: colors.icon,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
