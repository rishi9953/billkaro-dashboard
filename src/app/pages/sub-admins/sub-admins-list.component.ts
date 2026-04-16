import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { SubAdminFormDialogComponent } from './sub-admin-form-dialog.component';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';

export interface SubAdmin {
  id: string;
  subadminId?: string;
  name: string;
  email: string;
  address?: string;
  phoneNumber?: string;
  role?: string;
  parentAdminId?: string;
  createdAt: string;
}

/** API response: { subAdmins: SubAdmin[] } */
interface SubAdminsApiResponse {
  subAdmins: SubAdmin[];
}

@Component({
  selector: 'app-sub-admins-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './sub-admins-list.component.html',
  styleUrls: ['./sub-admins-list.component.scss']
})
export class SubAdminsListComponent implements OnInit, OnDestroy {
  subAdmins: SubAdmin[] = [];
  loading = false;
  error: string | null = null;
  deletingIds = new Set<string>();
  private apiUrl = `${API_ENDPOINTS.SUB_ADMINS}s`;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchSubAdmins();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchSubAdmins(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.http.get(this.apiUrl, { responseType: 'text', observe: 'response' }).subscribe({
      next: (res) => {
        const bodyText = (res.body ?? '').toString();
        let response: unknown = null;
        if (bodyText.trim().length > 0) {
          try {
            response = JSON.parse(bodyText);
          } catch {
            this.subAdmins = [];
            this.loading = false;
            this.error = 'API returned non-JSON. Please check the endpoint.';
            this.cdr.detectChanges();
            return;
          }
        }

        if (response && typeof response === 'object' && (response as SubAdminsApiResponse).subAdmins) {
          const list = (response as SubAdminsApiResponse).subAdmins;
          this.subAdmins = Array.isArray(list) ? list : [];
        } else if (response && typeof response === 'object' && (response as { data?: unknown }).data) {
          const data = (response as { data: unknown }).data;
          this.subAdmins = Array.isArray(data) ? data : [];
        } else if (Array.isArray(response)) {
          this.subAdmins = response as SubAdmin[];
        } else {
          this.subAdmins = [];
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching sub admins:', error);
        this.error = error.error?.message || error.message || 'Failed to fetch sub admins. Please try again later.';
        this.subAdmins = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(SubAdminFormDialogComponent, {
      width: '90%',
      maxWidth: '500px',
      disableClose: false,
      panelClass: 'sub-admin-dialog',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.fetchSubAdmins();
      }
    });
  }

  openEditDialog(admin: SubAdmin): void {
    const dialogRef = this.dialog.open(SubAdminFormDialogComponent, {
      width: '90%',
      maxWidth: '500px',
      disableClose: false,
      panelClass: 'sub-admin-dialog',
      data: admin
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.fetchSubAdmins();
      }
    });
  }

  deleteSubAdmin(admin: SubAdmin): void {
    const subadminId = this.getSubadminId(admin);
    if (!subadminId) {
      this.error = 'Unable to delete sub admin: missing subadminId.';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = window.confirm(`Delete ${admin.name}? This action cannot be undone.`);
    if (!confirmed) return;

    this.error = null;
    this.deletingIds.add(subadminId);
    this.cdr.detectChanges();

    this.http.delete(API_ENDPOINTS.SUB_ADMIN_DELETE(subadminId)).subscribe({
      next: () => {
        this.subAdmins = this.subAdmins.filter((item) => this.getSubadminId(item) !== subadminId);
        this.deletingIds.delete(subadminId);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting sub admin:', error);
        this.error = error.error?.message || error.message || 'Failed to delete sub admin. Please try again later.';
        this.deletingIds.delete(subadminId);
        this.cdr.detectChanges();
      }
    });
  }

  isDeleting(admin: SubAdmin): boolean {
    return this.deletingIds.has(this.getSubadminId(admin));
  }

  private getSubadminId(admin: SubAdmin): string {
    return (admin.subadminId || admin.id || '').trim();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
