import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SECTIONS = [
  { header: "Accoutrements", groups: ["Accoutrements Class A", "Accoutrements Class B"] },
  { header: "Uniforms", groups: ["Class A Uniform", "Class B Uniform", "Class C Uniform", "PT Uniform"] },
  { header: "Ribbons", groups: ["Ribbons", "Ribbon Backers / Devices"] },
  { header: "Patches", groups: ["Position Patches"] },
];

export default function App() {
  const [page, setPage] = useState("state");
  const [categories, setCategories] = useState({});
  const [brigades, setBrigades] = useState([]);
  const [battalions, setBattalions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [catRes, brigRes, batRes, invRes] = await Promise.all([
      supabase.from("catalog_items").select("*").order("sort_order"),
      supabase.from("brigades").select("*").order("brigade_number"),
      supabase.from("battalions").select("*").order("unit_number"),
      supabase.from("inventory").select("*"),
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
    setLoading(false);
  }

  const tabs = [
    { id: "state", label: "State dashboard" },
    { id: "brigade", label: "Brigade inventory" },
    { id: "battalion", label: "Battalion dashboard" },
    { id: "units", label: "Unit management" },
    { id: "catalog", label: "Catalog admin" },
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f5f4" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600, fontSize: 16, padding: "16px 0", marginRight: 24 }}>
          CACC <span style={{ color: "#185FA5" }}>Inventory</span>
        </div>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setPage(t.id)} style={{ padding: "16px 14px", fontSize: 13, cursor: "pointer", borderBottom: page === t.id ? "2px solid #185FA5" : "2px solid transparent", color: page === t.id ? "#185FA5" : "#6b7280", fontWeight: page === t.id ? 500 : 400 }}>
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ padding: 24 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : (
          <>
            {page === "state" && <StateDashboard categories={categories} brigades={brigades} battalions={battalions} inventory={inventory} />}
            {page === "brigade" && <BrigadePage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} />}
            {page === "battalion" && <BattalionPage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} fetchAll={fetchAll} />}
            {page === "units" && <UnitsPage brigades={brigades} battalions={battalions} fetchAll={fetchAll} />}
            {page === "catalog" && <CatalogPage categories={categories} fetchAll={fetchAll} />}
          </>
        )}
      </div>
    </div>
  );
}

function getInv(inventory, battalionId, catalogItemId) {
  return inventory.find(i => i.battalion_id === battalionId && i.catalog_item_id === catalogItemId) || { qty_serviceable: 0, qty_unserviceable: 0, qty_issued: 0 };
}

function sumInv(inventory, battalionIds, catalogItemId) {
  const rows = inventory.filter(i => battalionIds.includes(i.battalion_id) && i.catalog_item_id === catalogItemId);
  return {
    qty_serviceable: rows.reduce((s, r) => s + (r.qty_serviceable || 0), 0),
    qty_unserviceable: rows.reduce((s, r) => s + (r.qty_unserviceable || 0), 0),
    qty_issued: rows.reduce((s, r) => s + (r.qty_issued || 0), 0),
  };
}

