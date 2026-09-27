import { semaforo, COLOR, dias, esBaja, CONDICIONES } from "../utils";

const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const Card = ({ label, value, color = "bg-white" }) => (
  <div className={`${color} rounded-xl shadow p-4`}><p className="text-xs text-gray-600">{label}</p><p className="text-2xl font-bold">{value}</p></div>
);

export default function Dashboard({ equipos }) {
  const n = (f) => equipos.filter(f).length;
  const sem = (s) => n((e) => semaforo(e) === s);
  const urgentes = n((e) => ["Crítica", "Alta"].includes(e.criticidad) && ["vencido", "proximo"].includes(semaforo(e)));
  const disp = equipos.length ? Math.round((n((e) => e.estadoOperativo === "Operativo") / equipos.length) * 100) : 0;
  const porMarca = Object.entries(equipos.reduce((a, e) => ({ ...a, [e.marca]: (a[e.marca] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const max = porMarca[0]?.[1] || 1;
  const hoy = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1); return { label: MES[d.getMonth()], y: d.getFullYear(), m: d.getMonth(), n: 0 }; });
  let venc = 0;
  equipos.filter((e) => !esBaja(e) && e.fechaProximoMantenimientoCritico).forEach((e) => {
    if (dias(e) < 0) return venc++;
    const d = new Date(e.fechaProximoMantenimientoCritico + "T12:00:00");
    const m = meses.find((x) => x.y === d.getFullYear() && x.m === d.getMonth()); if (m) m.n++;
  });
  const barras = [{ label: "Venc.", n: venc, rojo: true }, ...meses];
  const mx = Math.max(1, ...barras.map((b) => b.n));
  const hosp = Object.entries(equipos.reduce((a, e) => { const h = e.hospital || "Sin hospital"; (a[h] ||= []).push(e); return a; }, {}));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total equipos" value={equipos.length} />
        <Card label="Operativos" value={n((e) => e.estadoOperativo === "Operativo")} />
        <Card label="En mantenimiento" value={n((e) => e.estadoOperativo === "En Mantenimiento")} />
        <Card label="Fuera de servicio" value={n((e) => e.estadoOperativo === "Fuera de Servicio")} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Vencidos" value={sem("vencido")} color="bg-red-100" />
        <Card label="Próximos (≤30 días)" value={sem("proximo")} color="bg-yellow-100" />
        <Card label="Al día" value={sem("aldia")} color="bg-green-100" />
        <Card label="Crítico/Alto que requieren atención" value={urgentes} color="bg-orange-100" />
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <p className="font-semibold mb-2">Disponibilidad del parque: {disp}%</p>
        <div className="h-3 bg-gray-200 rounded"><div className="h-3 bg-green-500 rounded" style={{ width: `${disp}%` }} /></div>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <p className="font-semibold mb-2">Condición</p>
        <div className="flex gap-2 flex-wrap text-sm">
          {CONDICIONES.map((c) => <span key={c} className="px-2 py-1 rounded bg-slate-100">{c}: <b>{n((e) => e.condicion === c)}</b></span>)}
        </div>
      </div>
      {hosp.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4 space-y-2">
          <p className="font-semibold">Por hospital</p>
          {hosp.map(([h, l]) => (
            <div key={h} className="flex justify-between text-sm border-t pt-1">
              <span>{h}</span>
              <span>{l.length} equipos · {l.filter((e) => semaforo(e) === "vencido").length} vencidos · {l.filter((e) => e.estadoOperativo === "Operativo").length} operativos</span>
            </div>))}
        </div>)}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="font-semibold mb-2">Vencimientos por mes</p>
        <div className="flex items-end gap-2 h-28">
          {barras.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center justify-end text-xs gap-1">
              <span>{b.n}</span>
              <div className={`w-full rounded ${b.rojo ? "bg-red-500" : "bg-blue-500"}`} style={{ height: `${(b.n / mx) * 70}px`, minHeight: b.n ? 4 : 1 }} />
              <span>{b.label}</span>
            </div>))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <p className="font-semibold">Distribución por marca</p>
        {porMarca.map(([m, c]) => (
          <div key={m} className="flex items-center gap-2 text-sm">
            <span className="w-28 truncate">{m}</span>
            <div className={`h-4 rounded ${COLOR.aldia}`} style={{ width: `${(c / max) * 60}%` }} /><span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
