import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { WalletCouponFormDialogComponent } from './wallet-coupon-form-dialog.component';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export interface WalletCouponItem {
  id: string;
  code: string;
  creditAmount: number;
  description?: string;
  maxRedemptions: number | null;
  redeemedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

type CouponFilter = 'all' | 'active' | 'scheduled' | 'draft';
type CouponStatus = 'active' | 'scheduled' | 'draft';
type CouponSort = 'newest' | 'oldest' | 'amount' | 'redemptions';

interface ApiResponse {
  status: string;
  data: WalletCouponItem[];
}

@Component({
  selector: 'app-wallet-coupons-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './wallet-coupons-list.component.html',
  styleUrls: ['./wallet-coupons-list.component.scss'],
})
export class WalletCouponsListComponent implements OnInit, OnDestroy {
  coupons: WalletCouponItem[] = [];
  loading = false;
  error: string | null = null;
  togglingId: string | null = null;
  deletingId: string | null = null;
  filter: CouponFilter = 'all';
  searchQuery = '';
  sortBy: CouponSort = 'newest';
  copiedId: string | null = null;
  private destroy$ = new Subject<void>();

  readonly filterTabs: { key: CouponFilter; label: string }[] = [
    { key: 'all', label: 'All Coupons' },
    { key: 'active', label: 'Active' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'draft', label: 'Drafts' },
  ];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchCoupons();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalCount(): number {
    return this.coupons.length;
  }

  get activeCount(): number {
    return this.coupons.filter((c) => this.getStatus(c) === 'active').length;
  }

  get scheduledCount(): number {
    return this.coupons.filter((c) => this.getStatus(c) === 'scheduled').length;
  }

  get draftCount(): number {
    return this.coupons.filter((c) => this.getStatus(c) === 'draft').length;
  }

  get totalRedemptions(): number {
    return this.coupons.reduce((sum, c) => sum + (c.redeemedCount ?? 0), 0);
  }

  get creditsDisbursed(): number {
    return this.coupons.reduce(
      (sum, c) => sum + (c.redeemedCount ?? 0) * Number(c.creditAmount || 0),
      0,
    );
  }

  get redemptionRate(): number {
    const capacity = this.coupons.reduce((sum, c) => {
      if (c.maxRedemptions == null) return sum + Math.max(c.redeemedCount ?? 0, 1);
      return sum + c.maxRedemptions;
    }, 0);
    if (!capacity) return 0;
    return Math.min(100, Math.round((this.totalRedemptions / capacity) * 100));
  }

  get campaignCapacityPct(): number {
    if (!this.totalCount) return 0;
    return Math.round((this.activeCount / this.totalCount) * 100);
  }

  get topPerformer(): WalletCouponItem | null {
    if (!this.coupons.length) return null;
    return [...this.coupons].sort((a, b) => (b.redeemedCount ?? 0) - (a.redeemedCount ?? 0))[0];
  }

  get topPerformerCredits(): number {
    if (!this.topPerformer) return 0;
    return (this.topPerformer.redeemedCount ?? 0) * Number(this.topPerformer.creditAmount || 0);
  }

  get filteredCoupons(): WalletCouponItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    let list = this.coupons.filter((c) => {
      if (this.filter !== 'all' && this.getStatus(c) !== this.filter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (this.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount':
          return Number(b.creditAmount || 0) - Number(a.creditAmount || 0);
        case 'redemptions':
          return (b.redeemedCount ?? 0) - (a.redeemedCount ?? 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }

  get redeemedCoupons(): WalletCouponItem[] {
    return this.coupons
      .filter((c) => (c.redeemedCount ?? 0) > 0)
      .sort((a, b) => (b.redeemedCount ?? 0) - (a.redeemedCount ?? 0));
  }

  getFilterCount(key: CouponFilter): number {
    if (key === 'all') return this.totalCount;
    if (key === 'active') return this.activeCount;
    if (key === 'scheduled') return this.scheduledCount;
    return this.draftCount;
  }

  setFilter(key: CouponFilter): void {
    this.filter = key;
  }

  getStatus(coupon: WalletCouponItem): CouponStatus {
    const now = Date.now();
    if (coupon.startsAt) {
      const start = new Date(coupon.startsAt).getTime();
      if (!Number.isNaN(start) && start > now) return 'scheduled';
    }
    if (!coupon.active) return 'draft';
    return 'active';
  }

  getStatusLabel(coupon: WalletCouponItem): string {
    const status = this.getStatus(coupon);
    if (status === 'scheduled') return 'Scheduled';
    if (status === 'draft') return 'Draft';
    return 'Active';
  }

  usagePercent(coupon: WalletCouponItem): number {
    const used = coupon.redeemedCount ?? 0;
    if (coupon.maxRedemptions == null || coupon.maxRedemptions <= 0) {
      return used > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((used / coupon.maxRedemptions) * 100));
  }

  usageLabel(coupon: WalletCouponItem): string {
    const used = coupon.redeemedCount ?? 0;
    if (coupon.maxRedemptions == null) return `${used} used · unlimited`;
    return `${used} / ${coupon.maxRedemptions} used`;
  }

  fetchCoupons(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http
      .get(API_ENDPOINTS.WALLET_COUPONS, { responseType: 'text', observe: 'response' })
      .subscribe({
        next: (res) => {
          const bodyText = (res.body ?? '').toString();
          let response: unknown = null;
          if (bodyText.trim().length > 0) {
            try {
              response = JSON.parse(bodyText);
            } catch {
              this.coupons = [];
              this.loading = false;
              this.error = 'API returned non-JSON response.';
              this.cdr.detectChanges();
              return;
            }
          }

          if (
            response &&
            typeof response === 'object' &&
            (response as ApiResponse).status === 'success' &&
            (response as ApiResponse).data
          ) {
            this.coupons = Array.isArray((response as ApiResponse).data)
              ? (response as ApiResponse).data
              : [];
          } else if (Array.isArray(response)) {
            this.coupons = response as WalletCouponItem[];
          } else {
            this.coupons = [];
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error =
            err.error?.message || err.message || 'Failed to fetch wallet coupons.';
          this.coupons = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(WalletCouponFormDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'wallet-coupon-dialog',
      data: null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchCoupons();
    });
  }

  openEditDialog(coupon: WalletCouponItem): void {
    const dialogRef = this.dialog.open(WalletCouponFormDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'wallet-coupon-dialog',
      data: coupon,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchCoupons();
    });
  }

  onToggleChange(coupon: WalletCouponItem): void {
    const active = !coupon.active;
    this.togglingId = coupon.id;
    this.http
      .patch(API_ENDPOINTS.WALLET_COUPON_UPDATE(coupon.id), { active }, { responseType: 'text' })
      .subscribe({
        next: () => {
          coupon.active = active;
          this.togglingId = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.togglingId = null;
          this.cdr.detectChanges();
        },
      });
  }

  deleteCoupon(coupon: WalletCouponItem): void {
    if (!confirm(`Delete wallet coupon "${coupon.code}"?`)) return;
    this.deletingId = coupon.id;
    this.http
      .delete(API_ENDPOINTS.WALLET_COUPON_UPDATE(coupon.id), { responseType: 'text' })
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.fetchCoupons();
        },
        error: () => {
          this.deletingId = null;
          this.cdr.detectChanges();
        },
      });
  }

  copyCode(coupon: WalletCouponItem): void {
    const code = coupon.code || '';
    if (!code) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedId = coupon.id;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.copiedId = null;
          this.cdr.detectChanges();
        }, 1500);
      });
    }
  }

  exportCsv(): void {
    if (!this.coupons.length) return;
    const headers = [
      'Code',
      'Credit Amount',
      'Description',
      'Status',
      'Redeemed',
      'Max Redemptions',
      'Starts At',
      'Expires At',
      'Created At',
    ];
    const rows = this.coupons.map((c) => [
      c.code,
      String(c.creditAmount ?? 0),
      `"${(c.description || '').replace(/"/g, '""')}"`,
      this.getStatusLabel(c),
      String(c.redeemedCount ?? 0),
      c.maxRedemptions == null ? 'unlimited' : String(c.maxRedemptions),
      c.startsAt || '',
      c.expiresAt || '',
      c.createdAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatAmount(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }

  formatAmountFixed(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString?: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
