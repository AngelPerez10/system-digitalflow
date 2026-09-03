import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
} from "../../shared/cuentasAntarixStyles";
import { Modal } from "@/components/ui/modal";
import type { M2mConnectivityProbe, M2mSimDetailView, UnitSimPanelProps } from "../../shared/m2mTypes";

const eyebrow =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8e8b82] dark:text-[#8ea0b8]";
const caption = "text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]";
const serifDisplay =
  "font-medium tracking-[-0.02em] text-[#09090B] dark:text-[#f8fafc]";

type SmsPresetTone = "off" | "on" | "reset" | "factory";

type SmsPreset = {
  label: string;
  message: string;
  hint: string;
  tone: SmsPresetTone;
};

/** Comandos SMS frecuentes para GPS / relay. El valor es lo que se envía. */
const SMS_PRESETS: ReadonlyArray<SmsPreset> = [
  { label: "Apagado", message: "RELAY,1#", hint: "Corta alimentación (relay)", tone: "off" },
  { label: "Encendido", message: "RELAY,0#", hint: "Restablece el relay", tone: "on" },
  { label: "Reiniciar", message: "RESET#", hint: "Reinicia el dispositivo", tone: "reset" },
  { label: "Fábrica", message: "FACTORY#", hint: "Restaura de fábrica", tone: "factory" },
];

function smsPresetToneClass(tone: SmsPresetTone, selected: boolean): string {
  if (selected) {
    switch (tone) {
      case "on":
        return "border-emerald-400/60 bg-emerald-50 ring-2 ring-emerald-500/25 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:ring-emerald-400/20";
      case "off":
        return "border-rose-400/55 bg-rose-50 ring-2 ring-rose-500/20 dark:border-rose-500/45 dark:bg-rose-950/35 dark:ring-rose-400/20";
      case "factory":
        return "border-amber-500/55 bg-amber-50 ring-2 ring-amber-500/25 dark:border-amber-500/45 dark:bg-amber-950/35 dark:ring-amber-400/20";
      default:
        return "border-[#1B5CFF]/55 bg-[#F1F5FF] ring-2 ring-[#1B5CFF]/30 dark:border-[#4B7CFF]/50 dark:bg-[#0f172a]/40 dark:ring-[#4B7CFF]/25";
    }
  }
  return "border-[#E7E7EA]/95 bg-[#ffffff]/95 hover:border-[#1B5CFF]/35 hover:bg-[#F1F5FF] dark:border-[#273244] dark:bg-[#0f172a]/55 dark:hover:border-[#4B7CFF]/35 dark:hover:bg-[#243048]/50";
}

function SmsPresetGlyph({ tone }: { tone: SmsPresetTone }) {
  const common = "h-4 w-4";
  if (tone === "on") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v9" strokeLinecap="round" />
        <path d="M8.5 7.5a6 6 0 1 0 7 0" strokeLinecap="round" />
      </svg>
    );
  }
  if (tone === "off") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v6" strokeLinecap="round" />
        <path d="M7 10a6.5 6.5 0 1 0 10 0" strokeLinecap="round" />
        <path d="M5 5l14 14" strokeLinecap="round" />
      </svg>
    );
  }
  if (tone === "factory") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 20V9l6 3V9l6 3V4h4v16H4Z" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 12a8 8 0 0 1 14-5" strokeLinecap="round" />
      <path d="M20 12a8 8 0 0 1-14 5" strokeLinecap="round" />
      <path d="M18 3v4h-4M6 21v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function presetLabelForMessage(message: string): string | null {
  const hit = SMS_PRESETS.find((p) => p.message === message.trim());
  return hit?.label ?? null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatIsoShort(iso: string): string {
  const raw = iso.trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function asSimDetail(raw: unknown): M2mSimDetailView | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown) => (v == null ? "" : String(v).trim());
  const stateRaw = str(d.simCycleState).toUpperCase().replace(/\s+/g, "_");
  const simCycleState =
    stateRaw === "ACTIVE" ? "ACTIVATED" : stateRaw === "INACTIVE" ? "DEACTIVATED" : stateRaw || "UNKNOWN";
  const simType = str(d.simType);
  return {
    icc: str(d.icc),
    msisdn: str(d.msisdn),
    imei: digitsOnly(str(d.imei)),
    planName: str(d.planName),
    planCode: str(d.planCode),
    operator: str(d.operator) || simType,
    simType,
    simCycleState,
    gprsStatus: num(d.gprsStatus),
    consumptionMonthlyData: num(d.consumptionMonthlyData),
    consumptionDailyData: num(d.consumptionDailyData),
    lastConnStart: str(d.lastConnStart),
    lastConnStop: str(d.lastConnStop),
    apn: str(d.apn) || str(d.apnName) || str(d.accessPointName),
    ip: str(d.ip),
    commModuleManufacturer: str(d.commModuleManufacturer),
    commModuleModel: str(d.commModuleModel),
    customField1: str(d.customField1),
    customField2: str(d.customField2),
  };
}

function simStateMeta(state: string) {
  const upper = state.toUpperCase();
  if (upper === "ACTIVATED") {
    return {
      label: "Activada",
      rail: "bg-emerald-500",
      blob: "bg-emerald-400/20",
      glyph:
        "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50",
      badge:
        "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50",
      dot: "bg-emerald-500",
      signal: 4,
    };
  }
  if (upper === "SUSPENDED" || upper === "DEACTIVATED") {
    return {
      label: upper === "SUSPENDED" ? "Suspendida" : "Desactivada",
      rail: "bg-rose-500",
      blob: "bg-rose-400/15",
      glyph:
        "bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900/50",
      badge:
        "bg-rose-50 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50",
      dot: "bg-rose-500",
      signal: 1,
    };
  }
  return {
    label: state || "Desconocido",
    rail: "bg-[#A1A1AA] dark:bg-[#71717a]",
    blob: "bg-[#A1A1AA]/20",
    glyph:
      "bg-[#ebe6df] text-[#6E6E77] ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#273244]",
    badge:
      "bg-[#ebe6df] text-[#52525B] ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#273244]",
    dot: "bg-[#A1A1AA]",
    signal: 2,
  };
}

