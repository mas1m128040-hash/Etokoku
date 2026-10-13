import { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { orderService } from '../services/orderService';
import { audioEngine } from '../lib/audioEngine';
import { useSoundStore } from '../store/soundStore';
import { useAuth } from './useAuth';

export function useNewOrderAlarm() {
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [isAlarmSounding, setIsAlarmSounding] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const {
    soundEnabled,
    volume,
    isCurrentlyMuted,
    isAudioContextActive,
    setAudioContextActive,
  } = useSoundStore();

  const { profile } = useAuth();
  const prevCountRef = useRef<number>(0);
  const originalTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title : 'SMART RESTAURANT ORDER SYSTEM'
  );
  const titleFlashIntervalRef = useRef<number | null>(null);

  // 1. Subscribe to BARU orders realtime
  useEffect(() => {
    const unsubscribe = orderService.subscribeNewOrders((orders) => {
      setNewOrders(orders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Sound state synchronization: derived from data!
  useEffect(() => {
    const hasNewOrders = newOrders.length > 0;
    const isMuted = isCurrentlyMuted();

    // Check AudioContext state
    const isCtxRunning = audioEngine.isContextRunning();
    setAudioContextActive(isCtxRunning);

    if (hasNewOrders && soundEnabled && !isMuted && isCtxRunning) {
      setIsAlarmSounding(true);
      audioEngine.setVolume(volume);
      audioEngine.startRepeatingNewOrderAlarm();
    } else {
      setIsAlarmSounding(false);
      audioEngine.stopRepeatingNewOrderAlarm();
    }

    // 3. Tab title flashing
    if (hasNewOrders) {
      if (!titleFlashIntervalRef.current) {
        let toggle = false;
        titleFlashIntervalRef.current = window.setInterval(() => {
          toggle = !toggle;
          document.title = toggle
            ? `(${newOrders.length}) PESANAN BARU MASUK!`
            : `🔔 RESTO NOTIFIKASI (${newOrders.length})`;
        }, 1000);
      }
    } else {
      if (titleFlashIntervalRef.current) {
        clearInterval(titleFlashIntervalRef.current);
        titleFlashIntervalRef.current = null;
      }
      document.title = originalTitleRef.current;
    }

    prevCountRef.current = newOrders.length;

    return () => {
      audioEngine.stopRepeatingNewOrderAlarm();
      if (titleFlashIntervalRef.current) {
        clearInterval(titleFlashIntervalRef.current);
        titleFlashIntervalRef.current = null;
      }
    };
  }, [
    newOrders.length,
    soundEnabled,
    volume,
    isCurrentlyMuted,
    isAudioContextActive,
    setAudioContextActive,
  ]);

  const acceptSingleOrder = async (orderId: string) => {
    if (!profile) return;
    await orderService.updateStatusInTransaction(
      orderId,
      'BARU',
      'DITERIMA',
      {
        uid: profile.id,
        name: profile.name,
      }
    );
  };

  const acceptAllNewOrders = async () => {
    if (!profile) return;
    await orderService.acceptAllNewOrders(newOrders, {
      uid: profile.id,
      name: profile.name,
    });
  };

  return {
    newOrders,
    hasNewOrders: newOrders.length > 0,
    newOrdersCount: newOrders.length,
    isAlarmSounding,
    loading,
    acceptSingleOrder,
    acceptAllNewOrders,
  };
}
