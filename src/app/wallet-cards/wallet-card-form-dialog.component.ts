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
import { WalletCardItem } from './wallet-cards-list.component';

@Component({
  selector: 'app-wallet-card-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './wallet-card-form-dialog.component.html',
  styleUrls: ['./wallet-card-form-dialog.component.scss'],
})
export class WalletCardFormDialogComponent implements OnInit {
  cardForm: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<WalletCardFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WalletCardItem | null
  ) {
    this.isEditMode = !!data;
    this.cardForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
      amount: [null, [Validators.required, Validators.min(1)]],
      bonusAmount: [0, [Validators.min(0)]],
      description: ['', [Validators.maxLength(300)]],
      cardColor: ['#1976D2'],
      sortOrder: [0, [Validators.min(0)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.cardForm.patchValue({
        title: this.data.title,
        amount: this.data.amount,
        bonusAmount: this.data.bonusAmount ?? 0,
        description: this.data.description ?? '',
        cardColor: this.data.cardColor ?? '#1976D2',
        sortOrder: this.data.sortOrder ?? 0,
        active: this.data.active,
      });
    }
  }

  get f() {
    return this.cardForm.controls;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    if (this.cardForm.invalid) return;

    this.loading = true;
    const payload = {
      title: this.cardForm.get('title')?.value?.trim(),
      amount: Number(this.cardForm.get('amount')?.value),
      bonusAmount: Number(this.cardForm.get('bonusAmount')?.value ?? 0),
      description: this.cardForm.get('description')?.value?.trim() ?? '',
      cardColor: this.cardForm.get('cardColor')?.value ?? '#1976D2',
      sortOrder: Number(this.cardForm.get('sortOrder')?.value ?? 0),
      active: this.cardForm.get('active')?.value ?? true,
    };

    const request$ =
      this.isEditMode && this.data
        ? this.http.patch(API_ENDPOINTS.WALLET_CARD_UPDATE(this.data.id), payload, {
            responseType: 'text',
          })
        : this.http.post(API_ENDPOINTS.WALLET_CARDS, payload, { responseType: 'text' });

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close('success');
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err.error?.message || err.message || 'Failed to save wallet card.';
      },
    });
  }
}
