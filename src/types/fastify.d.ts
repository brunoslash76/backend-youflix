import { User } from '../user/entities/user.entity';

declare module 'fastify' {
  interface FastifyRequest {
    user: Omit<User, 'password' | 'refreshToken'>;
  }
}