function SignalBars({ level }: { level: number }) {
  const heights = ["h-1.5", "h-2.5", "h-3.5", "h-5"];
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={h}
          className={cn(
            "w-1 rounded-sm transition-colors duration-300",
            h,
            i < level ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#E7E7EA] dark:bg-[#273244]",
          )}
        />
      ))}
    </div>
  );
}

function probeTone(state: M2mConnectivityProbe) {
  if (state === "ok") {
    return {
      chip: "bg-emerald-50 text-emerald-800 ring-emerald-200/70 dark:bg-emerald-950/35 dark:text-emerald-300",
      text: "OK",
    };
  }
  if (state === "fail") {
    return {
      chip: "bg-rose-50 text-rose-800 ring-rose-200/70 dark:bg-rose-950/35 dark:text-rose-200",
      text: "Fallo",
    };
  }
  if (state === "pending") {
    return {
      chip: "bg-[#F1F5FF] text-[#1244D1] ring-[#1B5CFF]/30 dark:bg-[#4B7CFF]/10 dark:text-[#4B7CFF]",
      text: "…",
    };
  }
  if (state === "unavailable") {
    return {
      chip: "bg-[#FAFAFA] text-[#6E6E77] ring-[#E7E7EA] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]",
      text: "N/D",
    };
  }
  return {
    chip: "bg-[#FAFAFA] text-[#6E6E77] ring-[#E7E7EA] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]",
    text: "—",
  };
}

