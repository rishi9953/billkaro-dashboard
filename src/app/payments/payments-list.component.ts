import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import { NumberPaginatorComponent } from '../shared/components/number-paginator/number-paginator.component';

export interface PaymentUser {
  id: string;
  email: string;
  brandName: string;
}

export interface PaymentMetadata {
  id?: string;
  status?: string;
  method?: string;
  bonusAmount?: number;
  creditedAmount?: number;
  outletId?: string;
  outletName?: string | null;
  description?: string;
  razorpayOrderId?: string;
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
  /** subscription = plan purchase; wallet = outlet wallet recharge */
  paymentType?: 'subscription' | 'wallet';
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
  imports: [CommonModule, MatIconModule, NumberPaginatorComponent],
  templateUrl: './payments-list.component.html',
  styleUrls: ['./payments-list.component.scss']
})
export class PaymentsListComponent implements OnInit, OnDestroy {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  pagedPayments: Payment[] = [];
  totalItems = 0;
  loading = false;
  error: string | null = null;
  typeFilter: 'all' | 'subscription' | 'wallet' = 'all';
  statusFilter: 'all' | 'completed' | 'pending' | 'failed' = 'all';
  pageIndex = 0;
  readonly pageSize = 10;

  readonly typeTabs: { key: 'all' | 'subscription' | 'wallet'; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'payments' },
    { key: 'subscription', label: 'Subscription', icon: 'card_membership' },
    { key: 'wallet', label: 'Wallet', icon: 'account_balance_wallet' },
  ];

  readonly statusTabs: { key: 'all' | 'completed' | 'pending' | 'failed'; label: string; icon: string }[] = [
    { key: 'all', label: 'All statuses', icon: 'tune' },
    { key: 'completed', label: 'Completed', icon: 'check_circle' },
    { key: 'pending', label: 'Pending', icon: 'schedule' },
    { key: 'failed', label: 'Failed', icon: 'cancel' },
  ];

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
            this.filteredPayments = [];
            this.pagedPayments = [];
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

        this.pageIndex = 0;
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching payments:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch payments. Please try again later.';
        this.payments = [];
        this.filteredPayments = [];
        this.pagedPayments = [];
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

  isWalletPayment(payment: Payment): boolean {
    return payment.paymentType === 'wallet' || payment.method === 'wallet';
  }

  getPaymentTypeLabel(payment: Payment): string {
    return this.isWalletPayment(payment) ? 'Wallet' : 'Subscription';
  }

  getPaymentTypeClass(payment: Payment): string {
    return this.isWalletPayment(payment) ? 'type-wallet' : 'type-subscription';
  }

  getMethodLabel(payment: Payment): string {
    if (this.isWalletPayment(payment)) {
      return 'Wallet recharge';
    }
    return payment.method || '—';
  }

  setTypeFilter(type: 'all' | 'subscription' | 'wallet'): void {
    this.typeFilter = type;
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  setStatusFilter(status: 'all' | 'completed' | 'pending' | 'failed'): void {
    this.statusFilter = status;
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.typeFilter = 'all';
    this.statusFilter = 'all';
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  get hasActiveFilters(): boolean {
    return this.typeFilter !== 'all' || this.statusFilter !== 'all';
  }

  private applyFilters(): void {
    this.filteredPayments = this.payments.filter((payment) => {
      if (this.typeFilter === 'wallet' && !this.isWalletPayment(payment)) return false;
      if (this.typeFilter === 'subscription' && this.isWalletPayment(payment)) return false;
      if (this.statusFilter !== 'all' && !this.matchesStatusFilter(payment, this.statusFilter)) {
        return false;
      }
      return true;
    });

    const maxPage = Math.max(0, Math.ceil(this.filteredPayments.length / this.pageSize) - 1);
    if (this.pageIndex > maxPage) {
      this.pageIndex = maxPage;
    }
    this.applyPagination();
  }

  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedPayments = this.filteredPayments.slice(start, start + this.pageSize);
  }

  private matchesStatusFilter(
    payment: Payment,
    status: 'completed' | 'pending' | 'failed'
  ): boolean {
    if (status === 'completed') return this.isCompletedStatus(payment.status ?? '');
    if (status === 'failed') return this.isFailedStatus(payment.status ?? '');
    return this.isPendingStatus(payment.status ?? '');
  }

  getTypeCount(type: 'all' | 'subscription' | 'wallet'): number {
    if (type === 'all') return this.payments.length;
    if (type === 'wallet') return this.payments.filter((p) => this.isWalletPayment(p)).length;
    return this.payments.filter((p) => !this.isWalletPayment(p)).length;
  }

  getStatusCount(status: 'all' | 'completed' | 'pending' | 'failed'): number {
    const scoped = this.paymentsForTypeFilter;
    if (status === 'all') return scoped.length;
    return scoped.filter((p) => this.matchesStatusFilter(p, status)).length;
  }

  private get paymentsForTypeFilter(): Payment[] {
    if (this.typeFilter === 'wallet') return this.payments.filter((p) => this.isWalletPayment(p));
    if (this.typeFilter === 'subscription') {
      return this.payments.filter((p) => !this.isWalletPayment(p));
    }
    return this.payments;
  }

  /** Sum of amounts currently shown (respects filters). */
  get totalAmount(): number {
    return this.filteredPayments.reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }

  private isCompletedStatus(status: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'captured';
  }

  private isFailedStatus(status: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'failed' || s === 'cancelled' || s === 'rejected';
  }

  private isPendingStatus(status: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'pending';
  }

  get completedCount(): number {
    return this.filteredPayments.filter((p) => this.isCompletedStatus(p?.status ?? '')).length;
  }

  get failedCount(): number {
    return this.filteredPayments.filter((p) => this.isFailedStatus(p?.status ?? '')).length;
  }

  get totalCompletedAmount(): number {
    return this.filteredPayments
      .filter((p) => this.isCompletedStatus(p?.status ?? ''))
      .reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }

  get walletCount(): number {
    return this.filteredPayments.filter((p) => this.isWalletPayment(p)).length;
  }

  get totalWalletAmount(): number {
    return this.filteredPayments
      .filter((p) => this.isWalletPayment(p))
      .reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }

  get totalFailedAmount(): number {
    return this.filteredPayments
      .filter((p) => this.isFailedStatus(p?.status ?? ''))
      .reduce((sum, p) => sum + (p?.amount ?? 0), 0);
  }
}
