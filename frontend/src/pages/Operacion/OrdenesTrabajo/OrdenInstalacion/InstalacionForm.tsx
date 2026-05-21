import { useState, useEffect } from 'react';
import { fetchApi } from '@/config/api';
import Label from '@/components/form/Label';
import Input from '@/components/form/input/InputField';
import {
  erpFormPanelClass,
  erpFormInputClass,
  erpSelectFieldClass,
} from '../ordenTrabajoStyles';

type InstalacionSubtipo = '' | 'gps';

const SUBTIPOS_INSTALACION = [
  { value: '', label: 'Seleccionar tipo de instalación...' },
  { value: 'gps', label: 'GPS' },
];

const TIPOS_VEHICULO = [
  { value: '', label: 'Seleccionar...' },
  { value: 'auto', label: 'Auto' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'camion', label: 'Camión' },
  { value: 'van', label: 'Van' },
  { value: 'moto', label: 'Motocicleta' },
  { value: 'trailer', label: 'Tráiler' },
  { value: 'maquinaria', label: 'Maquinaria' },
  { value: 'otro', label: 'Otro' },
];

const TIPOS_GPS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'basico', label: 'Básico' },
  { value: 'medio', label: 'Medio' },
  { value: 'premium', label: 'Premium' },
  { value: 'avanzado', label: 'Avanzado' },
];

const TIPOS_CHIP = [
  { value: '', label: 'Seleccionar...' },
  { value: 'telcel', label: 'Telcel' },
  { value: 'm2m', label: 'M2M' },
  { value: 'yobi', label: 'Yobi' },
];

const TIPOS_PLATAFORMA = [
  { value: '', label: 'Seleccionar...' },
  { value: 'tracksolidpro', label: 'Tracksolidpro' },
  { value: 'wialon', label: 'Wialon' },
];

const TIPOS_CORTE = [
  { value: '', label: 'Seleccionar...' },
  { value: 'bomba_combustible', label: 'Bomba de combustible' },
  { value: 'switch_principal', label: 'Switch principal' },
];

export type InstalacionFormValue = {
  tipo_vehiculo: string;
  placas: string;
  tipo_gps: string;
  tipo_chip: string;
  telefono: string;
  tipo_plataforma: string;
  tipo_corte: string;
  color_cable_cortado: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  imei: string;
  icc: string;
  comentario: string;
};

const INITIAL: InstalacionFormValue = {
  tipo_vehiculo: '',
  placas: '',
  tipo_gps: '',
  tipo_chip: '',
  telefono: '',
  tipo_plataforma: '',
  tipo_corte: '',
  color_cable_cortado: '',
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  imei: '',
  icc: '',
  comentario: '',
};

