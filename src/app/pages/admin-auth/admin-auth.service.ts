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
  /** 'admin' | 'sub_admin' – used to hide Sub Admins, Payments, Subscriptions for sub_admin */
  role?: string;
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

type UnknownRecord = Record<string, unknown>;

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
    const data = this.asRecord(res['data']) ?? res;
    const access_token = this.normalizeToken(
      this.getFirstString(data, ['access_token', 'accessToken', 'token', 'jwt', 'jwtToken'])
    );
    const rawAdmin =
      this.asRecord(data['admin']) ?? this.asRecord(data['user']) ?? this.asRecord(data['profile']) ?? {};
    if (!access_token) {
      throw new Error('Invalid login response: missing token');
    }
    const admin: AdminProfile = {
      id: String(rawAdmin['id'] ?? ''),
      name: String(rawAdmin['name'] ?? ''),
      email: String(rawAdmin['email'] ?? ''),
      address: String(rawAdmin['address'] ?? ''),
      phoneNumber: String(rawAdmin['phoneNumber'] ?? rawAdmin['phone_number'] ?? ''),
      role: rawAdmin['role'] != null ? String(rawAdmin['role']) : undefined,
    };
    return { access_token, admin };
  }

  /** True if current user is a sub_admin (restricted sidebar and routes). */
  isSubAdmin(): boolean {
    const admin = this.getCurrentAdmin();
    const role = (admin?.role ?? '').toLowerCase();
    const isSubAdmin = role === 'sub_admin';
    console.log('[AdminAuth] isSubAdmin check:', { role, isSubAdmin, admin });
    return isSubAdmin;
  }

  /** Store token and admin after successful login. */
  setSession(access_token: string, admin: AdminProfile): void {
    const session: StoredSession = { access_token: this.normalizeToken(access_token), admin };
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

  private normalizeToken(token: string): string {
    return token.replace(/^Bearer\s+/i, '').trim();
  }

  private getFirstString(source: UnknownRecord, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return '';
  }

  private asRecord(value: unknown): UnknownRecord | null {
    return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;
  }
}
