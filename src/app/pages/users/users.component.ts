import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, catchError, of } from 'rxjs';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';
import { UserDetailsDialogComponent } from './user-details-dialog/user-details-dialog.component';
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
  /** User profile/avatar image URL */
  image?: string;
}

interface ApiResponse {
  status: string;
  data: User[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, NumberPaginatorComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  pagedUsers: User[] = [];
  loading = false;
  error: string | null = null;
  pageIndex = 0;
  readonly pageSize = 10;
  private apiUrl = API_ENDPOINTS.USERS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
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
    console.log('Fetching users from:', this.apiUrl);

    this.http.get<ApiResponse>(this.apiUrl, { observe: 'response' }).subscribe({
      next: (response) => {
        console.log('Users API response: here', response);
        this.loading = false;
        if (response.body && response.body.status === 'success' && response.body.data) {
          this.users = response.body.data;
          this.pageIndex = 0;
          this.applyPagination();
          this.cdr.detectChanges();
          console.log('Users loaded:', this.users.length);
        } else {
          console.warn('Invalid response format:', response.body);
          this.error = 'Invalid response format';
          this.users = [];
          this.pagedUsers = [];
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching users:', error);

        // Provide more detailed error messages
        if (error.status === 502) {
          this.error = '502 Bad Gateway: The backend server is not responding. Please check if the API server at https://65.2.81.212 is running and accessible.';
        } else if (error.status === 0) {
          this.error = 'Network error: Unable to connect to the API. This might be a CORS issue or the server is unreachable.';
        } else if (error.status === 404) {
          this.error = '404 Not Found: The API endpoint was not found.';
        } else {
          this.error = error.error?.message || error.message || `Failed to fetch users (Status: ${error.status || 'Unknown'}). Please try again later.`;
        }
        this.users = [];
        this.pagedUsers = [];
        this.cdr.detectChanges();
      }
    });
  }

  onPageChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.applyPagination();
    this.cdr.detectChanges();
  }

  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedUsers = this.users.slice(start, start + this.pageSize);
  }

  refreshUsers(): void {
    this.fetchUsers();
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.activate;
    const previousStatus = user.activate;

    user.activate = newStatus;

    this.http
      .patch<{ status: string; message?: string }>(
        API_ENDPOINTS.USER_ACTIVATION(user.id),
        { activate: newStatus },
      )
      .pipe(
        catchError((error) => {
          user.activate = previousStatus;
          console.error('Failed to update user status:', error);
          this.error =
            error.error?.message ||
            error.message ||
            'Failed to update user status. Please try again.';
          this.cdr.detectChanges();
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (!response) return;
        this.error = null;
        console.log(`User ${user.id} status changed to ${newStatus}`);
        this.cdr.detectChanges();
      });
  }

  getStatusClass(status: boolean): string {
    return status ? 'status-active' : 'status-pending';
  }

  getStatusText(status: boolean): string {
    return status ? 'Active' : 'Pending';
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter(user => user.activate).length;
  }

  get pendingUsers(): number {
    return this.users.filter(user => !user.activate).length;
  }

  getBusinessName(user: User): string {
    if (user.outletData && user.outletData.length > 0) {
      return user.outletData[0].businessName || user.brandName || 'N/A';
    }
    return user.brandName || 'N/A';
  }

  getOutletCount(user: User): number {
    return user.outletData?.length || 0;
  }

  getFullName(user: User): string {
    const first = user?.firstName?.trim() ?? '';
    const last = user?.lastName?.trim() ?? '';
    return [first, last].filter(Boolean).join(' ') || user?.brandName || '—';
  }

  /** Track failed image loads so we can show placeholder */
  userImageFailed = new Set<string>();
  onUserImageError(user: User): void {
    this.userImageFailed.add(user.id);
    this.cdr.detectChanges();
  }

  openUserDetails(user: User): void {
    this.dialog.open(UserDetailsDialogComponent, {
      width: '90%',
      maxWidth: '700px',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'user-details-dialog',
      data: user
    });
  }
}

