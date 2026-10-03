import { useState } from "react";
import { addDoc, updateDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { puedeEditar, ESTADOS_SOLICITUD } from "../utils";

const fmt = (ts) => {
  if (!ts) return "justo ahora";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const BADGE = {
  Pendiente: "bg-red-100 text-red-700",
  "En proceso": "bg-yellow-100 text-yellow-800",
  Resuelta: "bg-green-100 text-green-700",
};

export default function Solicitudes({ equipos, solicitudes, rol, user, toast }) {
  const [equipoId, setEquipoId] = useState(""), [problema, setProblema] = useState("");
  const [filtro, setFiltro] = useState("activas"), [atender, setAtender] = useState(null), [nota, setNota] = useState("");

  const crear = async () => {
    if (!problema.trim()) return toast("Escribe el mensaje", "error");
    const eq = equipos.find((e) => e.id === equipoId) || null;
    try {
      await addDoc(collection(db, "solicitudes"), {
        equipoId: eq?.id || null, numSerie: eq?.numSerie || "", marca: eq?.marca || "", modelo: eq?.modelo || "",
        hospital: eq?.hospital || "", ubicacion: eq?.ubicacion || "",
        problema: problema.trim(), estado: "Pendiente",
        solicitadoPor: user.email, solicitadoEn: serverTimestamp(),
      });
      toast("Solicitud enviada"); setEquipoId(""); setProblema("");
    } catch (e) { toast(e.message, "error"); }
  };

  const avanzar = async (s, nuevoEstado) => {
    try {
      await updateDoc(doc(db, "solicitudes", s.id), {
        estado: nuevoEstado, atendidoPor: user.email, atendidoEn: serverTimestamp(),
        ...(nota.trim() && { nota: nota.trim() }),
      });
      toast(`Solicitud: ${nuevoEstado}`); setAtender(null); setNota("");
    } catch (e) { toast(e.message, "error"); }
  };

  const lista = solicitudes
    .filter((s) => filtro === "todas" || (filtro === "activas" ? s.estado !== "Resuelta" : s.estado === filtro))
    .sort((a, b) => (b.solicitadoEn?.toMillis?.() || 0) - (a.solicitadoEn?.toMillis?.() || 0));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <p className="font-semibold">Solicitar atención de un equipo</p>
        <p className="text-xs text-gray-500">Escribe tu mensaje y envíalo — no hace falta buscar el equipo por serial o inventario. Si quieres vincularlo a uno en particular, puedes elegirlo abajo (opcional).</p>
        <textarea className="border rounded p-2 w-full" placeholder="Ej: El monitor de la sala 2 del Hospital Central hace un ruido fuerte y hay que revisarlo…" value={problema} onChange={(e) => setProblema(e.target.value)} />
        <select className="border rounded p-2 w-full text-sm text-gray-600" value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
          <option value="">Vincular a un equipo del inventario (opcional)</option>
          {equipos.map((e) => <option key={e.id} value={e.id}>{e.marca} {e.modelo} · {e.numSerie} · {e.hospital || "Sin hospital"} {e.ubicacion ? `(${e.ubicacion})` : ""}</option>)}
        </select>
        <button className="bg-blue-600 text-white rounded px-3 py-2" onClick={crear}>Enviar solicitud</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["activas", "Activas"], ["Pendiente", "Pendientes"], ["En proceso", "En proceso"], ["Resuelta", "Resueltas"], ["todas", "Todas"]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1 rounded text-sm ${filtro === v ? "bg-blue-600 text-white" : "bg-white border"}`}>{l}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow divide-y">
        {lista.length === 0 && <p className="p-4 text-sm text-gray-500">No hay solicitudes en este filtro.</p>}
        {lista.map((s) => (
          <div key={s.id} className="p-3 text-sm space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {s.equipoId ? (
                  <>
                    <p className="font-medium truncate">{s.marca} {s.modelo} · {s.numSerie}</p>
                    <p className="text-xs text-gray-500">{s.hospital}{s.ubicacion ? ` · ${s.ubicacion}` : ""}</p>
                  </>
                ) : <p className="font-medium text-gray-500">Sin equipo vinculado</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${BADGE[s.estado] || "bg-gray-100"}`}>{s.estado}</span>
            </div>
            <p>{s.problema}</p>
            <p className="text-xs text-gray-500">Solicitado por {s.solicitadoPor} · {fmt(s.solicitadoEn)}</p>
            {s.nota && <p className="text-xs text-gray-600">Nota: {s.nota}</p>}
            {s.atendidoPor && s.estado !== "Pendiente" && <p className="text-xs text-gray-500">Actualizado por {s.atendidoPor} · {fmt(s.atendidoEn)}</p>}
            {puedeEditar(rol) && s.estado !== "Resuelta" && (
              atender === s.id ? (
                <div className="flex flex-col gap-1 pt-1">
                  <input className="border rounded p-1 text-xs" placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
                  <div className="flex gap-2">
                    {s.estado === "Pendiente" && <button className="border rounded px-2 py-1 text-xs" onClick={() => avanzar(s, "En proceso")}>Marcar en proceso</button>}
                    <button className="bg-green-600 text-white rounded px-2 py-1 text-xs" onClick={() => avanzar(s, "Resuelta")}>Marcar resuelta</button>
                    <button className="border rounded px-2 py-1 text-xs" onClick={() => { setAtender(null); setNota(""); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button className="border rounded px-2 py-1 text-xs mt-1" onClick={() => setAtender(s.id)}>Actualizar estado</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
