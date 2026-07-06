import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUnlockEmail(email: string, token: string) {
    const urlDesbloqueo = `${process.env.WEB_ORIGIN}/?token=${token}`; 

    await this.mailerService.sendMail({
      to: email,
      subject: 'KinePro - Acción requerida: Cuenta bloqueada', 
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                  
                  <tr>
                    <td align="center" style="padding: 32px 20px; border-bottom: 1px solid #f1f5f9;">
                      <h1 style="color: #0d9488; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">KinePro</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 40px 20px 40px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">Seguridad de la cuenta</h2>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                        Hola,
                      </p>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                        Hemos detectado múltiples intentos fallidos de inicio de sesión. Por tu seguridad, <strong>hemos bloqueado temporalmente el acceso a tu cuenta</strong>. Para restaurarlo inmediatamente, haz clic en el siguiente botón:
                      </p>
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="${urlDesbloqueo}" style="display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 10px;">
                              Desbloquear mi cuenta
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding: 0 40px 32px 40px;">
                      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
                        Este enlace de seguridad expirará en <strong>15 minutos</strong>.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
                        Si no fuiste tú quien intentó acceder, puedes ignorar este correo de forma segura. Tu cuenta seguirá protegida.
                        <br><br>
                        &copy; ${new Date().getFullYear()} KinePro. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const urlRestablecer = `${process.env.WEB_ORIGIN}/restablecer?token=${token}`; 

    await this.mailerService.sendMail({
      to: email,
      subject: 'KinePro - Recuperación de contraseña', 
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                  
                  <tr>
                    <td align="center" style="padding: 32px 20px; border-bottom: 1px solid #f1f5f9;">
                      <h1 style="color: #0d9488; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">KinePro</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 40px 20px 40px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">Restablecer tu contraseña</h2>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                        Hola,
                      </p>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                        Hemos recibido una solicitud para cambiar la contraseña de tu cuenta en KinePro. Si fuiste tú, haz clic en el siguiente botón para crear una nueva contraseña de forma segura:
                      </p>
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="${urlRestablecer}" style="display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 10px;">
                              Restablecer contraseña
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
                        Si no solicitaste cambiar tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual no cambiará.
                        <br><br>
                        &copy; ${new Date().getFullYear()} KinePro. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    });
  }

  async sendSolicitudDesbloqueoEmail(email: string, token: string) {
    // Apunta a la página de Next.js que armamos para confirmar el desbloqueo
    const urlDesbloqueo = `${process.env.WEB_ORIGIN}/?token=${token}`; 


    await this.mailerService.sendMail({
      to: email,
      subject: 'KinePro - Solicitud de desbloqueo de cuenta', 
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                  
                  <tr>
                    <td align="center" style="padding: 32px 20px; border-bottom: 1px solid #f1f5f9;">
                      <h1 style="color: #0d9488; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">KinePro</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 40px 20px 40px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">Desbloqueo de cuenta</h2>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                        Hola,
                      </p>
                      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                        Hemos recibido una solicitud para desbloquear tu cuenta en KinePro. Para confirmar esta acción y recuperar tu acceso al sistema, haz clic en el siguiente botón:
                      </p>
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="${urlDesbloqueo}" style="display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 10px;">
                              Confirmar desbloqueo
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding: 0 40px 32px 40px;">
                      <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0;">
                        Este enlace expirará en <strong>15 minutos</strong>.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
                        Si no fuiste tú quien solicitó el desbloqueo, puedes ignorar este correo. Tu cuenta permanecerá segura y bloqueada.
                        <br><br>
                        &copy; ${new Date().getFullYear()} KinePro. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    });
  }

  async sendNotificationEmail(email: string, subject: string, message: string, html?: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: `KinePro - ${subject}`,
      html: html ?? `
        <div style="font-family: Arial, sans-serif; color: #1f2937; padding: 20px;">
          <h2 style="color:#0d9488">KinePro</h2>
          <p>${message}</p>
          <p style="color:#94a3b8; font-size:12px">&copy; ${new Date().getFullYear()} KinePro</p>
        </div>
      `,
    });
  }

}