import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { ServiceFormDialogComponent } from './service-form-dialog.component';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';

/** Static services shown when API is unavailable or returns empty */
const STATIC_SERVICES: ServiceItem[] = [
  { id: 'static-1', name: 'Bill Printing', active: true, createdAt: '2024-01-15T10:00:00.000Z' },
  { id: 'static-2', name: 'SMS Notifications', active: true, createdAt: '2024-02-01T10:00:00.000Z' },
  { id: 'static-3', name: 'Receipt Generation', active: false, createdAt: '2024-02-10T10:00:00.000Z' },
];

export interface ServiceItem {
  id: string;
  name: string;
  value?: string;
  description?: string;
  /** API: `active` boolean */
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiResponse {
  status: string;
  data: ServiceItem[];
}

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSlideToggleModule, MatDialogModule],
  templateUrl: './services-list.component.html',
  styleUrls: ['./services-list.component.scss'],
})
export class ServicesListComponent implements OnInit, OnDestroy {
  services: ServiceItem[] = [];
  loading = false;
  error: string | null = null;
  togglingId: string | null = null;
  deletingId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchServices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
              const createdAt = typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();
              return {
                id: String((r as { id?: unknown }).id ?? ''),
                name: String((r as { name?: unknown }).name ?? ''),
                value: typeof (r as { value?: unknown }).value === 'string' ? (r as { value: string }).value : undefined,
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
        console.error('Error fetching services', err);
        this.error =
          err.error?.message || err.message || 'Using sample data. You can still add new services.';
        this.services = [...STATIC_SERVICES];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onToggleChange(service: ServiceItem, checked: boolean): void {
    this.togglingId = service.id;
    this.cdr.detectChanges();

    // Static/sample items: update locally only
    if (service.id.startsWith('static-')) {
      service.active = checked;
      this.togglingId = null;
      this.cdr.detectChanges();
      return;
    }

    const url = API_ENDPOINTS.SERVICE_UPDATE(service.id);
    // API expects: { active: boolean }
    this.http.patch(url, { active: checked }, { responseType: 'text' }).subscribe({
      next: () => {
        service.active = checked;
        if (service.updatedAt) service.updatedAt = new Date().toISOString();
        this.togglingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        service.active = !checked;
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
      if (result === 'success') {
        this.fetchServices();
      }
    });
  }

  openEditDialog(service: ServiceItem): void {
    // For now, only allow editing persisted API items
    if (service.id.startsWith('static-')) return;

    const dialogRef = this.dialog.open(ServiceFormDialogComponent, {
      width: '90%',
      maxWidth: '480px',
      disableClose: false,
      panelClass: 'service-dialog',
      data: service,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'success') {
        this.fetchServices();
      }
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
        console.error('Error deleting service', err);
        this.error = err.error?.message || err.message || 'Failed to delete service.';
        this.deletingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
