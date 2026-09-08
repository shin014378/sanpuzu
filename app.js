const COLORS = [
  "#0f6b5c",
  "#c2410c",
  "#1d4ed8",
  "#a16207",
  "#7c3aed",
  "#be123c",
  "#0e7490",
  "#365314",
];

const SAMPLE_CSV = `生徒,勉強時間,点数,クラス
佐藤,1.5,58,A
鈴木,2.0,61,A
高橋,2.4,67,A
田中,3.1,72,B
伊藤,3.5,74,B
渡辺,4.0,79,B
山本,4.6,83,C
中村,5.2,86,C
小林,5.8,90,C
加藤,6.4,93,C
吉田,1.2,49,A
山田,2.8,70,B`;

const els = {
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  pasteInput: document.getElementById("paste-input"),
  parsePaste: document.getElementById("parse-paste"),
  loadSample: document.getElementById("load-sample"),
  download: document.getElementById("download-png"),
  status: document.getElementById("status"),
  xCol: document.getElementById("x-col"),
  yCol: document.getElementById("y-col"),
  groupCol: document.getElementById("group-col"),
  labelCol: document.getElementById("label-col"),
  title: document.getElementById("chart-title"),
  xLabel: document.getElementById("x-label"),
  yLabel: document.getElementById("y-label"),
  trendline: document.getElementById("trendline"),
  pointSize: document.getElementById("point-size"),
  empty: document.getElementById("empty"),
  stats: document.getElementById("stats"),
  preview: document.getElementById("preview"),
};

let table = { headers: [], rows: [] };
let chart;

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
    els.panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === tab.dataset.tab);
    });
  });
});

["dragenter", "dragover"].forEach((type) => {
  els.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    els.dropzone.classList.add("is-over");
  });
});

["dragleave", "drop"].forEach((type) => {
  els.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    els.dropzone.classList.remove("is-over");
  });
});

els.dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) readFile(file);
});

els.fileInput.addEventListener("change", () => {
  const file = els.fileInput.files[0];
  if (file) readFile(file);
});

els.parsePaste.addEventListener("click", () => {
  applyTable(parseDelimited(els.pasteInput.value), "貼り付けた表");
});

els.loadSample.addEventListener("click", () => {
  els.pasteInput.value = SAMPLE_CSV;
  applyTable(parseDelimited(SAMPLE_CSV), "サンプルデータ");
  els.title.value = "勉強時間と点数";
  els.xLabel.value = "勉強時間（時間）";
  els.yLabel.value = "点数";
  els.groupCol.value = "クラス";
  renderChart();
});

[
  els.xCol,
  els.yCol,
  els.groupCol,
  els.labelCol,
  els.title,
  els.xLabel,
  els.yLabel,
  els.trendline,
  els.pointSize,
].forEach((el) => el.addEventListener("input", renderChart));

els.download.addEventListener("click", () => {
  if (!chart) return;
  const link = document.createElement("a");
  const name = (els.title.value || "散布図").replace(/[\\/:*?"<>|]/g, "_");
  link.download = `${name}.png`;
  link.href = chart.toBase64Image("image/png", 1);
  link.click();
});

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function toNumber(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/,/g, "").replace(/[０-９．－]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((line) => line.trim());
  if (!first) return ",";
  const commas = (first.match(/,/g) || []).length;
  const tabs = (first.match(/\t/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function parseDelimited(text) {
  const source = text.replace(/^\uFEFF/, "").trim();
  if (!source) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(source);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  const headers = rows.shift() || [];
  const objects = rows
    .filter((values) => values.some((value) => value !== ""))
    .map((values) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index] ?? "";
      });
      return item;
    });
  return { headers, rows: objects };
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = matrix[0].map((value, index) => String(value || `列${index + 1}`));
  const rows = matrix.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? "";
    });
    return item;
  });
  return { headers, rows };
}

function isNumericColumn(header) {
  const values = table.rows.map((row) => toNumber(row[header])).filter((n) => n !== null);
  return values.length >= Math.max(2, Math.floor(table.rows.length * 0.6));
}

