import React, { useState } from 'react';
import {
  Clock,
  User,
  MapPin,
  FileText,
  AlertCircle,
  History,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Order } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from './StatusBadge';
import { Modal } from '../ui/Modal';
import {
  formatRupiah,
  formatTimeJakarta,
  formatDateTimeJakarta,
} from '../../lib/formatters';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (
    orderId: string,
    currentStatus: Order['status'],
    nextStatus: Order['status'],
    cancelReason?: string
  ) => Promise<void>;
  isProcessing?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onUpdateStatus,
  isProcessing = false,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isBaru = order.status === 'BARU';
  const isDiterima = order.status === 'DITERIMA';
  const canCancel = isBaru || isDiterima;

  const handleTerimaPesanan = async () => {
    setActionLoading(true);
    try {
      await onUpdateStatus(order.id, 'BARU', 'DITERIMA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelesaikanPesanan = async () => {
    setActionLoading(true);
    try {
      await onUpdateStatus(order.id, 'DITERIMA', 'SELESAI');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setActionLoading(true);
    try {
      await onUpdateStatus(
        order.id,
        order.status,
        'DIBATALKAN',
        cancelReasonInput.trim() || 'Dibatalkan oleh admin'
      );
      setShowCancelModal(false);
      setCancelReasonInput('');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Card
        className={`overflow-hidden transition-all duration-200 ${
          isBaru
            ? 'ring-2 ring-[#FF6B1A] bg-orange-50/20 dark:bg-orange-950/10 shadow-lg'
            : isDiterima
            ? 'border-blue-300 dark:border-blue-900 shadow-sm'
            : ''
        }`}
      >
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-stone-900 dark:text-white">
              #{order.orderCode}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold">
              <MapPin className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Meja {order.tableNumber}</span>
            </div>
          </div>

          <StatusBadge status={order.status} size="sm" />
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Customer & Timestamp row */}
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5 font-medium truncate max-w-[60%]">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatTimeJakarta(order.createdAt)} WIB</span>
            </div>
          </div>

          {/* Items breakdown list */}
          <div className="space-y-2 bg-stone-50 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-100 dark:border-stone-800/60">
            {order.items.map((item, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <span className="text-[#FF6B1A] font-bold min-w-[24px]">
                      {item.qty}x
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-mono shrink-0">
                    {formatRupiah(item.price * item.qty)}
                  </span>
                </div>
                {item.note && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 pl-7 italic mt-0.5">
                    "{item.note}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* General Order Notes */}
          {order.notes && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <FileText className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-bold">Catatan: </span>
                {order.notes}
              </div>
            </div>
          )}

          {/* Total Price */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
            <div>
              <p className="text-xs text-stone-400">Total Pesanan</p>
              <p className="text-base sm:text-lg font-black font-mono text-[#FF6B1A]">
                {formatRupiah(order.totalPrice)}
              </p>
            </div>
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="p-3 sm:p-4 bg-stone-50/80 dark:bg-stone-900/80 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
          {/* History Details Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition-colors"
            title="Lihat riwayat waktu status"
            aria-label="Lihat riwayat waktu status"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Primary Action Button */}
          {isBaru ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={actionLoading || isProcessing}
              onClick={handleTerimaPesanan}
              icon={<Check className="w-4 h-4" />}
              className="animate-pulse"
            >
              Terima Pesanan
            </Button>
          ) : isDiterima ? (
            <Button
              variant="success"
              size="md"
              fullWidth
              loading={actionLoading || isProcessing}
              onClick={handleSelesaikanPesanan}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Selesai (1 Ketuk)
            </Button>
          ) : (
            <div className="flex-1 text-center text-xs font-semibold text-stone-400">
              Pesanan {order.status === 'SELESAI' ? 'Telah Selesai' : 'Dibatalkan'}
            </div>
          )}

          {/* Cancel button if allowed */}
          {canCancel && (
            <Button
              variant="danger"
              size="md"
              onClick={() => setShowCancelModal(true)}
              className="shrink-0 px-3"
              aria-label="Batalkan pesanan"
              title="Batalkan Pesanan"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Riwayat Pesanan #${order.orderCode}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Pelanggan:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {order.customerName} (Meja {order.tableNumber})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">ID Dokumen:</span>
              <span className="font-mono text-stone-600 dark:text-stone-400">
                {order.id}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="font-medium text-stone-600 dark:text-stone-300">
                Waktu Masuk (BARU):
              </span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {formatDateTimeJakarta(order.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  Diterima Admin:
                </span>
                {order.acceptedBy && (
                  <p className="text-[10px] text-stone-400">
                    Oleh: {order.acceptedBy.name}
                  </p>
                )}
              </div>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {formatDateTimeJakarta(order.acceptedAt)}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-stone-100 dark:border-stone-800">
              <span className="font-medium text-stone-600 dark:text-stone-300">
                Selesai (SELESAI):
              </span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {formatDateTimeJakarta(order.completedAt)}
              </span>
            </div>

            {order.cancelledAt && (
              <div className="flex justify-between items-center py-1.5 text-red-600 dark:text-red-400">
                <div>
                  <span className="font-medium">Dibatalkan:</span>
                  {order.cancelReason && (
                    <p className="text-[10px]">{order.cancelReason}</p>
                  )}
                </div>
                <span className="font-mono font-bold">
                  {formatDateTimeJakarta(order.cancelledAt)}
                </span>
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setShowHistoryModal(false)}
          >
            Tutup
          </Button>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Konfirmasi Pembatalan Pesanan"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <p>
              Apakah Anda yakin ingin membatalkan pesanan #{order.orderCode} untuk
              Meja {order.tableNumber}? Tindakan ini tidak dapat diurungkan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Alasan Pembatalan (Opsional):
            </label>
            <input
              type="text"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="Contoh: Bahan habis, pelanggan membatalkan..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowCancelModal(false)}
            >
              Kembali
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={actionLoading}
              onClick={handleConfirmCancel}
            >
              Ya, Batalkan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
