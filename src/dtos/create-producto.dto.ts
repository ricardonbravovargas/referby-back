import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @Transform(({ value }) => Number.parseFloat(value))
  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  caracteristicas?: string;

  // Nuevos campos agregados
  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value))
  @IsNumber()
  @Min(0)
  inventario?: number;

  @IsOptional()
  @Transform(({ value }) => Number.parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  iva?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  ivaIncluido?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  envioDisponible?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  costoEnvio?: number;

  // ✅ NUEVOS CAMPOS PARA ENVÍO POR ZONAS
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  envioGratisHasta?: number; // Kilómetros de envío gratis

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  envioProvincial?: number; // Precio envío provincial

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  envioNacional?: number; // Precio envío nacional

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  envioInternacional?: number; // Precio envío internacional

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  envioInternacionalHasta?: number; // Límite km para envío internacional
}

export class UpdateProductoDto extends CreateProductoDto {}
