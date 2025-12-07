import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { PageCardComponent } from '../../shared/components/page-card/page-card.component';
import { HOME_DATA } from '../../shared/data/home-data';
import { PageCardType } from '../../shared/types/dashboard.types';

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
  imports: [CommonModule, HttpClientModule, MatIconModule, PageCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  homeData = { CARD: [...HOME_DATA.CARD] };
  private apiUrl = 'https://65.2.81.212/api/users';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData(): void {
    this.http.get<ApiResponse>(this.apiUrl).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          this.updateCardData(response.data);
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

    this.homeData.CARD = this.homeData.CARD.map((card: PageCardType) => {
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
    });
  }

  onCardClicked(title: string): void {
    console.log('Card clicked:', title);
    if (title === 'Pending Requests') {
      // Navigate to pending requests page or show modal
    }
  }
}
