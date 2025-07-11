import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { Producto } from '../entities/producto.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { ProductoVendedorService } from './producto-vendedor.service';
import { ProductoVendedorController } from './producto-vendedor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoVendedor, Producto, Vendedor])],
  controllers: [ProductoVendedorController],
  providers: [ProductoVendedorService],
})
export class ProductoVendedorModule {}
