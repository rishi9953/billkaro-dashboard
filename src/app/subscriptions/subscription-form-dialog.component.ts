import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import { SubscriptionPlan, SubscriptionPlanPlatform } from './subscriptions-list.component';

@Component({
  selector: 'app-subscription-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './subscription-form-dialog.component.html',
  styleUrls: ['./subscription-form-dialog.component.scss']
})
export class SubscriptionFormDialogComponent implements OnInit {
  readonly platformOptions: { value: SubscriptionPlanPlatform; label: string }[] = [
    { value: 'mobile', label: 'Mobile' },
    { value: 'desktop', label: 'Desktop' }
  ];

  subscriptionForm: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  success = false;
  isEditMode = false;
  private apiUrl = API_ENDPOINTS.SUBSCRIPTION_PLANS;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<SubscriptionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionPlan | null
  ) {
    this.subscriptionForm = this.formBuilder.group({
      platform: ['mobile' as SubscriptionPlanPlatform, [Validators.required]],
      title: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      discountedPrice: ['', [Validators.required, Validators.min(0)]],
      tax: ['0', [Validators.min(0), Validators.max(100)]],
      subtitle: ['', [Validators.required]],
      bulletPoints: this.formBuilder.array([], Validators.minLength(1)),
      showImage: [true],
      withPrinter: [false],
      rating: ['4.8', [Validators.min(0), Validators.max(5)]],
      duration: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    if (this.data) {
      // Edit mode - populate form with existing data
      this.isEditMode = true;
      this.populateForm(this.data);
    } else {
      // Create mode - add one empty bullet point
      this.addBulletPoint();
    }
  }

  populateForm(plan: SubscriptionPlan): void {
    // Clear existing bullet points
    while (this.bulletPointsFormArray.length > 0) {
      this.bulletPointsFormArray.removeAt(0);
    }

    // Populate form fields
    this.subscriptionForm.patchValue({
      platform: this.normalizePlatform(plan.platform),
      title: plan.title,
      price: plan.price,
      discountedPrice: plan.discountedPrice,
      tax: plan.tax ?? 0,
      subtitle: plan.subtitle,
      showImage: plan.showImage,
      withPrinter: plan.withPrinter ?? false,
      rating: '4.8', // Default if not in plan
      duration: plan.duration || ''
    });

    // Add bullet points
    if (plan.bulletPoints && plan.bulletPoints.length > 0) {
      plan.bulletPoints.forEach(point => {
        const control = this.createBulletPointFormControl();
        control.setValue(point);
        this.bulletPointsFormArray.push(control);
      });
    } else {
      this.addBulletPoint();
    }
  }

  get f() {
    return this.subscriptionForm.controls;
  }

  private normalizePlatform(value: string | undefined): SubscriptionPlanPlatform {
    return value === 'desktop' ? 'desktop' : 'mobile';
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

  closeDialog(): void {
    this.dialogRef.close();
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
      platform: this.subscriptionForm.value.platform as SubscriptionPlanPlatform,
      title: this.subscriptionForm.value.title,
      price: parseFloat(this.subscriptionForm.value.price),
      discountedPrice: parseFloat(this.subscriptionForm.value.discountedPrice),
      tax: parseFloat(this.subscriptionForm.value.tax) || 0,
      subtitle: this.subscriptionForm.value.subtitle,
      bulletPoints: this.subscriptionForm.value.bulletPoints.filter((point: string) => point.trim() !== ''),
      showImage: this.subscriptionForm.value.showImage || false,
      withPrinter: this.subscriptionForm.value.withPrinter ?? false,
      duration: parseInt(this.subscriptionForm.value.duration, 10)
    };

    this.loading = true;

    // Set headers for JSON content
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.isEditMode && this.data) {
      // Update existing plan using PUT /api/subscription-plans/{id}
      // Note: Backend doesn't support PATCH, using PUT instead
      const updateUrl = API_ENDPOINTS.SUBSCRIPTION_PLAN_UPDATE(this.data.id);
      console.log('Updating subscription plan:', updateUrl);
      console.log('Request payload:', formData);
      this.http.patch(updateUrl, formData, { headers }).subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
          console.log('Subscription Plan Updated Successfully:', response);

          // Close dialog after a short delay to show success message
          setTimeout(() => {
            this.dialogRef.close('success');
          }, 1000);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error updating subscription plan - Full error:', error);
          console.error('Error status:', error.status);
          console.error('Error statusText:', error.statusText);
          console.error('Error message:', error.message);
          console.error('Error body:', error.error);
          
          let errorMessage = 'Failed to update subscription plan. Please try again.';
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          if (error.status === 0) {
            errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and ensure the API server is running.';
          } else if (error.status === 404) {
            errorMessage = 'API endpoint not found. Please verify the API URL is correct.';
          } else if (error.status === 500) {
            errorMessage = 'Server error: ' + (errorMessage || 'Internal server error occurred.');
          }
          
          this.error = errorMessage;
        }
      });
    } else {
      // Create new plan
      console.log('Creating subscription plan:', this.apiUrl);
      console.log('Request payload:', formData);
      this.http.post(this.apiUrl, formData, { headers }).subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
          console.log('Subscription Plan Created Successfully:', response);

          // Close dialog after a short delay to show success message
          setTimeout(() => {
            this.dialogRef.close('success');
          }, 1000);
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creating subscription plan - Full error:', error);
          console.error('Error status:', error.status);
          console.error('Error statusText:', error.statusText);
          console.error('Error message:', error.message);
          console.error('Error body:', error.error);
          
          let errorMessage = 'Failed to create subscription plan. Please try again.';
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          if (error.status === 0) {
            errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and ensure the API server is running.';
          } else if (error.status === 404) {
            errorMessage = 'API endpoint not found. Please verify the API URL is correct.';
          } else if (error.status === 500) {
            errorMessage = 'Server error: ' + (errorMessage || 'Internal server error occurred.');
          } else if (error.status === 400) {
            errorMessage = 'Bad request: ' + (errorMessage || 'Please check your input data.');
          }
          
          this.error = errorMessage;
        }
      });
    }
  }

  resetForm(): void {
    this.submitted = false;
    this.error = null;
    this.success = false;
    this.bulletPointsFormArray.clear();
    this.subscriptionForm.reset();
    this.subscriptionForm.patchValue({
      platform: 'mobile',
      rating: '4.8',
      showImage: true,
      withPrinter: false,
      duration: '',
      tax: '0'
    });
    this.addBulletPoint();
  }
}


