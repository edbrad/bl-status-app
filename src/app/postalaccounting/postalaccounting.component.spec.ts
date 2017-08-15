import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostalaccountingComponent } from './postalaccounting.component';

describe('PostalaccountingComponent', () => {
  let component: PostalaccountingComponent;
  let fixture: ComponentFixture<PostalaccountingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PostalaccountingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostalaccountingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
