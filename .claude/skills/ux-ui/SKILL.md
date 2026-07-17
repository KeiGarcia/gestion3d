---
name: ux-ui
description: Diseñar y revisar interfaces de la app (Next.js 16 + React 19 + Tailwind 4). Úsalo al crear/modificar pantallas, componentes, formularios, layouts o estados visuales, y cuando se pida mejorar accesibilidad, jerarquía visual, responsive o consistencia de UI.
---

# UX/UI para gestion3d

Guía para construir y revisar interfaz en este proyecto. Stack real: **Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, Recharts, Firebase**.

Antes de escribir UI nueva, lee `node_modules/next/dist/docs/` para la API vigente de Next 16 (esta versión tiene breaking changes respecto a lo que conoces).

## Flujo de trabajo

1. **Entender la tarea**: ¿qué dato/acción consume el usuario y cuál es la acción principal de la pantalla? Identifícala antes de maquetar.
2. **Reutilizar primero**: revisa `components/` y `app/` por un patrón existente antes de crear uno nuevo. Mantén la misma estética, espaciados y nombres.
3. **Construir** siguiendo los principios de abajo.
4. **Verificar**: corre `npm run dev` y revisa la pantalla real (no solo el código) en viewport móvil y desktop.

## Principios de diseño

- **Una acción primaria por vista.** Resáltala (botón sólido/color de marca); las secundarias van con menor peso (outline/ghost). Nunca dos botones sólidos compitiendo.
- **Jerarquía visual con tamaño, peso y espacio**, no solo color. Título > subtítulo > cuerpo > metadato.
- **Escala de espaciado consistente** (múltiplos de Tailwind: `2, 4, 6, 8, 12, 16`). No mezcles valores arbitrarios.
- **Estados siempre presentes**: cada vista con datos necesita `loading`, `vacío`, `error` y `éxito`. El estado vacío debe explicar qué hacer, no solo "sin datos".
- **Feedback inmediato** en toda acción (spinner en botón, deshabilitar durante submit, toast/mensaje al terminar).
- **Mobile-first**: maqueta en columna y escala con `sm: md: lg:`. Áreas táctiles ≥ 44px.

## Accesibilidad (mínimos no negociables)

- HTML semántico: `<button>` para acciones, `<a>` para navegar, `<label>` asociado a cada input, encabezados en orden (`h1→h2→h3`).
- Contraste texto/fondo ≥ 4.5:1 (3:1 para texto grande).
- Foco visible (`focus-visible:ring-...`); no elimines el outline sin reemplazo.
- Toda imagen con `alt`; íconos decorativos con `aria-hidden`. Inputs con error usan `aria-invalid` + texto de error asociado.
- Navegable con teclado de principio a fin.

## Convenciones Tailwind 4 en este repo

- Usa utilidades de Tailwind; evita CSS suelto salvo que sea imprescindible.
- Tokens de color/tema vía variables CSS de Tailwind 4 (`@theme`), no hardcodees hex repetidos: centraliza la paleta.
- Componentes con clases largas: agrupa por categoría (layout → spacing → color → estado) para legibilidad.
- Para variantes condicionales usa un patrón claro de concatenación o helper `cn()`; no construyas strings de clase frágiles.

## Componentes

- **Server Components por defecto**; añade `"use client"` solo cuando haya estado, efectos o eventos del navegador.
- Props tipadas con TypeScript, valores por defecto sensatos.
- Componente = una responsabilidad. Si supera ~150 líneas o mezcla data-fetching con presentación, divídelo.
- Formularios: validación con mensajes claros junto al campo, deshabilitar submit mientras procesa, no perder lo escrito ante un error.

## Gráficos (Recharts)

- Contenedor responsive, ejes etiquetados, leyenda solo si hay >1 serie.
- Paleta accesible y consistente con el resto de la app; no dependas solo del color para distinguir series (usa también etiquetas/patrones).

## Checklist de revisión de UI

- [ ] Acción primaria evidente y única
- [ ] Responsive en móvil y desktop
- [ ] Estados loading / vacío / error cubiertos
- [ ] Contraste y foco accesibles; navegable por teclado
- [ ] Labels en inputs, alt en imágenes
- [ ] Espaciado y colores consistentes con el resto de la app
- [ ] Sin `console.log` ni clases muertas
