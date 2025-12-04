import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PageCardType } from '../../types/dashboard.types';

@Component({
  selector: 'app-page-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './page-card.component.html',
  styleUrls: ['./page-card.component.scss']
})
export class PageCardComponent {
  @Input() card?: PageCardType;
  @Output() cardClicked = new EventEmitter<string>();

  constructor(private router: Router) {}

  isClickableCard(): boolean {
    const clickableTitles = ['Pending Requests'];
    return this.card?.title ? clickableTitles.includes(this.card.title) : false;
  }

  handleCardClick(): void {
  
  }

  navigateToAdd(): void {

  }
}