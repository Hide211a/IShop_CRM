import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import QrCodeIcon from "@mui/icons-material/QrCode";
import { api } from "../api/client";
import { AddButton, PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { FilterBar } from "../components/FilterBar";
import type { Brand, Category, Product, ProductSerial } from "../types";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  brandId: "",
  purchasePrice: "",
  salePrice: "",
  minStock: "0",
  trackSerial: false,
};

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err.response?.data?.message ?? fallback;
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const showInactive = params.get("showInactive") === "1";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [imeiOnly, setImeiOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [serialOpen, setSerialOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newImei, setNewImei] = useState("");
  const [error, setError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkMinStock, setBulkMinStock] = useState("5");
  const [importResult, setImportResult] = useState("");
  const qc = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, categoryFilter, showInactive, imeiOnly],
    queryFn: () => {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      if (categoryFilter) q.set("categoryId", categoryFilter);
      if (showInactive) q.set("active", "all");
      if (imeiOnly) q.set("trackSerial", "true");
      return api.get<Product[]>(`/products?${q}`).then((r) => r.data);
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/directories/categories").then((r) => r.data),
  });
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/directories/brands").then((r) => r.data),
  });

  const { data: serials, refetch: refetchSerials } = useQuery({
    queryKey: ["serials", editProduct?.id],
    queryFn: () => api.get<ProductSerial[]>(`/serials/product/${editProduct!.id}`).then((r) => r.data),
    enabled: !!editProduct && serialOpen,
  });

  const filteredLocal = useMemo(() => products ?? [], [products]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId,
        brandId: form.brandId,
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        minStock: Number(form.minStock),
        trackSerial: form.trackSerial,
        active: editProduct?.active !== false,
      };
      if (editProduct) return api.put(`/products/${editProduct.id}`, body);
      return api.post("/products", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
      setOpen(false);
      setEditProduct(null);
      setForm(emptyForm);
      setError("");
    },
    onError: (e) => setError(apiErrorMessage(e, "Помилка збереження (перевірте SKU)")),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
    },
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/reactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
    },
  });

  const addImei = useMutation({
    mutationFn: () => api.post(`/serials/product/${editProduct!.id}`, { imei: newImei }),
    onSuccess: () => {
      setNewImei("");
      refetchSerials();
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-balances"] });
    },
    onError: (e) => setError(apiErrorMessage(e, "IMEI не додано")),
  });

  const bulkMinStockMutation = useMutation({
    mutationFn: () =>
      api.put("/products/bulk-min-stock", {
        categoryId: bulkCategoryId,
        minStock: Number(bulkMinStock),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
      qc.invalidateQueries({ queryKey: ["product-changelog"] });
      setBulkOpen(false);
      setImportResult(`Оновлено ${res.data.updated} товарів`);
    },
    onError: (e) => setError(apiErrorMessage(e, "Не вдалося оновити")),
  });

  const importProducts = useMutation({
    mutationFn: (rows: unknown[]) => api.post("/products/import", { rows }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-admin"] });
      qc.invalidateQueries({ queryKey: ["product-changelog"] });
      setImportResult(`Імпорт: створено ${res.data.created}, пропущено ${res.data.skipped}`);
    },
    onError: (e) => setError(apiErrorMessage(e, "Помилка імпорту")),
  });

  const parseCsvFile = (text: string) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string | number | boolean> = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });
      return {
        sku: String(row.sku ?? ""),
        name: String(row.name ?? ""),
        categoryName: String(row.categoryName ?? row.category ?? ""),
        brandName: String(row.brandName ?? row.brand ?? ""),
        purchasePrice: Number(row.purchasePrice) || 0,
        salePrice: Number(row.salePrice) || 0,
        minStock: Number(row.minStock) || 0,
        trackSerial: String(row.trackSerial).toLowerCase() === "true" || row.trackSerial === "1",
      };
    });
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? "",
      categoryId: p.categoryId,
      brandId: p.brandId,
      purchasePrice: String(p.purchasePrice),
      salePrice: String(p.salePrice),
      minStock: String(p.minStock),
      trackSerial: p.trackSerial,
    });
    setError("");
    setOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="Товари"
        subtitle="Довідник номенклатури магазину"
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={() => { setBulkOpen(true); setError(""); }}>
              Мін. залишок
            </Button>
            <Button size="small" variant="outlined" onClick={() => { setImportOpen(true); setImportResult(""); setError(""); }}>
              Імпорт CSV
            </Button>
            <AddButton
              label="Новий товар"
              onClick={() => {
                setEditProduct(null);
                setForm(emptyForm);
                setError("");
                setOpen(true);
              }}
            />
          </Box>
        }
      />

      {importResult && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setImportResult("")}>{importResult}</Alert>}

      <FilterBar>
        <TextField
          label="Пошук (SKU, назва)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormControl>
          <InputLabel>Категорія</InputLabel>
          <Select
            value={categoryFilter}
            label="Категорія"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">Усі</MenuItem>
            {categories?.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={imeiOnly} onChange={(e) => setImeiOnly(e.target.checked)} />}
          label="Лише з IMEI"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showInactive}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.checked) next.set("showInactive", "1");
                else next.delete("showInactive");
                setParams(next);
              }}
            />
          }
          label="Показати неактивні"
        />
        <Chip size="small" label={`Знайдено: ${filteredLocal.length}`} variant="outlined" />
      </FilterBar>

      <DataTable minWidth={800}>
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell>Назва</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Категорія</TableCell>
            <TableCell align="right">Залишок</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>IMEI</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дії</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Завантаження...</TableCell></TableRow>
          ) : filteredLocal.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                <EmptyState
                  title="Товарів не знайдено"
                  description="Змініть фільтри або додайте новий товар"
                  action={
                    <Button variant="contained" size="small" onClick={() => { setEditProduct(null); setForm(emptyForm); setOpen(true); }}>
                      Додати товар
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            filteredLocal.map((p) => (
              <TableRow
                key={p.id}
                hover
                sx={p.active === false ? { opacity: 0.65, bgcolor: alpha("#64748B", 0.06) } : undefined}
              >
                  <TableCell sx={{ fontWeight: 600 }}>{p.sku}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{p.category?.name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{p.stockBalance?.quantity ?? 0}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{p.trackSerial ? "Так" : "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.active !== false ? "Активний" : "Неактивний"}
                      color={p.active !== false ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {p.trackSerial && p.active !== false && (
                      <IconButton
                        size="small"
                        title="IMEI"
                        onClick={() => {
                          setEditProduct(p);
                          setSerialOpen(true);
                        }}
                      >
                        <QrCodeIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => openEdit(p)}><EditIcon /></IconButton>
                    {p.active !== false ? (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => {
                          if (window.confirm(`Деактивувати «${p.name}»? Товар зникне зі списків для менеджера.`)) {
                            deactivate.mutate(p.id);
                          }
                        }}
                      >
                        Деактив.
                      </Button>
                    ) : (
                      <Button size="small" color="success" onClick={() => reactivate.mutate(p.id)}>
                        Відновити
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editProduct ? "Редагувати товар" : "Новий товар"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
          {error && <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{error}</Alert>}
          <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <TextField label="Назва" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ gridColumn: "1 / -1" }} />
          <FormControl>
            <InputLabel>Категорія</InputLabel>
            <Select value={form.categoryId} label="Категорія" onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Бренд</InputLabel>
            <Select value={form.brandId} label="Бренд" onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
              {brands?.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Ціна закупівлі" type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          <TextField label="Ціна продажу" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <TextField label="Мін. залишок" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.trackSerial}
                  disabled={!!editProduct?.trackSerial}
                  onChange={(e) => setForm({ ...form, trackSerial: e.target.checked })}
                />
              }
              label="Облік по IMEI (смартфони)"
            />
            {editProduct?.trackSerial && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Вимкнути IMEI неможливо, якщо для товару вже є серійні номери
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => save.mutate()}>Зберегти</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={serialOpen} onClose={() => setSerialOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>IMEI — {editProduct?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Додавайте IMEI вручну або при проведенні надходження. Додавання/видалення змінює залишок на складі.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField size="small" fullWidth label="Новий IMEI" value={newImei} onChange={(e) => setNewImei(e.target.value)} />
            <Button variant="outlined" onClick={() => addImei.mutate()}>Додати</Button>
          </Box>
          {serials?.map((s) => (
            <Box key={s.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="body2">{s.imei} — {s.status}</Typography>
              {s.status === "IN_STOCK" && (
                <IconButton
                  size="small"
                  color="error"
                  title="Видалити IMEI"
                  onClick={() => {
                    if (window.confirm(`Видалити IMEI ${s.imei}? Залишок зменшиться на 1.`)) {
                      api.delete(`/serials/${s.id}`).then(() => {
                        refetchSerials();
                        qc.invalidateQueries({ queryKey: ["products"] });
                        qc.invalidateQueries({ queryKey: ["stock-balances"] });
                      });
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setSerialOpen(false)}>Закрити</Button></DialogActions>
      </Dialog>

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Мін. залишок по категорії</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormControl>
            <InputLabel>Категорія</InputLabel>
            <Select value={bulkCategoryId} label="Категорія" onChange={(e) => setBulkCategoryId(e.target.value)}>
              {categories?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Новий мін. залишок" type="number" value={bulkMinStock} onChange={(e) => setBulkMinStock(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)}>Скасувати</Button>
          <Button variant="contained" disabled={!bulkCategoryId} onClick={() => bulkMinStockMutation.mutate()}>Застосувати</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Імпорт товарів з CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Колонки: sku, name, categoryName, brandName, purchasePrice, salePrice, minStock, trackSerial
          </Typography>
          <Button variant="outlined" component="label" fullWidth>
            Обрати файл CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const rows = parseCsvFile(text);
                if (!rows.length) {
                  setError("Файл порожній або невірний формат");
                  return;
                }
                importProducts.mutate(rows);
                setImportOpen(false);
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions><Button onClick={() => setImportOpen(false)}>Закрити</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
