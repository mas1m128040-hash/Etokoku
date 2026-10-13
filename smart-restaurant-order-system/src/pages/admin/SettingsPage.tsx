import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Save,
  Sparkles,
  Database,
  Store,
  Play,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { seedService } from '../../services/seedService';
import { audioEngine } from '../../lib/audioEngine';
import { useSoundStore } from '../../store/soundStore';
import { useUiStore } from '../../store/uiStore';
import { AppShell } from '../../components/layout/AppShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FirebaseErrorCard } from '../../components/ui/FirebaseErrorCard';
import { Settings } from '../../types';
import { DEFAULT_SETTINGS } from '../../config/constants';

export const SettingsPage: React.FC = () => {
  const { soundEnabled, setSoundEnabled, volume, setVolume, activateAudio } =
    useSoundStore();
  const { addToast } = useUiStore();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const s = await settingsService.getSettings();
      setSettings(s);
    } catch (err: any) {
      console.error('[Firestore Error] Gagal memuat settings restoran:', err);
      setFetchError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      addToast('success', 'Pengaturan restoran berhasil disimpan.');
    } catch (err: any) {
      addToast('error', err?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSound = async () => {
    await activateAudio();
    audioEngine.playTwoToneAlarmOnce(volume);
    addToast('info', `Tes suara diputar pada volume ${volume}%.`);
  };

  const handleSeedDatabase = async () => {
    if (
      !confirm(
        'Isi basis data dengan 8 menu favorit, 3 kategori, dan setelan awal?'
      )
    )
      return;
    setSeeding(true);
    try {
      const res = await seedService.seedInitialRestaurantData();
      addToast(
        'success',
        `Data awal berhasil dimuat (${res.menus} menu & ${res.categories} kategori).`
      );
    } catch (err: any) {
      addToast('error', err?.message || 'Gagal mengisi data.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AppShell title="PENGATURAN RESTORAN & SUARA">
      <div className="space-y-6 max-w-4xl">
        {fetchError && (
          <FirebaseErrorCard
            title="Gagal Memuat Pengaturan Restoran"
            error={fetchError}
            onRetry={loadSettings}
          />
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Restaurant Profile Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100 dark:border-stone-800">
              <Store className="w-5 h-5 text-[#FF6B1A]" />
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Profil Meja & Restoran
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Nama Restoran
                </label>
                <input
                  type="text"
                  required
                  value={settings.name}
                  onChange={(e) =>
                    setSettings({ ...settings, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Jumlah Meja Pelanggan
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={200}
                  value={settings.totalTables}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      totalTables: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white"
                />
                <span className="text-[10px] text-stone-400">
                  Digunakan untuk opsi cetak QR Meja
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Jeda Antar Pesanan Pelanggan (Detik Cooldown)
                </label>
                <input
                  type="number"
                  required
                  min={5}
                  max={300}
                  value={settings.orderCooldownSeconds}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      orderCooldownSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white"
                />
                <span className="text-[10px] text-stone-400">
                  Mencegah spam order dari meja yang sama berturut-turut
                </span>
              </div>
            </div>
          </Card>

          {/* Sound & Alarm Tester Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100 dark:border-stone-800">
              <Volume2 className="w-5 h-5 text-[#FF6B1A]" />
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Sistem Alarm Suara (Web Audio API)
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-stone-800 dark:text-stone-200">
                    Status Alarm Suara
                  </p>
                  <p className="text-stone-400 text-[11px]">
                    Memutar lonceng 2-nada otomatis saat ada pesanan baru masuk
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    soundEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}
                >
                  {soundEnabled ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Tingkat Volume: {volume}%
                  </label>
                  <span className="text-[11px] text-stone-400">
                    Tersimpan di perangkat lokal browser
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[#FF6B1A] cursor-pointer"
                />
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestSound}
                  icon={<Play className="w-4 h-4 text-[#FF6B1A]" />}
                >
                  Uji Suara Alarm Pesanan Baru
                </Button>
              </div>
            </div>
          </Card>

          {/* Submit Settings Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              Simpan Perubahan Pengaturan
            </Button>
          </div>
        </form>

        {/* Database Seeder Section */}
        <Card className="p-5 sm:p-6 space-y-4 border-dashed border-stone-300 dark:border-stone-800">
          <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100 dark:border-stone-800">
            <Database className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Inisialisasi Data Awal (Seed)
            </h3>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            Gunakan tombol ini jika basis data Firestore Anda masih kosong atau baru
            pertama kali dibuat. Fitur ini akan otomatis mengisi 8 menu siap saji,
            3 kategori (Makanan, Minuman, Snack), dan data pengaturan awal.
          </p>

          <Button
            type="button"
            variant="secondary"
            loading={seeding}
            onClick={handleSeedDatabase}
            icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          >
            Muat Data Seed Contoh ke Firestore
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};
