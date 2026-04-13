import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { SubscriptionFormDialogComponent } from './subscription-form-dialog.component';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export type SubscriptionPlanPlatform = 'mobile' | 'desktop';

export interface SubscriptionPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  price: number;
  discountedPrice: number;
  subtitle: string;
  bulletPoints: string[];
  showImage: boolean;
  duration: number; // Duration in months
  tax?: number; // Tax percentage (e.g., 18 for 18%)
  withPrinter?: boolean;
  platform?: SubscriptionPlanPlatform;
}

interface ApiResponse {
  status: string;
  data: SubscriptionPlan[];
}

@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './subscriptions-list.component.html',
  styleUrls: ['./subscriptions-list.component.scss']
})
export class SubscriptionsListComponent implements OnInit, OnDestroy {
  subscriptionPlans: SubscriptionPlan[] = [];
  loading = false;
  error: string | null = null;
  private apiUrl = API_ENDPOINTS.SUBSCRIPTION_PLANS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchSubscriptionPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchSubscriptionPlans(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges(); // Force change detection

    // NOTE: When the backend (or proxy) returns HTML/plain text (e.g., 404/502 page),
    // Angular's default JSON parsing throws: "Http failure during parsing".
    // We fetch as text and parse JSON manually so we can show the real response.
    this.http.get(this.apiUrl, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();
        const contentType = res.headers.get('content-type') || '';

        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            console.warn('Subscription plans API returned non-JSON', {
              status: res.status,
              contentType,
              bodyPreview: bodyText.slice(0, 300)
            });
            this.subscriptionPlans = [];
            this.loading = false;
            this.error =
              `API returned non-JSON (status ${res.status}). ` +
              (contentType ? `Content-Type: ${contentType}. ` : '') +
              `Response: ${bodyText.slice(0, 300)}`;
            this.cdr.detectChanges();
            return;
          }
        }

        console.log('Subscription plans API response:', response);

        // Handle different response formats
        if (response && typeof response === 'object' && (response as ApiResponse).status === 'success' && (response as ApiResponse).data) {
          this.subscriptionPlans = Array.isArray((response as ApiResponse).data) ? (response as ApiResponse).data : [];
        } else if (Array.isArray(response)) {
          // If response is directly an array
          this.subscriptionPlans = response as SubscriptionPlan[];
        } else if (response && typeof response === 'object' && (response as any).data) {
          // If response has data but different structure
          this.subscriptionPlans = Array.isArray((response as any).data) ? (response as any).data : [];
        } else {
          console.warn('Unexpected response format:', response);
          this.subscriptionPlans = [];
        }

        this.loading = false;
        this.cdr.detectChanges(); // Force change detection after updating
      },
      error: (error) => {
        console.error('Error fetching subscription plans:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch subscription plans. Please try again later.';
        this.subscriptionPlans = [];
        this.loading = false;
        this.cdr.detectChanges(); // Force change detection on error
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubscriptionFormDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'subscription-dialog',
      data: null // No data means create mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.fetchSubscriptionPlans();
      }
    });
  }

  openEditDialog(plan: SubscriptionPlan): void {
    const dialogRef = this.dialog.open(SubscriptionFormDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'subscription-dialog',
      data: plan // Pass the plan data for edit mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.fetchSubscriptionPlans();
      }
    });
  }

  getPlatformLabel(plan: SubscriptionPlan): string {
    return plan.platform === 'desktop' ? 'Desktop' : 'Mobile';
  }

  formatPrice(price: number): string {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}


