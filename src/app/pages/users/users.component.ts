import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, catchError, of } from 'rxjs';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';
import { PAGE_URL } from '../../utilities/constant/page-url.constant';
import { NumberPaginatorComponent } from '../../shared/components/number-paginator/number-paginator.component';

export interface OutletData {
  id: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  outletAddress: string;
  upiId: string;
  taxSlab: string;
  seatingCapacity: string;
  googleProfileLink: string;
  swiggyLink: string;
  zomatoLink: string;
  gstinNumber: string;
  fssaiNumber: string;
  outletAge: string;
  logo: string;
  phoneNumber: string;
}

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  brandName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  firstName: string;
  lastName: string;
  title: string;
  mobile: string;
  activate: boolean;
  activationToken: string;
  activationTokenExpiresAt: string | null;
  outletData: OutletData[];
  image?: string;
}

interface ApiResponse {
  status: string;
  data: User[];
}

type StatusFilter = 'all' | 'active' | 'pending' | 'inactive';

const AVATAR_COLORS = [
  '#4f46e5', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899',
  '#8b5cf6', '#14b8a6', '#ef4444', '#6366f1', '#06b6d4',
];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, NumberPaginatorComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  pagedUsers: User[] = [];
  searchQuery = '';
  statusFilter: StatusFilter = 'all';
  selectedState = '';
  loading = false;
  error: string | null = null;
  pageIndex = 0;
  pageSize = 10;
  selectedIds = new Set<string>();
  userImageFailed = new Set<string>();

  readonly statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All Users' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'inactive', label: 'Inactive' },
  ];

  private apiUrl = API_ENDPOINTS.USERS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchUsers(): void {
    this.loading = true;
    this.error = null;

    this.http.get<ApiResponse>(this.apiUrl, { observe: 'response' }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.body && response.body.status === 'success' && response.body.data) {
          this.users = this.sortByLatest(response.body.data);
          this.pageIndex = 0;
          this.selectedIds.clear();
          this.applyFilters();
        } else {
          this.error = 'Invalid response format';
          this.users = [];
          this.filteredUsers = [];
          this.pagedUsers = [];
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        if (error.status === 502) {
          this.error = '502 Bad Gateway: The backend server is not responding.';
        } else if (error.status === 0) {
          this.error = 'Network error: Unable to connect to the API.';
        } else if (error.status === 404) {
          this.error = '404 Not Found: The API endpoint was not found.';
        } else {
          this.error =
            error.error?.message ||
            error.message ||
            `Failed to fetch users (Status: ${error.status || 'Unknown'}).`;
        }
        this.users = [];
        this.filteredUsers = [];
        this.pagedUsers = [];
        this.cdr.detectChanges();
      },
    });
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get activeCount(): number {
    return this.users.filter((u) => this.getAccountStatus(u) === 'active').length;
  }

  get pendingCount(): number {
    return this.users.filter((u) => this.getAccountStatus(u) === 'pending').length;
  }

  get inactiveCount(): number {
    return this.users.filter((u) => this.getAccountStatus(u) === 'inactive').length;
  }

  get filteredCount(): number {
    return this.filteredUsers.length;
  }

  get totalOutlets(): number {
    return this.users.reduce((sum, u) => sum + this.getOutletCount(u), 0);
  }

  get avgOutletsPerUser(): string {
    if (!this.totalUsers) return '0';
    return (this.totalOutlets / this.totalUsers).toFixed(1);
  }

  get activeRate(): string {
    if (!this.totalUsers) return '0.0';
    return ((this.activeCount / this.totalUsers) * 100).toFixed(1);
  }

  get growthLabel(): string {
    const now = new Date();
    const thisMonth = this.users.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = this.users.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
    }).length;
    if (!lastMonth) return thisMonth > 0 ? '+100%' : '0%';
    const pct = ((thisMonth - lastMonth) / lastMonth) * 100;
    const abs = Math.abs(pct).toFixed(1);
    return `${pct >= 0 ? '+' : '-'}${abs}%`;
  }

  get uniqueStates(): string[] {
    const states = new Set<string>();
    this.users.forEach((u) => {
      const s = (u.state || '').trim();
      if (s) states.add(s);
    });
    return Array.from(states).sort((a, b) => a.localeCompare(b));
  }

  get showingFrom(): number {
    if (!this.filteredCount) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredCount);
  }

  get allPageSelected(): boolean {
    return this.pagedUsers.length > 0 && this.pagedUsers.every((u) => this.selectedIds.has(u.id));
  }

  getStatusCount(key: StatusFilter): number {
    if (key === 'all') return this.totalUsers;
    if (key === 'active') return this.activeCount;
    if (key === 'pending') return this.pendingCount;
    return this.inactiveCount;
  }

  /** Map activate + outlets into Active / Pending / Inactive buckets. */
  getAccountStatus(user: User): StatusFilter {
    if (user.activate) return 'active';
    if (this.getOutletCount(user) === 0) return 'inactive';
    return 'pending';
  }

  setStatusFilter(key: StatusFilter): void {
    this.statusFilter = key;
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onSearchChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onStateChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    if (!this.searchQuery) return;
    this.searchQuery = '';
    this.onSearchChange();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.selectedState = '';
    this.pageIndex = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  toggleSelectAll(): void {
    if (this.allPageSelected) {
      this.pagedUsers.forEach((u) => this.selectedIds.delete(u.id));
    } else {
      this.pagedUsers.forEach((u) => this.selectedIds.add(u.id));
    }
    this.cdr.detectChanges();
  }

  toggleSelect(user: User, event: Event): void {
    event.stopPropagation();
    if (this.selectedIds.has(user.id)) this.selectedIds.delete(user.id);
    else this.selectedIds.add(user.id);
    this.cdr.detectChanges();
  }

  refreshUsers(): void {
    this.fetchUsers();
  }

  exportCsv(): void {
    const rows = [
      ['Name', 'Business', 'Email', 'Mobile', 'City', 'State', 'Joined', 'Status', 'Outlets'],
      ...this.filteredUsers.map((u) => [
        this.getFullName(u),
        this.getBusinessName(u),
        u.email || '',
        u.mobile || '',
        u.city || '',
        u.state || '',
        this.formatJoinedDate(u.createdAt),
        this.getStatusText(this.getAccountStatus(u)),
        String(this.getOutletCount(u)),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billkaro-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleUserStatus(user: User, event?: Event): void {
    event?.stopPropagation();
    const newStatus = !user.activate;
    const previousStatus = user.activate;
    user.activate = newStatus;

    this.http
      .patch<{ status: string; message?: string }>(API_ENDPOINTS.USER_ACTIVATION(user.id), {
        activate: newStatus,
      })
      .pipe(
        catchError((error) => {
          user.activate = previousStatus;
          this.error =
            error.error?.message || error.message || 'Failed to update user status. Please try again.';
          this.cdr.detectChanges();
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (!response) return;
        this.error = null;
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  getStatusText(status: StatusFilter | boolean): string {
    if (typeof status === 'boolean') return status ? 'Active' : 'Pending';
    if (status === 'active') return 'Active';
    if (status === 'pending') return 'Pending';
    if (status === 'inactive') return 'Inactive';
    return 'All';
  }

  getStatusClass(user: User): string {
    const s = this.getAccountStatus(user);
    if (s === 'active') return 'status-active';
    if (s === 'pending') return 'status-pending';
    return 'status-inactive';
  }

  getBusinessName(user: User): string {
    if (user.outletData && user.outletData.length > 0) {
      return user.outletData[0].businessName || user.brandName || 'N/A';
    }
    return user.brandName || 'N/A';
  }

  getBusinessSub(user: User): string {
    const outlet = user.outletData?.[0];
    return outlet?.businessCategory || outlet?.businessType || user.brandName || '—';
  }

  getOutletCount(user: User): number {
    return user.outletData?.length || 0;
  }

  getFullName(user: User): string {
    const first = user?.firstName?.trim() ?? '';
    const last = user?.lastName?.trim() ?? '';
    return [first, last].filter(Boolean).join(' ') || user?.brandName || '—';
  }

  getHandle(user: User): string {
    const email = (user.email || '').split('@')[0];
    if (email) return `@${email.toLowerCase()}`;
    const name = this.getFullName(user).toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return name ? `@${name}` : '@user';
  }

  getInitials(user: User): string {
    const first = user.firstName?.trim()?.[0] || '';
    const last = user.lastName?.trim()?.[0] || '';
    if (first || last) return (first + last).toUpperCase();
    const name = this.getFullName(user);
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(user: User): string {
    let hash = 0;
    const key = user.id || user.email || '';
    for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
  }

  formatJoinedDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatMobile(mobile: string | null | undefined): string {
    if (!mobile) return '—';
    const digits = mobile.replace(/\s+/g, '');
    if (digits.startsWith('+')) return digits;
    if (digits.length === 10) return `+91 ${digits}`;
    return digits;
  }

  formatLocation(user: User): string {
    const parts = [user.city, user.state].filter((p) => !!(p && p.trim()));
    return parts.length ? parts.join(', ') : '—';
  }

  onUserImageError(user: User): void {
    this.userImageFailed.add(user.id);
    this.cdr.detectChanges();
  }

  openUserDetails(user: User): void {
    this.router.navigateByUrl(PAGE_URL.USER_DASHBOARD(user.id));
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    let list = [...this.users];

    if (this.statusFilter !== 'all') {
      list = list.filter((u) => this.getAccountStatus(u) === this.statusFilter);
    }
    if (this.selectedState) {
      list = list.filter((u) => (u.state || '').trim() === this.selectedState);
    }
    if (query) {
      list = list.filter((u) => this.matchesSearch(u, query));
    }

    this.filteredUsers = this.sortByLatest(list);
    if (this.pageIndex * this.pageSize >= this.filteredUsers.length) {
      this.pageIndex = 0;
    }
    this.applyPagination();
  }

  private sortByLatest(users: User[]): User[] {
    return [...users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private matchesSearch(user: User, query: string): boolean {
    const haystack = [
      user.firstName,
      user.lastName,
      this.getFullName(user),
      user.brandName,
      user.email,
      user.mobile,
      user.city,
      user.state,
      user.address,
      this.getBusinessName(user),
      ...(user.outletData || []).map((o) => o.businessName),
      ...(user.outletData || []).map((o) => o.phoneNumber),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }
}
