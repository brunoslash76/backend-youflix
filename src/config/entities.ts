import { Tokens } from "../auth/entities/tokens.entity";
import { User } from "../user/entities/user.entity";
import { Comment } from '../video/entities/comments.entity';
import { Genre } from "../video/entities/genre.entity";
import { VideoRendition } from "../video/entities/video-rendition.entity";
import { Video } from "../video/entities/video.entity";

export const ENTITIES = [User, Tokens, Video, Genre, Comment, VideoRendition];