/** Tipos de la UI SIM (M2M Dataglobal). */

export type M2mSimCycleState =
  | "ACTIVATED"
  | "DEACTIVATED"
  | "SUSPENDED"
  | "UNKNOWN"
  | string;

export type M2mConnectivityProbe = "idle" | "pending" | "ok" | "fail" | "unavailable";

export type M2mSimDetailView = {
  icc: string;
  msisdn: string;
  imei: string;
  planName: string;
  planCode: string;
  operator: string;
  /** Tipo de SIM reportado por M2M (p. ej. Emnify). */
  simType?: string;
  simCycleState: M2mSimCycleState;
  gprsStatus: number | null;
  consumptionMonthlyData: number | null;
  consumptionDailyData: number | null;
  lastConnStart: string;
  lastConnStop: string;
  apn: string;
  ip: string;
  commModuleManufacturer: string;
  commModuleModel: string;
  customField1: string;
  customField2: string;
};

export type UnitSimPanelProps = {
  /** ID Wialon de la unidad (opcional; el SMS al equipo va por M2M). */
  unitId?: number | null;
  /** IMEI / UID de la unidad Wialon (clave de match con M2M). */
  uid: string;
  /** Teléfono Wialon → msisdn M2M (si existe; las SIM M2M suelen ir por IMEI). */
  phone: string;
  canEdit: boolean;
  disabled?: boolean;
};
