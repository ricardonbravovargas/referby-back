// src/entities/producto-vendedor.entity.ts
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entitiy';
import { Vendedor } from './vendedor.entiity';

@Entity()
export class ProductoVendedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Producto, (producto) => producto.productoVendedores, {
    onDelete: 'CASCADE',
  })
  producto: Producto;

  @ManyToOne(() => Vendedor, (vendedor) => vendedor.productoVendedores, {
    onDelete: 'CASCADE',
  })
  vendedor: Vendedor;

  @Column('decimal', { precision: 5, scale: 2 })
  comision: number; // porcentaje ej: 12.5 = 12.5%
}
