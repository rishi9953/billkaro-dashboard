import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ServiceFormDialogComponent } from './service-form-dialog.component';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

const STATIC_SERVICES: ServiceItem[] = [
  {
    id: 'static-1',
    name: 'Cafe',
    value: 'cafe',
    description: 'Coffee shops and quick-service cafes with table and counter billing.',
    active: true,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'static-2',
    name: 'Restaurant',
    value: 'restaurant',
    description: 'Full-service dining with dine-in, takeaway, and kitchen workflows.',
    active: true,
    createdAt: '2024-02-01T10:00:00.000Z',
  },
  {
    id: 'static-3',
    name: 'Manufacturing',
    value: 'manufacturing',
    description: 'Production units with inventory-led billing and batch tracking.',
    active: true,
    createdAt: '2024-02-10T10:00:00.000Z',
  },
];

export interface ServiceItem {
  id: string;
  name: string;
  value?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

type ServiceFilter = 'all' | 'food' | 'retail' | 'other';
type ServiceSort = 'sequence' | 'name' | 'newest' | 'oldest';

interface ApiResponse {
  status: string;
  data: ServiceItem[];
}

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './services-list.component.html',
  styleUrls: ['./services-list.component.scss'],
})
export class ServicesListComponent implements OnInit, OnDestroy {
  services: ServiceItem[] = [];
  loading = false;
  error: string | null = null;
  togglingId: string | null = null;
  deletingId: string | null = null;
  copiedId: string | null = null;
  filter: ServiceFilter = 'all';
  searchQuery = '';
  sortBy: ServiceSort = 'sequence';
  linkedOutlets = 0;
  private destroy$ = new Subject<void>();

  readonly filterTabs: { key: ServiceFilter; label: string }[] = [
    { key: 'all', label: 'All Services' },
    { key: 'food', label: 'Food & Dining' },
    { key: 'retail', label: 'Retail & Trade' },
    { key: 'other', label: 'Custom & Other' },
  ];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.fetchServices();
    this.fetchOutletCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalCount(): number {
    return this.services.length;
  }

  get activeCount(): number {
    return this.services.filter((s) => s.active).length;
  }

