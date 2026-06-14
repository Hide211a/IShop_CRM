import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import TodayIcon from "@mui/icons-material/Today";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { api } from "../api/client";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { CustomerLookupCard } from "../components/CustomerLookupCard";
import { StatCard } from "../components/StatCard";
import type { DocumentListItem, Product } from "../types";
import { documentTypeLabels } from "../utils/labels";

interface ActiveReservation {
  id: string;
  number: string;
  buyerName: string | null;
  buyerPhone: string | null;
  postedAt: string | null;
}

interface ManagerDashboard {
  draftCount: number;
  lowStockCount: number;
  lowStock: Array<Product & { quantity: number }>;
  drafts: DocumentListItem[];
  todayPosted: DocumentListItem[];
  activeReservations: number;
  activeReservationList: ActiveReservation[];
}

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-manager"],
    queryFn: () => api.get<ManagerDashboard>("/dashboard/manager").then((r) => r.data),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <Alert severity="error">Не вдалося завантажити dashboard</Alert>;

  return (
    <Box>
      <PageHeader
        title="Робочий стіл менеджера"
        subtitle="Операції складу на сьогодні"
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button component={Link} to="/documents/new?type=RECEIPT" variant="contained" size="small">
              + Надходження
            </Button>
            <Button component={Link} to="/documents/new?type=EXPENSE" variant="outlined" size="small">
              + Продаж
            </Button>
            <Button component={Link} to="/documents/new?type=RESERVATION" variant="outlined" size="small">
              + Резерв
            </Button>
          </Box>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Чернетки"
            value={data.draftCount}
            icon={<EditNoteIcon />}
            accent="info"
            onClick={() => navigate("/documents?status=DRAFT")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Операцій сьогодні"
            value={data.todayPosted.length}
            icon={<TodayIcon />}
            accent="success"
            onClick={() => navigate("/documents")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Низький залишок"
            value={data.lowStockCount}
            icon={<WarningAmberIcon />}
            highlight={data.lowStockCount > 0}
            onClick={() => navigate("/stock?lowOnly=1")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Активні резерви"
            value={data.activeReservations}
            icon={<BookmarkIcon />}
            accent="primary"
            onClick={() => navigate("/documents?type=RESERVATION&status=POSTED")}
          />
        </Grid>
      </Grid>

      {data.draftCount > 0 ? (
        <ContentCard
          title="Чернетки — допроведіть"
          action={
            <Button component={Link} to="/documents" size="small" variant="outlined">
              Усі документи
            </Button>
          }
        >
          <DataTable minWidth={480}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell align="right">Дія</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.drafts.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{d.number}</TableCell>
                  <TableCell>{documentTypeLabels[d.type]}</TableCell>
                  <TableCell align="right">
                    <Button component={Link} to={`/documents/${d.id}`} size="small">
                      Відкрити
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </ContentCard>
      ) : (
        <ContentCard title="Чернетки">
          <EmptyState
            title="Немає чернеток"
            description="Створіть надходження, продаж або резерв"
            action={
              <Button component={Link} to="/documents/new?type=RECEIPT" size="small" variant="contained">
                + Надходження
              </Button>
            }
          />
        </ContentCard>
      )}

      {data.activeReservationList.length > 0 ? (
        <ContentCard
          title="Активні резерви"
          action={
            <Button component={Link} to="/documents?type=RESERVATION&status=POSTED" size="small" variant="outlined">
              Усі резерви
            </Button>
          }
        >
          <DataTable minWidth={560}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Покупець</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Телефон</TableCell>
                <TableCell align="right">Дія</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.activeReservationList.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.number}</TableCell>
                  <TableCell>{r.buyerName ?? "—"}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{r.buyerPhone ?? "—"}</TableCell>
                  <TableCell align="right">
                    <Button component={Link} to={`/documents/${r.id}`} size="small">
                      Відкрити
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </ContentCard>
      ) : (
        <ContentCard title="Активні резерви">
          <EmptyState title="Немає активних резервів" description="Резерви з'являться після проведення документа" />
        </ContentCard>
      )}

      {data.lowStockCount > 0 && (
        <ContentCard title="Потрібно поповнити">
          {data.lowStock.map((p) => (
            <Box
              key={p.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1,
                gap: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
              <Chip label={`${p.quantity} / мін ${p.minStock}`} color="warning" size="small" />
            </Box>
          ))}
          <Button component={Link} to="/documents/new?type=RECEIPT" sx={{ mt: 2 }} size="small" variant="contained">
            Створити надходження
          </Button>
        </ContentCard>
      )}

      <ContentCard title="Операції за сьогодні">
        {data.todayPosted.length === 0 ? (
          <EmptyState title="Сьогодні ще немає проведених документів" />
        ) : (
          <DataTable minWidth={480}>
            <TableHead>
              <TableRow>
                <TableCell>Номер</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Час</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.todayPosted.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>
                    <Link to={`/documents/${d.id}`}>{d.number}</Link>
                  </TableCell>
                  <TableCell>{documentTypeLabels[d.type]}</TableCell>
                  <TableCell>
                    {d.postedAt
                      ? new Date(d.postedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}
      </ContentCard>

      <CustomerLookupCard />
    </Box>
  );
}
