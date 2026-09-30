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
import { NumberPaginatorComponent } from '../../../shared/components/number-paginator/number-paginator.component';

Chart.register(...registerables);

type DashboardTab = 'overview' | 'profile' | 'orders' | 'staff' | 'inventory' | 'menu' | 'logs';
type LogGroup = 'all' | 'menu' | 'orders' | 'staff' | 'customers' | 'store' | 'whatsapp';

interface ActivityLog {
  id: string;
  type: string;
  createdByName?: string;
  entityName?: string | null;
  description?: string | null;
  details?: {
    fieldChanges?: { field: string; label: string; from: string | number; to: string | number }[];
    changeSummary?: string | null;
    changes?: Record<string, unknown>;
    showItemToggled?: boolean;
    action?: string;
  } | null;
  createdAt: string;
}

const LOG_GROUP_TYPES: Record<Exclude<LogGroup, 'all'>, string[]> = {
  menu: ['Item Added', 'Item Edited', 'Item Deleted'],
  orders: ['Order Added', 'Order Deleted'],
  staff: ['Staff Added', 'Staff Updated', 'Staff Deleted'],
  customers: ['Customer Added', 'Customer Edited', 'Customer Deleted'],
  store: ['Store Opened', 'Store Closed'],
  whatsapp: ['WhatsApp Campaign Sent'],
};

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
  imports: [CommonModule, FormsModule, MatIconModule, RouterModule, NumberPaginatorComponent],
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
    { key: 'logs', label: 'Logs', icon: 'history' },
  ];

  loading = true;
  error: string | null = null;
  selectedOutletId = '';
  activeTab: DashboardTab = 'overview';
  data: UserDashboardData | null = null;

  /** Orders tab filters */
  readonly orderStatusTabs: { key: 'all' | 'closed' | 'pending'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'closed', label: 'Closed' },
    { key: 'pending', label: 'Pending' },
  ];
  orderStatusFilter: 'all' | 'closed' | 'pending' = 'all';
  orderSearchQuery = '';
  orderPaymentFilter = '';
  orderPageIndex = 0;
  readonly orderPageSize = 20;

  /** Menu tab filters */
  menuSearchQuery = '';
  menuCategoryFilter = '';

  /** Logs tab (shared activity feed) */
  readonly logGroupTabs: { key: LogGroup; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'menu', label: 'Menu' },
    { key: 'orders', label: 'Orders' },
    { key: 'staff', label: 'Staff' },
    { key: 'customers', label: 'Customers' },
    { key: 'store', label: 'Store' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ];
  allLogs: ActivityLog[] = [];
  logsLoading = false;
  logsError: string | null = null;
  logsLoadedFor = '';
  logGroupFilter: LogGroup = 'all';
  logTypeFilter = '';
  logActorFilter = '';
  logStartDate = '';
  logEndDate = '';
  logSearchQuery = '';
  logPageIndex = 0;
  readonly logPageSize = 20;

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

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      let tab = params.get('tab') as DashboardTab | 'activity' | null;
      if (tab === 'activity') tab = 'logs';
      if (tab && this.tabs.some((t) => t.key === tab)) {
        this.activeTab = tab;
      }
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
          this.resetOrderFilters();
          this.resetMenuFilters();
          this.resetLogFilters();
          this.allLogs = [];
          this.logsLoadedFor = '';
          this.loading = false;
          this.cdr.detectChanges();
          if (this.activeTab === 'overview') {
            setTimeout(() => this.initCharts(), 0);
          }
          if (this.activeTab === 'menu' || this.activeTab === 'logs') {
            this.fetchLogs();
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
    if (tab === 'menu' || tab === 'logs') {
      this.fetchLogs();
    }
  }

  goBack(): void {
    this.router.navigateByUrl(PAGE_URL.USERS);
  }

  openOrderDetails(order: OrderRow): void {
    if (!order?.id || !this.userId) return;
    this.router.navigateByUrl(PAGE_URL.USER_ORDER_DETAILS(this.userId, order.id));
  }

  setOrderStatusFilter(key: 'all' | 'closed' | 'pending'): void {
    this.orderStatusFilter = key;
    this.orderPageIndex = 0;
  }

  onOrderSearchChange(): void {
    this.orderPageIndex = 0;
  }

  onOrderPaymentFilterChange(): void {
    this.orderPageIndex = 0;
  }

  onOrderPageChange(pageIndex: number): void {
    this.orderPageIndex = pageIndex;
  }

  clearOrderFilters(): void {
    this.resetOrderFilters();
  }

  getOrderStatusCount(key: 'all' | 'closed' | 'pending'): number {
    const orders = this.data?.recentOrders ?? [];
    if (key === 'all') return orders.length;
    return orders.filter((o) => (o.status || '').toLowerCase() === key).length;
  }

  get orderPaymentMethods(): string[] {
    const methods = new Set<string>();
    (this.data?.recentOrders ?? []).forEach((o) => {
      const method = (o.paymentReceivedIn || '').trim();
      if (method) methods.add(method);
    });
    return Array.from(methods).sort((a, b) => a.localeCompare(b));
  }

  get filteredOrders(): OrderRow[] {
    const orders = this.data?.recentOrders ?? [];
    const q = this.orderSearchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (
        this.orderStatusFilter !== 'all' &&
        (order.status || '').toLowerCase() !== this.orderStatusFilter
      ) {
        return false;
      }
      if (
        this.orderPaymentFilter &&
        (order.paymentReceivedIn || '').trim() !== this.orderPaymentFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        order.billNumber,
        order.customerName,
        order.phoneNumber,
        order.paymentReceivedIn,
        order.tableNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  get pagedOrders(): OrderRow[] {
    const filtered = this.filteredOrders;
    const maxPage = Math.max(0, Math.ceil(filtered.length / this.orderPageSize) - 1);
    const page = Math.min(this.orderPageIndex, maxPage);
    const start = page * this.orderPageSize;
    return filtered.slice(start, start + this.orderPageSize);
  }

  get orderShowingFrom(): number {
    if (!this.filteredOrders.length) return 0;
    return this.orderPageIndex * this.orderPageSize + 1;
  }

  get orderShowingTo(): number {
    return Math.min(
      (this.orderPageIndex + 1) * this.orderPageSize,
      this.filteredOrders.length,
    );
  }

  private resetOrderFilters(): void {
    this.orderStatusFilter = 'all';
    this.orderSearchQuery = '';
    this.orderPaymentFilter = '';
    this.orderPageIndex = 0;
  }

  clearMenuFilters(): void {
    this.resetMenuFilters();
  }

  private resetMenuFilters(): void {
    this.menuSearchQuery = '';
    this.menuCategoryFilter = '';
  }

  get menuCategories(): string[] {
    const cats = new Set<string>();
    (this.data?.items ?? []).forEach((item) => {
      const cat = (item.category || '').trim();
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }

  get filteredMenuItems(): ItemRow[] {
    const items = this.data?.items ?? [];
    const q = this.menuSearchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (
        this.menuCategoryFilter &&
        (item.category || '').trim() !== this.menuCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [item.itemName, item.category, item.sku, item.barcode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  get hasMenuFilters(): boolean {
    return !!(this.menuSearchQuery.trim() || this.menuCategoryFilter);
  }

  get menuLogs(): ActivityLog[] {
    return this.allLogs.filter((a) => LOG_GROUP_TYPES.menu.includes(a.type));
  }

  get filteredLogs(): ActivityLog[] {
    const q = this.logSearchQuery.trim().toLowerCase();
    return this.allLogs.filter((log) => {
      if (this.logGroupFilter !== 'all') {
        const types = LOG_GROUP_TYPES[this.logGroupFilter];
        if (!types.includes(log.type)) return false;
      }
      if (this.logTypeFilter && log.type !== this.logTypeFilter) return false;
      if (
        this.logActorFilter &&
        (log.createdByName || '').trim() !== this.logActorFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        log.type,
        log.description,
        log.entityName,
        log.createdByName,
        log.details?.changeSummary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  get pagedLogs(): ActivityLog[] {
    const filtered = this.filteredLogs;
    const maxPage = Math.max(0, Math.ceil(filtered.length / this.logPageSize) - 1);
    const page = Math.min(this.logPageIndex, maxPage);
    const start = page * this.logPageSize;
    return filtered.slice(start, start + this.logPageSize);
  }

  get logShowingFrom(): number {
    if (!this.filteredLogs.length) return 0;
    return this.logPageIndex * this.logPageSize + 1;
  }

  get logShowingTo(): number {
    return Math.min(
      (this.logPageIndex + 1) * this.logPageSize,
      this.filteredLogs.length,
    );
  }

  get logTypeOptions(): string[] {
    if (this.logGroupFilter === 'all') {
      return Object.values(LOG_GROUP_TYPES).flat();
    }
    return LOG_GROUP_TYPES[this.logGroupFilter];
  }

  get logActorOptions(): string[] {
    const names = new Set<string>();
    this.allLogs.forEach((log) => {
      const name = (log.createdByName || '').trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  get hasLogFilters(): boolean {
    return (
      this.logGroupFilter !== 'all' ||
      !!this.logTypeFilter ||
      !!this.logActorFilter ||
      !!this.logStartDate ||
      !!this.logEndDate ||
      !!this.logSearchQuery.trim()
    );
  }

  getLogGroupCount(key: LogGroup): number {
    if (key === 'all') return this.allLogs.length;
    const types = LOG_GROUP_TYPES[key];
    return this.allLogs.filter((a) => types.includes(a.type)).length;
  }

  setLogGroupFilter(key: LogGroup): void {
    this.logGroupFilter = key;
    if (this.logTypeFilter && !this.logTypeOptions.includes(this.logTypeFilter)) {
      this.logTypeFilter = '';
    }
    this.logPageIndex = 0;
  }

  onLogTypeFilterChange(): void {
    this.logPageIndex = 0;
  }

  onLogActorFilterChange(): void {
    this.logPageIndex = 0;
  }

  onLogSearchChange(): void {
    this.logPageIndex = 0;
  }

  onLogDateChange(): void {
    this.logPageIndex = 0;
    this.fetchLogs(true);
  }

  onLogPageChange(pageIndex: number): void {
    this.logPageIndex = pageIndex;
  }

  clearLogFilters(): void {
    const hadDateFilter = !!(this.logStartDate || this.logEndDate);
    this.resetLogFilters();
    if (hadDateFilter) this.fetchLogs(true);
  }

  private resetLogFilters(): void {
    this.logGroupFilter = 'all';
    this.logTypeFilter = '';
    this.logActorFilter = '';
    this.logStartDate = '';
    this.logEndDate = '';
    this.logSearchQuery = '';
    this.logPageIndex = 0;
  }

  fetchLogs(force = false): void {
    if (!this.userId) return;
    const outletId = this.selectedOutletId || this.data?.selectedOutletId || '';
    const cacheKey = [
      this.userId,
      outletId,
      this.logStartDate || '',
      this.logEndDate || '',
    ].join('|');
    if (!force && (this.logsLoading || this.logsLoadedFor === cacheKey)) return;

    this.logsLoading = true;
    this.logsError = null;
    const params = new URLSearchParams({
      userId: this.userId,
      limit: '200',
      page: '1',
    });
    if (outletId) params.set('outletId', outletId);
    if (this.logStartDate) params.set('startDate', this.logStartDate);
    if (this.logEndDate) params.set('endDate', this.logEndDate);

    this.http
      .get<{ status?: string; data?: ActivityLog[] } | ActivityLog[]>(
        `${API_ENDPOINTS.ACTIVITIES}?${params.toString()}`,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allLogs = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : [];
          this.logsLoadedFor = cacheKey;
          this.logsLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.allLogs = [];
          this.logsLoading = false;
          this.logsError =
            err?.error?.message || err?.message || 'Failed to load logs.';
          this.cdr.detectChanges();
        },
      });
  }

  refreshLogs(): void {
    this.fetchLogs(true);
  }

  logText(log: ActivityLog): string {
    const summary = log.details?.changeSummary?.trim();
    if (summary) return summary;

    const changes = log.details?.fieldChanges;
    if (changes?.length) {
      return changes
        .map((c) => {
          if (c.field === 'salePrice' || c.field === 'costPrice') {
            return `${c.label} changed from ₹${c.from} to ₹${c.to}`;
          }
          return `${c.label} changed from "${c.from}" to "${c.to}"`;
        })
        .join('; ');
    }

    const patch = log.details?.changes;
    if (patch && typeof patch === 'object') {
      const parts: string[] = [];
      if (patch['itemName'] != null) {
        parts.push(`Item name changed to "${String(patch['itemName'])}"`);
      }
      if (patch['salePrice'] != null) {
        parts.push(`Price changed to ₹${patch['salePrice']}`);
      }
      if (patch['costPrice'] != null) {
        parts.push(`Cost price changed to ₹${patch['costPrice']}`);
      }
      if (patch['category'] != null) {
        parts.push(`Category changed to "${String(patch['category'])}"`);
      }
      if (log.details?.showItemToggled && log.details?.action) {
        parts.push(`Item ${log.details.action}`);
      }
      if (parts.length) return parts.join('; ');
    }

    if (log.description?.trim()) return log.description.trim();

    if (log.entityName) return `${log.type}: "${log.entityName}"`;
    return log.type || 'Activity';
  }

  logIcon(log: ActivityLog): string {
    switch (log.type) {
      case 'Item Added':
      case 'Order Added':
      case 'Customer Added':
      case 'Staff Added':
        return 'add_circle';
      case 'Item Deleted':
      case 'Order Deleted':
      case 'Customer Deleted':
      case 'Staff Deleted':
        return 'delete';
      case 'Item Edited':
      case 'Customer Edited':
      case 'Staff Updated':
        return 'edit';
      case 'Store Opened':
        return 'storefront';
      case 'Store Closed':
        return 'store';
      case 'WhatsApp Campaign Sent':
        return 'chat';
      default:
        return 'history';
    }
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