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
  duration: number;
  tax?: number;
  withPrinter?: boolean;
  platform?: SubscriptionPlanPlatform;
}

interface ApiResponse {
  status: string;
  data: SubscriptionPlan[];
}

type PlanFilter = 'all' | 'desktop' | 'mobile' | 'hardware';

@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './subscriptions-list.component.html',
  styleUrls: ['./subscriptions-list.component.scss'],
})
export class SubscriptionsListComponent implements OnInit, OnDestroy {
  subscriptionPlans: SubscriptionPlan[] = [];
  filteredPlans: SubscriptionPlan[] = [];
  loading = false;
  error: string | null = null;
  activeFilter: PlanFilter = 'all';
  merchantSubscriptions = 0;

  readonly filterTabs: { key: PlanFilter; label: string }[] = [
    { key: 'all', label: 'All Plans' },
    { key: 'desktop', label: 'Desktop Plans' },
    { key: 'mobile', label: 'Mobile Plans' },
    { key: 'hardware', label: 'Hardware Bundled' },
  ];

  private apiUrl = API_ENDPOINTS.SUBSCRIPTION_PLANS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchSubscriptionPlans();
    this.fetchMerchantCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPlans(): number {
    return this.subscriptionPlans.length;
  }

  get desktopCount(): number {
    return this.subscriptionPlans.filter((p) => (p.platform || 'mobile') === 'desktop').length;
  }

  get mobileCount(): number {
    return this.subscriptionPlans.filter((p) => (p.platform || 'mobile') === 'mobile').length;
  }

  get hardwareCount(): number {
    return this.subscriptionPlans.filter((p) => !!p.withPrinter).length;
  }

  get mostPopularTitle(): string {
    const popular = this.getPopularPlan();
    return popular?.title || '—';
  }

  getFilterCount(key: PlanFilter): number {
    if (key === 'all') return this.totalPlans;
    if (key === 'desktop') return this.desktopCount;
    if (key === 'mobile') return this.mobileCount;
    return this.hardwareCount;
  }

  setFilter(key: PlanFilter): void {
    this.activeFilter = key;
    this.applyFilter();
    this.cdr.detectChanges();
  }

  isPopular(plan: SubscriptionPlan): boolean {
    const popular = this.getPopularPlan();
    return !!popular && popular.id === plan.id;
  }

  getSavings(plan: SubscriptionPlan): number {
    return Math.max(0, Number(plan.price || 0) - Number(plan.discountedPrice || 0));
  }

  fetchSubscriptionPlans(): void {
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
            this.subscriptionPlans = [];
            this.filteredPlans = [];
            this.loading = false;
            this.error = `API returned non-JSON (status ${res.status}).`;
            this.cdr.detectChanges();
            return;
          }
        }

        if (response && typeof response === 'object' && (response as ApiResponse).status === 'success' && (response as ApiResponse).data) {
          this.subscriptionPlans = Array.isArray((response as ApiResponse).data) ? (response as ApiResponse).data : [];
        } else if (Array.isArray(response)) {
          this.subscriptionPlans = response as SubscriptionPlan[];
        } else if (response && typeof response === 'object' && (response as { data?: unknown }).data) {
          const data = (response as { data: unknown }).data;
          this.subscriptionPlans = Array.isArray(data) ? data : [];
        } else {
          this.subscriptionPlans = [];
        }

        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.error =
          error.error?.message || error.message || 'Failed to fetch subscription plans. Please try again later.';
        this.subscriptionPlans = [];
        this.filteredPlans = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportPlans(): void {
    const rows = [
      ['Title', 'Platform', 'With Printer', 'Price', 'Discounted', 'Savings', 'Subtitle', 'Created'],
      ...this.filteredPlans.map((p) => [
        p.title,
        this.getPlatformLabel(p),
        p.withPrinter ? 'Yes' : 'No',
        String(p.price ?? 0),
        String(p.discountedPrice ?? 0),
        String(this.getSavings(p)),
        p.subtitle || '',
        this.formatDate(p.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-plans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubscriptionFormDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'subscription-dialog',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchSubscriptionPlans();
    });
  }

  openEditDialog(plan: SubscriptionPlan): void {
    const dialogRef = this.dialog.open(SubscriptionFormDialogComponent, {
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'subscription-dialog',
      data: plan,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchSubscriptionPlans();
    });
  }

  getPlatformLabel(plan: SubscriptionPlan): string {
    return plan.platform === 'desktop' ? 'Desktop' : 'Mobile';
  }

  formatPrice(price: number): string {
    return `₹${Number(price || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private applyFilter(): void {
    let list = [...this.subscriptionPlans];
    if (this.activeFilter === 'desktop') {
      list = list.filter((p) => (p.platform || 'mobile') === 'desktop');
    } else if (this.activeFilter === 'mobile') {
      list = list.filter((p) => (p.platform || 'mobile') === 'mobile');
    } else if (this.activeFilter === 'hardware') {
      list = list.filter((p) => !!p.withPrinter);
    }
    this.filteredPlans = list;
  }

  /** Prefer hardware bundle with highest savings as "popular". */
  private getPopularPlan(): SubscriptionPlan | null {
    const hardware = this.subscriptionPlans.filter((p) => !!p.withPrinter);
    const pool = hardware.length ? hardware : this.subscriptionPlans;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => this.getSavings(b) - this.getSavings(a))[0] ?? null;
  }

  private fetchMerchantCount(): void {
    this.http
      .get<{ activeSubscriptions?: number; data?: { activeSubscriptions?: number } }>(
        API_ENDPOINTS.DASHBOARD_OVERVIEW,
      )
      .subscribe({
        next: (res) => {
          const overview = res?.data ?? res;
          this.merchantSubscriptions = overview?.activeSubscriptions ?? 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.merchantSubscriptions = 0;
        },
      });
  }
}
