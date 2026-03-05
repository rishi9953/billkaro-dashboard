import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

export interface PrinterOrder {
  id: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  outletId?: string;
  subscriptionId?: string;
  outletName?: string;
  outletAddress?: string;
  email?: string;
  phoneNumber?: string;
  deliveryAddress?: string;
  pincode?: string;
  printedAt?: string | null;
  status: string;
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
  // Allowed status values in UI: placed, dispatched, delivered, cancelled
  readonly statusOptions: string[] = ['placed', 'dispatched', 'delivered', 'cancelled'];
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

        const normalized = this.normalizeOrdersResponse(response);
        this.orders = normalized.orders;
        this.totalItems = normalized.totalItems;

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

  private normalizeOrdersResponse(response: unknown): { orders: PrinterOrder[]; totalItems: number } {
    if (!response) return { orders: [], totalItems: 0 };

    // Case 1: API returns raw array.
    if (Array.isArray(response)) {
      return { orders: response as PrinterOrder[], totalItems: response.length };
    }

    // Case 2: API returns a single order object.
    if (typeof response === 'object') {
      const maybe = response as Record<string, unknown>;

      // Common envelope: { status, data, totalItems }
      if (Array.isArray(maybe['data'])) {
        const data = maybe['data'] as PrinterOrder[];
        const totalItems = typeof maybe['totalItems'] === 'number' ? (maybe['totalItems'] as number) : data.length;
        return { orders: data, totalItems };
      }

      // Some APIs: { orders: [...] }
      if (Array.isArray(maybe['orders'])) {
        const orders = maybe['orders'] as PrinterOrder[];
        const totalItems = typeof maybe['totalItems'] === 'number' ? (maybe['totalItems'] as number) : orders.length;
        return { orders, totalItems };
      }

      // Fallback: treat as a single order.
      if (typeof maybe['id'] === 'string' && typeof maybe['createdAt'] === 'string') {
        return { orders: [maybe as unknown as PrinterOrder], totalItems: 1 };
      }
    }

    return { orders: [], totalItems: 0 };
  }

  getOrderDisplayId(order: PrinterOrder): string {
    return order.id;
  }

  onStatusChange(order: PrinterOrder, newStatus: string): void {
    const next = (newStatus || '').trim();
    if (!next || next === order.status) return;

    const previous = order.status;
    order.status = next;
    this.cdr.detectChanges();

    if (!order.id) {
      console.warn('Cannot update status: missing order id', order);
      return;
    }

    const url = API_ENDPOINTS.ORDERS_PRINTER_UPDATE(order.id);
    this.http.patch(url, { status: next }).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to update order status', err);
        order.status = previous;
        this.error = err?.error?.message || 'Failed to update status. Please try again.';
        this.cdr.detectChanges();
      },
    });
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
    if (s === 'completed' || s === 'delivered' || s === 'dispatched' || s === 'shipped') {
      return 'status-completed';
    }
    if (s === 'pending' || s === 'processing' || s === 'confirmed' || s === 'placed') {
      return 'status-pending';
    }
    if (s === 'failed' || s === 'cancelled' || s === 'rejected') {
      return 'status-failed';
    }
    return 'status-default';
  }
}
