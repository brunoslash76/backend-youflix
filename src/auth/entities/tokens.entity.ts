import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('tokens')
export class Tokens {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  @Index('UQ_tokens_refreshTokenHash', { unique: true})
  refreshTokenHash: string;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  @Index('IDX_tokens_tokenFamily')
  tokenFamily: string;

  @Column()
  isRevoked: boolean;

  @Column({ type: 'timestamptz' })
  @Index('IDX_tokens_expiresAt')
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
  
}