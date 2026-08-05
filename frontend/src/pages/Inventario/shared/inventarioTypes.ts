export type InventarioFuente = "desconocido" | "syscom" | "tvc";
export type ScanModo = "entrada" | "salida";

export type InventarioItem = {
  id: number;
  codigo_barras: string;
  nombre: string;
  marca: string;
  modelo: string;
  notas: string;
  fuente: InventarioFuente;
  ref_externa: string;
  cantidad: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
};

export type InventarioMovimiento = {
  id: number;
  item: number;
  tipo: ScanModo;
  cantidad: number;
  usuario: number | null;
  nota: string;
  creado_en: string;
};

export type ScanResponse = {
  item: InventarioItem;
  movimiento: InventarioMovimiento;
  creado: boolean;
  enriquecido: boolean;
};

export type InventarioItemPatch = Partial<
  Pick<InventarioItem, "nombre" | "marca" | "modelo" | "notas">
>;

export type InventarioMovimientosParams = {
  item?: number | string;
  desde?: string;
};
