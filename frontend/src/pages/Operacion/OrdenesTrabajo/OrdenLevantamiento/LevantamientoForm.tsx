import { useEffect, useMemo, useRef, useState } from 'react';
import DrawingBoard from '@/components/ui/drawing/DrawingBoard';
import Alert from '@/components/ui/alert/Alert';
import { TrashBinIcon } from '@/icons';
import { apiUrl } from '@/config/api';

type LevantamientoTipo = '' | 'camara' | 'cerco' | 'alarmas';

type CameraDetalle = {
  ubicacion: string;
};

type LevantamientoFormValue = {
  tipo: LevantamientoTipo;

  camara_grabado_tecnologia: 'NVR' | 'DVR' | 'SVR' | '';
  camara_grabado_tecnologia_cantidad: number;
  camara_grabado_compuertas: 'si' | 'no' | '';
  camara_grabado_compuertas_cantidad: number;
  camara_grabado_marca: string;
  camara_grabado_capacidad_canales: '4' | '8' | '16' | '32' | '64' | '128' | '';
  camara_grabado_switch_poe_piezas: number;
  camara_grabado_switch_poe_capacidades: string[];
  camara_grabado_puertos_hdd: number;
  camara_grabado_almacenamiento: string;
  camara_grabado_capacidad_tb: number;

  cable_tipo: 'UTP' | 'Fibra' | '';
  cable_categoria: 'cat5' | 'cat6' | 'cat7' | 'cat8';
  cable_resistencia: 'exterior' | 'interior' | '';
  cable_blindado: 'si' | 'no' | '';
  cable_metraje: string;

  bobina_cable_open: boolean;
  bobina_cable_cantidad: number;
  bobina_cable_metrajes: Array<'' | '100' | '152' | '305' | '1000'>;

  camara_bala_open: boolean;
  camara_bala_cantidad: number;
  camara_bala_megapixeles: number;
  camara_bala_detalles: CameraDetalle[];

  camara_cubo_open: boolean;
  camara_cubo_cantidad: number;
  camara_cubo_megapixeles: number;
  camara_cubo_detalles: CameraDetalle[];

  camara_domo_open: boolean;
  camara_domo_cantidad: number;
  camara_domo_megapixeles: number;
  camara_domo_detalles: CameraDetalle[];

  camara_pinhole_open: boolean;
  camara_pinhole_cantidad: number;
  camara_pinhole_megapixeles: number;
  camara_pinhole_detalles: CameraDetalle[];

  camara_ptz_open: boolean;
  camara_ptz_cantidad: number;
  camara_ptz_megapixeles: number;
  camara_ptz_detalles: CameraDetalle[];

  camara_turret_open: boolean;
  camara_turret_cantidad: number;
  camara_turret_megapixeles: number;
  camara_turret_detalles: CameraDetalle[];

  cerco_metros_lineales: string;
  cerco_altura_metros: string;
  cerco_tipo: string;
  cerco_porton: boolean;

  cerco_metros: string;
  cerco_lineas: number;
  cerco_metrajes: string[];
  cerco_metraje_distribucion: '' | 'si' | 'no';
  cerco_tipo_material: '' | 'acero' | 'aluminio' | 'galvanizado';
  cerco_color: '' | 'ninguno' | 'blanco' | 'negro';
  cerco_tipo_energizador: string;
  cerco_gabinete: '' | 'si' | 'no';
  cerco_sirena: '' | 'si' | 'no';
  cerco_cables_tierra: number;
  cerco_adicionales: string;

  alarmas_zonas: string;
  alarmas_sensores_movimiento: boolean;
  alarmas_contactos_magneticos: boolean;
  alarmas_sirena: boolean;
  alarmas_comunicacion: 'wifi' | 'ethernet' | 'gsm' | '';

  dibujo_url: string;
};

