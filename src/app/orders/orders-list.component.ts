import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface PrinterOrderEmailNotification {
  attempted: boolean;
  sent: boolean;
  recipient?: string;
  error?: string;
}

interface PrinterOrderUpdateResponse {
  status: string;
  message?: string;
  data: PrinterOrder;
  emailNotification?: PrinterOrderEmailNotification;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss']
})
export class OrdersListComponent implements OnInit, OnDestroy {
  orders: PrinterOrder[] = [];
  filteredOrders: PrinterOrder[] = [];
  totalItems = 0;
  loading = false;
  error: string | null = null;
  statusFilter: string = 'all';
  copiedOrderId: string | null = null;
  statusUpdateMessage: string | null = null;
  updatingOrderIds = new Set<string>();

  readonly statusOptions: string[] = ['placed', 'dispatched', 'delivered', 'cancelled'];
  readonly filterTabs: { key: string; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'inventory_2' },
    { key: 'placed', label: 'Placed', icon: 'schedule' },
    { key: 'dispatched', label: 'Dispatched', icon: 'local_shipping' },
    { key: 'delivered', label: 'Delivered', icon: 'check_circle' },
    { key: 'cancelled', label: 'Cancelled', icon: 'cancel' },
  ];

  private apiUrl = `${API_ENDPOINTS.ORDERS_PRINTER}?limit=200`;
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

        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            this.orders = [];
            this.filteredOrders = [];
            this.totalItems = 0;
            this.loading = false;
            this.error =
              `API returned non-JSON (status ${res.status}). ` +
              `Response: ${bodyText.slice(0, 300)}`;
            this.cdr.detectChanges();
            return;
          }
        }

        const normalized = this.normalizeOrdersResponse(response);
        this.orders = normalized.orders.map((order) => ({
          ...order,
          status: (order.status || 'placed').toLowerCase(),
        }));
        this.totalItems = normalized.totalItems;
        this.applyFilter();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching printer orders:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch orders. Please try again later.';
        this.orders = [];
        this.filteredOrders = [];
        this.totalItems = 0;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeOrdersResponse(response: unknown): { orders: PrinterOrder[]; totalItems: number } {
    if (!response) return { orders: [], totalItems: 0 };

    if (Array.isArray(response)) {
      return { orders: response as PrinterOrder[], totalItems: response.length };
    }

    if (typeof response === 'object') {
      const maybe = response as Record<string, unknown>;

      if (Array.isArray(maybe['data'])) {
        const data = maybe['data'] as PrinterOrder[];
        const pagination = maybe['pagination'] as OrdersApiResponse['pagination'] | undefined;
        const totalItems =
          pagination?.totalItems ??
          (typeof maybe['totalItems'] === 'number' ? (maybe['totalItems'] as number) : data.length);
        return { orders: data, totalItems };
      }

      if (Array.isArray(maybe['orders'])) {
        const orders = maybe['orders'] as PrinterOrder[];
        const totalItems = typeof maybe['totalItems'] === 'number' ? (maybe['totalItems'] as number) : orders.length;
        return { orders, totalItems };
      }

      if (typeof maybe['id'] === 'string' && typeof maybe['createdAt'] === 'string') {
        return { orders: [maybe as unknown as PrinterOrder], totalItems: 1 };
      }
    }

    return { orders: [], totalItems: 0 };
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilter();
    this.cdr.detectChanges();
  }

  private applyFilter(): void {
    if (this.statusFilter === 'all') {
      this.filteredOrders = [...this.orders];
      return;
    }
    this.filteredOrders = this.orders.filter(
      (o) => (o.status || '').toLowerCase() === this.statusFilter
    );
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.orders.length;
    return this.orders.filter((o) => (o.status || '').toLowerCase() === status).length;
  }

  getOrderDisplayId(order: PrinterOrder): string {
    if (!order.id) return '—';
    return order.id.length > 12 ? `${order.id.slice(0, 8)}…` : order.id;
  }

  async copyOrderId(order: PrinterOrder, event: Event): Promise<void> {
    event.stopPropagation();
    if (!order.id) return;
    try {
      await navigator.clipboard.writeText(order.id);
      this.copiedOrderId = order.id;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedOrderId = null;
        this.cdr.detectChanges();
      }, 2000);
    } catch {
      console.warn('Clipboard copy failed');
    }
  }

  isStatusUpdating(orderId: string | undefined): boolean {
    return !!orderId && this.updatingOrderIds.has(orderId);
  }

  onStatusChange(order: PrinterOrder, newStatus: string): void {
    const next = (newStatus || '').trim().toLowerCase();
    const current = (order.status || '').trim().toLowerCase();

    if (!next || next === current) return;

    if (!order.id) {
      console.warn('Cannot update status: missing order id', order);
      this.error = 'Cannot update status: order ID is missing.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.statusOptions.includes(next)) {
      this.error = `Invalid status "${newStatus}".`;
      this.cdr.detectChanges();
      return;
    }

    const previous = order.status;
    this.updatingOrderIds.add(order.id);
    this.error = null;
    this.cdr.detectChanges();

    const url = API_ENDPOINTS.ORDERS_PRINTER_UPDATE(order.id);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.patch<PrinterOrderUpdateResponse>(url, { status: next }, { headers }).subscribe({
      next: (response) => {
        const updatedStatus = (response?.data?.status || next).toLowerCase();
        order.status = updatedStatus;
        if (response?.data?.updatedAt) {
          order.updatedAt = response.data.updatedAt;
        }

        this.updatingOrderIds.delete(order.id);
        this.applyFilter();
        this.error = null;
        this.statusUpdateMessage = this.buildStatusUpdateMessage(
          updatedStatus,
          response?.emailNotification,
          order.email,
        );
        if (response?.emailNotification?.attempted && !response.emailNotification.sent) {
          this.error =
            response.emailNotification.error ||
            'Status saved but notification email could not be sent. Check SMTP settings on the server.';
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.statusUpdateMessage = null;
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        console.error('Failed to update order status', err);
        order.status = previous;
        this.updatingOrderIds.delete(order.id);
        this.applyFilter();
        this.error =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : null) ||
          `Failed to update status (${err?.status ?? 'network error'}). Please try again.`;
        this.cdr.detectChanges();
      },
    });
  }

  private buildStatusUpdateMessage(
    updatedStatus: string,
    emailNotification: PrinterOrderEmailNotification | undefined,
    fallbackEmail: string | undefined,
  ): string {
    const label = this.getStatusLabel(updatedStatus);

    if (emailNotification?.sent && emailNotification.recipient) {
      return `Status updated to "${label}". Email sent to ${emailNotification.recipient}.`;
    }

    if (emailNotification?.attempted && !emailNotification.sent) {
      return `Status updated to "${label}". Email was not sent — check server SMTP configuration.`;
    }

    if (fallbackEmail) {
      return `Status updated to "${label}".`;
    }

    return `Status updated to "${label}".`;
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
    if (s === 'delivered') return 'status-delivered';
    if (s === 'dispatched' || s === 'shipped') return 'status-dispatched';
    if (s === 'placed' || s === 'pending' || s === 'processing') return 'status-placed';
    if (s === 'cancelled' || s === 'failed' || s === 'rejected') return 'status-cancelled';
    return 'status-default';
  }

  getStatusLabel(status: string): string {
    return (status || 'unknown').charAt(0).toUpperCase() + (status || 'unknown').slice(1);
  }
}
