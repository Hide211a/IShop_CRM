import { TableCell, TableRow, Typography } from "@mui/material";

interface Props {
  colSpan: number;
  message: string;
}

export function TableEmptyRow({ colSpan, message }: Props) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 5, color: "text.secondary" }}>
        <Typography variant="body2">{message}</Typography>
      </TableCell>
    </TableRow>
  );
}
