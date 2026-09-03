import type { WialonAccessUser, WialonUnitDetail, WialonUnitRow } from "./wialonTypes";

export function sharingPatchFromAccess(
  users: WialonAccessUser[],
  contextUserId?: number | null,
): Partial<WialonUnitRow> {
  const others = users.filter((u) => u.wialon_id !== contextUserId);
  return {
    is_shared: others.length > 0,
    shared_users_count: others.length,
    shared_with: others.length ? others.map((u) => u.name || u.user_id).join(", ") : "—",
  };
}

export function unitRowPatchFromDetail(
  unit: WialonUnitDetail,
  contextUserId?: number | null,
): Partial<WialonUnitRow> {
  const fields = (unit.custom_fields || [])
    .filter((f) => f.name.trim() || f.value.trim())
    .map((f) => `${f.name}: ${f.value}`)
    .join(", ");
  return {
    wialon_id: unit.wialon_id,
    name: unit.name,
    device_type: unit.device_type,
    uid: unit.uid?.trim() ? unit.uid : "—",
    phone: unit.phone?.trim() ? unit.phone : "—",
    status: unit.status,
    is_active: unit.is_active,
    last_state: unit.last_state,
    speed_kmh: unit.speed_kmh,
    is_online: unit.is_online,
    online_label: unit.online_label,
    engine_on: unit.engine_on,
    engine_label: unit.engine_label,
    last_message_at: unit.last_message_at,
    custom_fields: fields,
    ...sharingPatchFromAccess(unit.access_users || [], contextUserId),
  };
}
