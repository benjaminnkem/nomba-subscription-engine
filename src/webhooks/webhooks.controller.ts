import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a webhook endpoint' })
  @ApiBody({ type: CreateWebhookDto })
  @ApiResponse({ status: 201 })
  create(@CurrentMerchant() merchantId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(merchantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints' })
  @ApiResponse({ status: 200 })
  findAll(@CurrentMerchant() merchantId: string) {
    return this.webhooksService.findAll(merchantId);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List webhook delivery logs' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  findDeliveries(
    @CurrentMerchant() merchantId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.findDeliveries(merchantId, id);
  }
}
