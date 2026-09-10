import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { RenditionStatus } from "../types/rendition-status.type";
import { Video } from "./video.entity";

@Entity('video_renditions')
@Unique(['videoId', 'name'])
export class VideoRendition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column({ type: 'uuid', nullable: false })
  videoId: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column('int')
  height: number;

  @Column('int')
  width: number;

  @Column('int')
  bitrateKbps: number;

  @Column()
  playlistKey: string;

  @Column(
    'bigint',
    {
      default: 0,
      transformer: {
        to: (v: number) => v,
        from: (v: string) => Number(v),
      }
    }
  )
  bytes: number;

  @Column({ type: 'enum', enum: RenditionStatus, default: RenditionStatus.PENDING })
  status: RenditionStatus;

  @Column({ type: 'text' , nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

}
