import { useMemo, useState } from 'react';

type LevantamientoTipo = '' | 'camara' | 'cerco' | 'alarmas';

type LevantamientoFormValue = {
  tipo: LevantamientoTipo;

  camara_bala_open: boolean;
  camara_bala_cantidad: number;
  camara_bala_megapixeles: number;
  camara_bala_almacenamiento: string;

  camara_caja_open: boolean;
  camara_caja_cantidad: number;
  camara_caja_megapixeles: number;
  camara_caja_almacenamiento: string;

  camara_cubo_open: boolean;
  camara_cubo_cantidad: number;
  camara_cubo_megapixeles: number;
  camara_cubo_almacenamiento: string;

  camara_domo_open: boolean;
  camara_domo_cantidad: number;
  camara_domo_megapixeles: number;
  camara_domo_almacenamiento: string;

  camara_pinhole_open: boolean;
  camara_pinhole_cantidad: number;
  camara_pinhole_megapixeles: number;
  camara_pinhole_almacenamiento: string;

  camara_ptz_open: boolean;
  camara_ptz_cantidad: number;
  camara_ptz_megapixeles: number;
  camara_ptz_almacenamiento: string;

  camara_turret_open: boolean;
  camara_turret_cantidad: number;
  camara_turret_megapixeles: number;
  camara_turret_almacenamiento: string;

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

  const [v, setV] = useState<LevantamientoFormValue>({
    tipo: '',

    camara_bala_open: false,
    camara_bala_cantidad: 0,
    camara_bala_megapixeles: 0,
    camara_bala_almacenamiento: '',

    camara_caja_open: false,
    camara_caja_cantidad: 0,
    camara_caja_megapixeles: 0,
    camara_caja_almacenamiento: '',

    camara_cubo_open: false,
    camara_cubo_cantidad: 0,
    camara_cubo_megapixeles: 0,
    camara_cubo_almacenamiento: '',

    camara_domo_open: false,
    camara_domo_cantidad: 0,
    camara_domo_megapixeles: 0,
    camara_domo_almacenamiento: '',

    camara_pinhole_open: false,
    camara_pinhole_cantidad: 0,
    camara_pinhole_megapixeles: 0,
    camara_pinhole_almacenamiento: '',

    camara_ptz_open: false,
    camara_ptz_cantidad: 0,
    camara_ptz_megapixeles: 0,
    camara_ptz_almacenamiento: '',

    camara_turret_open: false,
    camara_turret_cantidad: 0,
    camara_turret_megapixeles: 0,
    camara_turret_almacenamiento: '',

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
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Orden de Levantamiento</h4>
        </div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Tipo de levantamiento</label>
        <select
          value={v.tipo}
          onChange={(e) => {
            const nextTipo = (e.target.value || '') as LevantamientoTipo;
            setV((prev) => ({
              ...prev,
              tipo: nextTipo,
              camara_bala_open: false,
              camara_bala_cantidad: 0,
              camara_bala_megapixeles: 0,
              camara_bala_almacenamiento: '',

              camara_caja_open: false,
              camara_caja_cantidad: 0,
              camara_caja_megapixeles: 0,
              camara_caja_almacenamiento: '',

              camara_cubo_open: false,
              camara_cubo_cantidad: 0,
              camara_cubo_megapixeles: 0,
              camara_cubo_almacenamiento: '',

              camara_domo_open: false,
              camara_domo_cantidad: 0,
              camara_domo_megapixeles: 0,
              camara_domo_almacenamiento: '',

              camara_pinhole_open: false,
              camara_pinhole_cantidad: 0,
              camara_pinhole_megapixeles: 0,
              camara_pinhole_almacenamiento: '',

              camara_ptz_open: false,
              camara_ptz_cantidad: 0,
              camara_ptz_megapixeles: 0,
              camara_ptz_almacenamiento: '',

              camara_turret_open: false,
              camara_turret_cantidad: 0,
              camara_turret_megapixeles: 0,
              camara_turret_almacenamiento: '',
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
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">Cámaras</div>
            </div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Tipo de cámara</label>
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/35 overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-white/10">
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setV((prev) => {
                    const nextOpen = !prev.camara_bala_open;
                    return {
                      ...prev,
                      camara_bala_open: nextOpen,
                      camara_bala_cantidad: nextOpen ? Math.max(1, prev.camara_bala_cantidad || 0) : prev.camara_bala_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_bala_cantidad: Math.max(0, (prev.camara_bala_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_bala_cantidad: (prev.camara_bala_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_caja_open: nextOpen,
                      camara_caja_cantidad: nextOpen ? Math.max(1, prev.camara_caja_cantidad || 0) : prev.camara_caja_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_caja_cantidad: Math.max(0, (prev.camara_caja_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_caja_cantidad: (prev.camara_caja_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_cubo_open: nextOpen,
                      camara_cubo_cantidad: nextOpen ? Math.max(1, prev.camara_cubo_cantidad || 0) : prev.camara_cubo_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_cubo_cantidad: Math.max(0, (prev.camara_cubo_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_cubo_cantidad: (prev.camara_cubo_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_domo_open: nextOpen,
                      camara_domo_cantidad: nextOpen ? Math.max(1, prev.camara_domo_cantidad || 0) : prev.camara_domo_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_domo_cantidad: Math.max(0, (prev.camara_domo_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_domo_cantidad: (prev.camara_domo_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_pinhole_open: nextOpen,
                      camara_pinhole_cantidad: nextOpen ? Math.max(1, prev.camara_pinhole_cantidad || 0) : prev.camara_pinhole_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_pinhole_cantidad: Math.max(0, (prev.camara_pinhole_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_pinhole_cantidad: (prev.camara_pinhole_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_ptz_open: nextOpen,
                      camara_ptz_cantidad: nextOpen ? Math.max(1, prev.camara_ptz_cantidad || 0) : prev.camara_ptz_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_ptz_cantidad: Math.max(0, (prev.camara_ptz_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_ptz_cantidad: (prev.camara_ptz_cantidad || 0) + 1,
                            }));
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
                    return {
                      ...prev,
                      camara_turret_open: nextOpen,
                      camara_turret_cantidad: nextOpen ? Math.max(1, prev.camara_turret_cantidad || 0) : prev.camara_turret_cantidad,
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
                            setV((prev) => ({
                              ...prev,
                              camara_turret_cantidad: Math.max(0, (prev.camara_turret_cantidad || 0) - 1),
                            }));
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
                            setV((prev) => ({
                              ...prev,
                              camara_turret_cantidad: (prev.camara_turret_cantidad || 0) + 1,
                            }));
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
    </div>
  );
}
