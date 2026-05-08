import { TestBed } from '@angular/core/testing';

import { Flota } from './flota';

describe('Flota', () => {
  let service: Flota;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Flota);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
