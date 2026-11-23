# -*- coding: utf-8 -*-
"""Pruebas de aceptación automatizadas de las 30 HU core de EpiNexo.
Cada prueba corresponde a un escenario Gherkin (2 por HU). Uso:
    pip install playwright && python -m playwright install chromium
    python acceptance.py https://<usuario>.github.io/<repositorio>/index.html
"""
import asyncio, json, sys, re
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/index.html"
RESULTS = []
SHOTS = "evidencias"

def week_sum(w0, w1, zones=None):
    data = {
        "ribera-norte": [8, 9, 11, 10, 13, 15, 18, 21, 24, 29, 35, 48],
        "puerto-palma": [10, 11, 12, 14, 15, 17, 19, 22, 25, 27, 30, 41],
        "ribera-sur": [3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9],
        "las-americas": [6, 6, 7, 7, 8, 8, 9, 9, 10, 9, 10, 11],
        "centro-historico": [2, 3, 3, 3, 3, 4, 3, 4, 4, 4, 5, 4],
        "nuevo-horizonte": [1, 2, 2, 2, 2, 3, 2, 3, 3, 2, 3, 4],
        "loma-sur": [0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2],
        "arenales": [0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1]}
    zones = zones or data.keys()
    return sum(sum(data[z][w0 - 29:w1 - 29 + 1]) for z in zones)


class Check:
    def __init__(self):
        self.obtained = []
        self.ok = True
    def that(self, cond, msg):
        self.obtained.append(("✔ " if cond else "✘ ") + msg)
        if not cond:
            self.ok = False


async def new_page(browser, width=1366, height=900):
    ctx = await browser.new_context(viewport={"width": width, "height": height}, accept_downloads=True)
    page = await ctx.new_page()
    page.errors = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    await page.goto(URL)
    await page.wait_for_load_state("networkidle")
    return ctx, page

async def tab(page, name):
    await page.click(f"#tab-{name}")
    await page.wait_for_timeout(100)

async def ftab(page, name):
    await tab(page, "brigada")
    await page.click(f"#ftab-{name}")

async def text(page, sel):
    return (await page.inner_text(sel)).strip()

async def assign_b03(page, zone="ribera-norte", prio="urgente", action="Control larvario casa por casa"):
    await tab(page, "coordinador")
    await page.select_option("#b-zone", zone)
    await page.select_option("#b-brigade", "B03")
    await page.check(f'input[name="b-priority"][value="{prio}"]')
    await page.select_option("#b-action", action)
    await page.click('#brigade-form button[type="submit"]')

async def kpi_cases(page):
    return int(re.sub(r"\D", "", await text(page, "#kpi-casos [data-value]")))


TESTS = []
def test(pid, hu, esc, action, expected):
    def deco(fn):
        TESTS.append(dict(id=pid, hu=hu, esc=esc, action=action, expected=expected, fn=fn))
        return fn
    return deco

# ---------------- EP08 ----------------
@test("PA-01", "HU-47", "E1 · Entender la propuesta", "Abrir la página y leer la primera sección",
      "Se ve qué es EpiNexo, a quién ayuda y un botón «Solicitar información»")
async def _(page, c):
    h1 = await text(page, "#hero-title"); lead = await text(page, ".hero .lead")
    c.that("dengue" in h1.lower(), f"Título: «{h1}»")
    c.that("analistas, coordinadores y brigadas" in lead, "El texto indica a quién ayuda (analistas, coordinadores y brigadas)")
    c.that(await page.is_visible("#cta-solicitar"), "Botón «Solicitar información» visible en la primera sección")
    alts = await page.eval_on_selector_all("main img", "els => els.filter(e => !e.alt).length")
    c.that(alts == 0, "Todas las imágenes informativas tienen texto alternativo")

@test("PA-02", "HU-47", "E2 · Ir a la solicitud", "Seleccionar «Solicitar información» en la primera sección",
      "La página lleva al formulario de contacto")
async def _(page, c):
    await page.click("#cta-solicitar"); await page.wait_for_timeout(600)
    c.that(page.url.endswith("#contacto"), f"URL: …{page.url[-10:]}")
    c.that(await page.locator("#contact-form").is_visible(), "El formulario de contacto está visible")

@test("PA-03", "HU-05", "E1 · Elegir un perfil", "Elegir el perfil «Brigada de campo»",
      "Se muestran las funciones de la app de campo y el perfil queda marcado")
async def _(page, c):
    await page.click("text=Brigada de campo >> nth=0")
    c.that(await page.is_checked('input[name="perfil"][value="brigada"]'), "La opción «Brigada de campo» queda seleccionada")
    c.that(await text(page, "#profile-panel h3") == "Brigada de campo", "El panel muestra «Brigada de campo»")
    n = await page.locator("#profile-panel .feature-list li").count()
    c.that(n >= 3, f"Se listan {n} funciones del perfil")

@test("PA-04", "HU-05", "E2 · Cambiar de perfil", "Con «Analista» elegido, elegir «Coordinador»",
      "El contenido cambia al del coordinador sin recargar")
async def _(page, c):
    await page.evaluate("window.__marker = 1")
    await page.click("text=Coordinador de la respuesta >> nth=0")
    c.that(await text(page, "#profile-panel h3") == "Coordinador de la respuesta", "El panel muestra «Coordinador de la respuesta»")
    c.that(await page.evaluate("window.__marker") == 1, "La página no se recargó (estado JS conservado)")

