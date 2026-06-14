import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Chip,
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
} from "@mui/material";
import { api } from "../api/client";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { FilterBar } from "../components/FilterBar";
import { ImeiSearchBar } from "../components/ImeiSearchBar";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { ProductDetailDrawer } from "../components/ProductDetailDrawer";
import type { StockBalanceRow } from "../types";

function StockStatusChip({ quantity, isLow }: { quantity: number; isLow: boolean }) {
  if (quantity === 0) {
    return <Chip label="Закінчився" color="error" size="small" />;
  }
  if (isLow) {
    return <Chip label="Дозамовити" color="warning" size="small" />;
  }
  return <Chip label="Достатньо" color="success" size="small" />;
}

export function StockPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const lowOnly = params.get("lowOnly") === "1";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-balances"],
    queryFn: async () => {
      const { data } = await api.get<StockBalanceRow[]>("/stock/balances");
      return data;
    },
  });

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "uk"));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.filter((r) => {
      if (lowOnly && !r.isLow) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q)
      );
    });
  }, [data, search, categoryFilter, lowOnly]);

  if (isLoading) return <LoadingState />;
  if (error) return <Alert severity="error">Не вдалося завантажити залишки</Alert>;

  return (
    <Box>
      <PageHeader
        title="Залишки на складі"
        subtitle="Натисніть на рядок, щоб відкрити картку товару та історію руху"
      />

      <ImeiSearchBar />

      <FilterBar>
        <TextField
          label="Пошук (назва, SKU, бренд)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormControl>
          <InputLabel>Категорія</InputLabel>
          <Select value={categoryFilter} label="Категорія" onChange={(e) => setCategoryFilter(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={lowOnly}
              onChange={(e) => {
                setParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.checked) next.set("lowOnly", "1");
                  else next.delete("lowOnly");
                  return next;
                }, { replace: true });
              }}
            />
          }
          label="Лише низький залишок"
          sx={{ ml: { xs: 0, sm: 1 } }}
        />
        {(categoryFilter || lowOnly || search) && (
          <Chip
            size="small"
            label={`Показано: ${filtered.length} з ${data?.length ?? 0}`}
            variant="outlined"
          />
        )}
      </FilterBar>

      <DataTable minWidth={720}>
        <TableHead>
          <TableRow>
            <TableCell>SKU</TableCell>
            <TableCell>Назва</TableCell>
            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Категорія</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Бренд</TableCell>
            <TableCell align="right">Залишок</TableCell>
            <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>Мін.</TableCell>
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row) => (
            <TableRow
              key={row.productId}
              hover
              sx={{ cursor: "pointer" }}
              onClick={() => setSelectedId(row.productId)}
            >
              <TableCell sx={{ fontWeight: 600 }}>{row.sku}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{row.category}</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{row.brand}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{row.quantity}</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{row.minStock}</TableCell>
              <TableCell>
                <StockStatusChip quantity={row.quantity} isLow={row.isLow} />
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                <EmptyState
                  title="Нічого не знайдено"
                  description="Змініть фільтри або скиньте пошук"
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </DataTable>

      <ProductDetailDrawer productId={selectedId} onClose={() => setSelectedId(null)} />
    </Box>
  );
}
