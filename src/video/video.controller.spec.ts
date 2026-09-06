import { Test, TestingModule } from '@nestjs/testing';
import { VideoController } from './video.controller';
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

describe('VideoController', () => {
  let controller: VideoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: VideoService,
          useValue: {
            createUpload: vi.fn(),
            completeUpload: vi.fn(),
            findByPublicId: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VideoController>(VideoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
