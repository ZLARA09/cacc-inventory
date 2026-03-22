import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [page, setPage] = useState("state");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog();
  }, []);

  async function fetchCatalog() {
    setLoading(true);
    const { data, error } = await supabase
      .from("catalog_items")
      .select("*")
      .order("sort_order");
    if (!error) {
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
      setCategories(grouped);
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f5f4" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", gap: "0" }}>
        <div style={{ fontWeight: 600, fontSize: 16, padding: "16px 0", marginRight: 24 }}>
          CACC <span style={{ color: "#185FA5" }}>Inventory</span>
        </div>
        {["state", "brigade", "battalion", "units", "catalog"].map(p => (
          <div key={p} onClick={() => setPage(p)} style={{ padding: "16px", fontSize: 13, cursor: "pointer", borderBottom: page === p ? "2px solid #185FA5" : "2px solid transparent", color: page === p ? "#185FA5" : "#6b7280", fontWeight: page === p ? 500 : 400, textTransform: "capitalize" }}>
            {p === "state" ? "State dashboard" : p === "brigade" ? "Brigade inventory" : p === "battalion" ? "Battalion dashboard" : p === "units" ? "Unit management" : "Catalog admin"}
          </div>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {page === "state" && <StateDashboard categories={categories} loading={loading} />}
        {page === "brigade" && <BrigadePage />}
        {page === "battalion" && <BattalionPage />}
        {page === "units" && <UnitsPage />}
        {page === "catalog" && <CatalogPage categories={categories} loading={loading} fetchCatalog={fetchCatalog} />}
      </div>
    </div>
  );
}

function StateDashboard({ categories, loading }) {
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading inventory...</div>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[["Total categories", Object.keys(categories).length], ["Total items", Object.values(categories).flat().length], ["In stock", Object.values(categories).flat().filter(i => i.in_stock).length], ["Out of stock", Object.values(categories).flat().filter(i => !i.in_stock).length]].map(([label, value]) => (
          <div key={label} style={{ background: "#f3f4f6", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{cat}</span>
            <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length} items</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Item", "Size / variant", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 16px" }}>{item.item_name}</td>
                  <td style={{ padding: "8px 16px", color: "#6b7280" }}>{item.size_label}</td>
                  <td style={{ padding: "8px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: item.in_stock ? "#dcfce7" : "#fee2e2", color: item.in_stock ? "#166534" : "#991b1b" }}>
                      {item.in_stock ? "In stock" : "Out of stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function CatalogPage({ categories, loading, fetchCatalog }) {
  const [updating, setUpdating] = useState(null);

  async function toggleStock(item) {
    setUpdating(item.id);
    await supabase.from("catalog_items").update({ in_stock: !item.in_stock }).eq("id", item.id);
    await fetchCatalog();
    setUpdating(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading catalog...</div>;
  return (
    <div>
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "#EAF3DE", borderRadius: 8, fontSize: 13, color: "#27500A" }}>
        State HQ only — toggle items in/out of stock. Changes apply instantly across all brigade and battalion dashboards.
      </div>
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb" }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{cat}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Item", "Size / variant", "Status", "Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 16px", borderBottom: "0.5px solid #e5e7eb", color: "#6b7280", fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 16px" }}>{item.item_name}</td>
                  <td style={{ padding: "8px 16px", color: "#6b7280" }}>{item.size_label}</td>
                  <td style={{ padding: "8px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: item.in_stock ? "#dcfce7" : "#fee2e2", color: item.in_stock ? "#166534" : "#991b1b" }}>
                      {item.in_stock ? "In stock" : "Out of stock"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 16px" }}>
                    <button onClick={() => toggleStock(item)} disabled={updating === item.id} style={{ padding: "4px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 11, cursor: "pointer" }}>
                      {updating === item.id ? "Saving..." : item.in_stock ? "Mark out of stock" : "Mark in stock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function BrigadePage() {
  return <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14 }}>Brigade inventory dashboard — coming next session</div>;
}

function BattalionPage() {
  return <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14 }}>Battalion dashboard — coming next session</div>;
}

function UnitsPage() {
  return <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontSize: 14 }}>Unit management — coming next session</div>;
}
```