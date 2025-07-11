import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Producto } from './producto.entitiy'; // Asegúrate que la importación sea correcta
import { Vendedor } from './vendedor.entiity';

@Entity()
export class Empresa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() // Columna requerida
  nombre: string;

  @Column() // Columna requerida
  email: string;

  @OneToMany(() => Producto, (producto) => producto.empresa)
  productos: Producto[];

  @OneToMany(() => Vendedor, (vendedor) => vendedor.empresa)
  vendedores: Vendedor[];
}
