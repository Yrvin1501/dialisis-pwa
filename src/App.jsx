import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { onSnapshot, collection, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import EquiposTable from "./components/EquiposTable";
import BulkUpload from "./components/BulkUpload";
import Condicion from "./components/Condicion";
import Proximos from "./components/Proximos";
import Usuarios from "./components/Usuarios";
import Solicitudes from "./components/Solicitudes";
import { dias, esBaja } from "./utils";

export default function App() {
  const [user, setUser] = useState(undefined), [rol, setRol] = useState(null);
  const [hospital, setHospital] = useState("");
  const [equipos, setEquipos] = useState([]), [tab, setTab] = useState("dash"), [toasts, setToasts] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);

  const toast = useCallback((msg, tipo = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tipo }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (!u) return setRol(null);
    const ref = doc(db, "users", u.uid);
    try {
      const s = await getDoc(ref);
      if (s.exists()) setRol(s.data().role);
      else { await setDoc(ref, { email: u.email, name: u.displayName || "", role: "lector", createdAt: serverTimestamp() }); setRol("lector"); }
    } catch { setRol("lector"); }
  }), []);

  useEffect(() => {   // listener en tiempo real
    if (!user) return;
    return onSnapshot(collection(db, "equipos"), (s) => setEquipos(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => toast(e.message, "error"));
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "solicitudes"), (s) => setSolicitudes(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => toast(e.message, "error"));
  }, [user, toast]);

  const Toasts = () => <div className="fixed bottom-4 right-4 space-y-2 z-50">{toasts.map((t) => <div key={t.id} className={`px-4 py-2 rounded shadow text-white ${t.tipo === "error" ? "bg-red-600" : "bg-green-600"}`}>{t.msg}</div>)}</div>;

  if (user === undefined) return <p className="p-6">Cargando…</p>;
  if (!user) return <><Auth toast={toast} /><Toasts /></>;

  const hospitales = [...new Set(equipos.map((e) => e.hospital).filter(Boolean))].sort();
  const visibles = hospital ? equipos.filter((e) => e.hospital === hospital) : equipos;
  const alertas = visibles.filter((e) => !esBaja(e) && dias(e) !== null && dias(e) <= 15).length;
  const solPend = solicitudes.filter((s) => s.estado !== "Resuelta" && (!hospital || s.hospital === hospital)).length;
  const tabs = [["dash", "Dashboard"], ["equipos", "Equipos"], ["cond", "Condición"], ["prox", `Próximo mant.${alertas ? ` (${alertas})` : ""}`], ["sol", `Solicitudes${solPend ? ` (${solPend})` : ""}`], ...(rol === "admin" ? [["bulk", "Carga masiva"], ["users", "Usuarios"]] : [])];
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow p-3 flex flex-wrap gap-2 items-center justify-between">
        <nav className="flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1 rounded ${tab === k ? "bg-blue-600 text-white" : "border"}`}>{l}</button>)}</nav>
        <select className="border rounded p-1 text-sm" value={hospital} onChange={(e) => setHospital(e.target.value)}>
          <option value="">Todos los hospitales</option>{hospitales.map((h) => <option key={h}>{h}</option>)}
        </select>
        <span className="text-xs">{user.email} · <b>{rol}</b> · <button className="text-blue-600" onClick={() => signOut(auth)}>Salir</button></span>
      </header>
      <main className="p-3 max-w-6xl mx-auto">
        {tab === "dash" && <Dashboard equipos={visibles} solicitudes={solicitudes.filter((s) => !hospital || s.hospital === hospital)} />}
        {tab === "equipos" && <EquiposTable equipos={visibles} todos={equipos} hospitales={hospitales} rol={rol} user={user} toast={toast} />}
        {tab === "cond" && <Condicion equipos={visibles} rol={rol} user={user} toast={toast} />}
        {tab === "prox" && <Proximos equipos={visibles} rol={rol} user={user} toast={toast} />}
        {tab === "sol" && <Solicitudes equipos={visibles} todos={equipos} solicitudes={solicitudes.filter((s) => !hospital || s.hospital === hospital)} rol={rol} user={user} toast={toast} />}
        {tab === "users" && rol === "admin" && <Usuarios user={user} toast={toast} />}
        {tab === "bulk" && rol === "admin" && <BulkUpload equipos={equipos} user={user} toast={toast} />}
      </main>
      <Toasts />
    </div>
  );
}
