# Mantenimiento Diálisis – PWA multiusuario (React + Vite + Firebase)

## 1. Firebase (una sola vez)
1. Crea un proyecto en https://console.firebase.google.com
2. **Authentication** → Método de acceso → activa *Correo/Contraseña* y *Google*.
3. **Firestore Database** → Crear base de datos (modo producción).
4. **Configuración del proyecto → Tus apps → Web (`</>`)** → copia los valores de config.

## 2. Configurar el proyecto
```bash
npm install
cp .env.example .env        # pega aquí los valores VITE_FB_* del paso 1.4
```
Edita `.firebaserc` y cambia `TU-PROJECT-ID` por el ID de tu proyecto.

## 3. Probar y publicar
```bash
npm run dev                 # prueba local
npm i -g firebase-tools && firebase login
npm run deploy              # compila y publica Hosting + reglas de Firestore
```
La app queda en `https://TU-PROJECT-ID.web.app` (instalable como PWA desde el móvil).

## 4. Primer administrador
Abre la app, crea tu cuenta, y en la consola de Firestore edita `users/{tu-uid}` → `role: "admin"`.
Desde ahí, en la pestaña **Usuarios**, asignas *Técnico* o *Auditor/Lector* a los demás (nacen como lector).

## Uso de fechas
- **Equipos → editar**: puedes cambiar libremente *último* y *próximo* mantenimiento.
- **Próximo mantenimiento → Editar/Agregar fecha**: cambia solo el vencimiento.
- **Próximo mantenimiento → Registrar**: anota el mantenimiento hecho y fija el nuevo vencimiento.
- Carga masiva: las fechas se aceptan como AAAA-MM-DD (otros formatos de Excel se convierten).