@test("PA-05", "HU-48", "E1 · Envío válido", "Completar todos los campos y enviar",
      "Se muestra «Solicitud enviada» y el formulario se limpia")
async def _(page, c):
    await page.fill("#c-name", "Ana Torres Ruiz"); await page.fill("#c-email", "ana.torres@diresa.gob.pe")
    await page.fill("#c-phone", "987654321"); await page.select_option("#c-region", "Piura")
    await page.fill("#c-msg", "Queremos una demostración para el equipo regional.")
    await page.click('#contact-form button[type="submit"]')
    st = await text(page, "#contact-status")
    c.that("Solicitud enviada" in st, f"Mensaje: «{st}»")
    c.that(await page.input_value("#c-name") == "", "El formulario se limpió")

@test("PA-06", "HU-48", "E2 · Correo inválido", "Escribir «ana@correo» y enviar",
      "Se muestra «Ingresa un correo válido» junto al campo y no se envía")
async def _(page, c):
    await page.fill("#c-name", "Ana Torres Ruiz"); await page.fill("#c-email", "ana@correo")
    await page.fill("#c-phone", "987654321"); await page.select_option("#c-region", "Piura")
    await page.fill("#c-msg", "Queremos una demostración.")
    await page.click('#contact-form button[type="submit"]')
    err = await text(page, "#c-email-err")
    c.that(err == "Ingresa un correo válido", f"Error junto al campo: «{err}»")
    c.that(await page.get_attribute("#c-email", "aria-invalid") == "true", "El campo se marca con aria-invalid")
    c.that("Solicitud enviada" not in await text(page, "#contact-status"), "No se muestra confirmación de envío")

# ---------------- EP02 Analista ----------------
@test("PA-07", "HU-06", "E1 · Carga inicial", "Abrir el tablero de demostración",
      "Se ven las cuatro tarjetas con valor, unidad y periodo")
async def _(page, c):
    n = await page.locator("#kpis .kpi").count()
    c.that(n == 4, f"{n} tarjetas de indicadores")
    units = await page.eval_on_selector_all("#kpis .kpi-unit", "els => els.map(e => e.textContent)")
    c.that(all("SE 29 – SE 40" in u for u in units), "Cada tarjeta indica unidad y periodo SE 29 – SE 40")
    c.that(await kpi_cases(page) == week_sum(29, 40), f"Casos = {await kpi_cases(page)} (esperado {week_sum(29, 40)})")

@test("PA-08", "HU-06", "E2 · Recalcular por filtro", "Filtrar la provincia «Ribera»",
      "Las tarjetas muestran solo los valores de esa provincia")
async def _(page, c):
    await page.select_option("#f-province", "ribera")
    exp = week_sum(29, 40, ["ribera-norte", "puerto-palma", "ribera-sur"])
    got = await kpi_cases(page)
    c.that(got == exp, f"Casos de Ribera = {got} (esperado {exp})")

@test("PA-09", "HU-07", "E1 · Consultar una zona", "Enfocar con teclado la zona «Ribera Norte»",
      "Se ve el nombre, el nivel de riesgo y el número de casos")
async def _(page, c):
    await page.focus('#risk-map [data-zone="ribera-norte"]')
    tip = await text(page, "#map-tooltip")
    c.that("Ribera Norte" in tip and "Riesgo crítico" in tip and "136 casos" in tip, f"Resumen: «{tip}»")

@test("PA-10", "HU-07", "E2 · Leyenda sin depender del color", "Revisar la leyenda del mapa",
      "Cada nivel tiene color, ícono y texto")
async def _(page, c):
    items = await page.eval_on_selector_all("#map-legend li", "els => els.map(e => [e.textContent.trim(), !!e.querySelector('svg')])")
    c.that(len(items) == 4, f"{len(items)} niveles en la leyenda")
    c.that(all(i[1] for i in items), "Cada nivel tiene ícono")
    c.that([i[0].split(" ")[0] for i in items] == ["Bajo", "Medio", "Alto", "Crítico"], "Textos: Bajo, Medio, Alto, Crítico")

@test("PA-11", "HU-08", "E1 · Filtrar por distrito", "Elegir provincia «Ribera» y distrito «Ribera Norte»",
      "Todos los componentes muestran solo Ribera Norte y aparece la etiqueta del filtro")
async def _(page, c):
    await page.select_option("#f-province", "ribera")
    opts = await page.eval_on_selector_all("#f-district option", "els => els.map(e => e.textContent)")
    c.that(opts == ["Todos los distritos", "Ribera Norte", "Puerto Palma", "Ribera Sur"], "El filtro de distrito solo lista distritos de Ribera")
    await page.select_option("#f-district", "ribera-norte")
    c.that(await kpi_cases(page) == week_sum(29, 40, ["ribera-norte"]), "Indicadores de Ribera Norte (241 casos)")
    dims = await page.locator("#risk-map .zone.dim").count()
    c.that(dims == 7, f"Mapa: {dims} zonas atenuadas fuera del filtro")
    alerts = await page.eval_on_selector_all("#trend-alerts [data-alert-zone]", "els => els.map(e => e.dataset.alertZone)")
    c.that(alerts == ["ribera-norte"], f"Alertas: {alerts}")
    c.that("Distrito: Ribera Norte" in await text(page, "#filter-chips"), "Etiqueta «Distrito: Ribera Norte» visible")

