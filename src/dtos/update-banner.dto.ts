import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBannerDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  linkUrl?: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
