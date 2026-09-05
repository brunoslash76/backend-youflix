import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Video } from "./video.entity";

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ unique: true })
  slug: string;

  @ManyToMany(() => Video, (video) => video.genres)
  videos: Video[];
}
