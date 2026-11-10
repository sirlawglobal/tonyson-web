import {
  BarChart3,
  Bell,
  Boxes,
  CreditCard,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@sirlawglobal/contracts';

export interface NavItem {
  slug: string; // '' = dashboard
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
}

export const NAV: NavItem[] = [
  { slug: '', href: '/', label: 'Dashboard', description: 'Sales, orders and stock at a glance.', icon: LayoutDashboard, permission: 'dashboard.view' },
  { slug: 'orders', href: '/orders', label: 'Orders', description: 'Process and fulfil customer orders.', icon: ShoppingCart, permission: 'orders.read' },
  { slug: 'products', href: '/products', label: 'Products', description: 'Manage the catalogue, pricing and images.', icon: Package, permission: 'products.read' },
  { slug: 'categories', href: '/categories', label: 'Categories', description: 'Organise categories and subcategories.', icon: Tags, permission: 'categories.write' },
  { slug: 'inventory', href: '/inventory', label: 'Inventory', description: 'Stock levels, adjustments and movements.', icon: Boxes, permission: 'inventory.read' },
  { slug: 'customers', href: '/customers', label: 'Customers', description: 'Customer accounts and order history.', icon: Users, permission: 'customers.read' },
  { slug: 'payments', href: '/payments', label: 'Payments', description: 'Transactions, refunds and reconciliation.', icon: CreditCard, permission: 'payments.read' },
  { slug: 'delivery', href: '/delivery', label: 'Delivery', description: 'Zones, fees, riders and assignments.', icon: Truck, permission: 'delivery.read' },
  { slug: 'promotions', href: '/promotions', label: 'Promotions', description: 'Discount codes and offers.', icon: Percent, permission: 'promotions.manage' },
  { slug: 'rewards', href: '/rewards', label: 'Referrals & Rewards', description: 'Referral rules and loyalty ledger.', icon: Gift, permission: 'referrals.manage' },
  { slug: 'campaigns', href: '/campaigns', label: 'Campaigns', description: 'Banners and scheduled campaigns.', icon: Megaphone, permission: 'campaigns.manage' },
  { slug: 'notifications', href: '/notifications', label: 'Notifications', description: 'Compose and track notifications.', icon: Bell, permission: 'notifications.send' },
  { slug: 'staff', href: '/staff', label: 'Staff & Permissions', description: 'Staff accounts, roles and permissions.', icon: ShieldCheck, permission: 'staff.manage' },
  { slug: 'analytics', href: '/analytics', label: 'Analytics', description: 'Reports and trends.', icon: BarChart3, permission: 'analytics.view' },
  { slug: 'settings', href: '/settings', label: 'Settings', description: 'System-wide configuration.', icon: Settings, permission: 'settings.manage' },
  { slug: 'audit-log', href: '/audit-log', label: 'Audit log', description: 'Sensitive administrative actions.', icon: ScrollText, permission: 'audit.view' },
];

export interface NavGroup {
  id: string;
  label: string;
  /** Item slugs, in display order. */
  slugs: string[];
}

/** Sidebar grouping. A group is hidden when the role can see none of its items. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'overview', label: 'Overview', slugs: ['', 'analytics'] },
  { id: 'sales', label: 'Sales', slugs: ['orders', 'payments', 'delivery'] },
  { id: 'catalogue', label: 'Catalogue', slugs: ['products', 'categories', 'inventory'] },
  { id: 'customers', label: 'Customers', slugs: ['customers', 'rewards'] },
  { id: 'marketing', label: 'Marketing', slugs: ['promotions', 'campaigns', 'notifications'] },
  { id: 'admin', label: 'Administration', slugs: ['staff', 'settings', 'audit-log'] },
];

export const isNavActive = (href: string, pathname: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