function UsageMeter({
  label,
  bytes,
  maxBytes,
}: {
  label: string;
  bytes: number | null;
  maxBytes: number;
}) {
  const value = bytes ?? 0;
  const pct = Math.min(100, Math.round((value / maxBytes) * 100));
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className={eyebrow}>{label}</p>
        <p className="font-mono text-[12px] tabular-nums text-[#1244D1] dark:text-[#4B7CFF]">
          {formatBytes(bytes)}
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ebe6df] dark:bg-[#243048]"
        role="meter"
        aria-label={`Consumo ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={formatBytes(bytes)}
      >
        <span
          className="block h-full rounded-full bg-[#1B5CFF] transition-[width] duration-700 ease-out motion-reduce:transition-none dark:bg-[#4B7CFF]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IdTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E7E7EA]/80 bg-[#FAFAFA]/90 px-3 py-2.5 dark:border-[#273244]/80 dark:bg-[#0f172a]/55">
      <p className={eyebrow}>{label}</p>
      <p
        className="mt-1 truncate font-mono text-[12.5px] leading-snug tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]"
        title={value}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function ActionTile({
  label,
  hint,
  icon,
  disabled,
  active,
  busy,
  onClick,
  ariaLabel,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  disabled?: boolean;
  active?: boolean;
  busy?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      className={cn(
        "group flex min-h-[4.25rem] flex-col items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        active
          ? "border-[#1B5CFF]/55 bg-[#F1F5FF] dark:border-[#4B7CFF]/45 dark:bg-[#4B7CFF]/10"
          : "border-[#E7E7EA] bg-[#ffffff] hover:-translate-y-0.5 hover:border-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/35",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-[#1B5CFF] text-white"
            : "bg-[#1B5CFF]/12 text-[#1244D1] group-hover:bg-[#1B5CFF]/18 dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span>
        <span className="block text-[13px] font-semibold text-[#09090B] dark:text-[#f8fafc]">
          {busy ? "…" : label}
        </span>
        <span className={cn("mt-0.5 block", caption)}>{hint}</span>
      </span>
    </button>
  );
}

function SimChipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <path d="M9 2.5v3.5h6V2.5" strokeLinejoin="round" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" strokeLinecap="round" />
    </svg>
  );
}

function lookupPayload(uid: string, phone: string) {
  const imei = digitsOnly(uid);
  const msisdn = digitsOnly(phone);
  return {
    imei: imei || undefined,
    msisdn: msisdn || undefined,
  };
}

function simCacheKey(lookup: { imei?: string; msisdn?: string }): string {
  return `imei:${lookup.imei || ""}|msisdn:${lookup.msisdn || ""}`;
}

/** Caché de sesión en el tab: al cambiar de unidad no se vuelve a esperar M2M. */
const SIM_CACHE_TTL_MS = 120_000;
type SimCacheHit =
  | { kind: "sim"; sim: M2mSimDetailView; loadedAt: number }
  | { kind: "missing"; loadedAt: number };
const simDetailCache = new Map<string, SimCacheHit>();
const simInflight = new Map<string, Promise<M2mSimDetailView>>();

function readSimCache(key: string): SimCacheHit | null {
  const hit = simDetailCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt > SIM_CACHE_TTL_MS) {
    simDetailCache.delete(key);
    return null;
  }
  return hit;
}

function writeSimCache(key: string, sim: M2mSimDetailView) {
  simDetailCache.set(key, { kind: "sim", sim, loadedAt: Date.now() });
}

function writeMissingSimCache(key: string) {
  simDetailCache.set(key, { kind: "missing", loadedAt: Date.now() });
}

function invalidateSimCache(key: string) {
  simDetailCache.delete(key);
  simInflight.delete(key);
}

function isNotFoundMessage(status: number, detail: string): boolean {
  if (status === 404) return true;
  const lower = detail.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("no encontr") ||
    lower.includes("sin sim") ||
    lower.includes("no tiene una sim")
  );
}

export default function UnitSimPanel({
  uid,
  phone,
  canEdit,
  disabled = false,
}: UnitSimPanelProps) {
  const smsId = useId();
  const smsConfirmTitleId = useId();
  const smsConfirmDescId = useId();
  const statusLiveId = useId();
  const lookup = useMemo(() => lookupPayload(uid, phone), [uid, phone]);
  const cacheKey = useMemo(() => simCacheKey(lookup), [lookup]);
  const hasLookup = Boolean(lookup.imei || lookup.msisdn);
  const canSendM2mSms = Boolean(canEdit && hasLookup);

  const [sim, setSim] = useState<M2mSimDetailView | null>(() => {
    if (!hasLookup) return null;
    const hit = readSimCache(simCacheKey(lookupPayload(uid, phone)));
    return hit?.kind === "sim" ? hit.sim : null;
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [notFound, setNotFound] = useState(() => {
    if (!hasLookup) return false;
    const hit = readSimCache(simCacheKey(lookupPayload(uid, phone)));
    return hit?.kind === "missing";
  });
  const [gsmProbe, setGsmProbe] = useState<M2mConnectivityProbe>("idle");
  const [gprsProbe, setGprsProbe] = useState<M2mConnectivityProbe>("idle");
  const [actionBusy, setActionBusy] = useState<"gsm" | "gprs" | "reset" | "sms" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [smsDraft, setSmsDraft] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsConfirmOpen, setSmsConfirmOpen] = useState(false);
  const [smsConfirmPhase, setSmsConfirmPhase] = useState<"confirm" | "sending" | "done">("confirm");
  const [smsResult, setSmsResult] = useState<{
    ok: boolean;
    sentMessage: string;
    responseMessage: string;
  } | null>(null);

  const locked = disabled || !canEdit || actionBusy != null;
  const smsPresetHint = presetLabelForMessage(smsDraft);
  const smsMsisdn = (sim?.msisdn || phone || "").trim();
  const smsImei = (sim?.imei || lookup.imei || "").trim();
  const smsDestination = smsMsisdn || smsImei || "sin IMEI / MSISDN";
  const smsDestinationKind = smsMsisdn ? "MSISDN M2M" : smsImei ? "IMEI" : "Destino";
  const smsBlockedReason = !hasLookup
    ? "Falta IMEI (UID) o MSISDN para enviar el SMS por M2M."
    : null;
  const smsLookupBody = useMemo(() => {
    const body: { imei?: string; msisdn?: string; icc?: string } = { ...lookup };
    if (sim?.imei?.trim()) body.imei = sim.imei.trim();
    if (sim?.msisdn?.trim()) body.msisdn = sim.msisdn.trim();
    if (sim?.icc?.trim()) body.icc = sim.icc.trim();
    return body;
  }, [lookup, sim]);

  useEffect(() => {
    if (!smsConfirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      if (smsConfirmPhase === "sending" || actionBusy === "sms") return;
      setSmsConfirmOpen(false);
      setSmsConfirmPhase("confirm");
      setSmsResult(null);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [smsConfirmOpen, smsConfirmPhase, actionBusy]);

  const closeSmsConfirm = () => {
    if (smsConfirmPhase === "sending" || actionBusy === "sms") return;
    setSmsConfirmOpen(false);
    setSmsConfirmPhase("confirm");
    setSmsResult(null);
  };

  const closeSmsComposer = () => {
    if (smsConfirmPhase === "sending" || actionBusy === "sms") return;
    closeSmsConfirm();
    setSmsOpen(false);
  };

  const requestSmsSend = () => {
    if (!canEdit || actionBusy != null || !smsDraft.trim()) return;
    if (smsBlockedReason) {
      setActionNote(smsBlockedReason);
      return;
    }
    setActionNote("");
    setSmsResult(null);
    setSmsConfirmPhase("confirm");
    setSmsConfirmOpen(true);
  };

  const finishSmsDialog = () => {
    closeSmsConfirm();
    if (smsResult?.ok) {
      setSmsOpen(false);
    }
  };

  const fetchSimDetail = useCallback(
    async (opts?: { refresh?: boolean }): Promise<M2mSimDetailView> => {
      const refresh = Boolean(opts?.refresh);
      if (!refresh) {
        const cached = readSimCache(cacheKey);
        if (cached?.kind === "sim") return cached.sim;
        if (cached?.kind === "missing") {
          const err = new Error(
            "Esta unidad no tiene una SIM registrada en M2M.",
          ) as Error & { code?: string };
          err.code = "not_found";
          throw err;
        }
        const pending = simInflight.get(cacheKey);
        if (pending) return pending;
      }

      const qs = new URLSearchParams();
      if (lookup.imei) qs.set("imei", lookup.imei);
      if (lookup.msisdn) qs.set("msisdn", lookup.msisdn);
      if (refresh) qs.set("refresh", "1");

      const request = (async () => {
        const res = await fetchApi(`/api/m2m/sims/detalle/?${qs.toString()}`, {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        const detail = String(data?.detail || `Error HTTP ${res.status}`);
        if (res.status === 503) {
          const err = new Error(
            detail.includes("M2M") ? detail : "M2M no configurado (M2M_API_KEY).",
          ) as Error & { code?: string };
          err.code = "not_configured";
          throw err;
        }
        if (!res.ok) {
          const err = new Error(detail) as Error & { code?: string };
          if (isNotFoundMessage(res.status, detail) || data?.code === "not_found") {
            err.code = "not_found";
            writeMissingSimCache(cacheKey);
          }
          throw err;
        }
        const mapped = asSimDetail(data?.sim);
        if (!mapped) throw new Error("Respuesta M2M inválida.");
        writeSimCache(cacheKey, mapped);
        return mapped;
      })();

      if (!refresh) simInflight.set(cacheKey, request);
      try {
        return await request;
      } finally {
        if (simInflight.get(cacheKey) === request) simInflight.delete(cacheKey);
      }
    },
    [cacheKey, lookup.imei, lookup.msisdn],
  );

  const loadSim = useCallback(
    async (options?: { force?: boolean; cancelled?: () => boolean }) => {
      if (!hasLookup) {
        setSim(null);
        setError("");
        setNotConfigured(false);
        setNotFound(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const force = Boolean(options?.force);
      const stale = () => Boolean(options?.cancelled?.());
      const cached = !force ? readSimCache(cacheKey) : null;

      if (cached?.kind === "sim") {
        if (!stale()) {
          setSim(cached.sim);
          setError("");
          setNotConfigured(false);
          setNotFound(false);
          setLoading(false);
          setRefreshing(false);
          setGsmProbe("idle");
          setGprsProbe("idle");
        }
        return;
      }

      if (cached?.kind === "missing") {
        if (!stale()) {
          setSim(null);
          setError("");
          setNotConfigured(false);
          setNotFound(true);
          setLoading(false);
          setRefreshing(false);
          setGsmProbe("idle");
          setGprsProbe("idle");
        }
        return;
      }

      if (!stale()) {
        setSim(null);
        setLoading(true);
        setError("");
        setNotConfigured(false);
        setNotFound(false);
        setGsmProbe("idle");
        setGprsProbe("idle");
      }

      if (force) setActionNote("");

      try {
        const mapped = await fetchSimDetail({ refresh: force });
        if (stale()) return;
        setSim(mapped);
        setError("");
        setNotConfigured(false);
        setNotFound(false);
      } catch (err) {
        if (stale()) return;
        const message =
          err instanceof Error ? err.message : "No se pudo consultar la SIM en M2M.";
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        setSim(null);
        if (code === "not_found" || isNotFoundMessage(404, message)) {
          setNotFound(true);
          setError("");
          setNotConfigured(false);
          writeMissingSimCache(cacheKey);
        } else {
          setNotFound(false);
          setError(message);
          setNotConfigured(code === "not_configured");
        }
      } finally {
        if (!stale()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cacheKey, fetchSimDetail, hasLookup],
  );

  useEffect(() => {
    let cancelled = false;
    const cached = hasLookup ? readSimCache(cacheKey) : null;
    if (cached?.kind === "sim") {
      setSim(cached.sim);
      setNotFound(false);
      setError("");
      setLoading(false);
    } else if (cached?.kind === "missing") {
      setSim(null);
      setNotFound(true);
      setError("");
      setLoading(false);
    } else if (hasLookup) {
      setSim(null);
      setNotFound(false);
    }
    void loadSim({ cancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, hasLookup, loadSim]);

  const runAction = async (kind: "gsm" | "gprs" | "reset" | "sms") => {
    if (kind !== "sms" && (!hasLookup || locked)) return;
    if (kind === "sms") {
      if (locked || !smsDraft.trim() || !hasLookup) return;
    }

    const pendingSms = kind === "sms" ? smsDraft.trim() : "";

    setActionBusy(kind);
    setActionNote("");
    if (kind === "sms") {
      setSmsConfirmPhase("sending");
      setSmsResult(null);
    }
    if (kind === "gsm") setGsmProbe("pending");
    if (kind === "gprs") setGprsProbe("pending");

    const path =
      kind === "gsm"
        ? "/api/m2m/sims/test-gsm/"
        : kind === "gprs"
          ? "/api/m2m/sims/test-gprs/"
          : kind === "reset"
            ? "/api/m2m/sims/reset/"
            : "/api/m2m/sims/sms/";

    try {
      const res = await fetchApi(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "sms" ? { ...smsLookupBody, message: pendingSms } : lookup,
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (kind === "gsm") setGsmProbe("fail");
        if (kind === "gprs") setGprsProbe("fail");
        const detail = String(data?.detail || `Error HTTP ${res.status}`);
        setActionNote(detail);
        if (kind === "sms") {
          setSmsConfirmPhase("done");
          setSmsResult({ ok: false, sentMessage: pendingSms, responseMessage: detail });
        }
        return;
      }
      if (kind === "gsm") setGsmProbe("ok");
      if (kind === "gprs") setGprsProbe("ok");
      const result = data?.result ? String(data.result) : "";
      const message = data?.message
        ? String(data.message)
        : data?.detail
          ? String(data.detail)
          : "";
      const combined =
        kind === "sms"
          ? message || "SMS enviado por M2M."
          : [result, message].filter(Boolean).join(" · ") || "Listo.";
      setActionNote(combined);
      if (kind === "sms") {
        setSmsConfirmPhase("done");
        setSmsResult({ ok: true, sentMessage: pendingSms, responseMessage: combined });
        setSmsDraft("");
      }
      if (kind === "reset") {
        invalidateSimCache(cacheKey);
        void loadSim({ force: true });
      }
    } catch {
      if (kind === "gsm") setGsmProbe("fail");
      if (kind === "gprs") setGprsProbe("fail");
      const fallback =
        kind === "sms"
          ? "No se pudo enviar el SMS por M2M."
          : "No se pudo completar la acción M2M.";
      setActionNote(fallback);
      if (kind === "sms") {
        setSmsConfirmPhase("done");
        setSmsResult({ ok: false, sentMessage: pendingSms, responseMessage: fallback });
      }
    } finally {
      setActionBusy(null);
    }
  };

  if (!hasLookup) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-dashed border-[#E7E7EA] bg-[#FAFAFA]/80 px-5 py-10 text-center dark:border-[#273244] dark:bg-[#0f172a]/40"
        role="status"
      >
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B5CFF]/12 text-[#1244D1] ring-1 ring-[#1B5CFF]/25 dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]">
          <SimChipIcon className="h-6 w-6" />
        </span>
        <p className="mx-auto mt-3 max-w-sm text-sm text-[#3d3d3a] dark:text-[#e2e8f0]">
          Completa el <span className="font-medium">IMEI</span> o el{" "}
          <span className="font-medium">teléfono</span> de la unidad para consultar la SIM en M2M.
        </p>
      </div>
    );
  }

  if (loading && !sim) {
    return (
      <div
        className="rounded-2xl border border-[#E7E7EA]/90 bg-[#ffffff] px-4 py-10 text-center dark:border-[#273244] dark:bg-[#0f172a]/50"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="mx-auto inline-flex h-10 w-10 animate-pulse rounded-2xl bg-[#1B5CFF]/20" aria-hidden />
        <p className={cn("mt-3", caption)}>Consultando SIM en M2M…</p>
      </div>
    );
  }

  if (notFound && !sim) {
    const idHint = lookup.imei || lookup.msisdn || "—";
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-[#E7E7EA]/95 bg-[#ffffff] px-4 py-8 text-center dark:border-[#273244] dark:bg-[#0f172a]/55 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <span
          className="absolute inset-y-0 left-0 w-1 bg-[#A1A1AA] dark:bg-[#71717a]"
          aria-hidden
        />
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ebe6df] text-[#6E6E77] ring-1 ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#273244]">
          <SimChipIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 text-base font-semibold text-[#09090B] dark:text-[#f8fafc]">
          Sin SIM en M2M
        </p>
        <p className={cn("mx-auto mt-1.5 max-w-md", caption)}>
          Esta unidad no tiene una tarjeta SIM registrada en M2M Dataglobal. Puede usar otra
          operadora, no tener línea, o el IMEI/teléfono en Wialon no coincide con el de M2M.
        </p>
        <p className="mx-auto mt-3 max-w-full truncate font-mono text-[12px] tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">
          {lookup.imei ? `IMEI ${lookup.imei}` : null}
          {lookup.imei && lookup.msisdn ? " · " : null}
          {lookup.msisdn ? `Tel. ${lookup.msisdn}` : null}
          {!lookup.imei && !lookup.msisdn ? idHint : null}
        </p>
        <button
          type="button"
          className={cn(erpSecondaryBtnClass, "mt-4 min-h-10")}
          onClick={() => {
            invalidateSimCache(cacheKey);
            void loadSim({ force: true });
          }}
          disabled={loading || refreshing || actionBusy != null}
        >
          Volver a buscar
        </button>
      </div>
    );
  }

  if (error && !sim) {
    return (
      <div
        className="space-y-3 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-rose-950/25"
        role="alert"
      >
        <p className="text-sm text-rose-800 dark:text-rose-200">{error}</p>
        {notConfigured ? (
          <p className={caption}>
            Define <code className="font-mono text-[12px]">M2M_API_KEY</code> en{" "}
            <code className="font-mono text-[12px]">backend/.env</code> y reinicia Django.
          </p>
        ) : (
          <button
            type="button"
            className={cn(erpSecondaryBtnClass, "min-h-10")}
            onClick={() => void loadSim({ force: true })}
            disabled={loading || refreshing || actionBusy != null}
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (!sim) return null;

  const meta = simStateMeta(sim.simCycleState);
  const gprsUp = sim.gprsStatus === 1;
  const gsmTone = probeTone(gsmProbe);
  const gprsTone = probeTone(gprsProbe);
  const monthlyMax = Math.max(8 * 1024 * 1024, (sim.consumptionMonthlyData ?? 0) * 1.25 || 1);
  const dailyMax = Math.max(512 * 1024, (sim.consumptionDailyData ?? 0) * 1.25 || 1);
  const moduleLabel = [sim.commModuleManufacturer, sim.commModuleModel].filter(Boolean).join(" ");

  return (
    <div className="space-y-3" aria-busy={loading || refreshing || actionBusy != null || undefined}>
      <div
        className="relative overflow-hidden rounded-2xl border border-[#E7E7EA]/95 bg-[#ffffff] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:shadow-none"
        role="region"
        aria-labelledby="unit-sim-status-label"
        aria-describedby={statusLiveId}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1", meta.rail)} aria-hidden />
        <div
          className={cn(
            "pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl",
            meta.blob,
          )}
          aria-hidden
        />

        <div className="relative grid gap-4 p-4 pl-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
          <div
            className={cn(
              "relative mx-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-1 sm:mx-0",
              meta.glyph,
            )}
            aria-hidden
          >
            <SimChipIcon className="h-7 w-7" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#ffffff] dark:border-[#0f172a]",
                meta.dot,
              )}
            />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p className={eyebrow}>Línea M2M</p>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50">
                En vivo
              </span>
              <button
                type="button"
                className={cn(caption, "underline-offset-2 hover:text-[#1B5CFF] hover:underline")}
                onClick={() => void loadSim({ force: true })}
                disabled={loading || refreshing || actionBusy != null}
              >
                {refreshing || loading ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p id="unit-sim-status-label" className={cn(serifDisplay, "text-xl sm:text-2xl")}>
                {meta.label}
              </p>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset">
                <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
                {sim.simCycleState}
              </span>
            </div>
            <p className={cn("mt-1.5 max-w-lg", caption)}>
              {sim.planName || "Sin plan"}
              <span className="text-[#A1A1AA]"> · </span>
              {sim.operator || "Sin operador"}
              {moduleLabel ? (
                <>
                  <span className="text-[#A1A1AA]"> · </span>
                  {moduleLabel}
                </>
              ) : null}
            </p>
            <p className={cn("mt-1", caption)}>
              Última conexión {formatIsoShort(sim.lastConnStart)}
              <span className="text-[#A1A1AA]"> · </span>
              GPRS {gprsUp ? "activo" : sim.gprsStatus === 0 ? "inactivo" : "sin dato"}
            </p>
          </div>

          <div className="mx-auto flex flex-col items-center gap-2 sm:mx-0 sm:items-end">
            <SignalBars level={meta.signal} />
            <p className={cn(caption, "tabular-nums")}>Estado de línea</p>
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", gsmTone.chip)}>
                GSM {gsmTone.text}
              </span>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", gprsTone.chip)}>
                GPRS {gprsTone.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <IdTile label="IMEI" value={sim.imei} />
        <IdTile label="MSISDN" value={sim.msisdn} />
        <IdTile label="ICC" value={sim.icc} />
      </div>

      <div className="grid grid-cols-1 gap-3 @min-[36rem]:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E7EA]/90 bg-[#ffffff] p-3.5 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:p-4">
          <p className={eyebrow}>Sesión de datos</p>
          <dl className="mt-3 space-y-2.5">
            <div className="flex items-baseline justify-between gap-3 border-b border-[#E7E7EA]/70 pb-2 dark:border-[#273244]/60">
              <dt className={caption}>APN</dt>
              <dd
                className={cn(
                  "truncate text-right text-[12.5px]",
                  sim.apn
                    ? "font-mono text-[#09090B] dark:text-[#f8fafc]"
                    : "text-[#8e8b82] dark:text-[#8EA0B8]",
                )}
                title={sim.apn || "M2M no incluye APN en este plan (p. ej. Emnify)"}
              >
                {sim.apn || "No reportado por M2M"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-[#E7E7EA]/70 pb-2 dark:border-[#273244]/60">
              <dt className={caption}>IP</dt>
              <dd className="truncate font-mono text-[12.5px] text-[#09090B] dark:text-[#f8fafc]">
                {sim.ip || "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-[#E7E7EA]/70 pb-2 dark:border-[#273244]/60">
              <dt className={caption}>Tipo SIM</dt>
              <dd className="truncate text-[12.5px] font-medium text-[#09090B] dark:text-[#f8fafc]">
                {sim.simType || sim.operator || "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className={caption}>Código de plan</dt>
              <dd className="truncate font-mono text-[12.5px] text-[#1B5CFF] dark:text-[#4B7CFF]">
                {sim.planCode || "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-[#E7E7EA]/90 bg-[#ffffff] p-3.5 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:p-4">
          <p className={eyebrow}>Consumo</p>
          <div className="mt-3 space-y-4">
            <UsageMeter label="Mes" bytes={sim.consumptionMonthlyData} maxBytes={monthlyMax} />
            <UsageMeter label="Día" bytes={sim.consumptionDailyData} maxBytes={dailyMax} />
          </div>
        </div>
      </div>

      <p id={statusLiveId} className="sr-only" role="status" aria-live="polite">
        {actionNote || (loading ? "Actualizando SIM" : `SIM ${meta.label}`)}
      </p>

      {actionNote ? (
        <p
          className="rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] px-3.5 py-2 text-[12.5px] text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8]"
          role="status"
          aria-live="polite"
        >
          {actionNote}
        </p>
      ) : null}

      {!canEdit ? (
        <p className={cn("text-center", caption)}>
          Solo lectura: necesitas permiso de edición para pruebas, reset o SMS.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Acciones de SIM">
        <ActionTile
          label="Test GSM"
          hint="Registro red"
          disabled={locked}
          busy={actionBusy === "gsm"}
          onClick={() => void runAction("gsm")}
          ariaLabel="Probar conexión GSM"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 19c3-8 9-12 14-14" strokeLinecap="round" />
              <path d="M8 19c2-5 6-8 10-9.5" strokeLinecap="round" />
              <circle cx="6.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          }
        />
        <ActionTile
          label="Test GPRS"
          hint="Datos"
          disabled={locked}
          busy={actionBusy === "gprs"}
          onClick={() => void runAction("gprs")}
          ariaLabel="Probar conexión GPRS"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 12h4l2-6 4 12 2-6h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <ActionTile
          label="Reset SIM"
          hint="Reiniciar sesión"
          disabled={locked}
          busy={actionBusy === "reset"}
          onClick={() => void runAction("reset")}
          ariaLabel="Reiniciar SIM"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 12a8 8 0 0 1 14-5" strokeLinecap="round" />
              <path d="M20 12a8 8 0 0 1-14 5" strokeLinecap="round" />
              <path d="M18 3v4h-4M6 21v-4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <ActionTile
          label="SMS"
          hint="M2M Dataglobal"
          disabled={(locked && !smsOpen) || (!canSendM2mSms && !smsOpen)}
          active={smsOpen}
          onClick={() => {
            if (!canSendM2mSms && !smsOpen) {
              setActionNote(smsBlockedReason || "No se puede enviar SMS por M2M.");
              return;
            }
            setSmsOpen((o) => !o);
            setActionNote("");
          }}
          ariaLabel={smsOpen ? "Cerrar envío de SMS" : "Abrir envío de SMS por M2M"}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 6h16v10H8l-4 3V6Z" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      {smsOpen ? (
        <div
          id={smsId}
          className="relative overflow-hidden rounded-2xl border border-[#1B5CFF]/30 bg-gradient-to-br from-[#ffffff] via-[#F1F5FF] to-[#F1F5FF]/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-[#4B7CFF]/30 dark:from-[#0f172a] dark:via-[#0f172a]/35 dark:to-[#0f172a]/80 dark:shadow-none sm:p-4"
        >
          <span
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#1B5CFF]/15 blur-2xl dark:bg-[#4B7CFF]/10"
            aria-hidden
          />
          <div className="relative space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1244D1] dark:text-[#4B7CFF] sm:text-[11px]">
                  Comandos SMS · M2M
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#09090B] dark:text-[#f8fafc]">
                  Se envían a la SIM por M2M (IMEI / MSISDN)
                </p>
              </div>
              <span className={cn(caption, "tabular-nums")} aria-live="polite">
                {smsDraft.length}/160
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Mensajes predeterminados">
              {SMS_PRESETS.map((preset) => {
                const selected = smsDraft.trim() === preset.message;
                return (
                  <button
                    key={preset.message}
                    type="button"
                    disabled={!canEdit || actionBusy != null || Boolean(smsBlockedReason)}
                    aria-pressed={selected}
                    aria-label={`Usar comando ${preset.message}, ${preset.label}`}
                    onClick={() => setSmsDraft(preset.message)}
                    className={cn(
                      "group flex min-h-[3.25rem] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-150",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "motion-safe:active:scale-[0.99] motion-reduce:active:scale-100",
                      smsPresetToneClass(preset.tone, selected),
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        preset.tone === "on" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        preset.tone === "off" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                        preset.tone === "factory" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                        preset.tone === "reset" && "bg-[#1B5CFF]/15 text-[#1244D1] dark:text-[#4B7CFF]",
                      )}
                      aria-hidden
                    >
                      <SmsPresetGlyph tone={preset.tone} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold text-[#09090B] dark:text-[#f8fafc]">
                          {preset.label}
                        </span>
                        <span className="font-mono text-[11px] font-semibold tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">
                          {preset.message}
                        </span>
                      </span>
                      <span className={cn("mt-0.5 block", caption)}>{preset.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${smsId}-msg`} className={erpSectionLabelClass}>
                Mensaje a enviar
              </label>
              <textarea
                id={`${smsId}-msg`}
                value={smsDraft}
                onChange={(e) => setSmsDraft(e.target.value)}
                rows={2}
                maxLength={160}
                disabled={!canEdit || actionBusy != null}
                placeholder="RELAY,1# · RESET# · o texto libre…"
                aria-describedby={`${smsId}-hint`}
                className={cn(
                  erpInputLikeClass,
                  "w-full resize-y bg-white/90 font-mono text-[13px] tracking-wide dark:bg-[#0f172a]/70",
                )}
              />
              <p id={`${smsId}-hint`} className={caption}>
                {smsBlockedReason
                  ? smsBlockedReason
                  : smsPresetHint
                    ? `Predeterminado: ${smsPresetHint}. M2M lo enviará a la SIM (${smsDestinationKind}: ${smsDestination}).`
                    : `M2M enviará el texto a la SIM (${smsDestinationKind}: ${smsDestination}). Revisa el comando antes de confirmar.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#1B5CFF]/15 pt-3 dark:border-[#4B7CFF]/15">
              <button
                type="button"
                className={cn(erpSecondaryBtnClass, "min-h-10 min-w-[6.5rem]")}
                disabled={actionBusy != null}
                onClick={closeSmsComposer}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={cn(erpPrimaryBtnClass, "min-h-10 min-w-[8.5rem]")}
                disabled={!canEdit || actionBusy != null || !smsDraft.trim() || Boolean(smsBlockedReason)}
                onClick={requestSmsSend}
              >
                Enviar SMS…
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={smsConfirmOpen}
        onClose={finishSmsDialog}
        closeOnBackdropClick={smsConfirmPhase !== "sending"}
        closeOnEscape={false}
        showCloseButton={smsConfirmPhase !== "sending"}
        ariaLabelledBy={smsConfirmTitleId}
        ariaDescribedBy={smsConfirmDescId}
        className="w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-[#E7E7EA] bg-[#ffffff] shadow-[0_32px_80px_-28px_rgba(9,9,11,0.55)] dark:border-[#273244] dark:bg-[#111827] sm:rounded-3xl"
      >
        <div className="relative overflow-hidden">
          <div
            className={cn(
              "relative px-5 pb-4 pt-5 sm:px-6 sm:pt-6",
              smsConfirmPhase === "done" && smsResult?.ok
                ? "bg-gradient-to-br from-emerald-50 via-[#ffffff] to-[#F1F5FF] dark:from-emerald-950/40 dark:via-[#111827] dark:to-[#0f172a]"
                : smsConfirmPhase === "done" && smsResult && !smsResult.ok
                  ? "bg-gradient-to-br from-rose-50 via-[#ffffff] to-[#F1F5FF] dark:from-rose-950/40 dark:via-[#111827] dark:to-[#0f172a]"
                  : "bg-gradient-to-br from-[#F1F5FF] via-[#ffffff] to-[#F1F5FF] dark:from-[#0f172a]/50 dark:via-[#111827] dark:to-[#0f172a]",
            )}
          >
            <span
              className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-[#1B5CFF]/20 blur-3xl dark:bg-[#4B7CFF]/15"
              aria-hidden
            />
            <div className="relative flex items-start gap-3.5 pr-8">
              <span
                className={cn(
                  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                  smsConfirmPhase === "done" && smsResult?.ok
                    ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"
                    : smsConfirmPhase === "done" && smsResult && !smsResult.ok
                      ? "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300"
                      : "bg-[#1B5CFF]/15 text-[#1244D1] ring-[#1B5CFF]/30 dark:text-[#4B7CFF]",
                )}
                aria-hidden
              >
                {smsConfirmPhase === "sending" ? (
                  <svg
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
                  </svg>
                ) : smsConfirmPhase === "done" && smsResult?.ok ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : smsConfirmPhase === "done" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M4 6h16v10H8l-4 3V6Z" strokeLinejoin="round" />
                    <path d="M8 10h8M8 13h5" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1244D1] dark:text-[#4B7CFF] sm:text-[11px]">
                  {smsConfirmPhase === "done" ? "Respuesta M2M" : "SMS · M2M"}
                </p>
                <h3
                  id={smsConfirmTitleId}
                  className="mt-1 text-xl font-medium leading-snug tracking-[-0.02em] text-[#09090B] dark:text-[#f8fafc]"
                >
                  {smsConfirmPhase === "sending"
                    ? "Enviando por M2M…"
                    : smsConfirmPhase === "done" && smsResult?.ok
                      ? "SMS enviado"
                      : smsConfirmPhase === "done"
                        ? "No se pudo enviar"
                        : "Confirmar envío"}
                </h3>
                <p id={smsConfirmDescId} className={cn("mt-1.5 max-w-md", caption)}>
                  {smsConfirmPhase === "sending"
                    ? "M2M está enviando el mensaje a la SIM. No cierres esta ventana."
                    : smsConfirmPhase === "done" && smsResult?.ok
                      ? "M2M aceptó el mensaje. Revisa el detalle de la respuesta abajo."
                      : smsConfirmPhase === "done"
                        ? "Revisa el error de M2M (SIM, plan o saldo SMS) e inténtalo de nuevo."
                        : "El SMS sale por la plataforma M2M hacia la SIM (no requiere teléfono en Wialon). Comandos como apagado o fábrica pueden afectar el dispositivo de inmediato."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4 sm:px-6 sm:pb-5">
            <div className="overflow-hidden rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA]/95 dark:border-[#273244] dark:bg-[#0f172a]/60">
              <div className="flex items-center justify-between gap-2 border-b border-[#E7E7EA]/90 px-3.5 py-2 dark:border-[#273244]">
                <span className={erpSectionLabelClass}>Destino · {smsDestinationKind}</span>
                <span className="rounded-full bg-[#1B5CFF]/12 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#1244D1] dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]">
                  M2M
                </span>
              </div>
              <p className="break-all px-3.5 py-2.5 font-mono text-sm font-medium text-[#09090B] dark:text-[#f8fafc]">
                {smsDestination}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E7E7EA] dark:border-[#273244]">
              <div className="border-b border-[#E7E7EA]/90 bg-[#F1F5FF]/80 px-3.5 py-2 dark:border-[#273244] dark:bg-[#0f172a]/25">
                <span className={erpSectionLabelClass}>
                  {smsConfirmPhase === "done" ? "Mensaje enviado" : "Mensaje a enviar"}
                </span>
                {smsPresetHint && smsConfirmPhase === "confirm" ? (
                  <span className={cn("mt-0.5 block", caption)}>Acción: {smsPresetHint}</span>
                ) : null}
              </div>
              <pre className="overflow-x-auto bg-[#181715] px-3.5 py-3 font-mono text-[13px] font-semibold leading-relaxed tracking-wide text-[#4B7CFF]">
                {(smsConfirmPhase === "done" ? smsResult?.sentMessage : smsDraft.trim()) || "—"}
              </pre>
            </div>

            {smsConfirmPhase === "sending" ? (
              <div
                className="flex items-center gap-3 rounded-2xl border border-[#1B5CFF]/25 bg-[#F1F5FF] px-3.5 py-3 dark:border-[#4B7CFF]/25 dark:bg-[#0f172a]/30"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span
                  className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#1B5CFF] motion-reduce:animate-none"
                  aria-hidden
                />
                <p className="text-sm text-[#52525B] dark:text-[#cbd5e1]">
                  Enviando comando SMS por M2M…
                </p>
              </div>
            ) : null}

            {smsConfirmPhase === "done" && smsResult ? (
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border",
                  smsResult.ok
                    ? "border-emerald-300/70 bg-emerald-50/90 dark:border-emerald-700/50 dark:bg-emerald-950/35"
                    : "border-rose-300/70 bg-rose-50/90 dark:border-rose-800/50 dark:bg-rose-950/35",
                )}
                role="status"
                aria-live="polite"
              >
                <div
                  className={cn(
                    "flex items-center gap-2 border-b px-3.5 py-2",
                    smsResult.ok
                      ? "border-emerald-200/80 dark:border-emerald-800/40"
                      : "border-rose-200/80 dark:border-rose-900/40",
                  )}
                >
                  <span
                    className={cn("h-2 w-2 rounded-full", smsResult.ok ? "bg-emerald-500" : "bg-rose-500")}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.14em]",
                      smsResult.ok
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-rose-800 dark:text-rose-300",
                    )}
                  >
                    {smsResult.ok ? "Confirmación M2M" : "Error M2M"}
                  </span>
                </div>
                <p
                  className={cn(
                    "px-3.5 py-3 text-sm leading-relaxed",
                    smsResult.ok
                      ? "text-emerald-950 dark:text-emerald-100"
                      : "text-rose-950 dark:text-rose-100",
                  )}
                >
                  {smsResult.responseMessage}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {smsConfirmPhase === "confirm" ? (
                <>
                  <button
                    type="button"
                    className={cn(erpSecondaryBtnClass, "min-h-10 min-w-[6.5rem]")}
                    onClick={closeSmsConfirm}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={cn(erpPrimaryBtnClass, "min-h-10 min-w-[8.5rem]")}
                    disabled={!canEdit || !smsDraft.trim() || Boolean(smsBlockedReason)}
                    onClick={() => void runAction("sms")}
                  >
                    Sí, enviar por M2M
                  </button>
                </>
              ) : null}
              {smsConfirmPhase === "sending" ? (
                <button
                  type="button"
                  className={cn(erpSecondaryBtnClass, "min-h-10 min-w-[8.5rem] opacity-70")}
                  disabled
                  aria-busy="true"
                >
                  Enviando…
                </button>
              ) : null}
              {smsConfirmPhase === "done" ? (
                <>
                  {!smsResult?.ok ? (
                    <button
                      type="button"
                      className={cn(erpSecondaryBtnClass, "min-h-10 min-w-[6.5rem]")}
                      onClick={() => {
                        setSmsConfirmPhase("confirm");
                        setSmsResult(null);
                        if (!smsDraft.trim() && smsResult?.sentMessage) {
                          setSmsDraft(smsResult.sentMessage);
                        }
                      }}
                    >
                      Reintentar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={cn(erpPrimaryBtnClass, "min-h-10 min-w-[6.5rem]")}
                    onClick={finishSmsDialog}
                  >
                    {smsResult?.ok ? "Listo" : "Cerrar"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
