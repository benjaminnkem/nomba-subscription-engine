import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Invoice to collect payment for' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({
    description: 'URL Nomba redirects the customer to after checkout',
    example: 'https://yourapp.com/payment/return',
  })
  @IsUrl({ require_tld: false })
  callbackUrl: string;
}
