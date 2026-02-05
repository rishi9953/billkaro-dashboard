import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../utilities/constant/api-url.constant';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
}

export interface LoginResponse {
  access_token: string;
  admin: AdminProfile;
}

/** Payload for local signup (no id until created by API). */
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  address: string;
  phoneNumber: string;
}

interface StoredAdmin extends SignupPayload {
  id?: string;
}

const ACCOUNT_KEY = 'billkaro_admin_account_v1';
const SESSION_KEY = 'billkaro_admin_session_v1';

interface StoredSession {
  access_token: string;
  admin: AdminProfile;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  constructor(private http: HttpClient) {}

  /** Call backend login API; on success stores token + admin and returns admin. */
  login(email: string, password: string): Observable<AdminProfile> {
    return this.http
      .post<Record<string, unknown>>(API_ENDPOINTS.ADMIN_LOGIN, { email, password })
      .pipe(
        map((res) => this.normalizeLoginResponse(res)),
        tap(({ access_token, admin }) => this.setSession(access_token, admin)),
        map(({ admin }) => admin),
      );
  }

  /** Support multiple response shapes: { access_token, admin }, { data: { ... } }, camelCase. */
  private normalizeLoginResponse(res: Record<string, unknown>): LoginResponse {
    const data = (res['data'] as Record<string, unknown>) ?? res;
    const access_token =
      (data['access_token'] as string) ??
      (data['accessToken'] as string) ??
      (data['token'] as string) ??
      '';
    const admin = data['admin'] as AdminProfile;
    if (!access_token || !admin?.email) {
      throw new Error('Invalid login response: missing token or admin');
    }
    return { access_token, admin };
  }

  /** Store token and admin after successful login. */
  setSession(access_token: string, admin: AdminProfile): void {
    const session: StoredSession = { access_token, admin };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  signup(payload: SignupPayload): void {
    const existing = this.getStoredAccount();
    if (existing && existing.email.toLowerCase() === payload.email.toLowerCase()) {
      throw new Error('Admin already exists with this email.');
    }
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(payload));
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  getAccessToken(): string | null {
    const session = this.getStoredSession();
    return session?.access_token ?? null;
  }

  getCurrentAdmin(): AdminProfile | null {
    const session = this.getStoredSession();
    return session?.admin ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getStoredSession()?.access_token;
  }

  hasAccount(): boolean {
    return !!this.getStoredAccount();
  }

  private getStoredAccount(): StoredAdmin | null {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredAdmin;
    } catch {
      return null;
    }
  }

  private getStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
