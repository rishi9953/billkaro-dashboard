import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageCardComponent } from '../../shared/components/page-card/page-card.component';
import { HOME_DATA } from '../../shared/data/home-data';
import { PageCardType } from '../../shared/types/dashboard.types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, PageCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  homeData = { CARD: [...HOME_DATA.CARD] };
  
  ngOnInit(): void {
      this.updateCardData();
  }

  updateCardData(): void {
    this.homeData.CARD = this.homeData.CARD.map((card: PageCardType) => {
      switch (card.title) {
        case 'Total Users':
          return { ...card, count: '1,250' };
        case 'Total Customers':
          return { ...card, count: '850' };
        case 'Pending Requests':
          return { ...card, count: '24' };
        default:
          return card;
      }
    });
  }

  onCardClicked(title: string): void {
    console.log('Card clicked:', title);
    if (title === 'Pending Requests') {
    }
  }
}