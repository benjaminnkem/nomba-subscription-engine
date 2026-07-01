import {
  Body,
  Controller,
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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerListResponseDto,
  CustomerResponseDto,
} from './dto/customer-response.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiWrappedResponse({
    status: 201,
    type: CustomerResponseDto,
    description: 'Customer created',
  })
  create(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(merchantId, dto, user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiWrappedResponse({
    status: 200,
    type: CustomerListResponseDto,
    description: 'Paginated customer list',
  })
  findAll(
    @CurrentMerchant() merchantId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.customersService.findAll(merchantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiWrappedResponse({
    status: 200,
    type: CustomerResponseDto,
    description: 'Customer record',
  })
  findOne(@CurrentMerchant() merchantId: string, @Param('id') id: string) {
    return this.customersService.findOne(merchantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiWrappedResponse({
    status: 200,
    type: CustomerResponseDto,
    description: 'Updated customer',
  })
  update(
    @CurrentMerchant() merchantId: string,
    @CurrentUser() user: { email: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(merchantId, id, dto, user.email);
  }
}
