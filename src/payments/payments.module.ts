import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { EventsModule } from '../events/events.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentAttempt } from './entities/payment-attempt.entity';
import { Payment } from './entities/payment.entity';
import { NombaService } from './nomba.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAttempt]),
    CustomersModule,
    EventsModule,
    InvoicesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, NombaService],
  exports: [PaymentsService, NombaService],
})
export class PaymentsModule {}