import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { PageCardComponent } from '../../shared/components/page-card/page-card.component';
import { HOME_DATA } from '../../shared/data/home-data';
import { PageCardType } from '../../shared/types/dashboard.types';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';

interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  businessName: string;
  brandName: string;
  email: string;
  billNumber: number;
  businessType: string;
  businessCategory: string;
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
  imageUrl: string;
  outletAddress: string;
  upiId: string;
  taxSlab: string;
  seatingCapacity: string;
  googleProfileLink: string;
  swiggyLink: string;
  zomatoLink: string;
  gstinNumber: string;
  fssaiNumber: string;
}

interface ApiResponse {
  status: string;
  data: User[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, PageCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  homeData = { CARD: [...HOME_DATA.CARD] };
  private apiUrl = API_ENDPOINTS.USERS;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchUserData(): void {
    console.log('Fetching dashboard data from:', this.apiUrl);
    this.http.get<ApiResponse>(this.apiUrl).subscribe({
      next: (response) => {
        console.log('Dashboard API response:', response);
        if (response.status === 'success' && response.data) {
          this.updateCardData(response.data);
        } else {
          console.warn('Invalid response format:', response);
          this.updateCardData([]);
        }
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
        // Fallback to default values if API fails
        this.updateCardData([]);
      }
    });
  }

  updateCardData(users: User[]): void {
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.activate).length;
    const pendingUsers = users.filter(user => !user.activate).length;

    // Create a new object to ensure change detection
    this.homeData = {
      CARD: this.homeData.CARD.map((card: PageCardType) => {
        switch (card.title) {
          case 'Total Users':
            return { ...card, count: totalUsers.toString() };
          case 'Total Customers':
            return { ...card, count: activeUsers.toString() };
          case 'Pending Requests':
            return { ...card, count: pendingUsers.toString() };
          case 'Inventory Items':
            return { ...card, count: '0' }; // Update when you have inventory data
          case 'Total Revenue':
            return { ...card, count: '₹0' }; // Update when you have revenue data
          case 'Monthly Revenue':
            return { ...card, count: '₹0' }; // Update when you have revenue data
          default:
            return card;
        }
      })
    };
    
    // Force change detection
    this.cdr.detectChanges();
    console.log('Dashboard data updated:', this.homeData);
  }

  onCardClicked(title: string): void {
    console.log('Card clicked:', title);
    if (title === 'Pending Requests') {
      // Navigate to pending requests page or show modal
    }
  }
}
