require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/MapImageLayer",
  "esri/widgets/Search"
], function(Map, MapView, FeatureLayer, MapImageLayer, Search) {

  const BASE         = "https://services-ap1.arcgis.com/ACqsMOmNLi5wIdIh/arcgis/rest/services/osnauug/FeatureServer";
  const DUUREG_FIELD = "soum_name";
  const HOROO_FIELD  = "NAME";
  const HUT_FIELD    = "XYTID";

  // ── Map & View ──────────────────────────────────
  const imageryLayer = new MapImageLayer({
    url: "https://arcgis.ubhub.mn/arcgis/rest/services/Imagery/25_horoo/MapServer"
  });

  const map = new Map({ basemap: "satellite", layers: [imageryLayer] });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [106.9, 47.9],
    scale: 8000
  });

  // ── Layers ──────────────────────────────────────
  const lyr = {
    uddt:      new FeatureLayer({ url: BASE + "/8", title: "УДДТ-ийн барилга",           outFields: ["*"] }),
    hut:       new FeatureLayer({ url: BASE + "/5", title: "ХҮТ-ийн хил хязгаар",        outFields: ["*"] }),
    dulHudag:  new FeatureLayer({ url: BASE + "/0", title: "Дулааны худаг",              outFields: ["*"] }),
    arHudag:   new FeatureLayer({ url: BASE + "/1", title: "Ариутгах татуургын худаг",   outFields: ["*"] }),
    usShugam:  new FeatureLayer({ url: BASE + "/4", title: "Цэвэр усны шугам",           outFields: ["*"] }),
    dulShugam: new FeatureLayer({ url: BASE + "/3", title: "Дулааны шугам",              outFields: ["*"] }),
    arShugam:  new FeatureLayer({ url: BASE + "/2", title: "Ариутгах татуургын шугам",   outFields: ["*"] }),
    oros:      new FeatureLayer({ url: BASE + "/6", title: "Орон сууц",                  outFields: ["*"] }),
    aminy:     new FeatureLayer({ url: BASE + "/7", title: "Амины орон сууц",            outFields: ["*"] }),
    aan:       new FeatureLayer({ url: BASE + "/9", title: "ААН",                        outFields: ["*"] })
  };

  // ── Renderers ────────────────────────────────────
  // Point glow effect: bright solid core + wide semi-transparent outline
  lyr.dulHudag.renderer = {
    type: "simple",
    symbol: {
      type: "simple-marker",
      color: [255, 0, 0, 255],
      size: 2,
      outline: { color: [255, 0, 0, 90], width: 5 }
    }
  };

  lyr.arHudag.renderer = {
    type: "simple",
    symbol: {
      type: "simple-marker",
      color: [255, 253, 141, 255],
      size: 2,
      outline: { color: [255, 253, 141, 90], width: 5 }
    }
  };

  lyr.usShugam.renderer = {
    type: "simple",
    symbol: { type: "simple-line", color: [0, 19, 222, 0.7], width: 1 }
  };

  lyr.arShugam.renderer = {
    type: "simple",
    symbol: { type: "simple-line", color: [255, 253, 141, 0.7], width: 1 }
  };

  lyr.dulShugam.renderer = {
    type: "simple",
    symbol: { type: "simple-line", color: [255, 0, 0, 0.7], width: 1 }
  };

  lyr.hut.renderer = {
    type: "simple",
    symbol: {
      type: "simple-fill",
      style: "none",
      outline: { color: "#C2C7FF", width: 2 }
    }
  };

  lyr.oros.renderer = {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [196, 196, 196, 0.6],
      outline: { color: "#5E5E5E", width: 1 }
    }
  };

  lyr.aminy.renderer = {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [255, 255, 255, 0.6],
      outline: { color: "#5E5E5E", width: 1 }
    }
  };

  lyr.uddt.renderer = {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [5, 255, 255, 0.6],
      outline: { color: "#04C8C8", width: 1 }
    }
  };

  lyr.aan.renderer = {
    type: "simple",
    symbol: {
      type: "simple-fill",
      color: [196, 196, 196, 0.6],
      outline: { color: "#5E5E5E", width: 1 }
    }
  };


  const allLayers = Object.values(lyr);
  map.addMany(allLayers);

  // Auto-zoom to all ХУТ boundaries on load
  lyr.hut.when(function() {
    if (lyr.hut.fullExtent) {
      view.goTo(lyr.hut.fullExtent);
    }
  });

  // ── Filter helpers ───────────────────────────────
  function esc(v) {
    return String(v).replace(/'/g, "''");
  }

  function loadDistinct(fieldName, selectId) {
    const sel = document.getElementById(selectId);
    const url = BASE + "/0/query?" + new URLSearchParams({
      where: "1=1",
      outFields: fieldName,
      returnDistinctValues: "true",
      returnGeometry: "false",
      f: "json"
    });

    console.log("[filter] fetching:", fieldName);

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log("[filter] response for", fieldName, data);

        if (data.error) {
          console.error("[filter] error:", fieldName, data.error);
          return;
        }
        if (!data.features || data.features.length === 0) {
          console.warn("[filter] 0 feature butsav:", fieldName);
          return;
        }

        const values = [...new Set(
          data.features
            .map(function(f) { return f.attributes[fieldName]; })
            .filter(function(v) { return v != null && String(v).trim() !== ""; })
            .map(function(v) { return String(v).trim(); })
        )].sort();

        console.log("[filter]", fieldName, "->", values.length, "утга:", values);

        values.forEach(function(val) {
          const opt = document.createElement("option");
          opt.value = val;
          opt.textContent = val;
          sel.appendChild(opt);
        });
      })
      .catch(function(e) {
        console.error("[filter] fetch failed:", fieldName, e);
      });
  }

  // ── Visible layer helpers ────────────────────────
  function getVisibleLayers() {
    return allLayers.filter(function(l) { return l.visible; });
  }

  function buildWhere() {
    const duureg = document.getElementById("filter-duureg").value;
    const horoo  = document.getElementById("filter-horoo").value;
    const hut    = document.getElementById("filter-hut").value;
    const parts  = [];
    if (duureg) parts.push(`${DUUREG_FIELD} = '${esc(duureg)}'`);
    if (horoo)  parts.push(`${HOROO_FIELD} = '${esc(horoo)}'`);
    if (hut)    parts.push(`${HUT_FIELD} = '${esc(hut)}'`);
    return parts.length ? parts.join(" AND ") : null;
  }

  // ── Apply filters to visible layers only ─────────
  function applyFilters() {
    const where = buildWhere();
    getVisibleLayers().forEach(function(layer) {
      layer.definitionExpression = where;
    });
  }

  document.getElementById("filter-duureg").addEventListener("change", applyFilters);
  document.getElementById("filter-horoo").addEventListener("change", applyFilters);
  document.getElementById("filter-hut").addEventListener("change", applyFilters);

  // ── Load filter dropdowns ────────────────────────
  loadDistinct(DUUREG_FIELD, "filter-duureg");
  loadDistinct(HOROO_FIELD,  "filter-horoo");
  loadDistinct(HUT_FIELD,    "filter-hut");

  // ── Checkbox → visibility ────────────────────────
  [
    ["l-uddt",      [lyr.uddt]],
    ["l-hut",       [lyr.hut]],
    ["l-dul-hudag", [lyr.dulHudag]],
    ["l-ar-hudag",  [lyr.arHudag]],
    ["l-hudag",     [lyr.dulHudag, lyr.arHudag]],
    ["l-us-shugam", [lyr.usShugam]],
    ["l-dul-shugam",[lyr.dulShugam]],
    ["l-ar-shugam", [lyr.arShugam]],
    ["l-shugam",    [lyr.usShugam, lyr.dulShugam, lyr.arShugam]],
    ["l-oros",      [lyr.oros]],
    ["l-aminy",     [lyr.aminy]],
    ["l-aan",       [lyr.aan]],
    ["l-barилга",   [lyr.oros, lyr.aminy, lyr.aan]]
  ].forEach(function([id, layers]) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", function() {
        const where = buildWhere();
        layers.forEach(function(l) {
          l.visible = el.checked;
          l.definitionExpression = el.checked ? where : null;
        });
      });
    }
  });

  // ── Basemap selector ─────────────────────────────
  document.getElementById("basemap-select").addEventListener("change", function(e) {
    map.basemap = e.target.value;
  });

  // ── Search widget ────────────────────────────────
  const search = new Search({ view: view });
  view.ui.add(search, "top-right");

  // ── Hover highlight & info panel ─────────────────
  // Strict alias whitelist for asset fields (case-insensitive)
  const ASSET_ALIAS_WHITELIST = new Set([
    "шугамын дугаар", "pipe number", "pipe no", "pipe_no",
    "диаметр", "diameter",
    "ашиглалтанд орсон он", "install year", "installed year",
    "урт",
    "материал", "material"
  ]);

  const LOCATION_FIELDS = {
    "soum_name": "Дүүрэг",
    "NAME":      "Хороо",
    "XYTID":     "ХҮТ-ийн хил"
  };

  function formatDate(val) {
    if (val === null || val === undefined) return null;
    const d = new Date(typeof val === "number" ? val : Number(val));
    if (isNaN(d.getTime())) return String(val);
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return y + "." + m + "." + dd;
  }

  const APARTMENT_FIELDS = [
    ["UDDTID",             "УДДТ-ийн дугаар"],
    ["DistCenterID",       "Түгээх төв"],
    ["OwnTypeID",          "Өмчлөлийн хэлбэр"],
    ["BuiltDate",          "Ашиглалтад орсон огноо", "date"],
    ["Volume",             "Эзэлхүүн"],
    ["HeatLoad",           "Халаалтын ачаалал"],
    ["HotWatLoad",         "Халуун усны ачаалал"],
    ["BuildFloor",         "Барилгын давхар"],
    ["GateNum",            "Орцны тоо"],
    ["BuildMaterialID",    "Барилгын хийц"],
    ["IsInsulatedID",      "Дулаалгатай эсэх"],
    ["HasBasement",        "Зоорийн давхартай эсэх"],
    ["UtilitySchemaID",    "Сантехникийн дотор схем"],
    ["CompanyExists",      "ААН-ийн байрлал"],
    ["CompanyDesignation", "ААН-н зориулалт"],
    ["Description",        "Нэр, тайлбар"]
  ];

  const UDDT_FIELDS = [
    ["UDDTID",        "УДДТ-ийн дугаар"],
    ["DistCenterID",  "Түгээх төв"],
    ["OwnTypeID",     "Өмчлөлийн хэлбэр"],
    ["BuildingTypeID","Барилга"],
    ["BuiltDate",     "Ашиглалтад орсон огноо", "date"],
    ["BuildHeight",   "Барилгын өндөр"],
    ["BuildArea",     "Барилгын талбай"],
    ["BuildDesignID", "Барилгын хийц"]
  ];

  const US_SHUGAM_FIELDS = [
    ["UDDTID",          "УДДТ-ийн дугаар"],
    ["DistCenterID",    "Түгээх төв"],
    ["Location",        "Байршил"],
    ["LineMaterialID",  "Шугамын материал"],
    ["Diameter",        "Голч"],
    ["LineLength",      "Урт"],
    ["InsulationLength","Дулаалгын урт"],
    ["InstalledDate",   "Ашиглалтад орсон огноо", "date"],
    ["ChannelTypeID",   "Сувгийн төрөл"],
    ["ChannelSizeID",   "Сувгийн хэмжээ"],
    ["ChannelDepth",    "Сувгийн гүн"]
  ];

  const DUL_SHUGAM_FIELDS = [
    ["UDDTID",           "УДДТ-ийн дугаар"],
    ["DistCenterID",     "Түгээх төв"],
    ["Location",         "Байршил"],
    ["LineMaterialID",   "Шугамын материал"],
    ["Diameter",         "Голч"],
    ["LineLength",       "Урт"],
    ["InsulationLength", "Дулаалгын урт"],
    ["InstalledDate",    "Ашиглалтад орсон огноо", "date"]
  ];

  const AR_SHUGAM_FIELDS = [
    ["UDDTID",        "УДДТ-ийн дугаар"],
    ["DistCenterID",  "Түгээх төв"],
    ["Location",      "Байршил"],
    ["InstalledDate", "Ашиглалтад орсон огноо", "date"],
    ["LineMaterialID","Шугамын материал"],
    ["CapTypeID",     "Тагны төрөл"],
    ["CapHeight",     "Тагны түвшин"],
    ["WallTypeID",    "Ханын төрөл"],
    ["DiameterID",    "Голч (мм)"],
    ["TypeID",        "Шугамын зааг"],
    ["Description",   "Нэр, тайлбар"]
  ];

  const AAN_FIELDS = [
    ["UDDTID",             "УДДТ-ийн дугаар"],
    ["DistCenterID",       "Түгээх төв"],
    ["CompanyDesignation", "ААН-ийн зориулалт"],
    ["OwnTypeID",          "Өмчлөлийн хэлбэр"],
    ["Volume",             "Эзлэхүүн"],
    ["HeatLoad",           "Дулааны ачаалал"],
    ["HotWaterLoad",       "Халуун усны ачаалал"],
    ["BuildFloor",         "Барилгын давхар"],
    ["WaterUsageHour",     "Цэвэр усны цагийн зарцуулалт"],
    ["Description",        "Нэр, тайлбар"]
  ];

  const AMINY_FIELDS = [
    ["UDDTID",      "УДДТ-ийн дугаар"],
    ["DistCenterID","Түгээх төв"],
    ["OwnTypeID",   "Өмчлөлийн хэлбэр"],
    ["BuiltDate",   "Ашиглалтад орсон огноо", "date"],
    ["Volume",      "Эзэлхүүн"],
    ["HeatLoad",    "Халаалтын ачаалал"],
    ["HotWatLoad",  "Халуун усны ачаалал"],
    ["BuildFloor",  "Барилгын давхар"],
    ["HasBasement", "Зоорийн давхартай эсэх"],
    ["Description", "Нэр, тайлбар"]
  ];

  const AR_HUDAG_FIELDS = [
    ["UDDTID",      "УДДТ-ийн дугаар"],
    ["DistCenterID","Түгээх төв"],
    ["Location",    "Байршил"],
    ["CapTypeID",   "Тагны төрөл"],
    ["CapHeight",   "Тагны өндөр (м)"],
    ["WallTypeID",  "Ханын төрөл"],
    ["Description", "Нэр, тайлбар"]
  ];

  const hoverPanel = document.getElementById("hover-panel");
  const hpIcon     = document.getElementById("hp-icon");
  const hpTitle    = document.getElementById("hp-title");
  const hpClose    = document.getElementById("hp-close");
  const hpBody     = document.getElementById("hp-body");

  let activeHighlight = null;

  // Layer icons by keyword
  const ICONS = {
    water:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 10.26 4 13.74 4 17a8 8 0 0016 0c0-3.26-2.48-6.74-8-15z"/></svg>`,
    heating: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>`,
    sewer:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.5 3-4 6-4 9s1.5 6 4 9M12 3c2.5 3 4 6 4 9s-1.5 6-4 9"/></svg>`,
    well:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/></svg>`,
    building:`<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V5l9-3 9 3v16H3zm7-2h4v-4h-4v4zm-4-6h2v-2H6v2zm0-4h2V7H6v2zm4 4h2v-2h-2v2zm0-4h2V7h-2v2zm8 4h2v-2h-2v2zm0-4h2V7h-2v2z"/></svg>`,
    hut:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
    default: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
  };

  function getIcon(title) {
    if (!title) return ICONS.default;
    const t = title.toLowerCase();
    if (t.includes("цэвэр усны") || (t.includes("усны") && t.includes("шугам"))) return ICONS.water;
    if (t.includes("дулаан")) return ICONS.heating;
    if (t.includes("ариутгах") || t.includes("sewер")) return ICONS.sewer;
    if (t.includes("худаг")) return ICONS.well;
    if (t.includes("барилга") || t.includes("орон сууц") || t.includes("амины") || t.includes("ааН")) return ICONS.building;
    if (t.includes("хут") || t.includes("хүт") || t.includes("хил")) return ICONS.hut;
    return ICONS.default;
  }

  function getStatusDotColor(val) {
    const v = String(val).toLowerCase();
    if (v.includes("ашиглагдаж") || v.includes("идэвхтэй") || v.includes("active")) return "#22c55e";
    if (v.includes("засвар") || v.includes("repair")) return "#f59e0b";
    if (v.includes("ажиллахгүй") || v.includes("inactive")) return "#ef4444";
    return "#94a3b8";
  }

  function addSection(label, iconSvg) {
    const el = document.createElement("div");
    el.className = "hp-section";
    if (iconSvg) el.innerHTML = iconSvg + label;
    else el.textContent = label;
    hpBody.appendChild(el);
  }

  function addRow(label, val, isStatus) {
    const row = document.createElement("div");
    row.className = "hp-row";

    const keyEl = document.createElement("span");
    keyEl.className = "hp-key";
    keyEl.textContent = label;

    const colonEl = document.createElement("span");
    colonEl.className = "hp-colon";
    colonEl.textContent = ":";

    const valEl = document.createElement("span");
    valEl.className = "hp-val";

    if (isStatus) {
      const dot = document.createElement("span");
      dot.className = "hp-status-dot";
      dot.style.background = getStatusDotColor(val);
      valEl.appendChild(dot);
    }
    valEl.appendChild(document.createTextNode(String(val)));

    row.appendChild(keyEl);
    row.appendChild(colonEl);
    row.appendChild(valEl);
    hpBody.appendChild(row);
  }

  function getExtraFields(layer) {
    if (layer === lyr.oros)      return APARTMENT_FIELDS;
    if (layer === lyr.aminy)     return AMINY_FIELDS;
    if (layer === lyr.aan)       return AAN_FIELDS;
    if (layer === lyr.uddt)      return UDDT_FIELDS;
    if (layer === lyr.arShugam)  return AR_SHUGAM_FIELDS;
    if (layer === lyr.dulShugam) return DUL_SHUGAM_FIELDS;
    if (layer === lyr.usShugam)  return US_SHUGAM_FIELDS;
    if (layer === lyr.arHudag || layer === lyr.dulHudag) return AR_HUDAG_FIELDS;
    return null;
  }

  const SYSTEM_FIELDS = new Set([
    "objectid","globalid","shape_length","shape_area","shape",
    "soum_name","NAME","XYTID"
  ]);

  const PIN_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`;

  function showPanel(graphic) {
    const attrs  = graphic.attributes || {};
    const layer  = graphic.layer;
    const fields = (layer && layer.fields) ? layer.fields : [];

    hpIcon.innerHTML  = getIcon(layer ? layer.title : "");
    hpTitle.textContent = layer ? layer.title : "Мэдээлэл";
    hpBody.innerHTML  = "";

    // ── Asset information ──────────────────────────
    const assetFields = fields.filter(function(f) {
      const alias = (f.alias || f.name).toLowerCase();
      return ASSET_ALIAS_WHITELIST.has(alias) &&
             attrs[f.name] !== null &&
             attrs[f.name] !== undefined &&
             attrs[f.name] !== "";
    });

    const extraFields = getExtraFields(layer);
    const sectionTitle = "Ерөнхий мэдээлэл";

    if (assetFields.length > 0 || extraFields) {
      addSection(sectionTitle);
      assetFields.forEach(function(f) {
        const alias = (f.alias || f.name).toLowerCase();
        const isStatus = alias.includes("төлөв") || alias.includes("статус") || alias === "status";
        addRow(f.alias || f.name, attrs[f.name], isStatus);
      });
      if (extraFields) {
        extraFields.forEach(function(fieldDef) {
          const fieldName = fieldDef[0];
          const alias     = fieldDef[1];
          const type      = fieldDef[2] || "";
          let val = attrs[fieldName];
          if (val === null || val === undefined || String(val).trim() === "") return;
          if (type === "date") { val = formatDate(val); if (!val) return; }
          addRow(alias, val, false);
        });
      }
    }

    // ── Location information ───────────────────────
    const locEntries = Object.entries(LOCATION_FIELDS).filter(function(e) {
      const v = attrs[e[0]];
      return v !== null && v !== undefined && v !== "";
    });

    if (locEntries.length > 0) {
      addSection("Байршлын мэдээлэл", PIN_ICON);
      locEntries.forEach(function(e) {
        addRow(e[1], attrs[e[0]], false);
      });
    }

    hoverPanel.classList.add("visible");
  }

  hpClose.addEventListener("click", function() {
    hoverPanel.classList.remove("visible");
    if (activeHighlight) { activeHighlight.remove(); activeHighlight = null; }
  });

  function hidePanel() {
    hoverPanel.classList.remove("visible");
  }

  // ── Edit Modal ────────────────────────────────
  const editOverlay  = document.getElementById("edit-overlay");
  const editModal    = document.getElementById("edit-modal");
  const emTitle      = document.getElementById("em-title");
  const emBody       = document.getElementById("em-body");
  const emClose      = document.getElementById("em-close");
  const emCancel     = document.getElementById("em-cancel");
  const emSave       = document.getElementById("em-save");
  const emStatus     = document.getElementById("em-status");

  let currentEditGraphic = null;

  function openEditModal(graphic) {
    const layer       = graphic.layer;
    const attrs       = graphic.attributes || {};
    const layerFields = layer.fields || [];
    const fieldConfig = getExtraFields(layer);
    if (!fieldConfig) return;

    const fieldMeta = {};
    layerFields.forEach(function(f) { fieldMeta[f.name] = f; });

    emTitle.textContent = layer.title || "Мэдээлэл засах";
    emBody.innerHTML = "";
    emStatus.textContent = "";
    emStatus.className = "";
    currentEditGraphic = graphic;

    fieldConfig.forEach(function(fieldDef) {
      const fieldName = fieldDef[0];
      const alias     = fieldDef[1];
      const meta      = fieldMeta[fieldName];
      const val       = attrs[fieldName];

      const fieldEl = document.createElement("div");
      fieldEl.className = "em-field";

      const label = document.createElement("label");
      label.className = "em-label";
      label.textContent = alias;

      let input;
      if (meta && meta.domain && meta.domain.type === "codedValue") {
        input = document.createElement("select");
        input.className = "em-input";
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "-сонгох-";
        input.appendChild(blank);
        meta.domain.codedValues.forEach(function(cv) {
          const opt = document.createElement("option");
          opt.value = cv.code;
          opt.textContent = cv.name;
          if (val !== null && val !== undefined && String(cv.code) === String(val)) opt.selected = true;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement("input");
        input.className = "em-input";
        const ftype = meta ? meta.type : "";
        if (ftype === "esriFieldTypeDate") {
          input.type = "date";
          if (val !== null && val !== undefined) {
            const d = new Date(typeof val === "number" ? val : Number(val));
            if (!isNaN(d.getTime())) input.value = d.toISOString().substring(0, 10);
          }
        } else if (ftype === "esriFieldTypeDouble" || ftype === "esriFieldTypeSingle") {
          input.type = "number";
          input.step = "any";
          input.value = (val !== null && val !== undefined) ? val : "";
        } else if (ftype === "esriFieldTypeInteger" || ftype === "esriFieldTypeSmallInteger") {
          input.type = "number";
          input.step = "1";
          input.value = (val !== null && val !== undefined) ? val : "";
        } else {
          input.type = "text";
          input.value = (val !== null && val !== undefined) ? val : "";
        }
      }

      input.dataset.fieldName = fieldName;
      input.dataset.fieldType = meta ? meta.type : "esriFieldTypeString";

      fieldEl.appendChild(label);
      fieldEl.appendChild(input);
      emBody.appendChild(fieldEl);
    });

    editOverlay.classList.add("visible");
  }

  function closeEditModal() {
    editOverlay.classList.remove("visible");
    currentEditGraphic = null;
  }

  function saveEditModal() {
    if (!currentEditGraphic) return;
    const layer   = currentEditGraphic.layer;
    const oidField = layer.objectIdField || "OBJECTID";
    const attrs   = {};
    attrs[oidField] = currentEditGraphic.attributes[oidField];

    emBody.querySelectorAll("[data-field-name]").forEach(function(input) {
      const name = input.dataset.fieldName;
      const type = input.dataset.fieldType;
      const raw  = input.value;
      if (raw === "") {
        attrs[name] = null;
      } else if (type === "esriFieldTypeDate") {
        attrs[name] = new Date(raw).getTime();
      } else if (type === "esriFieldTypeDouble" || type === "esriFieldTypeSingle") {
        attrs[name] = parseFloat(raw);
      } else if (type === "esriFieldTypeInteger" || type === "esriFieldTypeSmallInteger") {
        attrs[name] = parseInt(raw, 10);
      } else {
        attrs[name] = raw;
      }
    });

    emSave.disabled = true;
    emStatus.className = "";
    emStatus.textContent = "Хадгалж байна...";

    layer.applyEdits({ updateFeatures: [{ attributes: attrs }] }).then(function(result) {
      const err = result.updateFeatureResults[0] && result.updateFeatureResults[0].error;
      if (err) {
        emStatus.textContent = "Алдаа: " + err.message;
      } else {
        emStatus.className = "success";
        emStatus.textContent = "Амжилттай хадгаллаа.";
        setTimeout(closeEditModal, 900);
      }
    }).catch(function(err) {
      emStatus.textContent = "Алдаа: " + (err.message || err);
    }).finally(function() {
      emSave.disabled = false;
    });
  }

  emClose.addEventListener("click", closeEditModal);
  emCancel.addEventListener("click", closeEditModal);
  emSave.addEventListener("click", saveEditModal);
  editOverlay.addEventListener("click", function(e) {
    if (e.target === editOverlay) closeEditModal();
  });

  view.on("click", function(event) {
    view.hitTest(event, { include: getVisibleLayers() }).then(function(response) {
      const hit = response.results[0];
      if (!hit || !hit.graphic) return;
      openEditModal(hit.graphic);
    });
  });

  // ── Excel Export ──────────────────────────────────
  const EXPORT_EXCLUDE_TYPES = new Set([
    "esriFieldTypeOID", "esriFieldTypeGlobalID", "esriFieldTypeGeometry"
  ]);
  const EXPORT_EXCLUDE_NAMES = /^(fid|fid_|shape|shape_|shape__|globalid|created_user|created_date|last_edited_user|last_edited_date|geometry)$/i;

  function isExportableField(f) {
    if (EXPORT_EXCLUDE_TYPES.has(f.type)) return false;
    if (EXPORT_EXCLUDE_NAMES.test(f.name)) return false;
    if (/^fid_/i.test(f.name)) return false;
    return true;
  }

  const EXPORT_BTN_HTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  function queryAllFeatures(layer, where, outFields, geometry) {
    const allFeatures = [];
    function fetchPage(start) {
      const params = {
        where: where,
        outFields: outFields,
        returnGeometry: false,
        num: 2000,
        start: start
      };
      if (geometry) {
        params.geometry = geometry;
        params.spatialRelationship = "intersects";
        params.outSpatialReference = view.spatialReference;
      }
      return layer.queryFeatures(params).then(function(result) {
        allFeatures.push(...(result.features || []));
        if (result.exceededTransferLimit) return fetchPage(start + 2000);
        return allFeatures;
      });
    }
    return fetchPage(0);
  }

  document.getElementById("btn-export").addEventListener("click", function() {
    const btn = this;
    btn.disabled = true;
    btn.textContent = "Боловсруулж байна...";

    const exportLayers = getVisibleLayers().filter(function(l) {
      return l !== lyr.hut;
    });

    if (exportLayers.length === 0) {
      alert("Харагдаж буй layer алга.");
      btn.disabled = false;
      btn.innerHTML = EXPORT_BTN_HTML;
      return;
    }

    const wb = XLSX.utils.book_new();

    const exportExtent = view.extent;

    const tasks = exportLayers.map(async function(layer) {
      await layer.load();

      const exportFields = (layer.fields || []).filter(isExportableField);
      const defExpr = (layer.definitionExpression && layer.definitionExpression.trim())
        ? layer.definitionExpression : "1=1";
      const outFieldNames = exportFields.map(function(f) { return f.name; });

      const features = await queryAllFeatures(layer, defExpr, outFieldNames, exportExtent);
      if (!features || features.length === 0) return null;

      const rows = features.map(function(feat) {
        const row = {};
        exportFields.forEach(function(f) {
          const v = feat.attributes[f.name];
          row[f.alias || f.name] = (v !== null && v !== undefined) ? v : "";
        });
        return row;
      });

      return {
        title: (layer.title || "Layer").substring(0, 31),
        rows: rows
      };
    });

    Promise.all(tasks).then(function(results) {
      results.filter(Boolean).forEach(function(item) {
        const ws = XLSX.utils.json_to_sheet(item.rows);
        XLSX.utils.book_append_sheet(wb, ws, item.title);
      });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        alert("Экспортлох өгөгдөл олдсонгүй.");
        return;
      }

      const today = new Date();
      const ymd = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
      XLSX.writeFile(wb, "utility_export_" + ymd + ".xlsx");
    }).catch(function(err) {
      alert("Алдаа гарлаа: " + (err.message || err));
    }).finally(function() {
      btn.disabled = false;
      btn.innerHTML = EXPORT_BTN_HTML;
    });
  });

  view.on("pointer-move", function(event) {
    view.hitTest(event, { include: getVisibleLayers() }).then(function(response) {
      if (activeHighlight) {
        activeHighlight.remove();
        activeHighlight = null;
      }

      const hit = response.results[0];
      if (!hit || !hit.graphic) {
        hidePanel();
        return;
      }

      const graphic = hit.graphic;
      showPanel(graphic);

      view.whenLayerView(graphic.layer).then(function(layerView) {
        activeHighlight = layerView.highlight(graphic);
      });
    });
  });

});
