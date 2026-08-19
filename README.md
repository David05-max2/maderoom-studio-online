# Maderoom Studio Online

Nueva plataforma web de Maderoom para administrar proyectos, cortes, optimización de láminas, presupuestos, cotizaciones, clientes, catálogos, configuración empresarial y licencias.

## Stack

- React + TypeScript + Vite
- Supabase para autenticación, PostgreSQL, Storage y funciones backend
- GitHub para código, control de versiones y despliegue
- GitHub Pages para el frontend inicial

## Módulos

1. Dashboard
2. Proyectos
3. Cortes
4. Optimizador
5. Presupuesto
6. Cotización
7. Clientes
8. Catálogo
9. Configuración
10. Licencias

## Reglas de cortes ya incorporadas a la base del dominio

- `1L`, `2L`, `1C`, `2C`: canto regular.
- `1LR`, `2LR`, `1CR`, `2CR`: canto rígido.
- `1LRG`, `2LRG`, `1CRG`, `2CRG`: engrosado.
- `PL`: puerta con bisagras por Largo y una manija por puerta.
- `PC`: puerta con bisagras por Corto y una manija por puerta.
- `PLG`: puerta abatible hacia arriba, una manija y dos gatos por puerta.
- La columna Largo define la dirección de veta.
- Material con veta no rota; material sin veta puede rotar 90°.

## Reglas del optimizador

- No calcula solamente por área.
- Agrupa por material, color y espesor.
- Respeta veta por Largo.
- Considera espesor del disco y márgenes.
- Usa cortes tipo guillotina.
- Puede evaluar media lámina.
- Prioriza menor número de láminas equivalentes, menor desperdicio, menor número de cortes y mejores retazos.
- La última optimización válida es la fuente principal para la cantidad de láminas del presupuesto.

## Configuración internacional

Unidades previstas: mm, cm, m, pies y pulgadas.

Monedas previstas: ARS, BOB, BRL, CLP, COP, CRC, CUP, DOP, USD, GTQ, HNL, MXN, NIO, PAB, PYG, PEN, UYU y VES.

Internamente las medidas se conservarán en milímetros para evitar errores de precisión.

## Desarrollo

```bash
npm install
npm run dev
```

Para conectar Supabase, crear `.env.local` a partir de `.env.example`.

## Principio de arquitectura

El sistema se desarrolla desde cero. El software de escritorio anterior no se modifica ni se reutiliza como código. Solo se conservan sus reglas de negocio aprobadas y la experiencia adquirida.
