export interface Cliente {
    id: number;
    idx: number;
    nombre: string;
    direccion: string;
    telefono: string;
    fecha_creacion: string;

    giro?: string;
    correo?: string;
    calle?: string;
    numero_exterior?: string;
    interior?: string;
    colonia?: string;
    codigo_postal?: string;
    ciudad?: string;
    pais?: string;
    estado?: string;
    localidad?: string;
    municipio?: string;
    rfc?: string;
    curp?: string;
    aplica_retenciones?: boolean;
    desglosar_ieps?: boolean;
    numero_precio?: string;
    limite_credito?: string | number | null;
    dias_credito?: number | null;
    notas?: string;
    descuento_pct?: string | number | null;

    portal_web?: string;
    nombre_facturacion?: string;
    numero_facturacion?: string;
    domicilio_facturacion?: string;

    calle_envio?: string;
    numero_envio?: string;
    colonia_envio?: string;
    codigo_postal_envio?: string;
    pais_envio?: string;
    estado_envio?: string;
    ciudad_envio?: string;
    tipo?: 'EMPRESA' | 'PERSONA_FISICA' | 'PROVEEDOR';
    is_prospecto?: boolean;

    contactos?: ClienteContacto[];
    documento?: ClienteDocumento | null;
}

export type ClienteContacto = {
    id?: number;
    cliente?: number;
    nombre_apellido: string;
    titulo: string;
    area_puesto: string;
    celular: string;
    correo: string;
    is_principal?: boolean;
};

export type ClienteDocumento = {
    id: number;
    cliente: number;
    url: string;
    public_id: string;
    nombre_original: string;
    size_bytes: number | null;
};
