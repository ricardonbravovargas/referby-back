import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

@Entity()
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn()
  referrer: User;

  @Column()
  referrerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  referredUser?: User;

  @Column({ nullable: true })
  referredUserId?: string;

  @Column({ nullable: true })
  referredUserEmail?: string;

  @Column({ nullable: true })
  referredUserName?: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  commission: number;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ nullable: true })
  paymentIntentId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Entity for storing short referral codes
@Entity()
export class ReferralShortCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  shortCode: string;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Entity for storing shared cart links
@Entity()
export class SharedCartLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  shortCode: string;

  @ManyToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column('jsonb')
  cartData: any[];

  @Column({ default: 'shared-cart' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
