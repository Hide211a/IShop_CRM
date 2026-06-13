import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api } from "../api/client";
import { DataTable } from "./DataTable";
import { useAuth } from "../context/AuthContext";
import type { Product, ProductSerial } from "../types";
import { documentTypeLabels } from "../utils/labels";

interface ProductDetail {
  product: Product;
  quantity: number;
  movements: Array<{
    id: string;
    createdAt: string;
    quantityChange: number;
    balanceAfter: number;
    document: { number: string; type: string; buyerName?: string | null };
  }>;
  serials: ProductSerial[];
}

interface Props {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailDrawer({ productId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManageDocs = user?.role === "MANAGER" || user?.role === "ADMIN";
  const canManageSerials = canManageDocs;

  const { data } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: () => api.get<ProductDetail>(`/products/${productId}/detail`).then((r) => r.data),
    enabled: !!productId,
  });

  const p = data?.product;
  const toolbarOffset = { xs: 56, sm: 64 };

  const deleteSerial = useMutation({
    mutationFn: (serialId: string) => api.delete(`/serials/${serialId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-detail", productId] });
      qc.invalidateQueries({ queryKey: ["serials", productId] });
      qc.invalidateQueries({ queryKey: ["stock-balances"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const serialStatusLabel: Record<string, string> = {
    IN_STOCK: "На складі",
    SOLD: "Продано",
    RESERVED: "Резерв",
  };

  return (
    <Drawer
      anchor="right"
      open={!!productId}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "min(100vw - 16px, 360px)", sm: 420 },
            top: toolbarOffset,
            height: { xs: "calc(100% - 56px)", sm: "calc(100% - 64px)" },
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            borderLeft: `1px solid ${alpha("#0F172A", 0.08)}`,
            boxShadow: "-8px 0 24px rgba(15,23,42,0.08)",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
          flexShrink: 0,
          bgcolor: alpha("#4F46E5", 0.04),
        }}
      >
        {p ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
              {p.name}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {p.sku} · {p.brand?.name} · {p.category?.name}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary">Завантаження...</Typography>
        )}
        <IconButton aria-label="Закрити" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.5, pb: 2.5, overflow: "auto", flex: 1 }}>
        {p && (
          <>
            <Box sx={{ display: "flex", gap: 1, my: 2, flexWrap: "wrap" }}>
              <Chip label={`Залишок: ${data?.quantity ?? 0}`} color="primary" />
              <Chip label={`Мін: ${p.minStock}`} variant="outlined" />
              {p.trackSerial && <Chip label="IMEI" size="small" color="info" />}
            </Box>

            {canManageDocs && (
              <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
              <Button component={Link} to={`/documents/new?type=EXPENSE&productId=${p.id}`} size="small" variant="contained" color="success" disabled={(data?.quantity ?? 0) < 1}>
                Швидкий продаж
              </Button>
              <Button
                component={Link}
                to={`/documents/new?type=RESERVATION&productId=${p.id}`}
                size="small"
                variant="outlined"
                disabled={(data?.quantity ?? 0) < 1}
              >
                Резерв
              </Button>
              <Button component={Link} to={`/documents/new?type=RECEIPT&productId=${p.id}`} size="small" variant="outlined">
                Надходження
              </Button>
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Останній рух</Typography>
            <DataTable minWidth={280}>
              <TableHead>
                <TableRow>
                  <TableCell>Документ</TableCell>
                  <TableCell align="right">Δ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>{m.document.number}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {documentTypeLabels[m.document.type as keyof typeof documentTypeLabels]}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, color: m.quantityChange > 0 ? "success.main" : "error.main" }}
                    >
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>

            {p.trackSerial && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>IMEI на складі</Typography>
                {canManageSerials && (
                  <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                    Додавання/видалення IMEI автоматично змінює залишок на складі
                  </Alert>
                )}
                {data?.serials.filter((s) => s.status === "IN_STOCK").map((s) => (
                  <Box key={s.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <Chip label={s.imei} size="small" variant="outlined" />
                    {canManageSerials && (
                      <IconButton
                        size="small"
                        color="error"
                        title="Видалити IMEI"
                        onClick={() => {
                          if (window.confirm(`Видалити IMEI ${s.imei}? Залишок зменшиться на 1.`)) {
                            deleteSerial.mutate(s.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
                {!data?.serials.filter((s) => s.status === "IN_STOCK").length && (
                  <Typography variant="body2" color="text.secondary">Немає вільних IMEI</Typography>
                )}
                {!!data?.serials.filter((s) => s.status !== "IN_STOCK").length && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      Інші статуси
                    </Typography>
                    {data.serials.filter((s) => s.status !== "IN_STOCK").map((s) => (
                      <Chip
                        key={s.id}
                        label={`${s.imei} — ${serialStatusLabel[s.status] ?? s.status}`}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
