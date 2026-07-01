import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty()
  @IsUUID()
  newPlanId: string;
}
