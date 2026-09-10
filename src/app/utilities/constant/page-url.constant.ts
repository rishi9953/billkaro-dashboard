export const PAGE_URL = {
  HOME: '/dashboard/home',
  USERS: '/dashboard/users',
  USER_DASHBOARD: (userId: string) => `/dashboard/users/${userId}`,
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
