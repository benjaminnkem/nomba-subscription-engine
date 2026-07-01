import { ApiProperty } from '@nestjs/swagger';
import { getSchemaPath } from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ enum: ['success', 'error'], example: 'success' })
  status: 'success' | 'error';

  @ApiProperty({ description: 'Human-readable result message', example: 'Request successful' })
  message: string;

  data: T;
}

export const ApiWrappedResponse = <TModel extends Type<unknown>>({
  status,
  type,
  isArray = false,
  description,
}: {
  status: number;
  type: TModel;
  isArray?: boolean;
  description?: string;
}) => {
  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(type) } }
    : { $ref: getSchemaPath(type) };

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, type),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  );
};
