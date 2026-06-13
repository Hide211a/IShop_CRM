import { alpha, Box } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function FilterBar({ children }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        mb: 2,
        flexWrap: "wrap",
        alignItems: "center",
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: "background.paper",
        border: `1px solid ${alpha("#0F172A", 0.08)}`,
        "& .MuiTextField-root": { flex: { xs: "1 1 100%", sm: "0 1 auto" }, minWidth: { xs: "100%", sm: 200 } },
        "& .MuiFormControl-root": { flex: { xs: "1 1 100%", sm: "0 1 auto" }, minWidth: { xs: "100%", sm: 160 } },
      }}
    >
      {children}
    </Box>
  );
}
