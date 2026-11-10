'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CartItem, ProductFilter } from '@sirlawglobal/contracts';
import * as api from '@/lib/api';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.getCategories });
export const useBanners = () => useQuery({ queryKey: ['banners'], queryFn: api.getBanners });
export const useProducts = (filter: Partial<ProductFilter>) =>
  useQuery({ queryKey: ['products', filter], queryFn: () => api.listProducts(filter), placeholderData: keepPreviousData });
export const useProduct = (slug: string) => useQuery({ queryKey: ['product', slug], queryFn: () => api.getProductBySlug(slug) });
export const useRelated = (id?: string) =>
  useQuery({ queryKey: ['related', id], queryFn: () => api.getRelatedProducts(id as string), enabled: !!id });
export const useCartPricing = (items: CartItem[], promo?: string, deliveryFee?: number) =>
  useQuery({
    queryKey: ['cart-pricing', items, promo, deliveryFee],
    queryFn: () => api.priceCart(items, promo, deliveryFee),
    placeholderData: keepPreviousData,
  });
export const useDeliveryZones = () => useQuery({ queryKey: ['zones'], queryFn: api.getDeliveryZones });
export const useSuggestions = (q: string) =>
  useQuery({ queryKey: ['suggest', q], queryFn: () => api.getSuggestions(q), enabled: q.trim().length >= 2, staleTime: 30_000 });
export const useProductsByIds = (ids: string[]) =>
  useQuery({ queryKey: ['by-ids', ids], queryFn: () => api.getProductsByIds(ids), enabled: ids.length > 0 });