function InventoryTable({ items, inventory, battalionIds, readOnly }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          {["Item", "Size / variant", "Serviceable", "Unserviceable", "Issued", "In stock"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const inv = sumInv(inventory, battalionIds, item.id);
          const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
          return (
            <tr key={item.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
              <td style={{ padding: "8px 16px", color: "#111827" }}>{item.item_name}</td>
              <td style={{ padding: "8px 16px", color: "#6b7280" }}>{item.size_label}</td>
              <td style={{ padding: "8px 16px", color: "#111827" }}>{inv.qty_serviceable}</td>
              <td style={{ padding: "8px 16px", color: inv.qty_unserviceable > 0 ? "#991b1b" : "#111827" }}>{inv.qty_unserviceable}</td>
              <td style={{ padding: "8px 16px", color: "#111827" }}>{inv.qty_issued}</td>
              <td style={{ padding: "8px 16px" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: inStock > 0 ? "#dcfce7" : "#f3f4f6", color: inStock > 0 ? "#166534" : "#6b7280" }}>
                  {inStock}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SectionLayout({ categories, inventory, battalionIds, open, toggleCat, readOnly }) {
  return (
    <div>
      {SECTIONS.map(section => (
        <div key={section.header} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, textDecoration: "underline", marginBottom: 12, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {section.header}
          </div>
          {section.groups.map(cat => {
            const items = categories[cat] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                <div onClick={() => toggleCat(cat)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{cat}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length} items</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {open[cat] && <InventoryTable items={items} inventory={inventory} battalionIds={battalionIds} readOnly={readOnly} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function StateDashboard({ categories, brigades, battalions, inventory }) {
  const [open, setOpen] = useState({});
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const activeBats = battalions.filter(b => b.status === "active");
  const totalCadets = battalions.reduce((s, b) => s + (b.cadet_count || 0), 0);
  const totalItems = Object.values(categories).flat().length;
  const outOfStock = Object.values(categories).flat().filter(i => !i.in_stock).length;
  const allBatIds = battalions.map(b => b.id);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 24 }}>
        {[["Active battalions", activeBats.length], ["Total cadets", totalCadets.toLocaleString()], ["Catalog items", totalItems], ["Out of stock", outOfStock]].map(([label, value]) => (
          <div key={label} style={{ background: "#f3f4f6", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
      <SectionLayout categories={categories} inventory={inventory} battalionIds={allBatIds} open={open} toggleCat={toggleCat} readOnly={true} />
    </div>
  );
}

function BrigadePage({ brigades, battalions, inventory, categories }) {
  const [selectedBrigade, setSelectedBrigade] = useState("");
  const [open, setOpen] = useState({});
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const brig = brigades.find(b => b.id === selectedBrigade);
  const bats = battalions.filter(b => b.brigade_id === selectedBrigade);
  const batIds = bats.map(b => b.id);
  const totalCadets = bats.reduce((s, b) => s + (b.cadet_count || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select onChange={e => { setSelectedBrigade(e.target.value); setOpen({}); }} value={selectedBrigade} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827" }}>
          <option value="">Select a brigade...</option>
          {brigades.map(b => <option key={b.id} value={b.id}>{b.name} — {b.region}</option>)}
        </select>
      </div>
      {brig && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
            {[["Battalions", bats.length], ["Active units", bats.filter(b => b.status === "active").length], ["Total cadets", totalCadets]].map(([label, value]) => (
              <div key={label} style={{ background: "#f3f4f6", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20, background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 500, fontSize: 14 }}>Battalions in {brig.name}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{["Unit #", "School", "Cadets", "Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {bats.map(bat => (
                  <tr key={bat.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 16px", fontWeight: 500, color: "#111827" }}>{bat.unit_number}</td>
                    <td style={{ padding: "8px 16px", color: "#111827" }}>{bat.school_name}</td>
                    <td style={{ padding: "8px 16px", color: "#111827" }}>{bat.cadet_count}</td>
                    <td style={{ padding: "8px 16px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: bat.status === "active" ? "#dcfce7" : "#f3f4f6", color: bat.status === "active" ? "#166534" : "#6b7280" }}>{bat.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginBottom: 12, fontWeight: 500, fontSize: 14, color: "#111827" }}>Aggregate inventory — {brig.name}</div>
          <SectionLayout categories={categories} inventory={inventory} battalionIds={batIds} open={open} toggleCat={toggleCat} readOnly={true} />
        </>
      )}
    </div>
  );
}

function BattalionPage({ brigades, battalions, inventory, categories, fetchAll }) {
  const [selectedBat, setSelectedBat] = useState("");
  const [open, setOpen] = useState({});
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const bat = battalions.find(b => b.id === selectedBat);
  const brig = bat ? brigades.find(b => b.id === bat.brigade_id) : null;

  function getEdit(itemId, field) {
    const inv = inventory.find(i => i.battalion_id === selectedBat && i.catalog_item_id === itemId);
    if (edits[itemId] !== undefined && edits[itemId][field] !== undefined) return edits[itemId][field];
    return inv ? (inv[field] || 0) : 0;
  }

  function setEdit(itemId, field, value) {
    setEdits(e => ({ ...e, [itemId]: { ...e[itemId], [field]: parseInt(value) || 0 } }));
  }

  async function saveAll() {
    setSaving(true);
    const allItems = Object.values(categories).flat();
    for (const item of allItems) {
      if (!edits[item.id]) continue;
      const existing = inventory.find(i => i.battalion_id === selectedBat && i.catalog_item_id === item.id);
      const data = {
        battalion_id: selectedBat,
        catalog_item_id: item.id,
        qty_serviceable: getEdit(item.id, "qty_serviceable"),
        qty_unserviceable: getEdit(item.id, "qty_unserviceable"),
        qty_issued: getEdit(item.id, "qty_issued"),
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        await supabase.from("inventory").update(data).eq("id", existing.id);
      } else {
        await supabase.from("inventory").insert([data]);
      }
    }
    await fetchAll();
    setEdits({});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select onChange={e => { setSelectedBat(e.target.value); setOpen({}); setEdits({}); }} value={selectedBat} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827", width: 320 }}>
          <option value="">Select a battalion...</option>
          {battalions.map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
        </select>
        {bat && (
          <button onClick={saveAll} disabled={saving || Object.keys(edits).length === 0} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: Object.keys(edits).length > 0 ? "#185FA5" : "#d1d5db", color: "#fff", fontSize: 13, cursor: Object.keys(edits).length > 0 ? "pointer" : "default" }}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save inventory"}
          </button>
        )}
      </div>
      {bat && (
        <>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Unit</div><div style={{ fontWeight: 500, color: "#111827" }}>{bat.unit_number}</div></div>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>School</div><div style={{ fontWeight: 500, color: "#111827" }}>{bat.school_name}</div></div>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Brigade</div><div style={{ fontWeight: 500, color: "#111827" }}>{brig?.name}</div></div>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Cadets</div><div style={{ fontWeight: 500, color: "#111827" }}>{bat.cadet_count}</div></div>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Commandant</div><div style={{ fontWeight: 500, color: "#111827" }}>{bat.commandant_name || "Not set"}</div></div>
              <div><div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>Status</div><div style={{ fontWeight: 500, color: "#111827" }}>{bat.status}</div></div>
            </div>
          </div>
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#E6F1FB", borderRadius: 8, fontSize: 13, color: "#0C447C" }}>
            Enter your unit inventory below. Click any category to expand it, update the numbers, then click Save inventory when done.
          </div>
          {SECTIONS.map(section => (
            <div key={section.header} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, textDecoration: "underline", marginBottom: 12, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {section.header}
              </div>
              {section.groups.map(cat => {
                const items = categories[cat] || [];
                if (items.length === 0) return null;
                return (
                  <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                    <div onClick={() => toggleCat(cat)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                      <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{cat}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length} items</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {open[cat] && (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>{["Item", "Size / variant", "Serviceable", "Unserviceable", "Issued", "In stock"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {items.map(item => {
                            const svc = getEdit(item.id, "qty_serviceable");
                            const unsvc = getEdit(item.id, "qty_unserviceable");
                            const issued = getEdit(item.id, "qty_issued");
                            const inStock = Math.max(0, svc - issued);
                            return (
                              <tr key={item.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                                <td style={{ padding: "8px 16px", color: "#111827" }}>{item.item_name}</td>
                                <td style={{ padding: "8px 16px", color: "#6b7280" }}>{item.size_label}</td>
                                <td style={{ padding: "8px 16px" }}>
                                  <input type="number" min="0" value={svc} onChange={e => setEdit(item.id, "qty_serviceable", e.target.value)} style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px 16px" }}>
                                  <input type="number" min="0" value={unsvc} onChange={e => setEdit(item.id, "qty_unserviceable", e.target.value)} style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px 16px" }}>
                                  <input type="number" min="0" value={issued} onChange={e => setEdit(item.id, "qty_issued", e.target.value)} style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center" }} />
                                </td>
                                <td style={{ padding: "8px 16px" }}>
                                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: inStock > 0 ? "#dcfce7" : "#f3f4f6", color: inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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

function UnitsPage({ brigades, battalions, fetchAll }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ unit_number: "", school_name: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" });
  const [saving, setSaving] = useState(false);

  async function saveUnit() {
    setSaving(true);
    await supabase.from("battalions").insert([{ ...form, cadet_count: parseInt(form.cadet_count) || 0, status: "active" }]);
    await fetchAll();
    setShowForm(false);
    setForm({ unit_number: "", school_name: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" });
    setSaving(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "#6b7280" }}>{battalions.length} total units</div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer" }}>
          + Add new unit
        </button>
      </div>
      {showForm && (
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 16, color: "#111827" }}>Add new unit</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["unit_number", "Unit number (e.g. 1-105)"], ["school_name", "School name"], ["school_address", "School address"], ["cadet_count", "Number of cadets"], ["commandant_name", "Commandant name and rank"], ["commandant_email", "Commandant email"], ["phone", "Phone number"]].map(([field, label]) => (
              <div key={field}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, color: "#111827" }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
              <select value={form.brigade_id} onChange={e => setForm(f => ({ ...f, brigade_id: e.target.value }))} style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827" }}>
                <option value="">Select brigade...</option>
                {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 16px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#111827" }}>Cancel</button>
            <button onClick={saveUnit} disabled={saving} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save unit"}
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Unit #", "School", "Brigade", "Cadets", "Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {battalions.map(bat => {
              const brig = brigades.find(b => b.id === bat.brigade_id);
              return (
                <tr key={bat.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 500, color: "#111827" }}>{bat.unit_number}</td>
                  <td style={{ padding: "8px 16px", color: "#111827" }}>{bat.school_name}</td>
                  <td style={{ padding: "8px 16px", color: "#6b7280" }}>{brig?.name}</td>
                  <td style={{ padding: "8px 16px", color: "#111827" }}>{bat.cadet_count}</td>
                  <td style={{ padding: "8px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: bat.status === "active" ? "#dcfce7" : "#f3f4f6", color: bat.status === "active" ? "#166534" : "#6b7280" }}>{bat.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogPage({ categories, fetchAll }) {
  const [updating, setUpdating] = useState(null);
  const [open, setOpen] = useState({});
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));

  async function toggleStock(item) {
    setUpdating(item.id);
    await supabase.from("catalog_items").update({ in_stock: !item.in_stock }).eq("id", item.id);
    await fetchAll();
    setUpdating(null);
  }

  return (
    <div>
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "#EAF3DE", borderRadius: 8, fontSize: 13, color: "#27500A" }}>
        State HQ only — toggle items in/out of stock. Changes apply instantly across all dashboards.
      </div>
      {SECTIONS.map(section => (
        <div key={section.header} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, textDecoration: "underline", marginBottom: 12, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {section.header}
          </div>
          {section.groups.map(cat => {
            const items = categories[cat] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                <div onClick={() => toggleCat(cat)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{cat}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length} items</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {open[cat] && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>{["Item", "Size / variant", "Status", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 16px", color: "#111827" }}>{item.item_name}</td>
                          <td style={{ padding: "8px 16px", color: "#6b7280" }}>{item.size_label}</td>
                          <td style={{ padding: "8px 16px" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: item.in_stock ? "#dcfce7" : "#fee2e2", color: item.in_stock ? "#166534" : "#991b1b" }}>
                              {item.in_stock ? "In stock" : "Out of stock"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 16px" }}>
                            <button onClick={() => toggleStock(item)} disabled={updating === item.id} style={{ padding: "4px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 11, cursor: "pointer", color: "#111827" }}>
                              {updating === item.id ? "Saving..." : item.in_stock ? "Mark out of stock" : "Mark in stock"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}