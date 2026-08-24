export interface Chair {
  id: string; // e.g., 'chair1', 'chair2', 'chair3', 'chair4'
  name: string; // e.g., 'Poltrona 1', 'Poltrona 2', etc.
  total: number;
}

export const CHAIR_NAMES_MAP: { [key: number]: string } = {
  1: 'Amine',
  2: 'Maher',
  3: 'Adil',
  4: 'Kevin'
};

export interface BarberNames {
  chair1: string;
  chair2: string;
  chair3: string;
  chair4: string;
}

export interface ServicePrice {
  id: string;
  label: string;
  amount: number;
}

export interface AppConfig {
  notificationsEnabled: boolean;
  autoExportEnabled: boolean;
  exportTime: string; // "HH:MM"
  features: {
    [key: string]: boolean;
  };
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type ScreenType = 'home-screen' | 'selection-screen' | 'chair-screen' | 'admin-dashboard';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}
