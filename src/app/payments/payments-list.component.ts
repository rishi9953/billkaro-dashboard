import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export interface PaymentUser {
  id: string;
  email: string;
  brandName: string;
}

export interface PaymentMetadata {
  id?: string;
  status?: string;
  method?: string;
  [key: string]: unknown;
}

export interface Payment {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  metadata?: PaymentMetadata;
  verified: boolean;
  user?: PaymentUser;
}

interface PaymentsApiResponse {
  status: string;
  message?: string;
  data: Payment[];
  totalItems: number;
}

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './payments-list.component.html',
  styleUrls: ['./payments-list.component.scss']
})
export class PaymentsListComponent implements OnInit, OnDestroy {
  payments: Payment[] = [];
  totalItems = 0;
  loading = false;
  error: string | null = null;
  private apiUrl = API_ENDPOINTS.PAYMENTS_ADMIN_ALL;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchPayments(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(this.apiUrl, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();
        const contentType = res.headers.get('content-type') || '';

        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            console.warn('Payments API returned non-JSON', {
              status: res.status,
              contentType,
              bodyPreview: bodyText.slice(0, 300)
            });
            this.payments = [];
            this.totalItems = 0;
            this.loading = false;
            this.error =
              `API returned non-JSON (status ${res.status}). ` +
              (contentType ? `Content-Type: ${contentType}. ` : '') +
              `Response: ${bodyText.slice(0, 300)}`;
            this.cdr.detectChanges();
            return;
          }
        }

        const apiRes = response as PaymentsApiResponse;
        if (apiRes?.status === 'success' && Array.isArray(apiRes.data)) {
          this.payments = apiRes.data;
          this.totalItems = apiRes.totalItems ?? apiRes.data.length;
        } else if (response && typeof response === 'object' && (response as { data?: Payment[] }).data) {
          const data = (response as { data: Payment[] }).data;
          this.payments = Array.isArray(data) ? data : [];
          this.totalItems = (response as { totalItems?: number }).totalItems ?? this.payments.length;
        } else {
          this.payments = [];
          this.totalItems = 0;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching payments:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch payments. Please try again later.';
        this.payments = [];
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatAmount(amount: number, currency: string): string {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'captured') return 'status-completed';
    if (s === 'pending') return 'status-pending';
    if (s === 'failed' || s === 'cancelled') return 'status-failed';
    return 'status-default';
  }

  /** Sum of all payment amounts (uses INR for display when mixed currencies). */
  get totalAmount(): number {
    return this.payments.reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }

  private isCompletedStatus(status: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'captured';
  }

  private isFailedStatus(status: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'failed' || s === 'cancelled';
  }

  /** Count of completed/captured payments. */
  get completedCount(): number {
    return this.payments.filter((p) => this.isCompletedStatus(p?.status ?? '')).length;
  }

  /** Count of failed/cancelled payments. */
  get failedCount(): number {
    return this.payments.filter((p) => this.isFailedStatus(p?.status ?? '')).length;
  }

  /** Sum of amounts for completed/captured payments. */
  get totalCompletedAmount(): number {
    return this.payments
      .filter((p) => this.isCompletedStatus(p?.status ?? ''))
      .reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }

  /** Sum of amounts for failed/cancelled payments. */
  get totalFailedAmount(): number {
    return this.payments
      .filter((p) => this.isFailedStatus(p?.status ?? ''))
      .reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }
}
