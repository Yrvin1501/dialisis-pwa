import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Auth({ toast }) {
  const [email, setEmail] = useState(""), [pass, setPass] = useState(""), [nuevo, setNuevo] = useState(false);
  const run = async (fn) => { try { await fn(); } catch (e) { toast(e.message, "error"); } };
  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-3">
        <h1 className="text-xl font-bold">Mantenimiento Diálisis</h1>
        <input className="border rounded w-full p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border rounded w-full p-2" type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} />
        <button className="w-full bg-blue-600 text-white rounded p-2"
          onClick={() => run(() => (nuevo ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email, pass))}>
          {nuevo ? "Crear cuenta" : "Entrar"}
        </button>
        <button className="w-full border rounded p-2" onClick={() => run(() => signInWithPopup(auth, googleProvider))}>Continuar con Google</button>
        <button className="text-sm text-blue-600" onClick={() => setNuevo(!nuevo)}>{nuevo ? "Ya tengo cuenta" : "Crear cuenta nueva"}</button>
      </div>
    </div>
  );
}
