// src/dtos/create-vendedor.dto.ts
import { IsString } from 'class-validator';

export class CreateVendedorDto {
  @IsString()
  nombre: string;
}
