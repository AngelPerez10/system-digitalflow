import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SearchableSelect from "@/components/form/SearchableSelect";
import {
  erpFormPanelClass,
  erpFormInputClass,
  erpSelectFieldClass,
} from "../../OrdenesTrabajo/ordenTrabajoStyles";
import type { InstalacionFormValue, InstalacionSubtipo } from "./proyectoInstalacionTypes";

const SUBTIPOS_INSTALACION = [
  { value: "", label: "Seleccionar tipo de instalación..." },
  { value: "gps", label: "GPS" },
];

const TIPOS_VEHICULO = [
  { value: "", label: "Seleccionar..." },
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
  { value: "", label: "Seleccionar..." },
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
  { value: "", label: "Seleccionar..." },
  { value: "telcel", label: "Telcel" },
  { value: "m2m", label: "M2M" },
  { value: "yobi", label: "Yobi" },
];

const TIPOS_PLATAFORMA = [
  { value: "", label: "Seleccionar..." },
  { value: "tracksolidpro", label: "Tracksolidpro" },
  { value: "wialon", label: "Wialon" },
  { value: "Antarix", label: "Antarix" },
];

const TIPOS_CORTE = [
  { value: "", label: "Seleccionar..." },
  { value: "sin_corte", label: "Sin corte" },
  { value: "bomba_combustible", label: "Bomba de combustible" },
  { value: "switch_principal", label: "Switch principal" },
];

