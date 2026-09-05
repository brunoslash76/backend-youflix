import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Comment } from "./comments.entity";
import { Genre } from "./genre.entity";

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'uuid', nullable: false })
  authorId: string;

  @Column({ unique: true, length: 21, nullable: false })
  publicId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  description: string;
  
  @ManyToMany(() => Genre, (genre) => genre.videos, { cascade: false})
  @JoinTable({ name: 'video_genres' })
  genres: Genre[];

  @OneToMany(() => Comment, (comment) => comment.video)
  comments: Comment[];

  @Column({ type: 'bigint', default: 0 })
  views: number;

  @Column({ type: 'bigint', default: 0 })
  likes: number;

  @Column({ type: 'bigint', default: 0 })
  dislikes: number;

  @Column()
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  storageKey: string;

  @Column({ type: 'varchar', nullable: true })
  thumbnailKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
