import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Video } from './entities/video.entity';
import { StorageService } from './storage.service';
import { VideoService } from './video.service';

vi.mock('../config', () => ({
  config: {
    frontendUrl: 'http://localhost:5173',
    aws: {
      s3: {
        region: 'us-east-1',
        endpoint: 'http://localhost:9000',
        publicEndpoint: 'http://localhost:9000',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        bucket: 'youflix',
      },
    },
  },
}));

describe('VideoService', () => {
  let service: VideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: getRepositoryToken(Video),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            findOneBy: vi.fn(),
            findOne: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(Genre),
          useValue: {
            find: vi.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            getPresignedPutUrl: vi.fn(),
            headObject: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
