import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { API_ENDPOINTS } from '../../../utilities/constant/api-url.constant';
import { PAGE_URL } from '../../../utilities/constant/page-url.constant';

Chart.register(...registerables);

interface UserProfile {
  id: string;
  brandName?: string;
  email?: string;
  mobile?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  activate?: boolean;
  image?: string;
  isTrial?: boolean;
  billingAccessMode?: string | null;
  accessModeChosen?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface OutletSummary {
  id: string;
  businessName?: string;
  businessType?: string;
  businessCategory?: string;
  outletAddress?: string;
  phoneNumber?: string;
  logo?: string;
  upiId?: string;
  taxSlab?: string;
  seatingCapacity?: string;
  googleProfileLink?: string;
  swiggyLink?: string;
  zomatoLink?: string;
  gstinNumber?: string;
  fssaiNumber?: string;
  outletAge?: string;
  billNumber?: number;
  whatsappBotCode?: string;
  whatsappBotEnabled?: boolean;
}

interface OrderLine {
  itemName: string;
  quantity: number;
  salePrice: number;
  category?: string;
  variantName?: string;
}

interface OrderRow {
  id: string;
  billNumber: string;
  customerName: string;
  phoneNumber?: string;
  tableNumber?: string;
  orderFrom?: string;
  subtotal?: number;
  totalTax?: number;
  discount?: number;
  totalAmount: number;
  status: string;
  paymentReceivedIn?: string;
  createdAt: string;
  itemCount: number;
  items?: OrderLine[];
}

interface StaffRow {
  id: string;
  userName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  profileImage?: string;
  gender?: string;
  uniqueId?: string;
  createdAt: string;
}

interface InventoryMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  purchasePrice: number;
  stockValue: number;
  isLowStock: boolean;
  isActive: boolean;
  materialCode?: string;
  barcode?: string;
  description?: string;
  hsnSacCode?: string;
  taxRate?: number;
}

interface ItemRow {
  id: string;
  itemName: string;
  category: string;
  salePrice: number;
  costPrice?: number;
  itemImage?: string;
  barcode?: string;
  sku?: string;
  stockQuantity?: number;
  minStock?: number;
  trackStock?: boolean;
  withTax?: boolean;
  gst?: number;
  posColor?: string;
  isLowStock?: boolean;
}

interface TopSellingItem {
  itemId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  totalSales: number;
  itemImage?: string;
  salePrice?: number;
  posColor?: string;
}

