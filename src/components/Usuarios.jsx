import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const ROLES = [["admin", "Admin"], ["tecnico", "Técnico"], ["lector", "Auditor / Lector"]];

export default function Usuarios({ user, toast }) {
  const [us, setUs] = useState([]);
  useEffect(() => onSnapshot(collection(db, "users"), (s) => setUs(s.docs.map((d) => ({ id: d.id, ...d.data() })))), []);
  const cambiar = async (u, role) => {
    if (u.id === user.uid && role !== "admin" && !window.confirm("Vas a quitarte el rol de admin. ¿Continuar?")) return;
    try { await updateDoc(doc(db, "users", u.id), { role }); toast(`${u.email}: ${role}`); } catch (e) { toast(e.message, "error"); }
  };
  return (
    <div className="bg-white rounded-xl shadow divide-y">
      {us.map((u) => (
        <div key={u.id} className="p-3 flex items-center gap-3 text-sm">
          <div className="flex-1 min-w-0"><p className="font-medium truncate">{u.name || u.email}</p><p className="text-xs text-gray-500">{u.email}</p></div>
          <select className="border rounded p-2" value={u.role} onChange={(e) => cambiar(u, e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>))}
    </div>
  );
}
