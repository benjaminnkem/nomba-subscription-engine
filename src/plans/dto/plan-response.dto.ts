import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanInterval } from '../../shared/enums';

export class PlanResponseDto {
  @ApiProperty({ example: 'p1a2b3d4-...' })
  id: string;

  @ApiProperty({ example: 'm1a2b3d4-...' })
  merchantId: string;

  @ApiProperty({ example: 'Gold Monthly' })
  name: string;

  @ApiPropertyOptional({ example: 'Access to all premium features' })
  description?: string;

  @ApiProperty({ example: '5000.00' })
  amount: string;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ enum: PlanInterval, example: PlanInterval.MONTHLY })
  interval: PlanInterval;

  @ApiProperty({ example: 0 })
  trialDays: number;

  @ApiPropertyOptional({ example: 90 })
  customIntervalDays?: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;
}

export class PlanListResponseDto {
  @ApiProperty({ type: [PlanResponseDto] })
  data: PlanResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;
}
