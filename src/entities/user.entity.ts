import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../auth/roles.enum';
import { Empresa } from './empresa.entitiy';
import { Vendedor } from './vendedor.entiity';
import { Cart } from './cart.entiity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @BeforeInsert()
  addId() {
    this.id = uuidv4();
  }

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENTE,
  })
  role: UserRole;

  // CAMPOS PARA ANALYTICS
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ default: true })
  isActive: boolean;

  // ✅ NUEVOS CAMPOS PARA UBICACIÓN
  @Column({ nullable: true })
  ciudad?: string;

  @Column({ nullable: true })
  provincia?: string;

  @Column({ nullable: true, default: 'Argentina' })
  pais?: string;

  @Column({ nullable: true })
  codigoPostal?: string;

  @Column({ nullable: true })
  direccion?: string; // Dirección completa para envíos

  @ManyToOne(() => Empresa, { nullable: true, cascade: true, eager: true })
  @JoinColumn()
  empresa?: Empresa;

  @OneToMany(() => Vendedor, (vendedor) => vendedor.user)
  vendedores: Vendedor[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];
}
