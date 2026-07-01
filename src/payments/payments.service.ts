import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from '../customers/customers.service';
import { DOMAIN_EVENTS } from '../events/domain-events';
import { EventsService } from '../events/events.service';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoiceStatus, PaymentStatus } from '../shared/enums';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { NombaService } from './nomba.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentAttempt)
    private attemptRepo: Repository<PaymentAttempt>,
    private nombaService: NombaService,
    private customersService: CustomersService,
    private invoicesService: InvoicesService,
    private eventsService: EventsService,
  ) {}

  async createCheckout(
    merchantId: string,
    dto: CreateCheckoutDto,
  ): Promise<{ checkoutUrl: string; paymentId: string }> {
    const invoice = await this.invoicesService.findOne(
      merchantId,
      dto.invoiceId,
    );
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Invoice is not pending payment');
    }

    const customer = await this.customersService.findOne(
      merchantId,
      invoice.customerId,
    );

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        merchantId,
        invoiceId: invoice.id,
        subscriptionId: invoice.subscriptionId,
        amount: invoice.total,
        currency: invoice.currency,
        status: PaymentStatus.PENDING,
      }),
    );

    const result = await this.nombaService.createCheckout({
      orderReference: payment.id,
      amountNaira: parseFloat(invoice.total),
      currency: invoice.currency,
      callbackUrl: dto.callbackUrl,
      customerId: customer.id,
      customerEmail: customer.email,
    });

    if (!result.success || !result.checkoutUrl) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason =
        result.failureReason ?? 'Checkout creation failed';
      await this.paymentRepo.save(payment);
      throw new BadRequestException(payment.failureReason);
    }

    return { checkoutUrl: result.checkoutUrl, paymentId: payment.id };
  }

  async chargeInvoice(invoice: Invoice): Promise<Payment> {
    const customer = await this.customersService.findOne(
      invoice.merchantId,
      invoice.customerId,
    );

    if (!customer.nombaCardToken) {
      const payment = await this.paymentRepo.save(
        this.paymentRepo.create({
          merchantId: invoice.merchantId,
          invoiceId: invoice.id,
          subscriptionId: invoice.subscriptionId,
          amount: invoice.total,
          currency: invoice.currency,
          status: PaymentStatus.FAILED,
          failureReason:
            'No saved payment method — create a checkout session first',
        }),
      );

      await this.eventsService.emit(DOMAIN_EVENTS.PAYMENT_FAILED, {
        merchantId: invoice.merchantId,
        aggregateType: 'payment',
        aggregateId: payment.id,
        data: { payment, invoice },
      });

      return payment;
    }

    const payment = this.paymentRepo.create({
      merchantId: invoice.merchantId,
      invoiceId: invoice.id,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.total,
      currency: invoice.currency,
      status: PaymentStatus.PENDING,
    });
    const savedPayment = await this.paymentRepo.save(payment);

    const attemptNumber = 1;
    const result = await this.nombaService.charge({
      amountNaira: parseFloat(invoice.total),
      currency: invoice.currency,
      customerId: customer.id,
      cardId: customer.nombaCardToken,
      paymentId: savedPayment.id,
      attemptNumber,
    });

    const attempt = this.attemptRepo.create({
      merchantId: invoice.merchantId,
      paymentId: savedPayment.id,
      attemptNumber,
      status: result.success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
      nombaTransactionId: result.transactionId,
      failureReason: result.failureReason,
      responsePayload: {
        ...result.raw,
        merchantTxRef: result.merchantTxRef,
      },
    });
    await this.attemptRepo.save(attempt);

    savedPayment.status = attempt.status;
    savedPayment.nombaTransactionId = result.transactionId;
    savedPayment.failureReason = result.failureReason;
    if (result.success) {
      savedPayment.paidAt = new Date();
    }
    const updated = await this.paymentRepo.save(savedPayment);

    if (!result.success) {
      await this.eventsService.emit(DOMAIN_EVENTS.PAYMENT_FAILED, {
        merchantId: invoice.merchantId,
        aggregateType: 'payment',
        aggregateId: updated.id,
        data: { payment: updated, invoice },
      });
    }

    return updated;
  }

  async findAll(merchantId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { merchantId },
      relations: { attempts: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(merchantId: string, id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, merchantId },
      relations: { attempts: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async recordRecovery(payment: Payment, invoice: Invoice): Promise<void> {
    await this.eventsService.emit(DOMAIN_EVENTS.PAYMENT_RECOVERED, {
      merchantId: payment.merchantId,
      aggregateType: 'payment',
      aggregateId: payment.id,
      data: { payment, invoice },
    });
  }
}
