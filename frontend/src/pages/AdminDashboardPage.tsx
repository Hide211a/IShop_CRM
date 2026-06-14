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
import CategoryIcon from "@mui/icons-material/Category";
import PeopleIcon from "@mui/icons-material/People";
import FolderIcon from "@mui/icons-material/Folder";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { api } from "../api/client";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";

function ChangelogSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["product-changelog"],
    queryFn: () =>
      api
        .get<
          Array<{
            id: string;
            action: string;
            summary: string;
            createdAt: string;
            product: { sku: string; name: string };
            user: { fullName: string };
          }>
        >("/products/changelog?limit=15")
        .then((r) => r.data),
  });

  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="Ще немає записів у журналі" />;

  return (
    <DataTable minWidth={560}>
      <TableHead>
        <TableRow>
          <TableCell>Дата</TableCell>
          <TableCell>Товар</TableCell>
          <TableCell>Дія</TableCell>
          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Хто</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id} hover>
            <TableCell>
              {new Date(entry.createdAt).toLocaleString("uk-UA", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.product.sku}</Typography>
              <Typography variant="caption" color="text.secondary">{entry.summary}</Typography>
            </TableCell>
            <TableCell><Chip size="small" label={entry.action} /></TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{entry.user.fullName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
}

interface AdminDashboard {
  activeProducts: number;
  inactiveProducts: number;
  userCount: number;
  categoryCount: number;
  brandCount: number;
  supplierCount: number;
  lowStockCount: number;
  lowStock: Array<{ id: string; name: string; sku: string; quantity: number; minStock: number }>;
  recentProducts: Array<{
    id: string;
    sku: string;
    name: string;
    active: boolean;
    updatedAt: string;
    category: { name: string };
  }>;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-admin"],
    queryFn: () => api.get<AdminDashboard>("/dashboard/admin").then((r) => r.data),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <Alert severity="error">Не вдалося завантажити панель</Alert>;

  const dirTotal = data.categoryCount + data.brandCount + data.supplierCount;

  return (
    <Box>
      <PageHeader
        title="Панель адміністратора"
        subtitle="Довідники, товари, користувачі"
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button component={Link} to="/products" variant="contained" size="small">
              Товари
            </Button>
            <Button component={Link} to="/directories" variant="outlined" size="small">
              Довідники
            </Button>
            <Button component={Link} to="/users" variant="outlined" size="small">
              Користувачі
            </Button>
          </Box>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Активних товарів"
            value={data.activeProducts}
            icon={<CategoryIcon />}
            accent="primary"
            onClick={() => navigate("/products")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Користувачів"
            value={data.userCount}
            icon={<PeopleIcon />}
            accent="info"
            onClick={() => navigate("/users")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard
            title="Довідники"
            value={dirTotal}
            subtitle={`${data.categoryCount} кат. · ${data.brandCount} бренд. · ${data.supplierCount} пост.`}
            icon={<FolderIcon />}
            accent="neutral"
            onClick={() => navigate("/directories")}
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
      </Grid>

      {data.inactiveProducts > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Неактивних товарів: {data.inactiveProducts}.{" "}
          <Link to="/products?showInactive=1">Переглянути в каталозі</Link>
        </Alert>
      )}

      {data.lowStockCount > 0 && (
        <ContentCard title="Потрібно поповнити (мін. залишок)">
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
              <Box component="span" sx={{ fontWeight: 500, fontSize: "0.875rem" }}>{p.name}</Box>
              <Chip label={`${p.quantity} / мін ${p.minStock}`} color="warning" size="small" />
            </Box>
          ))}
          <Button component={Link} to="/stock?lowOnly=1" sx={{ mt: 2 }} size="small" variant="outlined">
            Залишки на складі
          </Button>
        </ContentCard>
      )}

      <ContentCard title="Останні зміни в каталозі">
        {data.recentProducts.length === 0 ? (
          <EmptyState title="Ще немає змін у каталозі" />
        ) : (
        <DataTable minWidth={640}>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Категорія</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Оновлено</TableCell>
              <TableCell align="right">Дія</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.recentProducts.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{p.category.name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.active ? "Активний" : "Неактивний"}
                    color={p.active ? "success" : "default"}
                  />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {new Date(p.updatedAt).toLocaleString("uk-UA", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell align="right">
                  <Button component={Link} to="/products" size="small">
                    Каталог
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
        )}
      </ContentCard>

      <ContentCard title="Журнал змін каталогу">
        <ChangelogSection />
      </ContentCard>
    </Box>
  );
}
