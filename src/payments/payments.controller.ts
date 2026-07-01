import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Nomba hosted checkout session for an invoice',
  })
  @ApiResponse({ status: 201 })
  createCheckout(
    @CurrentMerchant() merchantId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckout(merchantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiResponse({ status: 200 })
  findAll(@CurrentMerchant() merchantId: string) {
    return this.paymentsService.findAll(merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  findOne(
    @CurrentMerchant() merchantId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(merchantId, id);
  }
}