@test("PA-12", "HU-08", "E2 · Limpiar filtros", "Con filtros activos, seleccionar «Limpiar filtros»",
      "El tablero vuelve a mostrar toda la región")
async def _(page, c):
    await page.select_option("#f-province", "ribera"); await page.select_option("#f-district", "ribera-norte")
    await page.click("#clear-filters")
    c.that(await kpi_cases(page) == week_sum(29, 40), "Indicadores de toda la región (743 casos)")
    c.that("Toda la región" in await text(page, "#filter-chips"), "Etiqueta «Toda la región Valle Claro»")

@test("PA-13", "HU-09", "E1 · Rango válido", "Elegir SE 33 a SE 40 y aplicar",
      "Los componentes se recalculan y el título muestra «SE 33 – SE 40»")
async def _(page, c):
    await page.select_option("#f-from", "33"); await page.select_option("#f-to", "40"); await page.click("#apply-period")
    c.that(await text(page, "#period-label") == "SE 33 – SE 40", "Título: SE 33 – SE 40")
    c.that(await kpi_cases(page) == week_sum(33, 40), f"Casos del periodo = {await kpi_cases(page)}")

@test("PA-14", "HU-09", "E2 · Rango inválido", "Elegir SE 39 a SE 35 y aplicar",
      "Se muestra el error y se mantiene el periodo anterior")
async def _(page, c):
    await page.select_option("#f-from", "39"); await page.select_option("#f-to", "35"); await page.click("#apply-period")
    err = await text(page, "#period-error")
    c.that(err == "La semana inicial no puede ser posterior a la final.", f"Error: «{err}»")
    c.that(await text(page, "#period-label") == "SE 29 – SE 40", "El periodo aplicado sigue siendo SE 29 – SE 40")

@test("PA-15", "HU-10", "E1 · Ver valor exacto", "Enfocar el punto de la SE 40 del gráfico",
      "Se ve «SE 40» y el número exacto de casos")
async def _(page, c):
    c.that(await page.locator("#trend-chart .axis-title").count() == 2, "Ejes rotulados (semana y número de casos)")
    await page.focus('#trend-chart .pt[data-week="40"]')
    d = await text(page, "#chart-detail")
    c.that(d == f"SE 40: {week_sum(40, 40)} casos", f"Detalle: «{d}»")

@test("PA-16", "HU-10", "E2 · Alternativa en tabla", "Abrir «Ver datos en tabla»",
      "Se obtiene una tabla con semana y casos equivalente al gráfico")
async def _(page, c):
    await page.click("text=Ver datos en tabla")
    rows = await page.eval_on_selector_all("#trend-table tbody tr", "els => els.map(e => e.cells[0].textContent)")
    c.that(len(rows) == 12 and rows[0] == "SE 29" and rows[-1] == "SE 40", f"{len(rows)} filas (SE 29 a SE 40)")

@test("PA-17", "HU-12", "E1 · Abrir desde el mapa", "Seleccionar la zona «Ribera Norte» en el mapa",
      "Se abre la ficha con los datos de Ribera Norte del periodo")
async def _(page, c):
    await page.click('#risk-map [data-zone="ribera-norte"] polygon')
    c.that(await page.evaluate("document.getElementById('zone-dialog').open"), "La ficha (diálogo) está abierta")
    c.that("Ribera Norte" in await text(page, "#zone-dialog-title"), "Título: Ficha de zona · Ribera Norte")
    c.that(await text(page, "[data-zone-cases]") == "241", "Casos del periodo: 241")

@test("PA-18", "HU-12", "E2 · Cerrar la ficha", "Con la ficha abierta (desde teclado), presionar Escape",
      "La ficha se cierra y el foco regresa a la zona del mapa")
async def _(page, c):
    await page.focus('#risk-map [data-zone="ribera-norte"]'); await page.keyboard.press("Enter")
    c.that(await page.evaluate("document.getElementById('zone-dialog').open"), "La ficha se abrió con Enter")
    await page.keyboard.press("Escape"); await page.wait_for_timeout(100)
    c.that(not await page.evaluate("document.getElementById('zone-dialog').open"), "La ficha se cerró con Escape")
    fz = await page.evaluate("document.activeElement.dataset.zone")
    c.that(fz == "ribera-norte", f"Foco devuelto a: {fz}")

@test("PA-19", "HU-13", "E1 · Ver distribución", "Revisar el panel «Gravedad de los casos»",
      "Se ve número y porcentaje de cada categoría con etiqueta")
async def _(page, c):
    rows = await page.eval_on_selector_all("#severity .sev-head", "els => els.map(e => e.textContent)")
    c.that(len(rows) == 3, "Tres categorías")
    c.that(all("casos" in r and "%" in r for r in rows), "Cada categoría muestra casos y porcentaje")
    c.that("Sin signos de alarma" in rows[0] and "Con signos de alarma" in rows[1] and "Dengue grave" in rows[2], "Etiquetas de texto en cada categoría")

@test("PA-20", "HU-13", "E2 · Filtrar distribución", "Filtrar el distrito «Puerto Palma»",
      "La distribución muestra solo los casos de Puerto Palma")
