/**
 * API Base URL Configuration
 * GitHub Pages doesn't support server-side proxies, so we use the direct API URL
 * For local development, it also uses the direct URL
 */
export const API_BASE_URL = 
// 'https://65.2.81.212/api';
  'https://nmsmfkdd-3000.inc1.devtunnels.ms/api';

// 'https://65.2.81.212/api'

/**
 * API Endpoints
 * All API endpoints are defined here for centralized management
 */
export const API_ENDPOINTS = {
  USERS: `${API_BASE_URL}/users`,
  /** Sub admins: GET list, POST create. Response: { subAdmins: SubAdmin[] } */
  SUB_ADMINS: `${API_BASE_URL}/auth/admin/sub-admin`,
  SUB_ADMIN_UPDATE: (id: string) => `${API_BASE_URL}/auth/admin/sub-admins/${id}`,
  SUB_ADMIN_DELETE: (subadminId: string) => `${API_BASE_URL}/auth/admin/sub-admin/${subadminId}`,
  SUBSCRIPTION_PLANS: `${API_BASE_URL}/subscription-plans`,
  /**
   * Get subscription plan update endpoint (uses PUT method)
   * @param id - Subscription plan ID
   * @returns Full URL for updating a subscription plan: /api/subscription-plans/{id}
   */
  SUBSCRIPTION_PLAN_UPDATE: (id: string) => `${API_BASE_URL}/subscription-plans/${id}`,
  /** Admin login: POST with { email, password }, returns { access_token, admin } */
  ADMIN_LOGIN: `${API_BASE_URL}/auth/admin/login`,
  /** Admin payments list: GET /api/payments/admin/all (Bearer token required) */
  PAYMENTS_ADMIN_ALL: `${API_BASE_URL}/payments/admin/all`,
  /** Printer orders list: GET /api/printer-orders (Bearer token required). */
  ORDERS_PRINTER: `${API_BASE_URL}/printer-orders`,
  /** Update printer order status: PATCH /api/printer-orders/{id} (Bearer token required). */
  ORDERS_PRINTER_UPDATE: (id: string) => `${API_BASE_URL}/printer-orders/${id}`,
  /** Dashboard overview stats: GET (Bearer token required) */
  DASHBOARD_OVERVIEW: `${API_BASE_URL}/dashboard/overview`,
  /** Services list: GET. Create/update when backend is ready. */
  SERVICES: `${API_BASE_URL}/services`,
  SERVICE_UPDATE: (id: string) => `${API_BASE_URL}/services/${id}`,
};


