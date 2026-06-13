import type { DocumentStatus, DocumentType, Role } from "../types";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Адміністратор",
  MANAGER: "Менеджер",
  DIRECTOR: "Директор",
};

export const documentTypeLabels: Record<DocumentType, string> = {
  RECEIPT: "Надходження",
  EXPENSE: "Витрата / продаж",
  INVENTORY: "Інвентаризація",
  RESERVATION: "Резерв",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  DRAFT: "Чернетка",
  POSTED: "Проведено",
  CANCELLED: "Скасовано",
};
