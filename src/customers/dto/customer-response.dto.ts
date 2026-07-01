import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer UUID', example: 'c1a2b3d4-...' })
  id: string;

  @ApiProperty({ description: 'Owning merchant UUID', example: 'm1a2b3d4-...' })
  merchantId: string;

  @ApiProperty({ description: 'Full name', example: 'Jane Doe' })
  name: string;

  @ApiProperty({ description: 'Email address', example: 'jane@example.com' })
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348012345678',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary key-value metadata',
    example: { plan: 'gold', ref: 'INV-001' },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Soft-delete timestamp, null if active' })
  deletedAt?: Date | null;
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  data: CustomerResponseDto[];

  @ApiProperty({
    description: 'Total number of customers for this merchant',
    example: 42,
  })
  total: number;
}
