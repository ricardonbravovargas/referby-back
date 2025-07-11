import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Producto } from '../entities/producto.entitiy';
import { Empresa } from '../entities/empresa.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { ProductoService } from './producto.service';
import { ProductoController } from './producto.controller';
import { CloudinaryService } from './cloudinary.service';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Empresa,
      Vendedor,
      ProductoVendedor,
      User,
    ]),
    ConfigModule, // Necesario para CloudinaryService
  ],
  controllers: [ProductoController],
  providers: [ProductoService, CloudinaryService], // Agregar CloudinaryService
  exports: [ProductoService, CloudinaryService],
})
export class ProductoModule {}
