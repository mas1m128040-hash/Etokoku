import { useState, useEffect, useMemo, useCallback } from 'react';
import { Order } from '../types';
import { orderService } from '../services/orderService';
import { getDateKeyJakarta } from '../lib/formatters';

export function useTodayOrders(customDateKey?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const dateKey = customDateKey || getDateKeyJakarta(new Date());

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = orderService.subscribeTodayOrders(
      dateKey,
      (list) => {
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dateKey, retryTrigger]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' || order.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        order.orderCode.includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.tableNumber.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [orders, statusFilter, searchQuery]);

  // Key metrics: Total Hari Ini, Baru, Diterima, Selesai
  const stats = useMemo(() => {
    const total = orders.length;
    const baru = orders.filter((o) => o.status === 'BARU').length;
    const diterima = orders.filter((o) => o.status === 'DITERIMA').length;
    const selesai = orders.filter((o) => o.status === 'SELESAI').length;
    const dibatalkan = orders.filter((o) => o.status === 'DIBATALKAN').length;

    const totalRevenue = orders
      .filter((o) => o.status !== 'DIBATALKAN')
      .reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      total,
      baru,
      diterima,
      selesai,
      dibatalkan,
      totalRevenue,
    };
  }, [orders]);

  return {
    orders,
    filteredOrders,
    loading,
    error,
    retry,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    stats,
    dateKey,
  };
}
