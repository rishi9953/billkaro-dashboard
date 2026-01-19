import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';

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
}

interface ApiResponse {
  status: string;
  data: User[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  loading = false;
  error: string | null = null;
  private apiUrl = API_ENDPOINTS.USERS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
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
          this.cdr.detectChanges();
          console.log('Users loaded:', this.users.length);
        } else {
          console.warn('Invalid response format:', response.body);
          this.error = 'Invalid response format';
          this.users = [];
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
        this.cdr.detectChanges();
      }
    });
  }

  refreshUsers(): void {
    this.fetchUsers();
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.activate;
    // You would typically call an API here to update the status
    // For now, we'll just update locally
    user.activate = newStatus;
    console.log(`User ${user.id} status changed to ${newStatus}`);
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
}

