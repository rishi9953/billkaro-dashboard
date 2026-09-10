import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import { WalletCouponItem } from './wallet-coupons-list.component';

@Component({
  selector: 'app-wallet-coupon-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './wallet-coupon-form-dialog.component.html',
  styleUrls: ['./wallet-coupon-form-dialog.component.scss'],
})
export class WalletCouponFormDialogComponent implements OnInit {
  couponForm: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<WalletCouponFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WalletCouponItem | null
  ) {
    this.isEditMode = !!data;
    this.couponForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      creditAmount: [null, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.maxLength(300)]],
      maxRedemptions: [null, [Validators.min(1)]],
      startsAt: [''],
      expiresAt: [''],
      active: [true],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.couponForm.patchValue({
        code: this.data.code,
        creditAmount: this.data.creditAmount,
        description: this.data.description ?? '',
        maxRedemptions: this.data.maxRedemptions ?? null,
        startsAt: this.toDateInput(this.data.startsAt),
        expiresAt: this.toDateInput(this.data.expiresAt),
        active: this.data.active,
      });
    }
  }

  get f() {
    return this.couponForm.controls;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  private toIsoOrNull(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return null;
    const d = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    if (this.couponForm.invalid) return;

    this.loading = true;
    const maxRaw = this.couponForm.get('maxRedemptions')?.value;
    const payload = {
      code: String(this.couponForm.get('code')?.value ?? '')
        .trim()
        .toUpperCase(),
      creditAmount: Number(this.couponForm.get('creditAmount')?.value),
      description: this.couponForm.get('description')?.value?.trim() ?? '',
      maxRedemptions:
        maxRaw === null || maxRaw === undefined || maxRaw === ''
          ? null
          : Number(maxRaw),
      startsAt: this.toIsoOrNull(this.couponForm.get('startsAt')?.value),
      expiresAt: this.toIsoOrNull(this.couponForm.get('expiresAt')?.value),
      active: this.couponForm.get('active')?.value ?? true,
    };

    const request$ =
      this.isEditMode && this.data
        ? this.http.patch(API_ENDPOINTS.WALLET_COUPON_UPDATE(this.data.id), payload, {
            responseType: 'text',
          })
        : this.http.post(API_ENDPOINTS.WALLET_COUPONS, payload, { responseType: 'text' });

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close('success');
      },
      error: (err) => {
        this.loading = false;
        let message = 'Failed to save wallet coupon.';
        const body = err.error;
        if (typeof body === 'string' && body.trim()) {
          try {
            const parsed = JSON.parse(body);
            message = parsed.message || message;
          } catch {
            message = body;
          }
        } else if (body?.message) {
          message = body.message;
        } else if (err.message) {
          message = err.message;
        }
        this.error = message;
      },
    });
  }
}
