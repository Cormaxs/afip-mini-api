// src/utils/mapeos.js

/**
 * Mapeo de tipos de comprobante AFIP a nombres de campo en el contador
 * (para facturas y notas de crédito/débito)
 */
export const TIPO_A_CAMPO = {
    // Facturas
    1: 'facturaA',
    6: 'facturaB',
    11: 'facturaC',
    // Notas de crédito
    3: 'notaCreditoA',
    8: 'notaCreditoB',
    13: 'notaCreditoC',
    // Notas de débito
    2: 'notaDebitoA',
    7: 'notaDebitoB',
    12: 'notaDebitoC',
    // Recibos
    4: 'reciboA',
    9: 'reciboB',
    15: 'reciboC',
    // Notas de venta al contado
    5: 'notaVentaA',
    10: 'notaVentaB',
    16: 'notaVentaC',
  };
  
  /**
   * Mapeo de tipo de comprobante original a tipo de nota de crédito (para anulaciones)
   */
  export const TIPO_ORIGINAL_A_NOTA_CREDITO = {
    1: 3,   // Factura A -> Nota de Crédito A
    6: 8,   // Factura B -> Nota de Crédito B
    11: 13, // Factura C -> Nota de Crédito C
  };
  
  /**
   * Mapeo de tipo de comprobante original a campo de nota de crédito en el contador
   */
  export const TIPO_ORIGINAL_A_CAMPO_NC = {
    1: 'notaCreditoA',
    6: 'notaCreditoB',
    11: 'notaCreditoC',
  };
  
  /**
   * Alícuotas de IVA (id -> porcentaje)
   */
  export const ALICUOTAS_IVA = {
    3: 0,    // 0%
    4: 10.5, // 10.5%
    5: 21,   // 21%
    6: 27,   // 27%
    8: 5,    // 5%
    9: 2.5,  // 2.5%
  };
  
  /**
   * Condiciones de IVA del receptor (id -> descripción)
   */
  export const CONDICIONES_IVA = {
    1: 'Responsable Inscripto',
    2: 'Responsable No Inscripto',
    3: 'Responsable Monotributo',
    4: 'Sujeto Exento',
    5: 'Consumidor Final',
    6: 'Responsable Monotributo (Social)',
  };
  
  /**
   * Condición de IVA por defecto para cada tipo de comprobante
   */
  export const CONDICION_POR_DEFECTO = {
    1: 1,  // Factura A -> Responsable Inscripto
    6: 5,  // Factura B -> Consumidor Final
    11: 5, // Factura C -> Consumidor Final
  };
  
  /**
   * Tipos de documento (id -> descripción)
   */
  export const TIPOS_DOCUMENTO = {
    80: 'CUIT',
    86: 'CUIL',
    87: 'CDI',
    89: 'LE',
    90: 'LC',
    91: 'CI Extranjera',
    92: 'en trámite',
    93: 'Acta Nacimiento',
    95: 'CI Bs. As.',
    96: 'DNI',
    99: 'Sin Identificar',
  };
  
  /**
   * Tipos de comprobante (id -> descripción)
   */
  export const TIPOS_COMPROBANTE = {
    1: 'Factura A',
    2: 'Nota de Débito A',
    3: 'Nota de Crédito A',
    4: 'Recibo A',
    5: 'Nota de Venta al Contado A',
    6: 'Factura B',
    7: 'Nota de Débito B',
    8: 'Nota de Crédito B',
    9: 'Recibo B',
    10: 'Nota de Venta al Contado B',
    11: 'Factura C',
    12: 'Nota de Débito C',
    13: 'Nota de Crédito C',
    15: 'Recibo C',
    16: 'Nota de Venta al Contado C',
  };
  
  /**
   * Condiciones de IVA del receptor permitidas por tipo de comprobante
   */
  export const CONDICIONES_PERMITIDAS_POR_TIPO = {
    1: [1, 2, 3, 4, 6], // Factura A
    6: [2, 3, 4, 5, 6], // Factura B
    11: [5],             // Factura C
  };