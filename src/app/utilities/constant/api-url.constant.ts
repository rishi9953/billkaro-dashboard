/**
 * API Base URL Configuration
 * Uses relative path for Netlify proxy, falls back to direct URL for local development
 * The Netlify proxy (configured in netlify.toml) will route /api/* to https://65.2.81.212/api/*
 */
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
export const API_BASE_URL = isProduction ? '/api' : 'https://65.2.81.212/api';

/**
 * API Endpoints
 * All API endpoints are defined here for centralized management
 */
export const API_ENDPOINTS = {
  USERS: `${API_BASE_URL}/users`,
  SUBSCRIPTION_PLANS: `${API_BASE_URL}/subscription-plans`,
};


