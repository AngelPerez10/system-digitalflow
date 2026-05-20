export interface AuthUser {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  first_name: string;
  last_name: string;
  id: number;
  avatar_url?: string;
}

export type Permissions = Record<
  string,
  { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
>;
