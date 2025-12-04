import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SIDEBAR_ROUTING, SIDEBAR_ROUTING_BOTTOM } from '../../shared/constants/sidebar-routing.constant';
import { NavItemLinkType } from '../../shared/types/nav-item-link.type';
// import { NavItemLinkType } from '../../shared/types/nav-item-link.type';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  pageDashboardLink: NavItemLinkType[] = [];
  pageDashboardLinkBottom: NavItemLinkType[] = [];
  showSignOutModal = false;
  name = 'Guest';
  email = 'guest@example.com';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.pageDashboardLink = SIDEBAR_ROUTING;
    this.pageDashboardLinkBottom = SIDEBAR_ROUTING_BOTTOM;
  }

  openSignOutModal(): void {
    this.showSignOutModal = true;
  }

  cancelSignOut(): void {
    this.showSignOutModal = false;
  }

  confirmSignOut(): void {
    this.showSignOutModal = false;
    this.logout();
  }

  logout(): void {
    // Clear session and redirect to login
    // this.session.logout();
    this.router.navigate(['/login']);
  }
}