interface InstalacionFormProps {
  ordenId: number | null;
  disabled?: boolean;
  onSnapshot?: (snapshot: { payload: InstalacionFormValue; dibujo_url: string }) => void;
}

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
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={erpSelectFieldClass}
        >
          {options.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
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
        {label} {required && <span className="text-red-500">*</span>}
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

export default function InstalacionForm({ ordenId, disabled = false, onSnapshot }: InstalacionFormProps) {
  const [form, setForm] = useState<InstalacionFormValue>(INITIAL);
  const [subtipo, setSubtipo] = useState<InstalacionSubtipo>('');
  const [loading, setLoading] = useState(false);

  const handleSubtipoChange = (v: string) => setSubtipo(v as InstalacionSubtipo);

  useEffect(() => {
    if (!ordenId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchApi(`/api/ordenes/${ordenId}/instalacion/`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.payload && !cancelled) {
            const payload = data.payload;
            setForm((prev) => ({ ...prev, ...payload }));
            if (payload.tipo_instalacion) {
              setSubtipo(payload.tipo_instalacion as InstalacionSubtipo);
            } else if (payload.tipo_gps) {
              setSubtipo('gps');
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ordenId]);

  useEffect(() => {
    if (onSnapshot) {
      onSnapshot({
        payload: { ...form, tipo_instalacion: subtipo } as any,
        dibujo_url: '',
      });
    }
  }, [form, subtipo]);

  const setField = (field: keyof InstalacionFormValue, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-5 w-5 animate-spin text-[#ff801f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
          Cargando instalación...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Tipo de Instalación ── */}
      <div className={erpFormPanelClass}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#e7ded0] dark:border-[#334155]">
          <svg className="w-5 h-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de Instalación</h4>
        </div>
        <div className="pt-4">
          <SelectField
            label="Tipo de instalación"
            value={subtipo}
            onChange={handleSubtipoChange}
            options={SUBTIPOS_INSTALACION}
            disabled={disabled}
            required
          />
        </div>
      </div>

      {/* ── Formulario GPS ── */}
      {subtipo === 'gps' && (
        <div className={erpFormPanelClass}>
          <div className="flex items-center gap-2 pb-3 border-b border-[#e7ded0] dark:border-[#334155]">
            <svg className="w-5 h-5 text-[#ea580c] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Instalación GPS</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <SelectField
              label="Tipo de vehículo"
              value={form.tipo_vehiculo}
              onChange={(v) => setField('tipo_vehiculo', v)}
              options={TIPOS_VEHICULO}
              disabled={disabled}
              required
            />

            <TextField
              label="Placas"
              value={form.placas}
              onChange={(v) => setField('placas', v)}
              placeholder="Ej: ABC-123-D"
              disabled={disabled}
            />

          <SelectField
              label="Tipo de GPS"
              value={form.tipo_gps}
              onChange={(v) => setField('tipo_gps', v)}
              options={TIPOS_GPS}
              disabled={disabled}
              required
            />

            <SelectField
              label="Tipo de chip"
              value={form.tipo_chip}
              onChange={(v) => setField('tipo_chip', v)}
              options={TIPOS_CHIP}
              disabled={disabled}
              required
            />

            <TextField
              label="Teléfono"
              value={form.telefono}
              onChange={(v) => setField('telefono', v)}
              placeholder="Ej: 10 dígitos"
              disabled={disabled}
            />

            <SelectField
              label="Tipo de plataforma"
              value={form.tipo_plataforma}
              onChange={(v) => setField('tipo_plataforma', v)}
              options={TIPOS_PLATAFORMA}
              disabled={disabled}
            />

            <SelectField
              label="Tipo de corte"
              value={form.tipo_corte}
              onChange={(v) => setField('tipo_corte', v)}
              options={TIPOS_CORTE}
              disabled={disabled}
            />

            <TextField
              label="Color de cable cortado"
              value={form.color_cable_cortado}
              onChange={(v) => setField('color_cable_cortado', v)}
              placeholder="Ej: Negro"
              disabled={disabled}
            />

            <TextField
              label="Marca"
              value={form.marca}
              onChange={(v) => setField('marca', v)}
              placeholder="Ej: Teltonika"
              disabled={disabled}
            />

            <TextField
              label="Modelo"
              value={form.modelo}
              onChange={(v) => setField('modelo', v)}
              placeholder="Ej: FMB920"
              disabled={disabled}
            />

            <TextField
              label="Año"
              value={form.anio}
              onChange={(v) => setField('anio', v)}
              placeholder="Ej: 2024"
              disabled={disabled}
            />

            <TextField
              label="Color"
              value={form.color}
              onChange={(v) => setField('color', v)}
              placeholder="Ej: Negro"
              disabled={disabled}
            />

            <TextField
              label="IMEI"
              value={form.imei}
              onChange={(v) => setField('imei', v)}
              placeholder="15 dígitos"
              disabled={disabled}
            />

            <TextField
              label="ICC"
              value={form.icc}
              onChange={(v) => setField('icc', v)}
              placeholder="20 dígitos"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
