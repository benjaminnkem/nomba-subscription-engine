import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMerchantTxRef, toKobo } from './nomba.util';

export interface NombaChargeRequest {
  amountNaira: number;
  currency: string;
  customerId: string;
  cardId: string;
  paymentId: string;
  attemptNumber: number;
}

export interface NombaChargeResponse {
  success: boolean;
  transactionId?: string;
  failureReason?: string;
  merchantTxRef: string;
  raw?: Record<string, unknown>;
}

export interface NombaCheckoutRequest {
  orderReference: string;
  amountNaira: number;
  currency: string;
  callbackUrl: string;
  customerId: string;
  customerEmail: string;
}

export interface NombaCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  failureReason?: string;
  raw?: Record<string, unknown>;
}

interface CachedAccessToken {
  accessToken: string;
  expiresAt: number;
}

interface NombaApiResponse {
  data?: Record<string, unknown>;
  message?: string;
  status?: string;
}

const TOKEN_TTL_MS = 60 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

@Injectable()
export class NombaService {
  private readonly logger = new Logger(NombaService.name);
  private cachedToken: CachedAccessToken | null = null;

  constructor(private config: ConfigService) {}

  async charge(request: NombaChargeRequest): Promise<NombaChargeResponse> {
    const merchantTxRef = buildMerchantTxRef(
      request.paymentId,
      request.attemptNumber,
    );

    if (!this.isConfigured()) {
      this.logger.warn(
        { merchantTxRef },
        'Nomba credentials not configured — simulating tokenized charge',
      );
      return this.simulateCharge(merchantTxRef);
    }

    try {
      const response = await this.request<Record<string, unknown>>(
        'POST',
        '/v1/tokenized-card/charge',
        {
          amount: toKobo(request.amountNaira),
          currency: request.currency,
          cardId: request.cardId,
          customerId: request.customerId,
          merchantTxRef,
        },
        merchantTxRef,
      );

      const transactionId = this.extractTransactionId(response.data);

      return {
        success: response.ok,
        transactionId,
        failureReason: response.ok
          ? undefined
          : ((response.data?.message as string | undefined) ??
            'Tokenized charge failed'),
        merchantTxRef,
        raw: response.data,
      };
    } catch (error) {
      this.logger.error(
        { merchantTxRef, error },
        'Nomba tokenized charge failed',
      );

      return {
        success: false,
        failureReason: 'Payment gateway unavailable',
        merchantTxRef,
      };
    }
  }

  async createCheckout(
    request: NombaCheckoutRequest,
  ): Promise<NombaCheckoutResponse> {
    if (!this.isConfigured()) {
      this.logger.warn(
        { orderReference: request.orderReference },
        'Nomba credentials not configured — simulating checkout',
      );

      return {
        success: true,
        checkoutUrl: `https://checkout.nomba.com/simulated/${request.orderReference}`,
        raw: { simulated: true },
      };
    }

    const body = {
      order: {
        orderReference: request.orderReference,
        amount: toKobo(request.amountNaira),
        currency: request.currency,
        callbackUrl: request.callbackUrl,
        customerId: request.customerId,
        customerEmail: request.customerEmail,
      },
    };

    try {
      const response = await this.request<{
        data: { checkoutLink: string };
        message?: string;
        status?: string;
      }>('POST', '/v1/checkout/order', body, request.orderReference);

      const checkoutUrl =
        (response.data?.data?.checkoutLink as string | undefined) ?? undefined;

      return {
        success: response.ok && Boolean(checkoutUrl),
        checkoutUrl,
        failureReason: response.ok
          ? undefined
          : ((response.data?.message as string | undefined) ??
            'Checkout session creation failed'),
        raw: response.data,
      };
    } catch (error) {
      this.logger.error(
        { orderReference: request.orderReference, error },
        'Nomba checkout creation failed',
      );

      return {
        success: false,
        failureReason: 'Payment gateway unavailable',
      };
    }
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('nomba.clientId') &&
      this.config.get<string>('nomba.clientSecret') &&
      this.config.get<string>('nomba.accountId'),
    );
  }

  private async getAccessToken(): Promise<string> {
    try {
      if (
        this.cachedToken &&
        Date.now() < this.cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS
      ) {
        return this.cachedToken.accessToken;
      }

      const apiUrl = this.config.get<string>('nomba.apiUrl');
      const accountId = this.config.get<string>('nomba.accountId');
      const clientId = this.config.get<string>('nomba.clientId');
      const clientSecret = this.config.get<string>('nomba.clientSecret');

      const tokenUrl = `${apiUrl}/v1/auth/token/issue`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accountId: accountId!,
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const body = (await response.json()) as NombaApiResponse;
      const accessToken = body.data?.access_token as string | undefined;

      if (!response.ok || !accessToken) {
        throw new Error(
          (body.message as string | undefined) ??
            'Failed to issue Nomba access token',
        );
      }

      this.cachedToken = {
        accessToken,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      };

      return accessToken;
    } catch (error) {
      this.logger.error({ error }, 'Nomba access token issuance failed');
      throw error;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body: Record<string, unknown>,
    merchantTxRef: string,
  ): Promise<{ ok: boolean; data: T }> {
    const apiUrl = this.config.get<string>('nomba.apiUrl');
    const accountId = this.config.get<string>('nomba.accountId');
    const accessToken = await this.getAccessToken();

    this.logger.log({
      msg: 'Nomba API request',
      method,
      path,
      merchantTxRef,
    });

    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        accountId: accountId!,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as T & NombaApiResponse;

    this.logger.log({
      msg: 'Nomba API response',
      method,
      path,
      merchantTxRef,
      status: response.status,
      ok: response.ok,
    });

    return { ok: response.ok, data };
  }

  private simulateCharge(merchantTxRef: string): NombaChargeResponse {
    const simulatedSuccess = Math.random() > 0.15;
    return {
      success: simulatedSuccess,
      transactionId: simulatedSuccess ? `nomba_sim_${Date.now()}` : undefined,
      failureReason: simulatedSuccess ? undefined : 'Insufficient funds',
      merchantTxRef,
      raw: { simulated: true },
    };
  }

  private extractTransactionId(
    data: Record<string, unknown> | undefined,
  ): string | undefined {
    if (!data) return undefined;

    const nested = data.data as Record<string, unknown> | undefined;
    return (
      (data.transactionId as string | undefined) ??
      (nested?.transactionId as string | undefined) ??
      (data.id as string | undefined)
    );
  }
}
