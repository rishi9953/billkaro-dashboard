import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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

interface ApiResponse {
  status: string;
  data: WalletCouponItem[];
}

@Component({
  selector: 'app-wallet-coupons-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
  ],
  templateUrl: './wallet-coupons-list.component.html',
  styleUrls: ['./wallet-coupons-list.component.scss'],
})
export class WalletCouponsListComponent implements OnInit, OnDestroy {
  coupons: WalletCouponItem[] = [];
  loading = false;
  error: string | null = null;
  togglingId: string | null = null;
  deletingId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchCoupons();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  onToggleChange(coupon: WalletCouponItem, active: boolean): void {
    this.togglingId = coupon.id;
    this.http
      .patch(
        API_ENDPOINTS.WALLET_COUPON_UPDATE(coupon.id),
        { active },
        { responseType: 'text' }
      )
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

  formatAmount(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  usageLabel(coupon: WalletCouponItem): string {
    const used = coupon.redeemedCount ?? 0;
    if (coupon.maxRedemptions == null) return `${used} used · unlimited`;
    return `${used} / ${coupon.maxRedemptions} used`;
  }
}
