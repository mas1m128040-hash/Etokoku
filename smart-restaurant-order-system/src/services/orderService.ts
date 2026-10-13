import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Order,
  OrderItem,
  OrderStatus,
} from '../types';
import { getDateKeyJakarta, formatOrderCode } from '../lib/formatters';
import { isValidStatusTransition } from '../lib/statusRules';

const ORDERS_COL = 'orders';
const COUNTERS_COL = 'counters';

export interface CreateOrderParams {
  customerName: string;
  tableNumber: string;
  items: OrderItem[];
  notes?: string;
}

export const orderService = {
  /**
   * Atomic checkout transaction on real Firestore:
   * 1. Reads counters/{dateKey}
   * 2. Increments lastNumber by 1
   * 3. Creates new order document with orderNumber and 3-digit orderCode
   * 4. Updates counters/{dateKey}
   * Ensures no two simultaneous checkouts produce duplicate order numbers.
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const dateKey = getDateKeyJakarta(new Date());
    const counterRef = doc(db, COUNTERS_COL, dateKey);
    const orderRef = doc(collection(db, ORDERS_COL));

    // Validate params
    if (!params.customerName.trim()) {
      throw new Error('Nama pelanggan wajib diisi.');
    }
    if (!params.tableNumber.trim()) {
      throw new Error('Nomor meja wajib dipilih.');
    }
    if (!params.items || params.items.length === 0) {
      throw new Error('Keranjang belanja kosong.');
    }
    if (params.items.length > 30) {
      throw new Error('Maksimal 30 jenis menu per pesanan.');
    }

    const calculatedTotal = params.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const createdOrder = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      let nextNumber = 1;
      if (counterSnap.exists()) {
        const currentLast = counterSnap.data().lastNumber;
        if (typeof currentLast === 'number') {
          nextNumber = currentLast + 1;
        }
      }

      const orderCode = formatOrderCode(nextNumber);

      const newOrderPayload: Omit<Order, 'id'> = {
        orderNumber: nextNumber,
        orderCode,
        dateKey,
        customerName: params.customerName.trim().slice(0, 50),
        tableNumber: params.tableNumber.trim(),
        items: params.items.map((i) => ({
          menuId: i.menuId,
          name: i.name,
          price: i.price,
          qty: Math.min(20, Math.max(1, i.qty)),
          note: (i.note || '').slice(0, 100),
        })),
        totalPrice: calculatedTotal,
        notes: (params.notes || '').slice(0, 300),
        status: 'BARU',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      tx.set(orderRef, newOrderPayload);

      return {
        id: orderRef.id,
        ...newOrderPayload,
      } as Order;
    });

    return createdOrder;
  },

  /**
   * Atomic status update with optimistic lock check on real Firestore.
   */
  async updateStatusInTransaction(
    orderId: string,
    expectedCurrentStatus: OrderStatus,
    targetStatus: OrderStatus,
    staffUser: { uid: string; name: string },
    cancelReason?: string
  ): Promise<void> {
    if (!isValidStatusTransition(expectedCurrentStatus, targetStatus)) {
      throw new Error(
        `Tidak memiliki izin untuk mengubah status dari ${expectedCurrentStatus} ke ${targetStatus}.`
      );
    }

    const orderRef = doc(db, ORDERS_COL, orderId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) {
        throw new Error('Pesanan tidak ditemukan.');
      }

      const current = snap.data() as Order;
      if (current.status !== expectedCurrentStatus) {
        const who = current.acceptedBy?.name || 'admin';
        throw new Error(
          `Pesanan sudah diubah menjadi "${current.status}" oleh ${who}.`
        );
      }

      const updateData: any = {
        status: targetStatus,
        updatedAt: serverTimestamp(),
      };

      if (targetStatus === 'DITERIMA') {
        updateData.acceptedAt = serverTimestamp();
        updateData.acceptedBy = { uid: staffUser.uid, name: staffUser.name };
      } else if (targetStatus === 'SELESAI') {
        updateData.completedAt = serverTimestamp();
      } else if (targetStatus === 'DIBATALKAN') {
        updateData.cancelledAt = serverTimestamp();
        if (cancelReason) {
          updateData.cancelReason = cancelReason.slice(0, 200);
        }
      }

      tx.update(orderRef, updateData);
    });
  },

  async acceptAllNewOrders(
    orders: Order[],
    staffUser: { uid: string; name: string }
  ): Promise<void> {
    for (const order of orders) {
      if (order.status === 'BARU') {
        try {
          await this.updateStatusInTransaction(
            order.id,
            'BARU',
            'DITERIMA',
            staffUser
          );
        } catch (err) {
          console.error('[Firestore Error] Gagal menerima order:', order.id, err);
        }
      }
    }
  },

  async completeAllAcceptedOrders(
    orders: Order[],
    staffUser: { uid: string; name: string }
  ): Promise<void> {
    for (const order of orders) {
      if (order.status === 'DITERIMA') {
        try {
          await this.updateStatusInTransaction(
            order.id,
            'DITERIMA',
            'SELESAI',
            staffUser
          );
        } catch (err) {
          console.error('[Firestore Error] Gagal menyelesaikan order:', order.id, err);
        }
      }
    }
  },

  /**
   * Realtime listener for today's orders from Firestore
   */
  subscribeTodayOrders(
    dateKey: string,
    callback: (orders: Order[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, ORDERS_COL),
      where('dateKey', '==', dateKey)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];

        // Sort in memory to avoid missing index
        orders.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        callback(orders);
      },
      (error) => {
        console.error('[Firestore Error] Gagal memuat orders hari ini:', error.code, error.message);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Realtime listener for BARU orders for audio alarm & popup
   */
  subscribeNewOrders(
    callback: (orders: Order[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, ORDERS_COL),
      where('status', '==', 'BARU')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];

        orders.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeA - timeB; // oldest first
        });

        callback(orders);
      },
      (error) => {
        console.error('[Firestore Error] Gagal memuat pesanan baru:', error.code, error.message);
        if (onError) onError(error);
      }
    );
  },
};
