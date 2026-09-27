export const PAGE_URL = {
  HOME: '/dashboard/home',
  USERS: '/dashboard/users',
  USER_DASHBOARD: (userId: string) => `/dashboard/users/${userId}`,
  USER_ORDER_DETAILS: (userId: string, orderId: string) =>
    `/dashboard/users/${userId}/orders/${orderId}`,
  SUB_ADMINS: '/dashboard/sub-admins',
  SUBSCRIPTIONS: '/subscriptions',
  SERVICES: '/services',
  SIGN_OUT: '/login',
  PAYMENTS: '/payments',
  ORDERS: '/orders',
  WALLET_CARDS: '/wallet-cards',
  WALLET_COUPONS: '/wallet-coupons',
  PROFILE: '/profile',
};
