import { useState, useMemo } from "react";
import { addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp, arrayUnion } from "firebase/firestore";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Search, Plus, Pencil, Trash2, FileDown } from "lucide-react";
import { db } from "../firebase";
import { ESTADOS, CRITICIDAD, CAMPOS, semaforo, COLOR, puedeEditar, CONDICIONES, diasTxt } from "../utils";

const vacio = Object.fromEntries(CAMPOS.map((c) => [c, ""]));

export default function EquiposTable({ equipos, todos, hospitales, rol, user, toast }) {
  const [q, setQ] = useState(""), [fe, setFe] = useState(""), [fc, setFc] = useState(""), [fs, setFs] = useState("");
  const [form, setForm] = useState(null), [nota, setNota] = useState(""), [del, setDel] = useState(null);

  const lista = useMemo(() => equipos.filter((e) =>
    [e.numSerie, e.marca, e.modelo, e.hospital, e.ubicacion].join(" ").toLowerCase().includes(q.toLowerCase()) &&
    (!fe || e.estadoOperativo === fe) && (!fc || e.criticidad === fc) && (!fs || semaforo(e) === fs)), [equipos, q, fe, fc, fs]);

  const guardar = async () => {
    try {
      const { id, historialIntervenciones, updatedAt, updatedBy, ...datos } = form;
      if (datos.condicion === "Baja") datos.estadoOperativo = "De Baja";
      if (todos.some((e) => e.numSerie === datos.numSerie && e.id !== id)) return toast("S/N duplicado", "error");
      const stamp = { ...datos, updatedBy: user.email, updatedAt: serverTimestamp() };
      if (nota) stamp.historialIntervenciones = arrayUnion({ fecha: new Date().toISOString(), tecnico: user.email, observacion: nota, tipo: "Mantenimiento" });
      if (id) await updateDoc(doc(db, "equipos", id), stamp);
      else await addDoc(collection(db, "equipos"), { ...stamp, historialIntervenciones: nota ? [stamp.historialIntervenciones] : [] });
      toast("Equipo guardado"); setForm(null); setNota("");
    } catch (e) { toast(e.message, "error"); }
  };
  const borrar = async () => { try { await deleteDoc(doc(db, "equipos", del.id)); toast("Equipo eliminado"); } catch (e) { toast(e.message, "error"); } setDel(null); };

  const filas = () => lista.map((e) => CAMPOS.map((c) => e[c] ?? ""));
  const csv = () => { const b = new Blob([Papa.unparse({ fields: CAMPOS, data: filas() })], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "inventario.csv"; a.click(); };
  const pdf = () => { const d = new jsPDF({ orientation: "landscape" }); autoTable(d, { head: [CAMPOS], body: filas(), styles: { fontSize: 6 } }); d.save("inventario.pdf"); };

  const Sel = ({ v, set, ph, opts }) => (
    <select className="border rounded p-2 text-sm" value={v} onChange={(e) => set(e.target.value)}>
      <option value="">{ph}</option>{opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
    </select>);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center border rounded bg-white px-2 flex-1 min-w-[180px]"><Search size={16} />
          <input className="p-2 outline-none w-full" placeholder="S/N, marca, modelo, hospital, ubicación" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Sel v={fe} set={setFe} ph="Estado" opts={ESTADOS} />
        <Sel v={fc} set={setFc} ph="Criticidad" opts={CRITICIDAD} />
        <Sel v={fs} set={setFs} ph="Semáforo" opts={[["vencido", "Vencido"], ["proximo", "Próximo"], ["aldia", "Al día"]]} />
        <button className="border rounded p-2 bg-white" onClick={csv}><FileDown size={16} /> CSV</button>
        <button className="border rounded p-2 bg-white" onClick={pdf}><FileDown size={16} /> PDF</button>
        {puedeEditar(rol) && <button className="bg-blue-600 text-white rounded p-2" onClick={() => setForm(vacio)}><Plus size={16} /></button>}
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left"><tr>{["", "Tipo", "Marca / Modelo", "S/N", "Hospital · ubicación", "Estado", "Condición", "Crit.", "Próx. mant.", "Últ. cambio", ""].map((h, i) => <th key={i} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{lista.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-2"><span className={`inline-block w-3 h-3 rounded-full ${COLOR[semaforo(e)]}`} /></td>
              <td className="p-2">{e.tipoEquipo}</td><td className="p-2">{e.marca} {e.modelo}</td><td className="p-2">{e.numSerie}</td>
              <td className="p-2">{e.hospital} · {e.ubicacion}</td><td className="p-2">{e.estadoOperativo}</td><td className="p-2">{e.condicion}</td><td className="p-2">{e.criticidad}</td>
              <td className="p-2">{e.fechaProximoMantenimientoCritico} <span className="text-xs text-gray-500">({diasTxt(e)})</span></td><td className="p-2 text-xs text-gray-500">{e.updatedBy}</td>
              <td className="p-2 whitespace-nowrap">
                {puedeEditar(rol) && <button onClick={() => setForm(e)}><Pencil size={16} /></button>}
                {rol === "admin" && <button className="ml-2 text-red-600" onClick={() => setDel(e)}><Trash2 size={16} /></button>}
              </td></tr>))}</tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-3 z-40">
          <div className="bg-white rounded-xl p-4 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-2">
            <h2 className="font-bold">{form.id ? "Editar" : "Nuevo"} equipo</h2>
            {CAMPOS.map((c) => c === "estadoOperativo" || c === "criticidad" || c === "condicion"
              ? <select key={c} className="border rounded p-2 w-full" value={form[c]} onChange={(e) => setForm({ ...form, [c]: e.target.value })}><option value="">{c}</option>{(c === "criticidad" ? CRITICIDAD : c === "condicion" ? CONDICIONES : ESTADOS).map((o) => <option key={o}>{o}</option>)}</select>
              : <label key={c} className="block text-xs text-gray-500">{c}<input list={c === "hospital" ? "hosp" : undefined} className="border rounded p-2 w-full text-black text-sm" type={c.startsWith("fecha") ? "date" : "text"} value={form[c]} onChange={(e) => setForm({ ...form, [c]: e.target.value })} /></label>)}
            <datalist id="hosp">{hospitales.map((h) => <option key={h} value={h} />)}</datalist>
            <textarea className="border rounded p-2 w-full" placeholder="Nueva intervención / nota técnica (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
            {form.historialIntervenciones?.map((h, i) => <p key={i} className="text-xs text-gray-600">{h.fecha.slice(0, 10)} · {h.tecnico}: {h.observacion}</p>)}
            <div className="flex justify-end gap-2"><button className="border rounded px-3 py-2" onClick={() => setForm(null)}>Cancelar</button><button className="bg-blue-600 text-white rounded px-3 py-2" onClick={guardar}>Guardar</button></div>
          </div></div>)}

      {del && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-40"><div className="bg-white rounded-xl p-4 space-y-3">
          <p>¿Eliminar el equipo S/N <b>{del.numSerie}</b>? No se puede deshacer.</p>
          <div className="flex justify-end gap-2"><button className="border rounded px-3 py-2" onClick={() => setDel(null)}>Cancelar</button><button className="bg-red-600 text-white rounded px-3 py-2" onClick={borrar}>Eliminar</button></div>
        </div></div>)}
    </div>
  );
}
