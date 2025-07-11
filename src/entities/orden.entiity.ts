import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Vendedor } from './vendedor.entiity';
import { Producto } from './producto.entitiy';

@Entity()
export class Orden {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  fecha: Date;

  @ManyToOne(() => Vendedor, (vendedor) => vendedor.ordenes)
  vendedor: Vendedor;

  @ManyToMany(() => Producto, (producto) => producto.ordenes)
  @JoinTable()
  productos: Producto[];
}
