import { useMemo, useState } from 'react';

type LevantamientoTipo = '' | 'camara' | 'cerco' | 'alarmas';

type CameraDetalle = {
  ubicacion: string;
  comentario: string;
};

type LevantamientoFormValue = {
  tipo: LevantamientoTipo;

  camara_grabado_tecnologia: 'NVR' | 'DVR' | 'SVR' | '';
  camara_grabado_compuertas: 'si' | 'no' | '';
  camara_grabado_compuertas_cantidad: number;
  camara_grabado_puertos_hdd: number;
  camara_grabado_capacidad_tb: number;

  cable_tipo: 'UTP' | 'Fibra' | '';
  cable_categoria: 'cat5' | 'cat6' | 'cat7' | 'cat8';
  cable_ubicacion: 'exterior' | 'interior' | '';
  cable_blindado: 'si' | 'no' | '';

  camara_bala_open: boolean;
  camara_bala_cantidad: number;
  camara_bala_megapixeles: number;
  camara_bala_almacenamiento: string;
  camara_bala_detalles: CameraDetalle[];

  camara_caja_open: boolean;
  camara_caja_cantidad: number;
  camara_caja_megapixeles: number;
  camara_caja_almacenamiento: string;
  camara_caja_detalles: CameraDetalle[];

  camara_cubo_open: boolean;
  camara_cubo_cantidad: number;
  camara_cubo_megapixeles: number;
  camara_cubo_almacenamiento: string;
  camara_cubo_detalles: CameraDetalle[];

  camara_domo_open: boolean;
  camara_domo_cantidad: number;
  camara_domo_megapixeles: number;
  camara_domo_almacenamiento: string;
  camara_domo_detalles: CameraDetalle[];

  camara_pinhole_open: boolean;
  camara_pinhole_cantidad: number;
  camara_pinhole_megapixeles: number;
  camara_pinhole_almacenamiento: string;
  camara_pinhole_detalles: CameraDetalle[];

  camara_ptz_open: boolean;
  camara_ptz_cantidad: number;
  camara_ptz_megapixeles: number;
  camara_ptz_almacenamiento: string;
  camara_ptz_detalles: CameraDetalle[];

  camara_turret_open: boolean;
  camara_turret_cantidad: number;
  camara_turret_megapixeles: number;
  camara_turret_almacenamiento: string;
  camara_turret_detalles: CameraDetalle[];

  cerco_metros_lineales: string;
  cerco_altura_metros: string;
  cerco_tipo: string;
  cerco_porton: boolean;

  alarmas_zonas: string;
  alarmas_sensores_movimiento: boolean;
  alarmas_contactos_magneticos: boolean;
  alarmas_sirena: boolean;
  alarmas_comunicacion: 'wifi' | 'ethernet' | 'gsm' | '';
};

const inputBaseClass =
  'w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none';

