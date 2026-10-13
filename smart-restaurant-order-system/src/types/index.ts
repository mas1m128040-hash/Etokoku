export type UserRole = 'ADMIN';

export interface UserProfile {
  id: string; // Auth UID
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: any;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface Menu {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export type OrderStatus = 'BARU' | 'DITERIMA' | 'SELESAI' | 'DIBATALKAN';

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
}

export interface OrderAcceptedBy {
  uid: string;
  name: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  orderCode: string; // "001"
  dateKey: string; // "YYYY-MM-DD"
  customerName: string;
  tableNumber: string;
  items: OrderItem[];
  totalPrice: number;
  notes?: string;
  status: OrderStatus;
  cancelReason?: string;
  createdAt: any;
  acceptedAt?: any;
  completedAt?: any;
  cancelledAt?: any;
  acceptedBy?: OrderAcceptedBy;
  updatedAt?: any;
}

export interface Counter {
  lastNumber: number;
}

export interface Settings {
  name: string;
  totalTables: number;
  timezone: string;
  orderCooldownSeconds: number;
}

export interface CartItem extends OrderItem {
  maxQty?: number;
}
