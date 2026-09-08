import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MOVIE_GENRES } from "./data/movie-genres.seed";
import { Genre } from "./entities/genre.entity";

@Injectable() 
export class GenresVideoSeedService implements OnModuleInit {
  private readonly logger = new Logger(GenresVideoSeedService.name);

  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>
  ) { }

  async onModuleInit() {
    try {
      await this.genreRepository.upsert(MOVIE_GENRES, {
        conflictPaths: ['slug'],
        skipUpdateIfNoValuesChanged: true,
      })
      this.logger.log('Genres seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding genres', error);
      throw error;
    }
  }
}