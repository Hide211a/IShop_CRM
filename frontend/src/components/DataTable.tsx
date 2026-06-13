import { alpha, Box, Table, TableContainer } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  minWidth?: number;
}

export function DataTable({ children, minWidth = 640 }: Props) {
  return (
    <Box
      sx={{
        border: `1px solid ${alpha("#0F172A", 0.08)}`,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <TableContainer sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table size="small" sx={{ minWidth }}>
          {children}
        </Table>
      </TableContainer>
    </Box>
  );
}
