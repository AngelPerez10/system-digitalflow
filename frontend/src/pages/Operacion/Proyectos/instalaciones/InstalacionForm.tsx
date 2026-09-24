import { useId, type ReactNode } from "react";
import { Ban, Satellite } from "lucide-react";
import SearchableSelect from "@/components/form/SearchableSelect";
import { Field } from "../shared/ProyectoUi";
import { focusRing, input, select } from "../shared/proyectoTokens";
import type { InstalacionFormValue, InstalacionSubtipo } from "./proyectoInstalacionTypes";

const TIPOS_VEHICULO = [
  { value: "", label: "Seleccionar…" },
  { value: "auto", label: "Auto" },
  { value: "camioneta", label: "Camioneta" },
  { value: "camion", label: "Camión" },
  { value: "van", label: "Van" },
  { value: "moto", label: "Motocicleta" },
  { value: "trailer", label: "Tráiler" },
  { value: "maquinaria", label: "Maquinaria" },
  { value: "otro", label: "Otro" },
];

const TIPOS_GPS = [
  { value: "", label: "Seleccionar…" },
  { value: "antarix-gps-kitgpsdt16", label: "Antarix GPS - KITGPSDT16" },
  { value: "jimiiot-kitgpsvl103", label: "JIMIIOT - KITGPSVL103" },
  { value: "topflytech-kitgpstlw2-6bl", label: "TopFlyTech - KITGPSTLW2-6BL" },
  { value: "teltonika-kitgpsfmc920", label: "Teltonika - KITGPSFMC920" },
  { value: "teltonika-kitgpsfmc130", label: "Teltonika - KITGPSFMC130" },
  { value: "teltonika-kitgpsfmc650", label: "Teltonika - KITGPSFMC650" },
  { value: "meitrack-kitgpst633l", label: "Meitrack - KITGPST633L" },
  { value: "antarix-gps-kitgpsdt34b", label: "Antarix GPS - KITGPSDT34B" },
  { value: "jimiiot-kitgpsll301", label: "JimiIot - KITGPSLL301" },
  { value: "topflytech-kitgpsknightx100", label: "Topflytech - KITGPKNIGHTX100" },
  { value: "topflytech-kitgpssolarguardx100", label: "Topflytech - KITGPSSOLARGUARDX100" },
  { value: "topflytech-kitgpstlp2-sfb", label: "Topflytech - KITGPSTLP2-SFB" },
];

const TIPOS_CHIP = [
  { value: "", label: "Seleccionar…" },
  { value: "telcel", label: "Telcel" },
  { value: "m2m", label: "M2M" },
  { value: "yobi", label: "Yobi" },
];

const TIPOS_PLATAFORMA = [
  { value: "", label: "Seleccionar…" },
  { value: "tracksolidpro", label: "Tracksolidpro" },
  { value: "wialon", label: "Wialon" },
  { value: "Antarix", label: "Antarix" },
];

const TIPOS_CORTE = [
  { value: "", label: "Seleccionar…" },
  { value: "sin_corte", label: "Sin corte" },
  { value: "bomba_combustible", label: "Bomba de combustible" },
  { value: "switch_principal", label: "Switch principal" },
];

