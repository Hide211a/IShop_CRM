import { alpha, Box, Card, CardContent, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  sx?: object;
}

export function ContentCard({ title, subtitle, action, children, noPadding, sx }: Props) {
  return (
    <Card sx={{ mb: 2, overflow: "hidden", ...sx }}>
      {(title || action) && (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            pt: { xs: 2, sm: 2.5 },
            pb: title ? 1 : 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            borderBottom: title ? `1px solid ${alpha("#0F172A", 0.06)}` : "none",
          }}
        >
          <Box>
            {title && (
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      <CardContent sx={{ p: noPadding ? 0 : { xs: 2, sm: 2.5 }, "&:last-child": { pb: noPadding ? 0 : { xs: 2, sm: 2.5 } } }}>
        {children}
      </CardContent>
    </Card>
  );
}
