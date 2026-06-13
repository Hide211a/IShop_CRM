import { Box, Typography, alpha } from "@mui/material";

interface Point {
  label: string;
  value: number;
}

interface Props {
  points: Point[];
  valueSuffix?: string;
  color?: string;
}

export function SimpleBarChart({ points, valueSuffix = "", color = "#4F46E5" }: Props) {
  if (!points.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
        Немає даних для графіка
      </Typography>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 200, pt: 2, overflowX: "auto" }}>
      {points.map((p) => {
        const heightPct = Math.max((p.value / max) * 100, 4);
        return (
          <Box
            key={p.label}
            sx={{
              flex: "1 0 48px",
              minWidth: 48,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.65rem" }}>
              {p.value.toLocaleString("uk-UA")}
              {valueSuffix}
            </Typography>
            <Box
              sx={{
                width: "100%",
                height: `${heightPct}%`,
                minHeight: 8,
                borderRadius: "6px 6px 2px 2px",
                background: `linear-gradient(180deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.6rem", textAlign: "center", lineHeight: 1.2 }}
            >
              {p.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
