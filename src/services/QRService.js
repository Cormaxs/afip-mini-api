import QRCode from 'qrcode';

export default class QRService {
  #cache = new Map();

  async generar(factura, resultado, cuit) {
    // ✅ Usa datos ya validados, NO los modifica
    const params = [
      cuit,
      String(factura.puntoVenta || 1).padStart(4, '0'),
      String(factura.tipoComprobante || 1).padStart(2, '0'),
      String(resultado.numero || '').padStart(8, '0'),
      Number(factura.importeTotal || 0).toFixed(2),
      'PES',
      resultado.cae || '',
      String(resultado.caeVencimiento || '').replace(/-/g, '')
    ].join('|');

    const url = `https://www.arca.gob.ar/fe/qr/?p=${encodeURIComponent(params)}`;

    if (this.#cache.has(url)) return this.#cache.get(url);

    const qr = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'L',
      margin: 0,
      width: 150
    });

    if (this.#cache.size > 30) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(url, qr);

    return qr;
  }

  limpiarCache() {
    this.#cache.clear();
  }
}