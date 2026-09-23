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

type DashboardTab = 'overview' | 'profile' | 'orders' | 'staff' | 'inventory' | 'menu' | 'activity';

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

  readonly pageUrl = PAGE_URL;

  readonly tabs: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'grid_view' },
    { key: 'profile', label: 'Profile', icon: 'person' },
    { key: 'orders', label: 'Orders', icon: 'receipt_long' },
    { key: 'staff', label: 'Staff', icon: 'badge' },
    { key: 'inventory', label: 'Inventory', icon: 'inventory_2' },
    { key: 'menu', label: 'Menu', icon: 'restaurant_menu' },
    { key: 'activity', label: 'Activity Log', icon: 'history' },
  ];

  loading = true;
  error: string | null = null;
  selectedOutletId = '';
  activeTab: DashboardTab = 'overview';
  data: UserDashboardData | null = null;

  /** Track broken image URLs so placeholders show cleanly */
  failedImages = new Set<string>();

  private userId = '';
  private lineChart: Chart<'line'> | null = null;
  private doughnutChart: Chart<'doughnut'> | null = null;
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
          if (this.activeTab === 'overview') {
            setTimeout(() => this.initCharts(), 0);
          }
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

  setTab(tab: DashboardTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (tab === 'overview') {
      setTimeout(() => this.initCharts(), 0);
    } else {
      this.destroyCharts();
    }
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

  get initials(): string {
    const u = this.data?.user;
    if (!u) return '?';
    const first = u.firstName?.trim()?.[0] || '';
    const last = u.lastName?.trim()?.[0] || '';
    if (first || last) return (first + last).toUpperCase();
    const name = this.fullName;
    return name && name !== '—' ? name.charAt(0).toUpperCase() : '?';
  }

  get roleSubtitle(): string {
    const outlet = this.selectedOutlet;
    const brand = this.data?.user?.brandName;
    if (outlet?.businessName && brand) return `${outlet.businessName}`;
    return outlet?.businessName || brand || '—';
  }

  get profileImage(): string {
    return this.data?.user?.image?.trim() || '';
  }

  get selectedOutlet(): OutletSummary | null {
    return this.data?.selectedOutlet ?? this.data?.outlets?.find((o) => o.id === this.selectedOutletId) ?? null;
  }

  get completionRate(): string {
    const total = this.data?.stats?.totalOrders ?? 0;
    const closed = this.data?.stats?.closedOrders ?? 0;
    if (!total) return '0';
    return Math.round((closed / total) * 100).toString();
  }

  get staffBreakdown(): string {
    const staff = this.data?.staff ?? [];
    if (!staff.length) return 'No staff assigned';
    const counts = new Map<string, number>();
    staff.forEach((s) => {
      const label = this.roleLabel(s.role);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .slice(0, 3)
      .map(([role, n]) => `${n} ${role}${n > 1 ? 's' : ''}`)
      .join(', ');
  }

  get lowStockPreview(): string {
    const items = this.data?.inventory?.lowStockMaterials ?? [];
    if (!items.length) return 'Stock looks healthy';
    return items
      .slice(0, 3)
      .map((m) => m.name)
      .join(', ');
  }

  get walletHealth(): string {
    const bal = this.data?.walletBalance ?? 0;
    if (bal <= 0) return 'Empty';
    if (bal < 500) return 'Low';
    return 'Healthy';
  }

  exportStatement(): void {
    if (!this.data) return;
    const d = this.data;
    const rows = [
      ['Field', 'Value'],
      ['User', this.fullName],
      ['Email', d.user.email || ''],
      ['Mobile', d.user.mobile || ''],
      ['Brand', d.user.brandName || ''],
      ['Outlet', this.selectedOutlet?.businessName || ''],
      ['Wallet Balance', String(d.walletBalance ?? 0)],
      ['Last Recharge', d.lastRecharge ? String(d.lastRecharge.amount) : ''],
      ['Subscription', d.lastSubscription?.plan?.title || ''],
      ['Total Orders', String(d.stats.totalOrders)],
      ['Order Revenue', String(d.stats.totalRevenue)],
      ['Staff', String(d.stats.staffCount)],
      ['Inventory', String(d.inventory.totalRawMaterials)],
      ['Menu Items', String(d.stats.itemCount)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-statement-${this.userId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatCurrency(amount: number | null | undefined): string {
    return `₹${Number(amount ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  formatCurrencyFixed(amount: number | null | undefined): string {
    return `₹${Number(amount ?? 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
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
    this.lineChart = null;
    this.doughnutChart = null;
  }

  private initCharts(): void {
    if (!this.data || this.activeTab !== 'overview') return;
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
              borderColor: 'rgb(109, 40, 217)',
              backgroundColor: 'rgba(109, 40, 217, 0.14)',
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: 'rgb(109, 40, 217)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: (ctx) => this.formatCurrency(ctx.parsed.y),
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              border: { display: false },
            },
            x: {
              grid: { display: false },
              border: { display: false },
            },
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
              backgroundColor: ['#22c55e', '#f59e0b', '#94a3b8'],
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 10,
              cornerRadius: 8,
            },
          },
        },
      };
      const ctx = this.doughnutChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.doughnutChart = new Chart(ctx, doughnutConfig);
    }
  }
}