# 3DGestión — Sistema de Gestión para Impresión 3D

Aplicación web para la gestión integral de un emprendimiento de impresión 3D.
Desarrollada como MVP para tesis de grado.

## Stack tecnológico

- **Frontend:** React 19 + Next.js 16 (App Router)
- **Estilos:** TailwindCSS v4
- **Base de datos:** Firebase Firestore
- **Autenticación:** Firebase Auth (email/contraseña)
- **Gráficos:** Recharts

## Funcionalidades

- **Dashboard** con KPIs: stock total, pedidos activos, valor del inventario
- **Materiales e Insumos:** CRUD completo con indicador visual de stock crítico
- **Calculadora de costos:** cálculo de precio sugerido con desglose detallado
- **Gestión de pedidos:** seguimiento por estado + descuento automático de stock al completar

---

## Configuración inicial

### 1. Crear proyecto en Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Habilita **Authentication** → Proveedores de inicio de sesión → **Email/contraseña**
4. Crea una base de datos **Firestore** (modo producción o prueba)
5. En Configuración del proyecto → Aplicaciones web → Agrega una app web

### 2. Configurar variables de entorno

Copia tus credenciales al archivo `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 3. Reglas de seguridad de Firestore

En la consola de Firebase → Firestore → Reglas, pegá lo siguiente:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /materiales/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /pedidos/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /configuraciones/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }

    match /referencias_calculo/{docId} {
      allow read, write: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
    }
  }
}
```

### 4. Índices de Firestore

Al ejecutar la app por primera vez, si aparece un error en la consola del navegador con un enlace, hacé clic para crear el índice automáticamente. Los índices requeridos son:
- `materiales`: `userId` (ASC) + `createdAt` (DESC)
- `pedidos`: `userId` (ASC) + `createdAt` (DESC)

---

## Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Configurar .env.local con tus credenciales de Firebase

# Ejecutar en modo desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Estructura de carpetas

```
gestion3d/
├── app/
│   ├── layout.tsx              # Layout raíz con AuthProvider
│   ├── page.tsx                # Redirige a /dashboard
│   ├── globals.css
│   ├── login/page.tsx          # Página login/registro
│   └── (protected)/            # Rutas protegidas (requieren auth)
│       ├── layout.tsx          # Guard + Sidebar
│       ├── dashboard/page.tsx
│       ├── materiales/page.tsx
│       ├── calculadora/page.tsx
│       └── pedidos/page.tsx
├── components/                 # Componentes reutilizables
├── contexts/AuthContext.tsx    # Estado de auth global
├── hooks/                      # Lógica de negocio y Firestore
├── lib/
│   ├── firebase.ts             # Inicialización Firebase
│   └── types.ts                # Interfaces TypeScript
└── .env.local                  # Variables de entorno (no subir a git)
```
