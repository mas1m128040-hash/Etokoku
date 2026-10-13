import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  User,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Lock,
  CheckCircle2,
  Utensils,
  PlusCircle,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { orderService } from '../../services/orderService';
import { settingsService } from '../../services/settingsService';
import { menuService } from '../../services/menuService';
import { Settings, Order } from '../../types';
import { formatRupiah } from '../../lib/formatters';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useNow } from '../../hooks/useNow';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    totalQty,
    totalPrice,
    tableNumber,
    customerName,
    setCustomerName,
    orderNotes,
    setOrderNotes,
    clearCart,
    setLastOrderTime,
    getCooldownRemainingSeconds,
  } = useCart();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const now = useNow(1000); // for live countdown calculation

  React.useEffect(() => {
    settingsService
      .getSettings()
      .then(setSettings)
      .catch((err) => console.warn('Pengaturan settings error:', err));
  }, []);

  const cooldownSeconds = settings?.orderCooldownSeconds ?? 30;
  const cooldownRemaining = getCooldownRemainingSeconds(cooldownSeconds);

  // If order was submitted successfully, display "Pesanan Terkirim" screen
  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 pb-16 antialiased flex flex-col justify-between">
        <div className="max-w-xl mx-auto p-4 w-full pt-10">
          <Card className="p-8 text-center bg-white border border-stone-200 shadow-xl rounded-3xl space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest text-[#FF6B1A] uppercase">
                PESANAN TERKIRIM!
              </span>
              <p className="text-xs text-stone-400">Nomor Antrean Anda</p>
              <h1 className="text-6xl font-black font-mono tracking-tight text-stone-900 pt-1">
                #{submittedOrder.orderCode}
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-100 border border-stone-200 text-sm font-bold text-stone-800">
              <MapPin className="w-4 h-4 text-[#FF6B1A]" />
              <span>Meja {submittedOrder.tableNumber}</span>
              <span className="text-stone-300">•</span>
              <span>{submittedOrder.customerName}</span>
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-stone-800 text-sm font-bold leading-relaxed">
              Mohon tunggu, pesanan Anda sedang disiapkan
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="xl"
                fullWidth
                onClick={() => {
                  navigate(`/menu?table=${submittedOrder.tableNumber}`);
                }}
                icon={<PlusCircle className="w-5 h-5" />}
              >
                Pesan Lagi
              </Button>
            </div>
          </Card>
        </div>

        {/* Persistent Customer Footer with Staff Login Link */}
        <footer className="max-w-xl mx-auto w-full px-4 pt-4 pb-8 text-center">
          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
            <span>{settings?.name || 'Smart Restaurant Order System'}</span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-stone-600 hover:text-[#FF6B1A] bg-stone-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Staf Restoran</span>
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 text-[#FF6B1A] flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Keranjang Masih Kosong</h2>
        <p className="text-sm text-stone-500 max-w-xs mt-1 mb-6">
          Silakan pilih menu makanan dan minuman terlebih dahulu sebelum checkout.
        </p>
        <Link to="/menu">
          <Button variant="primary">Kembali ke Daftar Menu</Button>
        </Link>
      </div>
    );
  }

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Nama pemesan wajib diisi.');
      return;
    }
    if (!tableNumber.trim()) {
      setErrorMessage('Nomor meja wajib dipilih.');
      return;
    }
    if (cooldownRemaining > 0) {
      setErrorMessage(
        `Mohon tunggu ${cooldownRemaining} detik lagi sebelum mengirim pesanan berikutnya.`
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Verify item availability from server
      const currentMenus = await menuService.getMenus();
      const unavailableInCart = items.filter((cartItem) => {
        const found = currentMenus.find((m) => m.id === cartItem.menuId);
        return !found || !found.available;
      });

      if (unavailableInCart.length > 0) {
        const names = unavailableInCart.map((i) => i.name).join(', ');
        throw new Error(
          `Maaf, menu berikut baru saja habis: ${names}. Silakan hapus menu tersebut dari keranjang.`
        );
      }

      // 2. Atomic create order in Firestore
      const newOrder = await orderService.createOrder({
        customerName: customerName.trim(),
        tableNumber: tableNumber.trim(),
        items,
        notes: orderNotes.trim(),
      });

      // 3. Update cooldown and clear cart
      setLastOrderTime(Date.now());
      clearCart();

      // 4. Show success screen "Pesanan Terkirim"
      setSubmittedOrder(newOrder);
    } catch (err: any) {
      console.error('[Create Order Error]', err);
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat mengirim pesanan. Keranjang Anda tetap aman, silakan coba kirim lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-16 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 text-sm font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke Menu</span>
          </Link>
          <span className="text-sm font-black text-stone-900">Konfirmasi Pesanan</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Gagal Mengirim Pesanan</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSendOrder} className="space-y-4">
          {/* Table & Customer Information */}
          <Card className="p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#FF6B1A]" />
              <span>Data Pemesan</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nama Pemesan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF6B1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nomor Meja <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-stone-100 font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#FF6B1A]" />
                  <span>Meja {tableNumber || '-'}</span>
                </div>
                <Link
                  to="/menu"
                  className="text-xs font-bold text-[#FF6B1A] underline px-2"
                >
                  Ubah
                </Link>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Catatan Pesanan Keseluruhan (Maks 300 karakter)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Makanan tolong disajikan bersamaan..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#FF6B1A]"
              />
            </div>
          </Card>

          {/* Items Summary */}
          <Card className="p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center justify-between">
              <span>Ringkasan Menu ({totalQty} Item)</span>
              <Link to="/menu" className="text-xs text-[#FF6B1A] font-bold">
                Tambah Menu
              </Link>
            </h3>

            <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.menuId} className="py-2.5 first:pt-0">
                  <div className="flex justify-between items-start text-sm">
                    <div>
                      <div className="font-semibold text-stone-900">
                        <span className="text-[#FF6B1A] font-bold mr-2">
                          {item.qty}x
                        </span>
                        {item.name}
                      </div>
                      {item.note && (
                        <p className="text-xs text-amber-600 pl-6 italic mt-0.5">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-stone-700">
                      {formatRupiah(item.price * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-stone-500">Total Pembayaran</p>
                <p className="text-xl font-black font-mono text-[#FF6B1A]">
                  {formatRupiah(totalPrice)}
                </p>
              </div>
            </div>
          </Card>

          {/* Submit Action */}
          <div className="pt-2">
            {cooldownRemaining > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-800 text-center justify-center font-bold">
                <Clock className="w-4 h-4 animate-spin" />
                <span>
                  Jeda pemesanan: silakan tunggu {cooldownRemaining} detik lagi
                </span>
              </div>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="xl"
                fullWidth
                loading={loading}
                icon={<Send className="w-5 h-5" />}
              >
                Kirim Pesanan Sekarang
              </Button>
            )}

            <p className="text-[11px] text-stone-400 text-center mt-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pesanan langsung terhubung ke sistem restoran secara realtime</span>
            </p>
          </div>
        </form>
      </main>

      {/* Persistent Customer Footer with Staff Login Link */}
      <footer className="max-w-xl mx-auto w-full px-4 pt-4 pb-8 text-center">
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
          <span>{settings?.name || 'Smart Restaurant Order System'}</span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-bold text-stone-600 hover:text-[#FF6B1A] bg-stone-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Login Staf Restoran</span>
          </Link>
        </div>
      </footer>
    </div>
  );
};
