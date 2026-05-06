import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { header: "Accoutrements", groups: ["Accoutrements Class A", "Accoutrements Class B"] },
  { header: "Uniforms", groups: ["Class A Uniform", "Class B Uniform", "Class C Uniform", "PT Uniform"] },
  { header: "Ribbons", groups: ["Ribbons", "Ribbon Backers / Devices"] },
  { header: "Patches", groups: ["Position Patches"] },
];

// Navy header colors
const NAV_BG = "#0C2340";
const NAV_TEXT = "#cbd5e1";
const NAV_TEXT_ACTIVE = "#ffffff";

// Shared style objects
const STYLES = {
  card: { background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, padding: 14 },
  cardHeader: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#0C2340", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #C9A84C", paddingBottom: 6 },
  button: { padding: "10px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 },
  buttonPrimary: { border: "none", background: "#185FA5", color: "#fff" },
  buttonSecondary: { border: "0.5px solid #d1d5db", background: "#fff", color: "#111827" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 999 },
  label: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  const userRole = { role: "state_admin", full_name: "CACC State HQ" };
  const [page, setPage] = useState("state");
  const [categories, setCategories] = useState({});
  const [brigades, setBrigades] = useState([]);
  const [battalions, setBattalions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stateInventory, setStateInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [catRes, brigRes, batRes, invRes, stateInvRes] = await Promise.all([
      supabase.from("catalog_items").select("*").order("sort_order"),
      supabase.from("brigades").select("*").order("brigade_number"),
      supabase.from("battalions").select("*").order("unit_number"),
      supabase.from("inventory").select("*"),
      supabase.from("state_inventory").select("*"),
    ]);
    if (!catRes.error) {
      const grouped = catRes.data.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
      setCategories(grouped);
    }
    if (!brigRes.error) setBrigades(brigRes.data);
    if (!batRes.error) setBattalions(batRes.data);
    if (!invRes.error) setInventory(invRes.data);
    if (!stateInvRes.error) setStateInventory(stateInvRes.data);
    setLoading(false);
  }

  async function fetchInventoryOnly() {
    const [invRes, stateInvRes] = await Promise.all([
      supabase.from("inventory").select("*"),
      supabase.from("state_inventory").select("*"),
    ]);
    if (!invRes.error) setInventory(invRes.data);
    if (!stateInvRes.error) setStateInventory(stateInvRes.data);
  }

  async function fetchBattalionsOnly() {
    const { data } = await supabase.from("battalions").select("*").order("unit_number");
    if (data) setBattalions(data);
  }

  function onStockToggle(freshCategories) {
    setCategories(freshCategories);
  }

  const isStateAdmin = userRole.role === "state_admin";
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole.role);

  const tabs = [
    { id: "state", label: "State dashboard" },
    { id: "brigade", label: "Brigade inventory" },
    { id: "battalion", label: "Battalion dashboard" },
    { id: "units", label: "Unit management" },
    ...(isAdminOrAbove ? [{ id: "requests", label: "Supply requests", badge: 0 }] : []),
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Navigation Header */}
      <div style={{ background: NAV_BG, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 56 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", marginRight: 20, flexShrink: 0, letterSpacing: "0.02em" }}>
          CACC <span style={{ color: "#60a5fa" }}>Inventory</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }} className="desktop-tabs">
            {tabs.map(t => (
              <div key={t.id} onClick={() => setPage(t.id)} style={{ padding: "18px 14px", fontSize: 13, cursor: "pointer", borderBottom: page === t.id ? `2px solid #60a5fa` : "2px solid transparent", color: page === t.id ? NAV_TEXT_ACTIVE : NAV_TEXT, fontWeight: page === t.id ? 600 : 400, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s" }}>
                {t.label}
                {t.badge > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>{t.badge}</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setMenuOpen(m => !m)} className="mobile-menu-btn" style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #334155", background: "transparent", fontSize: 13, cursor: "pointer", color: "#fff", flexShrink: 0 }}>{menuOpen ? "✕" : "☰"}</button>
        </div>
      </div>

      <style>{`.desktop-tabs{display:flex}.mobile-menu-btn{display:none}@media(max-width:768px){.desktop-tabs{display:none!important}.mobile-menu-btn{display:block!important}}`}</style>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ background: NAV_BG, borderBottom: "0.5px solid #1e3a5f", padding: "8px 0" }}>
          {tabs.map(t => (
            <div key={t.id} onClick={() => { setPage(t.id); setMenuOpen(false); }} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", background: page === t.id ? "#1e3a5f" : "transparent", color: page === t.id ? "#60a5fa" : NAV_TEXT, fontWeight: page === t.id ? 600 : 400, borderLeft: page === t.id ? "3px solid #60a5fa" : "3px solid transparent", display: "flex", alignItems: "center", gap: 8 }}>
              {t.label}
              {t.badge > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>{t.badge}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Page Content */}
      <div style={{ padding: 16 }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div> : (
          <>
            {page === "state" && <StateDashboard categories={categories} brigades={brigades} battalions={battalions} inventory={inventory} stateInventory={stateInventory} fetchInventoryOnly={fetchInventoryOnly} userRole={userRole} onStockToggle={onStockToggle} />}
            {page === "brigade" && <BrigadePage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} />}
            {page === "battalion" && <BattalionPage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} fetchInventoryOnly={fetchInventoryOnly} userRole={userRole} />}
            {page === "units" && <UnitsPage brigades={brigades} battalions={battalions} fetchBattalionsOnly={fetchBattalionsOnly} />}
            {page === "requests" && isAdminOrAbove && <SupplyRequestsPage brigades={brigades} battalions={battalions} categories={categories} inventory={inventory} userRole={userRole} />}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function sortBattalions(battalions) {
  return [...battalions].sort((a, b) => {
    const aParts = (a.unit_number || "").split("-").map(n => parseInt(n) || 0);
    const bParts = (b.unit_number || "").split("-").map(n => parseInt(n) || 0);
    if (aParts[0] !== bParts[0]) return aParts[0] - bParts[0];
    return (aParts[1] || 0) - (bParts[1] || 0);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

function sumInv(inventory, battalionIds, catalogItemId) {
  const rows = inventory.filter(i => battalionIds.includes(i.battalion_id) && i.catalog_item_id === catalogItemId);
  return {
    qty_serviceable: rows.reduce((s, r) => s + (r.qty_serviceable || 0), 0),
    qty_unserviceable: rows.reduce((s, r) => s + (r.qty_unserviceable || 0), 0),
    qty_issued: rows.reduce((s, r) => s + (r.qty_issued || 0), 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS (CSV & PDF)
// ═══════════════════════════════════════════════════════════════════════════

function exportInventoryCSV(label, rows) {
  let csv = `CACC Inventory Export — ${label}\nGenerated: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}\n\nSection,Category,Item,Size,Serviceable,Unserviceable,Issued,In Stock\n`;
  rows.forEach(r => {
    csv += `"${r.section}","${r.category}","${r.item}","${r.size}",${r.svc},${r.unsvc},${r.issued},${r.inStock}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Inventory-${label.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function buildPDFHeader(label, subtitle) {
  return `<h1>CACC Inventory Export — ${label}</h1><h2>${subtitle}</h2><div class="meta">Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</div>`;
}

function buildPDFStyles() {
  return `<style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}h1{font-size:16px;margin-bottom:2px}h2{font-size:12px;font-weight:normal;color:#555;margin-bottom:4px}.meta{font-size:10px;color:#888;margin-bottom:20px}h3{font-size:12px;text-transform:uppercase;text-decoration:underline;margin:16px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed}th{text-align:left;padding:6px 8px;background:#2c3e50;color:#fff;font-size:10px;font-weight:600;border:1px solid #1a252f}th:nth-child(1){width:40%}th:nth-child(2){width:15%}th:nth-child(3){width:11%}th:nth-child(4){width:11%}th:nth-child(5){width:11%}th:nth-child(6){width:12%}td{padding:6px 8px;border:0.5px solid #e5e7eb;font-size:10px}tbody tr:nth-child(odd){background-color:#fff}tbody tr:nth-child(even){background-color:#f8f9fa}td:nth-child(1){text-align:left;word-break:break-word}td:nth-child(2){text-align:left;color:#6b7280}td:nth-child(3),td:nth-child(4),td:nth-child(5),td:nth-child(6){text-align:right;padding-right:12px}td:nth-child(6) strong{font-weight:700}</style>`;
}

function exportInventoryPDF(label, subtitle, rows) {
  let html = `<html><head>${buildPDFStyles()}</head><body>`;
  html += buildPDFHeader(label, subtitle);
  
  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.section]) grouped[r.section] = {};
    if (!grouped[r.section][r.category]) grouped[r.section][r.category] = [];
    grouped[r.section][r.category].push(r);
  });
  
  Object.entries(grouped).forEach(([sec, cats]) => {
    html += `<h3>${sec}</h3>`;
    Object.entries(cats).forEach(([cat, items]) => {
      html += `<table><thead><tr><th colspan="2">${cat}</th><th>Svc</th><th>Unsvc</th><th>Issued</th><th>In Stock</th></tr></thead><tbody>`;
      items.forEach(i => { 
        html += `<tr><td>${i.item}</td><td>${i.size}</td><td>${i.svc}</td><td style="color:${i.unsvc > 0 ? "#991b1b" : "#111"}">${i.unsvc}</td><td>${i.issued}</td><td><strong>${i.inStock}</strong></td></tr>`; 
      });
      html += `</tbody></table>`;
    });
  });
  
  html += `</body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function StateDashboard({ categories, brigades, battalions, inventory, stateInventory, fetchInventoryOnly, userRole, onStockToggle }) {
  const [open, setOpen] = useState({});
  const [localCats, setLocalCats] = useState(categories);
  const [localStateInv, setLocalStateInv] = useState(stateInventory);
  const [sectionEdits, setSectionEdits] = useState({});
  const [savingSection, setSavingSection] = useState({});
  const [savedSection, setSavedSection] = useState({});
  const [noticeBanner, setNoticeBanner] = useState("");
  const [noticeEdit, setNoticeEdit] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previousOpenState, setPreviousOpenState] = useState({});

  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const activeBattalions = battalions.filter(b => b.status === "active");
  const totalCadets = battalions.reduce((s, b) => s + (b.cadet_count || 0), 0);
  const allBattalionIds = battalions.map(b => b.id);
  const allItems = Object.values(localCats).flat();
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole?.role);

  useEffect(() => { setLocalCats(categories); }, [categories]);
  useEffect(() => { setLocalStateInv(stateInventory); }, [stateInventory]);
  useEffect(() => { fetchNotice(); }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      if (Object.keys(previousOpenState).length === 0) {
        setPreviousOpenState(open);
      }
      
      const newOpen = {};
      SECTIONS.forEach(section => {
        section.groups.forEach(cat => {
          const items = localCats[cat] || [];
          const hasMatch = items.some(item => 
            item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
          );
          newOpen[cat] = hasMatch;
        });
      });
      setOpen(newOpen);
    } else if (searchQuery === "" && Object.keys(previousOpenState).length > 0) {
      setOpen(previousOpenState);
      setPreviousOpenState({});
    }
  }, [searchQuery, localCats]);

  function filterItems(items) {
    if (!searchQuery.trim()) return items;
    return items.filter(item =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  async function fetchNotice() {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "state_notice").single();
    if (data) setNoticeBanner(data.value || "");
  }

  async function saveNotice() {
    setNoticeSaving(true);
    await supabase.from("app_settings").upsert({ key: "state_notice", value: noticeBanner }, { onConflict: "key" });
    setNoticeSaving(false);
    setNoticeEdit(false);
  }

  function getStateInv(itemId) { 
    return localStateInv.find(s => s.catalog_item_id === itemId) || { qty_warehouse: 0, shortage_threshold: 0 }; 
  }
  
  function getEdit(cat, itemId, field) {
    if (sectionEdits[cat]?.[itemId]?.[field] !== undefined) return sectionEdits[cat][itemId][field];
    const si = getStateInv(itemId);
    if (field === "qty_warehouse") return si.qty_warehouse || 0;
    if (field === "shortage_threshold") return si.shortage_threshold || 0;
    return 0;
  }
  
  function setEdit(cat, itemId, field, value) { 
    setSectionEdits(e => ({ ...e, [cat]: { ...e[cat], [itemId]: { ...e[cat]?.[itemId], [field]: parseInt(value) || 0 } } })); 
  }
  
  function catHasEdits(cat) { 
    return sectionEdits[cat] && Object.keys(sectionEdits[cat]).length > 0; 
  }

  function toggleStock(item, cat) {
    const newVal = !item.in_stock;
    const now = newVal ? null : new Date().toISOString();
    const updatedCats = {};
    for (const [category, items] of Object.entries(localCats)) {
      updatedCats[category] = items.map(i => i.id === item.id ? { ...i, in_stock: newVal, out_of_stock_at: now } : i);
    }
    setLocalCats(updatedCats);
    onStockToggle(updatedCats);
    
    // Mark this section as having edits so the save button appears
    setSectionEdits(e => ({ 
      ...e, 
      [cat]: { 
        ...e[cat], 
        [item.id]: { 
          ...e[cat]?.[item.id], 
          _stockChanged: true,
          in_stock: newVal,
          out_of_stock_at: now
        } 
      } 
    }));
  }

  async function saveSection(cat, items) {
    setSavingSection(s => ({ ...s, [cat]: true }));
    for (const item of items) {
      if (!sectionEdits[cat]?.[item.id]) continue;
      
      // Check if this is a stock status change
      if (sectionEdits[cat][item.id]._stockChanged) {
        const stockData = {
          in_stock: sectionEdits[cat][item.id].in_stock,
          out_of_stock_at: sectionEdits[cat][item.id].out_of_stock_at
        };
        await supabase.from("catalog_items").update(stockData).eq("id", item.id);
      }
      
      const existing = localStateInv.find(s => s.catalog_item_id === item.id);
      const data = { 
        catalog_item_id: item.id, 
        qty_warehouse: getEdit(cat, item.id, "qty_warehouse"), 
        shortage_threshold: getEdit(cat, item.id, "shortage_threshold"), 
        updated_at: new Date().toISOString() 
      };
      if (existing) {
        await supabase.from("state_inventory").update(data).eq("id", existing.id);
      } else {
        await supabase.from("state_inventory").insert([data]);
      }
    }
    
    // Refresh catalog items to get updated stock status
    const { data: freshCatalog } = await supabase.from("catalog_items").select("*").order("sort_order");
    if (freshCatalog) {
      const grouped = freshCatalog.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
      setLocalCats(grouped);
      onStockToggle(grouped);
    }
    
    const { data: fresh } = await supabase.from("state_inventory").select("*");
    if (fresh) setLocalStateInv(fresh);
    setSectionEdits(e => { const n = { ...e }; delete n[cat]; return n; });
    setSavingSection(s => ({ ...s, [cat]: false }));
    setSavedSection(s => ({ ...s, [cat]: true }));
    setTimeout(() => setSavedSection(s => ({ ...s, [cat]: false })), 3000);
  }

  function buildExportRows() {
    const rows = [];
    SECTIONS.forEach(section => {
      section.groups.forEach(cat => {
        (localCats[cat] || []).forEach(item => {
          const battalionInv = sumInv(inventory, allBattalionIds, item.id);
          const warehouse = getEdit(cat, item.id, "qty_warehouse");
          const inStock = Math.max(0, warehouse - (battalionInv.qty_issued || 0));
          rows.push({ 
            section: section.header, 
            category: cat, 
            item: item.item_name, 
            size: item.size_label, 
            svc: warehouse, 
            unsvc: battalionInv.qty_unserviceable, 
            issued: battalionInv.qty_issued, 
            inStock 
          });
        });
      });
    });
    return rows;
  }

  return (
    <div>
      {/* State Notice Board */}
      {(noticeBanner || isAdminOrAbove) && (
        <div style={{ background: "#fef3c7", border: "0.5px solid #fcd34d", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>State HQ Notice</div>
              {noticeEdit ? (
                <textarea value={noticeBanner} onChange={e => setNoticeBanner(e.target.value)} rows={3} style={{ ...STYLES.input, resize: "vertical", border: "0.5px solid #fcd34d" }} placeholder="Enter a notice for all units (e.g. supply delays, known shortages)..." />
              ) : (
                <div style={{ fontSize: 13, color: "#92400e" }}>{noticeBanner || <span style={{ color: "#d97706", fontStyle: "italic" }}>No active notice. Click Edit to add one.</span>}</div>
              )}
            </div>
            {isAdminOrAbove && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {noticeEdit ? (
                  <>
                    <button onClick={saveNotice} disabled={noticeSaving} style={{ ...STYLES.button, ...STYLES.buttonPrimary, background: "#92400e", padding: "6px 12px", fontSize: 12 }}>{noticeSaving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setNoticeEdit(false)} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "6px 12px", fontSize: 12, border: "0.5px solid #fcd34d", color: "#92400e" }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setNoticeEdit(true)} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "6px 12px", fontSize: 12, border: "0.5px solid #fcd34d", color: "#92400e" }}>Edit</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[["Active battalions", activeBattalions.length], ["Total cadets", totalCadets.toLocaleString()], ["Catalog items", allItems.length], ["Out of stock", allItems.filter(i => !i.in_stock).length]].map(([label, value]) => (
          <div key={label} style={{ background: "#0C2340", border: "0.5px solid #e5e7eb", borderTop: "2px solid #C9A84C", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Export Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        <button onClick={() => exportInventoryCSV("State-All", buildExportRows())} style={{ ...STYLES.button, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A" }}>Export inventory — CSV</button>
        <button onClick={() => exportInventoryPDF("State — All Units", "Complete state warehouse inventory", buildExportRows())} style={{ ...STYLES.button, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C" }}>Export inventory — PDF</button>
      </div>

      {/* Search Bar with Expand/Collapse Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 auto", maxWidth: 320, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 16 }}>🔍</div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search items, ribbons, patches..."
            style={{ ...STYLES.input, paddingLeft: 40, minHeight: 44 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => {
              const newOpen = {};
              SECTIONS.forEach(section => {
                section.groups.forEach(cat => {
                  newOpen[cat] = true;
                });
              });
              setOpen(newOpen);
            }}
            style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
          >
            Expand all
          </button>
          <button 
            onClick={() => setOpen({})}
            style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Inventory Sections */}
      {SECTIONS.map(section => (
        <div key={section.header} style={{ marginBottom: 20 }}>
          <div style={STYLES.sectionHeader}>{section.header}</div>
          {section.groups.map(cat => {
            const items = localCats[cat] || [];
            const filteredItems = filterItems(items);
            if (filteredItems.length === 0) return null;
            const hasEdits = catHasEdits(cat);
            return (
              <div key={cat} style={{ ...STYLES.card, padding: 0, marginBottom: 8, overflow: "hidden", borderLeft: open[cat] ? "3px solid #0C2340" : "none" }}>
                <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...STYLES.badge, background: "#f3f4f6", color: "#6b7280" }}>{filteredItems.length}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {open[cat] && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(6, minmax(60px, 1fr))", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8, overflowX: "auto" }}>
                      {["Item / Size", "Stock", "Alert", "Warehouse", "Unserviceable", "Issued", "In stock"].map((h, i) => (
                        <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "center", minWidth: i === 0 ? "auto" : "60px" }}>{h}</div>
                      ))}
                    </div>
                    {filteredItems.map(item => {
                      const battalionInv = sumInv(inventory, allBattalionIds, item.id);
                      const warehouse = getEdit(cat, item.id, "qty_warehouse");
                      const threshold = getEdit(cat, item.id, "shortage_threshold");
                      const inStock = Math.max(0, warehouse - (battalionInv.qty_issued || 0));
                      const isAlert = threshold > 0 && inStock < threshold;
                      return (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr repeat(6, minmax(60px, 1fr))", padding: "6px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, background: isAlert ? "#FEF2F2" : "#fff", overflowX: "auto" }}>
                          <div style={{ minWidth: 150 }}>
                            <div style={{ fontSize: 13, color: "#111827", fontWeight: isAlert ? 600 : 400 }}>{item.item_name} <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>— {item.size_label}</span></div>
                          </div>
                          <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                            <button onClick={() => { if (!item.in_stock) toggleStock(item, cat); }} style={{ flex: 1, padding: "4px 2px", borderRadius: 6, border: item.in_stock ? "1.5px solid #166534" : "0.5px solid #e5e7eb", background: item.in_stock ? "#dcfce7" : "#fff", color: item.in_stock ? "#166534" : "#9ca3af", fontSize: 9, cursor: item.in_stock ? "default" : "pointer", fontWeight: 500, minWidth: 28 }}>In</button>
                            <button onClick={() => { if (item.in_stock) toggleStock(item, cat); }} style={{ flex: 1, padding: "4px 2px", borderRadius: 6, border: !item.in_stock ? "1.5px solid #991b1b" : "0.5px solid #e5e7eb", background: !item.in_stock ? "#fee2e2" : "#fff", color: !item.in_stock ? "#991b1b" : "#9ca3af", fontSize: 9, cursor: !item.in_stock ? "default" : "pointer", fontWeight: 500, minWidth: 28 }}>Out</button>
                          </div>
                          <div style={{ textAlign: "center" }}><input type="number" min="0" value={threshold} onChange={e => setEdit(cat, item.id, "shortage_threshold", e.target.value)} style={{ width: "100%", maxWidth: 60, padding: "4px", borderRadius: 6, border: isAlert ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} /></div>
                          <div style={{ textAlign: "center" }}><input type="number" min="0" value={warehouse} onChange={e => setEdit(cat, item.id, "qty_warehouse", e.target.value)} style={{ width: "100%", maxWidth: 70, padding: "4px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} /></div>
                          <div style={{ fontSize: 13, color: battalionInv.qty_unserviceable > 0 ? "#991b1b" : "#111827", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{battalionInv.qty_unserviceable}</div>
                          <div style={{ fontSize: 13, color: "#111827", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{battalionInv.qty_issued}</div>
                          <div style={{ textAlign: "center" }}><span style={{ ...STYLES.badge, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                        </div>
                      );
                    })}
                    {hasEdits && (
                      <div style={{ padding: "10px 14px", background: "#f9fafb", borderTop: "0.5px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => saveSection(cat, items)} disabled={savingSection[cat]} style={{ ...STYLES.button, ...STYLES.buttonPrimary }}>
                          {savingSection[cat] ? "Saving..." : savedSection[cat] ? "Saved!" : `Save ${cat}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BRIGADE PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function BrigadePage({ brigades, battalions, inventory, categories }) {
  const [selectedBrigade, setSelectedBrigade] = useState("");
  const [open, setOpen] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [previousOpenState, setPreviousOpenState] = useState({});
  
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const toggleItem = itemId => setExpandedItems(o => ({ ...o, [itemId]: !o[itemId] }));

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      if (Object.keys(previousOpenState).length === 0) {
        setPreviousOpenState(open);
      }
      
      const newOpen = {};
      SECTIONS.forEach(section => {
        section.groups.forEach(cat => {
          const items = categories[cat] || [];
          const hasMatch = items.some(item => 
            item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
          );
          newOpen[cat] = hasMatch;
        });
      });
      setOpen(newOpen);
    } else if (searchQuery === "" && Object.keys(previousOpenState).length > 0) {
      setOpen(previousOpenState);
      setPreviousOpenState({});
    }
  }, [searchQuery, categories]);

  function filterItems(items) {
    if (!searchQuery.trim()) return items;
    return items.filter(item =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const brigade = brigades.find(b => b.id === selectedBrigade);
  const brigadeBattalions = sortBattalions(battalions.filter(b => b.brigade_id === selectedBrigade));
  const battalionIds = brigadeBattalions.map(b => b.id);
  const totalCadets = brigadeBattalions.reduce((s, b) => s + (b.cadet_count || 0), 0);

  function getBattalionAlert(battalion) {
    return inventory.filter(i => i.battalion_id === battalion.id).some(i => { 
      const t = i.shortage_threshold || 0; 
      if (!t) return false; 
      return Math.max(0, (i.qty_serviceable || 0) - (i.qty_issued || 0)) < t; 
    });
  }

  function buildExportRows() {
    const rows = [];
    SECTIONS.forEach(section => {
      section.groups.forEach(cat => {
        (categories[cat] || []).forEach(item => {
          const inv = sumInv(inventory, battalionIds, item.id);
          const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
          rows.push({ 
            section: section.header, 
            category: cat, 
            item: item.item_name, 
            size: item.size_label, 
            svc: inv.qty_serviceable, 
            unsvc: inv.qty_unserviceable, 
            issued: inv.qty_issued, 
            inStock 
          });
        });
      });
    });
    return rows;
  }

  return (
    <div>
      <select onChange={e => { setSelectedBrigade(e.target.value); setOpen({}); setExpandedItems({}); }} value={selectedBrigade} style={{ ...STYLES.input, marginBottom: 16 }}>
        <option value="">Select a brigade...</option>
        {brigades.map(b => <option key={b.id} value={b.id}>{b.name} — {b.region}</option>)}
      </select>

      {brigade && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[["Battalions", brigadeBattalions.length], ["Active", brigadeBattalions.filter(b => b.status === "active").length], ["Cadets", totalCadets]].map(([label, value]) => (
              <div key={label} style={{ background: "#0C2340", border: "0.5px solid #e5e7eb", borderTop: "2px solid #C9A84C", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <button onClick={() => exportInventoryCSV(`${brigade.name.replace(/\s+/g, "-")}`, buildExportRows())} style={{ ...STYLES.button, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A" }}>Export inventory — CSV</button>
            <button onClick={() => exportInventoryPDF(brigade.name, `Aggregate inventory across ${brigadeBattalions.length} battalions`, buildExportRows())} style={{ ...STYLES.button, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C" }}>Export inventory — PDF</button>
          </div>

          {/* Search Bar with Expand/Collapse Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 auto", maxWidth: 320, minWidth: 200 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 16 }}>🔍</div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search items, ribbons, patches..."
                style={{ ...STYLES.input, paddingLeft: 40, minHeight: 44 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={() => {
                  const newOpen = {};
                  SECTIONS.forEach(section => {
                    section.groups.forEach(cat => {
                      newOpen[cat] = true;
                    });
                  });
                  setOpen(newOpen);
                }}
                style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
              >
                Expand all
              </button>
              <button 
                onClick={() => setOpen({})}
                style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Battalion List */}
          <div style={{ ...STYLES.card, padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 600, fontSize: 13, color: "#111827" }}>Battalions in {brigade.name}</div>
            {brigadeBattalions.map(battalion => {
              const hasAlert = getBattalionAlert(battalion);
              return (
                <div key={battalion.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: hasAlert ? "#FEF2F2" : "#fff", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {battalion.unit_number}
                      {hasAlert && <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: 999 }}>shortage alert</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{battalion.school_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#111827" }}>{battalion.cadet_count} cadets</div>
                    <span style={{ ...STYLES.badge, background: battalion.status === "active" ? "#dcfce7" : "#f3f4f6", color: battalion.status === "active" ? "#166534" : "#6b7280" }}>{battalion.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregate Inventory */}
          <div style={STYLES.cardHeader}>Aggregate inventory — {brigade.name}</div>
          {SECTIONS.map(section => (
            <div key={section.header} style={{ marginBottom: 20 }}>
              <div style={STYLES.sectionHeader}>{section.header}</div>
              {section.groups.map(cat => {
                const items = categories[cat] || [];
                const filteredItems = filterItems(items);
                if (filteredItems.length === 0) return null;
                return (
                  <div key={cat} style={{ ...STYLES.card, padding: 0, marginBottom: 8, overflow: "hidden", borderLeft: open[cat] ? "3px solid #0C2340" : "none" }}>
                    <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...STYLES.badge, background: "#f3f4f6", color: "#6b7280" }}>{filteredItems.length}</span>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {open[cat] && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, minmax(70px, 1fr))", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8, overflowX: "auto" }}>
                          {["Item / Size", "Svc", "Unsvc", "Issued", "In stock"].map((h, i) => (
                            <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "right", minWidth: i === 0 ? "auto" : "70px" }}>{h}</div>
                          ))}
                        </div>

                        {filteredItems.map(item => {
                          const inv = sumInv(inventory, battalionIds, item.id);
                          const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
                          const isExpanded = expandedItems[item.id];

                          return (
                            <div key={item.id}>
                              {/* Brigade aggregate row */}
                              <div onClick={() => toggleItem(item.id)} style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, minmax(70px, 1fr))", padding: "6px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, cursor: "pointer", background: isExpanded ? "#f9fafb" : "#fff", overflowX: "auto" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 150 }}>
                                  <span style={{ fontSize: 11, color: "#185FA5", flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                                  <div>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.item_name} <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>— {item.size_label}</span></span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, color: "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_serviceable}</div>
                                <div style={{ fontSize: 13, color: inv.qty_unserviceable > 0 ? "#991b1b" : "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_unserviceable}</div>
                                <div style={{ fontSize: 13, color: "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_issued}</div>
                                <div style={{ textAlign: "right" }}><span style={{ ...STYLES.badge, background: inStock > 0 ? "#dcfce7" : "#f3f4f6", color: inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                              </div>

                              {/* Battalion breakdown rows */}
                              {isExpanded && brigadeBattalions.map(battalion => {
                                const battalionRow = inventory.find(i => i.battalion_id === battalion.id && i.catalog_item_id === item.id);
                                const bSvc = battalionRow?.qty_serviceable || 0;
                                const bUnsvc = battalionRow?.qty_unserviceable || 0;
                                const bIssued = battalionRow?.qty_issued || 0;
                                const bStock = Math.max(0, bSvc - bIssued);
                                return (
                                  <div key={battalion.id} style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, minmax(70px, 1fr))", padding: "5px 14px 5px 36px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, background: "#f9fafb", overflowX: "auto" }}>
                                    <div style={{ minWidth: 150 }}>
                                      <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>{battalion.unit_number}</span>
                                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{battalion.school_name}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bSvc}</div>
                                    <div style={{ fontSize: 12, color: bUnsvc > 0 ? "#991b1b" : "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bUnsvc}</div>
                                    <div style={{ fontSize: 12, color: "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bIssued}</div>
                                    <div style={{ textAlign: "right" }}><span style={{ ...STYLES.badge, background: bStock > 0 ? "#dcfce7" : "#f3f4f6", color: bStock > 0 ? "#166534" : "#6b7280" }}>{bStock}</span></div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BATTALION PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function BattalionPage({ brigades, battalions, inventory, categories, fetchInventoryOnly, userRole }) {
  const [selectedBattalion, setSelectedBattalion] = useState("");
  const [open, setOpen] = useState({});
  const [sectionEdits, setSectionEdits] = useState({});
  const [showSupply, setShowSupply] = useState(false);
  const [supplyQtys, setSupplyQtys] = useState({});
  const [supplyOpen, setSupplyOpen] = useState({});
  const [savingSection, setSavingSection] = useState({});
  const [savedSection, setSavedSection] = useState({});
  const [localInventory, setLocalInventory] = useState(inventory);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previousOpenState, setPreviousOpenState] = useState({});

  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const toggleSupplyCat = cat => setSupplyOpen(o => ({ ...o, [cat]: !o[cat] }));

  useEffect(() => { setLocalInventory(inventory); }, [inventory]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      if (Object.keys(previousOpenState).length === 0) {
        setPreviousOpenState(open);
      }
      
      const newOpen = {};
      SECTIONS.forEach(section => {
        section.groups.forEach(cat => {
          const items = categories[cat] || [];
          const hasMatch = items.some(item => 
            item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
          );
          newOpen[cat] = hasMatch;
        });
      });
      setOpen(newOpen);
    } else if (searchQuery === "" && Object.keys(previousOpenState).length > 0) {
      setOpen(previousOpenState);
      setPreviousOpenState({});
    }
  }, [searchQuery, categories]);

  function filterItems(items) {
    if (!searchQuery.trim()) return items;
    return items.filter(item =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.size_label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const battalion = battalions.find(b => b.id === selectedBattalion);
  const brigade = battalion ? brigades.find(b => b.id === battalion.brigade_id) : null;

  function getInvRow(itemId) { 
    return localInventory.find(i => i.battalion_id === selectedBattalion && i.catalog_item_id === itemId); 
  }
  
  function getEdit(cat, itemId, field) {
    if (sectionEdits[cat]?.[itemId]?.[field] !== undefined) return sectionEdits[cat][itemId][field];
    const inv = getInvRow(itemId);
    return inv ? (inv[field] || 0) : 0;
  }
  
  function setEdit(cat, itemId, field, value) { 
    setSectionEdits(e => ({ ...e, [cat]: { ...e[cat], [itemId]: { ...e[cat]?.[itemId], [field]: parseInt(value) || 0 } } })); 
  }
  
  function catHasEdits(cat) { 
    return sectionEdits[cat] && Object.keys(sectionEdits[cat]).length > 0; 
  }

  async function fetchMyRequests(battalionId) {
    const { data } = await supabase.from("supply_requests").select("*, supply_request_items(*)").eq("battalion_id", battalionId).order("created_at", { ascending: false });
    setMyRequests(data || []);
  }

  async function saveSection(cat, items) {
    setSavingSection(s => ({ ...s, [cat]: true }));
    const newInvRows = [];
    for (const item of items) {
      if (!sectionEdits[cat]?.[item.id]) continue;
      const existing = getInvRow(item.id);
      const data = { 
        battalion_id: selectedBattalion, 
        catalog_item_id: item.id, 
        qty_serviceable: getEdit(cat, item.id, "qty_serviceable"), 
        qty_unserviceable: getEdit(cat, item.id, "qty_unserviceable"), 
        qty_issued: getEdit(cat, item.id, "qty_issued"), 
        shortage_threshold: getEdit(cat, item.id, "shortage_threshold"), 
        updated_at: new Date().toISOString() 
      };
      if (existing) {
        await supabase.from("inventory").update(data).eq("id", existing.id);
        newInvRows.push({ ...existing, ...data });
      } else {
        const { data: inserted } = await supabase.from("inventory").insert([data]).select().single();
        if (inserted) newInvRows.push(inserted);
      }
    }
    setLocalInventory(prev => {
      const updated = [...prev];
      for (const row of newInvRows) {
        const idx = updated.findIndex(i => i.battalion_id === row.battalion_id && i.catalog_item_id === row.catalog_item_id);
        if (idx >= 0) updated[idx] = row; 
        else updated.push(row);
      }
      return updated;
    });
    setSectionEdits(e => { const n = { ...e }; delete n[cat]; return n; });
    setSavingSection(s => ({ ...s, [cat]: false }));
    setSavedSection(s => ({ ...s, [cat]: true }));
    setTimeout(() => setSavedSection(s => ({ ...s, [cat]: false })), 3000);
  }

  async function submitSupplyRequest() {
    const items = Object.entries(supplyQtys).filter(([, qty]) => qty > 0);
    if (items.length === 0) { 
      alert("Please enter at least one item quantity."); 
      return; 
    }

    setSubmittingRequest(true);

    const brigadeNumber = brigade?.brigade_number || "0";
    const battalionNumber = battalion.unit_number.split("-")[1] || battalion.unit_number;
    const abbr = battalion.school_abbr || battalion.school_name.slice(0, 4).toUpperCase();

    const { data: ticketData, error: ticketError } = await supabase.rpc("generate_ticket_id", {
      p_brigade_number: String(brigadeNumber),
      p_battalion_number: battalionNumber,
      p_school_abbr: abbr,
    });

    if (ticketError) { 
      alert("Error generating ticket ID: " + ticketError.message); 
      setSubmittingRequest(false); 
      return; 
    }

    const { data: reqData, error: reqError } = await supabase.from("supply_requests").insert([{
      ticket_id: ticketData,
      battalion_id: selectedBattalion,
      brigade_id: battalion.brigade_id,
      status: "submitted",
    }]).select().single();

    if (reqError || !reqData) { 
      alert("Error creating request: " + (reqError?.message || "unknown")); 
      setSubmittingRequest(false); 
      return; 
    }

    const lineItems = items.map(([catalogItemId, qty]) => ({
      request_id: reqData.id,
      catalog_item_id: catalogItemId,
      qty_requested: qty,
      qty_fulfilled: 0,
      item_status: "pending",
    }));

    await supabase.from("supply_request_items").insert(lineItems);

    setSubmittingRequest(false);
    setRequestSubmitted(true);
    setSupplyQtys({});
    fetchMyRequests(selectedBattalion);
  }

  function buildInventoryRows() {
    const rows = [];
    SECTIONS.forEach(section => {
      section.groups.forEach(cat => {
        (categories[cat] || []).forEach(item => {
          const svc = getEdit(cat, item.id, "qty_serviceable");
          const unsvc = getEdit(cat, item.id, "qty_unserviceable");
          const issued = getEdit(cat, item.id, "qty_issued");
          const inStock = Math.max(0, svc - issued);
          rows.push({ section: section.header, category: cat, item: item.item_name, size: item.size_label, svc, unsvc, issued, inStock });
        });
      });
    });
    return rows;
  }

  function exportCurrentInventoryCSV() {
    exportInventoryCSV(`${battalion.unit_number}-${battalion.school_name.replace(/\s+/g, "-")}`, buildInventoryRows());
  }

  function exportCurrentInventoryPDF() {
    exportInventoryPDF(`${battalion.unit_number} — ${battalion.school_name}`, `${brigade?.name} | Commandant: ${battalion.commandant_name || "N/A"}`, buildInventoryRows());
  }

  function buildSupplyRequestHTML() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;font-weight:normal;color:#555;margin-bottom:20px}h3{font-size:13px;text-transform:uppercase;text-decoration:underline;margin:20px 0 8px}table{width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed}th{text-align:left;padding:7px 10px;background:#2c3e50;color:#fff;font-size:11px;font-weight:600;border:1px solid #1a252f}th:nth-child(1){width:45%}th:nth-child(2){width:25%}th:nth-child(3){width:30%}td{padding:7px 10px;border:0.5px solid #e5e7eb}tbody tr:nth-child(odd){background-color:#fff}tbody tr:nth-child(even){background-color:#f8f9fa}tbody tr.highlighted td{background-color:#FEF9C3;font-weight:bold}tbody tr.highlighted:nth-child(even) td{background-color:#FEF9C3}td:nth-child(1){text-align:left}td:nth-child(2){text-align:left;color:#666}td:nth-child(3){text-align:right;padding-right:12px}.footer{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#555}</style></head><body><h1>CACC Supply Request — ${battalion.unit_number} ${battalion.school_name}</h1><h2>Date: ${dateStr} | Brigade: ${brigade?.name} | Commandant: ${battalion.commandant_name || "N/A"}</h2>`;
    SECTIONS.forEach(section => {
      html += `<h3>${section.header}</h3><table><thead><tr><th>Item</th><th>Size</th><th>Qty requested</th></tr></thead><tbody>`;
      section.groups.forEach(g => { 
        (categories[g] || []).forEach(item => { 
          const qty = supplyQtys[item.id] || 0; 
          if (qty > 0) html += `<tr class="highlighted"><td>${item.item_name}</td><td>${item.size_label}</td><td>${qty}</td></tr>`; 
        }); 
      });
      html += `</tbody></table>`;
    });
    html += `<div class="footer"><strong>Unit:</strong> ${battalion.unit_number} | <strong>School:</strong> ${battalion.school_name} | <strong>Email:</strong> ${battalion.commandant_email || "N/A"} | <strong>Phone:</strong> ${battalion.phone || "N/A"}</div></body></html>`;
    return html;
  }

  function exportSupplyRequestPDF() {
    const html = buildSupplyRequestHTML();
    const w = window.open("", "_blank"); 
    w.document.write(html); 
    w.document.close(); 
    w.print();
  }

  function exportSupplyRequestCSV() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}`;
    let csv = `CACC Supply Request - ${battalion.unit_number} - ${battalion.school_name}\nDate: ${dateStr}\nBrigade: ${brigade?.name}\nCommandant: ${battalion.commandant_name || ""}\n\nSection,Item,Size,Qty requested\n`;
    SECTIONS.forEach(section => { 
      section.groups.forEach(g => { 
        (categories[g] || []).forEach(item => { 
          const qty = supplyQtys[item.id] || 0; 
          if (qty > 0) csv += `${section.header},"${item.item_name}","${item.size_label}",${qty}\n`; 
        }); 
      }); 
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `Supply-Request-${battalion.unit_number}-${dateStr}.csv`; 
    a.click();
  }

  const statusConfig = {
    submitted: { label: "Submitted — received by State HQ", color: "#0C447C", bg: "#E6F1FB" },
    in_review: { label: "In review at State HQ", color: "#92400e", bg: "#fef3c7" },
    fulfilling: { label: "Being prepared in warehouse", color: "#27500A", bg: "#EAF3DE" },
    shipped: { label: "Shipped — on the way", color: "#1e3a8a", bg: "#dbeafe" },
    delivered: { label: "Delivered", color: "#166534", bg: "#dcfce7" },
    backlog: { label: "Backordered", color: "#991b1b", bg: "#fee2e2" },
    archived: { label: "Fulfilled / Archived", color: "#6b7280", bg: "#f3f4f6" },
  };

  return (
    <div>
      <select onChange={e => { setSelectedBattalion(e.target.value); setOpen({}); setSectionEdits({}); setShowSupply(false); setSupplyQtys({}); setRequestSubmitted(false); if (e.target.value) fetchMyRequests(e.target.value); }} value={selectedBattalion} style={{ ...STYLES.input, marginBottom: 12 }}>
        <option value="">Select a battalion...</option>
        {sortBattalions(battalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
      </select>

      {battalion && (
        <>
          {/* Battalion Info Card */}
          <div style={{ ...STYLES.card, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[["Unit", battalion.unit_number], ["School", battalion.school_name], ["Brigade", brigade?.name], ["Cadets", battalion.cadet_count], ["Commandant", battalion.commandant_name || "Not set"], ["Status", battalion.status]].map(([label, value]) => (
                <div key={label}>
                  <div style={STYLES.label}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <button onClick={exportCurrentInventoryCSV} style={{ ...STYLES.button, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 12 }}>Export inventory — CSV</button>
            <button onClick={exportCurrentInventoryPDF} style={{ ...STYLES.button, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 12 }}>Export inventory — PDF</button>
          </div>

          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#E6F1FB", borderRadius: 8, fontSize: 13, color: "#0C447C" }}>
            Tap any category to expand it. A save button appears at the bottom of each section when you make changes.
          </div>

          {/* Search Bar with Expand/Collapse Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 auto", maxWidth: 320, minWidth: 200 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 16 }}>🔍</div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search items, ribbons, patches..."
                style={{ ...STYLES.input, paddingLeft: 40, minHeight: 44 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={() => {
                  const newOpen = {};
                  SECTIONS.forEach(section => {
                    section.groups.forEach(cat => {
                      newOpen[cat] = true;
                    });
                  });
                  setOpen(newOpen);
                }}
                style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
              >
                Expand all
              </button>
              <button 
                onClick={() => setOpen({})}
                style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "10px 16px", minHeight: 44, whiteSpace: "nowrap" }}
              >
                Collapse all
              </button>
            </div>
          </div>

          {/* Inventory Sections */}
          {SECTIONS.map(section => (
            <div key={section.header} style={{ marginBottom: 20 }}>
              <div style={STYLES.sectionHeader}>{section.header}</div>
              {section.groups.map(cat => {
                const items = categories[cat] || [];
                const filteredItems = filterItems(items);
                if (filteredItems.length === 0) return null;
                const hasEdits = catHasEdits(cat);
                return (
                  <div key={cat} style={{ ...STYLES.card, padding: 0, marginBottom: 8, overflow: "hidden", borderLeft: open[cat] ? "3px solid #0C2340" : "none" }}>
                    <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...STYLES.badge, background: "#f3f4f6", color: "#6b7280" }}>{filteredItems.length}</span>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {open[cat] && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, minmax(60px, 1fr))", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 6, overflowX: "auto" }}>
                          {["Item / Size", "Alert", "Svc", "Unsvc", "Issued", "Stock"].map((h, i) => (
                            <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "center", minWidth: i === 0 ? "auto" : "60px" }}>{h}</div>
                          ))}
                        </div>
                        {filteredItems.map(item => {
                          const svc = getEdit(cat, item.id, "qty_serviceable");
                          const unsvc = getEdit(cat, item.id, "qty_unserviceable");
                          const issued = getEdit(cat, item.id, "qty_issued");
                          const threshold = getEdit(cat, item.id, "shortage_threshold");
                          const inStock = Math.max(0, svc - issued);
                          const isAlert = threshold > 0 && inStock < threshold;
                          return (
                            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, minmax(60px, 1fr))", padding: "5px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 6, background: isAlert ? "#FEF2F2" : "#fff", overflowX: "auto" }}>
                              <div style={{ minWidth: 150 }}>
                                <div style={{ fontSize: 13, fontWeight: isAlert ? 600 : 400, color: "#111827" }}>{item.item_name} <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>— {item.size_label}</span></div>
                              </div>
                              <input type="number" min="0" value={threshold} onChange={e => setEdit(cat, item.id, "shortage_threshold", e.target.value)} style={{ width: "100%", maxWidth: 60, padding: "5px 2px", borderRadius: 6, border: isAlert ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={svc} onChange={e => setEdit(cat, item.id, "qty_serviceable", e.target.value)} style={{ width: "100%", maxWidth: 70, padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={unsvc} onChange={e => setEdit(cat, item.id, "qty_unserviceable", e.target.value)} style={{ width: "100%", maxWidth: 70, padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={issued} onChange={e => setEdit(cat, item.id, "qty_issued", e.target.value)} style={{ width: "100%", maxWidth: 70, padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <div style={{ textAlign: "center" }}><span style={{ ...STYLES.badge, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                            </div>
                          );
                        })}
                        {hasEdits && (
                          <div style={{ padding: "10px 14px", background: "#f9fafb", borderTop: "0.5px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => saveSection(cat, items)} disabled={savingSection[cat]} style={{ ...STYLES.button, ...STYLES.buttonPrimary }}>
                              {savingSection[cat] ? "Saving..." : savedSection[cat] ? "Saved!" : `Save ${cat}`}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* My Requests Tracker */}
          {myRequests.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div onClick={() => setShowMyRequests(s => !s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#fff", borderRadius: showMyRequests ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>My supply requests</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...STYLES.badge, background: "#E6F1FB", color: "#0C447C" }}>{myRequests.length}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{showMyRequests ? "▲" : "▼"}</span>
                </div>
              </div>
              {showMyRequests && (
                <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {myRequests.map(req => {
                    const sc = statusConfig[req.status] || statusConfig.submitted;
                    return (
                      <div key={req.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid #f3f4f6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginBottom: 2 }}>{req.ticket_id}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{req.supply_request_items?.length || 0} items requested</div>
                          </div>
                          <span style={{ ...STYLES.badge, padding: "3px 10px", background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label.split("—")[0].trim()}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Submitted: {formatDateShort(req.created_at)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Updated: {formatDateShort(req.last_updated_at || req.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Supply Request Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8, marginBottom: 24 }}>
            <button onClick={() => { setShowSupply(s => !s); setRequestSubmitted(false); }} style={{ ...STYLES.button, border: "0.5px solid #185FA5", background: showSupply ? "#185FA5" : "#fff", color: showSupply ? "#fff" : "#185FA5", padding: "14px" }}>{showSupply ? "Hide supply request" : "Submit a supply request"}</button>
            <button onClick={() => window.open(`mailto:logistics@cacadets.org?subject=Supply Request — ${battalion.unit_number} ${battalion.school_name}&body=Please find attached our supply request.`)} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "14px" }}>Email HQ logistics</button>
          </div>

          {showSupply && !requestSubmitted && (
            <div style={{ ...STYLES.card, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#111827" }}>Supply request form</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Enter quantities for items you need. Items marked out of stock are unavailable from State HQ at this time.</div>

              {SECTIONS.map(section => (
                <div key={section.header} style={{ marginBottom: 20 }}>
                  <div style={STYLES.sectionHeader}>{section.header}</div>
                  {section.groups.map(cat => {
                    const items = categories[cat] || [];
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                        <div onClick={() => toggleSupplyCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{supplyOpen[cat] ? "▲" : "▼"}</span>
                        </div>
                        {supplyOpen[cat] && items.map(item => {
                          const qty = supplyQtys[item.id] || 0;
                          const isOOS = !item.in_stock;
                          const oosDate = item.out_of_stock_at ? formatDate(item.out_of_stock_at) : null;
                          if (isOOS) {
                            return (
                              <div key={item.id} style={{ padding: "6px 14px", borderTop: "0.5px solid #f3f4f6", background: "#FEF2F2" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 150 }}>
                                    <div style={{ fontSize: 13, color: "#6b7280" }}>{item.item_name} <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>— {item.size_label}</span></div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 600 }}>⚠ Out of stock at State HQ</div>
                                    {oosDate && <div style={{ fontSize: 10, color: "#9ca3af" }}>as of {oosDate}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={item.id} style={{ padding: "6px 14px", borderTop: "0.5px solid #f3f4f6", background: qty > 0 ? "#FEF9C3" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 150 }}>
                                <div style={{ fontSize: 13, fontWeight: qty > 0 ? 600 : 400, color: "#111827" }}>{item.item_name} <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>— {item.size_label}</span></div>
                              </div>
                              <input type="number" min="0" value={qty || ""} placeholder="0" onChange={e => setSupplyQtys(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))} style={{ width: 64, padding: "8px 6px", borderRadius: 6, border: qty > 0 ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", fontSize: 14, color: "#111827", textAlign: "center", background: "#ffffff", flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 14, marginBottom: 16, border: "0.5px solid #e5e7eb" }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: "#111827" }}>Unit information</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {[["Battalion", battalion.unit_number], ["School", battalion.school_name], ["Brigade", brigade?.name], ["Commandant", battalion.commandant_name || "Not set"], ["Email", battalion.commandant_email || "Not set"], ["Phone", battalion.phone || "Not set"]].map(([label, value]) => (
                    <div key={label}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{label}</div><div style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{value}</div></div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={submitSupplyRequest} disabled={submittingRequest} style={{ ...STYLES.button, ...STYLES.buttonPrimary, padding: "14px", fontWeight: 600 }}>
                  {submittingRequest ? "Submitting..." : "Submit request to State HQ"}
                </button>
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>— or save a copy for your records —</div>
                <button onClick={exportSupplyRequestCSV} style={{ ...STYLES.button, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", padding: "12px" }}>Export supply request — CSV</button>
                <button onClick={exportSupplyRequestPDF} style={{ ...STYLES.button, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", padding: "12px" }}>Export supply request — PDF</button>
              </div>
            </div>
          )}

          {showSupply && requestSubmitted && (
            <div style={{ ...STYLES.card, padding: 24, marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Request submitted to State HQ</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Your request is in the queue. You can track its status in the "My supply requests" section above.</div>
              <button onClick={() => { setRequestSubmitted(false); setShowSupply(false); }} style={{ ...STYLES.button, ...STYLES.buttonSecondary }}>Done</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLY REQUESTS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function SupplyRequestsPage({ brigades, battalions, categories, inventory, userRole }) {
  const [tab, setTab] = useState("active");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTicket, setOpenTicket] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("supply_requests")
      .select("*, supply_request_items(*), battalions(unit_number, school_name, school_abbr, brigade_id, commandant_name, commandant_email, phone), brigades(name, brigade_number)")
      .order("created_at", { ascending: false });
    if (!error) setRequests(data || []);
    setLoading(false);
  }

  async function fetchComments(requestId) {
    const { data } = await supabase
      .from("supply_request_comments")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });
    return data || [];
  }

  async function updateStatus(requestId, newStatus) {
    // Clear sub_status and hold_reason when moving past in_review
    const updateData = { status: newStatus, last_updated_at: new Date().toISOString() };
    if (newStatus !== "in_review") {
      updateData.sub_status = null;
      updateData.hold_reason = null;
    }
    
    await supabase.from("supply_requests").update(updateData).eq("id", requestId);
    
    // Update local state immediately to reflect the change
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updateData } : r));
    
    if (openTicket?.id === requestId) setOpenTicket(prev => ({ ...prev, ...updateData }));
  }

  async function updateOwner(requestId, field, value) {
    await supabase.from("supply_requests").update({ [field]: value, last_updated_at: new Date().toISOString() }).eq("id", requestId);
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, [field]: value, last_updated_at: new Date().toISOString() } : r));
    if (openTicket?.id === requestId) setOpenTicket(prev => ({ ...prev, [field]: value, last_updated_at: new Date().toISOString() }));
  }

  async function updateSubStatus(requestId, subStatus, holdReason) {
    await supabase.from("supply_requests").update({ sub_status: subStatus, hold_reason: holdReason, last_updated_at: new Date().toISOString() }).eq("id", requestId);
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, sub_status: subStatus, hold_reason: holdReason, last_updated_at: new Date().toISOString() } : r));
    if (openTicket?.id === requestId) setOpenTicket(prev => ({ ...prev, sub_status: subStatus, hold_reason: holdReason, last_updated_at: new Date().toISOString() }));
  }

  async function updateItemFulfillment(itemId, qty, status) {
    await supabase.from("supply_request_items").update({ qty_fulfilled: qty, item_status: status }).eq("id", itemId);
    setRequests(prev => prev.map(r => ({
      ...r,
      supply_request_items: r.supply_request_items?.map(i => i.id === itemId ? { ...i, qty_fulfilled: qty, item_status: status } : i)
    })));
    if (openTicket) {
      setOpenTicket(prev => ({
        ...prev,
        supply_request_items: prev.supply_request_items?.map(i => i.id === itemId ? { ...i, qty_fulfilled: qty, item_status: status } : i)
      }));
    }
  }

  const activeReqs = requests.filter(r => ["submitted", "in_review", "fulfilling", "shipped"].includes(r.status));
  const backlogReqs = requests.filter(r => r.status === "backlog");
  const archivedReqs = requests.filter(r => r.status === "archived");

  const statusConfig = {
    submitted: { label: "Submitted", color: "#0C447C", bg: "#E6F1FB" },
    in_review: { label: "In review", color: "#92400e", bg: "#fef3c7" },
    fulfilling: { label: "In warehouse", color: "#27500A", bg: "#EAF3DE" },
    shipped: { label: "Shipped", color: "#1e3a8a", bg: "#dbeafe" },
    delivered: { label: "Delivered", color: "#166534", bg: "#dcfce7" },
    backlog: { label: "Backlog", color: "#991b1b", bg: "#fee2e2" },
    archived: { label: "Archived", color: "#6b7280", bg: "#f3f4f6" },
  };

  const itemStatusConfig = {
    pending: { label: "Pending", color: "#6b7280", bg: "#f3f4f6" },
    fulfilled: { label: "Fulfilled", color: "#166534", bg: "#dcfce7" },
    partial: { label: "Partial", color: "#92400e", bg: "#fef3c7" },
    backordered: { label: "Backordered", color: "#991b1b", bg: "#fee2e2" },
    out_of_stock: { label: "Out of stock", color: "#991b1b", bg: "#FEF2F2" },
  };

  function TicketCard({ req }) {
    const sc = statusConfig[req.status] || statusConfig.submitted;
    const battalion = req.battalions;
    const brigade = req.brigades;
    const hasAlert = req.supply_request_items?.some(i => ["backordered", "out_of_stock"].includes(i.item_status));
    return (
      <div onClick={() => setOpenTicket(req)} style={{ background: "#fff", border: hasAlert ? "0.5px solid #fca5a5" : "0.5px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", marginBottom: 6, cursor: "pointer", display: "grid", gridTemplateColumns: "120px 1fr 100px 90px 80px 70px", gap: 10, alignItems: "center", fontSize: 12 }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6b7280" }}>{req.ticket_id}</div>
        <div>
          <div style={{ fontWeight: 500, color: "#111827", fontSize: 12 }}>{battalion?.unit_number} — {battalion?.school_name}</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{brigade?.name}</div>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{formatDateShort(req.created_at)}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{formatDateShort(req.last_updated_at || req.created_at)}</div>
        <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center" }}>{req.supply_request_items?.length || 0}</div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: "nowrap" }}>{sc.label}</span>
          {hasAlert && <div style={{ fontSize: 9, color: "#991b1b", marginTop: 2 }}>⚠</div>}
        </div>
      </div>
    );
  }

  if (openTicket) return (
    <TicketDetail
      ticket={openTicket}
      categories={categories}
      statusConfig={statusConfig}
      itemStatusConfig={itemStatusConfig}
      onBack={() => { setOpenTicket(null); fetchRequests(); }}
      onUpdateStatus={updateStatus}
      onUpdateItem={updateItemFulfillment}
      onUpdateOwner={updateOwner}
      onUpdateSubStatus={updateSubStatus}
      fetchComments={fetchComments}
      userRole={userRole}
    />
  );

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Supply requests</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Manage incoming supply requests from battalions statewide.</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {[["active", `Active (${activeReqs.length})`], ["backlog", `Backlog (${backlogReqs.length})`], ["archived", `Archive (${archivedReqs.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...STYLES.button, padding: "8px 16px", border: tab === id ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: tab === id ? "#E6F1FB" : "#fff", color: tab === id ? "#185FA5" : "#6b7280", fontWeight: tab === id ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      {/* Table header - hide on mobile */}
      <div style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb", borderRadius: 8, padding: "6px 12px", marginBottom: 6, display: "grid", gridTemplateColumns: "120px 1fr 100px 90px 80px 70px", gap: 10, fontSize: 11, fontWeight: 600, color: "#6b7280" }} className="desktop-tabs">
        <div>Ticket ID</div>
        <div>Unit / Brigade</div>
        <div>Submitted</div>
        <div>Last updated</div>
        <div style={{ textAlign: "center" }}>Items</div>
        <div style={{ textAlign: "right" }}>Status</div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div> : (
        <>
          {tab === "active" && (activeReqs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No active requests.</div> : activeReqs.map(r => <TicketCard key={r.id} req={r} />))}
          {tab === "backlog" && (backlogReqs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No backordered requests.</div> : backlogReqs.map(r => <TicketCard key={r.id} req={r} />))}
          {tab === "archived" && (archivedReqs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No archived requests.</div> : archivedReqs.map(r => <TicketCard key={r.id} req={r} />))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET DETAIL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function TicketDetail({ ticket, categories, statusConfig, itemStatusConfig, onBack, onUpdateStatus, onUpdateItem, onUpdateOwner, onUpdateSubStatus, fetchComments, userRole }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ author: "", text: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localTicket, setLocalTicket] = useState(ticket);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ catalog_item_id: "", qty_requested: 0, qty_fulfilled: 0, item_status: "pending" });
  const [savingItem, setSavingItem] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  
  const sc = statusConfig[localTicket.status] || statusConfig.submitted;
  const battalion = localTicket.battalions;
  const brigade = localTicket.brigades;
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole.role);

  const staffOptions = ["", "MSG Barrera", "SSG Ochoa", "SSG Reyna", "SSG Rhodes", "SGT Soto"];

  // Build flat list of all catalog items for add item dropdown
  const allCatalogItems = Object.values(categories).flat().sort((a, b) => 
    `${a.item_name} — ${a.size_label}`.localeCompare(`${b.item_name} — ${b.size_label}`)
  );

  const filteredCatalogItems = itemSearchQuery.trim() 
    ? allCatalogItems.filter(item => 
        `${item.item_name} ${item.size_label}`.toLowerCase().includes(itemSearchQuery.toLowerCase())
      )
    : allCatalogItems;

  useEffect(() => { setLocalTicket(ticket); }, [ticket]);

  useEffect(() => {
    if (fetchComments) {
      fetchComments(localTicket.id).then(data => setComments(data || []));
    }
  }, [localTicket.id, fetchComments]);

  async function deleteTicket() {
    setDeleting(true);
    const { error } = await supabase.from("supply_requests").delete().eq("id", localTicket.id);
    setDeleting(false);
    if (!error) {
      setShowDeleteModal(false);
      onBack();
    } else alert("Error deleting ticket.");
  }

  async function addComment() {
    if (!newComment.author || !newComment.text.trim()) {
      alert("Please select a staff member and enter a comment.");
      return;
    }
    setSubmittingComment(true);
    const { error } = await supabase.from("supply_request_comments").insert([{
      request_id: localTicket.id,
      author: newComment.author,
      comment: newComment.text.trim()
    }]);
    if (!error) {
      const freshComments = await fetchComments(localTicket.id);
      setComments(freshComments);
      setNewComment({ author: "", text: "" });
    } else {
      alert("Error adding comment: " + error.message);
    }
    setSubmittingComment(false);
  }

  async function addLineItem() {
    if (!newItem.catalog_item_id || newItem.qty_requested <= 0) {
      alert("Please select an item and enter a quantity.");
      return;
    }
    setSavingItem(true);
    
    const { data: insertedItem, error } = await supabase.from("supply_request_items").insert([{
      request_id: localTicket.id,
      catalog_item_id: newItem.catalog_item_id,
      qty_requested: newItem.qty_requested,
      qty_fulfilled: newItem.qty_fulfilled,
      item_status: newItem.item_status
    }]).select().single();

    if (!error && insertedItem) {
      // Auto-generate comment
      const catItem = allCatalogItems.find(c => c.id === newItem.catalog_item_id);
      const commentText = `Line item added: ${catItem?.item_name || "Unknown"} — ${catItem?.size_label || ""} x${newItem.qty_requested}`;
      await supabase.from("supply_request_comments").insert([{
        request_id: localTicket.id,
        author: userRole.full_name || "State HQ",
        comment: commentText
      }]);

      // Refresh ticket data
      const { data: refreshedTicket } = await supabase
        .from("supply_requests")
        .select("*, supply_request_items(*), battalions(unit_number, school_name, school_abbr, brigade_id, commandant_name, commandant_email, phone), brigades(name, brigade_number)")
        .eq("id", localTicket.id)
        .single();
      
      if (refreshedTicket) {
        setLocalTicket(refreshedTicket);
      }

      const freshComments = await fetchComments(localTicket.id);
      setComments(freshComments);
      
      setShowAddItem(false);
      setNewItem({ catalog_item_id: "", qty_requested: 0, qty_fulfilled: 0, item_status: "pending" });
      setItemSearchQuery("");
    } else {
      alert("Error adding item: " + (error?.message || "unknown"));
    }
    setSavingItem(false);
  }

  function buildEmailBody() {
    const allItems = Object.values(categories).flat();
    let body = `CACC Supply Update\n\n`;
    body += `Ticket: ${localTicket.ticket_id}\n`;
    body += `Unit: ${battalion?.unit_number} — ${battalion?.school_name}\n`;
    body += `Brigade: ${brigade?.name}\n`;
    body += `Status: ${sc.label}\n\n`;
    body += `LINE ITEMS:\n`;
    (localTicket.supply_request_items || []).forEach(item => {
      const catItem = allItems.find(c => c.id === item.catalog_item_id);
      body += `- ${catItem?.item_name || "Unknown"} (${catItem?.size_label || ""}): ${item.qty_fulfilled} of ${item.qty_requested} fulfilled\n`;
    });
    if (comments.length > 0) {
      body += `\nCOMMENTS:\n`;
      comments.slice().reverse().forEach(c => {
        body += `- ${c.author}: ${c.comment}\n`;
      });
    }
    body += `\nFor questions, contact logistics@cacadets.org\n`;
    return encodeURIComponent(body);
  }

  function emailCommandant() {
    if (!battalion?.commandant_email) {
      alert("No commandant email on file for this unit.");
      return;
    }
    const subject = encodeURIComponent(`CACC Supply Update — Ticket ${localTicket.ticket_id}`);
    const body = buildEmailBody();
    window.location.href = `mailto:${battalion.commandant_email}?subject=${subject}&body=${body}`;
  }

  function formatCommentDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", day: "numeric" });
    const month = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short" });
    const year = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", year: "numeric" });
    const time = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: true });
    const tz = d.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }).split(" ").pop();
    return `${day} ${month} ${year} · ${time} ${tz}`;
  }

  const statusFlow = ["submitted", "in_review", "fulfilling", "shipped", "archived"];
  const statusLabels = { submitted: "Submitted", in_review: "In review", fulfilling: "In warehouse", shipped: "Shipped", archived: "Archived" };
  const currentIdx = statusFlow.indexOf(localTicket.status);

  function exportTicketPDF() {
    let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}h1{font-size:16px;margin-bottom:2px}.meta{font-size:10px;color:#555;margin-bottom:4px}.divider{border:none;border-top:1px solid #e5e7eb;margin:12px 0}table{width:100%;border-collapse:collapse;margin-top:12px;table-layout:fixed}th{text-align:left;padding:6px 8px;background:#2c3e50;color:#fff;font-size:10px;font-weight:600;border:1px solid #1a252f}th:nth-child(1){width:35%}th:nth-child(2){width:15%}th:nth-child(3){width:15%}th:nth-child(4){width:15%}th:nth-child(5){width:20%}td{padding:6px 8px;border:0.5px solid #e5e7eb;font-size:10px}tbody tr:nth-child(odd){background-color:#fff}tbody tr:nth-child(even){background-color:#f8f9fa}td:nth-child(1){text-align:left}td:nth-child(2){text-align:left;color:#666}td:nth-child(3),td:nth-child(4){text-align:right;padding-right:12px}td:nth-child(5){text-align:left}.badge{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold}.comment{margin-bottom:8px;padding:8px;background:#f9fafb;border-radius:4px}.comment-author{font-weight:bold;font-size:10px;color:#111}.comment-text{font-size:10px;color:#555;margin-top:2px}.comment-date{font-size:9px;color:#999;margin-top:2px}</style></head><body>`;
    html += `<h1>CACC Supply Request</h1>`;
    html += `<div class="meta"><strong>Ticket:</strong> ${localTicket.ticket_id}</div>`;
    html += `<div class="meta"><strong>Last updated:</strong> ${formatDateShort(localTicket.last_updated_at || localTicket.created_at)}</div>`;
    html += `<hr class="divider">`;
    html += `<div class="meta"><strong>Unit:</strong> ${battalion?.unit_number} — ${battalion?.school_name}</div>`;
    html += `<div class="meta"><strong>Brigade:</strong> ${brigade?.name}</div>`;
    html += `<div class="meta"><strong>Commandant:</strong> ${battalion?.commandant_name || "N/A"}</div>`;
    html += `<div class="meta"><strong>Email:</strong> ${battalion?.commandant_email || "N/A"} &nbsp;&nbsp; <strong>Phone:</strong> ${battalion?.phone || "N/A"}</div>`;
    html += `<div class="meta"><strong>Status:</strong> ${sc.label}</div>`;
    html += `<hr class="divider">`;
    html += `<table><thead><tr><th>Item</th><th>Size</th><th>Requested</th><th>Fulfilled</th><th>Status</th></tr></thead><tbody>`;
    (localTicket.supply_request_items || []).forEach(item => {
      const allItems = Object.values(categories).flat();
      const catItem = allItems.find(c => c.id === item.catalog_item_id);
      const ist = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
      html += `<tr><td>${catItem?.item_name || "Unknown"}</td><td>${catItem?.size_label || ""}</td><td>${item.qty_requested}</td><td>${item.qty_fulfilled}</td><td>${ist.label}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (localTicket.notes) html += `<div class="meta" style="margin-top:12px"><strong>Notes:</strong> ${localTicket.notes}</div>`;
    
    // Add comments section
    if (comments.length > 0) {
      html += `<hr class="divider">`;
      html += `<h2 style="font-size:13px;margin-top:16px;margin-bottom:8px">Comments</h2>`;
      comments.slice().reverse().forEach(c => {
        html += `<div class="comment"><div class="comment-author">${c.author}</div><div class="comment-text">${c.comment}</div><div class="comment-date">${formatCommentDate(c.created_at)}</div></div>`;
      });
    }
    
    html += `</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <div>
      <button onClick={() => { setShowDeleteModal(false); onBack(); }} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "8px 14px", marginBottom: 16 }}>← Back to requests</button>

      {/* Ticket Header */}
      <div style={{ ...STYLES.card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6b7280", marginBottom: 4 }}>SUBMITTED: {ticket.ticket_id}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>LAST UPDATED: {formatDateShort(ticket.last_updated_at || ticket.created_at)}</div>
          </div>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
        </div>
        <div style={{ borderTop: "0.5px solid #f3f4f6", paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[["Unit", `${battalion?.unit_number} — ${battalion?.school_name}`], ["Brigade", brigade?.name], ["Commandant", battalion?.commandant_name || "N/A"], ["Email", battalion?.commandant_email || "N/A"], ["Phone", battalion?.phone || "N/A"]].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hold/Delay Alert Banner */}
      {localTicket.status === "in_review" && localTicket.sub_status && (
        <div style={{ background: "#FEF2F2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>{localTicket.sub_status === "on_hold" ? "On Hold" : "Delayed"}</div>
            <div style={{ fontSize: 13, color: "#991b1b" }}>{localTicket.hold_reason || "No reason provided"}</div>
          </div>
        </div>
      )}

      {/* Status Flow */}
      <div style={{ ...STYLES.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Order status</div>
        
        {/* Bidirectional Status Navigation */}
        {isAdminOrAbove && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button 
              onClick={() => currentIdx > 0 && onUpdateStatus(ticket.id, statusFlow[currentIdx - 1])} 
              disabled={currentIdx === 0}
              style={{ ...STYLES.button, padding: "10px 14px", minWidth: 44, minHeight: 44, background: currentIdx === 0 ? "#f3f4f6" : "#fff", color: currentIdx === 0 ? "#9ca3af" : "#111827", cursor: currentIdx === 0 ? "not-allowed" : "pointer", border: "0.5px solid #d1d5db" }}
            >
              ←
            </button>
            <div style={{ padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#185FA5", color: "#fff" }}>
              {statusLabels[localTicket.status]}
            </div>
            <button 
              onClick={() => currentIdx < statusFlow.length - 1 && onUpdateStatus(ticket.id, statusFlow[currentIdx + 1])} 
              disabled={currentIdx === statusFlow.length - 1}
              style={{ ...STYLES.button, padding: "10px 14px", minWidth: 44, minHeight: 44, background: currentIdx === statusFlow.length - 1 ? "#f3f4f6" : "#fff", color: currentIdx === statusFlow.length - 1 ? "#9ca3af" : "#111827", cursor: currentIdx === statusFlow.length - 1 ? "not-allowed" : "pointer", border: "0.5px solid #d1d5db" }}
            >
              →
            </button>
          </div>
        )}

        {/* Status Progress Tracker */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
          {statusFlow.map((s, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: isCurrent ? 700 : 400, background: isCurrent ? "#185FA5" : isDone ? "#dcfce7" : "#f3f4f6", color: isCurrent ? "#fff" : isDone ? "#166534" : "#9ca3af", border: isCurrent ? "none" : "0.5px solid #e5e7eb" }}>{statusLabels[s]}</div>
                {i < statusFlow.length - 1 && <div style={{ width: 16, height: 1, background: isDone || isCurrent ? "#185FA5" : "#e5e7eb" }} />}
              </div>
            );
          })}
        </div>

        {/* Staff Ownership Dropdowns */}
        {isAdminOrAbove && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
            {["in_review", "fulfilling", "shipped", "archived"].includes(localTicket.status) && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>In review owner</div>
                <select value={ticket.owner_review || ""} onChange={e => onUpdateOwner(localTicket.id, "owner_review", e.target.value)} style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}>
                  {staffOptions.map(opt => <option key={opt} value={opt}>{opt || "(none)"}</option>)}
                </select>
              </div>
            )}
            {["fulfilling", "shipped", "archived"].includes(localTicket.status) && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Warehouse owner</div>
                <select value={ticket.owner_warehouse || ""} onChange={e => onUpdateOwner(localTicket.id, "owner_warehouse", e.target.value)} style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}>
                  {staffOptions.map(opt => <option key={opt} value={opt}>{opt || "(none)"}</option>)}
                </select>
              </div>
            )}
            {["shipped", "archived"].includes(localTicket.status) && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Shipped by</div>
                <select value={ticket.owner_shipped || ""} onChange={e => onUpdateOwner(localTicket.id, "owner_shipped", e.target.value)} style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}>
                  {staffOptions.map(opt => <option key={opt} value={opt}>{opt || "(none)"}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Hold/Delay Sub-Status for In Review */}
        {isAdminOrAbove && localTicket.status === "in_review" && (
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Sub-status</div>
            <select 
              value={ticket.sub_status || ""} 
              onChange={e => {
                const newSubStatus = e.target.value;
                if (!newSubStatus) {
                  onUpdateSubStatus(localTicket.id, null, null);
                } else {
                  setLocalTicket(prev => ({ ...prev, sub_status: newSubStatus }));
                }
              }}
              style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, marginBottom: 10, minHeight: 44 }}
            >
              <option value="">(none)</option>
              <option value="on_hold">On Hold</option>
              <option value="delayed">Delayed</option>
            </select>
            {ticket.sub_status && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Reason for {ticket.sub_status === "on_hold" ? "hold" : "delay"} *</div>
                <textarea 
                  value={ticket.hold_reason || ""} 
                  onChange={e => setLocalTicket(prev => ({ ...prev, hold_reason: e.target.value }))}
                  onBlur={() => onUpdateSubStatus(localTicket.id, localTicket.sub_status, localTicket.hold_reason)}
                  rows={3}
                  style={{ ...STYLES.input, resize: "vertical", fontSize: 13 }}
                  placeholder="Enter reason..."
                />
              </div>
            )}
          </div>
        )}

        {/* Additional Action Buttons */}
        {isAdminOrAbove && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!["archived", "backlog"].includes(localTicket.status) && <button onClick={() => onUpdateStatus(ticket.id, "backlog")} style={{ ...STYLES.button, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", padding: "8px 16px", minHeight: 44 }}>Move to backlog</button>}
            {localTicket.status === "backlog" && <button onClick={() => onUpdateStatus(ticket.id, "submitted")} style={{ ...STYLES.button, border: "0.5px solid #185FA5", background: "#E6F1FB", color: "#185FA5", padding: "8px 16px", minHeight: 44 }}>Move to active</button>}
            {localTicket.status !== "archived" && <button onClick={() => onUpdateStatus(ticket.id, "archived")} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "8px 16px", color: "#6b7280", minHeight: 44 }}>Archive ticket</button>}
            <button onClick={() => setShowDeleteModal(true)} style={{ ...STYLES.button, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", padding: "8px 16px", minHeight: 44 }}>Delete ticket</button>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%", boxShadow: "0 20px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Delete ticket?</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Are you sure you want to permanently delete this ticket? This action cannot be undone.</div>
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#111827", marginBottom: 8 }}>{ticket.ticket_id}</div>
              <div style={{ color: "#6b7280", fontSize: 11 }}><strong>Unit:</strong> {battalion?.unit_number} — {battalion?.school_name}</div>
              <div style={{ color: "#6b7280", fontSize: 11 }}><strong>Brigade:</strong> {brigade?.name}</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} style={{ ...STYLES.button, ...STYLES.buttonSecondary, padding: "8px 16px" }}>Cancel</button>
              <button onClick={deleteTicket} disabled={deleting} style={{ ...STYLES.button, border: "none", background: "#991b1b", color: "#fff", padding: "8px 16px", fontWeight: 600 }}>{deleting ? "Deleting..." : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div style={{ ...STYLES.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Line items</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(3, minmax(70px, 1fr))", padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 6, gap: 8, overflowX: "auto" }}>
          {["Item / Size", "Requested", "Fulfilled", "Status"].map((h, i) => <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "center", minWidth: i === 0 ? "auto" : "70px" }}>{h}</div>)}
        </div>
        {(localTicket.supply_request_items || []).map(item => {
          const allItems = Object.values(categories).flat();
          const catItem = allItems.find(c => c.id === item.catalog_item_id);
          const ist = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr repeat(3, minmax(70px, 1fr))", padding: "10px 10px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, overflowX: "auto" }}>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{catItem?.item_name || "Unknown item"}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{catItem?.size_label}</div>
              </div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.qty_requested}</div>
              <div style={{ textAlign: "center" }}>
                {isAdminOrAbove ? (
                  <input type="number" min="0" max={item.qty_requested} value={item.qty_fulfilled} onChange={e => onUpdateItem(item.id, parseInt(e.target.value) || 0, parseInt(e.target.value) >= item.qty_requested ? "fulfilled" : parseInt(e.target.value) > 0 ? "partial" : item.item_status)} style={{ width: 56, padding: "4px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, textAlign: "center", color: "#111827", background: "#fff" }} />
                ) : (
                  <span style={{ fontSize: 13, color: "#111827" }}>{item.qty_fulfilled}</span>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                {isAdminOrAbove ? (
                  <select value={item.item_status} onChange={e => onUpdateItem(item.id, item.qty_fulfilled, e.target.value)} style={{ width: "100%", padding: "4px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 11, background: ist.bg, color: ist.color }}>
                    {Object.entries(itemStatusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : (
                  <span style={{ ...STYLES.badge, background: ist.bg, color: ist.color }}>{ist.label}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Item Form */}
        {isAdminOrAbove && !showAddItem && (
          <button onClick={() => setShowAddItem(true)} style={{ ...STYLES.button, ...STYLES.buttonSecondary, width: "100%", marginTop: 12, padding: "10px 16px", minHeight: 44 }}>+ Add item</button>
        )}

        {isAdminOrAbove && showAddItem && (
          <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Add line item</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Search item</div>
                <input 
                  type="text" 
                  value={itemSearchQuery} 
                  onChange={e => setItemSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Item</div>
                <select 
                  value={newItem.catalog_item_id} 
                  onChange={e => setNewItem(prev => ({ ...prev, catalog_item_id: e.target.value }))}
                  style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
                >
                  <option value="">Select item...</option>
                  {filteredCatalogItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} — {item.size_label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Qty requested</div>
                  <input 
                    type="number" 
                    min="0" 
                    value={newItem.qty_requested} 
                    onChange={e => setNewItem(prev => ({ ...prev, qty_requested: parseInt(e.target.value) || 0 }))}
                    style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Qty fulfilled</div>
                  <input 
                    type="number" 
                    min="0" 
                    value={newItem.qty_fulfilled} 
                    onChange={e => setNewItem(prev => ({ ...prev, qty_fulfilled: parseInt(e.target.value) || 0 }))}
                    style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Status</div>
                <select 
                  value={newItem.item_status} 
                  onChange={e => setNewItem(prev => ({ ...prev, item_status: e.target.value }))}
                  style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
                >
                  {Object.entries(itemStatusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button 
                  onClick={() => { setShowAddItem(false); setNewItem({ catalog_item_id: "", qty_requested: 0, qty_fulfilled: 0, item_status: "pending" }); setItemSearchQuery(""); }}
                  style={{ ...STYLES.button, ...STYLES.buttonSecondary, flex: 1, minHeight: 44 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={addLineItem} 
                  disabled={savingItem}
                  style={{ ...STYLES.button, ...STYLES.buttonPrimary, flex: 1, minHeight: 44 }}
                >
                  {savingItem ? "Saving..." : "Save item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div style={{ ...STYLES.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Comments & updates</div>
        
        {/* Add Comment Form */}
        {isAdminOrAbove && (
          <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select 
                value={newComment.author} 
                onChange={e => setNewComment(prev => ({ ...prev, author: e.target.value }))}
                style={{ ...STYLES.input, padding: "8px 10px", fontSize: 12, minHeight: 44 }}
              >
                <option value="">Select staff member...</option>
                {staffOptions.filter(s => s).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <textarea 
                value={newComment.text} 
                onChange={e => setNewComment(prev => ({ ...prev, text: e.target.value }))}
                rows={2}
                style={{ ...STYLES.input, resize: "vertical", fontSize: 13 }}
                placeholder="Add a comment or update..."
              />
              <button 
                onClick={addComment} 
                disabled={submittingComment}
                style={{ ...STYLES.button, ...STYLES.buttonPrimary, padding: "10px 16px", minHeight: 44, width: "100%" }}
              >
                {submittingComment ? "Adding..." : "Add comment"}
              </button>
            </div>
          </div>
        )}

        {/* Comments List */}
        {comments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map(comment => (
              <div key={comment.id} style={{ padding: 12, background: "#f9fafb", borderRadius: 8, border: "0.5px solid #e5e7eb" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{comment.author}</div>
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 6, whiteSpace: "pre-wrap" }}>{comment.comment}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{formatCommentDate(comment.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No comments yet</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <button onClick={exportTicketPDF} style={{ ...STYLES.button, width: "100%", border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", padding: "12px", minHeight: 44 }}>Export ticket to PDF</button>
        {isAdminOrAbove && (
          <button 
            onClick={emailCommandant} 
            disabled={!battalion?.commandant_email}
            style={{ ...STYLES.button, width: "100%", border: "0.5px solid #185FA5", background: battalion?.commandant_email ? "#fff" : "#f3f4f6", color: battalion?.commandant_email ? "#185FA5" : "#9ca3af", padding: "12px", minHeight: 44, cursor: battalion?.commandant_email ? "pointer" : "not-allowed" }}
            title={!battalion?.commandant_email ? "No commandant email on file" : ""}
          >
            Email commandant
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UNITS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function UnitsPage({ brigades, battalions, fetchBattalionsOnly }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ unit_number: "", school_name: "", school_abbr: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" });
  const [saving, setSaving] = useState(false);
  const [abbrConflict, setAbbrConflict] = useState("");
  const [expandedBrigades, setExpandedBrigades] = useState({});
  const [localBattalions, setLocalBattalions] = useState(battalions);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { setLocalBattalions(battalions); }, [battalions]);

  const activeBattalions = localBattalions.filter(b => !b.archived);
  const archivedBattalions = localBattalions.filter(b => b.archived);
  const allExpanded = brigades.every(b => expandedBrigades[b.id] !== false);

  const groupedByBrigade = brigades.map(brigade => ({
    ...brigade,
    battalions: sortBattalions(activeBattalions.filter(b => b.brigade_id === brigade.id)),
  }));
  const unassigned = sortBattalions(activeBattalions.filter(b => !b.brigade_id));

  function checkAbbrConflict(abbr, currentId) {
    if (!abbr) { setAbbrConflict(""); return; }
    const conflict = localBattalions.find(b => b.school_abbr?.toUpperCase() === abbr.toUpperCase() && b.id !== currentId);
    if (conflict) {
      setAbbrConflict(`"${abbr.toUpperCase()}" is already used by ${conflict.school_name} (${conflict.unit_number}). Please choose a different abbreviation.`);
    } else {
      setAbbrConflict("");
    }
  }

  async function saveUnit() {
    if (abbrConflict) { alert("Please resolve the abbreviation conflict before saving."); return; }
    setSaving(true);
    const saveData = { ...form, school_abbr: form.school_abbr?.toUpperCase() || null, cadet_count: parseInt(form.cadet_count) || 0 };
    if (editingId) {
      const { error } = await supabase.from("battalions").update(saveData).eq("id", editingId);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
      setLocalBattalions(prev => prev.map(b => b.id === editingId ? { ...b, ...saveData } : b));
    } else {
      const { data, error } = await supabase.from("battalions").insert([{ ...saveData, status: "active" }]).select().single();
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
      if (data) setLocalBattalions(prev => [...prev, data]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ unit_number: "", school_name: "", school_abbr: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" });
    setAbbrConflict("");
    setSaving(false);
  }

  async function updateStatus(battalionId, status) {
    await supabase.from("battalions").update({ status }).eq("id", battalionId);
    setLocalBattalions(prev => prev.map(b => b.id === battalionId ? { ...b, status } : b));
  }

  async function archiveUnit(battalionId) {
    await supabase.from("battalions").update({ archived: true }).eq("id", battalionId);
    setLocalBattalions(prev => prev.map(b => b.id === battalionId ? { ...b, archived: true } : b));
  }

  async function unarchiveUnit(battalionId) {
    await supabase.from("battalions").update({ archived: false }).eq("id", battalionId);
    setLocalBattalions(prev => prev.map(b => b.id === battalionId ? { ...b, archived: false } : b));
  }

  async function deleteUnit(battalionId) {
    if (!window.confirm("Permanently delete this unit? This cannot be undone. Consider archiving instead.")) return;
    await supabase.from("battalions").delete().eq("id", battalionId);
    setLocalBattalions(prev => prev.filter(b => b.id !== battalionId));
  }

  function startEdit(battalion) {
    setEditingId(battalion.id);
    setForm({ 
      unit_number: battalion.unit_number || "", 
      school_name: battalion.school_name || "", 
      school_abbr: battalion.school_abbr || "", 
      school_address: battalion.school_address || "", 
      cadet_count: battalion.cadet_count || "", 
      commandant_name: battalion.commandant_name || "", 
      commandant_email: battalion.commandant_email || "", 
      phone: battalion.phone || "", 
      brigade_id: battalion.brigade_id || "" 
    });
    setAbbrConflict("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const statusOptions = [
    { value: "active", label: "Active", color: "#166534", bg: "#dcfce7" },
    { value: "inactive", label: "Inactive", color: "#991b1b", bg: "#fee2e2" },
    { value: "pending", label: "Pending", color: "#92400e", bg: "#fef3c7" },
  ];

  function BattalionRow({ battalion, showArchiveBtn = true }) {
    return (
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{battalion.unit_number || "No unit #"}</div>
            {battalion.school_abbr && <span style={{ fontSize: 10, fontFamily: "monospace", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: 4 }}>{battalion.school_abbr}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{battalion.school_name}</div>
          {battalion.commandant_name && <div style={{ fontSize: 11, color: "#9ca3af" }}>{battalion.commandant_name}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {!battalion.archived && (
            <div style={{ display: "flex", gap: 2 }}>
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => updateStatus(battalion.id, s.value)} style={{ padding: "3px 6px", borderRadius: 5, border: battalion.status === s.value ? `1.5px solid ${s.color}` : "0.5px solid #e5e7eb", background: battalion.status === s.value ? s.bg : "#fff", color: battalion.status === s.value ? s.color : "#9ca3af", fontSize: 9, cursor: "pointer", fontWeight: 500 }}>{s.label}</button>
              ))}
            </div>
          )}
          <button onClick={() => startEdit(battalion)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #185FA5", background: "#fff", color: "#185FA5", fontSize: 10, cursor: "pointer" }}>Edit</button>
          {showArchiveBtn && !battalion.archived && <button onClick={() => archiveUnit(battalion.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #92400e", background: "#fff", color: "#92400e", fontSize: 10, cursor: "pointer" }}>Archive</button>}
          {battalion.archived && <button onClick={() => unarchiveUnit(battalion.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #166534", background: "#fff", color: "#166534", fontSize: 10, cursor: "pointer" }}>Restore</button>}
          <button onClick={() => deleteUnit(battalion.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 10, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{activeBattalions.length} active units</div>
          <button onClick={() => setExpandedBrigades(Object.fromEntries(brigades.map(b => [b.id, !allExpanded])))} style={{ ...STYLES.button, padding: "5px 10px", fontSize: 11, ...STYLES.buttonSecondary, color: "#6b7280" }}>{allExpanded ? "Collapse all" : "Expand all"}</button>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ unit_number: "", school_name: "", school_abbr: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" }); setAbbrConflict(""); }} style={{ ...STYLES.button, ...STYLES.buttonPrimary }}>+ Add new unit</button>
      </div>

      {showForm && (
        <div style={{ ...STYLES.card, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: "#111827" }}>{editingId ? "Edit unit" : "Add new unit"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["unit_number", "Unit number (e.g. 1-105)"], ["school_name", "School name"], ["school_address", "School address"], ["cadet_count", "Number of cadets"], ["commandant_name", "Commandant name and rank"], ["commandant_email", "Commandant email"], ["phone", "Phone number"]].map(([field, label]) => (
              <div key={field}>
                <div style={STYLES.label}>{label}</div>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={STYLES.input} />
              </div>
            ))}

            <div>
              <div style={STYLES.label}>School abbreviation (3–5 chars, used in ticket IDs)</div>
              <input
                value={form.school_abbr}
                onChange={e => {
                  const val = e.target.value.toUpperCase().slice(0, 5);
                  setForm(f => ({ ...f, school_abbr: val }));
                  checkAbbrConflict(val, editingId);
                }}
                placeholder="e.g. NMS, SHHS, WJSHS"
                maxLength={5}
                style={{ ...STYLES.input, border: abbrConflict ? "1.5px solid #ef4444" : "0.5px solid #d1d5db", fontFamily: "monospace" }}
              />
              {abbrConflict && <div style={{ fontSize: 11, color: "#991b1b", marginTop: 4, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6 }}>⚠ {abbrConflict}</div>}
              {!abbrConflict && form.school_abbr && <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>✓ Abbreviation is available</div>}
            </div>

            <div>
              <div style={STYLES.label}>Brigade</div>
              <select value={form.brigade_id} onChange={e => setForm(f => ({ ...f, brigade_id: e.target.value }))} style={STYLES.input}>
                <option value="">Select brigade...</option>
                {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setAbbrConflict(""); }} style={{ ...STYLES.button, ...STYLES.buttonSecondary, flex: 1, minWidth: 120 }}>Cancel</button>
            <button onClick={saveUnit} disabled={saving || !!abbrConflict} style={{ ...STYLES.button, border: "none", background: abbrConflict ? "#9ca3af" : "#185FA5", color: "#fff", cursor: abbrConflict ? "not-allowed" : "pointer", flex: 1, minWidth: 120 }}>{saving ? "Saving..." : editingId ? "Update unit" : "Save unit"}</button>
          </div>
        </div>
      )}

      {groupedByBrigade.map(brigade => {
        if (brigade.battalions.length === 0) return null;
        const isExpanded = expandedBrigades[brigade.id] !== false;
        return (
          <div key={brigade.id} style={{ marginBottom: 12 }}>
            <div onClick={() => setExpandedBrigades(e => ({ ...e, [brigade.id]: !isExpanded }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: isExpanded ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>{brigade.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...STYLES.badge, background: "#f3f4f6", color: "#6b7280" }}>{brigade.battalions.length} units</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>
            {isExpanded && (
              <div style={{ ...STYLES.card, padding: 0, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {brigade.battalions.map(battalion => <BattalionRow key={battalion.id} battalion={battalion} />)}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", background: "#f9fafb", borderRadius: "10px 10px 0 0", border: "0.5px solid #e5e7eb" }}>Unassigned</div>
          <div style={{ ...STYLES.card, padding: 0, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
            {unassigned.map(battalion => <BattalionRow key={battalion.id} battalion={battalion} />)}
          </div>
        </div>
      )}

      {archivedBattalions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div onClick={() => setShowArchived(s => !s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f3f4f6", borderRadius: showArchived ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Archived units</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...STYLES.badge, background: "#e5e7eb", color: "#6b7280" }}>{archivedBattalions.length}</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{showArchived ? "▲" : "▼"}</span>
            </div>
          </div>
          {showArchived && (
            <div style={{ ...STYLES.card, padding: 0, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
              {sortBattalions(archivedBattalions).map(battalion => <BattalionRow key={battalion.id} battalion={battalion} showArchiveBtn={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



