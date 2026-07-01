import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../shared/enums';
import { AuditService } from '../audit/audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from './entities/plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    private auditService: AuditService,
  ) {}

  async create(
    merchantId: string,
    dto: CreatePlanDto,
    actor: string,
  ): Promise<Plan> {
    // prevent duplicate plan
    const existingPlan = await this.planRepo.findOne({
      where: {
        merchantId,
        name: dto.name,
      },
    });

    if (existingPlan) {
      throw new BadRequestException(
        `Plan with name ${dto.name} already exists`,
      );
    }

    const plan = this.planRepo.create({
      merchantId,
      ...dto,
      amount: dto.amount.toFixed(2),
      currency: dto.currency ?? 'NGN',
    });
    const saved = await this.planRepo.save(plan);

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.CREATE,
      resourceType: 'plan',
      resourceId: saved.id,
    });

    return saved;
  }

  async findAll(
    merchantId: string,
    { page = 1, limit = 20 }: PaginationDto,
  ): Promise<{ data: Plan[]; total: number }> {
    const [data, total] = await this.planRepo.findAndCount({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(merchantId: string, id: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id, merchantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(
    merchantId: string,
    id: string,
    dto: UpdatePlanDto,
    actor: string,
  ): Promise<Plan> {
    const plan = await this.findOne(merchantId, id);
    if (dto.amount !== undefined) {
      plan.amount = dto.amount.toFixed(2);
    }

    Object.assign(plan, { ...dto, amount: plan.amount });
    const updated = await this.planRepo.save(plan);

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.UPDATE,
      resourceType: 'plan',
      resourceId: id,
    });

    return updated;
  }

  async remove(merchantId: string, id: string, actor: string): Promise<void> {
    const plan = await this.findOne(merchantId, id);
    plan.isActive = false;
    await this.planRepo.softRemove(plan);

    await this.auditService.log({
      merchantId,
      actor,
      action: AuditAction.DELETE,
      resourceType: 'plan',
      resourceId: id,
    });
  }
}