const SI_NO = [
  { value: "", label: "Seleccionar..." },
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
  return (
    <div>
      <Label className="!mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:!text-xs">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={erpSelectFieldClass}
        >
          {options.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="!mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:!text-xs">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </Label>
      <Input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={erpFormInputClass}
      />
    </div>
  );
}

/** Formulario GPS controlado — la página/modal es dueña del fetch/save. */
export default function InstalacionForm({
  value,
  subtipo,
  onChange,
  onSubtipoChange,
  disabled = false,
}: InstalacionFormProps) {
  const setField = (field: keyof InstalacionFormValue, next: string) => {
    onChange({ ...value, [field]: next });
  };

  const esTelcel = value.tipo_chip === "telcel";

  return (
    <div className="space-y-5">
      <div className={erpFormPanelClass}>
        <div className="flex items-center gap-2 border-b border-[#e7ded0] pb-3 dark:border-[#334155]">
          <svg
            className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de Instalación</h4>
        </div>
        <div className="pt-4">
          <SelectField
            label="Tipo de instalación"
            value={subtipo}
            onChange={(v) => onSubtipoChange(v === "gps" ? "gps" : "")}
            options={SUBTIPOS_INSTALACION}
            disabled={disabled}
            required
          />
        </div>
      </div>

      {subtipo === "gps" ? (
        <>
          <div className={erpFormPanelClass}>
            <div className="flex items-center gap-2 border-b border-[#e7ded0] pb-3 dark:border-[#334155]">
              <svg
                className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Instalación GPS</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <SelectField
                label="Tipo de vehículo"
                value={value.tipo_vehiculo}
                onChange={(v) => setField("tipo_vehiculo", v)}
                options={TIPOS_VEHICULO}
                disabled={disabled}
                required
              />
              <TextField
                label="Placas"
                value={value.placas}
                onChange={(v) => setField("placas", v)}
                placeholder="ABC-123-D"
                disabled={disabled}
              />
              <TextField
                label="Marca"
                value={value.marca}
                onChange={(v) => setField("marca", v)}
                placeholder="Teltonika"
                disabled={disabled}
              />
              <TextField
                label="Modelo"
                value={value.modelo}
                onChange={(v) => setField("modelo", v)}
                placeholder="FMB920"
                disabled={disabled}
              />
              <TextField
                label="Año"
                value={value.anio}
                onChange={(v) => setField("anio", v)}
                placeholder="Año del vehículo"
                disabled={disabled}
              />
              <TextField
                label="Color del vehículo"
                value={value.color}
                onChange={(v) => setField("color", v)}
                placeholder="Color del vehículo"
                disabled={disabled}
              />
              <SearchableSelect
                label="Tipo de GPS"
                value={value.tipo_gps}
                onChange={(v) => setField("tipo_gps", v)}
                options={TIPOS_GPS}
                disabled={disabled}
                required
                placeholder="Buscar GPS..."
              />
              <SelectField
                label="Tipo de chip"
                value={value.tipo_chip}
                onChange={(v) => setField("tipo_chip", v)}
                options={TIPOS_CHIP}
                disabled={disabled}
                required
              />
              {esTelcel ? (
                <TextField
                  label="Teléfono"
                  value={value.telefono}
                  onChange={(v) => setField("telefono", v)}
                  placeholder="Ej: 10 dígitos"
                  disabled={disabled}
                />
              ) : null}
              <SelectField
                label="Tipo de plataforma"
                value={value.tipo_plataforma}
                onChange={(v) => setField("tipo_plataforma", v)}
                options={TIPOS_PLATAFORMA}
                disabled={disabled}
              />
              <SelectField
                label="Tipo de corte"
                value={value.tipo_corte}
                onChange={(v) => setField("tipo_corte", v)}
                options={TIPOS_CORTE}
                disabled={disabled}
              />
              <TextField
                label="Ubicación del corte"
                value={value.ubicacion_corte}
                onChange={(v) => setField("ubicacion_corte", v)}
                placeholder="Ej: Cerca del tablero"
                disabled={disabled}
              />
              <TextField
                label="Color de cable cortado"
                value={value.color_cable_cortado}
                onChange={(v) => setField("color_cable_cortado", v)}
                placeholder="Ej: Negro"
                disabled={disabled}
              />
              <TextField
                label="IMEI"
                value={value.imei}
                onChange={(v) => setField("imei", v)}
                placeholder="15 dígitos"
                disabled={disabled}
              />
              <TextField
                label="ICC"
                value={value.icc}
                onChange={(v) => setField("icc", v)}
                placeholder="20 dígitos"
                disabled={disabled}
              />
            </div>
          </div>

          <div className={erpFormPanelClass}>
            <div className="flex items-center gap-2 border-b border-[#e7ded0] pb-3 dark:border-[#334155]">
              <svg
                className="h-5 w-5 text-[#ea580c] dark:text-[#fb923c]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path
                  d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3v18m0 0h10a2 2 0 002-2V9m0 0H9m0-3h2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Equipos adicionales</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <SelectField
                label="Botón de pánico"
                value={value.boton_panico}
                onChange={(v) => setField("boton_panico", v)}
                options={SI_NO}
                disabled={disabled}
              />
              {value.boton_panico === "si" ? (
                <TextField
                  label="Ubicación del botón"
                  value={value.ubicacion_boton_panico}
                  onChange={(v) => setField("ubicacion_boton_panico", v)}
                  placeholder="Ej: Debajo del volante"
                  disabled={disabled}
                />
              ) : null}
              <SelectField
                label="Micrófono"
                value={value.microfono}
                onChange={(v) => setField("microfono", v)}
                options={SI_NO}
                disabled={disabled}
              />
              {value.microfono === "si" ? (
                <TextField
                  label="Ubicación del micrófono"
                  value={value.ubicacion_microfono}
                  onChange={(v) => setField("ubicacion_microfono", v)}
                  placeholder="Ej: Visera del conductor"
                  disabled={disabled}
                />
              ) : null}
              <TextField
                label="Temperatura"
                value={value.temperatura}
                onChange={(v) => setField("temperatura", v)}
                placeholder="Ej: Sensor externo"
                disabled={disabled}
              />
              <TextField
                label="Humedad"
                value={value.humedad}
                onChange={(v) => setField("humedad", v)}
                placeholder="Ej: Sensor interno"
                disabled={disabled}
              />
              <TextField
                label="Contacto magnético"
                value={value.contacto_magnetico}
                onChange={(v) => setField("contacto_magnetico", v)}
                placeholder="Ej: Puerta principal"
                disabled={disabled}
              />
              <TextField
                label="Identificación de conductores"
                value={value.identificacion_conductores}
                onChange={(v) => setField("identificacion_conductores", v)}
                placeholder="Ej: Tarjeta RFID"
                disabled={disabled}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
