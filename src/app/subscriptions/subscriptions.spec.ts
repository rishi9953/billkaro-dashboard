import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionFormComponent } from './subscriptions';

describe('Subscriptions', () => {
  let component: SubscriptionFormComponent;
  let fixture: ComponentFixture<SubscriptionFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
