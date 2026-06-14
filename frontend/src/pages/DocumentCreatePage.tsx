import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { api } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import type { DocumentType, Product, Supplier } from "../types";
import { documentTypeLabels } from "../utils/labels";
import { hasStockIssues, lineStockWarning } from "../utils/stockValidation";
import {
  validateDocumentForm,
  type DocumentFieldErrors,
} from "../utils/documentValidation";

interface LineRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function DocumentCreatePage() {
  const [params] = useSearchParams();
  const type = (params.get("type") ?? "RECEIPT") as DocumentType;
  const productIdParam = params.get("productId");
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [lines, setLines] = useState<LineRow[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<DocumentFieldErrors>({});

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/products").then((r) => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => api.get<Supplier[]>("/directories/suppliers").then((r) => r.data), enabled: type === "RECEIPT" });

  useEffect(() => {
    if (!productIdParam || !products?.length) return;
    const product = products.find((p) => p.id === productIdParam);
    if (!product) return;
    const unitPrice =
      type === "RECEIPT" ? Number(product.purchasePrice) : Number(product.salePrice);
    setLines([{ productId: product.id, quantity: 1, unitPrice }]);
  }, [productIdParam, products, type]);

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    products?.forEach((p) => map.set(p.id, p.stockBalance?.quantity ?? 0));
    return map;
  }, [products]);

  const stockBlocked = hasStockIssues(
    type,
    lines.filter((l) => l.productId),
    stockByProductId,
  );

  const submitCreate = () => {
    const validation = validateDocumentForm({
      type,
      supplierId,
      buyerName,
      buyerPhone,
      lines,
    });
    if (!validation.ok) {
      setFieldErrors(validation.fields);
      setError(validation.message);
      return;
    }
    setFieldErrors({});
    setError("");
    create.mutate();
  };

  const create = useMutation({
    mutationFn: () =>
      api.post("/documents", {
        type,
        notes: notes.trim() || undefined,
        supplierId: type === "RECEIPT" ? supplierId : undefined,
        buyerName:
          type === "EXPENSE" || type === "RESERVATION" ? buyerName.trim() : undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        lines: lines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: l.productId,
            quantity: type === "INVENTORY" ? l.quantity : Math.max(1, l.quantity),
            unitPrice: l.unitPrice,
          })),
      }),
    onSuccess: (res) => navigate(`/documents/${res.data.id}`),
    onError: (e: unknown) => {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message ?? err.message;
      setError(msg ?? "Помилка створення документа");
    },
  });

  const addLine = () => setLines([...lines, { productId: "", quantity: 1, unitPrice: 0 }]);
  const updateLine = (i: number, patch: Partial<LineRow>) => {
    const next = [...lines];
    next[i] = { ...next[i], ...patch };
    const product = products?.find((p) => p.id === next[i].productId);
    if (product && patch.productId) {
      next[i].unitPrice = type === "RECEIPT" ? Number(product.purchasePrice) : Number(product.salePrice);
    }
    setLines(next);
  };

  const qtyLabel = type === "INVENTORY" ? "Фактична к-сть" : "Кількість";

  return (
    <Box>
      <PageHeader title={`Новий документ: ${documentTypeLabels[type]}`} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {productIdParam && products?.find((p) => p.id === productIdParam) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Товар обрано зі залишків: {products.find((p) => p.id === productIdParam)?.name}
        </Alert>
      )}

      {stockBlocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Кількість перевищує залишок на складі. Виправте рядки перед створенням документа.
        </Alert>
      )}

      {type === "RECEIPT" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Оберіть товар і кількість. Для аксесуарів (без IMEI) після створення одразу проведіть документ. Для смартфонів — на наступному екрані введіть IMEI кожного пристрою.
        </Alert>
      )}

      <ContentCard title="Реквізити документа">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField label="Примітки" value={notes} onChange={(e) => setNotes(e.target.value)} multiline />
          {type === "RECEIPT" && (
            <FormControl required error={!!fieldErrors.supplierId}>
              <InputLabel>Постачальник</InputLabel>
              <Select
                value={supplierId}
                label="Постачальник"
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, supplierId: undefined }));
                }}
              >
                <MenuItem value="">Оберіть постачальника</MenuItem>
                {suppliers?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
              {fieldErrors.supplierId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {fieldErrors.supplierId}
                </Typography>
              )}
            </FormControl>
          )}
          {(type === "EXPENSE" || type === "RESERVATION") && (
            <>
              <TextField
                required
                label="ПІБ покупця"
                value={buyerName}
                error={!!fieldErrors.buyerName}
                helperText={fieldErrors.buyerName}
                onChange={(e) => {
                  setBuyerName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, buyerName: undefined }));
                }}
              />
              <TextField
                required={type === "RESERVATION"}
                label="Телефон"
                value={buyerPhone}
                error={!!fieldErrors.buyerPhone}
                helperText={fieldErrors.buyerPhone ?? (type === "EXPENSE" ? "Необов'язково" : undefined)}
                onChange={(e) => {
                  setBuyerPhone(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, buyerPhone: undefined }));
                }}
              />
            </>
          )}
        </Box>
        {type === "INVENTORY" && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Вкажіть фактичну кількість на складі (не різницю).
          </Typography>
        )}
      </ContentCard>

      <ContentCard
        title="Рядки"
        action={<Button size="small" variant="outlined" onClick={addLine}>+ Рядок</Button>}
        noPadding
      >
        <DataTable minWidth={640}>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>{qtyLabel}</TableCell>
              <TableCell>Ціна</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, i) => {
              const stock = line.productId ? (stockByProductId.get(line.productId) ?? 0) : 0;
              const warn = line.productId ? lineStockWarning(type, line.quantity, stock) : null;
              const lineError = fieldErrors.lineItems?.[i];
              return (
              <TableRow key={i} sx={warn || lineError ? { bgcolor: alpha("#EF4444", 0.06) } : undefined}>
                <TableCell>
                  <FormControl fullWidth size="small" error={!!warn || !!lineError?.productId} required>
                    <Select value={line.productId} displayEmpty onChange={(e) => updateLine(i, { productId: e.target.value })}>
                      <MenuItem value="">Оберіть товар</MenuItem>
                      {products?.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.sku} — {p.name} (склад: {p.stockBalance?.quantity ?? 0})
                          {p.trackSerial ? " · IMEI" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {warn && (
                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                      {warn}
                    </Typography>
                  )}
                  {lineError?.productId && !warn && (
                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                      {lineError.productId}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    required
                    value={line.quantity}
                    error={!!warn || !!lineError?.quantity}
                    helperText={lineError?.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    required={type !== "INVENTORY"}
                    value={line.unitPrice}
                    error={!!lineError?.unitPrice}
                    helperText={lineError?.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </DataTable>
      </ContentCard>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={() => navigate("/documents")}>Скасувати</Button>
        {type === "RECEIPT" && (
          <Button
            variant="outlined"
            onClick={async () => {
              const { data: last } = await api.get<{
                supplierId?: string | null;
                lines: Array<{ productId: string; quantity: number; unitPrice: string }>;
              } | null>("/documents/last-receipt");
              if (!last) {
                setError("Немає попереднього надходження");
                return;
              }
              if (last.supplierId) setSupplierId(last.supplierId);
              setLines(
                last.lines.map((l) => ({
                  productId: l.productId,
                  quantity: l.quantity,
                  unitPrice: Number(l.unitPrice),
                })),
              );
            }}
          >
            Скопіювати останнє надходження
          </Button>
        )}
        {type === "EXPENSE" && (
          <Button
            variant="outlined"
            onClick={async () => {
              const { data: last } = await api.get<{
                buyerName?: string | null;
                buyerPhone?: string | null;
                lines: Array<{ productId: string; quantity: number; unitPrice: string }>;
              } | null>("/documents/last-expense");
              if (!last) {
                setError("Немає попереднього продажу");
                return;
              }
              if (last.buyerName) setBuyerName(last.buyerName);
              if (last.buyerPhone) setBuyerPhone(last.buyerPhone);
              setLines(
                last.lines.map((l) => ({
                  productId: l.productId,
                  quantity: l.quantity,
                  unitPrice: Number(l.unitPrice),
                })),
              );
            }}
          >
            Скопіювати останній продаж
          </Button>
        )}
        <Button
          variant="contained"
          onClick={submitCreate}
          disabled={create.isPending || stockBlocked}
        >
          Створити чернетку
        </Button>
      </Box>
    </Box>
  );
}
