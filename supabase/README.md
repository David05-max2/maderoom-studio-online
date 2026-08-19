# Supabase · Maderoom Studio Online

Proyecto remoto: `uvuqzpannpujnqiwfjiu`

La base está separada del proyecto anterior y usa arquitectura multiempresa con Row Level Security (RLS).

## Módulos persistidos

- empresas, perfiles y miembros
- clientes y proyectos
- hojas y piezas de corte
- definiciones de canto
- catálogo y recomendaciones
- optimizaciones, láminas y ubicaciones
- presupuestos, hojas y líneas
- cotizaciones, versiones e imágenes
- configuración por empresa
- licencias y equipos
- auditoría
- Storage: `company-assets` y `quotation-files`

## RPC principales

- `bootstrap_company(company_name)` crea la primera empresa para un usuario autenticado.
- `sync_budget_from_project(target_project)` vuelve a generar las líneas automáticas del presupuesto desde Cortes y la última Optimización válida.

## Seguridad

Todas las tablas de negocio tienen RLS. El acceso se resuelve por membresía de empresa. Las funciones `SECURITY DEFINER` no están disponibles para `anon`; solo los usuarios autenticados pueden ejecutar las RPC necesarias.

## Regla de datos

Las medidas se almacenan en milímetros. La moneda y la unidad visible son configuración de empresa. Los costos internos permanecen en Presupuesto; Cotización almacena la presentación comercial y sus versiones.
