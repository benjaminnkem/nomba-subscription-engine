import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({ status: 201 })
  create(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(merchantId, dto, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List subscriptions' })
  @ApiResponse({ status: 200 })
  findAll(@CurrentMerchant() merchantId: string) {
    return this.subscriptionsService.findAll(merchantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  findOne(@CurrentMerchant() merchantId: string, @Param('id') id: string) {
    return this.subscriptionsService.findOne(merchantId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause subscription' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  pause(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.pause(merchantId, id, user.email);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume subscription' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  resume(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.resume(merchantId, id, user.email);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  cancel(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.cancel(merchantId, id, user.email);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  reactivate(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.reactivate(merchantId, id, user.email);
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Upgrade or downgrade plan' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: ChangePlanDto })
  @ApiResponse({ status: 200 })
  changePlan(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(
      merchantId,
      id,
      dto,
      user.email,
    );
  }
}
