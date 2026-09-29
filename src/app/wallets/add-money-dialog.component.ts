import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import { WalletCardItem } from '../wallet-cards/wallet-cards-list.component';

export interface AddMoneyDialogData {
  userId?: string;
  outletId?: string;
}

interface OutletOption {
  id: string;
  businessName: string;
  phoneNumber?: string;
}

interface UserOption {
  id: string;
  brandName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  outletData: OutletOption[];
}

interface UsersApiResponse {
  status: string;
  data: UserOption[];
}

interface CardsApiResponse {
  status: string;
  data: WalletCardItem[];
}

@Component({
  selector: 'app-add-money-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './add-money-dialog.component.html',
  styleUrls: ['./add-money-dialog.component.scss'],
})
export class AddMoneyDialogComponent implements OnInit {
  form: FormGroup;
  users: UserOption[] = [];
  outlets: OutletOption[] = [];
  cards: WalletCardItem[] = [];
  filteredUsers: UserOption[] = [];
  userSearch = '';
  amountMode: 'preset' | 'custom' = 'custom';
  selectedCardId: string | null = null;
  submitted = false;
  loading = false;
  loadingUsers = false;
  loadingCards = false;
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<AddMoneyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddMoneyDialogData | null,
  ) {
    this.form = this.formBuilder.group({
      userId: ['', Validators.required],
      outletId: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
      description: ['Admin wallet credit', [Validators.required, Validators.maxLength(300)]],
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
    this.fetchCards();

    this.form.get('userId')?.valueChanges.subscribe((userId: string) => {
      this.onUserSelected(userId);
    });
  }

  get f() {
    return this.form.controls;
  }

  get selectedUser(): UserOption | undefined {
    return this.users.find((u) => u.id === this.form.get('userId')?.value);
  }

  get creditPreview(): number {
    const amount = Number(this.form.get('amount')?.value || 0);
    if (this.amountMode === 'preset' && this.selectedCardId) {
      const card = this.cards.find((c) => c.id === this.selectedCardId);
      if (card) return Number(card.amount || 0) + Number(card.bonusAmount || 0);
    }
    return amount;
  }

  fetchUsers(): void {
    this.loadingUsers = true;
    this.http.get(API_ENDPOINTS.USERS, { responseType: 'text' }).subscribe({
      next: (body) => {
        try {
          const parsed = JSON.parse(body || '{}') as UsersApiResponse | UserOption[];
          if (Array.isArray(parsed)) {
            this.users = parsed;
          } else if (parsed?.status === 'success' && Array.isArray(parsed.data)) {
            this.users = parsed.data;
          } else {
            this.users = [];
          }
        } catch {
          this.users = [];
        }
        this.applyUserFilter();
        this.loadingUsers = false;

        if (this.data?.userId) {
          this.form.patchValue({ userId: this.data.userId });
          this.onUserSelected(this.data.userId);
          if (this.data.outletId) {
            this.form.patchValue({ outletId: this.data.outletId });
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingUsers = false;
        this.error = 'Failed to load users.';
        this.cdr.detectChanges();
      },
    });
  }

  fetchCards(): void {
    this.loadingCards = true;
    this.http.get(API_ENDPOINTS.WALLET_CARDS, { responseType: 'text' }).subscribe({
      next: (body) => {
        try {
          const parsed = JSON.parse(body || '{}') as CardsApiResponse | WalletCardItem[];
          let list: WalletCardItem[] = [];
          if (Array.isArray(parsed)) {
            list = parsed;
          } else if (parsed?.status === 'success' && Array.isArray(parsed.data)) {
            list = parsed.data;
          }
          this.cards = list
            .filter((c) => c.active)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        } catch {
          this.cards = [];
        }
        this.loadingCards = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cards = [];
        this.loadingCards = false;
        this.cdr.detectChanges();
      },
    });
  }

  onUserSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.userSearch = value;
    this.applyUserFilter();
  }

  applyUserFilter(): void {
    const q = this.userSearch.trim().toLowerCase();
    if (!q) {
      this.filteredUsers = [...this.users];
      return;
    }
    this.filteredUsers = this.users.filter((u) => {
      const haystack = [
        u.brandName,
        u.firstName,
        u.lastName,
        u.email,
        u.mobile,
        ...(u.outletData || []).map((o) => o.businessName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  onUserSelected(userId: string): void {
    const user = this.users.find((u) => u.id === userId);
    this.outlets = user?.outletData ?? [];
    const keepOutlet =
      this.data?.outletId &&
      this.outlets.some((o) => o.id === this.data?.outletId) &&
      this.form.get('userId')?.value === this.data?.userId;

    if (keepOutlet) {
      this.form.patchValue({ outletId: this.data!.outletId });
    } else if (this.outlets.length === 1) {
      this.form.patchValue({ outletId: this.outlets[0].id });
    } else {
      this.form.patchValue({ outletId: '' });
    }
  }

  selectPreset(card: WalletCardItem): void {
    this.amountMode = 'preset';
    this.selectedCardId = card.id;
    const creditAmount = Number(card.amount || 0) + Number(card.bonusAmount || 0);
    this.form.patchValue({
      amount: creditAmount,
      description: `Admin credit — ${card.title} (₹${card.amount}${
        card.bonusAmount > 0 ? ` + ₹${card.bonusAmount} bonus` : ''
      })`,
    });
  }

  selectCustom(): void {
    this.amountMode = 'custom';
    this.selectedCardId = null;
    if (!this.form.get('description')?.value?.trim()) {
      this.form.patchValue({ description: 'Admin wallet credit' });
    }
  }

  userLabel(user: UserOption): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return user.brandName || name || user.email || user.id;
  }

  formatAmount(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;

    if (this.amountMode === 'preset') {
      if (!this.selectedCardId) {
        this.error = 'Select a pack amount or switch to custom amount.';
        return;
      }
      const card = this.cards.find((c) => c.id === this.selectedCardId);
      if (card) {
        this.form.patchValue({
          amount: Number(card.amount || 0) + Number(card.bonusAmount || 0),
        });
      }
    } else {
      const amount = Number(this.form.get('amount')?.value);
      if (!amount || amount < 1) {
        this.form.get('amount')?.setErrors({ min: true });
      }
    }

    if (this.form.invalid) return;

    const outletId = this.form.get('outletId')?.value as string;
    const amount = Number(this.form.get('amount')?.value);
    const description = (this.form.get('description')?.value as string)?.trim();

    this.loading = true;
    this.http
      .post(
        API_ENDPOINTS.WALLET_ADMIN_CREDIT(outletId),
        { amount, description },
        { responseType: 'text' },
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.dialogRef.close('success');
        },
        error: (err) => {
          this.loading = false;
          let message = 'Failed to add money.';
          try {
            const parsed = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
            message = parsed?.message || err.message || message;
          } catch {
            message = err.message || message;
          }
          this.error = message;
          this.cdr.detectChanges();
        },
      });
  }
}
