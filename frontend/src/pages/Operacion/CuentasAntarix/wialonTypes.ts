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
  /** Activo / Inactivo (facturación Wialon, campo act). */
  status: string;
  is_active?: boolean | null;
  last_message_at: string;
  created_at: string;
  custom_fields: string;
  is_shared: boolean;
  shared_with: string;
  shared_users_count?: number;
};

export type WialonCustomField = {
  id?: number;
  name: string;
  value: string;
  callMode?: "create" | "update" | "delete";
};

export type WialonUnitDetail = {
  wialon_id: number;
  name: string;
  unit_type: string;
  hw_id: number | null;
  device_type: string;
  uid: string;
  phone: string;
  status: string;
  is_active?: boolean | null;
  has_password: boolean;
  custom_fields: WialonCustomField[];
  access_users: WialonAccessUser[];
  last_message_at: string;
  created_at: string;
};

export type WialonAccessUser = {
  wialon_id: number;
  user_id: string;
  name: string;
};

export type WialonHwType = {
  id: number;
  name: string;
  category?: string;
};

export type WialonVehicleType = {
  value: string;
  label: string;
  category?: string;
};

export type WialonUserUpdatePayload = {
  name?: string;
  dealer_rights?: string;
  status?: string;
  enabled?: boolean;
};

export type WialonUnitUpdatePayload = {
  name?: string;
  unit_type?: string;
  hw_id?: number;
  uid?: string;
  phone?: string;
  access_password?: string;
  custom_fields?: WialonCustomField[];
};

export type WialonUnitSearchEntry = {
  unit_id: number;
  name: string;
  uid: string;
  phone?: string;
  custom_fields?: string;
  search_text?: string;
  users: Array<{
    wialon_id: number;
    user_id: string;
    name: string;
  }>;
};

export type UserModalTab = "cuenta" | "unidades";

/** @deprecated Use UserModalTab */
export type UnitsModalTab = UserModalTab;
