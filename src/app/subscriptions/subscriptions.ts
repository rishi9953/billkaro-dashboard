import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
      rating: ['4.8', [Validators.min(0), Validators.max(5)]],
      duration: ['', [Validators.required, Validators.min(1)]]
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
      showImage: this.subscriptionForm.value.showImage || false,
      duration: parseInt(this.subscriptionForm.value.duration, 10)
    };

    this.loading = true;

    // Set headers for JSON content
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    console.log('Creating subscription plan:', this.apiUrl);
    console.log('Request payload:', formData);
    
    this.http.post(this.apiUrl, formData, { headers }).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        console.log('Subscription Plan Created Successfully:', response);
        alert('Subscription plan created successfully!');
        this.resetForm();
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
      showImage: true,
      duration: ''
    });
    this.addBulletPoint();
  }
}
