import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';
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
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  pageDashboardLink: NavItemLinkType[] = [];
  pageDashboardLinkBottom: NavItemLinkType[] = [];
  showSignOutModal = false;
  sidebarOpen = false;
  name = 'Guest';
  email = 'guest@example.com';
  currentPageTitle = 'Dashboard';
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.pageDashboardLink = SIDEBAR_ROUTING;
    this.pageDashboardLinkBottom = SIDEBAR_ROUTING_BOTTOM;
    this.updateCurrentPageTitle();
    
    // Listen to route changes to update page title
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateCurrentPageTitle();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateCurrentPageTitle(): void {
    const currentUrl = this.router.url;
    
    // Check all routes to find matching page title
    const allRoutes = [...this.pageDashboardLink, ...this.pageDashboardLinkBottom];
    const matchedRoute = allRoutes.find(route => {
      if (route.path) {
        return currentUrl === route.path || currentUrl.startsWith(route.path + '/');
      }
      return false;
    });
    
    if (matchedRoute) {
      this.currentPageTitle = matchedRoute.label;
    } else {
      // Default titles based on URL patterns
      if (currentUrl.includes('/dashboard/home') || currentUrl === '/dashboard') {
        this.currentPageTitle = 'Dashboard';
      } else if (currentUrl.includes('/users')) {
        this.currentPageTitle = 'Users';
      } else if (currentUrl.includes('/subscriptions')) {
        this.currentPageTitle = 'Subscriptions';
      } else {
        this.currentPageTitle = 'Dashboard';
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  navigateToRoute(path: string): void {
    const targetPath = path.startsWith('/') ? path : '/' + path;
    const currentUrl = this.router.url;
    
    // Close sidebar on mobile after navigation
    this.closeSidebar();
    
    // If already on the same route, force reload by navigating away and back
    if (currentUrl === targetPath || currentUrl === targetPath + '/') {
      // Navigate to root temporarily to force component destruction
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        setTimeout(() => {
          this.router.navigate([targetPath]);
        }, 0);
      });
    } else {
      // Normal navigation
      this.router.navigate([targetPath]);
    }
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