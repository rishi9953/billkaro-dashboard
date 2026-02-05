import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';
import { PAGE_URL } from '../../utilities/constant/page-url.constant';

Chart.register(...registerables);

export interface RecentTransaction {
  companyName: string;
  transactionId: string;
  date: string;
  amount: string;
  planType: string;
  colorIndex: number;
}

export interface RecentlyRegistered {
  companyName: string;
  planType: string;
  userCount: number;
  colorIndex: number;
}

export interface RecentPlanExpired {
  companyName: string;
  expiredDate: string;
  colorIndex: number;
}

export interface DashboardOverviewResponse {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRevenue: number;
  totalOutlets: number;
  totalOrders: number;
  closedOrders: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalOrdersRevenue: number;
}

interface User {
  id: string;
  createdAt: string;
  activate: boolean;
  brandName?: string;
  outletData?: { businessName?: string }[];
}

interface UsersApiResponse {
  status: string;
  data: User[];
}

interface PaymentForDashboard {
  id: string;
  createdAt: string;
  transactionId: string;
  amount: number;
  currency?: string;
  method?: string;
  user?: { brandName?: string; email?: string };
}

interface PaymentsApiResponse {
  status: string;
  message?: string;
  data?: PaymentForDashboard[];
  totalItems?: number;
}