const SI_NO = [
  { value: "", label: "Seleccionar…" },
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

type InstalacionFormProps = {
  value: InstalacionFormValue;
  subtipo: InstalacionSubtipo;
  onChange: (next: InstalacionFormValue) => void;
  onSubtipoChange: (next: InstalacionSubtipo) => void;
  disabled?: boolean;
};

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} required={required}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={select}>
        {options.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  inputMode,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "tel" | "text";
  mono?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        autoComplete="off"
        className={`${input} ${mono ? "font-mono tracking-tight" : ""}`}
      />
    </Field>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="cot-fade min-w-0 border-0 p-0">
      <legend className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#8EA0B8]">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Ficha de instalación controlada — el modal es dueño del fetch/save. */
export default function InstalacionForm({
  value,
  subtipo,
  onChange,
  onSubtipoChange,
  disabled = false,
}: InstalacionFormProps) {
  const setField = (field: keyof InstalacionFormValue) => (next: string) => onChange({ ...value, [field]: next });
  const tipoLabelId = useId();

  const opciones: { value: InstalacionSubtipo; label: string; hint: string; icon: ReactNode }[] = [
    { value: "", label: "Sin instalación", hint: "No se registra ficha", icon: <Ban className="size-4" aria-hidden /> },
    { value: "gps", label: "GPS vehicular", hint: "Equipo, chip y accesorios", icon: <Satellite className="size-4" aria-hidden /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p id={tipoLabelId} className="mb-2 text-[13px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
          Tipo de instalación
        </p>
        <div role="radiogroup" aria-labelledby={tipoLabelId} className="grid gap-2 sm:grid-cols-2">
          {opciones.map((opt) => {
            const active = subtipo === opt.value;
            return (
              <button
                key={opt.value || "none"}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onSubtipoChange(opt.value)}
                className={`cot-press flex items-center gap-3 rounded-[14px] border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
                  active
                    ? "border-[#BFD3FF] bg-[#F5F8FF] ring-1 ring-[#BFD3FF] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/40 dark:ring-[#2C3F7A]"
                    : "border-[#E4E4E7] bg-white hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#0F172A]"
                }`}
              >
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
                    active
                      ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                      : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]"
                  }`}
                >
                  {opt.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{opt.label}</span>
                  <span className="block text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {subtipo === "gps" ? (
        <>
          <Group title="Vehículo">
            <SelectField
              label="Tipo de vehículo"
              value={value.tipo_vehiculo}
              onChange={setField("tipo_vehiculo")}
              options={TIPOS_VEHICULO}
              disabled={disabled}
              required
            />
            <TextField label="Placas" value={value.placas} onChange={setField("placas")} placeholder="ABC-123-D" disabled={disabled} mono />
            <TextField label="Marca" value={value.marca} onChange={setField("marca")} placeholder="Nissan" disabled={disabled} />
            <TextField label="Modelo" value={value.modelo} onChange={setField("modelo")} placeholder="NP300" disabled={disabled} />
            <TextField label="Año" value={value.anio} onChange={setField("anio")} placeholder="2024" disabled={disabled} inputMode="numeric" />
            <TextField label="Color" value={value.color} onChange={setField("color")} placeholder="Blanco" disabled={disabled} />
          </Group>

          <Group title="Equipo GPS y línea">
            <SearchableSelect
              label="Tipo de GPS"
              value={value.tipo_gps}
              onChange={setField("tipo_gps")}
              options={TIPOS_GPS}
              disabled={disabled}
              required
              placeholder="Buscar GPS…"
            />
            <SelectField
              label="Tipo de chip"
              value={value.tipo_chip}
              onChange={setField("tipo_chip")}
              options={TIPOS_CHIP}
              disabled={disabled}
              required
            />
            {value.tipo_chip === "telcel" ? (
              <TextField label="Teléfono" value={value.telefono} onChange={setField("telefono")} placeholder="10 dígitos" disabled={disabled} inputMode="tel" mono />
            ) : null}
            <SelectField
              label="Plataforma"
              value={value.tipo_plataforma}
              onChange={setField("tipo_plataforma")}
              options={TIPOS_PLATAFORMA}
              disabled={disabled}
            />
            <TextField label="IMEI" value={value.imei} onChange={setField("imei")} placeholder="15 dígitos" disabled={disabled} inputMode="numeric" mono />
            <TextField label="ICC" value={value.icc} onChange={setField("icc")} placeholder="20 dígitos" disabled={disabled} inputMode="numeric" mono />
          </Group>

          <Group title="Corte de motor">
            <SelectField label="Tipo de corte" value={value.tipo_corte} onChange={setField("tipo_corte")} options={TIPOS_CORTE} disabled={disabled} />
            <TextField
              label="Ubicación del corte"
              value={value.ubicacion_corte}
              onChange={setField("ubicacion_corte")}
              placeholder="Cerca del tablero"
              disabled={disabled}
            />
            <TextField
              label="Color de cable cortado"
              value={value.color_cable_cortado}
              onChange={setField("color_cable_cortado")}
              placeholder="Negro"
              disabled={disabled}
            />
          </Group>

          <Group title="Accesorios">
            <SelectField label="Botón de pánico" value={value.boton_panico} onChange={setField("boton_panico")} options={SI_NO} disabled={disabled} />
            {value.boton_panico === "si" ? (
              <TextField
                label="Ubicación del botón"
                value={value.ubicacion_boton_panico}
                onChange={setField("ubicacion_boton_panico")}
                placeholder="Debajo del volante"
                disabled={disabled}
              />
            ) : null}
            <SelectField label="Micrófono" value={value.microfono} onChange={setField("microfono")} options={SI_NO} disabled={disabled} />
            {value.microfono === "si" ? (
              <TextField
                label="Ubicación del micrófono"
                value={value.ubicacion_microfono}
                onChange={setField("ubicacion_microfono")}
                placeholder="Visera del conductor"
                disabled={disabled}
              />
            ) : null}
            <TextField label="Temperatura" value={value.temperatura} onChange={setField("temperatura")} placeholder="Sensor externo" disabled={disabled} />
            <TextField label="Humedad" value={value.humedad} onChange={setField("humedad")} placeholder="Sensor interno" disabled={disabled} />
            <TextField
              label="Contacto magnético"
              value={value.contacto_magnetico}
              onChange={setField("contacto_magnetico")}
              placeholder="Puerta principal"
              disabled={disabled}
            />
            <TextField
              label="Identificación de conductores"
              value={value.identificacion_conductores}
              onChange={setField("identificacion_conductores")}
              placeholder="Tarjeta RFID"
              disabled={disabled}
            />
          </Group>
        </>
      ) : null}
    </div>
  );
}
