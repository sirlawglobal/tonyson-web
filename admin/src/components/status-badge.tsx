import { ORDER_STATUS_LABEL, type OrderStatus, type PaymentStatus } from '@sirlawglobal/contracts';
import { Badge, type BadgeProps } from './ui/badge';

const ORDER_VARIANT: Record<OrderStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  READY_FOR_DISPATCH: 'brand',
  OUT_FOR_DELIVERY: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  PAYMENT_FAILED: 'danger',
  REFUND_PENDING: 'warning',
  REFUNDED: 'neutral',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_VARIANT[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

const PAYMENT_VARIANT: Record<PaymentStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
