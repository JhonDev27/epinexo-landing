/* =========================================================
   EpiNexo · Datos de demostración (FICTICIOS)
   Región de demostración «Valle Claro». No corresponden a
   personas ni establecimientos reales. Se usan solo para
   evidenciar las historias de usuario en la landing page.
   ========================================================= */
"use strict";

const DEMO_NOW = new Date("2026-10-07T08:30:00-05:00");
const WEEKS = [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];

const PROVINCES = [
  { id: "ribera", name: "Ribera" },
  { id: "centro", name: "Centro" },
  { id: "altos", name: "Altos" }
];

/* Casos semanales SE 29–40 por zona (distrito) */
const ZONES = [
  { id: "ribera-norte", name: "Ribera Norte", province: "ribera", population: 48000,
    cases: [8, 9, 11, 10, 13, 15, 18, 21, 24, 29, 35, 48], deaths: [37, 39, 40],
    severity: { alarm: 0.17, severe: 0.02 }, ref: "Mz. C, A.H. Los Pescadores (frente al mercado)",
    coords: "-5.1832, -80.6421",
    shape: "60,40 250,30 270,120 180,150 70,130", label: [165, 88] },
  { id: "puerto-palma", name: "Puerto Palma", province: "ribera", population: 52000,
    cases: [10, 11, 12, 14, 15, 17, 19, 22, 25, 27, 30, 41], deaths: [38, 40],
    severity: { alarm: 0.15, severe: 0.015 }, ref: "Jr. Las Gaviotas cdra. 4, sector muelle",
    coords: "-5.1764, -80.6188",
    shape: "250,30 400,40 390,140 270,120", label: [328, 84] },
  { id: "ribera-sur", name: "Ribera Sur", province: "ribera", population: 36000,
    cases: [3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9], deaths: [39],
    severity: { alarm: 0.13, severe: 0.01 }, ref: "Calle Los Sauces, junto al colegio N.° 14",
    coords: "-5.1975, -80.6467",
    shape: "70,130 180,150 200,230 90,240", label: [136, 190] },
  { id: "las-americas", name: "Las Américas", province: "centro", population: 61000,
    cases: [6, 6, 7, 7, 8, 8, 9, 9, 10, 9, 10, 11], deaths: [36],
    severity: { alarm: 0.14, severe: 0.01 }, ref: "Av. Las Américas 1200, losa deportiva",
    coords: "-5.1910, -80.6302",
    shape: "180,150 270,120 390,140 370,240 200,230", label: [284, 186] },
  { id: "centro-historico", name: "Centro Histórico", province: "centro", population: 40000,
    cases: [2, 3, 3, 3, 3, 4, 3, 4, 4, 4, 5, 4], deaths: [],
    severity: { alarm: 0.12, severe: 0 }, ref: "Plaza de Armas, cuadra 2 de Jr. Lima",
    coords: "-5.2003, -80.6265",
    shape: "200,230 370,240 350,330 220,330", label: [285, 284] },
  { id: "nuevo-horizonte", name: "Nuevo Horizonte", province: "centro", population: 33000,
    cases: [1, 2, 2, 2, 2, 3, 2, 3, 3, 2, 3, 4], deaths: [],
    severity: { alarm: 0.12, severe: 0 }, ref: "A.H. Nuevo Horizonte, Mz. F (parque central)",
    coords: "-5.2101, -80.6398",
    shape: "90,240 200,230 220,330 110,350", label: [155, 290] },
  { id: "loma-sur", name: "Loma Sur", province: "altos", population: 28000,
    cases: [0, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2], deaths: [],
    severity: { alarm: 0.1, severe: 0 }, ref: "Caserío Loma Sur, km 6 carretera a Los Altos",
    coords: "-5.1877, -80.5986",
    shape: "390,140 560,130 580,260 370,240", label: [474, 196] },
  { id: "arenales", name: "Arenales", province: "altos", population: 22000,
    cases: [0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1], deaths: [],
    severity: { alarm: 0.1, severe: 0 }, ref: "Centro poblado Arenales, frente a la posta",
    coords: "-5.2079, -80.5942",
    shape: "370,240 580,260 560,380 350,330", label: [466, 304] }
];

/* Fuentes de datos (HU-14, HU-15) */
const SOURCES = [
  { name: "NotiWeb – MINSA", updated: "2026-10-07T08:30:00-05:00", quality: "completo", share: 68,
    reason: "" },
  { name: "EsSalud", updated: "2026-10-06T18:10:00-05:00", quality: "parcial", share: 19,
    reason: "12 registros sin distrito de residencia" },
  { name: "Clínicas privadas", updated: "2026-10-04T09:00:00-05:00", quality: "inconsistente", share: 9,
    reason: "7 casos confirmados no coinciden con NotiWeb" },
  { name: "Reportes de brigadas", updated: "2026-10-07T07:45:00-05:00", quality: "completo", share: 4,
    reason: "" }
];

