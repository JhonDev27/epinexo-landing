/* =========================================================
   EpiNexo · Interacciones de la landing page
   Cada bloque indica la(s) historia(s) de usuario que atiende.
   ========================================================= */
"use strict";

(function () {
  const STORAGE_KEY = "epinexo-demo-v1";
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const nf = new Intl.NumberFormat("es-PE");
  const nf1 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------------- Estado y almacenamiento local ---------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(clone(INITIAL_STATE), JSON.parse(raw));
    } catch (e) { /* almacenamiento no disponible: se usa memoria */ }
    return clone(INITIAL_STATE);
  }
  let state = loadState();
  if (!state.outbox) state.outbox = [];
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* sin persistencia */ }
  }
  const nextId = (prefix) => { state.seq += 1; return `${prefix}-${String(state.seq).padStart(3, "0")}`; };

  const filters = { province: "", district: "", from: 29, to: 40 };

  /* ---------------- Utilidades ---------------- */
  const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="#ic-${name}"></use></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const zoneById = (id) => ZONES.find((z) => z.id === id);
  const brigadeById = (id) => state.brigades.find((b) => b.id === id);
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) + ", " +
      d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  };
  const idx = (week) => WEEKS.indexOf(week);
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  function zonesInScope() {
    return ZONES.filter((z) => (!filters.province || z.province === filters.province) &&
      (!filters.district || z.id === filters.district));
  }
  function facilitiesInScope() {
    const ids = zonesInScope().map((z) => z.id);
    return FACILITIES.filter((f) => ids.includes(f.zone));
  }
  function riskLevel(inc) {
    if (inc >= 100) return { id: "critico", label: "Crítico", icon: "octagon-alert", color: "#B42318", text: "#fff" };
    if (inc >= 50) return { id: "alto", label: "Alto", icon: "triangle-alert", color: "#C2410C", text: "#fff" };
    if (inc >= 20) return { id: "medio", label: "Medio", icon: "circle-alert", color: "#F5B700", text: "#111827" };
    return { id: "bajo", label: "Bajo", icon: "circle-check", color: "#1B7F3B", text: "#fff" };
  }
  function zoneStats(z, from = filters.from, to = filters.to) {
    const a = idx(from), b = idx(to);
    const period = z.cases.slice(a, b + 1);
    const last4 = z.cases.slice(Math.max(a, b - 3), b + 1);
    const prev4 = z.cases.slice(Math.max(0, b - 4), b);
    const last = z.cases[b];
    const avgPrev = prev4.length ? sum(prev4) / prev4.length : 0;
    const growth = avgPrev > 0 ? ((last - avgPrev) / avgPrev) * 100 : 0;
    const cases = sum(period);
    const inc4 = (sum(last4) / z.population) * 1e5;
    const deaths = z.deaths.filter((w) => w >= from && w <= to).length;
    const facs = FACILITIES.filter((f) => f.zone === z.id);
    const beds = facs.reduce((acc, f) => ({ total: acc.total + f.total, occ: acc.occ + f.occupied }), { total: 0, occ: 0 });
    const occupancy = beds.total ? (beds.occ / beds.total) * 100 : 0;
    return { cases, last4: sum(last4), inc4, last, avgPrev, growth, deaths, level: riskLevel(inc4), occupancy, facs };
  }
  function tag(cls, iconName, text) { return `<span class="tag tag-${cls}">${icon(iconName)}${esc(text)}</span>`; }
  const PRIORITY = {
    urgente: { label: "Urgente", icon: "octagon-alert", rank: 0 },
    alta: { label: "Alta", icon: "triangle-alert", rank: 1 },
    normal: { label: "Normal", icon: "info", rank: 2 }
  };
  const STATUS = {
    pendiente: { label: "Pendiente", icon: "clock" },
    "en-curso": { label: "En curso", icon: "activity" },
    completada: { label: "Completada", icon: "circle-check" }
  };

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4500);
  }
  function setStatus(el, type, msg) {
    const ic = type === "ok" ? "circle-check" : type === "warn" ? "wifi-off" : "circle-alert";
    el.innerHTML = msg ? `<p class="status-${type}">${icon(ic)}<span>${esc(msg)}</span></p>` : "";
  }
  function setError(input, errEl, msg) {
    if (msg) { input.setAttribute("aria-invalid", "true"); errEl.textContent = msg; }
    else { input.removeAttribute("aria-invalid"); errEl.textContent = ""; }
    return !msg;
  }

  /* ---------------- Navegación móvil ---------------- */
  const navToggle = $(".nav-toggle"), navList = $("#menu-principal");
  navToggle.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navList.classList.toggle("open", !open);
  });
  navList.addEventListener("click", (e) => {
    if (e.target.closest("a") && window.matchMedia("(max-width: 63.99rem)").matches) {
      navToggle.setAttribute("aria-expanded", "false"); navList.classList.remove("open");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navList.classList.contains("open")) {
      navToggle.setAttribute("aria-expanded", "false"); navList.classList.remove("open"); navToggle.focus();
    }
  });

  /* ---------------- Pestañas accesibles (patrón ARIA tabs) ---------------- */
  function setupTabs(tablist) {
    const tabs = $$('[role="tab"]', tablist);
    function select(tab, focus = true) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        let n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n); }
      });
    });
    return select;
  }
  const selectRoleTab = setupTabs($(".role-tabs"));
  setupTabs($(".app-tabs"));

  /* ---------------- HU-05 · Perfiles ---------------- */
  const PROFILES = {
    analista: { title: "Analista epidemiológico", tab: "tab-analista", items: [
      ["layout-dashboard", "Indicadores de casos, incidencia, defunciones y letalidad con su fuente y fecha."],
      ["map", "Mapa de riesgo por zona y alertas automáticas cuando los casos aumentan 30 % o más."],
      ["trending-up", "Tendencia semanal con estimación referencial para las próximas 4 semanas."],
      ["shield-check", "Estado de calidad de cada fuente para saber qué validar primero."]] },
    coordinador: { title: "Coordinador de la respuesta", tab: "tab-coordinador", items: [
      ["layout-dashboard", "Vista ejecutiva de la emergencia en una sola franja."],
      ["sparkles", "Ranking de zonas prioritarias con los factores que explican cada puntaje."],
      ["bed-double", "Camas disponibles por establecimiento y stock de insumos críticos."],
      ["navigation", "Asignación de brigadas e insumos con seguimiento de cada intervención y mensajes."]] },
    brigada: { title: "Brigada de campo", tab: "tab-brigada", items: [
      ["map-pin", "Alertas con ubicación, casos y acción requerida, ordenadas por urgencia."],
      ["clipboard-list", "Registro de inspecciones con listas de selección, sin papel."],
      ["wifi-off", "Funciona sin señal y sincroniza solo al recuperar la conexión."],
      ["triangle-alert", "Reporte estructurado de incidencias al coordinador."]] }
  };
  function renderProfile(key) {
    const p = PROFILES[key];
    $("#profile-panel").innerHTML = `
      <h3>${esc(p.title)}</h3>
      <ul class="feature-list">${p.items.map(([ic, t]) => `<li>${icon(ic)}<span>${esc(t)}</span></li>`).join("")}</ul>
      <button type="button" class="btn btn-secondary" data-go-tab="${p.tab}">${icon("arrow-right")}Probar este perfil en la demo</button>`;
  }
  $$('input[name="perfil"]').forEach((r) => r.addEventListener("change", () => renderProfile(r.value)));
  $("#profile-panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-go-tab]");
    if (!b) return;
    const tab = document.getElementById(b.dataset.goTab);
    $("#demo").scrollIntoView();
    selectRoleTab(tab);
  });
  renderProfile("analista");

  /* ---------------- HU-08 · HU-09 · Filtros ---------------- */
  const fProv = $("#f-province"), fDist = $("#f-district"), fFrom = $("#f-from"), fTo = $("#f-to");
  fProv.innerHTML = `<option value="">Todas las provincias</option>` +
    PROVINCES.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  function fillDistricts() {
    const list = ZONES.filter((z) => !fProv.value || z.province === fProv.value);
    fDist.innerHTML = `<option value="">Todos los distritos</option>` +
      list.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join("");
  }
  fillDistricts();
  const weekOpts = WEEKS.map((w) => `<option value="${w}">SE ${w}</option>`).join("");
  fFrom.innerHTML = weekOpts; fTo.innerHTML = weekOpts;
  fFrom.value = "29"; fTo.value = "40";

  fProv.addEventListener("change", () => {
    filters.province = fProv.value; filters.district = ""; fillDistricts(); renderAll();
  });
  fDist.addEventListener("change", () => { filters.district = fDist.value; renderAll(); });
  $("#filters").addEventListener("submit", (e) => {
    e.preventDefault();
    const from = +fFrom.value, to = +fTo.value, err = $("#period-error");
    if (from > to) {
      err.textContent = "La semana inicial no puede ser posterior a la final.";
      fFrom.setAttribute("aria-invalid", "true"); fTo.setAttribute("aria-invalid", "true");
      return;
    }
    err.textContent = ""; fFrom.removeAttribute("aria-invalid"); fTo.removeAttribute("aria-invalid");
    filters.from = from; filters.to = to; renderAll();
    toast(`Periodo aplicado: SE ${from} – SE ${to}`);
  });
  $("#clear-filters").addEventListener("click", () => {
    filters.province = ""; filters.district = ""; filters.from = 29; filters.to = 40;
    fProv.value = ""; fillDistricts(); fFrom.value = "29"; fTo.value = "40";
    $("#period-error").textContent = ""; fFrom.removeAttribute("aria-invalid"); fTo.removeAttribute("aria-invalid");
    renderAll(); toast("Filtros limpiados: se muestra toda la región");
  });
  $("#filter-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    if (b.dataset.remove === "province") { filters.province = ""; filters.district = ""; fProv.value = ""; fillDistricts(); }
    if (b.dataset.remove === "district") { filters.district = ""; fDist.value = ""; }
    renderAll();
  });
  function renderChips() {
    const chips = [];
    if (filters.province) {
      const p = PROVINCES.find((x) => x.id === filters.province);
      chips.push(`<li class="chip">Provincia: ${esc(p.name)} <button type="button" class="btn-text icon-only" data-remove="province" aria-label="Quitar filtro de provincia ${esc(p.name)}">${icon("x")}</button></li>`);
    }
    if (filters.district) {
      const z = zoneById(filters.district);
      chips.push(`<li class="chip">Distrito: ${esc(z.name)} <button type="button" class="btn-text icon-only" data-remove="district" aria-label="Quitar filtro de distrito ${esc(z.name)}">${icon("x")}</button></li>`);
    }
    if (!chips.length) chips.push(`<li class="chip chip-muted">Toda la región Valle Claro</li>`);
    chips.push(`<li class="chip">Periodo: SE ${filters.from} – SE ${filters.to}</li>`);
    $("#filter-chips").innerHTML = chips.join("");
    $("#period-label").textContent = `SE ${filters.from} – SE ${filters.to}`;
  }

  /* ---------------- HU-06 · HU-14 · Indicadores ---------------- */
  const SOURCE_META = "Fuente: NotiWeb–MINSA, EsSalud y privados · Act.: 07/10/2026, 08:30";
  function renderKPIs() {
    const zs = zonesInScope();
    const st = zs.map((z) => zoneStats(z));
    const cases = sum(st.map((s) => s.cases));
    const pop = sum(zs.map((z) => z.population));
    const deaths = sum(st.map((s) => s.deaths));
    const inc = pop ? (cases / pop) * 1e5 : 0;
    const leth = cases ? (deaths / cases) * 100 : 0;
    const period = `SE ${filters.from} – SE ${filters.to}`;
    const cards = [
      ["Casos", "activity", nf.format(cases), "casos confirmados y probables", "kpi-casos"],
      ["Incidencia", "trending-up", nf1.format(inc), "casos por 100 000 hab.", "kpi-incidencia"],
      ["Defunciones", "circle-alert", nf.format(deaths), "defunciones confirmadas", "kpi-defunciones"],
      ["Letalidad", "chart-line", nf2.format(leth) + " %", "defunciones / casos × 100", "kpi-letalidad"]
    ];
    $("#kpis").innerHTML = cards.map(([t, ic, v, u, id]) => `
      <article class="kpi" id="${id}" aria-label="${t}: ${v} ${u}, ${period}">
        <p class="kpi-title">${icon(ic)}${t}</p>
        <p class="kpi-value" data-value>${v}</p>
        <p class="kpi-unit">${u} · ${period}</p>
        <p class="kpi-meta">${SOURCE_META}</p>
      </article>`).join("");
  }

  /* ---------------- HU-07 · HU-12 · Mapa de riesgo ---------------- */
  const LEVELS = [riskLevel(0), riskLevel(20), riskLevel(50), riskLevel(100)];
  const LEVEL_RANGE = { bajo: "< 20", medio: "20 – 49", alto: "50 – 99", critico: "≥ 100" };
  $("#map-legend").innerHTML = LEVELS.map((l) =>
    `<li>${tag(l.id, l.icon, `${l.label} (${LEVEL_RANGE[l.id]})`)}</li>`).join("");

  function splitName(name, max = 12) {
    if (name.length <= max) return [name];
    const parts = name.split(" ");
    return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
  }
  function renderMap() {
    const inScope = zonesInScope().map((z) => z.id);
    const svg = $("#risk-map");
    const cw = svg.getBoundingClientRect().width || 640;
    const narrow = cw < 480;
    const fs = narrow ? 24 : 15;
    svg.classList.toggle("narrow", narrow);
    svg.innerHTML = `<title>Mapa de riesgo de la región Valle Claro</title>` + ZONES.map((z) => {
      const s = zoneStats(z), l = s.level, dim = !inScope.includes(z.id);
      const lines = splitName(z.name, narrow ? 9 : 12);
      const [x, y] = z.label;
      const lh = fs + 2;
      const y0 = y - (narrow ? 0 : 8) - (lines.length - 1) * lh / 2;
      const nameTxt = `<text text-anchor="middle" fill="${l.text}" style="font-size:${fs}px">` +
        lines.map((ln, i) => `<tspan x="${x}" y="${y0 + i * lh}">${esc(ln)}${i < lines.length - 1 ? " " : ""}</tspan>`).join("") + `</text>`;
      const lvlY = y + 14 + (lines.length - 1) * 9;
      return `<g class="zone${dim ? " dim" : ""}" data-zone="${z.id}" tabindex="0" role="button"
          aria-label="${esc(z.name)} ${l.label} · ${s.last4} casos en las últimas 4 semanas. Abrir ficha de la zona.">
          <polygon points="${z.shape}" fill="${l.color}"></polygon>
          ${nameTxt}
          <text class="lvl" x="${x}" y="${lvlY}" text-anchor="middle" fill="${l.text}">${l.label} · ${s.last4} casos</text>
        </g>`;
    }).join("");
    $("#zone-list").innerHTML = ZONES.filter((z) => inScope.includes(z.id)).map((z) => {
      const st = zoneStats(z);
      return `<li><button type="button" data-open-zone="${z.id}"><span>${esc(z.name)}</span>${tag(st.level.id, st.level.icon, st.level.label + " · " + st.last4 + " casos")}</button></li>`;
    }).join("");
  }
  $("#zone-list").addEventListener("click", (e) => { const b = e.target.closest("[data-open-zone]"); if (b) openZone(b.dataset.openZone, b); });
  function zoneTooltip(id) {
    const z = zoneById(id), s = zoneStats(z);
    $("#map-tooltip").textContent = `${z.name} · Riesgo ${s.level.label.toLowerCase()} · ${s.last4} casos en las últimas 4 semanas (${nf1.format(s.inc4)} por 100 000 hab.)`;
  }
  const mapEl = $("#risk-map");
  mapEl.addEventListener("mouseover", (e) => { const g = e.target.closest(".zone"); if (g) zoneTooltip(g.dataset.zone); });
  mapEl.addEventListener("focusin", (e) => { const g = e.target.closest(".zone"); if (g) zoneTooltip(g.dataset.zone); });
  mapEl.addEventListener("click", (e) => { const g = e.target.closest(".zone"); if (g) openZone(g.dataset.zone, g); });
  mapEl.addEventListener("keydown", (e) => {
    const g = e.target.closest(".zone");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openZone(g.dataset.zone, g); }
  });

  const dialog = $("#zone-dialog");
  let dialogOpener = null;
  function openZone(id, opener) {
    const z = zoneById(id), s = zoneStats(z);
    dialogOpener = opener || document.activeElement;
    $("#zone-dialog-title").textContent = `Ficha de zona · ${z.name}`;
    const b = idx(filters.to), weeks = WEEKS.slice(Math.max(idx(filters.from), b - 3), b + 1);
    const growthTxt = (s.growth >= 0 ? "+" : "") + nf.format(Math.round(s.growth)) + " %";
    $("#zone-dialog-body").innerHTML = `
      <p>${tag(s.level.id, s.level.icon, "Riesgo " + s.level.label.toLowerCase())} <span class="muted">Periodo SE ${filters.from} – SE ${filters.to}</span></p>
      <dl class="zone-stats">
        <div><dt>Casos del periodo</dt><dd data-zone-cases>${nf.format(s.cases)}</dd></div>
        <div><dt>Incidencia (4 semanas)</dt><dd>${nf1.format(s.inc4)} / 100 000 hab.</dd></div>
        <div><dt>Variación última semana</dt><dd>${growthTxt}</dd></div>
        <div><dt>Defunciones</dt><dd>${s.deaths}</dd></div>
      </dl>
      <h4>Últimas semanas</h4>
      <div class="table-scroll"><table class="data-table"><caption class="sr-only">Casos por semana en ${esc(z.name)}</caption>
        <thead><tr>${weeks.map((w) => `<th scope="col" class="num">SE ${w}</th>`).join("")}</tr></thead>
        <tbody><tr>${weeks.map((w) => `<td class="num">${z.cases[idx(w)]}</td>`).join("")}</tr></tbody></table></div>
      <h4 style="margin-top:1rem">Establecimientos</h4>
      <ul>${s.facs.map((f) => `<li>${esc(f.name)}: ${f.total - f.occupied} camas disponibles de ${f.total}</li>`).join("") || "<li>Sin establecimientos registrados</li>"}</ul>
      <p class="muted small" style="margin-top:.75rem">Población estimada: ${nf.format(z.population)} hab. · Referencia: ${esc(z.ref)}</p>`;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    $("#zone-dialog-close").focus();
  }
  function closeZone() {
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener("close", () => { if (dialogOpener && document.contains(dialogOpener)) dialogOpener.focus(); });
  $("#zone-dialog-close").addEventListener("click", closeZone);
  $("#zone-dialog-close2").addEventListener("click", closeZone);

  /* ---------------- HU-16 · Alertas de aumento ---------------- */
  function trendAlerts() {
    return zonesInScope().map((z) => ({ z, s: zoneStats(z) }))
      .filter(({ s }) => s.last >= 10 && s.growth >= 30)
      .sort((a, b) => b.s.growth - a.s.growth);
  }
  function renderAlerts() {
    const list = trendAlerts();
    $("#trend-alerts").innerHTML = list.length ? list.map(({ z, s }) => `
      <li class="alert-item" data-alert-zone="${z.id}">
        <div class="alert-row">${tag("critico", "triangle-alert", "Aumento inusual")}<strong>${esc(z.name)}</strong></div>
        <p>${s.last} casos en la SE ${filters.to} · <strong>+${nf.format(Math.round(s.growth))} %</strong> frente al promedio de las 4 semanas anteriores (${nf1.format(s.avgPrev)}).</p>
        <div><button type="button" class="btn btn-secondary btn-sm" data-open-zone="${z.id}">${icon("map-pin")}Ver zona<span class="sr-only"> ${esc(z.name)}</span></button></div>
      </li>`).join("") : `<li class="empty">No hay zonas con aumento inusual en la SE ${filters.to} para el territorio filtrado.</li>`;
  }
  $("#trend-alerts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open-zone]");
    if (b) openZone(b.dataset.openZone, b);
  });

  /* ---------------- HU-10 · HU-19 · Tendencia y estimación ---------------- */
  function seriesInScope() {
    const zs = zonesInScope(), a = idx(filters.from), b = idx(filters.to);
    return WEEKS.slice(a, b + 1).map((w) => ({ week: w, value: sum(zs.map((z) => z.cases[idx(w)])) }));
  }
  function forecast(series) {
    const pts = series.slice(-6);
    const n = pts.length;
    if (n < 3) return [];
    const xs = pts.map((_, i) => i), ys = pts.map((p) => Math.log(p.value + 1));
    const mx = sum(xs) / n, my = sum(ys) / n;
    const sxx = sum(xs.map((x) => (x - mx) ** 2));
    const slope = sxx ? sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sxx : 0;
    const icpt = my - slope * mx;
    const resid = ys.map((y, i) => y - (icpt + slope * xs[i]));
    const sd = Math.max(0.08, Math.sqrt(sum(resid.map((r) => r * r)) / Math.max(1, n - 2)));
    const lastWeek = series[series.length - 1].week;
    return [1, 2, 3, 4].map((k) => {
      const x = n - 1 + k, mu = icpt + slope * x, spread = 1.645 * sd * Math.sqrt(1 + k / n);
      return {
        week: lastWeek + k,
        value: Math.max(0, Math.round(Math.exp(mu) - 1)),
        min: Math.max(0, Math.round(Math.exp(mu - spread) - 1)),
        max: Math.max(0, Math.round(Math.exp(mu + spread) - 1))
      };
    });
  }
  function renderChart() {
    const series = seriesInScope();
    const showF = $("#toggle-forecast").checked;
    const fc = showF ? forecast(series) : [];
    const all = series.concat(fc);
    const svgEl = $("#trend-chart");
    const cw = Math.round(svgEl.getBoundingClientRect().width) || 900;
    const W = Math.max(300, cw), H = W < 560 ? 280 : 320, L = 56, R = 18, T = 18, B = 52;
    svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const maxV = Math.max(5, ...series.map((p) => p.value), ...fc.map((p) => p.max));
    const nice = Math.ceil(maxV / 20) * 20;
    const xStep = all.length > 1 ? (W - L - R) / (all.length - 1) : 0;
    const X = (i) => L + i * xStep, Y = (v) => T + (H - T - B) * (1 - v / nice);
    let g = `<title>Casos por semana epidemiológica</title><g class="grid">`;
    for (let k = 0; k <= 4; k++) {
      const v = (nice / 4) * k;
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"></line>`;
    }
    g += `</g><g class="axis">`;
    for (let k = 0; k <= 4; k++) { const v = (nice / 4) * k; g += `<text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${nf.format(v)}</text>`; }
    const every = xStep < 34 ? 2 : 1;
    all.forEach((p, i) => { if (i % every === 0 || i === all.length - 1) g += `<text x="${X(i)}" y="${H - B + 18}" text-anchor="middle">${p.week}</text>`; });
    g += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#6B7280"></line>`;
    g += `<text class="axis-title" x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">Semana epidemiológica (SE)</text>`;
    g += `<text class="axis-title" transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">Número de casos</text></g>`;
    if (fc.length) {
      const i0 = series.length - 1;
      const top = [[X(i0), Y(series[i0].value)]].concat(fc.map((p, k) => [X(i0 + 1 + k), Y(p.max)]));
      const bot = fc.map((p, k) => [X(i0 + 1 + k), Y(p.min)]).reverse().concat([[X(i0), Y(series[i0].value)]]);
      g += `<polygon points="${top.concat(bot).map((p) => p.join(",")).join(" ")}" fill="#0F766E" fill-opacity=".16" stroke="none"></polygon>`;
      g += `<polyline points="${[[X(i0), Y(series[i0].value)]].concat(fc.map((p, k) => [X(i0 + 1 + k), Y(p.value)])).map((p) => p.join(",")).join(" ")}" fill="none" stroke="#0F766E" stroke-width="3" stroke-dasharray="8 6"></polyline>`;
    }
    g += `<polyline points="${series.map((p, i) => `${X(i)},${Y(p.value)}`).join(" ")}" fill="none" stroke="#0A5C99" stroke-width="3"></polyline>`;
    series.forEach((p, i) => {
      g += `<g class="pt" tabindex="0" role="button" data-week="${p.week}" data-detail="SE ${p.week}: ${nf.format(p.value)} casos" aria-label="SE ${p.week}: ${nf.format(p.value)} casos">
        <circle class="hit" cx="${X(i)}" cy="${Y(p.value)}" r="7" fill="#0A5C99" stroke="#fff" stroke-width="2"></circle></g>`;
    });
    fc.forEach((p, k) => {
      const i = series.length + k;
      const d = `SE ${p.week} (estimación): ${nf.format(p.value)} casos, rango ${nf.format(p.min)} – ${nf.format(p.max)}`;
      g += `<g class="pt pt-fc" tabindex="0" role="button" data-week="${p.week}" data-detail="${d}" aria-label="${d}">
        <rect class="hit" x="${X(i) - 6}" y="${Y(p.value) - 6}" width="12" height="12" fill="#0F766E" stroke="#fff" stroke-width="2"></rect></g>`;
    });
    $("#trend-chart").innerHTML = g;
    const leg = $("#forecast-legend");
    leg.hidden = !fc.length;
    leg.innerHTML = fc.length ? `<span><i class="swatch" style="background:#0A5C99"></i>Casos reportados</span>
      <span><i class="swatch" style="background:repeating-linear-gradient(90deg,#0F766E 0 8px,transparent 8px 12px)"></i>Estimación referencial</span>
      <span><i class="swatch" style="background:rgba(15,118,110,.16)"></i>Rango mínimo – máximo</span>
      <span class="muted">Modelo log-lineal sobre las últimas ${Math.min(6, series.length)} semanas; no reemplaza el juicio epidemiológico.</span>` : "";
    $("#trend-table").innerHTML = `<caption class="sr-only">Casos por semana epidemiológica</caption>
      <thead><tr><th scope="col">Semana</th><th scope="col" class="num">Casos</th><th scope="col">Tipo</th></tr></thead>
      <tbody>${series.map((p) => `<tr><td>SE ${p.week}</td><td class="num">${nf.format(p.value)}</td><td>Reportado</td></tr>`).join("")}
      ${fc.map((p) => `<tr><td>SE ${p.week}</td><td class="num">${nf.format(p.value)} (${nf.format(p.min)} – ${nf.format(p.max)})</td><td>Estimación referencial</td></tr>`).join("")}</tbody>`;
  }
  const chart = $("#trend-chart");
  const showPoint = (e) => { const p = e.target.closest(".pt"); if (p) $("#chart-detail").textContent = p.dataset.detail; };
  chart.addEventListener("focusin", showPoint);
  chart.addEventListener("click", showPoint);
  chart.addEventListener("mouseover", showPoint);
  $("#toggle-forecast").addEventListener("change", () => {
    renderChart();
    $("#chart-detail").textContent = $("#toggle-forecast").checked ?
      "Estimación referencial de 4 semanas visible (línea discontinua)." : "Selecciona un punto del gráfico.";
  });

  /* ---------------- HU-13 · Gravedad ---------------- */
  function renderSeverity() {
    let alarm = 0, severe = 0, total = 0;
    zonesInScope().forEach((z) => {
      const c = zoneStats(z).cases;
      total += c; alarm += Math.round(c * z.severity.alarm); severe += Math.round(c * z.severity.severe);
    });
    const without = total - alarm - severe;
    const pct = (v) => (total ? (v / total) * 100 : 0);
    const rows = [
      ["Sin signos de alarma", without, "#1B7F3B", "sev-sin"],
      ["Con signos de alarma", alarm, "#F5B700", "sev-alarma"],
      ["Dengue grave", severe, "#B42318", "sev-grave"]
    ];
    $("#severity").innerHTML = rows.map(([label, v, c, id]) => `
      <li class="sev-row" id="${id}">
        <div class="sev-head"><span>${label}</span><span>${nf.format(v)} casos · ${nf1.format(pct(v))} %</span></div>
        <div class="sev-bar" aria-hidden="true"><div class="sev-fill" style="width:${pct(v)}%;background:${c}"></div></div>
      </li>`).join("");
  }

  /* ---------------- HU-14 · HU-15 · Fuentes y calidad ---------------- */
  const QUALITY = {
    completo: { label: "Completo", icon: "circle-check" },
    parcial: { label: "Parcial", icon: "circle-alert" },
    inconsistente: { label: "Inconsistente", icon: "octagon-alert" }
  };
  function renderSources() {
    $("#sources").innerHTML = SOURCES.map((s) => {
      const q = QUALITY[s.quality];
      const stale = (DEMO_NOW - new Date(s.updated)) / 36e5 > 48;
      return `<li class="source" data-source="${esc(s.name)}">
        <div class="source-top"><strong>${esc(s.name)}</strong>${tag(s.quality, q.icon, q.label)}</div>
        <p>Última actualización: ${fmtDate(s.updated)} · Aporta ${s.share} % de los registros</p>
        ${stale ? `<p>${tag("stale", "clock", "Datos desactualizados")} <span class="muted">Más de 48 horas sin actualizarse.</span></p>` : ""}
        ${s.reason ? `<p class="muted"><strong>Motivo:</strong> ${esc(s.reason)}</p>` : ""}
      </li>`;
    }).join("");
  }

  /* HU-17 (complementaria) · Descargar CSV */
  $("#export-csv").addEventListener("click", () => {
    const a = idx(filters.from), b = idx(filters.to);
    const rows = [["zona", "provincia", "semana_epidemiologica", "casos", "fuente"]];
    zonesInScope().forEach((z) => WEEKS.slice(a, b + 1).forEach((w) =>
      rows.push([z.name, PROVINCES.find((p) => p.id === z.province).name, w, z.cases[idx(w)], "NotiWeb–MINSA; EsSalud; privados (demo)"])));
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `epinexo-casos-SE${filters.from}-SE${filters.to}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Descarga generada");
    } catch (e) { toast("No se pudo generar la descarga en este navegador"); }
  });

  /* ---------------- HU-29 · Vista ejecutiva ---------------- */
  function renderExec() {
    const zs = zonesInScope(), b = idx(filters.to);
    const last = sum(zs.map((z) => z.cases[b])), prev = b > 0 ? sum(zs.map((z) => z.cases[b - 1])) : 0;
    const varPct = prev ? ((last - prev) / prev) * 100 : 0;
    const critical = zs.filter((z) => zoneStats(z).level.id === "critico").length;
    const facs = facilitiesInScope();
    const total = sum(facs.map((f) => f.total)), occ = sum(facs.map((f) => f.occupied));
    const inField = state.brigades.filter((x) => x.status === "en-campo").length;
    const cards = [
      ["exec-casos", "#ranking-card", "activity", "Casos de la SE " + filters.to, nf.format(last),
        `${varPct >= 0 ? "Aumentan" : "Disminuyen"} ${nf.format(Math.abs(Math.round(varPct)))} % frente a la semana anterior`, "Ver ranking"],
      ["exec-criticas", "#ranking-card", "octagon-alert", "Zonas en riesgo crítico", String(critical),
        critical ? "Requieren intervención prioritaria" : "Ninguna zona en nivel crítico", "Ver zonas"],
      ["exec-camas", "#beds-card", "bed-double", "Camas disponibles", nf.format(total - occ),
        `Ocupación ${nf.format(Math.round(total ? (occ / total) * 100 : 0))} % de ${nf.format(total)} camas`, "Ver camas"],
      ["exec-brigadas", "#interventions-card", "users", "Brigadas en campo", `${inField} / ${state.brigades.length}`,
        `${state.brigades.filter((x) => x.status === "disponible").length} disponibles para asignar`, "Ver intervenciones"]
    ];
    $("#exec-strip").innerHTML = cards.map(([id, href, ic, t, v, sub, link]) => `
      <li><a class="kpi" id="${id}" href="${href}" data-focus="${href}">
        <span class="kpi-title">${icon(ic)}${t}</span>
        <span class="kpi-value">${v}</span>
        <span class="kpi-unit">${sub}</span>
        <span class="kpi-link">${link}${icon("arrow-right")}</span></a></li>`).join("");
  }
  $("#exec-strip").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-focus]");
    if (!a) return;
    e.preventDefault();
    const target = $(a.dataset.focus);
    target.scrollIntoView({ block: "start" }); target.focus();
  });

  /* ---------------- HU-25 · Ranking ---------------- */
  function rankingRows() {
    const zs = zonesInScope().map((z) => ({ z, s: zoneStats(z) }));
    const maxInc = Math.max(1, ...ZONES.map((z) => zoneStats(z).inc4));
    zs.forEach((r) => {
      const g = Math.max(0, Math.min(100, r.s.growth));
      r.score = Math.round(0.5 * (r.s.inc4 / maxInc) * 100 + 0.3 * g + 0.2 * r.s.occupancy);
    });
    const key = $("#ranking-sort").value;
    const sorters = { score: (a, b) => b.score - a.score, cases: (a, b) => b.s.last4 - a.s.last4, occupancy: (a, b) => b.s.occupancy - a.s.occupancy };
    return zs.sort(sorters[key]);
  }
  function renderRanking() {
    const rows = rankingRows();
    $("#ranking-table").innerHTML = `<caption class="sr-only">Ranking de zonas prioritarias</caption>
      <thead><tr><th scope="col" class="num">N.°</th><th scope="col">Zona</th><th scope="col" class="num">Puntaje</th>
      <th scope="col">Riesgo</th><th scope="col" class="num">Casos (4 sem.)</th><th scope="col" class="num">Ocupación</th><th scope="col">Factores</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr data-rank-zone="${r.z.id}">
        <td class="num" data-label="N.°">${i + 1}</td>
        <td data-label="Zona"><strong>${esc(r.z.name)}</strong></td>
        <td class="num" data-label="Puntaje" data-score>${r.score}</td>
        <td data-label="Riesgo">${tag(r.s.level.id, r.s.level.icon, r.s.level.label)}</td>
        <td class="num" data-label="Casos (4 sem.)" data-cases>${r.s.last4}</td>
        <td class="num" data-label="Ocupación" data-occ>${nf.format(Math.round(r.s.occupancy))} %</td>
        <td class="factors" data-label="Factores">Incidencia ${nf1.format(r.s.inc4)}/100 000 · Crecimiento ${r.s.growth >= 0 ? "+" : ""}${nf.format(Math.round(r.s.growth))} % · Ocupación ${nf.format(Math.round(r.s.occupancy))} %</td>
      </tr>`).join("")}</tbody>`;
  }
  $("#ranking-sort").addEventListener("change", renderRanking);

  /* ---------------- HU-23 · Camas ---------------- */
  function renderBeds() {
    const facs = facilitiesInScope();
    $("#beds-table").innerHTML = `<caption class="sr-only">Camas por establecimiento</caption>
      <thead><tr><th scope="col">Establecimiento</th><th scope="col">Zona</th><th scope="col" class="num">Totales</th>
      <th scope="col" class="num">Ocupadas</th><th scope="col" class="num">Disponibles</th><th scope="col">Ocupación</th></tr></thead>
      <tbody>${facs.map((f) => {
        const pct = Math.round((f.occupied / f.total) * 100);
        return `<tr data-facility="${esc(f.name)}">
          <td data-label="Establecimiento"><strong>${esc(f.name)}</strong></td>
          <td data-label="Zona">${esc(zoneById(f.zone).name)}</td>
          <td class="num" data-label="Totales">${f.total}</td>
          <td class="num" data-label="Ocupadas">${f.occupied}</td>
          <td class="num" data-label="Disponibles">${f.total - f.occupied}</td>
          <td data-label="Ocupación">${pct} % ${pct >= 85 ? tag("saturacion", "triangle-alert", "Saturación") : ""}</td></tr>`;
      }).join("")}</tbody>`;
  }

  /* ---------------- HU-24 · HU-26 · Stock y asignación de insumos ---------------- */
  function renderStock() {
    $("#stock-list").innerHTML = state.stock.map((s) => `
      <li class="stock-item" data-stock="${s.id}">
        <span class="stock-name">${esc(s.name)}</span>
        <span><span data-qty>${nf.format(s.qty)}</span> ${esc(s.unit)} · mínimo ${nf.format(s.min)}
        ${s.qty < s.min ? tag("stock-critico", "triangle-alert", "Stock crítico") : tag("ok", "circle-check", "Suficiente")}</span>
      </li>`).join("");
    const sel = $("#r-item"), cur = sel.value;
    sel.innerHTML = `<option value="">Selecciona un insumo</option>` +
      state.stock.map((s) => `<option value="${s.id}">${esc(s.name)} (${nf.format(s.qty)} ${esc(s.unit)})</option>`).join("");
    sel.value = cur;
  }
  const zoneOptions = (placeholder) => `<option value="">${placeholder}</option>` +
    ZONES.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join("");
  $("#r-zone").innerHTML = zoneOptions("Selecciona una zona");
  $("#b-zone").innerHTML = zoneOptions("Selecciona una zona");

  $("#resource-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const zone = $("#r-zone"), item = $("#r-item"), qty = $("#r-qty");
    const st = $("#resource-status");
    const s = state.stock.find((x) => x.id === item.value);
    const q = Number(qty.value);
    let ok = setError(zone, $("#r-zone-err"), zone.value ? "" : "Elige una zona");
    ok = setError(item, $("#r-item-err"), item.value ? "" : "Elige un insumo") && ok;
    let qMsg = "";
    if (!qty.value || !Number.isInteger(q) || q <= 0) qMsg = "Ingresa una cantidad entera mayor a 0";
    else if (s && q > s.qty) qMsg = `La cantidad supera el stock disponible (${nf.format(s.qty)})`;
    ok = setError(qty, $("#r-qty-err"), qMsg) && ok;
    if (!ok) { setStatus(st, "err", "No se registró la asignación. Revisa los campos marcados."); return; }
    s.qty -= q;
    state.assignments.push({ zone: zone.value, item: s.id, qty: q, at: new Date().toISOString() });
    save();
    setStatus(st, "ok", `Asignación registrada: ${nf.format(q)} ${s.unit} de ${s.name} para ${zoneById(zone.value).name}. Stock restante: ${nf.format(s.qty)}.`);
    qty.value = "";
    renderStock();
  });

  /* ---------------- HU-30 · Asignación de brigadas ---------------- */
  const BRIGADE_STATUS = { disponible: "Disponible", "en-campo": "En campo", asignada: "Asignada", descanso: "En descanso" };
  function renderBrigadeOptions() {
    const sel = $("#b-brigade"), cur = sel.value;
    const avail = state.brigades.filter((b) => b.status === "disponible");
    sel.innerHTML = `<option value="">${avail.length ? "Selecciona una brigada" : "No hay brigadas disponibles"}</option>` +
      avail.map((b) => `<option value="${b.id}">${esc(b.name)} · ${esc(b.leader)}</option>`).join("");
    if (avail.some((b) => b.id === cur)) sel.value = cur;
    $("#m-to").innerHTML = state.brigades.map((b) => `<option value="${b.id}">${esc(b.name)} · ${esc(b.leader)}</option>`).join("");
    if (!$("#m-to").dataset.init) { $("#m-to").value = "B03"; $("#m-to").dataset.init = "1"; }
  }
  $("#brigade-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const zone = $("#b-zone"), brig = $("#b-brigade"), action = $("#b-action"), st = $("#brigade-status");
    const priority = ($('input[name="b-priority"]:checked') || {}).value || "alta";
    let ok = setError(zone, $("#b-zone-err"), zone.value ? "" : "Elige una zona");
    ok = setError(brig, $("#b-brigade-err"), brig.value ? "" : "Elige una brigada disponible") && ok;
    ok = setError(action, $("#b-action-err"), action.value ? "" : "Elige la acción requerida") && ok;
    if (!ok) { setStatus(st, "err", "No se creó la asignación. Revisa los campos marcados."); return; }
    const b = brigadeById(brig.value), z = zoneById(zone.value);
    const intId = nextId("INT");
    const now = new Date().toISOString();
    state.interventions.unshift({ id: intId, zone: z.id, brigade: b.id, status: "pendiente", houses: 0, priority, action: action.value, updated: now });
    b.status = "asignada";
    let msg = `${b.name} asignada a ${z.name} (${PRIORITY[priority].label}). Intervención ${intId} creada como «Pendiente».`;
    if (b.id === "B03") {
      const alert = { id: nextId("ALR"), intervention: intId, zone: z.id, priority, action: action.value, received: now, status: "pendiente" };
      if (state.offline) {
        state.pendingDelivery.push(alert);
        msg += " La app de la brigada está sin conexión: la alerta queda pendiente de entrega.";
      } else {
        state.alerts.push(alert);
        msg += " La alerta llegó a la app de la Brigada 03.";
      }
    } else {
      msg += ` Alerta enviada a la app de la ${b.name}.`;
    }
    save();
    setStatus(st, "ok", msg);
    $("#brigade-form").reset(); [zone, brig, action].forEach((el) => el.removeAttribute("aria-invalid"));
    renderAll();
  });

  /* ---------------- HU-31 · Seguimiento de intervenciones ---------------- */
  function renderInterventions() {
    const f = $("#int-filter").value;
    const list = state.interventions.filter((i) => f === "todas" || i.status === f);
    $("#int-table").innerHTML = `<caption class="sr-only">Intervenciones</caption>
      <thead><tr><th scope="col">Código</th><th scope="col">Zona</th><th scope="col">Brigada</th><th scope="col">Prioridad</th>
      <th scope="col">Estado</th><th scope="col" class="num">Viviendas inspeccionadas</th><th scope="col">Última actualización</th></tr></thead>
      <tbody>${list.length ? list.map((i) => {
        const s = STATUS[i.status], p = PRIORITY[i.priority];
        return `<tr data-int="${i.id}" data-status="${i.status}">
          <td data-label="Código">${i.id}</td>
          <td data-label="Zona"><strong>${esc(zoneById(i.zone).name)}</strong></td>
          <td data-label="Brigada">${esc(brigadeById(i.brigade).name)}</td>
          <td data-label="Prioridad">${tag(i.priority === "alta" ? "alta" : i.priority, p.icon, p.label)}</td>
          <td data-label="Estado" data-state>${tag(i.status, s.icon, s.label)}</td>
          <td class="num" data-label="Viviendas" data-houses>${i.houses}</td>
          <td data-label="Actualizado">${fmtDate(i.updated)}</td></tr>`;
      }).join("") : `<tr><td colspan="7">No hay intervenciones con el estado seleccionado.</td></tr>`}</tbody>`;
  }
  $("#int-filter").addEventListener("change", renderInterventions);

  /* ---------------- HU-44 · Mensajes (y HU-46 complementaria) ---------------- */
  $("#message-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const to = $("#m-to"), text = $("#m-text"), st = $("#message-status");
    if (!setError(text, $("#m-text-err"), text.value.trim() ? "" : "Escribe un mensaje antes de enviar")) {
      setStatus(st, "err", "El mensaje no se envió."); text.focus(); return;
    }
    state.messages.unshift({ id: nextId("MSG"), to: to.value, text: text.value.trim(), sent: new Date().toISOString() });
    save(); text.value = "";
    setStatus(st, "ok", `Mensaje enviado a la ${brigadeById(to.value).name}.`);
    renderMessages();
  });
  function renderMessages() {
    $("#message-history").innerHTML = state.messages.length ? state.messages.map((m) => `
      <li class="message" data-msg="${m.id}">
        <div class="message-top"><strong>Para: ${esc(brigadeById(m.to).name)}</strong>
          ${m.readAt ? tag("ok", "check", "Leído " + fmtDate(m.readAt)) : tag("info", "send", "Enviado")}</div>
        <p>${esc(m.text)}</p><p class="muted small">${fmtDate(m.sent)}</p></li>`).join("")
      : `<li class="empty">Aún no hay mensajes.</li>`;
    const inbox = state.messages.filter((m) => m.to === "B03");
    $("#field-inbox").innerHTML = inbox.length ? inbox.map((m) => `
      <li class="message" data-inbox="${m.id}">
        <div class="message-top"><strong>Coordinación DIRESA</strong>${m.readAt ? "" : tag("urgente", "bell", "Nuevo")}</div>
        <p>${esc(m.text)}</p><p class="muted small">${fmtDate(m.sent)}</p>
        ${m.readAt ? `<p class="muted small">Leído el ${fmtDate(m.readAt)}</p>` :
          `<div><button type="button" class="btn btn-secondary btn-sm" data-read="${m.id}">${icon("check")}Marcar como leído</button></div>`}
      </li>`).join("") : `<li class="empty">No tienes mensajes del coordinador.</li>`;
  }
  $("#field-inbox").addEventListener("click", (e) => {
    const b = e.target.closest("[data-read]");
    if (!b) return;
    const m = state.messages.find((x) => x.id === b.dataset.read);
    m.readAt = new Date().toISOString(); save(); renderMessages(); toast("Mensaje marcado como leído");
  });

  /* ---------------- HU-33 · Incidencias para el coordinador ---------------- */
  function renderIncidents() {
    const received = state.incidents.slice().reverse();
    const open = received.filter((i) => !i.attended).length;
    $("#incident-badge").textContent = open;
    const tb = $("#incident-badge-tab");
    tb.hidden = !open; tb.textContent = open; tb.setAttribute("aria-label", `${open} incidencias sin atender`);
    $("#incident-list").innerHTML = received.length ? received.map((i) => `
      <li class="incident" data-incident="${i.id}">
        <div class="incident-top"><strong>${esc(i.type)} · ${esc(zoneById(i.zone).name)}</strong>
          ${i.attended ? tag("ok", "circle-check", "Atendida") : tag("alta", "triangle-alert", "Sin atender")}</div>
        <p>${esc(i.desc)}</p>
        <p class="muted small">${esc(brigadeById(i.brigade).name)} · ${fmtDate(i.at)}</p>
        ${i.attended ? "" : `<div><button type="button" class="btn btn-secondary btn-sm" data-attend="${i.id}">${icon("check")}Marcar como atendida</button></div>`}
      </li>`).join("") : `<li class="empty">No hay incidencias reportadas.</li>`;
  }
  $("#open-incidents").addEventListener("click", () => {
    const p = $("#incidents-panel"), btn = $("#open-incidents");
    p.hidden = !p.hidden; btn.setAttribute("aria-expanded", String(!p.hidden));
  });
  $("#incident-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-attend]");
    if (!b) return;
    state.incidents.find((x) => x.id === b.dataset.attend).attended = true;
    save(); renderIncidents(); toast("Incidencia marcada como atendida");
    $("#open-incidents").focus();
  });

  /* ---------------- App de campo: HU-34 · HU-35 · HU-36 · HU-38 · HU-40 ---------------- */
  const appEl = $("#field-app");
  function processItem(item) {
    const now = new Date().toISOString();
    if (item.type === "accept" || item.type === "reject" || item.type === "complete") {
      const alert = state.alerts.find((a) => a.id === item.alert);
      const int = alert && state.interventions.find((i) => i.id === alert.intervention);
      const b = brigadeById("B03");
      if (int && item.type === "accept") { int.status = "en-curso"; int.updated = item.at || now; b.status = "en-campo"; }
      if (int && item.type === "complete") { int.status = "completada"; int.updated = item.at || now; b.status = "disponible"; }
      if (int && item.type === "reject") { int.status = "pendiente"; int.updated = item.at || now; int.note = item.reason; b.status = "disponible"; }
    }
    if (item.type === "inspection") {
      state.inspections.push(item.data);
      const int = state.interventions.find((i) => i.brigade === "B03" && i.zone === item.data.zone && i.status !== "completada");
      if (int) { int.houses += 1; int.updated = item.data.at; if (int.status === "pendiente") int.status = "en-curso"; }
    }
    if (item.type === "incident") state.incidents.push(item.data);
  }
  function dispatch(item) {
    if (state.offline) { state.outbox.push(item); return false; }
    processItem(item); return true;
  }
  function syncNow() {
    const n = state.outbox.length;
    state.outbox.forEach(processItem); state.outbox = [];
    const delivered = state.pendingDelivery.length;
    state.alerts.push(...state.pendingDelivery); state.pendingDelivery = [];
    save(); renderAll();
    const parts = [];
    if (n) parts.push(`Se sincronizaron ${n} ${n === 1 ? "registro" : "registros"}`);
    if (delivered) parts.push(`${delivered} ${delivered === 1 ? "alerta nueva recibida" : "alertas nuevas recibidas"}`);
    if (parts.length) toast(parts.join(" · "));
    return n;
  }
  function setOffline(off) {
    state.offline = off; $("#toggle-offline").checked = off; save();
    if (!off) syncNow(); else renderAll();
  }
  $("#toggle-offline").addEventListener("change", (e) => setOffline(e.target.checked));
  window.addEventListener("offline", () => setOffline(true));
  window.addEventListener("online", () => setOffline(false));

  $("#toggle-legibility").addEventListener("change", (e) => {
    state.highLegibility = e.target.checked; save();
    appEl.classList.toggle("hi-leg", state.highLegibility);
  });

  function renderBanner() {
    const banner = $("#conn-banner"), saved = fieldAlerts().length;
    const pending = state.outbox.length;
    if (state.offline) {
      banner.className = "conn-banner conn-offline";
      banner.innerHTML = `${icon("wifi-off")}<span>Sin conexión · ${saved} alertas guardadas en este dispositivo${pending ? ` · ${pending} pendientes de sincronizar` : ""}</span>`;
    } else {
      banner.className = "conn-banner conn-online";
      banner.innerHTML = `${icon("wifi")}<span>En línea · Todo sincronizado</span>`;
    }
    $("#pending-count").textContent = pending ? `Registros pendientes de sincronizar: ${pending}` : "";
  }
  function fieldAlerts() {
    return state.alerts.filter((a) => a.status === "pendiente" || a.status === "aceptada")
      .sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || new Date(b.received) - new Date(a.received));
  }
  function miniMap(zoneId) {
    const z = zoneById(zoneId);
    return `<svg class="mini-map" viewBox="0 0 640 400" role="img" aria-label="Ubicación de ${esc(z.name)} en el mapa de la región">
      ${ZONES.map((o) => `<polygon points="${o.shape}" fill="${o.id === zoneId ? "#0A5C99" : "#D1D5DB"}" stroke="#fff" stroke-width="3"></polygon>`).join("")}
      <g transform="translate(${z.label[0] - 18} ${z.label[1] - 44}) scale(1.5)" fill="#B42318" stroke="#fff" stroke-width="1.5">
        <path d="M12 0C6.5 0 2 4.3 2 9.6 2 17 12 26 12 26s10-9 10-16.4C22 4.3 17.5 0 12 0z"></path><circle cx="12" cy="9.5" r="3.5" fill="#fff"></circle></g></svg>`;
  }
  const REJECT_REASONS = ["Otra intervención en curso", "Falta de personal", "Falta de insumos", "Zona inaccesible"];
  function renderFieldAlerts() {
    const list = fieldAlerts();
    $("#field-alerts").innerHTML = list.length ? list.map((a) => {
      const z = zoneById(a.zone), p = PRIORITY[a.priority];
      const s = zoneStats(z, 29, 40);
      const queued = state.outbox.some((o) => o.alert === a.id);
      return `<li class="field-alert p-${a.priority}" data-field-alert="${a.id}" data-priority="${a.priority}">
        <div class="alert-row">${tag(a.priority, p.icon, p.label)}${a.status === "aceptada" ? tag("ok", "check", "Aceptada") : ""}${queued ? tag("pendiente", "refresh-cw", "Pendiente de sincronizar") : ""}</div>
        <h5>${esc(z.name)}</h5>
        <dl>
          <dt>Acción</dt><dd>${esc(a.action)}</dd>
          <dt>Referencia</dt><dd>${esc(z.ref)}</dd>
          <dt>Coordenadas</dt><dd>${esc(z.coords)}</dd>
          <dt>Casos</dt><dd>${s.last4} en las últimas 4 semanas · riesgo ${s.level.label.toLowerCase()}</dd>
          <dt>Recibida</dt><dd>${fmtDate(a.received)}</dd>
        </dl>
        ${miniMap(a.zone)}
        ${a.status === "pendiente" ? `
          <div class="alert-actions">
            <button type="button" class="btn btn-primary" data-accept="${a.id}">${icon("check")}Aceptar</button>
            <button type="button" class="btn btn-secondary" data-reject-open="${a.id}" aria-expanded="false" aria-controls="rj-${a.id}">${icon("x")}No disponible</button>
          </div>
          <div class="reject-box" id="rj-${a.id}" hidden>
            <label for="rs-${a.id}">Motivo <span class="req" aria-hidden="true">*</span></label>
            <select id="rs-${a.id}" aria-describedby="rse-${a.id}"><option value="">Elige un motivo</option>${REJECT_REASONS.map((r) => `<option>${r}</option>`).join("")}</select>
            <p class="field-error" id="rse-${a.id}"></p>
            <button type="button" class="btn btn-danger" data-reject="${a.id}">Confirmar «No disponible»</button>
          </div>` : `
          <p class="muted small">Aceptada el ${fmtDate(a.acceptedAt)}</p>
          <div class="alert-actions"><button type="button" class="btn btn-secondary" data-complete="${a.id}">${icon("circle-check")}Marcar intervención como completada</button></div>`}
      </li>`;
    }).join("") : `<li class="empty">No tienes alertas pendientes.</li>`;
    // Opciones de zona para registro e incidencias
    const zones = [...new Set(list.map((a) => a.zone))];
    const opts = (zones.length ? zones : ZONES.map((z) => z.id)).map((id) => `<option value="${id}">${esc(zoneById(id).name)}</option>`).join("");
    const iz = $("#i-zone"), cur = iz.value;
    iz.innerHTML = `<option value="">Selecciona la zona</option>` + opts; if (cur) iz.value = cur;
    const inz = $("#inc-zone"), cur2 = inz.value;
    const rest = ZONES.filter((z) => !zones.includes(z.id));
    inz.innerHTML = opts + (zones.length ? rest.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join("") : "");
    if (cur2) inz.value = cur2;
  }
  $("#field-alerts").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const now = new Date().toISOString();
    if (t.dataset.accept) {
      const a = state.alerts.find((x) => x.id === t.dataset.accept);
      a.status = "aceptada"; a.acceptedAt = now;
      const sent = dispatch({ type: "accept", alert: a.id, at: now });
      save(); renderAll();
      toast(sent ? `Asignación aceptada: el coordinador ya ve ${zoneById(a.zone).name} «En curso»` : "Asignación aceptada · se notificará al recuperar la conexión");
      const card = $(`[data-field-alert="${a.id}"] [data-complete]`); if (card) card.focus();
    }
    if (t.dataset.rejectOpen) {
      const box = $(`#rj-${t.dataset.rejectOpen}`); box.hidden = !box.hidden;
      t.setAttribute("aria-expanded", String(!box.hidden)); if (!box.hidden) $("select", box).focus();
    }
    if (t.dataset.reject) {
      const id = t.dataset.reject, sel = $(`#rs-${id}`);
      if (!setError(sel, $(`#rse-${id}`), sel.value ? "" : "Elige un motivo")) { sel.focus(); return; }
      const a = state.alerts.find((x) => x.id === id);
      a.status = "rechazada"; a.reason = sel.value;
      dispatch({ type: "reject", alert: id, reason: sel.value, at: now });
      save(); renderAll(); toast(`Asignación rechazada: ${sel.value}`);
    }
    if (t.dataset.complete) {
      const a = state.alerts.find((x) => x.id === t.dataset.complete);
      a.status = "completada";
      dispatch({ type: "complete", alert: a.id, at: now });
      save(); renderAll(); toast("Intervención marcada como completada");
    }
  });

  /* HU-39 · HU-40 · Registro de inspección */
  $("#inspection-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const zone = $("#i-zone"), house = $("#i-house"), result = $("#i-result"), st = $("#inspection-status");
    let ok = setError(zone, $("#i-zone-err"), zone.value ? "" : "Elige la zona");
    ok = setError(house, $("#i-house-err"), house.value.trim() ? "" : "Ingresa el código de vivienda") && ok;
    ok = setError(result, $("#i-result-err"), result.value ? "" : "Elige el resultado de la inspección") && ok;
    if (!ok) { setStatus(st, "err", "La inspección no se guardó. Revisa los campos marcados."); const first = $('[aria-invalid="true"]', e.target); if (first) first.focus(); return; }
    const data = {
      id: nextId("INS"), zone: zone.value, house: house.value.trim(), result: result.value,
      containers: Number($("#i-containers").value) || 0,
      actions: $$('input[name="i-actions"]:checked').map((c) => c.value), at: new Date().toISOString()
    };
    const sent = dispatch({ type: "inspection", data });
    save();
    if (sent) setStatus(st, "ok", `Inspección guardada y enviada (vivienda ${data.house}). Puedes registrar la siguiente vivienda.`);
    else setStatus(st, "warn", `Inspección guardada en el dispositivo (vivienda ${data.house}) · Pendiente de sincronizar.`);
    house.value = ""; result.value = ""; $("#i-containers").value = "0";
    $$('input[name="i-actions"]').forEach((c) => { c.checked = false; });
    renderAll(); house.focus();
  });

  /* HU-41 · Reporte de incidencias */
  $("#incident-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const typeEl = $('input[name="inc-type"]:checked'), desc = $("#inc-desc"), st = $("#incident-status");
    const typeErr = $("#inc-type-err");
    typeErr.textContent = typeEl ? "" : "Elige el tipo de incidencia";
    const firstRadio = $('input[name="inc-type"]');
    if (typeEl) firstRadio.removeAttribute("aria-invalid"); else firstRadio.setAttribute("aria-invalid", "true");
    const okDesc = setError(desc, $("#inc-desc-err"), desc.value.trim().length >= 10 ? "" : "Describe la incidencia (mínimo 10 caracteres)");
    if (!typeEl || !okDesc) { setStatus(st, "err", "La incidencia no se envió. Revisa los campos marcados."); (typeEl ? desc : firstRadio).focus(); return; }
    const data = { id: nextId("INC"), type: typeEl.value, zone: $("#inc-zone").value, desc: desc.value.trim(), brigade: "B03", at: new Date().toISOString(), attended: false };
    const sent = dispatch({ type: "incident", data });
    save();
    if (sent) setStatus(st, "ok", "Incidencia enviada al coordinador.");
    else setStatus(st, "warn", "Incidencia guardada en el dispositivo · se enviará al recuperar la conexión.");
    e.target.reset(); renderAll();
  });

  /* ---------------- HU-48 · Formulario de contacto ---------------- */
  $("#c-region").innerHTML = `<option value="">Selecciona tu región</option>` + PERU_REGIONS.map((r) => `<option>${r}</option>`).join("");
  const contactRules = {
    "c-name": (v) => (v.trim().length >= 3 ? "" : "Ingresa tu nombre completo"),
    "c-email": (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Ingresa un correo válido"),
    "c-phone": (v) => (/^9\d{8}$/.test(v.replace(/\s/g, "")) ? "" : "Ingresa un celular de 9 dígitos que empiece con 9"),
    "c-region": (v) => (v ? "" : "Selecciona tu región"),
    "c-msg": (v) => (v.trim().length >= 10 ? "" : "Escribe un mensaje de al menos 10 caracteres")
  };
  function validateContactField(id) {
    const el = document.getElementById(id);
    return setError(el, document.getElementById(`${id}-err`), contactRules[id](el.value));
  }
  Object.keys(contactRules).forEach((id) => {
    document.getElementById(id).addEventListener("blur", (e) => { if (e.target.value) validateContactField(id); });
  });
  $("#contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const summary = $("#contact-summary"), st = $("#contact-status");
    const errors = Object.keys(contactRules).filter((id) => !validateContactField(id));
    if (errors.length) {
      setStatus(st, "", "");
      summary.hidden = false;
      summary.innerHTML = `<strong>Revisa ${errors.length === 1 ? "1 campo" : errors.length + " campos"} antes de enviar:</strong><ul>${errors.map((id) =>
        `<li><a href="#${id}">${esc(document.getElementById(`${id}-err`).textContent)}</a></li>`).join("")}</ul>`;
      summary.focus();
      return;
    }
    summary.hidden = true; summary.innerHTML = "";
    try {
      const sent = JSON.parse(localStorage.getItem("epinexo-solicitudes") || "[]");
      sent.push({ name: $("#c-name").value.trim(), region: $("#c-region").value, at: new Date().toISOString() });
      localStorage.setItem("epinexo-solicitudes", JSON.stringify(sent));
    } catch (err) { /* sin almacenamiento */ }
    e.target.reset();
    setStatus(st, "ok", "Solicitud enviada. Te contactaremos en un máximo de 2 días hábiles.");
  });
  $("#contact-summary").addEventListener("click", (e) => {
    const a = e.target.closest("a"); if (!a) return;
    e.preventDefault(); document.querySelector(a.getAttribute("href")).focus();
  });

  /* ---------------- Reiniciar demo ---------------- */
  $("#reset-demo").addEventListener("click", () => {
    state = clone(INITIAL_STATE); state.outbox = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
    $("#toggle-offline").checked = false; $("#toggle-legibility").checked = false; appEl.classList.remove("hi-leg");
    $$(".form-status").forEach((s) => { s.innerHTML = ""; });
    renderAll(); toast("Demo reiniciada con los datos iniciales");
  });

  /* ---------------- Render general ---------------- */
  function renderAll() {
    renderChips(); renderKPIs(); renderMap(); renderAlerts(); renderChart(); renderSeverity(); renderSources();
    renderExec(); renderRanking(); renderBeds(); renderStock(); renderBrigadeOptions(); renderInterventions();
    renderMessages(); renderIncidents(); renderFieldAlerts(); renderBanner();
  }
  $("#toggle-offline").checked = state.offline;
  $("#toggle-legibility").checked = state.highLegibility;
  appEl.classList.toggle("hi-leg", state.highLegibility);
  renderAll();
  // Contenedores con desplazamiento accesibles por teclado (WCAG 2.1.1)
  $$(".table-scroll").forEach((d) => {
    const cap = $("caption", d);
    d.tabIndex = 0; d.setAttribute("role", "region");
    d.setAttribute("aria-label", cap ? cap.textContent : "Tabla de datos");
  });
  let rzTimer;
  window.addEventListener("resize", () => { clearTimeout(rzTimer); rzTimer = setTimeout(() => { renderMap(); renderChart(); }, 150); });
  // Al mostrar una pestaña, se recalculan los componentes que dependen del ancho
  $$('[role="tab"]').forEach((t) => t.addEventListener("click", () => { renderMap(); renderChart(); }));

  // Expuesto solo para las pruebas de aceptación automatizadas
  window.EpiNexo = { state: () => state, filters, zoneStats, syncNow };
})();
