import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
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
import { ConfirmPostDialog } from "../components/ConfirmPostDialog";
import { ContentCard } from "../components/ContentCard";
import { DataTable } from "../components/DataTable";
import { DocumentPrintSheet } from "../components/DocumentPrintSheet";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import type { DocumentDetail, LineSerialPost, Product, ProductSerial, Supplier } from "../types";
import { documentStatusLabels, documentTypeLabels } from "../utils/labels";
import { hasStockIssues, lineStockWarning } from "../utils/stockValidation";
import { validateSerialsForPost } from "../utils/serialValidation";
import {
  validateDocumentForm,
  type DocumentFieldErrors,
} from "../utils/documentValidation";

interface LineRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unpostOpen, setUnpostOpen] = useState(false);
  const [imeiInputs, setImeiInputs] = useState<Record<string, string[]>>({});
  const [serialSelections, setSerialSelections] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editBuyerName, setEditBuyerName] = useState("");
  const [editBuyerPhone, setEditBuyerPhone] = useState("");
  const [editLines, setEditLines] = useState<LineRow[]>([]);
  const [fieldErrors, setFieldErrors] = useState<DocumentFieldErrors>({});

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => api.get<DocumentDetail>(`/documents/${id}`).then((r) => r.data),
    enabled: !!id && id !== "new",
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products").then((r) => r.data),
    enabled: editing,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<Supplier[]>("/directories/suppliers").then((r) => r.data),
    enabled: editing && doc?.type === "RECEIPT",
  });

  const trackSerialLines =
    doc?.lines.filter((l) => l.product?.trackSerial) ?? [];

  const { data: allSerials } = useQuery({
    queryKey: ["serials-for-doc", trackSerialLines.map((l) => l.productId)],
    queryFn: async () => {
      const maps: Record<string, ProductSerial[]> = {};
      for (const line of trackSerialLines) {
        const { data } = await api.get<ProductSerial[]>(
          `/serials/product/${line.productId}`,
        );
        maps[line.productId] = data.filter((s) => s.status === "IN_STOCK");
      }
      return maps;
    },
    enabled:
      !!doc &&
      trackSerialLines.length > 0 &&
      doc.type !== "RECEIPT" &&
      doc.status === "DRAFT",
  });

  const docLinesKey = useMemo(
    () => doc?.lines.map((l) => `${l.id}:${l.quantity}:${l.productId}`).join("|") ?? "",
    [doc?.lines],
  );

  useEffect(() => {
    if (!doc) return;
    const initialImei: Record<string, string[]> = {};
    const initialSerial: Record<string, string[]> = {};
    for (const line of doc.lines) {
      if (line.product?.trackSerial && doc.type === "RECEIPT") {
        initialImei[line.id] = Array(line.quantity).fill("");
      }
      if (
        line.product?.trackSerial &&
        (doc.type === "EXPENSE" || doc.type === "RESERVATION")
      ) {
        initialSerial[line.id] = [];
      }
    }
    setImeiInputs(initialImei);
    setSerialSelections(initialSerial);
  }, [doc?.id, doc?.type, docLinesKey]);

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    products?.forEach((p) => map.set(p.id, p.stockBalance?.quantity ?? 0));
    return map;
  }, [products]);

  const startEditing = () => {
    if (!doc) return;
    setEditNotes(doc.notes ?? "");
    setEditSupplierId(doc.supplierId ?? "");
    setEditBuyerName(doc.buyerName ?? "");
    setEditBuyerPhone(doc.buyerPhone ?? "");
    setEditLines(
      doc.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
      })),
    );
    setEditing(true);
    setError("");
    setFieldErrors({});
  };

  const submitSave = () => {
    if (!doc) return;
    const validation = validateDocumentForm({
      type: doc.type,
      supplierId: editSupplierId,
      buyerName: editBuyerName,
      buyerPhone: editBuyerPhone,
      lines: editLines,
    });
    if (!validation.ok) {
      setFieldErrors(validation.fields);
      setError(validation.message);
      return;
    }
    setFieldErrors({});
    setError("");
    save.mutate();
  };

  const save = useMutation({
    mutationFn: () =>
      api.put(`/documents/${id}`, {
        notes: editNotes.trim() || undefined,
        supplierId: doc?.type === "RECEIPT" ? editSupplierId : undefined,
        buyerName:
          doc?.type === "EXPENSE" || doc?.type === "RESERVATION"
            ? editBuyerName.trim()
            : undefined,
        buyerPhone: editBuyerPhone.trim() || undefined,
        lines: editLines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: l.productId,
            quantity: doc?.type === "INVENTORY" ? l.quantity : Math.max(1, l.quantity),
            unitPrice: l.unitPrice,
          })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      setEditing(false);
      setError("");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Помилка збереження");
    },
  });

  const post = useMutation({
    mutationFn: () => {
      const lineSerials: LineSerialPost[] = [];
      doc?.lines.forEach((line) => {
        if (!line.product?.trackSerial) return;
        if (doc.type === "RECEIPT") {
          lineSerials.push({ lineId: line.id, imeis: imeiInputs[line.id] ?? [] });
        } else if (doc.type === "EXPENSE" || doc.type === "RESERVATION") {
          lineSerials.push({
            lineId: line.id,
            serialIds: serialSelections[line.id] ?? [],
          });
        }
      });
      return api.post(`/documents/${id}/post`, { lineSerials });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["stock-balances"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      setError("");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response
        ?.data?.message;
      setError(msg ?? "Помилка проведення");
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/documents/${id}`),
    onSuccess: () => navigate("/documents"),
  });

  const cancelReserve = useMutation({
    mutationFn: () => api.post(`/documents/${id}/cancel-reservation`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["stock-balances"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Помилка скасування");
    },
  });

  const completeSale = useMutation({
    mutationFn: () => api.post(`/documents/${id}/complete-sale`),
    onSuccess: (res) => {
      navigate(`/documents/${res.data.sale.id}`);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Помилка оформлення продажу");
    },
  });

  const unpost = useMutation({
    mutationFn: () => api.post(`/documents/${id}/unpost`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["stock-balances"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard-manager"] });
      setError("");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Помилка розпроведення");
    },
  });

  const canUnpost =
    doc?.status === "POSTED" &&
    doc.type !== "RESERVATION";

  const postSummary =
    doc?.lines
      .map(
        (l) =>
          `${l.product?.name}: ${l.quantity} шт. → залишок після проведення буде перераховано системою`,
      )
      .join("; ") ?? "";

  const stockLineWarnings =
    doc?.status === "DRAFT" && (doc.type === "EXPENSE" || doc.type === "RESERVATION")
      ? doc.lines
          .map((line) => ({
            line,
            warn: lineStockWarning(
              doc.type,
              line.quantity,
              line.product?.stockBalance?.quantity ?? 0,
            ),
          }))
          .filter((x) => x.warn)
      : [];

  const postBlockedByStock = stockLineWarnings.length > 0;

  const editStockBlocked =
    editing &&
    doc &&
    hasStockIssues(
      doc.type,
      editLines.filter((l) => l.productId),
      stockByProductId,
    );

  const serialValidationError =
    doc?.status === "DRAFT" ? validateSerialsForPost(doc, imeiInputs, serialSelections) : null;

  const postBlockedBySerials =
    !!serialValidationError &&
    trackSerialLines.length > 0 &&
    (doc?.type === "RECEIPT" ||
      doc?.type === "EXPENSE" ||
      doc?.type === "RESERVATION");

  const updateEditLine = (i: number, patch: Partial<LineRow>) => {
    const next = [...editLines];
    next[i] = { ...next[i], ...patch };
    const product = products?.find((p) => p.id === next[i].productId);
    if (product && patch.productId) {
      next[i].unitPrice =
        doc?.type === "RECEIPT" ? Number(product.purchasePrice) : Number(product.salePrice);
    }
    setEditLines(next);
  };

  const serialStatusLabel: Record<string, string> = {
    IN_STOCK: "На складі",
    SOLD: "Продано",
    RESERVED: "Резерв",
  };

  if (id === "new") {
    return <Navigate to="/documents/new" replace />;
  }

  if (isLoading || !doc) {
    return <LoadingState />;
  }

  const statusColor =
    doc.status === "POSTED" ? "success" : doc.status === "DRAFT" ? "warning" : "default";

  const showImeiBlock =
    doc.status === "DRAFT" &&
    doc.type === "RECEIPT" &&
    trackSerialLines.length > 0;

  return (
    <>
    <Box className="no-print">
      <PageHeader
        title={doc.number}
        subtitle={documentTypeLabels[doc.type]}
        action={<Chip label={documentStatusLabels[doc.status]} color={statusColor} />}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showImeiBlock && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Нижче введіть IMEI для кожного смартфона. Без них документ не проведеться.
        </Alert>
      )}

      {postBlockedByStock && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Недостатньо товару на складі для проведення. Зменшіть кількість або видаліть рядок.
        </Alert>
      )}

      {postBlockedBySerials && serialValidationError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serialValidationError}
        </Alert>
      )}

      {doc.status === "CANCELLED" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Документ скасовано (розпроведено). Повторне проведення неможливе.
        </Alert>
      )}

      <ContentCard title="Інформація">
        {editing ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Примітки" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline />
            {doc.type === "RECEIPT" && (
              <FormControl required error={!!fieldErrors.supplierId}>
                <InputLabel>Постачальник</InputLabel>
                <Select
                  value={editSupplierId}
                  label="Постачальник"
                  onChange={(e) => {
                    setEditSupplierId(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, supplierId: undefined }));
                  }}
                >
                  <MenuItem value="">Оберіть постачальника</MenuItem>
                  {suppliers?.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
                {fieldErrors.supplierId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {fieldErrors.supplierId}
                  </Typography>
                )}
              </FormControl>
            )}
            {(doc.type === "EXPENSE" || doc.type === "RESERVATION") && (
              <>
                <TextField
                  required
                  label="ПІБ покупця"
                  value={editBuyerName}
                  error={!!fieldErrors.buyerName}
                  helperText={fieldErrors.buyerName}
                  onChange={(e) => {
                    setEditBuyerName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, buyerName: undefined }));
                  }}
                />
                <TextField
                  required={doc.type === "RESERVATION"}
                  label="Телефон"
                  value={editBuyerPhone}
                  error={!!fieldErrors.buyerPhone}
                  helperText={fieldErrors.buyerPhone ?? (doc.type === "EXPENSE" ? "Необов'язково" : undefined)}
                  onChange={(e) => {
                    setEditBuyerPhone(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, buyerPhone: undefined }));
                  }}
                />
              </>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Дата: {new Date(doc.date).toLocaleString("uk-UA")}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Автор: {doc.createdBy?.fullName}</Typography>
            {doc.buyerName && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Покупець: {doc.buyerName} {doc.buyerPhone}
              </Typography>
            )}
            {doc.supplier && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>Постачальник: {doc.supplier.name}</Typography>
            )}
            {doc.notes && <Typography variant="body2">Примітки: {doc.notes}</Typography>}
          </>
        )}
      </ContentCard>

      <ContentCard
        title="Рядки документа"
        noPadding
        action={
          doc.status === "DRAFT" && !editing ? (
            <Button size="small" variant="outlined" onClick={startEditing}>
              Редагувати
            </Button>
          ) : editing ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setEditing(false)}>Скасувати</Button>
              <Button
                size="small"
                variant="contained"
                onClick={submitSave}
                disabled={save.isPending || editStockBlocked}
              >
                Зберегти
              </Button>
            </Box>
          ) : undefined
        }
      >
        {editing ? (
          <>
            {editStockBlocked && (
              <Alert severity="warning" sx={{ m: 2 }}>
                Кількість перевищує залишок на складі. Виправте рядки перед збереженням.
              </Alert>
            )}
            <DataTable minWidth={640}>
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>{doc.type === "INVENTORY" ? "Фактична к-сть" : "Кількість"}</TableCell>
                  <TableCell>Ціна</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {editLines.map((line, i) => {
                  const stock = line.productId ? (stockByProductId.get(line.productId) ?? 0) : 0;
                  const warn = line.productId ? lineStockWarning(doc.type, line.quantity, stock) : null;
                  const lineError = fieldErrors.lineItems?.[i];
                  return (
                    <TableRow key={i} sx={warn || lineError ? { bgcolor: alpha("#EF4444", 0.06) } : undefined}>
                      <TableCell>
                        <FormControl fullWidth size="small" error={!!warn || !!lineError?.productId} required>
                          <Select
                            value={line.productId}
                            displayEmpty
                            onChange={(e) => updateEditLine(i, { productId: e.target.value })}
                          >
                            <MenuItem value="">Оберіть товар</MenuItem>
                            {products?.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.sku} — {p.name} (склад: {p.stockBalance?.quantity ?? 0})
                                {p.trackSerial ? " · IMEI" : ""}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          required
                          value={line.quantity}
                          error={!!warn || !!lineError?.quantity}
                          helperText={lineError?.quantity}
                          onChange={(e) => updateEditLine(i, { quantity: Number(e.target.value) })}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          required={doc.type !== "INVENTORY"}
                          value={line.unitPrice}
                          error={!!lineError?.unitPrice}
                          helperText={lineError?.unitPrice}
                          onChange={(e) => updateEditLine(i, { unitPrice: Number(e.target.value) })}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setEditLines(editLines.filter((_, j) => j !== i))}
                          disabled={editLines.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </DataTable>
            <Box sx={{ p: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setEditLines([...editLines, { productId: "", quantity: 1, unitPrice: 0 }])}
              >
                + Рядок
              </Button>
            </Box>
          </>
        ) : (
        <DataTable minWidth={480}>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell align="right">К-сть</TableCell>
              <TableCell align="right">Ціна</TableCell>
              <TableCell align="right">Сума</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {doc.lines.map((line) => {
              const warn =
                doc.status === "DRAFT"
                  ? lineStockWarning(
                      doc.type,
                      line.quantity,
                      line.product?.stockBalance?.quantity ?? 0,
                    )
                  : null;
              return (
              <TableRow key={line.id} sx={warn ? { bgcolor: alpha("#EF4444", 0.06) } : undefined}>
                <TableCell>
                  {line.product?.name}
                  {warn && (
                    <Typography variant="caption" color="error" sx={{ display: "block" }}>
                      {warn}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{line.quantity}</TableCell>
                <TableCell align="right">
                  {Number(line.unitPrice).toLocaleString("uk-UA")} ₴
                </TableCell>
                <TableCell align="right">
                  {(Number(line.unitPrice) * line.quantity).toLocaleString("uk-UA")} ₴
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </DataTable>
        )}
      </ContentCard>

      {doc.status !== "DRAFT" && !!doc.serials?.length && (
        <ContentCard title="IMEI в документі">
          {doc.lines
            .filter((l) => l.product?.trackSerial)
            .map((line) => {
              const lineSerials = doc.serials!.filter((s) => s.productId === line.productId);
              if (!lineSerials.length) return null;
              return (
                <Box key={line.id} sx={{ mb: line.id !== doc.lines[doc.lines.length - 1]?.id ? 2 : 0 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {line.product?.name}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {lineSerials.map((s) => (
                      <Chip
                        key={s.id}
                        label={`${s.imei} (${serialStatusLabel[s.status] ?? s.status})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}
        </ContentCard>
      )}

      {showImeiBlock && (
        <ContentCard
          title="Введення IMEI"
          sx={{ bgcolor: alpha("#F59E0B", 0.06), borderColor: alpha("#F59E0B", 0.2) }}
        >
          {trackSerialLines.map((line) => (
            <Box key={line.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {line.product?.name} — {line.quantity} шт.
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                {Array.from({ length: line.quantity }).map((_, i) => (
                  <TextField
                    key={i}
                    required
                    fullWidth
                    size="small"
                    label={`IMEI ${i + 1}`}
                    placeholder="Напр. 352099001761481"
                    value={(imeiInputs[line.id] ?? [])[i] ?? ""}
                    onChange={(e) => {
                      const arr = [
                        ...(imeiInputs[line.id] ?? Array(line.quantity).fill("")),
                      ];
                      arr[i] = e.target.value;
                      setImeiInputs({ ...imeiInputs, [line.id]: arr });
                    }}
                  />
                ))}
              </Box>
              {line.id !== trackSerialLines[trackSerialLines.length - 1]?.id && (
                <Divider sx={{ mt: 2 }} />
              )}
            </Box>
          ))}
        </ContentCard>
      )}

      {doc.status === "DRAFT" &&
        (doc.type === "EXPENSE" || doc.type === "RESERVATION") &&
        trackSerialLines.length > 0 && (
          <ContentCard title="Оберіть IMEI зі складу">
            {trackSerialLines.map((line) => (
              <FormControl key={line.id} fullWidth sx={{ mb: 2 }} size="small">
                <InputLabel>
                  {line.product?.name} ({line.quantity} шт.)
                </InputLabel>
                <Select
                  multiple
                  value={serialSelections[line.id] ?? []}
                  label={`${line.product?.name} (${line.quantity} шт.)`}
                  error={
                    (serialSelections[line.id]?.length ?? 0) > 0 &&
                    (serialSelections[line.id]?.length ?? 0) !== line.quantity
                  }
                  onChange={(e) =>
                    setSerialSelections({
                      ...serialSelections,
                      [line.id]: e.target.value as string[],
                    })
                  }
                >
                  {(allSerials?.[line.productId] ?? []).map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.imei}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </ContentCard>
        )}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={() => navigate("/documents")}>
          Назад
        </Button>
        <Button variant="outlined" onClick={() => window.print()}>
          Друк накладної
        </Button>
        {doc.status === "DRAFT" && !editing && (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                const headerValidation = validateDocumentForm({
                  type: doc.type,
                  supplierId: doc.supplierId ?? "",
                  buyerName: doc.buyerName ?? "",
                  buyerPhone: doc.buyerPhone ?? "",
                  lines: doc.lines.map((line) => ({
                    productId: line.productId,
                    quantity: line.quantity,
                    unitPrice: Number(line.unitPrice),
                  })),
                });
                if (!headerValidation.ok) {
                  setError(headerValidation.message);
                  return;
                }
                const err = validateSerialsForPost(doc, imeiInputs, serialSelections);
                if (err && trackSerialLines.length > 0) {
                  setError(err);
                  return;
                }
                setError("");
                setConfirmOpen(true);
              }}
              disabled={postBlockedByStock || postBlockedBySerials}
            >
              Провести документ
            </Button>
            <Button variant="outlined" color="error" onClick={() => remove.mutate()}>
              Видалити
            </Button>
          </>
        )}
        {doc.status === "POSTED" && doc.type === "RESERVATION" && (
          <>
            <Button variant="contained" color="success" onClick={() => completeSale.mutate()}>
              Оформити продаж
            </Button>
            <Button variant="outlined" color="warning" onClick={() => cancelReserve.mutate()}>
              Скасувати резерв
            </Button>
          </>
        )}
        {canUnpost && (
          <Button variant="outlined" color="error" onClick={() => setUnpostOpen(true)}>
            Розпровести
          </Button>
        )}
      </Box>

      <ConfirmPostDialog
        open={confirmOpen}
        title="Провести документ?"
        description={postSummary}
        loading={post.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          post.mutate();
          setConfirmOpen(false);
        }}
      />

      <ConfirmPostDialog
        open={unpostOpen}
        title="Розпровести документ?"
        description="Залишки та IMEI будуть повернуті до стану до проведення. Документ отримає статус «Скасовано». Цю дію неможливо скасувати."
        confirmLabel="Розпровести"
        confirmColor="error"
        loading={unpost.isPending}
        onClose={() => setUnpostOpen(false)}
        onConfirm={() => {
          unpost.mutate();
          setUnpostOpen(false);
        }}
      />
    </Box>

    <DocumentPrintSheet doc={doc} />
    </>
  );
}
