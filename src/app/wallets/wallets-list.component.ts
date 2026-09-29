import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import {
  AddMoneyDialogComponent,
  AddMoneyDialogData,
} from './add-money-dialog.component';

export interface AdminWalletItem {
  id: string;
  outletId: string;
  userId: string;
  balance: number;
  updatedAt?: string;
  createdAt?: string;
  outlet?: {
    id: string;
    businessName?: string;
    phoneNumber?: string;
  };
  user?: {
    id: string;
    email?: string;
    brandName?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface ApiResponse {
  status: string;
  data: AdminWalletItem[];
  totalItems?: number;
}

@Component({
  selector: 'app-wallets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './wallets-list.component.html',
  styleUrls: ['./wallets-list.component.scss'],
})
export class WalletsListComponent implements OnInit, OnDestroy {
  wallets: AdminWalletItem[] = [];
  filteredWallets: AdminWalletItem[] = [];
  searchQuery = '';
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchWallets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalBalance(): number {
    return this.wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  }

  get walletCount(): number {
    return this.wallets.length;
  }

  fetchWallets(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(API_ENDPOINTS.WALLET_ADMIN_ALL, { responseType: 'text' }).subscribe({
      next: (body) => {
        try {
          const parsed = JSON.parse(body || '{}') as ApiResponse | AdminWalletItem[];
          if (Array.isArray(parsed)) {
            this.wallets = parsed;
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
            this.wallets = parsed.data;
          } else {
            this.wallets = [];
          }
        } catch {
          this.wallets = [];
          this.error = 'API returned non-JSON response.';
        }
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Failed to fetch wallets.';
        this.wallets = [];
        this.filteredWallets = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredWallets = [...this.wallets];
      return;
    }
    this.filteredWallets = this.wallets.filter((w) => {
      const haystack = [
        w.outlet?.businessName,
        w.outlet?.phoneNumber,
        w.user?.email,
        w.user?.brandName,
        w.user?.firstName,
        w.user?.lastName,
        w.outletId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  openAddMoneyDialog(wallet?: AdminWalletItem): void {
    const data: AddMoneyDialogData | null = wallet
      ? {
          userId: wallet.userId || wallet.user?.id,
          outletId: wallet.outletId || wallet.outlet?.id,
        }
      : null;

    const dialogRef = this.dialog.open(AddMoneyDialogComponent, {
      width: '90%',
      maxWidth: '560px',
      maxHeight: '90vh',
      panelClass: 'add-money-dialog',
      data,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchWallets();
    });
  }

  userLabel(wallet: AdminWalletItem): string {
    const u = wallet.user;
    if (!u) return '—';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return u.brandName || name || u.email || '—';
  }

  formatAmount(amount: number): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
