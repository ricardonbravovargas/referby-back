import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Empresa } from './empresa.entitiy';
import { Orden } from './orden.entiity';
import { ProductoVendedor } from './Producto-Vendedor.entiity';
import { CartItem } from './cart-item.entity';

@Entity()
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column('decimal')
  precio: number;

  @Column({ nullable: true })
  categoria?: string;

  @Column('text', { nullable: true })
  caracteristicas?: string;

  @Column({ type: 'int', default: 0 })
  inventario: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  iva: number;

  @Column({ type: 'boolean', default: true })
  ivaIncluido: boolean;

  @Column({ type: 'boolean', default: false })
  envioDisponible: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costoEnvio?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  envioGratisHasta: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  envioProvincial: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  envioNacional: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  envioInternacional: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  envioInternacionalHasta: number;

  @ManyToOne(() => Empresa, (empresa) => empresa.productos)
  empresa: Empresa;

  @ManyToMany(() => Orden, (orden) => orden.productos)
  ordenes: Orden[];

  @OneToMany(() => ProductoVendedor, (pv) => pv.producto)
  productoVendedores: ProductoVendedor[];

  @Column({ nullable: true })
  imagen?: string;

  @Column({ nullable: true })
  imagenPublicId?: string;

  @Column('simple-array', { nullable: true })
  imagenes?: string[];

  @Column('simple-array', { nullable: true })
  imagenesPublicIds?: string[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.producto)
  cartItems: CartItem[];
}
