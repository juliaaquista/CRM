// Enums que coinciden EXACTAMENTE con el backend

export const ORIGEN_EMPRESA = {
  WEB: 'WEB',
  FERIAS: 'FERIAS',
  RRSS: 'RRSS',
  ABISYSA: 'ABISYSA',
  REFERIDO: 'REFERIDO',
  PROSPECCION: 'PROSPECCION',
  OTRO: 'OTRO',
};

export const ESTADO_OFERTA = {
  PREOFERTA: 'PREOFERTA',
  OFICINA_TECNICA: 'OFICINA_TECNICA',
  ENTREGADA: 'ENTREGADA',
  VISITAR: 'VISITAR',
  STANDBY: 'STANDBY',
  PERDIDA: 'PERDIDA',
};

export const MODO_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  CHEQUE: 'CHEQUE',
  RENTING: 'RENTING',
  LEASING: 'LEASING',
};

export const TIPO_ACCION = {
  LLAMADA: 'LLAMADA',
  VISITA: 'VISITA',
  SEGUIMIENTO: 'SEGUIMIENTO',
  VIDEOLLAMADA: 'VIDEOLLAMADA',
  OTRO: 'OTRO',
};

export const ESTADO_ACCION = {
  PENDIENTE: 'PENDIENTE',
  FINALIZADA: 'FINALIZADA',
  ANULADA: 'ANULADA',
};

export const ROL = {
  JEFE: 'JEFE',
  COMERCIAL: 'COMERCIAL',
};

// Colores para Tags
export const TIPO_ACCION_COLOR = {
  LLAMADA: 'blue',
  VISITA: 'green',
  SEGUIMIENTO: 'cyan',
  VIDEOLLAMADA: 'purple',
  OTRO: 'default',
};

export const ESTADO_OFERTA_COLOR = {
  PREOFERTA: 'blue',
  OFICINA_TECNICA: 'purple',
  ENTREGADA: 'gold',
  VISITAR: 'green',
  STANDBY: 'orange',
  PERDIDA: 'red',
};

export const ESTADO_ACCION_COLOR = {
  PENDIENTE: 'blue',
  FINALIZADA: 'green',
  ANULADA: 'red',
};

// Helpers para Selects de Ant Design (ordenados alfabéticamente)
export const toOptions = (enumObj) =>
  Object.values(enumObj)
    .map((v) => ({ label: v, value: v }))
    .sort((a, b) => a.label.localeCompare(b.label));

// Helper para entidades (empresas, productos, usuarios) — MAYÚSCULAS + orden A-Z
export const toEntityOptions = (entities, labelField = 'nombre', valueField = 'id') =>
  entities
    .map((e) => ({ label: (e[labelField] || '').toUpperCase(), value: e[valueField] }))
    .sort((a, b) => a.label.localeCompare(b.label));