const defaultValue: LevantamientoFormValue = {
  tipo: '',

  camara_grabado_tecnologia: '',
  camara_grabado_tecnologia_cantidad: 0,
  camara_grabado_compuertas: '',
  camara_grabado_compuertas_cantidad: 0,
  camara_grabado_marca: '',
  camara_grabado_capacidad_canales: '',
  camara_grabado_switch_poe_piezas: 0,
  camara_grabado_switch_poe_capacidades: [],
  camara_grabado_puertos_hdd: 0,
  camara_grabado_almacenamiento: '',
  camara_grabado_capacidad_tb: 1,

  cable_tipo: '',
  cable_categoria: 'cat5',
  cable_resistencia: '',
  cable_blindado: '',
  cable_metraje: '',

  bobina_cable_open: false,
  bobina_cable_cantidad: 0,
  bobina_cable_metrajes: [],

  camara_bala_open: false,
  camara_bala_cantidad: 0,
  camara_bala_megapixeles: 0,
  camara_bala_detalles: [],

  camara_cubo_open: false,
  camara_cubo_cantidad: 0,
  camara_cubo_megapixeles: 0,
  camara_cubo_detalles: [],

  camara_domo_open: false,
  camara_domo_cantidad: 0,
  camara_domo_megapixeles: 0,
  camara_domo_detalles: [],

  camara_pinhole_open: false,
  camara_pinhole_cantidad: 0,
  camara_pinhole_megapixeles: 0,
  camara_pinhole_detalles: [],

  camara_ptz_open: false,
  camara_ptz_cantidad: 0,
  camara_ptz_megapixeles: 0,
  camara_ptz_detalles: [],

  camara_turret_open: false,
  camara_turret_cantidad: 0,
  camara_turret_megapixeles: 0,
  camara_turret_detalles: [],

  cerco_metros_lineales: '',
  cerco_altura_metros: '',
  cerco_tipo: '',
  cerco_porton: false,

  cerco_metros: '',
  cerco_lineas: 0,
  cerco_metrajes: [''],
  cerco_metraje_distribucion: '',
  cerco_tipo_material: '',
  cerco_color: '',
  cerco_tipo_energizador: '',
  cerco_gabinete: '',
  cerco_sirena: '',
  cerco_cables_tierra: 0,
  cerco_adicionales: '',

  alarmas_zonas: '',
  alarmas_sensores_movimiento: true,
  alarmas_contactos_magneticos: true,
  alarmas_sirena: true,
  alarmas_comunicacion: '',

  dibujo_url: '',
};

const inputBaseClass =
  'w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none';

type Props = {
  ordenId?: number | null;
  disabled?: boolean;
  onSnapshot?: (snapshot: { payload: any; dibujo_url: string }) => void;
};

