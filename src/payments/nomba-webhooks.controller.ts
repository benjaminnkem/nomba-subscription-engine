import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { NombaWebhooksService } from './nomba-webhooks.service';
import type { NombaWebhookPayload } from './nomba-webhook.types';

@ApiTags('Nomba Webhooks')
@Controller('webhooks/nomba')
export class NombaWebhooksController {
  constructor(private nombaWebhooksService: NombaWebhooksService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ResponseMessage('Webhook received')
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  @ApiOperation({ summary: 'Receive payment events from Nomba' })
  @ApiResponse({ status: 200, description: 'Webhook accepted' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  handleWebhook(
    @Body() payload: NombaWebhookPayload,
    @Headers('nomba-signature') signature?: string,
    @Headers('nomba-timestamp') timestamp?: string,
  ) {
    return this.nombaWebhooksService.process(payload, {
      signature,
      timestamp,
    });
  }
}
