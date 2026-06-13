import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { api } from "../api/client";
import { AddButton, PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import type { Brand, Category, Supplier } from "../types";

type DirType = "categories" | "brands" | "suppliers";

function apiErrorMessage(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? fallback;
}

export function DirectoriesPage() {
  const [tab, setTab] = useState<DirType>("categories");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", contactPhone: "", contactEmail: "", address: "" });
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => api.get<Category[]>("/directories/categories").then((r) => r.data) });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: () => api.get<Brand[]>("/directories/brands").then((r) => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => api.get<Supplier[]>("/directories/suppliers").then((r) => r.data) });

  const save = useMutation({
    mutationFn: async () => {
      if (tab === "categories") {
        const body = { name: form.name, description: form.description || undefined };
        if (editId) return api.put(`/directories/categories/${editId}`, body);
        return api.post("/directories/categories", body);
      }
      if (tab === "brands") {
        const body = { name: form.name };
        if (editId) return api.put(`/directories/brands/${editId}`, body);
        return api.post("/directories/brands", body);
      }
      const body = { name: form.name, contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined, address: form.address || undefined };
      if (editId) return api.put(`/directories/suppliers/${editId}`, body);
      return api.post("/directories/suppliers", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tab] });
      setOpen(false);
      setEditId(null);
      setForm({ name: "", description: "", contactPhone: "", contactEmail: "", address: "" });
    },
    onError: () => setError("Не вдалося зберегти"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/directories/${tab}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tab] });
      setError("");
    },
    onError: (e) => setError(apiErrorMessage(e, "Не вдалося видалити")),
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "", contactPhone: "", contactEmail: "", address: "" });
    setError("");
    setOpen(true);
  };

  const openEdit = (item: Category | Brand | Supplier) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: "description" in item ? (item.description ?? "") : "",
      contactPhone: "contactPhone" in item ? (item.contactPhone ?? "") : "",
      contactEmail: "contactEmail" in item ? (item.contactEmail ?? "") : "",
      address: "address" in item ? (item.address ?? "") : "",
    });
    setError("");
    setOpen(true);
  };

  const titles: Record<DirType, string> = { categories: "Категорії", brands: "Бренди", suppliers: "Постачальники" };
  const rows = tab === "categories" ? categories : tab === "brands" ? brands : suppliers;

  return (
    <Box>
      <PageHeader title="Довідники" subtitle="Категорії, бренди та постачальники" action={<AddButton label="Додати" onClick={openCreate} />} />

      {error && !open && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(""); }} sx={{ mb: 2, bgcolor: "background.paper", borderRadius: 2, px: 1 }}>
        <Tab value="categories" label="Категорії" />
        <Tab value="brands" label="Бренди" />
        <Tab value="suppliers" label="Постачальники" />
      </Tabs>

      <DataTable minWidth={480}>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              {tab === "categories" && <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Опис</TableCell>}
              {tab === "suppliers" && <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Телефон</TableCell>}
              {tab === "suppliers" && <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Email</TableCell>}
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!rows?.length ? (
              <TableRow>
                <TableCell colSpan={tab === "suppliers" ? 4 : tab === "categories" ? 3 : 2} sx={{ p: 0, border: 0 }}>
                  <EmptyState title={`Немає записів у «${titles[tab]}»`} description="Натисніть «Додати», щоб створити перший запис" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                {tab === "categories" && (
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{(item as Category).description ?? "—"}</TableCell>
                )}
                {tab === "suppliers" && (
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{(item as Supplier).contactPhone ?? "—"}</TableCell>
                )}
                {tab === "suppliers" && (
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>{(item as Supplier).contactEmail ?? "—"}</TableCell>
                )}
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(item)}><EditIcon /></IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm(`Видалити «${item.name}»?`)) remove.mutate(item.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Редагувати" : "Додати"} — {titles[tab]}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Назва" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {tab === "categories" && <TextField label="Опис" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline />}
          {tab === "suppliers" && (
            <>
              <TextField label="Телефон" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              <TextField label="Email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <TextField label="Адреса" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => save.mutate()} disabled={!form.name.trim()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
