import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Empresa } from './empresa.entitiy';
import { Orden } from './orden.entiity';
import { ProductoVendedor } from './Producto-Vendedor.entiity';
import { User } from './user.entity';

@Entity()
export class Vendedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @ManyToOne(() => Empresa, (empresa) => empresa.vendedores)
  empresa: Empresa;

  @OneToMany(() => Orden, (orden) => orden.vendedor)
  ordenes: Orden[];

  @OneToMany(() => ProductoVendedor, (pv) => pv.vendedor)
  productoVendedores: ProductoVendedor[];

  @ManyToOne(() => User, (user) => user.vendedores)
  user: User;
}
