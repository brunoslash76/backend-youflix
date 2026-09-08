import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Genre } from "./entities/genre.entity";

@Injectable()
export class GenresService {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>
  ) {}

  async getGenres() {
    try {
      return this.genreRepository.find();
    } catch(error) {
      throw error;
    }
  }
}
