import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Buscar los roles requeridos en el @Roles() del endpoint o de la clase
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Si el endpoint no tiene @Roles(), no controla rol (lo deja pasar)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Obtener el user que el JwtAuthGuard puso en el request
    const { user } = context.switchToHttp().getRequest();

    // 4. Si no hay user o no tiene rol, no pasa
    if (!user || !user.rol) {
      return false;
    }

    // 5. Verificar que el rol del usuario esté en la lista permitida
    return requiredRoles.includes(user.rol);
  }
}