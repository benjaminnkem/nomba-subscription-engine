import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../shared/enums';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private auditService: AuditService,
  ) {}

  async create(
    merchantId: string,
    dto: CreateCustomerDto,
    actor: string,
  ): Promise<Customer> {
    const customerExists = await this.customerRepo.findOne({
      where: { merchantId, email: dto.email },
    });
    if (customerExists) return customerExists;

    const customer = this.customerRepo.create({ merchantId, ...dto });
    const saved = await this.customerRepo.save(customer);

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.CREATE,
      resourceType: 'customer',
      resourceId: saved.id,
    });

    return saved;
  }

  async findAll(merchantId: string): Promise<Customer[]> {
    return this.customerRepo.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(merchantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id, merchantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async saveNombaCardToken(
    merchantId: string,
    customerId: string,
    cardToken: string,
  ): Promise<Customer> {
    const customer = await this.findOne(merchantId, customerId);
    customer.nombaCardToken = cardToken;
    return this.customerRepo.save(customer);
  }

  async update(
    merchantId: string,
    id: string,
    dto: UpdateCustomerDto,
    actor: string,
  ): Promise<Customer> {
    const customer = await this.findOne(merchantId, id);
    Object.assign(customer, dto);
    const updated = await this.customerRepo.save(customer);

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.UPDATE,
      resourceType: 'customer',
      resourceId: id,
    });

    return updated;
  }
}