async def _(page, c):
    await page.select_option("#f-province", "ribera"); await page.select_option("#f-district", "puerto-palma")
    tot = await page.evaluate("""() => [...document.querySelectorAll('#severity .sev-head span:last-child')].map(e => parseInt(e.textContent.split(' casos')[0].replace(/\\D/g,''))).reduce((a,b)=>a+b,0)""")
    c.that(tot == week_sum(29, 40, ["puerto-palma"]), f"Suma de categorías = {tot} (casos de Puerto Palma: 243)")

@test("PA-21", "HU-14", "E1 · Ver procedencia", "Revisar una tarjeta de indicador",
      "Se ve la fuente y la fecha y hora de actualización")
async def _(page, c):
    meta = await text(page, "#kpi-casos .kpi-meta")
    c.that("Fuente: NotiWeb–MINSA" in meta and "07/10/2026, 08:30" in meta, f"«{meta}»")

@test("PA-22", "HU-14", "E2 · Fuente desactualizada", "Revisar el panel de fuentes",
      "«Clínicas privadas» muestra «Datos desactualizados»")
async def _(page, c):
    t = await text(page, '[data-source="Clínicas privadas"]')
    c.that("Datos desactualizados" in t, "Aviso «Datos desactualizados» junto a Clínicas privadas")
    t2 = await text(page, '[data-source="NotiWeb – MINSA"]')
    c.that("Datos desactualizados" not in t2, "Las fuentes al día no muestran el aviso")

@test("PA-23", "HU-15", "E1 · Fuente completa", "Revisar NotiWeb–MINSA en el panel de fuentes",
      "Se ve el estado «Completo» con su ícono")
async def _(page, c):
    tg = page.locator('[data-source="NotiWeb – MINSA"] .tag-completo')
    c.that(await tg.count() == 1 and (await tg.inner_text()).strip() == "Completo", "Etiqueta «Completo»")
    c.that(await tg.locator("svg").count() == 1, "La etiqueta incluye ícono")

@test("PA-24", "HU-15", "E2 · Fuente con observaciones", "Revisar EsSalud en el panel de fuentes",
      "Se ve «Parcial» y el motivo")
async def _(page, c):
    t = await text(page, '[data-source="EsSalud"]')
    c.that("Parcial" in t, "Estado «Parcial»")
    c.that("Motivo: 12 registros sin distrito de residencia" in t, "Motivo visible")

@test("PA-25", "HU-16", "E1 · Alerta generada", "Abrir el tablero (SE 40)",
      "Se ve la alerta de Ribera Norte con casos y % de aumento")
async def _(page, c):
    t = await text(page, '[data-alert-zone="ribera-norte"]')
    c.that("48 casos en la SE 40" in t and "+76 %" in t, f"«{' '.join(t.split())[:90]}…»")
    z = await page.eval_on_selector_all("#trend-alerts [data-alert-zone]", "els => els.map(e => e.dataset.alertZone)")
    c.that("ribera-sur" not in z and "nuevo-horizonte" not in z, "No alerta zonas bajo el umbral (Ribera Sur +29 %, <10 casos)")

@test("PA-26", "HU-16", "E2 · Abrir zona desde la alerta", "Seleccionar «Ver zona» en la alerta de Ribera Norte",
      "Se abre la ficha de Ribera Norte")
async def _(page, c):
    await page.click('[data-alert-zone="ribera-norte"] [data-open-zone]')
    c.that(await page.evaluate("document.getElementById('zone-dialog').open"), "Ficha abierta")
    c.that("Ribera Norte" in await text(page, "#zone-dialog-title"), "Ficha de Ribera Norte")

@test("PA-27", "HU-19", "E1 · Ver estimación", "Activar «Mostrar estimación 4 semanas»",
      "Se ve la línea discontinua, el rango y la leyenda «Estimación referencial»")
async def _(page, c):
    await page.click("text=Mostrar estimación 4 semanas")
    n = await page.locator("#trend-chart .pt-fc").count()
    c.that(n == 4, f"{n} puntos estimados (SE 41 a SE 44)")
    c.that(await page.locator('#trend-chart polyline[stroke-dasharray]').count() == 1, "Línea discontinua presente")
    c.that(await page.locator('#trend-chart polygon[fill-opacity]').count() == 1, "Rango mínimo–máximo sombreado")
    c.that("Estimación referencial" in await text(page, "#forecast-legend"), "Leyenda «Estimación referencial»")

@test("PA-28", "HU-19", "E2 · Estimación por territorio", "Con la estimación visible, filtrar «Ribera Norte»",
      "La estimación se recalcula con los datos de Ribera Norte")
async def _(page, c):
    await page.click("text=Mostrar estimación 4 semanas")
    a = await page.get_attribute('#trend-chart .pt-fc[data-week="41"]', "aria-label")
    await page.select_option("#f-province", "ribera"); await page.select_option("#f-district", "ribera-norte")
    b = await page.get_attribute('#trend-chart .pt-fc[data-week="41"]', "aria-label")
    c.that(a != b, f"Región: «{a}» → Ribera Norte: «{b}»")

# ---------------- Coordinador ----------------
@test("PA-29", "HU-23", "E1 · Consultar camas", "Revisar «Camas por establecimiento»",
      "Se ven camas totales, ocupadas, disponibles y ocupación")
