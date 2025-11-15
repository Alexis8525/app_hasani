import { TestBed } from '@angular/core/testing';

import { MovimentosService } from './movimentos.service';

describe('MovimentosService', () => {
  let service: MovimentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MovimentosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
