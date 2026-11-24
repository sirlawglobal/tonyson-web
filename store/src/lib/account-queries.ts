'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationPreferences } from '@sirlawglobal/contracts';
import * as account from '@/lib/api/account';
import * as authApi from '@/lib/api/auth';

export const useMyOrders = () => useQuery({ queryKey: ['my-orders'], queryFn: account.listMyOrders });
export const useMyOrder = (id: string) => useQuery({ queryKey: ['my-order', id], queryFn: () => account.getMyOrder(id) });
export const useAddresses = () => useQuery({ queryKey: ['addresses'], queryFn: account.listAddresses });
export const useRewards = () => useQuery({ queryKey: ['rewards'], queryFn: account.getRewards });
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: account.listNotifications });
export const usePreferences = () => useQuery({ queryKey: ['notif-prefs'], queryFn: account.getPreferences });

export function useAddressMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['addresses'] });
  return {
    save: useMutation({ mutationFn: account.saveAddress, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: account.deleteAddress, onSuccess: invalidate }),
    makeDefault: useMutation({ mutationFn: account.setDefaultAddress, onSuccess: invalidate }),
  };
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { ids: string[] | 'all'; read?: boolean }) => account.markNotifications(v.ids, v.read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: NotificationPreferences) => account.savePreferences(p),
    onSuccess: (p) => qc.setQueryData(['notif-prefs'], p),
  });
}

export const useUpdateProfile = () => useMutation({ mutationFn: authApi.updateProfile });

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => account.cancelOrder(id),
    onSuccess: () => Promise.all(['my-orders', 'my-order', 'rewards'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}
