# Maderoom Studio Online

Plataforma web multiempresa para administrar proyectos, cortes, optimización de láminas, presupuestos, cotizaciones, clientes, catálogos, configuración empresarial y licencias.

## Estado actual

La primera base funcional online ya está montada:

- React + TypeScript + Vite.
- Supabase separado para este producto.
- Autenticación por usuario.
- Empresas y miembros con roles.
- Row Level Security por empresa.
- Proyectos y clientes.
- Tabla de cortes por hojas/color.
- Lectura de comandos `1L`, `2L`, `1C`, `2C`, `LR`, `CR`, `LRG`, `CRG`, `PL`, `PC` y `PLG`.
- Cálculo de bisagras, manijas y gatos.
- Optimizador web con veta, disco, márgenes, guillotina y media lámina.
- Persistencia de resultados de optimización.
- Presupuesto por hojas.
- Sincronización automática Cortes/Optimización → Presupuesto.
- Catálogo maestro de precios.
- Cotizaciones versionables.
- Storage para logos, renders y archivos de cotización.
- Configuración de moneda y unidades.
- Licencias con duración y cantidad de equipos editables.
- Pruebas de 3, 7 o cualquier cantidad de días mediante duración personalizada.
- Base de panel administrativo de licencias.
- Función Edge `license-status` protegida por JWT.
- Exportación/importación Excel preparada con SheetJS.
- Generadores PDF para optimización y propuesta comercial.
- GitHub Actions preparado para desplegar el frontend.

## Backend

Proyecto Supabase:

`uvuqzpannpujnqiwfjiu`

El backend incluye tablas para:

- `companies`
- `profiles`
- `company_members`
- `clients`
- `projects`
- `cut_sheets`
- `cut_pieces`
- `cut_edge_definitions`
- `catalog_items`
- `recommendations`
- `optimizer_runs`
- `optimizer_sheets`
- `optimizer_placements`
- `budgets`
- `budget_sheets`
- `budget_lines`
- `quotations`
- `quotation_versions`
- `quotation_images`
- `company_settings`
- `licenses`
- `license_devices`
- `platform_admins`
- `audit_log`

## Reglas de cortes

- `1L`, `2L`, `1C`, `2C`: canto regular.
- `1LR`, `2LR`, `1CR`, `2CR`: canto rígido.
- `1LRG`, `2LRG`, `1CRG`, `2CRG`: engrosado.
- Si una hoja no usa rígido pero sí engrosado, el engrosado puede ocupar el valor 2.
- `PL`: puerta con bisagras por Largo y una manija por puerta.
- `PC`: puerta con bisagras por Corto y una manija por puerta.
- `PLG`: puerta abatible hacia arriba, una manija y dos gatos por puerta.
- La columna Largo define la dirección de veta.
- Material con veta no rota; material sin veta puede rotar 90°.

## Optimizador

- No calcula solamente por área.
- Agrupa por material, color y espesor.
- Respeta veta por Largo.
- Considera espesor del disco y márgenes.
- Usa distribución compatible con cortes guillotina.
- Evalúa media lámina.
- Guarda las piezas colocadas y el porcentaje de aprovechamiento.
- La última optimización válida es la fuente principal para las láminas del presupuesto.
- Cuando cambian los cortes, la optimización anterior se marca como desactualizada.

## Presupuesto

La base maneja hojas independientes como Materiales, Herrajes, Servicios, Mano de obra, Transporte y Otros.

Las líneas automáticas se regeneran sin eliminar las líneas manuales. La sincronización incluye:

- láminas según la última optimización válida;
- cantos por metraje;
- costo por pegado de canto;
- servicio de engrosado;
- bisagras;
- manijas;
- gatos hidráulicos.

## Cotización

Presupuesto y cotización permanecen separados. El presupuesto contiene información interna; la cotización almacena la presentación comercial.

La estructura soporta:

- título configurable;
- moneda;
- vigencia;
- formas de pago;
- tiempo de entrega;
- garantía;
- condiciones;
- inclusiones y exclusiones;
- imágenes/renders;
- plantillas;
- versiones inmutables;
- PDF con página de aceptación.

## Licencias

Las licencias no tienen duración ni cantidad de equipos fijas.

Ejemplos:

- prueba: 3 días / 1 equipo;
- prueba: 7 días / 1 equipo;
- comercial: 365 días / 2 equipos;
- personalizada: cualquier duración y cantidad permitida por el panel administrativo.

La base ya tiene RPC administrativas para crear, renovar, suspender y cambiar límites de licencia, restringidas a administradores de plataforma.

## Configuración internacional

Unidades: mm, cm, m, pies y pulgadas.

Monedas: ARS, BOB, BRL, CLP, COP, CRC, CUP, DOP, USD, GTQ, HNL, MXN, NIO, PAB, PYG, PEN, UYU y VES.

Internamente las medidas se conservan en milímetros para mantener precisión.

## Desarrollo

```bash
npm install
npm run dev
```

El despliegue se construye con `.github/workflows/deploy-pages.yml`.

## Principio de arquitectura

El sistema se desarrolla desde cero. El software de escritorio anterior no se modifica ni se reutiliza como código. Solo se conservan las reglas de negocio aprobadas y la experiencia adquirida.
