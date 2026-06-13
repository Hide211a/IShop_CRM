import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import type { DocumentListItem, DocumentStatus, DocumentType } from "../types";
import { documentStatusLabels, documentTypeLabels } from "../utils/labels";

const statusColor: Record<string, "default" | "success" | "warning"> = {
  DRAFT: "warning",
  POSTED: "success",
  CANCELLED: "default",
};

const createTypes: DocumentType[] = ["RECEIPT", "EXPENSE", "INVENTORY", "RESERVATION"];

export function DocumentsPage() {
  const [urlParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">(
    (urlParams.get("type") as DocumentType) || "",
  );
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "">(
    (urlParams.get("status") as DocumentStatus) || "",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents", typeFilter, statusFilter, from, to, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (search.trim()) params.set("q", search.trim());
      const { data } = await api.get<DocumentListItem[]>(`/documents?${params}`);
      return data;
    },
  });

  return (
    <Box>
      <PageHeader
        title="Документи руху"
        subtitle="Надходження, витрата, інвентаризація, резерв"
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {createTypes.map((t) => (
              <Button key={t} component={Link} to={`/documents/new?type=${t}`} variant="outlined" size="small">
                + {documentTypeLabels[t]}
              </Button>
            ))}
          </Box>
        }
      />

      <FilterBar>
        <TextField
          label="Пошук (номер, покупець, телефон)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          type="date"
          label="З"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          label="По"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControl>
          <InputLabel>Тип</InputLabel>
          <Select value={typeFilter} label="Тип" onChange={(e) => setTypeFilter(e.target.value as DocumentType | "")}>
            <MenuItem value="">Усі</MenuItem>
            {createTypes.map((t) => <MenuItem key={t} value={t}>{documentTypeLabels[t]}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel>Статус</InputLabel>
          <Select value={statusFilter} label="Статус" onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | "")}>
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="DRAFT">Чернетка</MenuItem>
            <MenuItem value="POSTED">Проведено</MenuItem>
            <MenuItem value="CANCELLED">Скасовано</MenuItem>
          </Select>
        </FormControl>
      </FilterBar>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Не вдалося завантажити документи</Alert>}

      {isLoading ? (
        <LoadingState />
      ) : !data?.length ? (
        <EmptyState title="Документів не знайдено" description="Спробуйте змінити фільтри або створіть новий документ" />
      ) : (
        <DataTable minWidth={800}>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Покупець</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Автор</TableCell>
              <TableCell align="right">Дія</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{doc.number}</TableCell>
                <TableCell>{documentTypeLabels[doc.type]}</TableCell>
                <TableCell>
                  <Chip label={documentStatusLabels[doc.status]} color={statusColor[doc.status]} size="small" />
                </TableCell>
                <TableCell>{new Date(doc.date).toLocaleDateString("uk-UA")}</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{doc.buyerName ?? "—"}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{doc.createdBy?.fullName ?? "—"}</TableCell>
                <TableCell align="right">
                  <Button component={Link} to={`/documents/${doc.id}`} size="small">Відкрити</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
