import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleroomDetailsComponent } from './sampleroom-details.component';

describe('SampleroomDetailsComponent', () => {
  let component: SampleroomDetailsComponent;
  let fixture: ComponentFixture<SampleroomDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SampleroomDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SampleroomDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
