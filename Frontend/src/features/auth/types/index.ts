export type AccountStatus = "active" | "disabled" | "pending_approval";

export interface AuthUser {
  id: string;
  username: string;
  avatarSeed?: string | null;
  role: string;
  status: AccountStatus;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  user: AuthUser;
}
