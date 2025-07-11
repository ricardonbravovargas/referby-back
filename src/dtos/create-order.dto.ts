import { IsArray, IsUUID } from 'class-validator';

export class CreateOrdenDto {
  @IsUUID()
  vendedorId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  productosIds: string[];
}
