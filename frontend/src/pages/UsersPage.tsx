import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { api } from "../api/client";
import { AddButton, PageHeader } from "../components/PageHeader";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import type { Role, User } from "../types";
import { roleLabels } from "../utils/labels";

const roles: Role[] = ["ADMIN", "MANAGER", "DIRECTOR"];

function apiErrorMessage(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } } };
  return err.response?.data?.message ?? fallback;
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "MANAGER" as Role, active: true });
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: () => {
      if (editUser) return api.put(`/users/${editUser.id}`, form);
      return api.post("/users", form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditUser(null);
    },
    onError: (e) => setError(apiErrorMessage(e, "Не вдалося зберегти користувача")),
  });

  const isSelf = editUser?.id === currentUser?.id;

  return (
    <Box>
      <PageHeader title="Користувачі" action={<AddButton label="Додати" onClick={() => { setEditUser(null); setForm({ email: "", password: "", fullName: "", role: "MANAGER", active: true }); setOpen(true); }} />} />

      <DataTable minWidth={560}>
        <TableHead>
          <TableRow>
            <TableCell>ПІБ</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Email</TableCell>
            <TableCell>Роль</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дії</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>Завантаження...</TableCell></TableRow>
          ) : !data?.length ? (
            <TableRow>
              <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                <EmptyState title="Немає користувачів" description="Додайте першого користувача системи" />
              </TableCell>
            </TableRow>
          ) : (
            data.map((u) => (
            <TableRow key={u.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{u.fullName}</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{u.email}</TableCell>
              <TableCell>{roleLabels[u.role]}</TableCell>
              <TableCell><Chip size="small" label={u.active !== false ? "Активний" : "Неактивний"} color={u.active !== false ? "success" : "default"} /></TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => { setEditUser(u); setForm({ email: u.email, password: "", fullName: u.fullName, role: u.role, active: u.active !== false }); setOpen(true); }}>
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? "Редагувати" : "Новий користувач"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="ПІБ" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField
            label={editUser ? "Новий пароль (опційно)" : "Пароль"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            helperText={editUser ? "Залиште порожнім, щоб не змінювати пароль" : "Мінімум 6 символів"}
          />
          <FormControl>
            <InputLabel>Роль</InputLabel>
            <Select value={form.role} label="Роль" onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {roles.map((r) => <MenuItem key={r} value={r}>{roleLabels[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                disabled={isSelf}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            }
            label="Активний обліковий запис"
          />
          {isSelf && (
            <Typography variant="caption" color="text.secondary">
              Не можна деактивувати власний акаунт
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={() => save.mutate()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
