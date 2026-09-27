export const ESTADOS = ["Operativo", "En Mantenimiento", "Fuera de Servicio", "De Baja"];
export const CRITICIDAD = ["Crítica", "Alta", "Media", "Baja"];
export const CAMPOS = ["tipoEquipo","marca","modelo","numSerie","hospital","ubicacion","estadoOperativo","condicion","fechaUltimoMantenimiento","fechaProximoMantenimientoCritico","criticidad"];
export const OBLIGATORIOS = ["tipoEquipo","marca","modelo","numSerie","hospital","ubicacion","estadoOperativo","criticidad"];

// vencido | proximo (<=30 días) | aldia | sinfecha
export const semaforo = (e) => {
  if (!e.fechaProximoMantenimientoCritico || esBaja(e)) return "sinfecha";
  const d = (new Date(e.fechaProximoMantenimientoCritico) - Date.now()) / 864e5;
  return d < 0 ? "vencido" : d <= 30 ? "proximo" : "aldia";
};
export const COLOR = { vencido: "bg-red-500", proximo: "bg-yellow-400", aldia: "bg-green-500", sinfecha: "bg-gray-300" };
export const puedeEditar = (r) => r === "admin" || r === "tecnico";

export const CONDICIONES = ["Preventivo", "Correctivo", "Baja"];
export const esBaja = (e) => e.condicion === "Baja" || e.estadoOperativo === "De Baja";
export const dias = (e) => e.fechaProximoMantenimientoCritico
  ? Math.ceil((new Date(e.fechaProximoMantenimientoCritico + "T23:59:59") - Date.now()) / 864e5) : null;
export const diasTxt = (e) => { const d = dias(e); return d === null ? "sin fecha" : d < 0 ? `vencido hace ${-d} d` : d === 0 ? "vence hoy" : `en ${d} d`; };
export const nivel = (d) => d === null ? "sinfecha" : d < 0 ? "vencido" : d <= 7 ? "urgente" : d <= 15 ? "proximo" : d <= 30 ? "atencion" : "aldia";
export const NIVEL = {
  vencido: ["bg-red-600 text-white", "Vencido"], urgente: ["bg-red-100 text-red-700", "Esta semana"],
  proximo: ["bg-orange-100 text-orange-700", "≤ 15 días"], atencion: ["bg-yellow-100 text-yellow-800", "≤ 30 días"],
  aldia: ["bg-green-100 text-green-700", "Al día"], sinfecha: ["bg-gray-100 text-gray-600", "Sin fecha"],
};
