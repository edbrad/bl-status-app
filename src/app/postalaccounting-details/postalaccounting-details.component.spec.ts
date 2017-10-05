import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostalaccountingDetailsComponent } from './postalaccounting-details.component';

describe('PostalaccountingDetailsComponent', () => {
  let component: PostalaccountingDetailsComponent;
  let fixture: ComponentFixture<PostalaccountingDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PostalaccountingDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostalaccountingDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