async def _(page, c):
    await tab(page, "coordinador")
    hdr = await page.eval_on_selector_all("#beds-table th", "els => els.map(e => e.textContent)")
    c.that(hdr == ["Establecimiento", "Zona", "Totales", "Ocupadas", "Disponibles", "Ocupación"], "Columnas completas")
    c.that(await page.locator("#beds-table tbody tr").count() == 8, "8 establecimientos")

@test("PA-30", "HU-23", "E2 · Saturación", "Revisar la fila del Hospital Ribera",
      "Se ve la etiqueta «Saturación»")
async def _(page, c):
    await tab(page, "coordinador")
    t = await text(page, '[data-facility="Hospital Ribera"]')
    c.that("88 %" in t and "Saturación" in t, f"«{' '.join(t.split())}»")
    t2 = await text(page, '[data-facility="C.S. Las Américas"]')
    c.that("Saturación" not in t2, "Establecimientos bajo 85 % sin etiqueta")

@test("PA-31", "HU-24", "E1 · Consultar stock", "Revisar «Stock de insumos»",
      "Se ve stock, unidad y mínimo de cada insumo")
async def _(page, c):
    await tab(page, "coordinador")
    items = await page.eval_on_selector_all("#stock-list li", "els => els.map(e => e.textContent)")
    c.that(len(items) == 6 and all("mínimo" in i for i in items), f"{len(items)} insumos con stock y mínimo")

@test("PA-32", "HU-24", "E2 · Stock crítico", "Revisar Sales de rehidratación oral",
      "Se ve «Stock crítico»")
async def _(page, c):
    await tab(page, "coordinador")
    t = await text(page, '[data-stock="sro"]')
    c.that("Stock crítico" in t, f"«{' '.join(t.split())}»")

@test("PA-33", "HU-25", "E1 · Ver ranking", "Revisar el ranking de zonas",
      "Las zonas se ordenan de mayor a menor puntaje con sus factores")
async def _(page, c):
    await tab(page, "coordinador")
    scores = [int(x) for x in await page.eval_on_selector_all("#ranking-table [data-score]", "els => els.map(e => e.textContent)")]
    c.that(scores == sorted(scores, reverse=True), f"Puntajes descendentes: {scores}")
    f = await page.eval_on_selector_all("#ranking-table td.factors", "els => els.map(e => e.textContent)")
    c.that(all("Incidencia" in x and "Crecimiento" in x and "Ocupación" in x for x in f), "Cada zona muestra sus factores")

@test("PA-34", "HU-25", "E2 · Cambiar orden", "Ordenar por «Casos»",
      "El ranking se reordena por casos")
async def _(page, c):
    await tab(page, "coordinador")
    await page.select_option("#ranking-sort", "cases")
    cases = [int(x) for x in await page.eval_on_selector_all("#ranking-table [data-cases]", "els => els.map(e => e.textContent)")]
    c.that(cases == sorted(cases, reverse=True), f"Casos descendentes: {cases}")

@test("PA-35", "HU-26", "E1 · Asignación válida", "Asignar 300 sobres de SRO a «Ribera Norte»",
      "Se confirma y el stock baja de 1,200 a 900")
async def _(page, c):
    await tab(page, "coordinador")
    await page.select_option("#r-zone", "ribera-norte"); await page.select_option("#r-item", "sro"); await page.fill("#r-qty", "300")
    await page.click('#resource-form button[type="submit"]')
    st = await text(page, "#resource-status")
    c.that("Asignación registrada" in st and "Stock restante: 900" in st, f"«{st}»")
    c.that(await text(page, '[data-stock="sro"] [data-qty]') == "900", "Stock actualizado a 900")

@test("PA-36", "HU-26", "E2 · Cantidad mayor al stock", "Intentar asignar 5000 sobres",
      "Se muestra el error y no se registra")
async def _(page, c):
    await tab(page, "coordinador")
    await page.select_option("#r-zone", "ribera-norte"); await page.select_option("#r-item", "sro"); await page.fill("#r-qty", "5000")
    await page.click('#resource-form button[type="submit"]')
    err = await text(page, "#r-qty-err")
    c.that(err == "La cantidad supera el stock disponible (1,200)", f"Error: «{err}»")
    c.that(await text(page, '[data-stock="sro"] [data-qty]') == "1,200", "El stock se mantiene en 1,200")

@test("PA-37", "HU-29", "E1 · Ver resumen", "Abrir la vista de gestión",
      "Se ven los cuatro indicadores ejecutivos")
async def _(page, c):
    await tab(page, "coordinador")
    t = await page.eval_on_selector_all("#exec-strip .kpi-title", "els => els.map(e => e.textContent.trim())")
    c.that(len(t) == 4, f"Indicadores: {t}")

@test("PA-38", "HU-29", "E2 · Ir al detalle", "Seleccionar «Camas disponibles»",
      "La página lleva a la tabla de camas")
async def _(page, c):
    await tab(page, "coordinador")
    await page.click("#exec-camas")
    c.that(await page.evaluate("document.activeElement.id") == "beds-card", "El foco pasa a «Camas por establecimiento»")

@test("PA-39", "HU-30", "E1 · Asignar brigada", "Asignar la Brigada 03 a «Ribera Norte» con prioridad urgente",
      "Se confirma y la alerta llega a la app de la brigada")
