import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiWrappedResponse } from '../common/dto/api-response.dto';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanListResponseDto, PlanResponseDto } from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('Plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a billing plan' })
  @ApiBody({ type: CreatePlanDto })
  @ApiWrappedResponse({
    status: 201,
    type: PlanResponseDto,
    description: 'Plan created',
  })
  create(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Body() dto: CreatePlanDto,
  ) {
    return this.plansService.create(merchantId, dto, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List all plans' })
  @ApiWrappedResponse({
    status: 200,
    type: PlanListResponseDto,
    description: 'Plan list',
  })
  findAll(
    @CurrentMerchant() merchantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.plansService.findAll(merchantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiWrappedResponse({
    status: 200,
    type: PlanResponseDto,
    description: 'Plan record',
  })
  findOne(@CurrentMerchant() merchantId: string, @Param('id') id: string) {
    return this.plansService.findOne(merchantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePlanDto })
  @ApiWrappedResponse({
    status: 200,
    type: PlanResponseDto,
    description: 'Updated plan',
  })
  update(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.update(merchantId, id, dto, user.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a plan' })
  @ApiParam({ name: 'id', type: String })
  @ApiWrappedResponse({
    status: 200,
    type: PlanResponseDto,
    description: 'Deactivated plan',
  })
  remove(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
  ) {
    return this.plansService.remove(merchantId, id, user.email);
  }
}
