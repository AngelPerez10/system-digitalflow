export type WialonUserRow = {
  wialon_id: number;
  account_id?: number | null;
  user_id: string;
  name: string;
  creator: string;
  parent_account: string;
  dealer_rights: string;
  assigned_units: number;
  status: string;
  blocked: string;
};

export type WialonUnitRow = {
  wialon_id: number;
  name: string;
  device_type: string;
  uid: string;
  phone: string;
  last_message_at: string;
  created_at: string;
  custom_fields: string;
  is_shared: boolean;
  shared_with: string;
  shared_users_count?: number;
};

export type WialonUserUpdatePayload = {
  name?: string;
  dealer_rights?: string;
  status?: string;
  enabled?: boolean;
};
