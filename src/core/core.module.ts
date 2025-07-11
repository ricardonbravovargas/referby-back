// src/core/core.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Empresa } from 'src/entities/empresa.entitiy';
import { Producto } from 'src/entities/producto.entitiy';
import { Vendedor } from 'src/entities/vendedor.entiity';
import { Orden } from 'src/entities/orden.entiity';
import { ProductoVendedor } from 'src/entities/Producto-Vendedor.entiity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Empresa,
      Producto,
      Vendedor,
      Orden,
      ProductoVendedor,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class CoreModule {}
