// src/dtos/create-producto-vendedor.dto.ts
import { IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateProductoVendedorDto {
  @IsUUID()
  productoId: string;

  @IsUUID()
  vendedorId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  comision: number;
}
