import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ModerationStatus, type ModerationSource } from "../types/moderation-status.type";
import { ModerationFlag } from './../types/moderation-flag.type';
import { Video } from "./video.entity";

@Entity('video_moderations')
export class VideoModeration {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video

  @Column({ type: 'uuid' })
  videoId: string

  @Column({ type: 'varchar' })
  source: ModerationSource;

  @Column({ type: 'enum', enum: ModerationStatus, enumName: 'moderation_status_enum' })
  status: ModerationStatus

  @Column({ type: 'text', nullable: true })
  reason: string | null

  @Column({ type: 'jsonb', default: () => "'[]'" })
  flags: ModerationFlag[]

  @Column({ type: 'text', nullable: true })
  summary: string | null

  @Column({ type: 'varchar', nullable: true })
  model: string | null

  @Column({ type: 'float', nullable: true })
  costUsd: number | null

  @Column({ type: 'uuid', nullable: true })
  reviewerId: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}