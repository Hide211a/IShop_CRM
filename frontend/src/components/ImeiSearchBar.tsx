import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, alpha, Box, TextField, Typography } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { api } from "../api/client";
import type { ProductSerial } from "../types";

export function ImeiSearchBar() {
  const [q, setQ] = useState("");
  const enabled = q.trim().length >= 3;

  const { data } = useQuery({
    queryKey: ["imei-search", q],
    queryFn: () =>
      api.get<Array<ProductSerial & { product?: { sku: string; name: string } }>>(
        `/serials/search?q=${encodeURIComponent(q.trim())}`,
      ).then((r) => r.data),
    enabled,
  });

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: `1px solid ${alpha("#0F172A", 0.08)}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: alpha("#4F46E5", 0.1),
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QrCodeScannerIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          Пошук по IMEI
        </Typography>
      </Box>
      <TextField
        fullWidth
        placeholder="Мінімум 3 символи"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {enabled && data?.length === 0 && (
        <Alert severity="info" sx={{ mt: 1.5 }}>IMEI не знайдено</Alert>
      )}
      {data?.map((s) => (
        <Box
          key={s.id}
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: alpha("#4F46E5", 0.04),
            border: `1px solid ${alpha("#4F46E5", 0.1)}`,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.imei}</Typography>
          <Typography variant="caption" color="text.secondary">
            {s.product?.name} · {s.status}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
