import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  linkUrl?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
