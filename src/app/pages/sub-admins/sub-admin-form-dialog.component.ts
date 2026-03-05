import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';
import { SubAdmin } from './sub-admins-list.component';

@Component({
  selector: 'app-sub-admin-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './sub-admin-form-dialog.component.html',
  styleUrls: ['./sub-admin-form-dialog.component.scss']
})
export class SubAdminFormDialogComponent implements OnInit {
  form: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  success = false;
  isEditMode = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<SubAdminFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubAdmin | null
  ) {
    this.isEditMode = !!data;
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      password: [''],
      confirmPassword: ['']
    });

    if (this.isEditMode) {
      this.form.patchValue({
        name: data!.name,
        email: data!.email,
        phoneNumber: data!.phoneNumber || ''
      });
      this.form.get('email')?.disable(); // Often email is read-only on edit
      this.form.get('password')?.clearValidators();
      this.form.get('confirmPassword')?.clearValidators();
    } else {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('confirmPassword')?.setValidators([Validators.required]);
    }
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.get('confirmPassword')?.updateValueAndValidity();
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  get f() {
    return this.form.controls;
  }

  togglePassword(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPassword(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  getConfirmPasswordError(): boolean {
    if (!this.submitted) return false;
    const c = this.form.get('confirmPassword');
    const p = this.form.get('password');
    return !!(c?.errors || (c?.value && p?.value && c.value !== p.value));
  }

  passwordsMismatch(): boolean {
    const p = this.form.get('password')?.value;
    const c = this.form.get('confirmPassword')?.value;
    return !!(p && c && p !== c);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    this.success = false;

    const password = this.form.get('password')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;
    if (!this.isEditMode && password !== confirmPassword) {
      this.form.get('confirmPassword')?.setErrors({ mismatch: true });
    }

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: { name: string; email: string; password?: string; phoneNumber?: string } = {
      name: (raw.name || '').trim(),
      email: (raw.email || '').trim()
    };
    if ((raw.phoneNumber || '').trim()) {
      payload.phoneNumber = (raw.phoneNumber || '').trim();
    }
    if (!this.isEditMode && password) {
      payload.password = password;
    }

    this.loading = true;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (this.isEditMode && this.data) {
      const updateUrl = API_ENDPOINTS.SUB_ADMIN_UPDATE(this.data.id);
      const updatePayload = { ...payload };
      if (password && password.length >= 6) {
        (updatePayload as { password?: string }).password = password;
      }
      delete (updatePayload as { email?: string }).email; // Backend may not allow email change
      this.http.patch(updateUrl, updatePayload, { headers }).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          setTimeout(() => this.dialogRef.close('success'), 1000);
        },
        error: (err) => {
          this.loading = false;
          this.error = this.getErrorMessage(err);
        }
      });
    } else {
      this.http.post(API_ENDPOINTS.SUB_ADMINS, payload, { headers }).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          setTimeout(() => this.dialogRef.close('success'), 1000);
        },
        error: (err) => {
          this.loading = false;
          this.error = this.getErrorMessage(err);
        }
      });
    }
  }

  private getErrorMessage(error: { status?: number; error?: { message?: string }; message?: string }): string {
    if (error.status === 0) {
      return 'Network error. Please check your connection and API server.';
    }
    if (error.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error.message) return error.error.message;
    }
    return error.message || 'Something went wrong. Please try again.';
  }
}
