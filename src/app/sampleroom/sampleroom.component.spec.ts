import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleroomComponent } from './sampleroom.component';

describe('SampleroomComponent', () => {
  let component: SampleroomComponent;
  let fixture: ComponentFixture<SampleroomComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SampleroomComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SampleroomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
