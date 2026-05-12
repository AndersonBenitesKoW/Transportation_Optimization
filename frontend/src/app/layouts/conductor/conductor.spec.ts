import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Conductor } from './conductor';

describe('Conductor', () => {
  let component: Conductor;
  let fixture: ComponentFixture<Conductor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Conductor],
    }).compileComponents();

    fixture = TestBed.createComponent(Conductor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
