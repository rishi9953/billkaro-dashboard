import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './wallet-cards-list.component.html',
  styleUrls: ['./wallet-cards-list.component.scss'],
})
export class WalletCardsListComponent implements OnInit, OnDestroy {
  cards: WalletCardItem[] = [];
  loading = false;
  error: string | null = null;
  togglingId: string | null = null;
  deletingId: string | null = null;
  walletTopupVolume = 0;
  walletTopupCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchCards();
    this.fetchWalletTopups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get sortedCards(): WalletCardItem[] {
    return [...this.cards].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  get activeCount(): number {
    return this.cards.filter((c) => c.active).length;
  }

  get totalCount(): number {
    return this.cards.length;
  }

  get popularCard(): WalletCardItem | null {
    if (!this.cards.length) return null;
    return [...this.cards].sort((a, b) => {
      const ratioA = a.amount > 0 ? a.bonusAmount / a.amount : 0;
      const ratioB = b.amount > 0 ? b.bonusAmount / b.amount : 0;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.amount - a.amount;
    })[0];
  }

  get avgBonusRatio(): string {
    if (!this.cards.length) return '0';
    const total = this.cards.reduce((sum, c) => {
      if (!c.amount) return sum;
      return sum + (c.bonusAmount / c.amount) * 100;
    }, 0);
    return (total / this.cards.length).toFixed(1);
  }

  getFeatures(card: WalletCardItem): string[] {
    const fromDesc = (card.description || '')
      .split(/[\n•|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (fromDesc.length >= 2) return fromDesc.slice(0, 4);
    const features = [`Instant wallet credit of ${this.formatAmount(card.amount)}`];
    if (card.bonusAmount > 0) {
      features.push(`Extra ${this.formatAmount(card.bonusAmount)} bonus credit`);
    }
    features.push('Available on BillKaro Windows POS');
    if (card.active) features.push('Live for merchant top-ups');
    return features;
  }

  fetchCards(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(API_ENDPOINTS.WALLET_CARDS, { responseType: 'text', observe: 'response' }).subscribe({
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
        this.error = err.error?.message || err.message || 'Failed to fetch wallet cards.';
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

  duplicateCard(card: WalletCardItem): void {
    const clone: WalletCardItem = {
      ...card,
      id: '',
      title: `${card.title} (Copy)`,
      sortOrder: (card.sortOrder ?? 0) + 1,
      createdAt: new Date().toISOString(),
    };
    const dialogRef = this.dialog.open(WalletCardFormDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'wallet-card-dialog',
      data: clone,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchCards();
    });
  }

  onToggleChange(card: WalletCardItem): void {
    const active = !card.active;
    this.togglingId = card.id;
    this.http
      .patch(API_ENDPOINTS.WALLET_CARD_UPDATE(card.id), { active }, { responseType: 'text' })
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
    this.http.delete(API_ENDPOINTS.WALLET_CARD_UPDATE(card.id), { responseType: 'text' }).subscribe({
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
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }

  formatAmountFixed(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private fetchWalletTopups(): void {
    this.http.get(API_ENDPOINTS.PAYMENTS_ADMIN_ALL, { responseType: 'text' }).subscribe({
      next: (body) => {
        try {
          const parsed = JSON.parse(body || '{}');
          const list: Array<{ amount?: number; paymentType?: string; method?: string }> = Array.isArray(
            parsed?.data,
          )
            ? parsed.data
            : Array.isArray(parsed)
              ? parsed
              : [];
          const wallet = list.filter((p) => p.paymentType === 'wallet' || p.method === 'wallet');
          this.walletTopupCount = wallet.length;
          this.walletTopupVolume = wallet.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          this.cdr.detectChanges();
        } catch {
          /* ignore */
        }
      },
      error: () => {
        /* ignore */
      },
    });
  }
}
