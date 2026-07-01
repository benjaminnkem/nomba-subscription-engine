import { ApiProperty } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

export class CreateSubscriptionResponseDto {
  @ApiProperty()
  subscription: Subscription;

  @ApiProperty({
    description: 'Nomba hosted checkout URL for the customer to complete payment',
  })
  checkoutUrl: string;

  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  invoiceId: string;
}