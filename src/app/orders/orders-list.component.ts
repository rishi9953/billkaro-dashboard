import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export interface PrinterOrderUser {
  id?: string;
  email?: string;
  brandName?: string;
}

export interface PrinterOrder {
  id: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  orderId?: string;
  orderNumber?: string;
  status: string;
  amount?: number;
  currency?: string;
  quantity?: number;
  printerModel?: string;
  shippingAddress?: string;
  user?: PrinterOrderUser;
  [key: string]: unknown;
}

interface OrdersApiResponse {
  status: string;
  message?: string;
  data: PrinterOrder[];
  totalItems?: number;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss']
})
export class OrdersListComponent implements OnInit, OnDestroy {
  orders: PrinterOrder[] = [];
  totalItems = 0;
  loading = false;
  error: string | null = null;
  private apiUrl = API_ENDPOINTS.ORDERS_PRINTER;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchOrders(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(this.apiUrl, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();
        const contentType = res.headers.get('content-type') || '';

        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            console.warn('Orders API returned non-JSON', {
              status: res.status,
              contentType,
              bodyPreview: bodyText.slice(0, 300)
            });
            this.orders = [];
            this.totalItems = 0;
            this.loading = false;
            this.error =
              `API returned non-JSON (status ${res.status}). ` +
              (contentType ? `Content-Type: ${contentType}. ` : '') +
              `Response: ${bodyText.slice(0, 300)}`;
            this.cdr.detectChanges();
            return;
          }
        }

        const apiRes = response as OrdersApiResponse;
        if (apiRes?.status === 'success' && Array.isArray(apiRes.data)) {
          this.orders = apiRes.data;
          this.totalItems = apiRes.totalItems ?? apiRes.data.length;
        } else if (response && typeof response === 'object' && (response as { data?: PrinterOrder[] }).data) {
          const data = (response as { data: PrinterOrder[] }).data;
          this.orders = Array.isArray(data) ? data : [];
          this.totalItems = (response as { totalItems?: number }).totalItems ?? this.orders.length;
        } else {
          this.orders = [];
          this.totalItems = 0;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching printer orders:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch orders. Please try again later.';
        this.orders = [];
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getOrderDisplayId(order: PrinterOrder): string {
    return order.orderNumber ?? order.orderId ?? order.id;
  }

  formatAmount(amount: number | undefined, currency: string | undefined): string {
    if (amount == null) return '—';
    const curr = (currency ?? 'INR').toUpperCase();
    if (curr === 'INR') return `₹${Number(amount).toLocaleString('en-IN')}`;
    return `${curr} ${Number(amount).toLocaleString()}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'delivered' || s === 'shipped') return 'status-completed';
    if (s === 'pending' || s === 'processing' || s === 'confirmed') return 'status-pending';
    if (s === 'failed' || s === 'cancelled' || s === 'rejected') return 'status-failed';
    return 'status-default';
  }
}