async def _(page, c):
    await assign_b03(page)
    st = await text(page, "#brigade-status")
    c.that("Brigada 03 asignada a Ribera Norte" in st and "llegó a la app" in st, f"«{st}»")
    opts = await page.eval_on_selector_all("#b-brigade option", "els => els.map(e => e.value)")
    c.that("B03" not in opts, "La Brigada 03 ya no figura como disponible")
    await tab(page, "brigada")
    c.that(await page.locator('#field-alerts [data-field-alert] h5', has_text="Ribera Norte").count() == 1, "Alerta de Ribera Norte en la app de campo")

@test("PA-40", "HU-30", "E2 · Campos incompletos", "Enviar el formulario sin elegir brigada",
      "Se muestra «Elige una brigada disponible» y no se crea")
async def _(page, c):
    await tab(page, "coordinador")
    before = await page.evaluate("EpiNexo.state().interventions.length")
    await page.select_option("#b-zone", "ribera-norte"); await page.select_option("#b-action", "Nebulización espacial")
    await page.click('#brigade-form button[type="submit"]')
    c.that(await text(page, "#b-brigade-err") == "Elige una brigada disponible", "Error en el campo Brigada")
    c.that(await page.evaluate("EpiNexo.state().interventions.length") == before, "No se creó la intervención")

@test("PA-41", "HU-31", "E1 · Filtrar por estado", "Filtrar «En curso»",
      "Solo se ven intervenciones en curso")
async def _(page, c):
    await tab(page, "coordinador")
    await page.select_option("#int-filter", "en-curso")
    st = await page.eval_on_selector_all("#int-table tbody tr[data-status]", "els => els.map(e => e.dataset.status)")
    c.that(len(st) >= 1 and all(s == "en-curso" for s in st), f"Estados listados: {st}")
    tg = await page.locator("#int-table tbody [data-state] .tag svg").count()
    c.that(tg == len(st), "El estado se muestra con ícono y texto")

@test("PA-42", "HU-31", "E2 · Actualización desde campo", "La brigada acepta la asignación de Ribera Norte",
      "El coordinador ve la intervención «En curso»")
async def _(page, c):
    await assign_b03(page)
    await tab(page, "brigada")
    await page.click('[data-field-alert]:has(h5:text("Ribera Norte")) [data-accept]')
    await tab(page, "coordinador")
    row = page.locator('#int-table tbody tr', has=page.locator("td", has_text="Ribera Norte")).first
    c.that(await row.get_attribute("data-status") == "en-curso", "Intervención de Ribera Norte «En curso»")

@test("PA-43", "HU-33", "E1 · Recibir incidencia", "Una brigada reporta «Falta de insumos» en Puerto Palma",
      "El coordinador ve la incidencia y el contador aumenta")
async def _(page, c):
    await ftab(page, "incidencias")
    await page.check('input[name="inc-type"][value="Falta de insumos"]')
    await page.select_option("#inc-zone", "puerto-palma")
    await page.fill("#inc-desc", "No hay larvicida suficiente para el sector muelle.")
    await page.click('#incident-form button[type="submit"]')
    await tab(page, "coordinador")
    c.that(await text(page, "#incident-badge") == "1", "Contador de incidencias = 1")
    await page.click("#open-incidents")
    t = await text(page, "#incident-list")
    c.that("Falta de insumos · Puerto Palma" in t and "Brigada 03" in t, f"«{' '.join(t.split())[:80]}…»")

@test("PA-44", "HU-33", "E2 · Marcar atendida", "Marcar la incidencia como atendida",
      "Cambia a «Atendida» y el contador disminuye")
async def _(page, c):
    await ftab(page, "incidencias")
    await page.check('input[name="inc-type"][value="Acceso restringido"]')
    await page.fill("#inc-desc", "Vecinos no permiten el ingreso a la manzana C.")
    await page.click('#incident-form button[type="submit"]')
    await tab(page, "coordinador"); await page.click("#open-incidents")
    await page.click("[data-attend]")
    c.that(await text(page, "#incident-badge") == "0", "Contador = 0")
    c.that("Atendida" in await text(page, "#incident-list"), "Estado «Atendida»")

# ---------------- Brigada ----------------
@test("PA-45", "HU-34", "E1 · Recibir alerta", "Tras la asignación, abrir la app de campo",
      "La alerta muestra zona, referencia, coordenadas, casos, acción y mapa")
async def _(page, c):
    await assign_b03(page); await tab(page, "brigada")
    card = page.locator('[data-field-alert]:has(h5:text("Ribera Norte"))')
    t = await card.inner_text()
    for k in ["Acción", "Referencia", "Coordenadas", "Casos"]:
        c.that(k in t, f"Incluye «{k}»")
    c.that(await card.locator("svg.mini-map").count() == 1, "Mapa de ubicación con la zona marcada")

@test("PA-46", "HU-34", "E2 · Alerta persistente", "Recargar la página con una alerta sin responder",
      "La alerta sigue en la lista")
async def _(page, c):
    await assign_b03(page)
    await page.reload(); await page.wait_for_load_state("networkidle")
    await tab(page, "brigada")
    c.that(await page.locator('[data-field-alert]:has(h5:text("Ribera Norte"))').count() == 1, "La alerta persiste tras recargar")

@test("PA-47", "HU-35", "E1 · Orden por urgencia", "Con alertas urgente, alta y normal, abrir la lista",
      "La primera es urgente y la última normal")