export default function LevantamientoForm() {
  const megapixelesOptions = useMemo(() => [2, 4, 5, 8, 12], []);

  const cameraRowClass = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4';

  const syncDetalles = (prev: CameraDetalle[], nextCount: number): CameraDetalle[] => {
    const safeCount = Math.max(0, nextCount || 0);
    const trimmed = (prev || []).slice(0, safeCount);
    while (trimmed.length < safeCount) {
      trimmed.push({ ubicacion: '', comentario: '' });
    }
    return trimmed;
  };

  const [v, setV] = useState<LevantamientoFormValue>({
    tipo: '',

    camara_grabado_tecnologia: '',
    camara_grabado_compuertas: '',
    camara_grabado_compuertas_cantidad: 0,
    camara_grabado_puertos_hdd: 0,
    camara_grabado_capacidad_tb: 1,

    cable_tipo: '',
    cable_categoria: 'cat5',
    cable_ubicacion: '',
    cable_blindado: '',

    camara_bala_open: false,
    camara_bala_cantidad: 0,
    camara_bala_megapixeles: 0,
    camara_bala_almacenamiento: '',
    camara_bala_detalles: [],

    camara_caja_open: false,
    camara_caja_cantidad: 0,
    camara_caja_megapixeles: 0,
    camara_caja_almacenamiento: '',
    camara_caja_detalles: [],

    camara_cubo_open: false,
    camara_cubo_cantidad: 0,
    camara_cubo_megapixeles: 0,
    camara_cubo_almacenamiento: '',
    camara_cubo_detalles: [],

    camara_domo_open: false,
    camara_domo_cantidad: 0,
    camara_domo_megapixeles: 0,
    camara_domo_almacenamiento: '',
    camara_domo_detalles: [],

    camara_pinhole_open: false,
    camara_pinhole_cantidad: 0,
    camara_pinhole_megapixeles: 0,
    camara_pinhole_almacenamiento: '',
    camara_pinhole_detalles: [],

    camara_ptz_open: false,
    camara_ptz_cantidad: 0,
    camara_ptz_megapixeles: 0,
    camara_ptz_almacenamiento: '',
    camara_ptz_detalles: [],

    camara_turret_open: false,
    camara_turret_cantidad: 0,
    camara_turret_megapixeles: 0,
    camara_turret_almacenamiento: '',
    camara_turret_detalles: [],

    cerco_metros_lineales: '',
    cerco_altura_metros: '',
    cerco_tipo: '',
    cerco_porton: false,

    alarmas_zonas: '',
    alarmas_sensores_movimiento: true,
    alarmas_contactos_magneticos: true,
    alarmas_sirena: true,
    alarmas_comunicacion: '',
  });

  return (
    <>
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Orden de Levantamiento</h4>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-gray-900/40 shadow-theme-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Tipo de levantamiento</h4>
        </div>
        <select
          value={v.tipo}
          onChange={(e) => {
            const nextTipo = (e.target.value || '') as LevantamientoTipo;
            setV((prev) => ({
              ...prev,
              tipo: nextTipo,
              camara_grabado_tecnologia: '',
              camara_grabado_compuertas: '',
              camara_grabado_compuertas_cantidad: 0,
              camara_grabado_puertos_hdd: 0,
              camara_grabado_capacidad_tb: 1,
              cable_tipo: '',
              cable_categoria: 'cat5',
              cable_ubicacion: '',
              cable_blindado: '',
              camara_bala_open: false,
              camara_bala_cantidad: 0,
              camara_bala_megapixeles: 0,
              camara_bala_almacenamiento: '',
              camara_bala_detalles: [],

              camara_caja_open: false,
              camara_caja_cantidad: 0,
              camara_caja_megapixeles: 0,
              camara_caja_almacenamiento: '',
              camara_caja_detalles: [],

              camara_cubo_open: false,
              camara_cubo_cantidad: 0,
              camara_cubo_megapixeles: 0,
              camara_cubo_almacenamiento: '',
              camara_cubo_detalles: [],

              camara_domo_open: false,
              camara_domo_cantidad: 0,
              camara_domo_megapixeles: 0,
              camara_domo_almacenamiento: '',
              camara_domo_detalles: [],

              camara_pinhole_open: false,
              camara_pinhole_cantidad: 0,
              camara_pinhole_megapixeles: 0,
              camara_pinhole_almacenamiento: '',
              camara_pinhole_detalles: [],

              camara_ptz_open: false,
              camara_ptz_cantidad: 0,
              camara_ptz_megapixeles: 0,
              camara_ptz_almacenamiento: '',
              camara_ptz_detalles: [],

              camara_turret_open: false,
              camara_turret_cantidad: 0,
              camara_turret_megapixeles: 0,
              camara_turret_almacenamiento: '',
              camara_turret_detalles: [],
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
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Tipo de cámara</label>

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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_bala_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_bala_almacenamiento: e.target.value }))}
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

                        {!!v.camara_bala_cantidad && (
                          <div className="space-y-3 pt-2">
                            {Array.from({ length: v.camara_bala_cantidad }).map((_, idx) => {
                              const detalle = v.camara_bala_detalles[idx] || { ubicacion: '', comentario: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                      <input
                                        type="text"
                                        value={detalle.ubicacion}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setV((prev) => {
                                            const next = syncDetalles(prev.camara_bala_detalles, prev.camara_bala_cantidad);
                                            next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                            return { ...prev, camara_bala_detalles: next };
                                          });
                                        }}
                                        className={inputBaseClass}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                      <input
                                        type="text"
                                        value={detalle.comentario}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setV((prev) => {
                                            const next = syncDetalles(prev.camara_bala_detalles, prev.camara_bala_cantidad);
                                            next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                            return { ...prev, camara_bala_detalles: next };
                                          });
                                        }}
                                        className={inputBaseClass}
                                      />
                                    </div>
                                  </div>
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
                        const nextOpen = !prev.camara_caja_open;
                        const nextCount = prev.camara_caja_cantidad;
                        return {
                          ...prev,
                          camara_caja_open: nextOpen,
                          camara_caja_cantidad: nextCount,
                          camara_caja_detalles: syncDetalles(prev.camara_caja_detalles, nextCount),
                          camara_caja_megapixeles: nextOpen
                            ? prev.camara_caja_megapixeles || megapixelesOptions[0]
                            : prev.camara_caja_megapixeles,
                        };
                      });
                    }}
                    className="w-full inline-flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Caja</span>
                    <span className={`text-xs font-semibold ${v.camara_caja_open ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                      {v.camara_caja_open ? '[-]' : '[+]'}
                    </span>
                  </button>

                  {v.camara_caja_open && (
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
                                  const nextCount = Math.max(0, (prev.camara_caja_cantidad || 0) - 1);
                                  return {
                                    ...prev,
                                    camara_caja_cantidad: nextCount,
                                    camara_caja_detalles: syncDetalles(prev.camara_caja_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir piezas caja"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_caja_cantidad || 0}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const nextCount = (prev.camara_caja_cantidad || 0) + 1;
                                  return {
                                    ...prev,
                                    camara_caja_cantidad: nextCount,
                                    camara_caja_detalles: syncDetalles(prev.camara_caja_detalles, nextCount),
                                  };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar piezas caja"
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
                                  const current = prev.camara_caja_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.max(0, safeIdx - 1)];
                                  return { ...prev, camara_caja_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Disminuir megapíxeles caja"
                            >
                              -
                            </button>
                            <div className="min-w-[42px] text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {v.camara_caja_megapixeles || megapixelesOptions[0]}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setV((prev) => {
                                  const current = prev.camara_caja_megapixeles || megapixelesOptions[0];
                                  const idx = megapixelesOptions.indexOf(current);
                                  const safeIdx = idx >= 0 ? idx : 0;
                                  const next = megapixelesOptions[Math.min(megapixelesOptions.length - 1, safeIdx + 1)];
                                  return { ...prev, camara_caja_megapixeles: next };
                                });
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              aria-label="Aumentar megapíxeles caja"
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
                              value={v.camara_caja_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_caja_almacenamiento: e.target.value }))}
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

                        {!!v.camara_caja_cantidad && (
                          <div className="space-y-3 pt-2">
                            {Array.from({ length: v.camara_caja_cantidad }).map((_, idx) => {
                              const detalle = v.camara_caja_detalles[idx] || { ubicacion: '', comentario: '' };
                              return (
                                <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                      <input
                                        type="text"
                                        value={detalle.ubicacion}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setV((prev) => {
                                            const next = syncDetalles(prev.camara_caja_detalles, prev.camara_caja_cantidad);
                                            next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                            return { ...prev, camara_caja_detalles: next };
                                          });
                                        }}
                                        className={inputBaseClass}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                      <input
                                        type="text"
                                        value={detalle.comentario}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setV((prev) => {
                                            const next = syncDetalles(prev.camara_caja_detalles, prev.camara_caja_cantidad);
                                            next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                            return { ...prev, camara_caja_detalles: next };
                                          });
                                        }}
                                        className={inputBaseClass}
                                      />
                                    </div>
                                  </div>
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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_cubo_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_cubo_almacenamiento: e.target.value }))}
                              className={inputBaseClass}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="cloud">Cloud</option>
                              <option value="disco_duro">Disco Duro</option>
                              <option value="microsd">MicroSD</option>
                              <option value="wi">Wi-Fi</option>
                            </select>

                            {!!v.camara_cubo_cantidad && (
                              <div className="space-y-3 pt-2">
                                {Array.from({ length: v.camara_cubo_cantidad }).map((_, idx) => {
                                  const detalle = v.camara_cubo_detalles[idx] || { ubicacion: '', comentario: '' };
                                  return (
                                    <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                          <input
                                            type="text"
                                            value={detalle.ubicacion}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_cubo_detalles, prev.camara_cubo_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                                return { ...prev, camara_cubo_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                          <input
                                            type="text"
                                            value={detalle.comentario}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_cubo_detalles, prev.camara_cubo_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                                return { ...prev, camara_cubo_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_domo_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_domo_almacenamiento: e.target.value }))}
                              className={inputBaseClass}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="cloud">Cloud</option>
                              <option value="disco_duro">Disco Duro</option>
                              <option value="microsd">MicroSD</option>
                              <option value="wi">Wi-Fi</option>
                            </select>

                            {!!v.camara_domo_cantidad && (
                              <div className="space-y-3 pt-2">
                                {Array.from({ length: v.camara_domo_cantidad }).map((_, idx) => {
                                  const detalle = v.camara_domo_detalles[idx] || { ubicacion: '', comentario: '' };
                                  return (
                                    <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                          <input
                                            type="text"
                                            value={detalle.ubicacion}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_domo_detalles, prev.camara_domo_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                                return { ...prev, camara_domo_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                          <input
                                            type="text"
                                            value={detalle.comentario}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_domo_detalles, prev.camara_domo_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                                return { ...prev, camara_domo_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_pinhole_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_pinhole_almacenamiento: e.target.value }))}
                              className={inputBaseClass}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="cloud">Cloud</option>
                              <option value="disco_duro">Disco Duro</option>
                              <option value="microsd">MicroSD</option>
                              <option value="wi">Wi-Fi</option>
                            </select>

                            {!!v.camara_pinhole_cantidad && (
                              <div className="space-y-3 pt-2">
                                {Array.from({ length: v.camara_pinhole_cantidad }).map((_, idx) => {
                                  const detalle = v.camara_pinhole_detalles[idx] || { ubicacion: '', comentario: '' };
                                  return (
                                    <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                          <input
                                            type="text"
                                            value={detalle.ubicacion}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_pinhole_detalles, prev.camara_pinhole_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                                return { ...prev, camara_pinhole_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                          <input
                                            type="text"
                                            value={detalle.comentario}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_pinhole_detalles, prev.camara_pinhole_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                                return { ...prev, camara_pinhole_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_ptz_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_ptz_almacenamiento: e.target.value }))}
                              className={inputBaseClass}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="cloud">Cloud</option>
                              <option value="disco_duro">Disco Duro</option>
                              <option value="microsd">MicroSD</option>
                              <option value="wi">Wi-Fi</option>
                            </select>

                            {!!v.camara_ptz_cantidad && (
                              <div className="space-y-3 pt-2">
                                {Array.from({ length: v.camara_ptz_cantidad }).map((_, idx) => {
                                  const detalle = v.camara_ptz_detalles[idx] || { ubicacion: '', comentario: '' };
                                  return (
                                    <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                          <input
                                            type="text"
                                            value={detalle.ubicacion}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_ptz_detalles, prev.camara_ptz_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                                return { ...prev, camara_ptz_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                          <input
                                            type="text"
                                            value={detalle.comentario}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_ptz_detalles, prev.camara_ptz_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                                return { ...prev, camara_ptz_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
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

                        <div className={cameraRowClass}>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Almacenamiento</div>
                          </div>
                          <div className="w-full sm:w-44">
                            <select
                              value={v.camara_turret_almacenamiento}
                              onChange={(e) => setV((prev) => ({ ...prev, camara_turret_almacenamiento: e.target.value }))}
                              className={inputBaseClass}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="cloud">Cloud</option>
                              <option value="disco_duro">Disco Duro</option>
                              <option value="microsd">MicroSD</option>
                              <option value="wi">Wi-Fi</option>
                            </select>

                            {!!v.camara_turret_cantidad && (
                              <div className="space-y-3 pt-2">
                                {Array.from({ length: v.camara_turret_cantidad }).map((_, idx) => {
                                  const detalle = v.camara_turret_detalles[idx] || { ubicacion: '', comentario: '' };
                                  return (
                                    <div key={idx} className="rounded-lg border border-gray-200/80 dark:border-white/10 p-3 bg-white/70 dark:bg-gray-900/30">
                                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Camara {idx + 1}</div>
                                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                                          <input
                                            type="text"
                                            value={detalle.ubicacion}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_turret_detalles, prev.camara_turret_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), ubicacion: value };
                                                return { ...prev, camara_turret_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Comentario</label>
                                          <input
                                            type="text"
                                            value={detalle.comentario}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setV((prev) => {
                                                const next = syncDetalles(prev.camara_turret_detalles, prev.camara_turret_cantidad);
                                                next[idx] = { ...(next[idx] || { ubicacion: '', comentario: '' }), comentario: value };
                                                return { ...prev, camara_turret_detalles: next };
                                              });
                                            }}
                                            className={inputBaseClass}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
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


            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tecnología</label>
                <select
                  value={v.camara_grabado_tecnologia}
                  onChange={(e) => setV((prev) => ({ ...prev, camara_grabado_tecnologia: (e.target.value as any) }))}
                  className={inputBaseClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="NVR">NVR</option>
                  <option value="DVR">DVR</option>
                  <option value="SVR">SVR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Compuertas</label>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cuántas compuertas</label>
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
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Ubicación</label>
                <select
                  value={v.cable_ubicacion}
                  onChange={(e) => setV((prev) => ({ ...prev, cable_ubicacion: (e.target.value as any) }))}
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
    </>
  );
}
