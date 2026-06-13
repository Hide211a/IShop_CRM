export type Role = "ADMIN" | "MANAGER" | "DIRECTOR";

export type DocumentType = "RECEIPT" | "EXPENSE" | "INVENTORY" | "RESERVATION";
export type DocumentStatus = "DRAFT" | "POSTED" | "CANCELLED";
export type SerialStatus = "IN_STOCK" | "SOLD" | "RESERVED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId: string;
  brandId: string;
  purchasePrice: string;
  salePrice: string;
  minStock: number;
  trackSerial: boolean;
  active: boolean;
  category?: Category;
  brand?: Brand;
  stockBalance?: { quantity: number } | null;
}

export interface ProductSerial {
  id: string;
  productId: string;
  imei: string;
  status: SerialStatus;
}

export interface StockBalanceRow {
  productId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  minStock: number;
  quantity: number;
  isLow: boolean;
}

export interface DocumentLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product?: Product;
}

export interface DocumentDetail {
  id: string;
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  notes?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  supplierId?: string | null;
  supplier?: Supplier | null;
  postedAt?: string | null;
  createdBy?: { fullName: string; email?: string };
  lines: DocumentLine[];
  serials?: ProductSerial[];
}

export interface DocumentListItem {
  id: string;
  number: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  notes?: string | null;
  buyerName?: string | null;
  postedAt?: string | null;
  createdBy?: { fullName: string };
  _count?: { lines: number };
}

export interface DashboardSummary {
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  lowStock: Array<Product & { quantity: number }>;
  postedDocumentsThisMonth: number;
  salesThisMonth: number;
  recentDocuments: DocumentListItem[];
}

export interface LineSerialPost {
  lineId: string;
  imeis?: string[];
  serialIds?: string[];
}
