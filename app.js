// Shared helpers used by every page
const CFG = window.FT_CONFIG;
const T = CFG.targets;

if (!window.supabase || CFG.SUPABASE_URL.includes("YOUR-PROJECT")) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = '<main><section><h2>Setup needed</h2><p>Open <b>config.js</b> and paste your Supabase URL and anon key. See README.md for the steps.</p></section></main>';
  });
  throw new Error("FitTrack: config.js not filled in");
}

const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

// ---------- auth ----------
async function requireUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("index.html"); return new Promise(() => {}); }
  return session.user;
}
async function logout() { await sb.auth.signOut(); location.replace("index.html"); }
sb.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" && !location.pathname.endsWith("index.html") && !location.pathname.endsWith("/")) location.replace("index.html");
});

// ---------- dates ----------
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
const todayIso = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const niceDate = (s, opts) => new Date(s + "T00:00:00").toLocaleDateString(undefined, opts || { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = s => new Date(s + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

// ---------- numbers ----------
const fmt = (v, dp = 0) => v == null || isNaN(v) ? "–" : Number(v).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
const avg = arr => { const v = arr.filter(x => x != null && !isNaN(x)).map(Number); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- data ----------
async function getLog(date) {
  const { data, error } = await sb.from("daily_logs").select("*").eq("log_date", date).maybeSingle();
  if (error) throw error;
  return data;
}
async function getLogs(from, to) {
  let q = sb.from("daily_logs").select("*").order("log_date", { ascending: true });
  if (from) q = q.gte("log_date", from);
  if (to) q = q.lte("log_date", to);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function saveLog(row) {
  const { data, error } = await sb.from("daily_logs").upsert(row, { onConflict: "user_id,log_date" }).select().single();
  if (error) throw error;
  return data;
}
async function deleteLog(date) {
  const { error } = await sb.from("daily_logs").delete().eq("log_date", date);
  if (error) throw error;
}

// ---------- shell ----------
const ICONS = {
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v5M4 3v5a3 3 0 0 0 3 3M17 21V3c-2 1.5-3 4-3 7s1 4 3 4"/></svg>'
};
function mountShell(active, user) {
  const top = document.getElementById("top");
  if (top) top.innerHTML = `<span class="brand">FitTrack</span><button class="linkbtn" id="logoutBtn" title="${esc(user.email)}">Log out</button>`;
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  const nav = document.createElement("nav");
  nav.className = "tabbar";
  nav.innerHTML = [["log.html", "log", "Log"], ["day.html", "day", "Day"], ["analytics.html", "stats", "Analytics"], ["foods.html", "foods", "Foods"]]
    .map(([href, k, l]) => `<a href="${href}"${k === active ? ' aria-current="page"' : ""}>${ICONS[k]}${l}</a>`).join("");
  document.body.appendChild(nav);
}
function showMsg(el, text, isErr) { el.textContent = text; el.classList.toggle("err", !!isErr); }
function errText(e) { return (e && (e.message || e.error_description)) || "Something went wrong. Check your connection and try again."; }

// =====================================================================
// Foods & meals
// =====================================================================
const MACROS = ["kcal", "protein_g", "carbs_g", "fat_g", "fiber_g"];

async function getFoods() {
  const { data, error } = await sb.from("foods").select("*").order("name");
  if (error) throw error;
  return data || [];
}
async function saveFood(f) {
  const row = { ...f };
  if (!row.id) delete row.id;
  const { data, error } = await sb.from("foods").upsert(row).select().single();
  if (error) {
    if (String(error.code) === "23505") throw new Error("You already have a food called “" + f.name + "”. Use a different name or edit that one.");
    throw error;
  }
  return data;
}
async function deleteFood(id) {
  const { error } = await sb.from("foods").delete().eq("id", id);
  if (error) throw error;
}
async function getMeals(date) {
  const { data, error } = await sb.from("meals").select("*, meal_items(*)").eq("log_date", date).order("meal_time");
  if (error) throw error;
  (data || []).forEach(m => m.meal_items.sort((a, b) => a.position - b.position));
  return data || [];
}
async function saveMeal(meal, items) {
  let m;
  if (meal.id) {
    const { data, error } = await sb.from("meals").update({ meal_time: meal.meal_time, name: meal.name, log_date: meal.log_date }).eq("id", meal.id).select().single();
    if (error) throw error; m = data;
    const del = await sb.from("meal_items").delete().eq("meal_id", meal.id);
    if (del.error) throw del.error;
  } else {
    const { data, error } = await sb.from("meals").insert({ log_date: meal.log_date, meal_time: meal.meal_time, name: meal.name }).select().single();
    if (error) throw error; m = data;
  }
  if (items.length) {
    const { error } = await sb.from("meal_items").insert(items.map((it, i) => ({ ...it, meal_id: m.id, position: i })));
    if (error) throw error;
  }
  await recomputeTotals(meal.log_date);
  return m;
}
async function deleteMeal(meal) {
  const { error } = await sb.from("meals").delete().eq("id", meal.id);
  if (error) throw error;
  await recomputeTotals(meal.log_date);
}
function sumItems(items) {
  const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  items.forEach(it => MACROS.forEach(k => t[k] += Number(it[k]) || 0));
  return t;
}
// Writes the day's food totals into daily_logs so Day and Analytics use them.
async function recomputeTotals(date) {
  const meals = await getMeals(date);
  const items = meals.flatMap(m => m.meal_items);
  const t = sumItems(items), has = items.length > 0;
  const r1 = v => Math.round(v * 10) / 10;
  await saveLog({
    log_date: date,
    calories: has ? Math.round(t.kcal) : null,
    protein_g: has ? r1(t.protein_g) : null,
    carbs_g: has ? r1(t.carbs_g) : null,
    fat_g: has ? r1(t.fat_g) : null,
    fiber_g: has ? r1(t.fiber_g) : null
  });
  return t;
}

// ---------- parsing "200ml milk" ----------
const UNIT_MAP = {
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g", kg: "kg",
  ml: "ml", l: "l", ltr: "l", litre: "l", liter: "l",
  cup: "cup", cups: "cup", tbsp: "tbsp", tsp: "tsp",
  pc: "piece", pcs: "piece", piece: "piece", pieces: "piece", x: "piece", no: "piece", nos: "piece"
};
function parseLine(raw) {
  let line = raw.trim().replace(/^[-*•]\s*/, "");
  if (!line) return null;
  // allow "yogabar oats 50g" (amount at the end)
  const tail = line.match(/^(.*?[a-zA-Z].*?)\s*[-:,]?\s+(\d+(?:[.,]\d+)?)\s*(g|gm|gms|grams?|ml|kg|l|ltr|pcs?|pieces?)\.?$/i);
  if (tail && !/^\d/.test(line)) line = tail[2] + (tail[3] ? tail[3] : "") + " " + tail[1];
  const m = line.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+|half|½)\s*([a-zA-Z]+)?\.?\s+(.+)$/i) || line.match(/^(\d+(?:[.,]\d+)?)\s*(g|gm|gms|ml|kg|l)\.?\s*([a-zA-Z].*)$/i);
  let qty = 1, unit = "piece", name = line;
  if (m) {
    let q = m[1].toLowerCase();
    qty = q === "half" || q === "½" ? 0.5 : q.includes("/") ? Number(q.split("/")[0]) / Number(q.split("/")[1]) : Number(q.replace(",", "."));
    const u = (m[2] || "").toLowerCase();
    if (u && UNIT_MAP[u]) { unit = UNIT_MAP[u]; name = m[3]; }
    else if (u) { unit = "piece"; name = m[2] + " " + m[3]; }   // "2 scoops whey", "1 full egg"
    else { name = m[3]; }
  }
  return { raw: raw.trim(), qty, unit, name: name.trim() };
}

// ---------- fuzzy matching to your food library ----------
const STOP = new Set(["of", "the", "a", "an", "and", "with", "some", "fresh"]);
function toks(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(w => w && !STOP.has(w))
    .map(w => w.length > 3 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -1) : w)
    .map(w => w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function tokEq(a, b) {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
  return a.length >= 4 && b.length >= 4 && lev(a, b) <= 1;
}
function matchFood(name, foods) {
  const q = toks(name); if (!q.length) return null;
  let best = null, bestScore = 0;
  for (const f of foods) {
    const names = [f.name, ...(f.aliases || "").split(",")].map(s => s.trim()).filter(Boolean);
    for (const n of names) {
      const c = toks(n); if (!c.length) continue;
      const hitQ = q.filter(t => c.some(x => tokEq(t, x))).length;
      const hitC = c.filter(t => q.some(x => tokEq(t, x))).length;
      let score = (hitQ / q.length) * 0.65 + (hitC / c.length) * 0.35;
      if (n.toLowerCase() === name.toLowerCase()) score = 2;
      if (score > bestScore) { bestScore = score; best = f; }
    }
  }
  return bestScore >= 0.6 ? best : null;
}

// ---------- nutrition for an amount ----------
// Returns {ok, values, amountText, error}
function calcItem(food, qty, unit) {
  let base = null;
  if (food.unit === "piece") {
    if (unit === "piece") base = qty;
    else return { ok: false, error: `${food.name} is counted per ${food.piece_label || "piece"}. Write it like “2 ${food.piece_label || food.name}”.` };
  } else {
    const conv = { g: 1, ml: 1, kg: 1000, l: 1000, cup: 240, tbsp: 15, tsp: 5 };
    if (unit === "piece") return { ok: false, error: `${food.name} is measured in ${food.unit}. Write it like “100${food.unit} ${food.name.toLowerCase()}”.` };
    base = qty * conv[unit];
  }
  const factor = food.unit === "piece" ? base : base / 100;
  const values = {};
  MACROS.forEach(k => values[k] = Math.round((Number(food[k]) || 0) * factor * 10) / 10);
  return { ok: true, values, factor };
}
function amountText(qty, unit, food) {
  if (unit === "piece") return fmt(qty, qty % 1 ? 1 : 0) + " × " + (food?.piece_label || "piece");
  return fmt(qty, qty % 1 ? 1 : 0) + " " + unit;
}

// Approximate values for common foods. Always check against the pack when you can.
const STARTER_FOODS = [
  { name: "Milk (toned)", aliases: "milk, toned milk, doodh", unit: "ml", kcal: 58, protein_g: 3.1, carbs_g: 4.8, fat_g: 3.0, fiber_g: 0 },
  { name: "Egg (whole)", aliases: "egg, full egg, whole egg, boiled egg, omelette egg", unit: "piece", piece_label: "egg", kcal: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8, fiber_g: 0 },
  { name: "Egg white", aliases: "egg whites, eggwhite, white of egg", unit: "piece", piece_label: "egg white", kcal: 17, protein_g: 3.6, carbs_g: 0.2, fat_g: 0.1, fiber_g: 0 },
  { name: "Guava", aliases: "amrood, jama", unit: "g", kcal: 68, protein_g: 2.6, carbs_g: 14.3, fat_g: 1.0, fiber_g: 5.4 },
  { name: "Banana", aliases: "kela", unit: "g", kcal: 89, protein_g: 1.1, carbs_g: 22.8, fat_g: 0.3, fiber_g: 2.6 },
  { name: "Apple", aliases: "", unit: "g", kcal: 52, protein_g: 0.3, carbs_g: 13.8, fat_g: 0.2, fiber_g: 2.4 },
  { name: "Papaya", aliases: "", unit: "g", kcal: 43, protein_g: 0.5, carbs_g: 10.8, fat_g: 0.3, fiber_g: 1.7 },
  { name: "Rolled oats", aliases: "oats, plain oats", unit: "g", kcal: 389, protein_g: 16.9, carbs_g: 66.3, fat_g: 6.9, fiber_g: 10.6 },
  { name: "Cooked white rice", aliases: "rice, white rice, chawal", unit: "g", kcal: 130, protein_g: 2.7, carbs_g: 28.2, fat_g: 0.3, fiber_g: 0.4 },
  { name: "Chapati", aliases: "roti, phulka, chapathi", unit: "piece", piece_label: "chapati", kcal: 100, protein_g: 3.5, carbs_g: 20, fat_g: 0.8, fiber_g: 3 },
  { name: "Cooked dal", aliases: "dal, dhal, lentils, pappu", unit: "g", kcal: 116, protein_g: 9.0, carbs_g: 20.1, fat_g: 0.4, fiber_g: 7.9 },
  { name: "Chicken breast (cooked)", aliases: "chicken, chicken breast, grilled chicken", unit: "g", kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0 },
  { name: "Paneer", aliases: "cottage cheese", unit: "g", kcal: 265, protein_g: 18.3, carbs_g: 1.2, fat_g: 20.8, fiber_g: 0 },
  { name: "Curd", aliases: "dahi, yogurt, perugu", unit: "g", kcal: 60, protein_g: 3.1, carbs_g: 4.7, fat_g: 3.3, fiber_g: 0 },
  { name: "Whey protein", aliases: "whey, protein powder, protein shake", unit: "piece", piece_label: "scoop", kcal: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, fiber_g: 0 },
  { name: "Peanut butter", aliases: "pb", unit: "g", kcal: 588, protein_g: 25, carbs_g: 20, fat_g: 50, fiber_g: 6 },
  { name: "Almonds", aliases: "badam", unit: "g", kcal: 579, protein_g: 21.2, carbs_g: 21.6, fat_g: 49.9, fiber_g: 12.5 },
  { name: "Brown bread", aliases: "bread, wheat bread", unit: "piece", piece_label: "slice", kcal: 70, protein_g: 3, carbs_g: 12, fat_g: 1, fiber_g: 2 },
  { name: "Moong sprouts", aliases: "sprouts, moong", unit: "g", kcal: 30, protein_g: 3, carbs_g: 5.9, fat_g: 0.2, fiber_g: 1.8 },
  { name: "Soya chunks (dry)", aliases: "soya, soya chunks, meal maker", unit: "g", kcal: 345, protein_g: 52, carbs_g: 33, fat_g: 0.5, fiber_g: 13 },
  { name: "Cucumber", aliases: "kheera", unit: "g", kcal: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, fiber_g: 0.5 },
  { name: "Idli", aliases: "idly", unit: "piece", piece_label: "idli", kcal: 58, protein_g: 2, carbs_g: 12, fat_g: 0.4, fiber_g: 0.8 },
  { name: "Dosa (plain)", aliases: "dosa", unit: "piece", piece_label: "dosa", kcal: 133, protein_g: 3.9, carbs_g: 21, fat_g: 3.7, fiber_g: 1 }
];

// ---------- packaged food search (Open Food Facts, free) ----------
async function searchOpenFoodFacts(q) {
  const url = "https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size&search_terms=" + encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Online search is unavailable right now. Enter the values from the pack instead.");
  const j = await res.json();
  return (j.products || []).filter(p => p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null).map(p => ({
    name: p.product_name.trim(), brand: (p.brands || "").split(",")[0].trim(),
    kcal: p.nutriments["energy-kcal_100g"], protein_g: p.nutriments.proteins_100g || 0, carbs_g: p.nutriments.carbohydrates_100g || 0,
    fat_g: p.nutriments.fat_100g || 0, fiber_g: p.nutriments.fiber_100g || 0
  }));
}

// ---------- shared food form (used on Foods and Log pages) ----------
// mount(container, {initial, onSaved, onCancel})
function foodFormHTML() {
  return `
  <form class="foodform" autocomplete="off">
    <label>Food name<input name="name" required maxlength="120" placeholder="e.g. Yogabar dark chocolate protein oats"></label>
    <label style="margin-top:10px">Other names you might type <span class="muted">(optional, comma separated)</span><input name="aliases" maxlength="300" placeholder="e.g. yogabar oats, protein oats"></label>
    <div class="grid2" style="margin-top:10px">
      <label>Nutrition is given<select name="unit">
        <option value="g">per 100 g</option><option value="ml">per 100 ml</option><option value="piece">per 1 piece</option>
      </select></label>
      <label class="pl">Piece is called<input name="piece_label" maxlength="30" placeholder="e.g. egg, scoop, slice"></label>
    </div>
    <div class="grid2 grid3" style="margin-top:10px">
      <label>Calories (kcal)<input name="kcal" type="number" step="0.1" min="0" inputmode="decimal" required></label>
      <label>Protein (g)<input name="protein_g" type="number" step="0.1" min="0" inputmode="decimal" required></label>
      <label>Carbs (g)<input name="carbs_g" type="number" step="0.1" min="0" inputmode="decimal"></label>
      <label>Fat (g)<input name="fat_g" type="number" step="0.1" min="0" inputmode="decimal"></label>
      <label>Fiber (g)<input name="fiber_g" type="number" step="0.1" min="0" inputmode="decimal"></label>
    </div>
    <details class="off" style="margin-top:12px"><summary>Search packaged foods online</summary>
      <div class="datebar"><input class="offq" placeholder="e.g. yogabar protein oats"><button type="button" class="offgo" aria-label="Search">⌕</button></div>
      <div class="offres"></div>
      <p class="muted" style="font-size:.8rem;margin:6px 0 0">Results come from Open Food Facts and are per 100 g. Check them against your pack.</p>
    </details>
    <div class="grid2" style="margin-top:14px">
      <button class="btn" type="submit">Save food</button>
      <button class="btn ghost cancel" type="button">Cancel</button>
    </div>
    <div class="msg" role="status"></div>
  </form>`;
}
function mountFoodForm(container, { initial = {}, onSaved, onCancel } = {}) {
  container.innerHTML = foodFormHTML();
  const f = container.querySelector("form"), E = k => f.elements.namedItem(k), msg = f.querySelector(".msg");
  ["name", "aliases", "unit", "piece_label", ...MACROS].forEach(k => { if (initial[k] != null) E(k).value = initial[k]; });
  const syncPiece = () => { f.querySelector(".pl").classList.toggle("hidden", E("unit").value !== "piece"); };
  E("unit").onchange = syncPiece; syncPiece();
  f.querySelector(".cancel").onclick = () => onCancel && onCancel();
  const doSearch = async () => {
    const q = f.querySelector(".offq").value.trim(), box = f.querySelector(".offres");
    if (!q) return;
    box.innerHTML = '<p class="muted">Searching…</p>';
    try {
      const res = await searchOpenFoodFacts(q);
      if (!res.length) { box.innerHTML = '<p class="muted">No matches. Try fewer words, or enter the values from the pack.</p>'; return; }
      box.innerHTML = res.map((r, i) => `<button type="button" class="offitem" data-i="${i}"><b>${esc(r.name)}</b>${r.brand ? " · " + esc(r.brand) : ""}<br><span class="muted">${fmt(r.kcal)} kcal · ${fmt(r.protein_g, 1)} g protein · ${fmt(r.fiber_g, 1)} g fiber per 100 g</span></button>`).join("");
      box.querySelectorAll(".offitem").forEach(b => b.onclick = () => {
        const r = res[b.dataset.i];
        if (!E("name").value) E("name").value = (r.brand ? r.brand + " " : "") + r.name;
        E("unit").value = "g"; syncPiece();
        MACROS.forEach(k => E(k).value = Math.round(r[k] * 10) / 10);
        f.querySelector(".off").open = false;
        showMsg(msg, "Filled from Open Food Facts. Check it against your pack, then save.");
      });
    } catch (e) { box.innerHTML = `<p class="bad">${esc(errText(e))}</p>`; }
  };
  f.querySelector(".offgo").onclick = doSearch;
  f.querySelector(".offq").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { name: E("name").value.trim(), aliases: E("aliases").value.trim() || null, unit: E("unit").value, piece_label: E("unit").value === "piece" ? (E("piece_label").value.trim() || null) : null };
    MACROS.forEach(k => row[k] = Number(E(k).value || 0));
    if (initial.id) row.id = initial.id;
    const btn = f.querySelector('[type="submit"]'); btn.disabled = true;
    try { const saved = await saveFood(row); onSaved && onSaved(saved); }
    catch (err) { showMsg(msg, errText(err), true); }
    finally { btn.disabled = false; }
  };
  setTimeout(() => E("name").focus(), 0);
}
