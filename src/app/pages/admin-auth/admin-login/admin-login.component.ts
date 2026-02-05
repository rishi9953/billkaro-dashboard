import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminAuthService } from '../admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss'],
})
export class AdminLoginComponent {
  loading = false;
  error: string | null = null;
  hidePassword = true;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AdminAuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get f() {
    return this.form.controls;
  }

  submit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.auth
      .login(this.form.value.email!, this.form.value.password!)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/dashboard/home', { replaceUrl: true });
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 401) {
            this.error = 'Invalid email or password.';
            return;
          }
          const msg =
            err?.error?.message ??
            (typeof err?.error === 'string' ? err.error : null) ??
            err?.message ??
            'Login failed.';
          this.error = msg;
        },
      });
  }
}

