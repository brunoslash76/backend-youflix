import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { VideoStatus } from "../types/video-status.type";
import { Comment } from "./comments.entity";
import { Genre } from "./genre.entity";
import { VideoRendition } from "./video-rendition.entity";

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'varchar', nullable: false })
  contentType: string;

  @Column({
    type: 'bigint',
    nullable: false,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v)
    }
  })
  sizeBytes: number;

  @Column({ type: 'uuid', nullable: false })
  authorId: string;

  @Column({ unique: true, length: 21, nullable: false })
  publicId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  description: string;

  @ManyToMany(() => Genre, (genre) => genre.videos, { cascade: false })
  @JoinTable({ name: 'video_genres' })
  genres: Genre[];

  @OneToMany(() => Comment, (comment) => comment.video)
  comments: Comment[];

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  dislikes: number;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  storageKey: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailKey: string;

  @Column({ type: 'enum', enum: VideoStatus, default: VideoStatus.AWAITING_UPLOAD })
  status: VideoStatus;

  @OneToMany(() => VideoRendition, (rendition) => rendition.video)
  renditions: VideoRendition[];

  @Column({ type: 'float', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'int', nullable: true })
  sourceWidth: number | null;

  @Column({ type: 'int', nullable: true })
  sourceHeight: number | null;

  @Column({ type: 'varchar', nullable: true })
  hlsMasterKey: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
