import { Settings, OrderStatus, UserRole } from '../types';

export const TIMEZONE_JAKARTA = 'Asia/Jakarta';

export const DEFAULT_SETTINGS: Settings = {
  name: 'Resto Rasa Nusantara',
  totalTables: 20,
  timezone: TIMEZONE_JAKARTA,
  orderCooldownSeconds: 30,
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  BARU: 'BARU',
  DITERIMA: 'DITERIMA',
  SELESAI: 'SELESAI',
  DIBATALKAN: 'DIBATALKAN',
};

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  { bg: string; text: string; border: string; badge: string }
> = {
  BARU: {
    bg: 'bg-orange-500/10',
    text: 'text-[#FF6B1A]',
    border: 'border-[#FF6B1A]',
    badge: 'bg-[#FF6B1A] text-white animate-pulse',
  },
  DITERIMA: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500',
    badge: 'bg-blue-600 text-white',
  },
  SELESAI: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    badge: 'bg-emerald-600 text-white',
  },
  DIBATALKAN: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500',
    badge: 'bg-red-600 text-white',
  },
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
};

export const STORAGE_KEYS = {
  CART: 'smart_resto_cart',
  SOUND_ENABLED: 'smart_resto_sound_enabled',
  SOUND_VOLUME: 'smart_resto_sound_volume',
  SOUND_MUTED_UNTIL: 'smart_resto_sound_muted_until',
  ACTIVE_ORDER_ID: 'smart_resto_active_order_id',
  LAST_ORDER_TIMESTAMP: 'smart_resto_last_order_ts',
  SAVED_TABLE: 'smart_resto_table_number',
  SAVED_NAME: 'smart_resto_customer_name',
  THEME: 'smart_resto_theme',
};
