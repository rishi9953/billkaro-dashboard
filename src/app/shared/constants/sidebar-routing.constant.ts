import { PAGE_URL } from '../../utilities/constant/page-url.constant';
import { NavItemLinkType } from '../types/nav-item-link.type';

export const SIDEBAR_ROUTING: NavItemLinkType[] = [
  {
    label: 'Dashboard',
    icon: 'grid_view',
    path: PAGE_URL.HOME,
    accessName: 'DASHBOARD',
  },
  {
    label: 'Sub Admins',
    icon: 'verified_user',
    path: PAGE_URL.SUB_ADMINS,
    accessName: 'SUB_ADMINS',
  },
  {
    label: 'Users',
    icon: 'person',
    path: PAGE_URL.USERS,
    accessName: 'USERS',
  },
  {
    label: 'Subscriptions',
    icon: 'layers',
    path: PAGE_URL.SUBSCRIPTIONS,
    accessName: 'SUBSCRIPTIONS',
  },
  {
    label: 'Services',
    icon: 'settings',
    path: PAGE_URL.SERVICES,
    accessName: 'SERVICES',
  },
  {
    label: 'Payments',
    icon: 'account_balance_wallet',
    path: PAGE_URL.PAYMENTS,
    accessName: 'PAYMENTS',
  },
  {
    label: 'Wallet Cards',
    icon: 'credit_card',
    path: PAGE_URL.WALLET_CARDS,
    accessName: 'WALLET_CARDS',
  },
  {
    label: 'Wallet Coupons',
    icon: 'local_offer',
    path: PAGE_URL.WALLET_COUPONS,
    accessName: 'WALLET_COUPONS',
  },
  {
    label: 'Printer Orders',
    icon: 'print',
    path: PAGE_URL.ORDERS,
    accessName: 'ORDERS',
  },
];

export const SIDEBAR_ROUTING_BOTTOM: NavItemLinkType[] = [
  {
    label: 'Admin Profile',
    icon: 'person_outline',
    path: PAGE_URL.PROFILE,
  },
  {
    label: 'Sign Out',
    icon: 'logout',
    path: PAGE_URL.SIGN_OUT,
  },
];
