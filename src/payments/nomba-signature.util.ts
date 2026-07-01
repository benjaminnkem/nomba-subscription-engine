import * as crypto from 'crypto';
import { NombaWebhookPayload } from './nomba-webhook.types';

export function buildNombaSignaturePayload(
  payload: NombaWebhookPayload,
  timestamp: string,
): string {
  const transaction = payload.data?.transaction ?? {};
  const merchant = payload.data?.merchant ?? {};

  let responseCode = transaction.responseCode ?? '';
  if (responseCode === 'null') {
    responseCode = '';
  }

  const requestId = payload.requestId ?? payload.request_id ?? '';

  return [
    payload.event_type,
    requestId,
    merchant.userId ?? '',
    merchant.walletId ?? '',
    transaction.transactionId ?? '',
    transaction.type ?? '',
    transaction.time ?? '',
    responseCode,
    timestamp,
  ].join(':');
}

export function generateNombaSignature(
  payload: NombaWebhookPayload,
  secret: string,
  timestamp: string,
): string {
  const hashingPayload = buildNombaSignaturePayload(payload, timestamp);
  return crypto
    .createHmac('sha256', secret)
    .update(hashingPayload)
    .digest('base64');
}

export function verifyNombaSignature(
  payload: NombaWebhookPayload,
  secret: string,
  signature: string,
  timestamp: string,
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const expected = generateNombaSignature(
    payload,
    secret,
    timestamp,
  ).toLowerCase();
  const received = signature.toLowerCase();
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
