import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoVendedorDto } from './create-producto-vendedor.dto';

export class UpdateProductoVendedorDto extends PartialType(
  CreateProductoVendedorDto,
) {}
