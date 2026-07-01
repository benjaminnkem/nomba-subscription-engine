import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get subscription analytics metrics' })
  @ApiResponse({ status: 200 })
  getMetrics(@CurrentMerchant() merchantId: string) {
    return this.analyticsService.getMetrics(merchantId);
  }
}