export default function LevantamientoForm({ ordenId, disabled, onSnapshot }: Props) {
  const megapixelesOptions = useMemo(() => [2, 4, 5, 8, 12], []);

  const cameraRowClass = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4';

  const syncDetalles = (prev: CameraDetalle[], nextCount: number): CameraDetalle[] => {
    const safeCount = Math.max(0, nextCount || 0);
    const trimmed = (prev || []).slice(0, safeCount);
    while (trimmed.length < safeCount) {
      trimmed.push({ ubicacion: '' });
    }
    return trimmed;
  };

  const [v, setV] = useState<LevantamientoFormValue>(defaultValue);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; variant: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({
    show: false,
    variant: 'info',
    title: '',
    message: '',
  });

  const lastLoadedOrdenIdRef = useRef<number | null>(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    const oid = typeof ordenId === 'number' ? ordenId : null;
    if (!oid) return;
    if (lastLoadedOrdenIdRef.current === oid) return;

    const token = getToken();
    if (!token) return;

    lastLoadedOrdenIdRef.current = oid;
    const load = async () => {
      setLoadingRemote(true);
      try {
        const res = await fetch(apiUrl(`/api/ordenes/${oid}/levantamiento/`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store' as RequestCache,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudo cargar el levantamiento.' });
          return;
        }

        const payload = (data as any)?.payload && typeof (data as any).payload === 'object' ? (data as any).payload : {};
        const dibujo_url = (data as any)?.dibujo_url || '';

        setV((prev) => {
          const next = { ...defaultValue, ...payload } as LevantamientoFormValue;
          next.dibujo_url = dibujo_url || (payload as any)?.dibujo_url || prev.dibujo_url || '';
          return next;
        });
      } catch {
        setAlert({ show: true, variant: 'error', title: 'Error', message: 'No se pudo cargar el levantamiento.' });
      } finally {
        setLoadingRemote(false);
      }
    };

    load();
  }, [ordenId]);

  useEffect(() => {
    if (!onSnapshot) return;
    onSnapshot({
      payload: { ...v, dibujo_url: undefined },
      dibujo_url: v.dibujo_url || '',
    });
  }, [v, onSnapshot]);

  return (
    <>
      {alert.show && (
        <div className="mb-3">
          <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
        </div>
      )}

      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Orden de Levantamiento</h4>
      </div>

      <div className="mb-3">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          {loadingRemote ? 'Cargando levantamiento...' : (!ordenId ? '' : '')}
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de levantamiento</h4>
        </div>
        <select
          value={v.tipo}
          disabled={!!disabled}
          onChange={(e) => {
            const nextTipo = (e.target.value || '') as LevantamientoTipo;
            setV((prev) => ({
              ...prev,
              tipo: nextTipo,
              camara_grabado_tecnologia: '',
              camara_grabado_tecnologia_cantidad: 0,
              camara_grabado_compuertas: '',
              camara_grabado_compuertas_cantidad: 0,
              camara_grabado_switch_poe_piezas: 0,
              camara_grabado_switch_poe_capacidad: '',
              camara_grabado_puertos_hdd: 0,
              camara_grabado_almacenamiento: '',
              camara_grabado_capacidad_tb: 1,
              cable_tipo: '',
              cable_categoria: 'cat5',
              cable_resistencia: '',
              cable_blindado: '',
              cable_metraje: '',

              bobina_cable_open: false,
              bobina_cable_cantidad: 0,
              bobina_cable_metrajes: [],
              camara_bala_open: false,
              camara_bala_cantidad: 0,
              camara_bala_megapixeles: 0,
              camara_bala_detalles: [],

              camara_cubo_open: false,
              camara_cubo_cantidad: 0,
              camara_cubo_megapixeles: 0,
              camara_cubo_detalles: [],

              camara_domo_open: false,
              camara_domo_cantidad: 0,
              camara_domo_megapixeles: 0,
              camara_domo_detalles: [],

              camara_pinhole_open: false,
              camara_pinhole_cantidad: 0,
              camara_pinhole_megapixeles: 0,
              camara_pinhole_detalles: [],

              camara_ptz_open: false,
              camara_ptz_cantidad: 0,
              camara_ptz_megapixeles: 0,
              camara_ptz_detalles: [],

              camara_turret_open: false,
              camara_turret_cantidad: 0,
              camara_turret_megapixeles: 0,
              camara_turret_detalles: [],
              ...(nextTipo === 'cerco'
                ? {
                    cerco_metros: '',
                    cerco_lineas: 0,
                    cerco_metrajes: [''],
                    cerco_metraje_distribucion: '' as const,
                    cerco_tipo_material: '' as const,
                    cerco_color: '' as const,
                    cerco_tipo_energizador: '',
                    cerco_gabinete: '' as const,
                    cerco_sirena: '' as const,
                    cerco_cables_tierra: 0,
                    cerco_adicionales: '',
                  }
                : {}),
            }));
          }}
          className={inputBaseClass}
        >
          <option value="">Seleccionar...</option>
          <option value="camara">Cámara</option>
          <option value="cerco">Cerco</option>
          <option value="alarmas">Alarmas</option>
        </select>

        {v.tipo === 'camara' && (
          <>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 mt-6">Tipo de cámara</label>

            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/35 overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_bala_open;
                        const nextCount = prev.camara_bala_cantidad;
                        return {
                          ...prev,
                          camara_bala_open: nextOpen,
                          camara_bala_cantidad: nextCount,
                          camara_bala_detalles: syncDetalles(prev.camara_bala_detalles, nextCount),
                          camara_bala_megapixeles: nextOpen
                            ? prev.camara_bala_megapixeles || megapixelesOptions[0]
                            : prev.camara_bala_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bala</span>
                    <span className={`text-xs font-semibold ${v.camara_bala_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_bala_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_bala_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_bala_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_bala_cantidad: nextCount,
                                    camara_bala_detalles: syncDetalles(prev.camara_bala_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas bala"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_bala_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_bala_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_bala_cantidad: nextCount,
                                    camara_bala_detalles: syncDetalles(prev.camara_bala_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas bala"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_bala_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_bala_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles bala"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_bala_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_bala_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_bala_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles bala"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_bala_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_bala_cantidad }).map((_, idx) => {
                              const detalle = v.camara_bala_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_bala_detalles, prev.camara_bala_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_bala_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_cubo_open;
                        const nextCount = prev.camara_cubo_cantidad;
                        return {
                          ...prev,
                          camara_cubo_open: nextOpen,
                          camara_cubo_cantidad: nextCount,
                          camara_cubo_detalles: syncDetalles(prev.camara_cubo_detalles, nextCount),
                          camara_cubo_megapixeles: nextOpen
                            ? prev.camara_cubo_megapixeles || megapixelesOptions[0]
                            : prev.camara_cubo_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cubo</span>
                    <span className={`text-xs font-semibold ${v.camara_cubo_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_cubo_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_cubo_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_cubo_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_cubo_cantidad: nextCount,
                                    camara_cubo_detalles: syncDetalles(prev.camara_cubo_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas cubo"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_cubo_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_cubo_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_cubo_cantidad: nextCount,
                                    camara_cubo_detalles: syncDetalles(prev.camara_cubo_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas cubo"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_cubo_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_cubo_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles cubo"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_cubo_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_cubo_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_cubo_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles cubo"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_cubo_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_cubo_cantidad }).map((_, idx) => {
                              const detalle = v.camara_cubo_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_cubo_detalles, prev.camara_cubo_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_cubo_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_domo_open;
                        const nextCount = prev.camara_domo_cantidad;
                        return {
                          ...prev,
                          camara_domo_open: nextOpen,
                          camara_domo_cantidad: nextCount,
                          camara_domo_detalles: syncDetalles(prev.camara_domo_detalles, nextCount),
                          camara_domo_megapixeles: nextOpen
                            ? prev.camara_domo_megapixeles || megapixelesOptions[0]
                            : prev.camara_domo_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Domo</span>
                    <span className={`text-xs font-semibold ${v.camara_domo_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_domo_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_domo_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_domo_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_domo_cantidad: nextCount,
                                    camara_domo_detalles: syncDetalles(prev.camara_domo_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas domo"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_domo_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_domo_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_domo_cantidad: nextCount,
                                    camara_domo_detalles: syncDetalles(prev.camara_domo_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas domo"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_domo_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_domo_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles domo"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_domo_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_domo_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_domo_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles domo"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_domo_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_domo_cantidad }).map((_, idx) => {
                              const detalle = v.camara_domo_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_domo_detalles, prev.camara_domo_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_domo_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_pinhole_open;
                        const nextCount = prev.camara_pinhole_cantidad;
                        return {
                          ...prev,
                          camara_pinhole_open: nextOpen,
                          camara_pinhole_cantidad: nextCount,
                          camara_pinhole_detalles: syncDetalles(prev.camara_pinhole_detalles, nextCount),
                          camara_pinhole_megapixeles: nextOpen
                            ? prev.camara_pinhole_megapixeles || megapixelesOptions[0]
                            : prev.camara_pinhole_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pinhole</span>
                    <span className={`text-xs font-semibold ${v.camara_pinhole_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_pinhole_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_pinhole_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_pinhole_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_pinhole_cantidad: nextCount,
                                    camara_pinhole_detalles: syncDetalles(prev.camara_pinhole_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas pinhole"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_pinhole_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_pinhole_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_pinhole_cantidad: nextCount,
                                    camara_pinhole_detalles: syncDetalles(prev.camara_pinhole_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas pinhole"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_pinhole_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_pinhole_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles pinhole"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_pinhole_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_pinhole_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_pinhole_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles pinhole"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_pinhole_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_pinhole_cantidad }).map((_, idx) => {
                              const detalle = v.camara_pinhole_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_pinhole_detalles, prev.camara_pinhole_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_pinhole_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_ptz_open;
                        const nextCount = prev.camara_ptz_cantidad;
                        return {
                          ...prev,
                          camara_ptz_open: nextOpen,
                          camara_ptz_cantidad: nextCount,
                          camara_ptz_detalles: syncDetalles(prev.camara_ptz_detalles, nextCount),
                          camara_ptz_megapixeles: nextOpen
                            ? prev.camara_ptz_megapixeles || megapixelesOptions[0]
                            : prev.camara_ptz_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">PTZ</span>
                    <span className={`text-xs font-semibold ${v.camara_ptz_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_ptz_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_ptz_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_ptz_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_ptz_cantidad: nextCount,
                                    camara_ptz_detalles: syncDetalles(prev.camara_ptz_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas ptz"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_ptz_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_ptz_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_ptz_cantidad: nextCount,
                                    camara_ptz_detalles: syncDetalles(prev.camara_ptz_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas ptz"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_ptz_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_ptz_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles ptz"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_ptz_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_ptz_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_ptz_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles ptz"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_ptz_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_ptz_cantidad }).map((_, idx) => {
                              const detalle = v.camara_ptz_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_ptz_detalles, prev.camara_ptz_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_ptz_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setV((prev) => {
                        const nextOpen = !prev.camara_turret_open;
                        const nextCount = prev.camara_turret_cantidad;
                        return {
                          ...prev,
                          camara_turret_open: nextOpen,
                          camara_turret_cantidad: nextCount,
                          camara_turret_detalles: syncDetalles(prev.camara_turret_detalles, nextCount),
                          camara_turret_megapixeles: nextOpen
                            ? prev.camara_turret_megapixeles || megapixelesOptions[0]
                            : prev.camara_turret_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Turret</span>
                    <span className={`text-xs font-semibold ${v.camara_turret_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_turret_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_turret_open && (
                    <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                      <div className="space-y-2">
                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Piezas</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = Math.max(0, (prev.camara_turret_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_turret_cantidad: nextCount,
                                    camara_turret_detalles: syncDetalles(prev.camara_turret_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas turret"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_turret_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_turret_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_turret_cantidad: nextCount,
                                    camara_turret_detalles: syncDetalles(prev.camara_turret_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas turret"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Megapíxeles</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_turret_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_turret_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles turret"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_turret_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_turret_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_turret_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles turret"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!!v.camara_turret_cantidad && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {Array.from({ length: v.camara_turret_cantidad }).map((_, idx) => {
                              const detalle = v.camara_turret_detalles[idx] || { ubicacion: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Camara {idx + 1}</label>
                                  <input
                                    type="text"
                                    value={detalle.ubicacion}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setV((prev) => {
                                        const next = syncDetalles(prev.camara_turret_detalles, prev.camara_turret_cantidad);
                                        next[idx] = { ...(next[idx] || { ubicacion: '' }), ubicacion: value };
                                        return { ...prev, camara_turret_detalles: next };
                                      });
                                    }}
                                    className={inputBaseClass}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {v.tipo === 'camara' && (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3 mb-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de grabador</h4>
            </div>


            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tecnología</label>
                <select
                  value={v.camara_grabado_tecnologia}
                  onChange={(e) => {
                    const value = (e.target.value as any) as 'NVR' | 'DVR' | 'SVR' | '';
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_tecnologia: value,
                      camara_grabado_tecnologia_cantidad: value ? (prev.camara_grabado_tecnologia_cantidad || 0) : 0,
                    }));
                  }}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="NVR">NVR</option>
                  <option value="DVR">DVR</option>
                  <option value="SVR">SVR</option>
                </select>
              </div>
              {v.camara_grabado_tecnologia && (
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={0}
                    value={v.camara_grabado_tecnologia_cantidad ? v.camara_grabado_tecnologia_cantidad : ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setV((prev) => ({ ...prev, camara_grabado_tecnologia_cantidad: 0 }));
                        return;
                      }
                      const n = Number(raw);
                      setV((prev) => ({ ...prev, camara_grabado_tecnologia_cantidad: Math.max(0, n) }));
                    }}
                    className={inputBaseClass}
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Compuertos POE</label>
                <select
                  value={v.camara_grabado_compuertas}
                  onChange={(e) => {
                    const value = (e.target.value as any) as 'si' | 'no' | '';
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_compuertas: value,
                      camara_grabado_compuertas_cantidad: value === 'si' ? (prev.camara_grabado_compuertas_cantidad || 0) : 0,
                    }));
                  }}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {v.camara_grabado_compuertas === 'si' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cuántos conpuertos POE</label>
                <input
                  type="number"
                  min={0}
                  value={v.camara_grabado_compuertas_cantidad ? v.camara_grabado_compuertas_cantidad : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setV((prev) => ({ ...prev, camara_grabado_compuertas_cantidad: 0 }));
                      return;
                    }
                    const n = Number(raw);
                    setV((prev) => ({ ...prev, camara_grabado_compuertas_cantidad: Math.max(0, n) }));
                  }}
                  className={inputBaseClass}
                />
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:w-1/2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Marca</label>
                <input
                  type="text"
                  value={v.camara_grabado_marca}
                  onChange={(e) => setV((prev) => ({ ...prev, camara_grabado_marca: e.target.value }))}
                  placeholder="Ej: Hikvision, Dahua, etc."
                  className={inputBaseClass}
                />
              </div>
              <div className="w-full md:w-1/2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Capacidad de Canales</label>
                <select
                  value={v.camara_grabado_capacidad_canales}
                  onChange={(e) => setV((prev) => ({ ...prev, camara_grabado_capacidad_canales: (e.target.value as any) }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="4">4 Canales</option>
                  <option value="8">8 Canales</option>
                  <option value="16">16 Canales</option>
                  <option value="32">32 Canales</option>
                  <option value="64">64 Canales</option>
                  <option value="128">128 Canales</option>
                </select>
              </div>
            </div>

            <div className={cameraRowClass}>
              <div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Puertos de disco duro</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_puertos_hdd: Math.max(0, (prev.camara_grabado_puertos_hdd || 0) - 1),
                    }));
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-label="Disminuir puertos de disco duro"
                >
                  -
                </button>
                <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {v.camara_grabado_puertos_hdd || 0}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_puertos_hdd: Math.min(8, (prev.camara_grabado_puertos_hdd || 0) + 1),
                    }));
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-label="Aumentar puertos de disco duro"
                >
                  +
                </button>
              </div>
            </div>

            <div className={cameraRowClass}>
              <div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
              </div>
              <div className="w-full sm:w-44">
                <select
                  value={v.camara_grabado_almacenamiento}
                  onChange={(e) => setV((prev) => ({ ...prev, camara_grabado_almacenamiento: e.target.value }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="cloud">Cloud</option>
                  <option value="disco_duro">Disco Duro</option>
                  <option value="microsd">MicroSD</option>
                  <option value="wi">Wi-Fi</option>
                </select>
              </div>
            </div>

            <div className={cameraRowClass}>
              <div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Capacidad</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_capacidad_tb: Math.max(1, (prev.camara_grabado_capacidad_tb || 1) - 1),
                    }));
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-label="Disminuir capacidad"
                >
                  -
                </button>
                <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {v.camara_grabado_capacidad_tb || 1} TB
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setV((prev) => ({
                      ...prev,
                      camara_grabado_capacidad_tb: Math.min(14, (prev.camara_grabado_capacidad_tb || 1) + 1),
                    }));
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-label="Aumentar capacidad"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Piezas Switch POE</label>
                <input
                  type="number"
                  min={0}
                  value={v.camara_grabado_switch_poe_piezas ? v.camara_grabado_switch_poe_piezas : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setV((prev) => ({ ...prev, camara_grabado_switch_poe_piezas: 0, camara_grabado_switch_poe_capacidades: [] }));
                      return;
                    }
                    const n = Number(raw);
                    const piezas = Math.max(0, n);
                    setV((prev) => {
                      const newCapacidades = [...prev.camara_grabado_switch_poe_capacidades];
                      while (newCapacidades.length < piezas) {
                        newCapacidades.push('');
                      }
                      while (newCapacidades.length > piezas) {
                        newCapacidades.pop();
                      }
                      return { ...prev, camara_grabado_switch_poe_piezas: piezas, camara_grabado_switch_poe_capacidades: newCapacidades };
                    });
                  }}
                  className={inputBaseClass}
                />
              </div>

              {v.camara_grabado_switch_poe_piezas > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Capacidad por Switch</div>
                  {Array.from({ length: v.camara_grabado_switch_poe_piezas }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">Switch {idx + 1}:</span>
                      <select
                        value={v.camara_grabado_switch_poe_capacidades[idx] || ''}
                        onChange={(e) => {
                          setV((prev) => {
                            const newCapacidades = [...prev.camara_grabado_switch_poe_capacidades];
                            newCapacidades[idx] = e.target.value;
                            return { ...prev, camara_grabado_switch_poe_capacidades: newCapacidades };
                          });
                        }}
                        className={inputBaseClass}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="4">4 Puertos</option>
                        <option value="8">8 Puertos</option>
                        <option value="16">16 Puertos</option>
                        <option value="32">32 Puertos</option>
                        <option value="64">64 Puertos</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-3 mb-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de cable</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  value={v.cable_tipo}
                  onChange={(e) => setV((prev) => ({ ...prev, cable_tipo: (e.target.value as any) }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="UTP">UTP</option>
                  <option value="Fibra">Fibra</option>
                </select>
              </div>

              <div className={cameraRowClass}>
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Categoría</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const opts: Array<'cat5' | 'cat6' | 'cat7' | 'cat8'> = ['cat5', 'cat6', 'cat7', 'cat8'];
                      setV((prev) => {
                        const idx = Math.max(0, opts.indexOf(prev.cable_categoria || 'cat5'));
                        const next = opts[Math.max(0, idx - 1)];
                        return { ...prev, cable_categoria: next };
                      });
                    }}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label="Disminuir categoría de cable"
                  >
                    -
                  </button>
                  <div className="min-w-[54px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {v.cable_categoria}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const opts: Array<'cat5' | 'cat6' | 'cat7' | 'cat8'> = ['cat5', 'cat6', 'cat7', 'cat8'];
                      setV((prev) => {
                        const idx = Math.max(0, opts.indexOf(prev.cable_categoria || 'cat5'));
                        const next = opts[Math.min(opts.length - 1, idx + 1)];
                        return { ...prev, cable_categoria: next };
                      });
                    }}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label="Aumentar categoría de cable"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/35 overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  <div className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setV((prev) => {
                          const nextOpen = !prev.bobina_cable_open;
                          return {
                            ...prev,
                            bobina_cable_open: nextOpen,
                          };
                        });
                      }}
                      className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bobina de cable</span>
                      <span className={`text-xs font-semibold ${v.bobina_cable_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {v.bobina_cable_open ? '[-]' : '[+]'}
                      </span>
                    </button>

                    {v.bobina_cable_open && (
                      <div className="mt-2 pt-3 border-t border-gray-200/80 dark:border-white/10 px-2">
                        <div className="space-y-2">
                          <div className={cameraRowClass}>
                            <div>
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-200">¿Cuántas bobinas de cable?</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setV((prev) => ({
                                    ...prev,
                                    bobina_cable_cantidad: Math.max(0, (prev.bobina_cable_cantidad || 0) - 1),
                                    bobina_cable_metrajes: (prev.bobina_cable_metrajes || []).slice(0, Math.max(0, (prev.bobina_cable_cantidad || 0) - 1)),
                                  }));
                                }}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                aria-label="Disminuir bobinas de cable"
                              >
                                -
                              </button>
                              <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                                {v.bobina_cable_cantidad || 0}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setV((prev) => ({
                                    ...prev,
                                    bobina_cable_cantidad: (prev.bobina_cable_cantidad || 0) + 1,
                                    bobina_cable_metrajes: [
                                      ...(prev.bobina_cable_metrajes || []),
                                      '100',
                                    ],
                                  }));
                                }}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                aria-label="Aumentar bobinas de cable"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {(v.bobina_cable_metrajes || []).map((metraje, idx) => (
                            <div key={idx}>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Metraje {idx + 1}</label>
                              <select
                                value={metraje}
                                onChange={(e) => {
                                  const value = (e.target.value as any) || '';
                                  setV((prev) => {
                                    const next = [...(prev.bobina_cable_metrajes || [])];
                                    next[idx] = value;
                                    return { ...prev, bobina_cable_metrajes: next };
                                  });
                                }}
                                className={inputBaseClass}
                              >
                                <option value="">Seleccionar...</option>
                                <option value="100">100</option>
                                <option value="152">152</option>
                                <option value="305">305</option>
                                <option value="1000">1000</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Metraje (m)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={v.cable_metraje}
                  onChange={(e) => setV((prev) => ({ ...prev, cable_metraje: e.target.value }))}
                  className={inputBaseClass}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Resistencia</label>
                <select
                  value={v.cable_resistencia}
                  onChange={(e) => setV((prev) => ({ ...prev, cable_resistencia: (e.target.value as any) }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Blindado</label>
                <select
                  value={v.cable_blindado}
                  onChange={(e) => setV((prev) => ({ ...prev, cable_blindado: (e.target.value as any) }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {v.tipo === 'cerco' && (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4 mb-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Datos del cerco</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Metros de cerco</label>
                <input
                  type="text"
                  value={v.cerco_metros}
                  onChange={(e) => setV((prev) => ({ ...prev, cerco_metros: e.target.value }))}
                  placeholder="Ej: 50"
                  className={inputBaseClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">A cuántas líneas</label>
                <input
                  type="number"
                  min={0}
                  value={v.cerco_lineas ? v.cerco_lineas : ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setV((prev) => ({ ...prev, cerco_lineas: 0 }));
                      return;
                    }
                    setV((prev) => ({ ...prev, cerco_lineas: Math.max(0, Number(raw)) }));
                  }}
                  placeholder="0"
                  className={inputBaseClass}
                />
              </div>
            </div>

            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Metraje</label>
                  <input
                    type="text"
                    value={(v.cerco_metrajes || [''])[0] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setV((prev) => {
                        const arr = prev.cerco_metrajes || [''];
                        const next = [...arr];
                        next[0] = value;
                        return { ...prev, cerco_metrajes: next.length ? next : [''] };
                      });
                    }}
                    placeholder="m"
                    className={inputBaseClass}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Distribución</label>
                  <select
                    value={v.cerco_metraje_distribucion}
                    onChange={(e) =>
                      setV((prev) => ({
                        ...prev,
                        cerco_metraje_distribucion: (e.target.value as '' | 'si' | 'no') || '',
                      }))
                    }
                    className={inputBaseClass}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              {v.cerco_metraje_distribucion === 'si' && (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2 mt-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Detalle por metraje</span>
                    <button
                      type="button"
                      onClick={() =>
                        setV((prev) => ({
                          ...prev,
                          cerco_metrajes: [...(prev.cerco_metrajes || ['']), ''],
                        }))
                      }
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      + Agregar metraje
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(v.cerco_metrajes || ['']).map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[72px]">Metraje {idx + 1}</span>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => {
                            const value = e.target.value;
                            setV((prev) => {
                              const next = [...(prev.cerco_metrajes || [''])];
                              next[idx] = value;
                              return { ...prev, cerco_metrajes: next };
                            });
                          }}
                          placeholder="m"
                          className={inputBaseClass}
                        />
                        {(v.cerco_metrajes || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setV((prev) => {
                                const next = (prev.cerco_metrajes || ['']).filter((_, i) => i !== idx);
                                return { ...prev, cerco_metrajes: next.length >= 1 ? next : [''] };
                              })
                            }
                            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Quitar metraje"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo de material</label>
                <select
                  value={v.cerco_tipo_material}
                  onChange={(e) => setV((prev) => ({ ...prev, cerco_tipo_material: (e.target.value as any) || '' }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="acero">Acero</option>
                  <option value="aluminio">Aluminio</option>
                  <option value="galvanizado">Galvanizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Color del cercado</label>
                <select
                  value={v.cerco_color}
                  onChange={(e) => setV((prev) => ({ ...prev, cerco_color: (e.target.value as any) || '' }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="ninguno">Ninguno</option>
                  <option value="blanco">Blanco</option>
                  <option value="negro">Negro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo de energizador</label>
              <input
                type="text"
                value={v.cerco_tipo_energizador}
                onChange={(e) => setV((prev) => ({ ...prev, cerco_tipo_energizador: e.target.value }))}
                placeholder="Ej: capacidad por metros"
                className={inputBaseClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">¿Lleva gabinete?</label>
                <select
                  value={v.cerco_gabinete}
                  onChange={(e) => setV((prev) => ({ ...prev, cerco_gabinete: (e.target.value as any) || '' }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">¿Lleva sirena?</label>
                <select
                  value={v.cerco_sirena}
                  onChange={(e) => setV((prev) => ({ ...prev, cerco_sirena: (e.target.value as any) || '' }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">¿Cuántos metros de cable de tierra?</label>
              <input
                type="number"
                min={0}
                value={v.cerco_cables_tierra ? v.cerco_cables_tierra : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setV((prev) => ({ ...prev, cerco_cables_tierra: 0 }));
                    return;
                  }
                  setV((prev) => ({ ...prev, cerco_cables_tierra: Math.max(0, Number(raw)) }));
                }}
                placeholder="0"
                className={inputBaseClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Adicionales</label>
              <textarea
                value={v.cerco_adicionales}
                onChange={(e) => setV((prev) => ({ ...prev, cerco_adicionales: e.target.value }))}
                placeholder="Notas o datos adicionales"
                rows={3}
                className={`${inputBaseClass} min-h-[80px] resize-y`}
              />
            </div>
          </div>
        </>
      )}

      {/* Drawing Board */}
      <div className="space-y-3 mt-8">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Diagrama</h4>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
          <DrawingBoard
            value={v.dibujo_url}
            onChange={(drawing) => setV((prev) => ({ ...prev, dibujo_url: drawing }))}
            width={800}
            height={600}
          />
        </div>
      </div>
    </>
  );
}