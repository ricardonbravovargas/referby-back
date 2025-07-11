// src/vendedor/vendedor.module.ts
import { Module } from '@nestjs/common';
import { VendedorController } from './vendedor.controller';
import { VendedorService } from './vendedor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendedor } from 'src/entities/vendedor.entiity';
import { Empresa } from 'src/entities/empresa.entitiy';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendedor, Empresa, User])],
  controllers: [VendedorController],
  providers: [VendedorService],
  exports: [VendedorService],
})
export class VendedorModule {}