const AVATAR_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9', '#6366f1', '#14b8a6'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutChartCanvas') doughnutChartCanvas!: ElementRef<HTMLCanvasElement>;

  loading = true;
  totalUsers = 0;
  activeUsers = 0;
  inactiveUsers = 0;
  totalRevenue = '₹0';
  totalOutlets = 0;
  totalOrders = 0;
  closedOrders = 0;
  activeSubscriptions = 0;
  trialUsers = 0;
  totalOrdersRevenue = '₹0';

  recentTransactions: RecentTransaction[] = [];
  recentlyRegistered: RecentlyRegistered[] = [];
  recentPlanExpired: RecentPlanExpired[] = [];

  readonly pageUrl = PAGE_URL;

  private lineChart: Chart<'line'> | null = null;
  private doughnutChart: Chart<'doughnut'> | null = null;
  private lastFetchedUsers: User[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts are inside *ngIf="!loading"; init when loading flips to false (see fetchUserData)
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.lineChart?.destroy();
    this.doughnutChart?.destroy();
  }

  fetchDashboardData(): void {
    this.loading = true;
    this.http.get<DashboardOverviewResponse | { data?: DashboardOverviewResponse }>(API_ENDPOINTS.DASHBOARD_OVERVIEW, { responseType: 'json' }).subscribe({
      next: (response) => {
        const overview = response && typeof response === 'object' && 'data' in response && response.data
          ? response.data
          : response as DashboardOverviewResponse;
        this.applyOverview(overview);
        this.loadRecentLists(overview);
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initCharts(), 0);
        this.fetchUsersForCharts();
      },
      error: () => {
        this.applyOverview(null);
        this.loadRecentLists(null);
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initCharts(), 0);
        this.fetchUsersForCharts();
      }
    });
  }

  private applyOverview(overview: DashboardOverviewResponse | null): void {
    if (!overview) {
      this.totalUsers = 0;
      this.activeUsers = 0;
      this.inactiveUsers = 0;
      this.totalRevenue = '₹0';
      this.totalOutlets = 0;
      this.totalOrders = 0;
      this.closedOrders = 0;
      this.activeSubscriptions = 0;
      this.trialUsers = 0;
      this.totalOrdersRevenue = '₹0';
      return;
    }
    this.totalUsers = overview.totalUsers ?? 0;
    this.activeUsers = overview.activeUsers ?? 0;
    this.inactiveUsers = overview.inactiveUsers ?? 0;
    this.totalRevenue = this.formatCurrency(overview.totalRevenue ?? 0);
    this.totalOutlets = overview.totalOutlets ?? 0;
    this.totalOrders = overview.totalOrders ?? 0;
    this.closedOrders = overview.closedOrders ?? 0;
    this.activeSubscriptions = overview.activeSubscriptions ?? 0;
    this.trialUsers = overview.trialUsers ?? 0;
    this.totalOrdersRevenue = this.formatCurrency(overview.totalOrdersRevenue ?? 0);
  }

  private formatCurrency(amount: number): string {
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /** Reset recent lists; then fetch from APIs */
  private loadRecentLists(_overview: DashboardOverviewResponse | null): void {
    this.recentTransactions = [];
    this.recentlyRegistered = [];
    this.recentPlanExpired = []; // No API yet – add when backend provides expired plans list
    this.fetchPaymentsForRecent();
  }

  private fetchPaymentsForRecent(): void {
    this.http.get<PaymentsApiResponse | { data?: PaymentForDashboard[] }>(API_ENDPOINTS.PAYMENTS_ADMIN_ALL, { responseType: 'json' }).subscribe({
      next: (response) => {
        const raw = response && typeof response === 'object' && 'data' in response && response.data
          ? response.data
          : (response as PaymentsApiResponse)?.data;
        const list = Array.isArray(raw) ? raw : [];
        const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.recentTransactions = sorted.slice(0, 5).map((p, i) => ({
          companyName: p.user?.brandName || p.user?.email || '—',
          transactionId: '#' + (p.transactionId || p.id).toString().slice(-5),
          date: this.formatListDate(p.createdAt),
          amount: '+₹' + Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
          planType: p.method || '—',
          colorIndex: i,
        }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.recentTransactions = [];
        this.cdr.detectChanges();
      },
    });
  }

  private formatListDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(index: number): string {
    return AVATAR_COLORS[Math.abs(index) % AVATAR_COLORS.length];
  }

  sendReminder(companyName: string): void {
    console.log('Send reminder for', companyName);
  }

  private fetchUsersForCharts(): void {
    this.http.get<UsersApiResponse>(API_ENDPOINTS.USERS, { responseType: 'json' }).subscribe({
      next: (response) => {
        if (response?.status === 'success' && Array.isArray(response.data)) {
          this.lastFetchedUsers = response.data;
          this.updateChartsData(this.lastFetchedUsers);
          this.mapUsersToRecentlyRegistered(response.data);
        }
      },
      error: () => {
        this.lastFetchedUsers = [];
        this.recentlyRegistered = [];
        this.cdr.detectChanges();
      }
    });
  }

  private mapUsersToRecentlyRegistered(users: User[]): void {
    const sorted = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.recentlyRegistered = sorted.slice(0, 5).map((u, i) => ({
      companyName: u.outletData?.[0]?.businessName || u.brandName || u.id?.slice(0, 8) || '—',
      planType: '—',
      userCount: u.outletData?.length ?? 1,
      colorIndex: i,
    }));
    this.cdr.detectChanges();
  }

  private getLast6MonthsLabels(): string[] {
    const labels: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }));
    }
    return labels;
  }

  private usersByMonth(users: User[]): number[] {
    const counts = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    users.forEach((u) => {
      const created = new Date(u.createdAt);
      const monthsAgo = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      if (monthsAgo >= 0 && monthsAgo <= 5) {
        counts[5 - monthsAgo]++;
      }
    });
    return counts;
  }

  private updateChartsData(users: User[]): void {
    const labels = this.getLast6MonthsLabels();
    const lineData = this.usersByMonth(users);

    if (this.lineChart) {
      this.lineChart.data.labels = labels;
      this.lineChart.data.datasets[0].data = lineData;
      this.lineChart.update();
    }

    if (this.doughnutChart) {
      this.doughnutChart.data.datasets[0].data = [this.activeUsers, this.inactiveUsers];
      this.doughnutChart.update();
    }
  }

  private initCharts(): void {
    if (!this.lineChartCanvas?.nativeElement || !this.doughnutChartCanvas?.nativeElement) return;
    this.lineChart?.destroy();
    this.doughnutChart?.destroy();
    this.lineChart = null;
    this.doughnutChart = null;

    const labels = this.getLast6MonthsLabels();

    const lineConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New users',
            data: [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(59, 130, 246)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: 'rgba(0,0,0,0.06)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    };

    const doughnutConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Inactive'],
        datasets: [
          {
            data: [this.activeUsers, this.inactiveUsers],
            backgroundColor: ['rgb(34, 197, 94)', 'rgb(251, 191, 36)'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    };

    const lineCtx = this.lineChartCanvas?.nativeElement?.getContext('2d');
    const doughnutCtx = this.doughnutChartCanvas?.nativeElement?.getContext('2d');
    if (lineCtx) this.lineChart = new Chart(lineCtx, lineConfig);
    if (doughnutCtx) this.doughnutChart = new Chart(doughnutCtx, doughnutConfig);
    if (this.lastFetchedUsers.length > 0) this.updateChartsData(this.lastFetchedUsers);
  }
}
