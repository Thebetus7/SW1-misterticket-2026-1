---
name: misterticket_design_system
description: Guía de diseño responsivo y sistema de componentes para MisterTicket (Next.js + Tailwind)
---

# 🎨 MisterTicket Design & Responsivity Skill

Esta skill define la base estética y funcional del frontend de MisterTicket. Se prioriza el **comportamiento responsivo** (Mobile First) para asegurar que la compra de tickets sea fluida desde cualquier dispositivo.

## 1. Tipografía y Escala
Utilizamos un sistema de fuentes dinámico basado en las utilidades de Tailwind:

| Nivel | Tamaño (Desktop) | Tamaño (Mobile) | Peso |
| :--- | :--- | :--- | :--- |
| **H1** | `text-6xl` (60px) | `text-4xl` (36px) | `font-extrabold` |
| **H2** | `text-3xl` (30px) | `text-2xl` (24px) | `font-bold` |
| **H3** | `text-xl` (20px) | `text-lg` (18px) | `font-semibold` |
| **Cuerpo** | `text-base` (16px) | `text-sm` (14px) | `font-normal` |
| **Small** | `text-sm` (14px) | `text-xs` (12px) | `font-medium` |

## 2. Componentes y Layout Responsivo

### 📱 Contenedores (Layout)
- **Desktop**: Máximo ancho de `max-w-7xl` con padding lateral de `px-8`.
- **Tablet**: Padding lateral de `px-6`.
- **Mobile**: Padding lateral de `px-4`. Usar `flex-col` en casi todos los contenedores que sean `flex-row` en desktop.

### 🔘 Botones y Acciones
Los botones deben ser "Touch-friendly" en mobile:
- **Altura mínima**: `h-12` (48px) en mobile para facilitar el tap.
- **Ubicación**: 
  - En **Desktop**, los botones de acción principal (como "Comprar") pueden ir a la derecha o integrados en cards.
  - En **Mobile**, usar **Botones de Ancho Completo** (`w-full`) para acciones críticas y considerar **Sticky Buttons** en la parte inferior de la pantalla para transacciones.

### 📦 Cards de Tickets/Productos
- **Desktop**: Grid de 3 o 4 columnas (`grid-cols-4`).
- **Tablet**: Grid de 2 columnas (`grid-cols-2`).
- **Mobile**: 1 sola columna (`grid-cols-1`). Las imágenes deben ocupar el 100% del ancho para impacto visual.

## 3. Clases de Utilidad Personalizadas (globals.css)
Aplica estas clases para mantener la consistencia:

```css
@layer components {
  /* Botón Premium Responsivo */
  .btn-ticket {
    @apply w-full md:w-auto px-8 py-4 md:py-3 rounded-2xl font-bold transition-all 
           bg-accent text-white shadow-xl hover:scale-[1.02] active:scale-[0.98]
           flex items-center justify-center gap-2;
  }

  /* Card Anti-Fraude */
  .card-safe {
    @apply bg-white border border-brand-100 rounded-3xl p-5 md:p-8 
           shadow-sm hover:shadow-2xl hover:border-accent/10 transition-all;
  }

  /* Input Adaptable */
  .input-mt {
    @apply w-full bg-brand-50 border-none rounded-2xl px-5 py-4 
           focus:ring-2 focus:ring-accent/20 transition-all text-base;
  }
}
```

## 4. Reglas de Oro para MisterTicket
1. **Sin Hover en Mobile**: No dependas del hover para mostrar información importante; usa clicks o visibilidad directa.
2. **Jerarquía Visual**: El precio y el botón "Comprar" deben ser lo más visible (color `accent`).
3. **Inputs Grandes**: Facilita el llenado de datos de billetera móvil con inputs de gran tamaño y teclados numéricos automáticos (`type="number"`).
