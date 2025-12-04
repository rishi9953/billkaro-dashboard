export interface PageCardType {
  title: string;
  icon: string;
  count: string;
  button?: {
    label: string;
    hasPermession?: boolean;
  };
  disabled?: boolean;
}

export interface TableConfig {
  columns: Array<{
    name: string;
    label: string;
    type?: string;
    sortable?: boolean;
  }>;
  actions?: Array<{
    name: string;
    label: string;
    icon: string;
  }>;
}