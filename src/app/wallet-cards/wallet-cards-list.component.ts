import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { WalletCardFormDialogComponent } from './wallet-card-form-dialog.component';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export interface WalletCardItem {
  id: string;
  title: string;
  amount: number;
  bonusAmount: number;
  description?: string;
  cardColor: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiResponse {
  status: string;
  data: WalletCardItem[];
}

@Component({
  selector: 'app-wallet-cards-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
  ],
  templateUrl: './wallet-cards-list.component.html',
  styleUrls: ['./wallet-cards-list.component.scss'],
})
export class WalletCardsListComponent implements OnInit, OnDestroy {
  cards: WalletCardItem[] = [];
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
    this.fetchCards();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchCards(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http
      .get(API_ENDPOINTS.WALLET_CARDS, { responseType: 'text', observe: 'response' })
      .subscribe({
        next: (res) => {
          const bodyText = (res.body ?? '').toString();
          let response: unknown = null;
          if (bodyText.trim().length > 0) {
            try {
              response = JSON.parse(bodyText);
            } catch {
              this.cards = [];
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
            this.cards = Array.isArray((response as ApiResponse).data)
              ? (response as ApiResponse).data
              : [];
          } else if (Array.isArray(response)) {
            this.cards = response as WalletCardItem[];
          } else {
            this.cards = [];
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error =
            err.error?.message || err.message || 'Failed to fetch wallet cards.';
          this.cards = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(WalletCardFormDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'wallet-card-dialog',
      data: null,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchCards();
    });
  }

  openEditDialog(card: WalletCardItem): void {
    const dialogRef = this.dialog.open(WalletCardFormDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'wallet-card-dialog',
      data: card,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchCards();
    });
  }

  onToggleChange(card: WalletCardItem, active: boolean): void {
    this.togglingId = card.id;
    this.http
      .patch(
        API_ENDPOINTS.WALLET_CARD_UPDATE(card.id),
        { active },
        { responseType: 'text' }
      )
      .subscribe({
        next: () => {
          card.active = active;
          this.togglingId = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.togglingId = null;
          this.cdr.detectChanges();
        },
      });
  }

  deleteCard(card: WalletCardItem): void {
    if (!confirm(`Delete wallet card "${card.title}"?`)) return;
    this.deletingId = card.id;
    this.http
      .delete(API_ENDPOINTS.WALLET_CARD_UPDATE(card.id), { responseType: 'text' })
      .subscribe({
        next: () => {
          this.deletingId = null;
          this.fetchCards();
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
