import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUrl, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'URL Nomba redirects the customer to after checkout',
    example: 'https://yourapp.com/payment/return',
  })
  @IsUrl({ require_tld: false })
  callbackUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
