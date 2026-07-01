export const DOMAIN_EVENTS = {
  SUBSCRIPTION_CREATED: 'SubscriptionCreatedEvent',
  SUBSCRIPTION_UPDATED: 'SubscriptionUpdatedEvent',
  SUBSCRIPTION_CANCELLED: 'SubscriptionCancelledEvent',
  SUBSCRIPTION_RENEWED: 'SubscriptionRenewedEvent',
  PAYMENT_FAILED: 'PaymentFailedEvent',
  PAYMENT_RECOVERED: 'PaymentRecoveredEvent',
  INVOICE_PAID: 'InvoicePaidEvent',
} as const;

export type DomainEventType =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export interface DomainEventPayload {
  merchantId: string;
  aggregateType: string;
  aggregateId: string;
  data: Record<string, unknown>;
}
