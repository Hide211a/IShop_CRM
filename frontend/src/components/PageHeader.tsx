import { alpha, Box, Button, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        mb: 3,
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, maxWidth: 560 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          {action}
        </Box>
      )}
    </Box>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="contained" onClick={onClick} sx={{ width: { xs: "100%", sm: "auto" } }}>
      {label}
    </Button>
  );
}

export function ActionButton({
  label,
  onClick,
  variant = "outlined",
}: {
  label: string;
  onClick?: () => void;
  variant?: "contained" | "outlined" | "text";
}) {
  return (
    <Button
      variant={variant}
      size="small"
      onClick={onClick}
      sx={{
        borderColor: variant === "outlined" ? alpha("#0F172A", 0.12) : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Button>
  );
}
