import type { Permission } from "./rbac";

export type PermissionGroupId =
  | "clientes"
  | "ventas"
  | "cotizaciones"
  | "busqueda"
  | "capacidad"
  | "entregas"
  | "equipo"
  | "negocio"
  | "administracion";

export interface PermissionGroupMeta {
  id: PermissionGroupId;
  label: string;
}

export const PERMISSION_GROUPS = [
  { id: "clientes", label: "Clientes" },
  { id: "ventas", label: "Ventas" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "busqueda", label: "Búsqueda" },
  { id: "capacidad", label: "Capacidad" },
  { id: "entregas", label: "Entregas e inventario" },
  { id: "equipo", label: "Equipo y personal" },
  { id: "negocio", label: "Negocio" },
  { id: "administracion", label: "Administración" },
] as const satisfies ReadonlyArray<PermissionGroupMeta>;

interface PermissionMeta {
  label: string;
  description: string;
  group: PermissionGroupId;
}

// Record over Permission so a new permission fails to compile until it is
// described here. Authored in group order for sensible row ordering.
const PERMISSION_CATALOG: Record<Permission, PermissionMeta> = {
  "lead:register": {
    label: "Registrar clientes",
    description: "Crear nuevos clientes en el sistema.",
    group: "clientes",
  },
  "lead:note:add": {
    label: "Añadir notas",
    description: "Comentar en la ficha del cliente.",
    group: "clientes",
  },
  "lead:rate:simulate": {
    label: "Simular tasas",
    description: "Usar el simulador de tasas para un cliente.",
    group: "clientes",
  },
  "lead:work": {
    label: "Trabajar clientes",
    description: "Atender y actualizar los clientes asignados.",
    group: "clientes",
  },
  "lead:workflow": {
    label: "Avanzar el flujo",
    description: "Mover al cliente entre las etapas comerciales.",
    group: "clientes",
  },
  "lead:commercial-input:complete": {
    label: "Completar datos comerciales",
    description: "Registrar el alcance comercial del cliente.",
    group: "clientes",
  },
  "lead:view:all": {
    label: "Ver todos los clientes",
    description: "Acceder a los clientes de todo el equipo.",
    group: "clientes",
  },
  "lead:review": {
    label: "Revisar clientes",
    description: "Revisar la información registrada del cliente.",
    group: "clientes",
  },
  "lead:reassign": {
    label: "Reasignar clientes",
    description: "Cambiar el ejecutivo asignado a un cliente.",
    group: "clientes",
  },
  "lead:delete": {
    label: "Eliminar clientes",
    description: "Eliminar clientes del sistema.",
    group: "clientes",
  },
  "sales:create": {
    label: "Crear venta",
    description: "Iniciar una venta para un cliente.",
    group: "ventas",
  },
  "sales:submit": {
    label: "Enviar venta",
    description: "Someter la venta a revisión.",
    group: "ventas",
  },
  "sales:review": {
    label: "Revisar ventas",
    description: "Revisar las ventas enviadas por el equipo.",
    group: "ventas",
  },
  "sales:approve": {
    label: "Aprobar ventas",
    description: "Aprobar o rechazar las ventas en revisión.",
    group: "ventas",
  },
  "lead:sale:create": {
    label: "Registrar venta del cliente",
    description: "Registrar la venta cerrada con el cliente.",
    group: "ventas",
  },
  "lead:sale:upload-proof": {
    label: "Subir comprobante",
    description: "Adjuntar el comprobante de pago de la venta.",
    group: "ventas",
  },
  "quotation:create": {
    label: "Crear cotizaciones",
    description: "Generar cotizaciones para los clientes.",
    group: "cotizaciones",
  },
  "quotation:revise": {
    label: "Revisar cotizaciones",
    description: "Ajustar y corregir cotizaciones.",
    group: "cotizaciones",
  },
  "quotation:view:all": {
    label: "Ver todas las cotizaciones",
    description: "Acceder a las cotizaciones de todo el equipo.",
    group: "cotizaciones",
  },
  "quotation:policy:manage": {
    label: "Gestionar políticas de cotización",
    description: "Definir las reglas de cotización.",
    group: "cotizaciones",
  },
  "search:use": {
    label: "Usar el buscador",
    description:
      "Consultar información de clientes en fuentes externas (SUNAT).",
    group: "busqueda",
  },
  "capacity:read:self": {
    label: "Ver mi capacidad",
    description: "Consultar tu propio uso y límites.",
    group: "capacidad",
  },
  "capacity:request:self": {
    label: "Solicitar capacidad",
    description: "Pedir ampliaciones de tu propia capacidad.",
    group: "capacidad",
  },
  "capacity:read:team": {
    label: "Ver capacidad del equipo",
    description: "Consultar el uso de cada ejecutivo.",
    group: "capacidad",
  },
  "capacity:manage": {
    label: "Gestionar capacidad",
    description: "Ajustar límites y asignaciones del equipo.",
    group: "capacidad",
  },
  "capacity:approve": {
    label: "Aprobar solicitudes",
    description: "Aprobar o rechazar solicitudes de capacidad.",
    group: "capacidad",
  },
  "capacity:policy:manage": {
    label: "Gestionar políticas de capacidad",
    description: "Definir las políticas de capacidad.",
    group: "capacidad",
  },
  "capacity:audit:read": {
    label: "Ver auditoría de capacidad",
    description: "Revisar el historial de cambios de capacidad.",
    group: "capacidad",
  },
  "fulfillment:manage": {
    label: "Gestionar entregas",
    description: "Administrar las entregas de equipos.",
    group: "entregas",
  },
  "fulfillment:client-step": {
    label: "Pasos de entrega del cliente",
    description: "Completar los pasos de entrega de tus propios clientes.",
    group: "entregas",
  },
  "inventory:read": {
    label: "Ver inventario",
    description: "Consultar el stock disponible.",
    group: "entregas",
  },
  "inventory:manage": {
    label: "Gestionar inventario",
    description: "Administrar el stock y los movimientos.",
    group: "entregas",
  },
  "team:read": {
    label: "Ver miembros",
    description: "Consultar los miembros del equipo.",
    group: "equipo",
  },
  "team:manage": {
    label: "Gestionar miembros",
    description: "Administrar los miembros y sus roles.",
    group: "equipo",
  },
  "hr:read": {
    label: "Ver personal",
    description: "Consultar la información del personal.",
    group: "equipo",
  },
  "hr:manage": {
    label: "Gestionar personal",
    description: "Administrar altas, invitaciones y datos del personal.",
    group: "equipo",
  },
  "dashboards:read": {
    label: "Ver paneles de negocio",
    description: "Consultar los paneles de GPV y estadísticas de negocio.",
    group: "negocio",
  },
  "dashboards:read:own": {
    label: "Ver GPV de sus clientes",
    description:
      "Consultar el GPV de los comercios que tiene asignados, desde su ficha.",
    group: "negocio",
  },
  "dashboards:manage": {
    label: "Gestionar paneles de negocio",
    description:
      "Importar reportes de dealers y resolver la atribución por comercio.",
    group: "negocio",
  },
  "commission:read": {
    label: "Ver comisiones",
    description: "Consultar el panel de cajas y penalidades por mesa.",
    group: "negocio",
  },
  "commission:manage": {
    label: "Gestionar esquema de comisiones",
    description: "Definir los umbrales, rangos y porcentajes de comisión.",
    group: "negocio",
  },
  "admin:read": {
    label: "Ver administración",
    description: "Acceder a las secciones administrativas.",
    group: "administracion",
  },
  "admin:manage": {
    label: "Gestionar administración",
    description: "Administrar la configuración del sistema.",
    group: "administracion",
  },
  "audit:read": {
    label: "Ver auditoría",
    description: "Revisar el registro de eventos del sistema.",
    group: "administracion",
  },
  "integration:manage": {
    label: "Gestionar integraciones",
    description: "Configurar integraciones externas.",
    group: "administracion",
  },
};

export interface PermissionRow {
  key: Permission;
  label: string;
  description: string;
  granted: boolean;
}

export interface PermissionSection {
  group: PermissionGroupMeta;
  permissions: PermissionRow[];
}

// Object.entries widens keys to string; cast back to Permission.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const CATALOG_ENTRIES = Object.entries(PERMISSION_CATALOG) as Array<
  [Permission, PermissionMeta]
>;

export function groupPermissions(
  granted: readonly Permission[],
): PermissionSection[] {
  const grantedSet = new Set(granted);
  return PERMISSION_GROUPS.map((group) => ({
    group,
    permissions: CATALOG_ENTRIES.filter(
      ([, meta]) => meta.group === group.id,
    ).map(([key, meta]) => ({
      key,
      label: meta.label,
      description: meta.description,
      granted: grantedSet.has(key),
    })),
  })).filter((section) => section.permissions.length > 0);
}