interface UserDashboardData {
  user: UserProfile;
  outlets: OutletSummary[];
  selectedOutletId: string | null;
  selectedOutlet?: OutletSummary | null;
  lastRecharge: {
    id: string;
    amount: number;
    creditedAmount: number;
    description?: string;
    paymentId?: string;
    createdAt: string;
  } | null;
  walletBalance: number;
  lastSubscription: {
    id: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    plan: {
      id: string;
      title: string;
      price: number;
      discountedPrice?: number;
      platform?: string;
    } | null;
  } | null;
  lastBill: OrderRow | null;
  recentOrders: OrderRow[];
  staff: StaffRow[];
  inventory: {
    totalRawMaterials: number;
    lowStockCount: number;
    totalStockValue: number;
    materials: InventoryMaterial[];
    lowStockMaterials: InventoryMaterial[];
  };
  items: ItemRow[];
  orderReport: {
    totalOrders: number;
    closedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    paymentMethods: { method: string; count: number; amount: number }[];
    salesByCategory: { category: string; quantity: number; amount: number }[];
  };
  itemsReport: {
    totalItems: number;
    trackedItems: number;
    lowStockItems: number;
    topSelling: TopSellingItem[];
    byCategory: { category: string; count: number }[];
  };
  stats: {
    totalOrders: number;
    closedOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    staffCount: number;
    itemCount: number;
  };
  charts: {
    revenueByDay: { date: string; revenue: number }[];
    orderStatus: { closed: number; pending: number; deleted: number };
    topItems: { label: string; quantity: number }[];
    paymentMethods: { label: string; amount: number }[];
  };
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss'],
})
export class UserDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topItemsChartCanvas') topItemsChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentChartCanvas') paymentChartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly pageUrl = PAGE_URL;

  loading = true;
  error: string | null = null;
  selectedOutletId = '';
  data: UserDashboardData | null = null;

  /** Track broken image URLs so placeholders show cleanly */
  failedImages = new Set<string>();

  private userId = '';
  private lineChart: Chart<'line'> | null = null;
  private doughnutChart: Chart<'doughnut'> | null = null;
  private topItemsChart: Chart<'bar'> | null = null;
  private paymentChart: Chart<'doughnut'> | null = null;
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
      if (!this.userId) {
        this.router.navigateByUrl(PAGE_URL.USERS);
        return;
      }
      this.fetchDashboard();
    });
  }

  ngAfterViewInit(): void {
    if (!this.loading && this.data) {
      setTimeout(() => this.initCharts(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  fetchDashboard(outletId?: string): void {
    this.loading = true;
    this.error = null;
    this.destroyCharts();
    this.failedImages.clear();

    const url = API_ENDPOINTS.DASHBOARD_USER(this.userId, outletId || undefined);
    this.http
      .get<{ status?: string; data?: UserDashboardData } | UserDashboardData>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const payload =
            res && typeof res === 'object' && 'data' in res && res.data
              ? res.data
              : (res as UserDashboardData);
          this.data = payload;
          this.selectedOutletId = payload.selectedOutletId ?? '';
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.initCharts(), 0);
        },
        error: (err) => {
          this.loading = false;
          this.data = null;
          this.error =
            err?.error?.message ||
            err?.message ||
            'Failed to load user dashboard.';
          this.cdr.detectChanges();
        },
      });
  }

  onOutletChange(): void {
    this.fetchDashboard(this.selectedOutletId || undefined);
  }

  goBack(): void {
    this.router.navigateByUrl(PAGE_URL.USERS);
  }

  get fullName(): string {
    const u = this.data?.user;
    if (!u) return '—';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.brandName || '—';
  }

  get profileImage(): string {
    return this.data?.user?.image?.trim() || '';
  }

  get selectedOutlet(): OutletSummary | null {
    return this.data?.selectedOutlet ?? null;
  }

  formatCurrency(amount: number | null | undefined): string {
    return `₹${Number(amount ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  roleLabel(role: string): string {
    if (role === 'secondary_admin') return 'Secondary Admin';
    if (role === 'biller') return 'Biller';
    return role || '—';
  }

  statusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'active' || s === 'closed') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'deactivated' || s === 'deleted') return 'badge-danger';
    return 'badge-muted';
  }

  hasImage(url: string | null | undefined): boolean {
    const key = (url || '').trim();
    return !!key && !this.failedImages.has(key);
  }

  onImgError(url: string | null | undefined): void {
    const key = (url || '').trim();
    if (!key) return;
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  itemInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  private destroyCharts(): void {
    this.lineChart?.destroy();
    this.doughnutChart?.destroy();
    this.topItemsChart?.destroy();
    this.paymentChart?.destroy();
    this.lineChart = null;
    this.doughnutChart = null;
    this.topItemsChart = null;
    this.paymentChart = null;
  }

  private initCharts(): void {
    if (!this.data) return;
    this.destroyCharts();

    const days = this.data.charts?.revenueByDay ?? [];
    if (this.lineChartCanvas?.nativeElement) {
      const lineConfig: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: days.map((d) =>
            new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          ),
          datasets: [
            {
              label: 'Order revenue',
              data: days.map((d) => d.revenue),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointBackgroundColor: 'rgb(59, 130, 246)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            x: { grid: { display: false } },
          },
        },
      };
      const ctx = this.lineChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.lineChart = new Chart(ctx, lineConfig);
    }

    const status = this.data.charts?.orderStatus ?? { closed: 0, pending: 0, deleted: 0 };
    if (this.doughnutChartCanvas?.nativeElement) {
      const doughnutConfig: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels: ['Closed', 'Pending', 'Deleted'],
          datasets: [
            {
              data: [status.closed, status.pending, status.deleted],
              backgroundColor: ['rgb(34, 197, 94)', 'rgb(251, 191, 36)', 'rgb(148, 163, 184)'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: { legend: { position: 'bottom' } },
        },
      };
      const ctx = this.doughnutChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.doughnutChart = new Chart(ctx, doughnutConfig);
    }

    const topItems = this.data.charts?.topItems ?? [];
    if (this.topItemsChartCanvas?.nativeElement) {
      const barConfig: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: topItems.map((t) => t.label),
          datasets: [
            {
              label: 'Qty sold',
              data: topItems.map((t) => t.quantity),
              backgroundColor: 'rgba(14, 165, 233, 0.75)',
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            y: { grid: { display: false } },
          },
        },
      };
      const ctx = this.topItemsChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.topItemsChart = new Chart(ctx, barConfig);
    }

    const payments = this.data.charts?.paymentMethods ?? [];
    if (this.paymentChartCanvas?.nativeElement) {
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#94a3b8'];
      const payConfig: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels: payments.map((p) => p.label),
          datasets: [
            {
              data: payments.map((p) => p.amount),
              backgroundColor: payments.map((_, i) => colors[i % colors.length]),
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: { legend: { position: 'bottom' } },
        },
      };
      const ctx = this.paymentChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.paymentChart = new Chart(ctx, payConfig);
    }
  }
}
