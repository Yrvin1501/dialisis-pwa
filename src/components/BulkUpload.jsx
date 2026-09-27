import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { CAMPOS, OBLIGATORIOS } from "../utils";

const FECHAS = ["fechaUltimoMantenimiento", "fechaProximoMantenimientoCritico"];
const aIso = (v) => { v = String(v ?? "").trim(); if (!v) return ""; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); };

export default function BulkUpload({ equipos, user, toast }) {
  const [filas, setFilas] = useState([]), [errores, setErrores] = useState([]);

  const plantilla = () => {
    const ej = ["Monitor de Hemodiálisis", "Fresenius", "4008S", "SN-0001", "Hospital Central", "Sala 1 - Puesto 3", "Operativo", "Preventivo", "2026-01-15", "2026-10-15", "Crítica"];
    const b = new Blob([Papa.unparse({ fields: CAMPOS, data: [ej] })], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "plantilla_equipos.csv"; a.click();
  };

  const validar = (data) => {
    const vistos = new Set(equipos.map((e) => e.numSerie)), errs = [], ok = [];
    data.forEach((r, i) => {
      const mal = FECHAS.filter((c) => { const x = aIso(r[c]); if (x === null) return true; r[c] = x; return false; });
      if (mal.length) return errs.push(`Fila ${i + 2}: fecha inválida (${mal.join(", ")}); usa AAAA-MM-DD`);
      const faltan = OBLIGATORIOS.filter((c) => !String(r[c] ?? "").trim());
      if (faltan.length) errs.push(`Fila ${i + 2}: faltan ${faltan.join(", ")}`);
      else if (vistos.has(String(r.numSerie))) errs.push(`Fila ${i + 2}: S/N duplicado (${r.numSerie})`);
      else { vistos.add(String(r.numSerie)); ok.push(r); }
    });
    setErrores(errs); setFilas(ok);
  };

  const leer = async (file) => {
    if (file.name.endsWith(".xlsx")) {
      const wb = XLSX.read(await file.arrayBuffer());
      validar(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false }));
    } else Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => validar(r.data) });
  };

  const importar = async () => {
    try {
      for (let i = 0; i < filas.length; i += 400) {           // límite Firestore: 500 ops por batch
        const batch = writeBatch(db);
        filas.slice(i, i + 400).forEach((r) => {
          const d = Object.fromEntries(CAMPOS.map((c) => [c, String(r[c] ?? "").trim()]));
          batch.set(doc(collection(db, "equipos")), { ...d, numSerie: String(d.numSerie), historialIntervenciones: [], updatedBy: user.email, updatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
      toast(`${filas.length} equipos importados`); setFilas([]);
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <button className="border rounded px-3 py-2" onClick={plantilla}>Descargar plantilla CSV</button>
      <input type="file" accept=".csv,.xlsx" onChange={(e) => e.target.files[0] && leer(e.target.files[0])} />
      {errores.length > 0 && <ul className="text-sm text-red-600 list-disc pl-5">{errores.map((e) => <li key={e}>{e}</li>)}</ul>}
      {filas.length > 0 && <button className="bg-blue-600 text-white rounded px-3 py-2" onClick={importar}>Importar {filas.length} válidos</button>}
    </div>
  );
}