function fillSelect(select, headers, includeNone, preferred) {
  const previous = preferred || select.value;
  select.innerHTML = "";
  if (includeNone) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "なし";
    select.appendChild(option);
  }
  headers.forEach((header) => {
    const option = document.createElement("option");
    option.value = header;
    option.textContent = header;
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

function applyTable(next, sourceLabel) {
  if (!next.headers.length || !next.rows.length) {
    setStatus("表として読めるデータがありません。1行目を項目名にしてください。", true);
    return;
  }
  table = next;
  const numeric = next.headers.filter(isNumericColumn);
  fillSelect(els.xCol, next.headers, false, numeric[0]);
  fillSelect(els.yCol, next.headers, false, numeric[1] || numeric[0]);
  fillSelect(els.groupCol, next.headers, true);
  fillSelect(els.labelCol, next.headers, true, next.headers[0]);
  if (!els.xLabel.value) els.xLabel.value = els.xCol.value;
  if (!els.yLabel.value) els.yLabel.value = els.yCol.value;
  setStatus(`${sourceLabel}を読み込みました（${next.rows.length}行）。`);
  renderPreview();
  renderChart();
}

function renderPreview() {
  const headers = table.headers;
  const rows = table.rows.slice(0, 6);
  els.preview.hidden = false;
  els.preview.innerHTML = `
    <table>
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function gatherPoints() {
  const xKey = els.xCol.value;
  const yKey = els.yCol.value;
  const groupKey = els.groupCol.value;
  const labelKey = els.labelCol.value;
  const points = [];
  let skipped = 0;

  table.rows.forEach((row) => {
    const x = toNumber(row[xKey]);
    const y = toNumber(row[yKey]);
    if (x === null || y === null) {
      skipped += 1;
      return;
    }
    points.push({
      x,
      y,
      group: groupKey ? String(row[groupKey] || "未分類") : "全体",
      label: labelKey ? String(row[labelKey] || "") : "",
    });
  });
  return { points, skipped };
}

function pearson(points) {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  points.forEach((p) => {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  });
  const den = Math.sqrt(denX * denY);
  if (!den) return { r: null, slope: null, intercept: null, n };
  const r = num / den;
  const slope = num / denX;
  return { r, slope, intercept: meanY - slope * meanX, n };
}

function renderChart() {
  const { points, skipped } = gatherPoints();
  if (!points.length) {
    if (chart) chart.destroy();
    chart = null;
    els.empty.hidden = false;
    els.stats.hidden = true;
    els.download.disabled = true;
    if (table.rows.length) {
      setStatus("X軸とY軸に数値の列を選んでください。", true);
    }
    return;
  }

  const groups = [...new Set(points.map((p) => p.group))];
  const size = Number(els.pointSize.value);
  const stats = pearson(points);
  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const datasets = groups.map((group, index) => {
    const color = COLORS[index % COLORS.length];
    return {
      type: "scatter",
      label: group,
      data: points.filter((p) => p.group === group),
      backgroundColor: color,
      borderColor: color,
      pointRadius: size,
      pointHoverRadius: size + 2,
    };
  });

  if (els.trendline.checked && stats?.slope != null) {
    datasets.push({
      type: "line",
      label: "回帰直線",
      data: [
        { x: minX, y: stats.slope * minX + stats.intercept },
        { x: maxX, y: stats.slope * maxX + stats.intercept },
      ],
      borderColor: "#1f1a14",
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
    });
  }

  els.empty.hidden = true;
  els.download.disabled = false;
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("chart"), {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        title: {
          display: Boolean(els.title.value),
          text: els.title.value,
          font: { size: 18, family: "IBM Plex Sans JP" },
        },
        legend: { display: groups.length > 1 || els.trendline.checked },
        tooltip: {
          callbacks: {
            label(ctx) {
              const p = ctx.raw;
              const name = p.label ? `${p.label}: ` : "";
              return `${name}${p.x}, ${p.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: els.xLabel.value || els.xCol.value },
        },
        y: {
          type: "linear",
          title: { display: true, text: els.yLabel.value || els.yCol.value },
        },
      },
    },
  });

  const rText = stats?.r == null ? "—" : stats.r.toFixed(3);
  els.stats.hidden = false;
  els.stats.innerHTML = `
    <div><strong>データ数</strong>${stats.n}点</div>
    <div><strong>相関係数 r</strong>${rText}</div>
    <div><strong>スキップ</strong>${skipped}行</div>
  `;
  if (skipped) {
    setStatus(`${points.length}点を描画しました。数値でない${skipped}行は除いています。`);
  }
}

if (new URLSearchParams(location.search).has("sample")) {
  els.loadSample.click();
}

async function readFile(file) {
  const isExcel = /\.xlsx?$/i.test(file.name);
  try {
    if (isExcel) {
      const buffer = await file.arrayBuffer();
      applyTable(parseWorkbook(buffer), file.name);
      return;
    }
    const text = await file.text();
    applyTable(parseDelimited(text), file.name);
  } catch (error) {
    setStatus(`読み込みに失敗しました: ${error.message}`, true);
  }
}
