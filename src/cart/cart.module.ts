// src/cart/cart.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart } from '../entities/cart.entiity';
import { CartItem } from '../entities/cart-item.entity';
import { Producto } from '../entities/producto.entitiy';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Producto, User])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
