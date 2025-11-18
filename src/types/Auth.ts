export interface Auth {
  id: number;
  username: string;
  name?: string;
  role: "ROLE_USER" | "ROLE_ADMIN";
  createdAt: string;
  updatedAt: string;
  accountIds: number[];
  virtualAccountIds: number[] | null;
  accountLabel?: string;
  virtualAccountLabel?: string;
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
}

export interface ApiCreateUserParam {
  username: string;
  password: string;
  name?: string;
  role: "ROLE_USER" | "ROLE_ADMIN";
  
}
export interface ApiUpdateUserParam {
  name?: string;
  role: "ROLE_USER" | "ROLE_ADMIN";
}
export interface ApiUserPage {
  content: Auth[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

