# EpiNexo · Landing page responsive (TB2)

**Sitio publicado:** https://jhondev27.github.io/epinexo-landing/

Landing page funcional de **EpiNexo**, solución de salud digital para la vigilancia y gestión del dengue.
Proyecto del curso **HCI for UX Design (1ASI0784) · UPC · 2026-20**.

La página implementa las **30 historias de usuario core** seleccionadas del Product Backlog con HTML, CSS y JavaScript puros (sin frameworks), y usa **datos de demostración ficticios** de la región «Valle Claro».

## Estructura

```
epinexo-landing/
├── index.html          # Estructura semántica, secciones de la landing y demo interactiva
├── css/
│   └── styles.css      # Guía de estilos (paleta, Inter, componentes) y diseño responsive mobile-first
├── js/
│   ├── data.js         # Datos de demostración (zonas, fuentes, camas, stock, brigadas)
│   └── app.js          # Interacciones: filtros, mapa, gráfico, formularios, modo sin conexión
├── assets/
│   └── img/            # Logo e ilustraciones SVG (con texto alternativo en el HTML)
└── .nojekyll
```

## Secciones y HU

| Sección | HU core |
|---|---|
| Inicio (propuesta de valor) | HU-47 |
| ¿Para quién es? (perfiles) | HU-05 |
| Demo · Analista | HU-06, HU-07, HU-08, HU-09, HU-10, HU-12, HU-13, HU-14, HU-15, HU-16, HU-19 |
| Demo · Coordinador | HU-23, HU-24, HU-25, HU-26, HU-29, HU-30, HU-31, HU-33, HU-44 |
| Demo · Brigada de campo | HU-34, HU-35, HU-36, HU-38, HU-39, HU-40, HU-41 |
| Contacto | HU-48 |

Complementarias (no contabilizadas en las 30): HU-17 (descargar CSV), HU-43 (alta legibilidad), HU-46 (confirmación de lectura).

## Ejecutar en local

Abre `index.html` en el navegador o, mejor, sirve la carpeta:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a la raíz de un repositorio (rama `main`).
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Espera la publicación y abre la URL `https://jhondev27.github.io/epinexo-landing/`.
5. Vuelve a comprobar en esa URL el flujo completo en desktop y en un celular.

## Uso en las pruebas con usuarios

El botón **«Reiniciar demo»** devuelve los datos al estado inicial. Úsalo antes de cada participante.
Lo que se registra en la demo se guarda solo en el navegador (localStorage).

## Accesibilidad

Enlace para saltar al contenido, landmarks, etiquetas visibles en formularios, errores con `aria-invalid` y `aria-describedby`,
pestañas ARIA con flechas del teclado, foco visible de 3 px, estados con ícono + texto (no solo color),
alternativa en tabla para el gráfico y lista para el mapa, objetivos táctiles ≥ 44 px y `prefers-reduced-motion`.

Íconos: [Lucide](https://lucide.dev) (licencia ISC). Tipografía: Inter (OFL).

## Pruebas de aceptación automatizadas

`tests/acceptance.py` ejecuta los 60 escenarios Gherkin (2 por cada HU core) con Playwright.
Ejecútalo contra la URL de GitHub Pages para dejar evidencia sobre la versión desplegada:

```bash
pip install playwright && python -m playwright install chromium
cd tests && python acceptance.py https://jhondev27.github.io/epinexo-landing/index.html
```

Genera `resultados_aceptacion.json` y una captura por prueba en `tests/evidencias/`.
