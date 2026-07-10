type MetodoPagoEmail = 'MERCADOPAGO' | 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

function formatearMetodoPago(metodo?: MetodoPagoEmail): string {
  if (metodo === 'MERCADOPAGO') return 'Mercado Pago';
  if (metodo === 'EFECTIVO') return 'Efectivo';
  if (metodo === 'TARJETA') return 'Posnet';
  if (metodo === 'TRANSFERENCIA') return 'Transferencia';
  return 'Efectivo / Posnet';
}

export function buildTurnoConfirmadoEmailHtml(params: {
  actividadNombre: string;
  fechaStr: string;
  horaStr: string;
  pago?: {
    fecha_pago?: Date | null;
    monto?: number;
    metodo?: MetodoPagoEmail;
  };
}): string {
  const { actividadNombre, fechaStr, horaStr, pago } = params;
  const descripcion = `Su turno para la actividad ${actividadNombre} ha sido confirmado para el día ${fechaStr} a las ${horaStr}hs.`;

  const fechaPago = pago?.fecha_pago ? new Date(pago.fecha_pago) : new Date();
  const fechaPagoStr = fechaPago.toLocaleDateString('es-AR');
  const horaPagoStr = fechaPago.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const montoPago = pago?.monto !== undefined
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(pago.monto))
    : 'N/A';
  const metodoPago = formatearMetodoPago(pago?.metodo);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
              <tr>
                <td align="center" style="padding:32px 20px;border-bottom:1px solid #f1f5f9;">
                  <h1 style="color:#0d9488;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">KinePro</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 40px 20px 40px;">
                  <h2 style="color:#1e293b;margin:0 0 20px 0;font-size:20px;font-weight:700;">Turno confirmado</h2>
                  <p style="color:#475569;font-size:16px;line-height:24px;margin:0 0 24px 0;">${descripcion}</p>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                    <tr>
                      <td style="padding:0 0 12px 0;font-size:14px;color:#64748b;font-weight:700;">Comprobante de pago</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 8px 0;border-top:1px solid #e2e8f0;">
                        <strong style="display:block;color:#0f172a;margin-bottom:4px;">Fecha del pago</strong>
                        <span style="color:#334155;font-size:15px;">${fechaPagoStr} a las ${horaPagoStr}hs</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 8px 0;border-top:1px solid #e2e8f0;">
                        <strong style="display:block;color:#0f172a;margin-bottom:4px;">Monto</strong>
                        <span style="color:#334155;font-size:15px;">${montoPago}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 0 0;border-top:1px solid #e2e8f0;">
                        <strong style="display:block;color:#0f172a;margin-bottom:4px;">Medio de pago</strong>
                        <span style="color:#334155;font-size:15px;">${metodoPago}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                  <p style="color:#94a3b8;font-size:12px;line-height:18px;margin:0;">&copy; ${new Date().getFullYear()} KinePro. Todos los derechos reservados.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
