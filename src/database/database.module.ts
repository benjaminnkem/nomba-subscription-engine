import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { EventStore } from '../events/entities/event-store.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NombaWebhookEvent } from '../payments/entities/nomba-webhook-event.entity';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Plan } from '../plans/entities/plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { WebhookDelivery } from '../webhooks/entities/webhook-delivery.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';

const entities = [
  User,
  Merchant,
  ApiKey,
  Plan,
  Customer,
  Subscription,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentAttempt,
  NombaWebhookEvent,
  Webhook,
  WebhookDelivery,
  AuditLog,
  Notification,
  EventStore,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get<string>('nodeEnv') === 'development';

        return {
          type: 'postgres',
          host: config.get<string>('database.host'),
          port: config.get<number>('database.port'),
          username: config.get<string>('database.username'),
          password: config.get<string>('database.password'),
          database: config.get<string>('database.name'),
          entities,
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
          migrationsRun: isDevelopment,
          synchronize: isDevelopment,
          logging: config.get<string>('data.logging') === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
