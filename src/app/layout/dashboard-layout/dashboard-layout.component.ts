import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';
import { SIDEBAR_ROUTING, SIDEBAR_ROUTING_BOTTOM } from '../../shared/constants/sidebar-routing.constant';
import { NavItemLinkType } from '../../shared/types/nav-item-link.type';
import { AdminAuthService } from '../../pages/admin-auth/admin-auth.service';
import { ThemeService } from '../../core/theme.service';
import { PAGE_URL } from '../../utilities/constant/page-url.constant';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  private static readonly SIDEBAR_COLLAPSED_KEY = 'billkaro-sidebar-collapsed';
  pageDashboardLink: NavItemLinkType[] = [];
  pageDashboardLinkBottom: NavItemLinkType[] = [];
  showSignOutModal = false;
  sidebarOpen = false;
  sidebarCollapsed = false;
  name = 'Guest';
  email = 'guest@example.com';
  currentPageTitle = 'Dashboard';
  globalSearch = '';
  selectedPeriod = '6m';
  notificationCount = 3;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private adminAuth: AdminAuthService,
    public themeService: ThemeService
  ) {}

  /** Tabs hidden for sub_admin: Sub Admins, Payments, Subscriptions. */
  private static readonly SUB_ADMIN_HIDDEN_ACCESS = new Set(['SUB_ADMINS', 'PAYMENTS', 'SUBSCRIPTIONS']);

  ngOnInit(): void {
    const admin = this.adminAuth.getCurrentAdmin();
    const isSubAdmin = this.adminAuth.isSubAdmin();

    this.pageDashboardLink = isSubAdmin
      ? SIDEBAR_ROUTING.filter(
          (item) => !(item.accessName && DashboardLayoutComponent.SUB_ADMIN_HIDDEN_ACCESS.has(item.accessName)),
        )
      : SIDEBAR_ROUTING;
    this.pageDashboardLinkBottom = SIDEBAR_ROUTING_BOTTOM;
    this.sidebarCollapsed = localStorage.getItem(DashboardLayoutComponent.SIDEBAR_COLLAPSED_KEY) === 'true';

    if (admin) {
      this.name = admin.name;
      this.email = admin.email;
    }

    this.updateCurrentPageTitle();

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
    const allRoutes = [...this.pageDashboardLink, ...this.pageDashboardLinkBottom];
    const matchedRoute = allRoutes.find(route => {
      if (route.path) {
        return currentUrl === route.path || currentUrl.startsWith(route.path + '/');
      }
      return false;
    });

    if (matchedRoute) {
      this.currentPageTitle = matchedRoute.label;
    } else if (currentUrl.includes('/users')) {
      this.currentPageTitle = 'Users';
    } else if (currentUrl.includes('/orders')) {
      this.currentPageTitle = 'Printer Orders';
    } else {
      this.currentPageTitle = 'Dashboard';
    }
  }

  onGlobalSearch(): void {
    const q = this.globalSearch.trim().toLowerCase();
    if (!q) return;
    if (q.includes('user') || q.includes('outlet')) {
      this.router.navigateByUrl(PAGE_URL.USERS);
    } else if (q.includes('payment') || q.includes('transaction') || q.includes('revenue')) {
      this.router.navigateByUrl(PAGE_URL.PAYMENTS);
    } else if (q.includes('order') || q.includes('printer')) {
      this.router.navigateByUrl(PAGE_URL.ORDERS);
    } else if (q.includes('subscription') || q.includes('plan')) {
      this.router.navigateByUrl(PAGE_URL.SUBSCRIPTIONS);
    } else {
      this.router.navigateByUrl(PAGE_URL.USERS);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem(DashboardLayoutComponent.SIDEBAR_COLLAPSED_KEY, String(this.sidebarCollapsed));
  }

  navigateToRoute(path: string): void {
    const targetPath = path.startsWith('/') ? path : '/' + path;
    const currentUrl = this.router.url;
    this.closeSidebar();

    if (currentUrl === targetPath || currentUrl === targetPath + '/') {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        setTimeout(() => this.router.navigate([targetPath]), 0);
      });
    } else {
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
    this.adminAuth.logout();
    this.router.navigate(['/admin/login']);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
