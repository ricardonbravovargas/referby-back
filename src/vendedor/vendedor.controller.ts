// src/vendedor/vendedor.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { VendedorService } from './vendedor.service';
import { CreateVendedorDto } from 'src/dtos/create-vendedor.dto';
import { UpdateVendedorDto } from 'src/dtos/update-vendedor.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/auth/roles.enum';

@Controller('vendedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendedorController {
  constructor(private readonly vendedorService: VendedorService) {}

  @Post()
  @Roles(UserRole.EMPRESA) // ← mejor usar el enum directamente
  create(@Body() dto: CreateVendedorDto, @Req() req) {
    return this.vendedorService.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.vendedorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendedorService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendedorDto,
    @Req() req: any,
  ) {
    return this.vendedorService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendedorService.remove(id);
  }
}
