import { Box, Grid, Typography, alpha } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { ContentCard } from "./ContentCard";
import { StatCard } from "./StatCard";

interface PeriodData {
  salesCount: number;
  revenue: number;
  margin: number;
  marginPercent: number;
}

interface Props {
  current: PeriodData;
  previous: PeriodData;
  change: { salesCount: number; revenue: number; margin: number };
}

function ChangeHint({ value }: { value: number }) {
  const Icon = value > 0 ? TrendingUpIcon : value < 0 ? TrendingDownIcon : TrendingFlatIcon;
  const color = value > 0 ? "success.main" : value < 0 ? "error.main" : "text.secondary";
  const sign = value > 0 ? "+" : "";
  return (
    <Typography
      variant="caption"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        color,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      <Icon sx={{ fontSize: 16, flexShrink: 0 }} />
      <Box component="span">{sign}{value}% vs минулий місяць</Box>
    </Typography>
  );
}

export function PeriodComparisonCard({ current, previous, change }: Props) {
  return (
    <ContentCard
      title="Порівняння з минулим місяцем"
      sx={{ mb: 3, bgcolor: alpha("#4F46E5", 0.03) }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
          <StatCard
            title="Продажів (цей місяць)"
            value={current.salesCount}
            subtitle={`минулий: ${previous.salesCount}`}
            accent="success"
            footer={<ChangeHint value={change.salesCount} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
          <StatCard
            title="Виручка"
            value={`${current.revenue.toLocaleString("uk-UA")} ₴`}
            subtitle={`минулий: ${previous.revenue.toLocaleString("uk-UA")} ₴`}
            accent="primary"
            footer={<ChangeHint value={change.revenue} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
          <StatCard
            title="Маржа"
            value={`${current.margin.toLocaleString("uk-UA")} ₴`}
            subtitle={`${current.marginPercent}% · минулий: ${previous.margin.toLocaleString("uk-UA")} ₴`}
            accent="info"
            footer={<ChangeHint value={change.margin} />}
          />
        </Grid>
      </Grid>
    </ContentCard>
  );
}
