import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

@Component({
  selector: 'app-subscription-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subscriptions.html',
  styleUrls: ['./subscriptions.scss']
})
export class SubscriptionFormComponent implements OnInit {
  subscriptionForm: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  success = false;
  private apiUrl = API_ENDPOINTS.SUBSCRIPTION_PLANS;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.subscriptionForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      discountedPrice: ['', [Validators.required, Validators.min(0)]],
      subtitle: ['', [Validators.required]],
      bulletPoints: this.formBuilder.array([], Validators.minLength(1)),
      showImage: [true],
      rating: ['4.8', [Validators.min(0), Validators.max(5)]]
    });
  }

  ngOnInit(): void {
    // Add initial bullet point
    this.addBulletPoint();
  }

  get f() {
    return this.subscriptionForm.controls;
  }

  get bulletPointsFormArray(): FormArray {
    return this.subscriptionForm.get('bulletPoints') as FormArray;
  }

  createBulletPointFormControl(): FormControl {
    return this.formBuilder.control('', Validators.required);
  }

  addBulletPoint(): void {
    this.bulletPointsFormArray.push(this.createBulletPointFormControl());
  }

  removeBulletPoint(index: number): void {
    if (this.bulletPointsFormArray.length > 1) {
      this.bulletPointsFormArray.removeAt(index);
    }
  }

  getBulletPointControl(index: number): FormControl {
    return this.bulletPointsFormArray.at(index) as FormControl;
  }

  goBack(): void {
    window.history.back();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    this.success = false;

    if (this.subscriptionForm.invalid) {
      return;
    }

    // Prepare form data according to API requirements
    const formData = {
      title: this.subscriptionForm.value.title,
      price: parseFloat(this.subscriptionForm.value.price),
      discountedPrice: parseFloat(this.subscriptionForm.value.discountedPrice),
      subtitle: this.subscriptionForm.value.subtitle,
      bulletPoints: this.subscriptionForm.value.bulletPoints.filter((point: string) => point.trim() !== ''),
      showImage: this.subscriptionForm.value.showImage || false
    };

    this.loading = true;

    this.http.post(this.apiUrl, formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        console.log('Subscription Plan Created Successfully:', response);
        alert('Subscription plan created successfully!');
        this.resetForm();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error creating subscription plan:', error);
        this.error = error.error?.message || error.message || 'Failed to create subscription plan. Please try again.';
        alert(this.error);
      }
    });
  }

  resetForm(): void {
    this.submitted = false;
    this.error = null;
    this.success = false;
    this.bulletPointsFormArray.clear();
    this.subscriptionForm.reset();
    this.subscriptionForm.patchValue({ 
      rating: '4.8',
      showImage: true
    });
    this.addBulletPoint();
  }
}
