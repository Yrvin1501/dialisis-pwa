import { useState, useMemo } from "react";
import { updateDoc, doc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { dias, diasTxt, nivel, NIVEL, esBaja, puedeEditar } from "../utils";

const hoy = () => new Date().toISOString().slice(0, 10);
const sumar = (f, m) => { const d = new Date(f + "T12:00:00"); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); };

export default function Proximos({ equipos, rol, user, toast }) {
  const [m, setM] = useState(null), [f, setF] = useState({}), [ed, setEd] = useState(null), [nf, setNf] = useState("");
  const lista = useMemo(() => equipos.filter((e) => !esBaja(e)).sort((a, b) => (dias(a) ?? 9e9) - (dias(b) ?? 9e9)), [equipos]);
  const vencidos = lista.filter((e) => dias(e) !== null && dias(e) < 0).length;
  const semana = lista.filter((e) => dias(e) !== null && dias(e) >= 0 && dias(e) <= 7).length;

  const abrir = (e) => { setM(e); setF({ fecha: hoy(), tipo: "Preventivo", obs: "", nueva: sumar(hoy(), 6) }); };
  const guardar = async () => {
    if (!f.nueva || f.nueva <= f.fecha) return toast("La nueva fecha debe ser posterior al mantenimiento", "error");
    try {
      await updateDoc(doc(db, "equipos", m.id), {
        fechaUltimoMantenimiento: f.fecha, fechaProximoMantenimientoCritico: f.nueva,
        estadoOperativo: "Operativo", condicion: f.tipo,
        historialIntervenciones: arrayUnion({ fecha: f.fecha, tecnico: user.email, observacion: f.obs || "Mantenimiento realizado", tipo: f.tipo }),
        updatedBy: user.email, updatedAt: serverTimestamp(),
      });
      toast("Mantenimiento registrado"); setM(null);
    } catch (e) { toast(e.message, "error"); }
  };

  const guardarFecha = async () => {
    if (!nf) return toast("Elige una fecha", "error");
    try {
      await updateDoc(doc(db, "equipos", ed.id), { fechaProximoMantenimientoCritico: nf, updatedBy: user.email, updatedAt: serverTimestamp() });
      toast("Fecha de vencimiento actualizada"); setEd(null);
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="space-y-3">
      {(vencidos > 0 || semana > 0) && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
          {vencidos > 0 && <p><b>{vencidos}</b> equipo(s) con mantenimiento vencido.</p>}
          {semana > 0 && <p><b>{semana}</b> equipo(s) vencen en los próximos 7 días.</p>}
        </div>)}
      <div className="bg-white rounded-xl shadow divide-y">
        {lista.map((e) => { const [cls, txt] = NIVEL[nivel(dias(e))]; return (
          <div key={e.id} className="p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.marca} {e.modelo}</p>
              <p className="text-xs text-gray-500">{e.numSerie} · {e.hospital} · vence {e.fechaProximoMantenimientoCritico || "—"} ({diasTxt(e)})</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${cls}`}>{txt}</span>
            {puedeEditar(rol) && (
              <div className="flex flex-col gap-1 text-xs">
                <button className="border rounded px-2 py-1" onClick={() => abrir(e)}>Registrar</button>
                <button className="border rounded px-2 py-1" onClick={() => { setEd(e); setNf(e.fechaProximoMantenimientoCritico || sumar(hoy(), 6)); }}>{e.fechaProximoMantenimientoCritico ? "Editar fecha" : "Agregar fecha"}</button>
              </div>)}
          </div>); })}
      </div>

      {ed && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-3 z-40">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-2">
            <h2 className="font-bold">Fecha de vencimiento · {ed.numSerie}</h2>
            <input type="date" className="border rounded p-2 w-full" value={nf} onChange={(e) => setNf(e.target.value)} />
            <div className="flex gap-2 text-xs">{[3, 6, 12].map((n) => <button key={n} className="border rounded px-2 py-1" onClick={() => setNf(sumar(hoy(), n))}>+{n} meses</button>)}</div>
            <div className="flex justify-end gap-2"><button className="border rounded px-3 py-2" onClick={() => setEd(null)}>Cancelar</button><button className="bg-blue-600 text-white rounded px-3 py-2" onClick={guardarFecha}>Guardar</button></div>
          </div></div>)}

      {m && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-3 z-40">
          <div className="bg-white rounded-xl p-4 w-full max-w-md space-y-2">
            <h2 className="font-bold">Mantenimiento realizado · {m.numSerie}</h2>
            <label className="block text-xs text-gray-500">Fecha realizado<input type="date" className="border rounded p-2 w-full text-black" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></label>
            <select className="border rounded p-2 w-full" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}><option>Preventivo</option><option>Correctivo</option></select>
            <textarea className="border rounded p-2 w-full" placeholder="Observación" value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
            <label className="block text-xs text-gray-500">Nueva fecha de vencimiento<input type="date" className="border rounded p-2 w-full text-black" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} /></label>
            <div className="flex gap-2 text-xs">{[3, 6, 12].map((n) => <button key={n} className="border rounded px-2 py-1" onClick={() => setF({ ...f, nueva: sumar(f.fecha, n) })}>+{n} meses</button>)}</div>
            <div className="flex justify-end gap-2"><button className="border rounded px-3 py-2" onClick={() => setM(null)}>Cancelar</button><button className="bg-blue-600 text-white rounded px-3 py-2" onClick={guardar}>Guardar</button></div>
          </div></div>)}
    </div>
  );
}
