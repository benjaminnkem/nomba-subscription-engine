export type NombaWebhookEventType =
  | 'payment_success'
  | 'payment_failed'
  | 'payment_reversal'
  | 'payout_success'
  | 'payout_failed'
  | 'payout_refund';

export interface NombaWebhookMerchant {
  userId?: string;
  walletId?: string;
  walletBalance?: number;
}

export interface NombaWebhookTransaction {
  transactionId?: string;
  type?: string;
  time?: string;
  responseCode?: string;
  responseCodeMessage?: string;
  merchantTxRef?: string;
  aliasAccountReference?: string;
  transactionAmount?: number;
  fee?: number;
}

export interface NombaWebhookOrder {
  orderReference?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
}

export interface NombaWebhookData {
  merchant?: NombaWebhookMerchant;
  transaction?: NombaWebhookTransaction;
  order?: NombaWebhookOrder;
  terminal?: Record<string, unknown>;
  customer?: {
    cardId?: string;
    tokenId?: string;
    customerId?: string;
    [key: string]: unknown;
  };
}

export interface NombaWebhookPayload {
  event_type: NombaWebhookEventType;
  requestId?: string;
  request_id?: string;
  data: NombaWebhookData;
}

export interface NombaWebhookHeaders {
  signature?: string;
  timestamp?: string;
}