async def _(page, c):
    await assign_b03(page); await tab(page, "brigada")
    pr = await page.eval_on_selector_all("#field-alerts [data-priority]", "els => els.map(e => e.dataset.priority)")
    c.that(pr == ["urgente", "alta", "normal"], f"Orden: {pr}")

@test("PA-48", "HU-35", "E2 · Nivel sin depender del color", "Revisar el nivel de una alerta",
      "El nivel se indica con ícono y texto")
async def _(page, c):
    await tab(page, "brigada")
    tags = await page.eval_on_selector_all("#field-alerts [data-priority] .alert-row .tag:first-child", "els => els.map(e => [e.textContent.trim(), !!e.querySelector('svg')])")
    c.that(all(t[1] and t[0] in ("Urgente", "Alta", "Normal") for t in tags), f"Etiquetas: {[t[0] for t in tags]}")

@test("PA-49", "HU-36", "E1 · Aceptar asignación", "Seleccionar «Aceptar» en una alerta pendiente",
      "La alerta queda «Aceptada» y el coordinador la ve «En curso»")
async def _(page, c):
    await tab(page, "brigada")
    await page.click('[data-field-alert="ALR-105"] [data-accept]')
    c.that("Aceptada" in await text(page, '[data-field-alert="ALR-105"]'), "Alerta marcada «Aceptada»")
    c.that(await page.evaluate("EpiNexo.state().interventions.find(i=>i.id==='INT-023').status") == "en-curso", "INT-023 pasa a «En curso» para el coordinador")

@test("PA-50", "HU-36", "E2 · Rechazar sin motivo", "Seleccionar «No disponible» y confirmar sin motivo",
      "Se muestra «Elige un motivo» y no se rechaza")
async def _(page, c):
    await tab(page, "brigada")
    await page.click('[data-field-alert="ALR-104"] [data-reject-open]')
    await page.click('[data-field-alert="ALR-104"] [data-reject]')
    c.that(await text(page, "#rse-ALR-104") == "Elige un motivo", "Error «Elige un motivo»")
    c.that(await page.evaluate("EpiNexo.state().alerts.find(a=>a.id==='ALR-104').status") == "pendiente", "La asignación sigue pendiente")

@test("PA-51", "HU-38", "E1 · Pérdida de señal", "Simular pérdida de conexión en la app",
      "Se muestra «Sin conexión» y las alertas siguen visibles")
async def _(page, c):
    await tab(page, "brigada")
    await page.click("text=Simular sin conexión")
    b = await text(page, "#conn-banner")
    c.that(b.startswith("Sin conexión") and "2 alertas guardadas" in b, f"Aviso: «{b}»")
    c.that(await page.locator("#field-alerts [data-field-alert]").count() == 2, "Las 2 alertas siguen visibles")
    c.that(await page.locator("#conn-banner svg").count() == 1, "El aviso incluye ícono")

@test("PA-52", "HU-38", "E2 · Asignación nueva sin señal", "Sin conexión, el coordinador asigna una zona; luego se reconecta",
      "La alerta queda pendiente de entrega y aparece al reconectar")
async def _(page, c):
    await tab(page, "brigada"); await page.click("text=Simular sin conexión")
    await assign_b03(page)
    c.that("pendiente de entrega" in await text(page, "#brigade-status"), "El coordinador ve «pendiente de entrega»")
    await tab(page, "brigada")
    c.that(await page.locator('[data-field-alert]:has(h5:text("Ribera Norte"))').count() == 0, "Sin señal la alerta no llega")
    await page.click("text=Simular sin conexión")
    c.that(await page.locator('[data-field-alert]:has(h5:text("Ribera Norte"))').count() == 1, "Al reconectar la alerta aparece")

@test("PA-53", "HU-39", "E1 · Registro válido", "Completar el formulario de inspección y guardar",
      "Se ve «Inspección guardada» y el formulario se limpia")
async def _(page, c):
    await ftab(page, "registro")
    await page.select_option("#i-zone", "nuevo-horizonte"); await page.fill("#i-house", "MZ-F-12")
    await page.select_option("#i-result", "Criaderos positivos encontrados"); await page.fill("#i-containers", "6")
    await page.check('input[name="i-actions"][value="Eliminación de criaderos"]')
    await page.click('#inspection-form button[type="submit"]')
    st = await text(page, "#inspection-status")
    c.that("Inspección guardada" in st, f"«{st}»")
    c.that(await page.input_value("#i-house") == "" and await page.evaluate("document.activeElement.id") == "i-house", "Formulario limpio y foco en «Código de vivienda»")

@test("PA-54", "HU-39", "E2 · Campo obligatorio vacío", "Guardar sin elegir el resultado",
      "Se ve el error junto al campo y no se guarda")
async def _(page, c):
    await ftab(page, "registro")
    await page.select_option("#i-zone", "nuevo-horizonte"); await page.fill("#i-house", "MZ-F-13")
    await page.click('#inspection-form button[type="submit"]')
    c.that(await text(page, "#i-result-err") == "Elige el resultado de la inspección", "Error junto a «Resultado»")
    c.that(await page.evaluate("EpiNexo.state().inspections.length") == 0, "No se guardó ninguna inspección")

@test("PA-55", "HU-40", "E1 · Guardado sin conexión", "Sin conexión, guardar una inspección",
      "Queda «Pendiente de sincronizar» y aumenta el contador")
