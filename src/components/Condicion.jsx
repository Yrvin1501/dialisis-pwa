import { useState } from "react";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { CONDICIONES, puedeEditar } from "../utils";

export default function Condicion({ equipos, rol, user, toast }) {
  const [f, setF] = useState("");
  const lista = equipos.filter((e) => !f || (e.condicion || "") === f);

  const cambiar = async (e, condicion) => {
    if (condicion === "Baja" && !window.confirm(`¿Dar de baja el equipo ${e.numSerie}?`)) return;
    try {
      await updateDoc(doc(db, "equipos", e.id), {
        condicion, ...(condicion === "Baja" && { estadoOperativo: "De Baja" }),
        updatedBy: user.email, updatedAt: serverTimestamp(),
      });
      toast(`${e.numSerie}: ${condicion}`);
    } catch (err) { toast(err.message, "error"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["", ...CONDICIONES].map((c) => (
          <button key={c} onClick={() => setF(c)} className={`px-3 py-1 rounded text-sm ${f === c ? "bg-blue-600 text-white" : "bg-white border"}`}>
            {c || "Todos"} ({equipos.filter((e) => !c || e.condicion === c).length})
          </button>))}
      </div>
      <div className="bg-white rounded-xl shadow divide-y">
        {lista.map((e) => (
          <div key={e.id} className="p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.marca} {e.modelo}</p>
              <p className="text-xs text-gray-500">{e.numSerie} · {e.hospital} · {e.ubicacion}</p>
            </div>
            <select disabled={!puedeEditar(rol)} className="border rounded p-2" value={e.condicion || ""} onChange={(ev) => cambiar(e, ev.target.value)}>
              <option value="" disabled>Sin definir</option>
              {CONDICIONES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>))}
      </div>
    </div>
  );
}
