import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200 })
  findAll(@CurrentMerchant() merchantId: string) {
    return this.invoicesService.findAll(merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  findOne(@CurrentMerchant() merchantId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(merchantId, id);
  }
}
