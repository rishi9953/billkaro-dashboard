/**
 * API Base URL Configuration
 * GitHub Pages doesn't support server-side proxies, so we use the direct API URL
 * For local development, it also uses the direct URL
 */
export const API_BASE_URL = 'https://65.2.81.212/api';

/**
 * API Endpoints
 * All API endpoints are defined here for centralized management
 */
export const API_ENDPOINTS = {
  USERS: `${API_BASE_URL}/users`,
  SUBSCRIPTION_PLANS: `${API_BASE_URL}/subscription-plans`,
};


