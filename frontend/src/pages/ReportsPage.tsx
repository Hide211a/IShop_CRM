import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { api } from "../api/client";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { FilterBar } from "../components/FilterBar";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PeriodComparisonCard } from "../components/PeriodComparisonCard";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { StatCard } from "../components/StatCard";
import { downloadCsv } from "../utils/csv";
import { documentTypeLabels } from "../utils/labels";

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const abcColor: Record<string, "success" | "warning" | "default"> = {
  A: "success",
  B: "warning",
  C: "default",
};

type StockReportRow = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  purchasePrice: string;
  salePrice: string;
};

type MovementReportRow = {
  createdAt: string;
  product: { sku: string; name: string };
  document: { number: string; type: string; date?: string; postedAt?: string | null };
  quantityChange: number;
  balanceAfter: number;
};

type SalesReportDoc = {
  number: string;
  buyerName?: string;
  postedAt: string;
  total?: number;
};

type ProductMarginRow = {
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
};

type AbcReportRow = {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  stockValue: number;
  share: number;
  abc: string;
};

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [chartGroup, setChartGroup] = useState<"day" | "week">("day");

  const stock = useQuery({
    queryKey: ["report-stock"],
    queryFn: () => api.get("/reports/stock").then((r) => r.data),
  });

  const lowStock = useQuery({
    queryKey: ["report-low"],
    queryFn: () => api.get("/reports/low-stock").then((r) => r.data),
  });

  const movements = useQuery({
    queryKey: ["report-movements", from, to],
    queryFn: () => api.get(`/reports/movements?from=${from}&to=${to}`).then((r) => r.data),
    enabled: tab === 1,
  });

  const sales = useQuery({
    queryKey: ["report-sales", from, to],
    queryFn: () => api.get(`/reports/sales-summary?from=${from}&to=${to}`).then((r) => r.data),
    enabled: tab === 2,
  });

  const salesChart = useQuery({
    queryKey: ["report-sales-chart", from, to, chartGroup],
    queryFn: () =>
      api.get(`/reports/sales-chart?from=${from}&to=${to}&groupBy=${chartGroup}`).then((r) => r.data),
    enabled: tab === 2,
  });

  const topProducts = useQuery({
    queryKey: ["report-top", from, to],
    queryFn: () => api.get(`/reports/top-products?from=${from}&to=${to}`).then((r) => r.data),
    enabled: tab === 3,
  });

  const margin = useQuery({
    queryKey: ["report-margin", from, to],
    queryFn: () => api.get(`/reports/margin?from=${from}&to=${to}`).then((r) => r.data),
    enabled: tab === 4,
  });

  const abc = useQuery({
    queryKey: ["report-abc"],
    queryFn: () => api.get("/reports/abc-analysis").then((r) => r.data),
    enabled: tab === 5,
  });

  const periodComparison = useQuery({
    queryKey: ["report-period-comparison"],
    queryFn: () => api.get("/reports/period-comparison").then((r) => r.data),
  });

  const exportStock = (items?: StockReportRow[]) => {
    const data = items ?? (stock.data as StockReportRow[] | undefined);
    if (!data || !Array.isArray(data)) return;
    downloadCsv(
      "zalyshky.csv",
      ["SKU", "Назва", "Категорія", "Залишок", "Мінімум", "Закупівля", "Продаж"],
      data.map((r) => [
        r.sku,
        r.name,
        r.category,
        String(r.quantity),
        String(r.minStock),
        String(r.purchasePrice),
        String(r.salePrice),
      ]),
    );
  };

  const movementBusinessDate = (m: {
    document: { date?: string; postedAt?: string | null };
    createdAt: string;
  }) => new Date(m.document.postedAt ?? m.document.date ?? m.createdAt).toLocaleDateString("uk-UA");

  const exportMovements = (payload?: { items: MovementReportRow[] }) => {
    const items: MovementReportRow[] =
      payload?.items ?? (movements.data?.items as MovementReportRow[] | undefined) ?? [];
    if (!items.length) return;
    downloadCsv(
      "rukh-tovaru.csv",
      ["Дата док.", "SKU", "Товар", "Документ", "Тип", "Зміна", "Залишок після"],
      items.map((m) => [
        movementBusinessDate(m),
        m.product.sku,
        m.product.name,
        m.document.number,
        documentTypeLabels[m.document.type as keyof typeof documentTypeLabels] ?? m.document.type,
        String(m.quantityChange),
        String(m.balanceAfter),
      ]),
    );
  };

  const exportSales = (payload?: { documents: SalesReportDoc[] }) => {
    const docs: SalesReportDoc[] =
      payload?.documents ?? (sales.data?.documents as SalesReportDoc[] | undefined) ?? [];
    if (!docs.length) return;
    downloadCsv(
      "prodazhi.csv",
      ["Номер", "Покупець", "Дата", "Сума"],
      docs.map((d) => [
        d.number,
        d.buyerName ?? "",
        d.postedAt ? new Date(d.postedAt).toLocaleDateString("uk-UA") : "",
        String(d.total ?? 0),
      ]),
    );
  };

  const exportTop = (payload?: { items: ProductMarginRow[] }) => {
    const items: ProductMarginRow[] =
      payload?.items ?? (topProducts.data?.items as ProductMarginRow[] | undefined) ?? [];
    if (!items.length) return;
    downloadCsv(
      "top-tovary.csv",
      ["SKU", "Назва", "К-сть", "Виручка", "Собівартість", "Маржа"],
      items.map((p) => [
        p.sku,
        p.name,
        String(p.quantity),
        String(p.revenue),
        String(p.cost),
        String(p.margin),
      ]),
    );
  };

  const exportMargin = (payload?: { products: ProductMarginRow[] }) => {
    const items: ProductMarginRow[] =
      payload?.products ?? (margin.data?.products as ProductMarginRow[] | undefined) ?? [];
    if (!items.length) return;
    downloadCsv(
      "marzha.csv",
      ["SKU", "Назва", "К-сть", "Виручка", "Собівартість", "Маржа"],
      items.map((p) => [
        p.sku,
        p.name,
        String(p.quantity),
        String(p.revenue),
        String(p.cost),
        String(p.margin),
      ]),
    );
  };

  const exportAbc = (items?: AbcReportRow[]) => {
    const data: AbcReportRow[] = items ?? (abc.data as AbcReportRow[] | undefined) ?? [];
    if (!data.length) return;
    downloadCsv(
      "abc-analiz.csv",
      ["SKU", "Назва", "Категорія", "Залишок", "Вартість", "Частка %", "ABC"],
      data.map((p) => [
        p.sku,
        p.name,
        p.category,
        String(p.quantity),
        String(p.stockValue),
        String(p.share),
        p.abc,
      ]),
    );
  };

  const exportAll = async () => {
    const [stockData, movementsData, salesData, topData, marginData, abcData] = await Promise.all([
      api.get("/reports/stock").then((r) => r.data),
      api.get(`/reports/movements?from=${from}&to=${to}`).then((r) => r.data),
      api.get(`/reports/sales-summary?from=${from}&to=${to}`).then((r) => r.data),
      api.get(`/reports/top-products?from=${from}&to=${to}&limit=50`).then((r) => r.data),
      api.get(`/reports/margin?from=${from}&to=${to}`).then((r) => r.data),
      api.get("/reports/abc-analysis").then((r) => r.data),
    ]);

    exportStock(stockData);
    await new Promise((r) => setTimeout(r, 300));
    exportMovements(movementsData);
    await new Promise((r) => setTimeout(r, 300));
    exportSales(salesData);
    await new Promise((r) => setTimeout(r, 300));
    exportTop(topData);
    await new Promise((r) => setTimeout(r, 300));
    exportMargin(marginData);
    await new Promise((r) => setTimeout(r, 300));
    exportAbc(abcData);
  };

  const chartPoints =
    salesChart.data?.points?.map((p: { date: string; amount: number }) => ({
      label: new Date(p.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
      value: p.amount,
    })) ?? [];

  return (
    <Box>
      <PageHeader
        title="Звіти"
        subtitle="Аналітика для директора"
        action={
          <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={exportAll}>
            Експорт усіх CSV
          </Button>
        }
      />

      {periodComparison.data && (
        <PeriodComparisonCard
          current={periodComparison.data.current}
          previous={periodComparison.data.previous}
          change={periodComparison.data.change}
        />
      )}

      <FilterBar>
        <TextField type="date" label="З" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="По" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, bgcolor: "background.paper", borderRadius: 2, px: 1, border: "1px solid", borderColor: "divider" }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Залишки" />
        <Tab label="Рух товарів" />
        <Tab label="Продажі" />
        <Tab label="Топ-10" />
        <Tab label="Маржа" />
        <Tab label="ABC" />
        <Tab label="Критичний залишок" />
      </Tabs>

      {tab === 0 && (
        <ContentCard title="Залишки на складі" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportStock()}>CSV</Button>} noPadding>
          {stock.isLoading ? <LoadingState /> : (
            <DataTable minWidth={640}>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Назва</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Категорія</TableCell>
                  <TableCell align="right">Залишок</TableCell>
                  <TableCell align="right">Мін.</TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>Продаж</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stock.data as Array<{ sku: string; name: string; category: string; quantity: number; minStock: number; salePrice: string }>)?.length ? (
                  (stock.data as Array<{ sku: string; name: string; category: string; quantity: number; minStock: number; salePrice: string }>).map((r) => (
                    <TableRow key={r.sku} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.sku}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{r.category}</TableCell>
                      <TableCell align="right">{r.quantity}</TableCell>
                      <TableCell align="right">{r.minStock}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>{Number(r.salePrice).toLocaleString("uk-UA")} ₴</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} sx={{ p: 0, border: 0 }}><EmptyState title="Немає даних" /></TableCell></TableRow>
                )}
              </TableBody>
            </DataTable>
          )}
        </ContentCard>
      )}

      {tab === 1 && (
        <ContentCard title="Рух за період" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportMovements()}>CSV</Button>} noPadding>
          {movements.isLoading ? <LoadingState /> : (
            <DataTable minWidth={520}>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Документ</TableCell>
                  <TableCell align="right">Зміна</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.data?.items?.length ? (
                  movements.data.items.map((m: { id: string; createdAt: string; product: { name: string }; document: { number: string; date?: string; postedAt?: string | null }; quantityChange: number }) => (
                    <TableRow key={m.id} hover>
                      <TableCell>{movementBusinessDate(m)}</TableCell>
                      <TableCell>{m.product.name}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{m.document.number}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: m.quantityChange > 0 ? "success.main" : "error.main" }}>
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} sx={{ p: 0, border: 0 }}><EmptyState title="Немає руху за період" /></TableCell></TableRow>
                )}
              </TableBody>
            </DataTable>
          )}
        </ContentCard>
      )}

      {tab === 2 && (
        <ContentCard title="Продажі за період" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportSales()}>CSV</Button>}>
          {sales.isLoading ? <LoadingState /> : sales.data ? (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 4 }}>
                  <StatCard title="Продажів" value={sales.data.salesCount} accent="success" />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <StatCard title="Сума" value={`${Number(sales.data.totalAmount).toLocaleString("uk-UA")} ₴`} accent="primary" />
                </Grid>
              </Grid>

              <Box sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ mb: 2, minWidth: 160 }}>
                  <InputLabel>Групування</InputLabel>
                  <Select value={chartGroup} label="Групування" onChange={(e) => setChartGroup(e.target.value as "day" | "week")}>
                    <MenuItem value="day">По днях</MenuItem>
                    <MenuItem value="week">По тижнях</MenuItem>
                  </Select>
                </FormControl>
                <SimpleBarChart points={chartPoints} valueSuffix=" ₴" />
              </Box>

              <DataTable minWidth={480}>
                <TableHead>
                  <TableRow>
                    <TableCell>Номер</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Покупець</TableCell>
                    <TableCell>Дата</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.data.documents?.length ? (
                    sales.data.documents.map((d: { number: string; buyerName?: string; postedAt: string }) => (
                      <TableRow key={d.number} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{d.number}</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{d.buyerName ?? "—"}</TableCell>
                        <TableCell>{d.postedAt ? new Date(d.postedAt).toLocaleDateString("uk-UA") : "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} sx={{ p: 0, border: 0 }}><EmptyState title="Немає продажів" /></TableCell></TableRow>
                  )}
                </TableBody>
              </DataTable>
            </>
          ) : (
            <EmptyState title="Немає даних за період" />
          )}
        </ContentCard>
      )}

      {tab === 3 && (
        <ContentCard title="Топ-10 товарів за продажами" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportTop()}>CSV</Button>} noPadding>
          {topProducts.isLoading ? <LoadingState /> : (
            <DataTable minWidth={560}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell align="right">К-сть</TableCell>
                  <TableCell align="right">Виручка</TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>Маржа</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topProducts.data?.items?.length ? (
                  topProducts.data.items.map((p: { sku: string; name: string; quantity: number; revenue: number; margin: number }, i: number) => (
                    <TableRow key={p.sku} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><Box component="span" sx={{ fontWeight: 600, display: "block" }}>{p.name}</Box><Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{p.sku}</Box></TableCell>
                      <TableCell align="right">{p.quantity}</TableCell>
                      <TableCell align="right">{p.revenue.toLocaleString("uk-UA")} ₴</TableCell>
                      <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" }, color: "success.main", fontWeight: 600 }}>{p.margin.toLocaleString("uk-UA")} ₴</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} sx={{ p: 0, border: 0 }}><EmptyState title="Немає продажів за період" /></TableCell></TableRow>
                )}
              </TableBody>
            </DataTable>
          )}
        </ContentCard>
      )}

      {tab === 4 && (
        <ContentCard title="Маржинальність" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportMargin()}>CSV</Button>}>
          {margin.isLoading ? <LoadingState /> : margin.data ? (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard title="Виручка" value={`${Number(margin.data.revenue).toLocaleString("uk-UA")} ₴`} accent="primary" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard title="Собівартість" value={`${Number(margin.data.cost).toLocaleString("uk-UA")} ₴`} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard title="Маржа" value={`${Number(margin.data.margin).toLocaleString("uk-UA")} ₴`} accent="success" />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <StatCard title="Маржа %" value={`${margin.data.marginPercent}%`} accent="info" />
                </Grid>
              </Grid>
              <DataTable minWidth={520}>
                <TableHead>
                  <TableRow>
                    <TableCell>Товар</TableCell>
                    <TableCell align="right">Виручка</TableCell>
                    <TableCell align="right">Маржа</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {margin.data.products?.slice(0, 10).map((p: { sku: string; name: string; revenue: number; margin: number }) => (
                    <TableRow key={p.sku} hover>
                      <TableCell>{p.name}</TableCell>
                      <TableCell align="right">{p.revenue.toLocaleString("uk-UA")} ₴</TableCell>
                      <TableCell align="right" sx={{ color: "success.main", fontWeight: 600 }}>{p.margin.toLocaleString("uk-UA")} ₴</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </>
          ) : (
            <EmptyState title="Немає даних" />
          )}
        </ContentCard>
      )}

      {tab === 5 && (
        <ContentCard title="ABC-аналіз залишків (заморожені кошти)" action={<Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportAbc()}>CSV</Button>} noPadding>
          {abc.isLoading ? <LoadingState /> : (
            <DataTable minWidth={600}>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Категорія</TableCell>
                  <TableCell align="right">Залишок</TableCell>
                  <TableCell align="right">Вартість</TableCell>
                  <TableCell align="right">Частка</TableCell>
                  <TableCell>ABC</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {abc.data?.length ? (
                  abc.data.slice(0, 20).map((p: { productId: string; sku: string; name: string; category: string; quantity: number; stockValue: number; share: number; abc: string }) => (
                    <TableRow key={p.productId} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{p.category}</TableCell>
                      <TableCell align="right">{p.quantity}</TableCell>
                      <TableCell align="right">{p.stockValue.toLocaleString("uk-UA")} ₴</TableCell>
                      <TableCell align="right">{p.share}%</TableCell>
                      <TableCell><Chip size="small" label={p.abc} color={abcColor[p.abc] ?? "default"} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} sx={{ p: 0, border: 0 }}><EmptyState title="Немає даних" /></TableCell></TableRow>
                )}
              </TableBody>
            </DataTable>
          )}
        </ContentCard>
      )}

      {tab === 6 && (
        <ContentCard title="Нижче мінімального залишку" noPadding>
          <DataTable minWidth={480}>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Назва</TableCell>
                <TableCell align="right">Залишок</TableCell>
                <TableCell align="right">Мінімум</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!lowStock.data?.length ? (
                <TableRow><TableCell colSpan={4} sx={{ p: 0, border: 0 }}><EmptyState title="Усі позиції в нормі" /></TableCell></TableRow>
              ) : (
                lowStock.data.map((p: { id: string; sku: string; name: string; quantity: number; minStock: number }) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{p.sku}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.quantity}</TableCell>
                    <TableCell align="right">{p.minStock}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </ContentCard>
      )}
    </Box>
  );
}
