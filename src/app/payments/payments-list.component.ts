import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  paymentType?: 'subscription' | 'wallet';
}

interface PaymentsApiResponse {
  status: string;
  message?: string;
  data: Payment[];
  totalItems: number;
}

type TypeFilter = 'all' | 'subscription' | 'wallet';
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';
type VerifiedFilter = 'all' | 'yes' | 'no';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, NumberPaginatorComponent],
  templateUrl: './payments-list.component.html',
  styleUrls: ['./payments-list.component.scss'],
})
export class PaymentsListComponent implements OnInit, OnDestroy {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  pagedPayments: Payment[] = [];
  totalItems = 0;
  loading = false;
  error: string | null = null;

  typeFilter: TypeFilter = 'all';
  statusFilter: StatusFilter = 'all';
  verifiedFilter: VerifiedFilter = 'all';
  methodFilter = '';
  searchQuery = '';
  pageIndex = 0;
  readonly pageSize = 10;
  selectedIds = new Set<string>();

  readonly typeTabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'All Types' },
    { key: 'wallet', label: 'Wallet Recharges' },
    { key: 'subscription', label: 'Subscription Fees' },
  ];

  readonly statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
  ];

  private apiUrl = API_ENDPOINTS.PAYMENTS_ADMIN_ALL;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchPayments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get uniqueMethods(): string[] {
    const set = new Set<string>();
    this.payments.forEach((p) => {
      const m = this.getMethodLabel(p);
      if (m && m !== '—') set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  get totalVolume(): number {
    return this.payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get completedAmount(): number {
    return this.payments
      .filter((p) => this.isCompletedStatus(p.status ?? ''))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get completedCountAll(): number {
    return this.payments.filter((p) => this.isCompletedStatus(p.status ?? '')).length;
  }

  get completedRate(): string {
    if (!this.payments.length) return '0';
    return Math.round((this.completedCountAll / this.payments.length) * 100).toString();
  }

  get verifiedCount(): number {
    return this.payments.filter((p) => p.verified).length;
  }

  get walletAmount(): number {
    return this.payments
      .filter((p) => this.isWalletPayment(p))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get walletCountAll(): number {
    return this.payments.filter((p) => this.isWalletPayment(p)).length;
  }

  get walletAvg(): number {
    if (!this.walletCountAll) return 0;
    return this.walletAmount / this.walletCountAll;
  }

  get subscriptionAmount(): number {
    return this.payments
      .filter((p) => !this.isWalletPayment(p))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get subscriptionCountAll(): number {
    return this.payments.filter((p) => !this.isWalletPayment(p)).length;
  }

  get failedAmount(): number {
    return this.payments
      .filter((p) => this.isFailedStatus(p.status ?? ''))
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  get failedCountAll(): number {
    return this.payments.filter((p) => this.isFailedStatus(p.status ?? '')).length;
  }

  get allPageSelected(): boolean {
    return this.pagedPayments.length > 0 && this.pagedPayments.every((p) => this.selectedIds.has(p.id));
  }

  get showingFrom(): number {
    if (!this.filteredPayments.length) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredPayments.length);
  }

  fetchPayments(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(this.apiUrl, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();
        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            this.payments = [];
            this.filteredPayments = [];
            this.pagedPayments = [];
            this.totalItems = 0;
            this.loading = false;
            this.error = `API returned non-JSON (status ${res.status}).`;
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
        this.selectedIds.clear();
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error =
          error.error?.message || error.message || 'Failed to fetch payments. Please try again later.';
        this.payments = [];
        this.filteredPayments = [];
        this.pagedPayments = [];
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportCsv(): void {
    const rows = [
      ['Transaction ID', 'Type', 'Business', 'Email', 'Amount', 'Method', 'Status', 'Verified', 'Date'],
      ...this.filteredPayments.map((p) => [
        p.transactionId || p.id,
        this.getPaymentTypeLabel(p),
        p.user?.brandName || '',
        p.user?.email || '',
        String(p.amount ?? 0),
        this.getMethodLabel(p),
        p.status || '',
        p.verified ? 'Yes' : 'No',
        this.formatDate(p.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatAmount(amount: number, currency = 'INR'): string {
    if (currency === 'INR') {
      return `₹${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }

  formatAmountShort(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    if (this.isWalletPayment(payment)) return 'Wallet Recharge';
    return payment.method || '—';
  }

  setTypeFilter(type: TypeFilter): void {
    this.typeFilter = type;
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter = status;
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onSecondaryFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.typeFilter = 'all';
    this.statusFilter = 'all';
    this.verifiedFilter = 'all';
    this.methodFilter = '';
    this.searchQuery = '';
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  toggleSelectAll(): void {
    if (this.allPageSelected) {
      this.pagedPayments.forEach((p) => this.selectedIds.delete(p.id));
    } else {
      this.pagedPayments.forEach((p) => this.selectedIds.add(p.id));
    }
    this.cdr.detectChanges();
  }

  toggleSelect(payment: Payment, event: Event): void {
    event.stopPropagation();
    if (this.selectedIds.has(payment.id)) this.selectedIds.delete(payment.id);
    else this.selectedIds.add(payment.id);
    this.cdr.detectChanges();
  }

  getTypeCount(type: TypeFilter): number {
    if (type === 'all') return this.payments.length;
    if (type === 'wallet') return this.payments.filter((p) => this.isWalletPayment(p)).length;
    return this.payments.filter((p) => !this.isWalletPayment(p)).length;
  }

  getStatusCount(status: StatusFilter): number {
    const scoped = this.paymentsForTypeFilter;
    if (status === 'all') return scoped.length;
    return scoped.filter((p) => this.matchesStatusFilter(p, status)).length;
  }

  private get paymentsForTypeFilter(): Payment[] {
    if (this.typeFilter === 'wallet') return this.payments.filter((p) => this.isWalletPayment(p));
    if (this.typeFilter === 'subscription') return this.payments.filter((p) => !this.isWalletPayment(p));
    return this.payments;
  }

  private applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredPayments = this.payments.filter((payment) => {
      if (this.typeFilter === 'wallet' && !this.isWalletPayment(payment)) return false;
      if (this.typeFilter === 'subscription' && this.isWalletPayment(payment)) return false;
      if (this.statusFilter !== 'all' && !this.matchesStatusFilter(payment, this.statusFilter)) return false;
      if (this.verifiedFilter === 'yes' && !payment.verified) return false;
      if (this.verifiedFilter === 'no' && payment.verified) return false;
      if (this.methodFilter && this.getMethodLabel(payment) !== this.methodFilter) return false;
      if (q) {
        const haystack = [
          payment.transactionId,
          payment.id,
          payment.user?.email,
          payment.user?.brandName,
          payment.method,
          payment.metadata?.outletName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const maxPage = Math.max(0, Math.ceil(this.filteredPayments.length / this.pageSize) - 1);
    if (this.pageIndex > maxPage) this.pageIndex = maxPage;
    this.applyPagination();
  }

  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedPayments = this.filteredPayments.slice(start, start + this.pageSize);
  }

  private matchesStatusFilter(payment: Payment, status: 'completed' | 'pending' | 'failed'): boolean {
    if (status === 'completed') return this.isCompletedStatus(payment.status ?? '');
    if (status === 'failed') return this.isFailedStatus(payment.status ?? '');
    return this.isPendingStatus(payment.status ?? '');
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
    return (status || '').toLowerCase() === 'pending';
  }
}
