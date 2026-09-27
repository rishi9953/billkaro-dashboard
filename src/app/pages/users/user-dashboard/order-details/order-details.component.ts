import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { API_ENDPOINTS } from '../../../../utilities/constant/api-url.constant';
import { PAGE_URL } from '../../../../utilities/constant/page-url.constant';

interface OrderItem {
  itemId?: string;
  itemName: string;
  category?: string;
  quantity: number;
  salePrice: number;
  gst?: number;
  variantName?: string | null;
  itemRemark?: string;
}

interface OrderDetails {
  id: string;
  billNumber: string;
  userId?: string;
  outletId?: string;
  customerName?: string;
  phoneNumber?: string;
  tableNumber?: string;
  orderFrom?: string;
  subtotal?: number;
  totalTax?: number;
  discount?: number;
  serviceCharge?: number;
  totalAmount: number;
  paymentReceivedIn?: string;
  status: string;
  specialInstructions?: string;
  splitPayments?: { paymentMethod: string; amount: number }[];
  items?: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss'],
})
export class OrderDetailsComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  order: OrderDetails | null = null;

  private userId = '';
  private orderId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.userId = params.get('userId') ?? '';
      this.orderId = params.get('orderId') ?? '';
      if (!this.userId || !this.orderId) {
        this.router.navigateByUrl(PAGE_URL.USERS);
        return;
      }
      this.fetchOrder();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchOrder(): void {
    this.loading = true;
    this.error = null;
    this.http
      .get<OrderDetails>(API_ENDPOINTS.ORDER_BY_ID(this.orderId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.order = res;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.order = null;
          this.error =
            err?.error?.message || err?.message || 'Failed to load order details.';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigateByUrl(`${PAGE_URL.USER_DASHBOARD(this.userId)}?tab=orders`);
  }

  lineTotal(item: OrderItem): number {
    return Number(item.quantity || 0) * Number(item.salePrice || 0);
  }

  formatCurrency(amount: number | null | undefined): string {
    return `₹${Number(amount ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  display(value: string | number | null | undefined): string {
    if (value == null) return '—';
    const text = String(value).trim();
    return text !== '' ? text : '—';
  }

  statusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'closed') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'deleted') return 'badge-danger';
    return 'badge-muted';
  }
}
