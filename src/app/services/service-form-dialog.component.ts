import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { API_ENDPOINTS } from '../utilities/constant/api-url.constant';
import { ServiceItem } from './services-list.component';

@Component({
  selector: 'app-service-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  templateUrl: './service-form-dialog.component.html',
  styleUrls: ['./service-form-dialog.component.scss'],
})
export class ServiceFormDialogComponent implements OnInit {
  serviceForm: FormGroup;
  submitted = false;
  loading = false;
  error: string | null = null;
  isEditMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<ServiceFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ServiceItem | null
  ) {
    this.isEditMode = !!data;
    this.serviceForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      active: [true],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.serviceForm.patchValue({
        name: this.data.name,
        active: this.data.active,
      });
    }
  }

  get f() {
    return this.serviceForm.controls;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    if (this.serviceForm.invalid) return;

    this.loading = true;
    const payload = {
      name: this.serviceForm.get('name')?.value?.trim(),
      // API expects: { name: string, active: boolean }
      active: this.serviceForm.get('active')?.value ?? true,
    };

    if (this.isEditMode && this.data) {
      this.http
        .patch(API_ENDPOINTS.SERVICE_UPDATE(this.data.id), payload, {
          responseType: 'text',
        })
        .subscribe({
          next: () => {
            this.loading = false;
            this.dialogRef.close('success');
          },
          error: (err) => {
            this.loading = false;
            this.error =
              err.error?.message || err.message || 'Failed to update service.';
          },
        });
    } else {
      this.http
        .post(API_ENDPOINTS.SERVICES, payload, { responseType: 'text' })
        .subscribe({
          next: () => {
            this.loading = false;
            this.dialogRef.close('success');
          },
          error: (err) => {
            this.loading = false;
            this.error =
              err.error?.message || err.message || 'Failed to create service.';
          },
        });
    }
  }
}
