import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminAuthService, AdminProfile } from '../admin-auth/admin-auth.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss'],
})
export class AdminProfileComponent implements OnInit {
  admin: AdminProfile | null = null;

  constructor(private adminAuth: AdminAuthService) {}

  ngOnInit(): void {
    this.admin = this.adminAuth.getCurrentAdmin();
  }

  display(value: string | null | undefined): string {
    return value != null && String(value).trim() !== '' ? String(value).trim() : '—';
  }

  get initial(): string {
    if (!this.admin?.name) return '?';
    return this.admin.name.charAt(0).toUpperCase();
  }
}
