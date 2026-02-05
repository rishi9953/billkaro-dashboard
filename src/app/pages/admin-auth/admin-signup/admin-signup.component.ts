import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AdminAuthService } from '../admin-auth.service';

@Component({
  selector: 'app-admin-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Admin Signup</h1>
          <p>Create an admin account</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="name">Name</label>
            <input id="name" type="text" formControlName="name" placeholder="Admin name" />
            <div class="hint error" *ngIf="f['name'].touched && f['name'].errors">
              <span *ngIf="f['name'].errors['required']">Name is required</span>
              <span *ngIf="f['name'].errors['minlength']">Minimum 2 characters</span>
            </div>
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" placeholder="admin@example.com" />
            <div class="hint error" *ngIf="f['email'].touched && f['email'].errors">
              <span *ngIf="f['email'].errors['required']">Email is required</span>
              <span *ngIf="f['email'].errors['email']">Enter a valid email</span>
            </div>
          </div>

          <div class="field">
            <label for="password">Password</label>
            <div class="password-wrapper">
              <input
                id="password"
                [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="hidePassword = !hidePassword"
                [attr.aria-label]="hidePassword ? 'Show password' : 'Hide password'"
                tabindex="-1"
              >
                <mat-icon>{{ hidePassword ? 'visibility' : 'visibility_off' }}</mat-icon>
              </button>
            </div>
            <div class="hint error" *ngIf="f['password'].touched && f['password'].errors">
              <span *ngIf="f['password'].errors['required']">Password is required</span>
              <span *ngIf="f['password'].errors['minlength']">Minimum 6 characters</span>
            </div>
          </div>

          <div class="field">
            <label for="address">Address</label>
            <input id="address" type="text" formControlName="address" placeholder="Full address" />
            <div class="hint error" *ngIf="f['address'].touched && f['address'].errors">
              <span *ngIf="f['address'].errors['required']">Address is required</span>
              <span *ngIf="f['address'].errors['minlength']">Minimum 5 characters</span>
            </div>
          </div>

          <div class="field">
            <label for="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              formControlName="phoneNumber"
              placeholder="+1 555 123 4567"
            />
            <div class="hint error" *ngIf="f['phoneNumber'].touched && f['phoneNumber'].errors">
              <span *ngIf="f['phoneNumber'].errors['required']">Phone number is required</span>
              <span *ngIf="f['phoneNumber'].errors['pattern']">Enter a valid phone number</span>
            </div>
          </div>

          <div class="banner error" *ngIf="error">{{ error }}</div>
          <div class="banner success" *ngIf="success">{{ success }}</div>

          <button class="primary" type="submit" [disabled]="loading">
            {{ loading ? 'Creating...' : 'Create Account' }}
          </button>

          <div class="footer">
            <span>Already have an account?</span>
            <a routerLink="/admin/login">Login</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: radial-gradient(1200px 600px at 10% 10%, rgba(90, 103, 216, 0.25), transparent 55%),
          radial-gradient(1200px 600px at 90% 90%, rgba(34, 197, 94, 0.18), transparent 55%),
          #0b1220;
      }

      .auth-card {
        width: 100%;
        max-width: 520px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        padding: 22px;
        color: #e5e7eb;
        backdrop-filter: blur(10px);
      }

      .auth-header {
        margin-bottom: 16px;
      }

      .auth-header h1 {
        margin: 0 0 6px 0;
        font-size: 22px;
        font-weight: 700;
        color: #ffffff;
      }

      .auth-header p {
        margin: 0;
        color: rgba(229, 231, 235, 0.8);
        font-size: 13px;
      }

      .field {
        margin-bottom: 12px;
      }

      .field label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.85);
      }

      .field input {
        width: 100%;
        box-sizing: border-box;
        padding: 11px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.22);
        color: #ffffff;
        outline: none;
      }

      .field input:focus {
        border-color: rgba(90, 103, 216, 0.85);
        box-shadow: 0 0 0 4px rgba(90, 103, 216, 0.18);
      }

      .field .password-wrapper {
        display: flex;
        align-items: center;
        gap: 0;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.22);
      }

      .field .password-wrapper input {
        flex: 1;
        border: none;
        background: transparent;
        padding-right: 8px;
      }

      .field .password-wrapper input:focus {
        box-shadow: none;
      }

      .field .password-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        border-radius: 0 8px 8px 0;
      }

      .field .password-toggle mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .field .password-toggle:hover {
        color: rgba(255, 255, 255, 0.95);
      }

      .hint {
        margin-top: 6px;
        font-size: 12px;
      }

      .banner {
        margin: 10px 0 12px 0;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 13px;
      }

      .error {
        color: #fecaca;
      }

      .banner.error {
        background: rgba(220, 38, 38, 0.16);
        border: 1px solid rgba(220, 38, 38, 0.35);
      }

      .banner.success {
        color: #bbf7d0;
        background: rgba(34, 197, 94, 0.16);
        border: 1px solid rgba(34, 197, 94, 0.35);
      }

      button.primary {
        width: 100%;
        border: none;
        border-radius: 10px;
        padding: 11px 14px;
        font-weight: 700;
        cursor: pointer;
        background: linear-gradient(135deg, #5a67d8, #22c55e);
        color: #0b1220;
      }

      button.primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .footer {
        margin-top: 14px;
        display: flex;
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        color: rgba(229, 231, 235, 0.85);
      }

      .footer a {
        color: #a5b4fc;
        text-decoration: none;
        font-weight: 700;
      }

      .footer a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class AdminSignupComponent {
  loading = false;
  error: string | null = null;
  success: string | null = null;
  hidePassword = true;

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AdminAuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],
    });
  }

  get f() {
    return this.form.controls;
  }

  submit(): void {
    this.error = null;
    this.success = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      this.auth.signup({
        name: this.form.value.name!,
        email: this.form.value.email!,
        password: this.form.value.password!,
        address: this.form.value.address!,
        phoneNumber: this.form.value.phoneNumber!,
      });
      this.success = 'Account created. Redirecting to login...';
      setTimeout(() => this.router.navigate(['/admin/login']), 700);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Signup failed.';
    } finally {
      this.loading = false;
    }
  }
}

