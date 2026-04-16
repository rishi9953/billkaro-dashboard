/**
 * API Base URL Configuration
 * Use relative `/api` so Netlify can proxy requests to the backend.
 * This avoids browser certificate errors from calling backend IPs directly.
 */
export const API_BASE_URL = '/api';

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


