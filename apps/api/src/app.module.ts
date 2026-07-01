import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ActividadesModule } from './actividades/actividades.module';
import { TurnosModule } from './turnos/turnos.module';
import { ReservaModule } from './reservas/reserva.module'
import { PagosModule } from './pagos/pagos.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PrismaModule,
    UsuariosModule,
    AuthModule,
    ActividadesModule,
    TurnosModule,
    ReservaModule,
    PagosModule,
    MailModule,
    EstadisticasModule,
    ConfiguracionModule
    
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    MailService,
  ],
})
export class AppModule {}