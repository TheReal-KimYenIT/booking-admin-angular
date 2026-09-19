import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOverview } from './admin-overview';

describe('AdminOverview', () => {
  let component: AdminOverview;
  let fixture: ComponentFixture<AdminOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOverview],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
