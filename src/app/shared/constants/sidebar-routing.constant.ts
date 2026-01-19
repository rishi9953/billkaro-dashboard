import { PAGE_URL } from '../../utilities/constant/page-url.constant';
import { NavItemLinkType } from '../types/nav-item-link.type';

export const SIDEBAR_ROUTING: NavItemLinkType[] = [
  {
    label: 'Dashboard',
    icon: '',
    path: PAGE_URL.HOME,
    accessName: 'DASHBOARD',
  },


  {
    label: 'Users',
    icon: '',
    path: PAGE_URL.USERS,
    accessName: 'USERS',
  },


  {
    label: 'Subscriptions',
    icon: '',
    path: PAGE_URL.SUBSCRIPTIONS,
    accessName: 'SUBSCRIPTIONS',
  },




];

export const SIDEBAR_ROUTING_BOTTOM: NavItemLinkType[] = [
  {
    label: 'Sign Out',
    icon: 'logout',
    path: PAGE_URL.SIGN_OUT
  },
];