  get topCategory(): ServiceItem | null {
    if (!this.services.length) return null;
    return [...this.services].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    })[0];
  }

  get filteredServices(): ServiceItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    let list = this.services.filter((s) => {
      if (this.filter !== 'all' && this.getCategory(s) !== this.filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.value || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'sequence':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return list;
  }

  getFilterCount(key: ServiceFilter): number {
    if (key === 'all') return this.totalCount;
    return this.services.filter((s) => this.getCategory(s) === key).length;
  }

  setFilter(key: ServiceFilter): void {
    this.filter = key;
  }

  getCategory(service: ServiceItem): Exclude<ServiceFilter, 'all'> {
    const key = `${service.name} ${service.value || ''}`.toLowerCase();
    if (/cafe|restaurant|food|dining|hotel|bakery|bar/.test(key)) return 'food';
    if (/retail|trade|manufactur|shop|grocery|store|wholesale/.test(key)) return 'retail';
    return 'other';
  }

  getSlug(service: ServiceItem): string {
    if (service.value?.trim()) return service.value.trim().toLowerCase();
    return service.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getIcon(service: ServiceItem): string {
    const key = this.getSlug(service);
    if (key.includes('cafe') || key.includes('coffee')) return 'local_cafe';
    if (key.includes('restaurant') || key.includes('dining')) return 'restaurant';
    if (key.includes('manufactur')) return 'precision_manufacturing';
    if (key.includes('service')) return 'handyman';
    if (key.includes('retail') || key.includes('shop')) return 'storefront';
    if (key.includes('other')) return 'category';
    return 'miscellaneous_services';
  }

  getIconTone(service: ServiceItem): string {
    const key = this.getSlug(service);
    if (key.includes('cafe') || key.includes('coffee')) return 'orange';
    if (key.includes('restaurant') || key.includes('dining')) return 'green';
    if (key.includes('manufactur')) return 'blue';
    if (key.includes('service')) return 'violet';
    if (key.includes('retail') || key.includes('shop')) return 'teal';
    return 'purple';
  }

  getDescription(service: ServiceItem): string {
    if (service.description?.trim()) return service.description.trim();
    return `${service.name} business category for BillKaro Windows & Web POS catalog modules.`;
  }

  estimateLinkedOutlets(service: ServiceItem, index: number): number {
    if (!this.linkedOutlets || !this.totalCount) return 0;
    const base = Math.floor(this.linkedOutlets / this.totalCount);
    const rem = this.linkedOutlets % this.totalCount;
    return base + (index < rem ? 1 : 0);
  }

  fetchServices(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(API_ENDPOINTS.SERVICES, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();

        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            this.services = [...STATIC_SERVICES];
            this.loading = false;
            this.error = `API returned non-JSON (status ${res.status}). Showing sample data.`;
            this.cdr.detectChanges();
            return;
          }
        }

        const normalize = (items: unknown[]): ServiceItem[] =>
          items
            .map((raw) => {
              const r = raw as Partial<ServiceItem> & { isActive?: boolean; active?: boolean };
              const createdAt =
                typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();
              return {
                id: String((r as { id?: unknown }).id ?? ''),
                name: String((r as { name?: unknown }).name ?? ''),
                value:
                  typeof (r as { value?: unknown }).value === 'string'
                    ? (r as { value: string }).value
                    : undefined,
                description: typeof r.description === 'string' ? r.description : undefined,
                active: typeof r.active === 'boolean' ? r.active : !!r.isActive,
                createdAt,
                updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
              };
            })
            .filter((s) => s.id.length > 0 && s.name.length > 0);

        let fromApi: ServiceItem[] = [];
        if (response && typeof response === 'object' && (response as ApiResponse).status === 'success') {
          const data = (response as ApiResponse).data as unknown;
          fromApi = Array.isArray(data) ? normalize(data) : [];
        } else if (Array.isArray(response)) {
          fromApi = normalize(response);
        } else if (response && typeof response === 'object' && (response as { data?: unknown }).data) {
          const data = (response as { data: unknown }).data;
          fromApi = Array.isArray(data) ? normalize(data) : [];
        }

        this.services = fromApi.length > 0 ? fromApi : [...STATIC_SERVICES];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error =
          err.error?.message || err.message || 'Using sample data. You can still add new services.';
        this.services = [...STATIC_SERVICES];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private fetchOutletCount(): void {
    this.http.get(API_ENDPOINTS.DASHBOARD_OVERVIEW, { responseType: 'text' }).subscribe({
      next: (body) => {
        try {
          const parsed = JSON.parse(body || '{}');
          const overview = parsed?.data ?? parsed;
          this.linkedOutlets = Number(overview?.totalOutlets || 0);
          this.cdr.detectChanges();
        } catch {
          /* ignore */
        }
      },
      error: () => {
        /* ignore */
      },
    });
  }

  onToggleChange(service: ServiceItem): void {
    const checked = !service.active;
    this.togglingId = service.id;
    this.cdr.detectChanges();

    if (service.id.startsWith('static-')) {
      service.active = checked;
      this.togglingId = null;
      this.cdr.detectChanges();
      return;
    }

    this.http
      .patch(API_ENDPOINTS.SERVICE_UPDATE(service.id), { active: checked }, { responseType: 'text' })
      .subscribe({
        next: () => {
          service.active = checked;
          service.updatedAt = new Date().toISOString();
          this.togglingId = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.togglingId = null;
          this.cdr.detectChanges();
        },
      });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(ServiceFormDialogComponent, {
      width: '90%',
      maxWidth: '480px',
      disableClose: false,
      panelClass: 'service-dialog',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchServices();
    });
  }

  openEditDialog(service: ServiceItem): void {
    if (service.id.startsWith('static-')) return;

    const dialogRef = this.dialog.open(ServiceFormDialogComponent, {
      width: '90%',
      maxWidth: '480px',
      disableClose: false,
      panelClass: 'service-dialog',
      data: service,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchServices();
    });
  }

  cloneService(service: ServiceItem): void {
    const clone: ServiceItem = {
      ...service,
      id: '',
      name: `${service.name} (Copy)`,
      value: service.value ? `${service.value}-copy` : undefined,
      createdAt: new Date().toISOString(),
    };
    const dialogRef = this.dialog.open(ServiceFormDialogComponent, {
      width: '90%',
      maxWidth: '480px',
      disableClose: false,
      panelClass: 'service-dialog',
      data: clone,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') this.fetchServices();
    });
  }

  deleteService(service: ServiceItem): void {
    if (service.id.startsWith('static-')) return;
    if (this.deletingId) return;

    const ok = window.confirm(`Delete service "${service.name}"? This cannot be undone.`);
    if (!ok) return;

    this.deletingId = service.id;
    this.error = null;
    this.cdr.detectChanges();

    this.http.delete(API_ENDPOINTS.SERVICE_UPDATE(service.id), { responseType: 'text' }).subscribe({
      next: () => {
        this.deletingId = null;
        this.fetchServices();
      },
      error: (err) => {
        this.error = err.error?.message || err.message || 'Failed to delete service.';
        this.deletingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  copySlug(service: ServiceItem): void {
    const slug = this.getSlug(service);
    if (!slug || !navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(slug).then(() => {
      this.copiedId = service.id;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedId = null;
        this.cdr.detectChanges();
      }, 1500);
    });
  }

  exportCatalog(): void {
    if (!this.services.length) return;
    const headers = ['Name', 'Slug', 'Description', 'Active', 'Created At'];
    const rows = this.services.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      this.getSlug(s),
      `"${this.getDescription(s).replace(/"/g, '""')}"`,
      s.active ? 'true' : 'false',
      s.createdAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `services-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  isStatic(service: ServiceItem): boolean {
    return service.id.startsWith('static-');
  }
}
