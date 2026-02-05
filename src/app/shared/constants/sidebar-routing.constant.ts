import { PAGE_URL } from '../../utilities/constant/page-url.constant';
import { NavItemLinkType } from '../types/nav-item-link.type';

export const SIDEBAR_ROUTING: NavItemLinkType[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    path: PAGE_URL.HOME,
    accessName: 'DASHBOARD',
  },
  {
    label: 'Users',
    icon: 'people',
    path: PAGE_URL.USERS,
    accessName: 'USERS',
  },
  {
    label: 'Subscriptions',
    icon: 'subscriptions',
    path: PAGE_URL.SUBSCRIPTIONS,
    accessName: 'SUBSCRIPTIONS',
  },
  {
    label: 'Services',
    icon: 'miscellaneous_services',
    path: PAGE_URL.SERVICES,
    accessName: 'SERVICES',
  },
  {
    label: 'Payments',
    icon: 'payment',
    path: PAGE_URL.PAYMENTS,
    accessName: 'PAYMENTS',
  },
  {
    label: 'Orders',
    icon: 'shopping_bag',
    path: PAGE_URL.ORDERS,
    accessName: 'ORDERS',
  },
];

export const SIDEBAR_ROUTING_BOTTOM: NavItemLinkType[] = [
  {
    label: 'Profile',
    icon: 'person',
    path: PAGE_URL.PROFILE,
  },
  {
    label: 'Sign Out',
    icon: 'logout',
    path: PAGE_URL.SIGN_OUT
  },
];