async def _(page, c):
    await ftab(page, "registro"); await page.click("text=Simular sin conexión")
    await page.select_option("#i-zone", "nuevo-horizonte"); await page.fill("#i-house", "MZ-F-20")
    await page.select_option("#i-result", "Sin criaderos")
    await page.click('#inspection-form button[type="submit"]')
    c.that("Pendiente de sincronizar" in await text(page, "#inspection-status"), "Mensaje «Pendiente de sincronizar»")
    c.that(await text(page, "#pending-count") == "Registros pendientes de sincronizar: 1", "Contador de pendientes = 1")

@test("PA-56", "HU-40", "E2 · Sincronizar al reconectar", "Con 2 registros pendientes, recuperar la conexión",
      "Se informa «Se sincronizaron 2 registros» y el coordinador ve el avance")
async def _(page, c):
    await ftab(page, "registro"); await page.click("text=Simular sin conexión")
    for h in ["MZ-F-21", "MZ-F-22"]:
        await page.select_option("#i-zone", "nuevo-horizonte"); await page.fill("#i-house", h)
        await page.select_option("#i-result", "Sin criaderos"); await page.click('#inspection-form button[type="submit"]')
    await page.click("text=Simular sin conexión")
    t = await text(page, "#toast")
    c.that("Se sincronizaron 2 registros" in t, f"«{t}»")
    houses = await page.evaluate("EpiNexo.state().interventions.find(i=>i.id==='INT-023').houses")
    c.that(houses == 2, f"INT-023 (Nuevo Horizonte) con {houses} viviendas inspeccionadas para el coordinador")

@test("PA-57", "HU-41", "E1 · Enviar incidencia", "Elegir «Falta de insumos», describir y enviar",
      "Se ve «Incidencia enviada al coordinador»")
async def _(page, c):
    await ftab(page, "incidencias")
    await page.check('input[name="inc-type"][value="Falta de insumos"]')
    await page.fill("#inc-desc", "Se agotó el larvicida en la manzana F.")
    await page.click('#incident-form button[type="submit"]')
    st = await text(page, "#incident-status")
    c.that(st == "Incidencia enviada al coordinador.", f"«{st}»")

@test("PA-58", "HU-41", "E2 · Sin tipo", "Enviar sin elegir el tipo",
      "Se ve «Elige el tipo de incidencia» y no se envía")
async def _(page, c):
    await ftab(page, "incidencias")
    await page.fill("#inc-desc", "Descripción de prueba suficiente.")
    await page.click('#incident-form button[type="submit"]')
    c.that(await text(page, "#inc-type-err") == "Elige el tipo de incidencia", "Error de tipo")
    c.that(await page.evaluate("EpiNexo.state().incidents.length") == 0, "No se envió la incidencia")

@test("PA-59", "HU-44", "E1 · Enviar mensaje", "Elegir la Brigada 03, escribir y enviar",
      "El mensaje aparece en el historial con fecha y hora y llega a la app")
async def _(page, c):
    await tab(page, "coordinador")
    await page.select_option("#m-to", "B03"); await page.fill("#m-text", "Inicien por la manzana C de Ribera Norte.")
    await page.click('#message-form button[type="submit"]')
    first = await text(page, "#message-history li:first-child")
    c.that("Para: Brigada 03" in first and "Inicien por la manzana C" in first and re.search(r"\d{2}/\d{2}/\d{4}, \d{2}:\d{2}", first), "Historial con destinatario, fecha y hora")
    await ftab(page, "mensajes")
    c.that("Inicien por la manzana C" in await text(page, "#field-inbox"), "El mensaje llegó a la app de la Brigada 03")

@test("PA-60", "HU-44", "E2 · Mensaje vacío", "Seleccionar «Enviar» sin escribir",
      "Se ve «Escribe un mensaje antes de enviar» y no se envía")
async def _(page, c):
    await tab(page, "coordinador")
    before = await page.evaluate("EpiNexo.state().messages.length")
    await page.click('#message-form button[type="submit"]')
    c.that(await text(page, "#m-text-err") == "Escribe un mensaje antes de enviar", "Error de mensaje vacío")
    c.that(await page.evaluate("EpiNexo.state().messages.length") == before, "No se envió")


async def main():
    import os
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for t in TESTS:
            ctx, page = await new_page(browser)
            c = Check()
            try:
                await t["fn"](page, c)
            except Exception as ex:
                c.that(False, f"Excepción: {str(ex).splitlines()[0][:160]}")
            if page.errors:
                c.that(False, f"Errores JS: {page.errors[:2]}")
            await page.screenshot(path=f"{SHOTS}/{t['id']}.png")
            RESULTS.append(dict(id=t["id"], hu=t["hu"], esc=t["esc"], action=t["action"], expected=t["expected"],
                                obtained=c.obtained, status="Cumple" if c.ok else "No cumple"))
            print(t["id"], t["hu"], "OK " if c.ok else "FAIL", " | ".join(c.obtained)[:220])
            await ctx.close()
        await browser.close()
    json.dump(RESULTS, open("resultados_aceptacion.json", "w"), ensure_ascii=False, indent=1)
    ok = sum(r["status"] == "Cumple" for r in RESULTS)
    print(f"\n{ok}/{len(RESULTS)} pruebas cumplen")

asyncio.run(main())
