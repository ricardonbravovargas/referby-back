import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { ProductoVendedorService } from './producto-vendedor.service';
import { CreateProductoVendedorDto } from '../dtos/create-producto-vendedor.dto';
import { UpdateProductoVendedorDto } from '../dtos/update-producto-vendedor.dto';

@Controller('producto-vendedor')
export class ProductoVendedorController {
  constructor(private readonly service: ProductoVendedorService) {}

  @Post()
  create(@Body() dto: CreateProductoVendedorDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoVendedorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
