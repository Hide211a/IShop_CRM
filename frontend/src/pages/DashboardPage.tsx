import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Grid,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { api } from "../api/client";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import type { DashboardSummary } from "../types";
import { documentTypeLabels } from "../utils/labels";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <Alert severity="error">Не вдалося завантажити dashboard</Alert>;

  return (
    <Box>
      <PageHeader title="Огляд складу" subtitle="Зведена аналітика для директора" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard title="Активних товарів" value={data.productCount} icon={<CategoryIcon />} onClick={() => navigate("/stock")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard title="Одиниць на складі" value={data.totalUnits} icon={<InventoryIcon />} accent="info" onClick={() => navigate("/stock")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Низький залишок"
            value={data.lowStockCount}
            subtitle="позицій на або нижче мінімуму"
            icon={<WarningAmberIcon />}
            highlight={data.lowStockCount > 0}
            onClick={() => navigate("/stock?lowOnly=1")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Продажів цього місяця"
            value={data.salesThisMonth}
            subtitle={`проведених документів: ${data.postedDocumentsThisMonth}`}
            icon={<ShoppingCartIcon />}
            accent="success"
            onClick={() => navigate("/reports")}
          />
        </Grid>
      </Grid>

      <ContentCard title="Останні проведені документи">
        {data.recentDocuments.length === 0 ? (
          <EmptyState title="Немає документів" />
        ) : (
          <DataTable minWidth={560}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Автор</TableCell>
                <TableCell align="right">Рядків</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentDocuments.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{doc.number}</TableCell>
                  <TableCell>{documentTypeLabels[doc.type]}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {doc.createdBy?.fullName ?? "—"}
                  </TableCell>
                  <TableCell align="right">{doc._count?.lines ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}
      </ContentCard>
    </Box>
  );
}