/* Establecimientos y camas (HU-23) */
const FACILITIES = [
  { name: "Hospital Ribera", zone: "ribera-norte", total: 40, occupied: 35 },
  { name: "C.S. Puerto Palma", zone: "puerto-palma", total: 20, occupied: 18 },
  { name: "Hospital Central Valle Claro", zone: "centro-historico", total: 120, occupied: 78 },
  { name: "C.S. Las Américas", zone: "las-americas", total: 16, occupied: 9 },
  { name: "C.S. Ribera Sur", zone: "ribera-sur", total: 12, occupied: 7 },
  { name: "C.S. Nuevo Horizonte", zone: "nuevo-horizonte", total: 10, occupied: 4 },
  { name: "Puesto de salud Loma Sur", zone: "loma-sur", total: 6, occupied: 1 },
  { name: "Puesto de salud Arenales", zone: "arenales", total: 4, occupied: 0 }
];

/* Estado inicial editable (se guarda en localStorage) */
const INITIAL_STATE = {
  stock: [
    { id: "paracetamol", name: "Paracetamol 500 mg", unit: "tabletas", qty: 18000, min: 10000 },
    { id: "sro", name: "Sales de rehidratación oral", unit: "sobres", qty: 1200, min: 1500 },
    { id: "ns1", name: "Pruebas rápidas NS1", unit: "pruebas", qty: 340, min: 200 },
    { id: "larvicida", name: "Larvicida", unit: "kg", qty: 85, min: 60 },
    { id: "nebulizacion", name: "Insecticida para nebulización", unit: "L", qty: 40, min: 50 },
    { id: "repelente", name: "Repelente", unit: "frascos", qty: 600, min: 300 }
  ],
  brigades: [
    { id: "B01", name: "Brigada 01", leader: "Diego Ruiz", status: "en-campo" },
    { id: "B02", name: "Brigada 02", leader: "Rosa Quispe", status: "disponible" },
    { id: "B03", name: "Brigada 03", leader: "Lucía Méndez", status: "disponible" },
    { id: "B04", name: "Brigada 04", leader: "Mario Saavedra", status: "descanso" },
    { id: "B05", name: "Brigada 05", leader: "Elena Paredes", status: "disponible" }
  ],
  interventions: [
    { id: "INT-021", zone: "puerto-palma", brigade: "B01", status: "en-curso", houses: 34,
      priority: "alta", action: "Control larvario casa por casa", updated: "2026-10-07T07:50:00-05:00" },
    { id: "INT-019", zone: "las-americas", brigade: "B04", status: "completada", houses: 120,
      priority: "normal", action: "Nebulización espacial", updated: "2026-10-05T17:20:00-05:00" },
    { id: "INT-023", zone: "nuevo-horizonte", brigade: "B03", status: "pendiente", houses: 0,
      priority: "alta", action: "Búsqueda y eliminación de criaderos", updated: "2026-10-06T16:05:00-05:00" },
    { id: "INT-024", zone: "las-americas", brigade: "B03", status: "pendiente", houses: 0,
      priority: "normal", action: "Inspección de seguimiento", updated: "2026-10-06T11:40:00-05:00" }
  ],
  /* Alertas recibidas por la app de la Brigada 03 */
  alerts: [
    { id: "ALR-105", intervention: "INT-023", zone: "nuevo-horizonte", priority: "alta",
      action: "Búsqueda y eliminación de criaderos", received: "2026-10-06T16:06:00-05:00", status: "pendiente" },
    { id: "ALR-104", intervention: "INT-024", zone: "las-americas", priority: "normal",
      action: "Inspección de seguimiento", received: "2026-10-06T11:41:00-05:00", status: "pendiente" }
  ],
  pendingDelivery: [],   // asignaciones aún no entregadas por falta de conexión (HU-38)
  inspections: [],       // registros de inspección (HU-39, HU-40)
  incidents: [],         // incidencias de campo (HU-41, HU-33)
  messages: [            // mensajes coordinador → brigada (HU-44)
    { id: "MSG-001", to: "B01", text: "Prioricen las viviendas cercanas al muelle; hay 3 casos nuevos.",
      sent: "2026-10-07T07:55:00-05:00" }
  ],
  assignments: [],       // asignaciones de insumos (HU-26)
  offline: false,
  highLegibility: false,
  seq: 30
};

const PERU_REGIONS = ["Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao",
  "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima Metropolitana",
  "Lima Provincias", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín",
  "Tacna", "Tumbes", "Ucayali"];
