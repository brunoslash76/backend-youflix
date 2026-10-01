import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('tokens')
export class Tokens {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  @Index({ unique: true})
  refreshTokenHash: string;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  @Index()
  tokenFamily: string;

  @Column()
  isRevoked: boolean;

  @Column({ type: 'timestamptz' })
  @Index()
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
  
}