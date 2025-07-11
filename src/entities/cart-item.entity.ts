// src/entities/cart-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Cart } from './cart.entiity';
import { Producto } from './producto.entitiy'; // Usar la ruta correcta según tu estructura

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: Cart;

  @ManyToOne(() => Producto, (producto) => producto.cartItems)
  producto: Producto;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number; // Precio al momento de agregar al carrito
}
