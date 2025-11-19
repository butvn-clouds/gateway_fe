
export interface VirtualAccount {
  id: number;
  slashId: string;
  name?: string | null;
  // thêm field khác nếu backend có:
  // status?: string;
  // createdAt?: string;
}

export interface Account {
  id: number;
  name: string;
  apiKey: string;
  virtualAccounts: VirtualAccount[];
}

export type AuthRole = "ROLE_USER" | "ROLE_ADMIN";

export interface Auth {
  id: number;
  username: string;
  name?: string;
  role: AuthRole;
  accountIds: number[];
  virtualAccountIds: number[]; 
  accounts: Account[];
  virtualAccounts: VirtualAccount[];
  createdAt: string;
  updatedAt: string;
  accountLabel?: string;
  virtualAccountLabel?: string;
  slashAccounts?: {
    id(id: any): unknown;
    accountId: number;
    virtualAccountId: number | null;
    label: string;
  }[];
}

export interface AuthContextTypes {
  user: Auth | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  loading: boolean;
}

export interface ApiLoginParam {
  username: string;
  password: string;
}

export interface ApiLoginResponse {
  user: Auth;
  message: string;
  token: string;
}
export interface ApiCreateUserParam {
  username: string;
  password: string;
  name?: string;
  role: AuthRole;
  accountIds: number[];
  virtualAccountIds?: number[];
}

export interface ApiUpdateUserParam {
  username?: string;
  name?: string;
  role?: AuthRole;

  accountIds?: number[];
  virtualAccountIds?: number[];
}

export interface ApiUserPage {
  content: Auth[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AccountPage {
  content: Account[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}