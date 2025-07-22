import { Test, TestingModule } from '@nestjs/testing';
import { EmailhlpService } from './emailhlp.service';

describe('EmailhlpService', () => {
  let service: EmailhlpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailhlpService],
    }).compile();

    service = module.get<EmailhlpService>(EmailhlpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
