/**
 * Política de contraseña del portal cliente — deliberadamente suave.
 *
 * El backend solo exige 8 caracteres (`portal_serializers.py`). Aquí subimos
 * el listón sin volverlo hostil: se pide una base razonable (largo + mezcla de
 * letras y números + que no sea una palabra obvia) y el resto —12+ caracteres,
 * mayúsculas/minúsculas, un símbolo— son sugerencias que suben el medidor pero
 * no bloquean. Criterio NIST 800-63B: el largo pesa más que la composición.
 */

/** Mínimo que el backend acepta. */
export const MIN_LARGO = 8;
/** Largo recomendado (no obligatorio). */
export const LARGO_COMODO = 12;

/** Palabras y secuencias que nunca deberían pasar por «contraseña». */
const OBVIAS = [
  'password',
  'contrasena',
  'contraseña',
  'sertel',
  'sertelpro',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwertyui',
  'aaaaaaaa',
  'abcdefgh',
];

export interface Requisito {
  id: string;
  label: string;
  cumplido: boolean;
  /** `true` = bloquea el botón hasta cumplirse; `false` = solo suma al medidor. */
  requerido: boolean;
}

export type NivelFuerza = 0 | 1 | 2 | 3 | 4;

export interface EvaluacionContrasena {
  requisitos: Requisito[];
  /** Requisitos obligatorios que aún faltan. */
  faltantesRequeridos: number;
  /** 0–4: alimenta el medidor segmentado. */
  nivel: NivelFuerza;
  etiqueta: 'Muy débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Muy fuerte';
  /** Base cubierta y ambas contraseñas coinciden. */
  listoParaEnviar: boolean;
}

function esObvia(valor: string): boolean {
  const limpio = valor.trim().toLowerCase();
  if (limpio.length === 0) return false;
  return OBVIAS.some((mala) => limpio.includes(mala));
}

interface Contexto {
  /** La contraseña temporal que llegó por correo — la nueva no puede ser esa. */
  tempPassword?: string;
  /** El campo «repite la nueva». */
  confirmar?: string;
}

export function evaluarContrasena(
  nueva: string,
  { tempPassword = '', confirmar = '' }: Contexto = {},
): EvaluacionContrasena {
  const largoOk = nueva.length >= MIN_LARGO;
  const mezclaOk = /[a-zA-ZÀ-ÿ]/.test(nueva) && /\d/.test(nueva);
  const distintaTemp = nueva.length > 0 && nueva !== tempPassword;
  const noObvia = nueva.length > 0 && !esObvia(nueva);

  const largoComodoOk = nueva.length >= LARGO_COMODO;
  const casoOk = /[a-zà-ÿ]/.test(nueva) && /[A-ZÀ-Ý]/.test(nueva);
  const simboloOk = /[^a-zA-Z0-9À-ÿ]/.test(nueva);

  const requisitos: Requisito[] = [
    { id: 'largo', label: `Al menos ${MIN_LARGO} caracteres`, cumplido: largoOk, requerido: true },
    { id: 'mezcla', label: 'Combina letras y números', cumplido: mezclaOk, requerido: true },
    { id: 'obvia', label: 'Evita palabras y secuencias obvias', cumplido: noObvia, requerido: true },
    { id: 'temp', label: 'Distinta a la contraseña temporal', cumplido: distintaTemp, requerido: true },
    { id: 'comodo', label: `Mejor si llega a ${LARGO_COMODO} caracteres`, cumplido: largoComodoOk, requerido: false },
    { id: 'caso', label: 'Suma una mayúscula y una minúscula', cumplido: casoOk, requerido: false },
    { id: 'simbolo', label: 'Suma un símbolo (! ? * …)', cumplido: simboloOk, requerido: false },
  ];

  const faltantesRequeridos = requisitos.filter((r) => r.requerido && !r.cumplido).length;

  // Medidor: base cubierta = 2 puntos; cada sugerencia cumplida suma 1 (tope 4).
  // Sin base cubierta, el nivel refleja lo poco que hay (0 o 1).
  const baseCubierta = faltantesRequeridos === 0;
  const sugerenciasOk = [largoComodoOk, casoOk, simboloOk].filter(Boolean).length;
  let nivel: NivelFuerza;
  if (!baseCubierta) {
    nivel = nueva.length === 0 ? 0 : requisitos.filter((r) => r.requerido && r.cumplido).length >= 2 ? 1 : 0;
  } else {
    nivel = Math.min(4, 2 + sugerenciasOk) as NivelFuerza;
  }

  const ETIQUETAS: EvaluacionContrasena['etiqueta'][] = [
    'Muy débil',
    'Débil',
    'Aceptable',
    'Fuerte',
    'Muy fuerte',
  ];

  const coincide = confirmar.length > 0 && nueva === confirmar;
  const listoParaEnviar = baseCubierta && coincide;

  return {
    requisitos,
    faltantesRequeridos,
    nivel,
    etiqueta: ETIQUETAS[nivel] ?? 'Muy débil',
    listoParaEnviar,
  };
}
