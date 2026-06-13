import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../api/client";
import { ContentCard } from "./ContentCard";
import { DataTable } from "./DataTable";
import { documentStatusLabels, documentTypeLabels } from "../utils/labels";

interface CustomerDoc {
  id: string;
  number: string;
  type: string;
  status: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  postedAt?: string | null;
  _count?: { lines: number };
}

export function CustomerLookupCard() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-history", search],
    queryFn: () =>
      api
        .get<{
          buyerName: string | null;
          buyerPhone: string | null;
          documents: CustomerDoc[];
        }>(`/documents/customer-history?q=${encodeURIComponent(search)}`)
        .then((r) => r.data),
    enabled: search.length >= 3,
  });

  return (
    <ContentCard title="Картка клієнта">
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Телефон або ПІБ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Напр. +380501234567"
          sx={{ flex: 1, minWidth: 200 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={() => setSearch(query.trim())}
          disabled={query.trim().length < 3}
        >
          Знайти
        </Button>
      </Box>

      {search.length >= 3 && isLoading && (
        <Typography variant="body2" color="text.secondary">Пошук...</Typography>
      )}
      {error && <Alert severity="error">Не вдалося знайти клієнта</Alert>}

      {data && (
        <>
          {(data.buyerName || data.buyerPhone) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">{data.buyerName ?? "—"}</Typography>
              <Typography variant="body2" color="text.secondary">{data.buyerPhone ?? "—"}</Typography>
            </Box>
          )}

          {data.documents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Історія резервів і продажів не знайдена
            </Typography>
          ) : (
            <DataTable minWidth={480}>
              <TableHead>
                <TableRow>
                  <TableCell>Документ</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Дія</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.documents.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{d.number}</TableCell>
                    <TableCell>{documentTypeLabels[d.type as keyof typeof documentTypeLabels]}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={documentStatusLabels[d.status as keyof typeof documentStatusLabels]}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/documents/${d.id}`} size="small">
                        Відкрити
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </>
      )}
    </ContentCard>
  );
}
