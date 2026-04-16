import { useState, useEffect, useRef } from "react";
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

// ─── NAVY HEADER COLORS (Item 18) ───────────────────────────────────────────
const NAV_BG = "#0C2340";
const NAV_ACTIVE = "#185FA5";
const NAV_TEXT = "#cbd5e1";
const NAV_TEXT_ACTIVE = "#ffffff";

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("state");
  const [categories, setCategories] = useState({});
  const [brigades, setBrigades] = useState([]);
  const [battalions, setBattalions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stateInventory, setStateInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState("commandant");
  const [requestForm, setRequestForm] = useState({ first_name: "", last_name: "", rank: "", phone: "", school_email: "", cacc_email: "", commandant_email: "", brigade_id: "", battalion_id: "" });
  const [requestBrigades, setRequestBrigades] = useState([]);
  const [requestBattalions, setRequestBattalions] = useState([]);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffLoginError, setStaffLoginError] = useState("");

  useEffect(() => {
    fetchPublicData();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handleSession(session);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) handleSession(session);
      else { setUserRole(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchPublicData() {
    const [brigRes, batRes] = await Promise.all([
      supabase.from("brigades").select("*").order("brigade_number"),
      supabase.from("battalions").select("*").order("unit_number"),
    ]);
    if (!brigRes.error) setRequestBrigades(brigRes.data);
    if (!batRes.error) setRequestBattalions(batRes.data);
  }

  async function handleSession(session) {
    const email = session.user.email;
    const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split("@")[0];
    const { data: existing } = await supabase.from("user_roles").select("*").eq("email", email).single();
    if (existing) {
      if (!existing.user_id) await supabase.from("user_roles").update({ user_id: session.user.id }).eq("email", email);
      setUserRole(existing);
      setAuthLoading(false);
      if (existing.role !== "pending") { fetchAll(); fetchPendingCount(); }
    } else if (email.endsWith("@cacadets.org") || email.endsWith("@cacc.internal")) {
      const newUser = { user_id: session.user.id, email, full_name: name, role: "pending" };
      await supabase.from("user_roles").insert([newUser]);
      setUserRole({ ...newUser, role: "pending" });
      setAuthLoading(false);
    } else {
      setUserRole(null);
      setAuthLoading(false);
    }
  }

  async function fetchPendingCount() {
    const { data: reqs } = await supabase.from("account_requests").select("id").eq("status", "pending");
    const { data: pending } = await supabase.from("user_roles").select("id").eq("role", "pending");
    setPendingCount((reqs?.length || 0) + (pending?.length || 0));
  }

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

  async function submitAccountRequest() {
    if (!requestForm.first_name || !requestForm.last_name || !requestForm.school_email) {
      alert("Please fill in at least your first name, last name, and email.");
      return;
    }
    setRequestSaving(true);
    await supabase.from("account_requests").insert([{ ...requestForm, rank: requestForm.rank || null, brigade_id: requestForm.brigade_id || null, battalion_id: requestForm.battalion_id || null, request_type: requestType }]);
    setRequestSaving(false);
    setRequestSubmitted(true);
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({ provider: "azure", options: { scopes: "email", redirectTo: window.location.origin } });
  }

  async function signInWithPassword() {
    setStaffLoginError("");
    const email = staffEmail.includes("@") ? staffEmail : `${staffEmail}@cacc.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: staffPassword });
    if (error) setStaffLoginError("Invalid username or password.");
  }

  async function signOut() { await supabase.auth.signOut(); }

  if (authLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>Loading...</div>
      </div>
    </div>
  );

  if (!session) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "0.5px solid #e5e7eb", textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>California Cadet Corps — Supply Management</div>
          <button onClick={signInWithMicrosoft} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 15, cursor: "pointer", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontWeight: 500, marginBottom: 10 }}>
            <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Sign in with Microsoft
          </button>
          <button onClick={() => setShowStaffLogin(s => !s)} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, border: "0.5px solid #d1d5db", background: "#f9fafb", fontSize: 14, cursor: "pointer", color: "#6b7280", marginBottom: 10 }}>Staff / approved account login</button>
          {showStaffLogin && (
            <div style={{ textAlign: "left", marginBottom: 10, padding: 16, background: "#f9fafb", borderRadius: 10, border: "0.5px solid #e5e7eb" }}>
              <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Username or email</div><input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
              <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Password</div><input type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && signInWithPassword()} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
              {staffLoginError && <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 8, padding: "8px 10px", background: "#FEF2F2", borderRadius: 6 }}>{staffLoginError}</div>}
              <button onClick={signInWithPassword} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Sign in</button>
            </div>
          )}
          <div style={{ borderTop: "0.5px solid #f3f4f6", paddingTop: 12 }}>
            <button onClick={() => setShowRequestForm(s => !s)} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, border: "0.5px solid #185FA5", background: "#E6F1FB", fontSize: 14, cursor: "pointer", color: "#185FA5", fontWeight: 500 }}>
              {showRequestForm ? "Hide request form" : "Request commandant / cadet account"}
            </button>
          </div>
        </div>
        {showRequestForm && !requestSubmitted && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "0.5px solid #e5e7eb" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Request an account</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setRequestType("commandant")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: requestType === "commandant" ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: requestType === "commandant" ? "#E6F1FB" : "#fff", color: requestType === "commandant" ? "#185FA5" : "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: requestType === "commandant" ? 600 : 400 }}>Commandant</button>
              <button onClick={() => setRequestType("cadet")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: requestType === "cadet" ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: requestType === "cadet" ? "#E6F1FB" : "#fff", color: requestType === "cadet" ? "#185FA5" : "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: requestType === "cadet" ? 600 : 400 }}>Supply cadet</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>First name *</div><input value={requestForm.first_name} onChange={e => setRequestForm(f => ({ ...f, first_name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
                <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Last name *</div><input value={requestForm.last_name} onChange={e => setRequestForm(f => ({ ...f, last_name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{requestType === "cadet" ? "Cadet rank" : "Rank"}</div><input value={requestForm.rank} onChange={e => setRequestForm(f => ({ ...f, rank: e.target.value }))} placeholder={requestType === "cadet" ? "e.g. C/SGT" : "e.g. MAJ"} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
                <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Phone</div><input value={requestForm.phone} onChange={e => setRequestForm(f => ({ ...f, phone: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
              </div>
              <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{requestType === "cadet" ? "School email *" : "Email *"}</div><input value={requestForm.school_email} onChange={e => setRequestForm(f => ({ ...f, school_email: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
              {requestType === "commandant" && <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>CACC email (if you have one)</div><input value={requestForm.cacc_email} onChange={e => setRequestForm(f => ({ ...f, cacc_email: e.target.value }))} placeholder="you@cacadets.org" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>}
              {requestType === "cadet" && <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Commandant email *</div><input value={requestForm.commandant_email} onChange={e => setRequestForm(f => ({ ...f, commandant_email: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>}
              <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
                <select value={requestForm.brigade_id} onChange={e => setRequestForm(f => ({ ...f, brigade_id: e.target.value, battalion_id: "" }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                  <option value="">Select brigade...</option>
                  {requestBrigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Battalion / School</div>
                <select value={requestForm.battalion_id} onChange={e => setRequestForm(f => ({ ...f, battalion_id: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                  <option value="">Select battalion...</option>
                  {(requestForm.brigade_id ? requestBattalions.filter(b => b.brigade_id === requestForm.brigade_id) : requestBattalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
                </select>
              </div>
              <button onClick={submitAccountRequest} disabled={requestSaving} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>{requestSaving ? "Submitting..." : "Submit account request"}</button>
            </div>
          </div>
        )}
        {showRequestForm && requestSubmitted && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "0.5px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Request submitted!</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>State HQ has been notified. You will receive access once approved.</div>
          </div>
        )}
      </div>
    </div>
  );

  if (!userRole) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%", margin: "0 16px", border: "0.5px solid #e5e7eb", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
        <div style={{ fontSize: 13, color: "#111827", marginBottom: 24, padding: "12px 16px", background: "#FEF2F2", borderRadius: 8 }}>Signed in as: <strong>{session.user.email}</strong><br />Only authorized accounts are permitted.</div>
        <button onClick={signOut} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Sign out</button>
      </div>
    </div>
  );

  if (userRole.role === "pending") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%", margin: "0 16px", border: "0.5px solid #e5e7eb", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
        <div style={{ fontSize: 13, color: "#111827", marginBottom: 24, padding: "12px 16px", background: "#EAF3DE", borderRadius: 8 }}>Signed in as: <strong>{session.user.email}</strong><br /><br />Your account is pending approval. State HQ has been notified.</div>
        <button onClick={signOut} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Sign out</button>
      </div>
    </div>
  );

  const isStateAdmin = userRole.role === "state_admin";
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole.role);

  const tabs = [
    { id: "state", label: "State dashboard" },
    { id: "brigade", label: "Brigade inventory" },
    { id: "battalion", label: "Battalion dashboard" },
    { id: "units", label: "Unit management" },
    ...(isAdminOrAbove ? [{ id: "requests", label: "Supply requests", badge: 0 }] : []),
    ...(isStateAdmin ? [{ id: "users", label: "User management", badge: pendingCount }] : []),
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* ── NAVY HEADER (Item 18) ── */}
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
          <div className="desktop-tabs" style={{ fontSize: 12, color: NAV_TEXT }}>{userRole.full_name} · {userRole.role.replace(/_/g, " ")}</div>
          <button onClick={signOut} className="desktop-tabs" style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #334155", background: "transparent", fontSize: 12, cursor: "pointer", color: NAV_TEXT }}>Sign out</button>
          <button onClick={() => setMenuOpen(m => !m)} className="mobile-menu-btn" style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #334155", background: "transparent", fontSize: 13, cursor: "pointer", color: "#fff", flexShrink: 0 }}>{menuOpen ? "✕" : "☰"}</button>
        </div>
      </div>

      <style>{`.desktop-tabs{display:flex}.mobile-menu-btn{display:none}@media(max-width:768px){.desktop-tabs{display:none!important}.mobile-menu-btn{display:block!important}}`}</style>

      {menuOpen && (
        <div style={{ background: NAV_BG, borderBottom: "0.5px solid #1e3a5f", padding: "8px 0" }}>
          <div style={{ padding: "10px 20px", fontSize: 12, color: NAV_TEXT, borderBottom: "0.5px solid #1e3a5f" }}>{userRole.full_name} · {userRole.role.replace(/_/g, " ")}</div>
          {tabs.map(t => (
            <div key={t.id} onClick={() => { setPage(t.id); setMenuOpen(false); }} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", background: page === t.id ? "#1e3a5f" : "transparent", color: page === t.id ? "#60a5fa" : NAV_TEXT, fontWeight: page === t.id ? 600 : 400, borderLeft: page === t.id ? "3px solid #60a5fa" : "3px solid transparent", display: "flex", alignItems: "center", gap: 8 }}>
              {t.label}
              {t.badge > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>{t.badge}</span>}
            </div>
          ))}
          <div onClick={signOut} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", color: "#fca5a5" }}>Sign out</div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div> : (
          <>
            {page === "state" && <StateDashboard categories={categories} brigades={brigades} battalions={battalions} inventory={inventory} stateInventory={stateInventory} fetchInventoryOnly={fetchInventoryOnly} userRole={userRole} />}
            {page === "brigade" && <BrigadePage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} />}
            {page === "battalion" && <BattalionPage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} fetchInventoryOnly={fetchInventoryOnly} userRole={userRole} />}
            {page === "units" && <UnitsPage brigades={brigades} battalions={battalions} fetchBattalionsOnly={fetchBattalionsOnly} />}
            {page === "requests" && isAdminOrAbove && <SupplyRequestsPage brigades={brigades} battalions={battalions} categories={categories} inventory={inventory} userRole={userRole} />}
            {page === "users" && isStateAdmin && <UserManagement brigades={brigades} battalions={battalions} fetchAll={fetchAll} fetchPendingCount={fetchPendingCount} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

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

// ─── EXPORT HELPERS (Items 3 & 4) ────────────────────────────────────────────

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

function exportInventoryPDF(label, subtitle, rows) {
  let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}h1{font-size:16px;margin-bottom:2px}h2{font-size:12px;font-weight:normal;color:#555;margin-bottom:4px}.meta{font-size:10px;color:#888;margin-bottom:20px}h3{font-size:12px;text-transform:uppercase;text-decoration:underline;margin:16px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:10px}th{text-align:left;padding:5px 8px;background:#f3f4f6;font-size:10px;border-bottom:1px solid #e5e7eb}td{padding:5px 8px;border-bottom:0.5px solid #f3f4f6;font-size:10px}td:nth-child(n+5){text-align:right}</style></head><body>`;
  html += `<h1>CACC Inventory Export — ${label}</h1><h2>${subtitle}</h2><div class="meta">Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</div>`;
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
      items.forEach(i => { html += `<tr><td>${i.item}</td><td style="color:#6b7280">${i.size}</td><td>${i.svc}</td><td style="color:${i.unsvc > 0 ? "#991b1b" : "#111"}">${i.unsvc}</td><td>${i.issued}</td><td><strong>${i.inStock}</strong></td></tr>`; });
      html += `</tbody></table>`;
    });
  });
  html += `</body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

// ─── SUPPLY REQUEST PAGE (Items 8–17) ────────────────────────────────────────

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
      .order("submitted_at", { ascending: false });
    if (!error) setRequests(data || []);
    setLoading(false);
  }

  async function updateStatus(requestId, newStatus) {
    await supabase.from("supply_requests").update({ status: newStatus, last_updated_at: new Date().toISOString() }).eq("id", requestId);
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus, last_updated_at: new Date().toISOString() } : r));
    if (openTicket?.id === requestId) setOpenTicket(prev => ({ ...prev, status: newStatus, last_updated_at: new Date().toISOString() }));
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
    const bat = req.battalions;
    const brig = req.brigades;
    const hasAlert = req.supply_request_items?.some(i => ["backordered", "out_of_stock"].includes(i.item_status));
    return (
      <div onClick={() => setOpenTicket(req)} style={{ background: "#fff", border: hasAlert ? "0.5px solid #fca5a5" : "0.5px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginBottom: 2 }}>{req.ticket_id}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{bat?.unit_number} — {bat?.school_name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{brig?.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
            {hasAlert && <div style={{ fontSize: 10, color: "#991b1b", marginTop: 4 }}>⚠ Items need attention</div>}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>Submitted: {formatDateShort(req.submitted_at)}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>Last updated: {formatDateShort(req.last_updated_at)}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{req.supply_request_items?.length || 0} line items</div>
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
      userRole={userRole}
    />
  );

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Supply requests</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Manage incoming supply requests from battalions statewide.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["active", `Active (${activeReqs.length})`], ["backlog", `Backlog (${backlogReqs.length})`], ["archived", `Archive (${archivedReqs.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 16px", borderRadius: 8, border: tab === id ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: tab === id ? "#E6F1FB" : "#fff", color: tab === id ? "#185FA5" : "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: tab === id ? 600 : 400 }}>{label}</button>
        ))}
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

function TicketDetail({ ticket, categories, statusConfig, itemStatusConfig, onBack, onUpdateStatus, onUpdateItem, userRole }) {
  const sc = statusConfig[ticket.status] || statusConfig.submitted;
  const bat = ticket.battalions;
  const brig = ticket.brigades;
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole.role);

  const statusFlow = ["submitted", "in_review", "fulfilling", "shipped", "archived"];
  const statusLabels = { submitted: "Submitted", in_review: "In review", fulfilling: "In warehouse", shipped: "Shipped", archived: "Archived" };

  function exportTicketPDF() {
    let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}h1{font-size:16px;margin-bottom:2px}.meta{font-size:10px;color:#555;margin-bottom:4px}.divider{border:none;border-top:1px solid #e5e7eb;margin:12px 0}table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;padding:5px 8px;background:#f3f4f6;font-size:10px;border-bottom:1px solid #e5e7eb}td{padding:5px 8px;border-bottom:0.5px solid #f3f4f6;font-size:10px}.badge{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold}</style></head><body>`;
    html += `<h1>CACC Supply Request</h1>`;
    html += `<div class="meta"><strong>Ticket:</strong> ${ticket.ticket_id}</div>`;
    html += `<div class="meta"><strong>Last updated:</strong> ${formatDateShort(ticket.last_updated_at)}</div>`;
    html += `<hr class="divider">`;
    html += `<div class="meta"><strong>Unit:</strong> ${bat?.unit_number} — ${bat?.school_name}</div>`;
    html += `<div class="meta"><strong>Brigade:</strong> ${brig?.name}</div>`;
    html += `<div class="meta"><strong>Commandant:</strong> ${bat?.commandant_name || "N/A"}</div>`;
    html += `<div class="meta"><strong>Email:</strong> ${bat?.commandant_email || "N/A"} &nbsp;&nbsp; <strong>Phone:</strong> ${bat?.phone || "N/A"}</div>`;
    html += `<div class="meta"><strong>Status:</strong> ${sc.label}</div>`;
    html += `<hr class="divider">`;
    html += `<table><thead><tr><th>Item</th><th>Size</th><th>Requested</th><th>Fulfilled</th><th>Status</th></tr></thead><tbody>`;
    (ticket.supply_request_items || []).forEach(item => {
      const allItems = Object.values(categories).flat();
      const catItem = allItems.find(c => c.id === item.catalog_item_id);
      const ist = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
      html += `<tr><td>${catItem?.item_name || "Unknown"}</td><td>${catItem?.size_label || ""}</td><td>${item.qty_requested}</td><td>${item.qty_fulfilled}</td><td>${ist.label}</td></tr>`;
    });
    html += `</tbody></table>`;
    if (ticket.notes) html += `<div class="meta" style="margin-top:12px"><strong>Notes:</strong> ${ticket.notes}</div>`;
    html += `</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  return (
    <div>
      <button onClick={onBack} style={{ padding: "8px 14px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#111827", marginBottom: 16 }}>← Back to requests</button>

      {/* Ticket Header */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6b7280", marginBottom: 4 }}>SUBMITTED: {ticket.ticket_id}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>LAST UPDATED: {formatDateShort(ticket.last_updated_at)}</div>
          </div>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
        </div>
        <div style={{ borderTop: "0.5px solid #f3f4f6", paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Unit", `${bat?.unit_number} — ${bat?.school_name}`], ["Brigade", brig?.name], ["Commandant", bat?.commandant_name || "N/A"], ["Email", bat?.commandant_email || "N/A"], ["Phone", bat?.phone || "N/A"]].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Flow */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Order status</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {statusFlow.map((s, i) => {
            const currentIdx = statusFlow.indexOf(ticket.status);
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

        {isAdminOrAbove && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ticket.status === "submitted" && <button onClick={() => onUpdateStatus(ticket.id, "in_review")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#fef3c7", color: "#92400e", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Mark: In review</button>}
            {ticket.status === "in_review" && <button onClick={() => onUpdateStatus(ticket.id, "fulfilling")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#EAF3DE", color: "#27500A", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Mark: In warehouse</button>}
            {ticket.status === "fulfilling" && <button onClick={() => onUpdateStatus(ticket.id, "shipped")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#dbeafe", color: "#1e3a8a", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Mark: Shipped</button>}
            {ticket.status === "shipped" && <button onClick={() => onUpdateStatus(ticket.id, "archived")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#dcfce7", color: "#166534", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Mark: Delivered / Archive</button>}
            {!["archived", "backlog"].includes(ticket.status) && <button onClick={() => onUpdateStatus(ticket.id, "backlog")} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 13, cursor: "pointer" }}>Move to backlog</button>}
            {ticket.status === "backlog" && <button onClick={() => onUpdateStatus(ticket.id, "submitted")} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid #185FA5", background: "#E6F1FB", color: "#185FA5", fontSize: 13, cursor: "pointer" }}>Move to active</button>}
            {ticket.status !== "archived" && <button onClick={() => onUpdateStatus(ticket.id, "archived")} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", color: "#6b7280", fontSize: 13, cursor: "pointer" }}>Archive ticket</button>}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Line items</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px", padding: "6px 10px", background: "#f9fafb", borderRadius: 6, marginBottom: 6 }}>
          {["Item / Size", "Requested", "Fulfilled", "Status"].map((h, i) => <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "center" }}>{h}</div>)}
        </div>
        {(ticket.supply_request_items || []).map(item => {
          const allItems = Object.values(categories).flat();
          const catItem = allItems.find(c => c.id === item.catalog_item_id);
          const ist = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px", padding: "10px 10px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center" }}>
              <div>
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
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: ist.bg, color: ist.color }}>{ist.label}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={exportTicketPDF} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Export ticket to PDF</button>
    </div>
  );
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

function UserManagement({ brigades, battalions, fetchAll, fetchPendingCount }) {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: "", last_name: "", email: "", password: "", role: "battalion_staff", brigade_id: "", battalion_id: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [expandedRoles, setExpandedRoles] = useState({ state_admin: true, admin: true, brigade_staff: true, battalion_staff: true, pending: true });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [usersRes, reqRes] = await Promise.all([
      supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("account_requests").select("*, brigades(name), battalions(unit_number, school_name)").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setUsers(usersRes.data || []);
    setRequests(reqRes.data || []);
    setLoading(false);
  }

  async function updateUser(userId, updates) {
    await supabase.from("user_roles").update(updates).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    fetchPendingCount();
  }

  async function deleteUser(userId) {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    await supabase.from("user_roles").delete().eq("id", userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    fetchPendingCount();
  }

  async function createUser() {
    setCreateError(""); setCreateSuccess("");
    if (!createForm.first_name || !createForm.last_name || !createForm.email || !createForm.password) { setCreateError("Please fill in all required fields."); return; }
    setCreating(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: createForm.email, password: createForm.password, options: { data: { full_name: `${createForm.first_name} ${createForm.last_name}` } } });
    if (signUpError) { setCreateError("Error: " + signUpError.message); setCreating(false); return; }
    const { error: roleError } = await supabase.from("user_roles").insert([{ user_id: signUpData?.user?.id || null, email: createForm.email, full_name: `${createForm.first_name} ${createForm.last_name}`, role: createForm.role, brigade_id: createForm.brigade_id || null, battalion_id: createForm.battalion_id || null }]);
    if (roleError) { setCreateError("Auth created but role failed: " + roleError.message); setCreating(false); return; }
    setCreateSuccess(`✓ Account created for ${createForm.first_name} ${createForm.last_name}.`);
    setCreateForm({ first_name: "", last_name: "", email: "", password: "", role: "battalion_staff", brigade_id: "", battalion_id: "" });
    setCreating(false);
    await fetchData();
    fetchPendingCount();
  }

  async function approveRequest(req) {
    const fullName = `${req.rank ? req.rank + " " : ""}${req.first_name} ${req.last_name}`;
    await supabase.from("user_roles").insert([{ email: req.school_email, full_name: fullName, role: "battalion_staff", brigade_id: req.brigade_id || null, battalion_id: req.battalion_id || null }]);
    await supabase.from("account_requests").update({ status: "approved" }).eq("id", req.id);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    fetchData(); fetchPendingCount();
  }

  async function denyRequest(reqId) {
    await supabase.from("account_requests").update({ status: "denied" }).eq("id", reqId);
    setRequests(prev => prev.filter(r => r.id !== reqId));
    fetchPendingCount();
  }

  const roleGroups = [
    { role: "state_admin", label: "State admin", color: "#185FA5", bg: "#E6F1FB" },
    { role: "admin", label: "Admin — logistics", color: "#27500A", bg: "#EAF3DE" },
    { role: "brigade_staff", label: "Brigade staff", color: "#92400e", bg: "#fef3c7" },
    { role: "battalion_staff", label: "Battalion staff", color: "#374151", bg: "#f3f4f6" },
    { role: "pending", label: "Pending", color: "#991b1b", bg: "#fee2e2" },
  ];
  const statusOptions = [
    { value: "active", label: "Active", color: "#166534", bg: "#dcfce7" },
    { value: "pending", label: "Pending", color: "#92400e", bg: "#fef3c7" },
    { value: "inactive", label: "Inactive", color: "#991b1b", bg: "#fee2e2" },
  ];
  const allExpanded = roleGroups.every(g => expandedRoles[g.role]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>User management</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setExpandedRoles(Object.fromEntries(roleGroups.map(g => [g.role, !allExpanded])))} style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", color: "#6b7280" }}>{allExpanded ? "Collapse all" : "Expand all"}</button>
          <button onClick={() => { setShowCreateForm(s => !s); setCreateError(""); setCreateSuccess(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>+ Create user</button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Role, brigade, battalion and status changes save automatically.</div>

      {showCreateForm && (
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Create new user</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>First name *</div><input value={createForm.first_name} onChange={e => setCreateForm(f => ({ ...f, first_name: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Last name *</div><input value={createForm.last_name} onChange={e => setCreateForm(f => ({ ...f, last_name: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Email *</div><input value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Password *</div><input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box" }} /></div>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Role *</div>
              <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827" }}>
                {["battalion_staff", "brigade_staff", "admin", "state_admin"].map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
              <select value={createForm.brigade_id} onChange={e => setCreateForm(f => ({ ...f, brigade_id: e.target.value, battalion_id: "" }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827" }}>
                <option value="">None</option>
                {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Battalion</div>
              <select value={createForm.battalion_id} onChange={e => setCreateForm(f => ({ ...f, battalion_id: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 13, background: "#fff", color: "#111827" }}>
                <option value="">None</option>
                {sortBattalions(createForm.brigade_id ? battalions.filter(b => b.brigade_id === createForm.brigade_id) : battalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
              </select>
            </div>
          </div>
          {createError && <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 12, padding: "8px 12px", background: "#FEF2F2", borderRadius: 6 }}>{createError}</div>}
          {createSuccess && <div style={{ fontSize: 12, color: "#166534", marginBottom: 12, padding: "8px 12px", background: "#dcfce7", borderRadius: 6 }}>{createSuccess}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowCreateForm(false); setCreateError(""); setCreateSuccess(""); }} style={{ padding: "9px 16px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#111827" }}>Cancel</button>
            <button onClick={createUser} disabled={creating} style={{ padding: "9px 16px", borderRadius: 6, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>{creating ? "Creating..." : "Create user"}</button>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0C447C", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>{requests.length}</span>
            Account requests pending
          </div>
          {requests.map(req => (
            <div key={req.id} style={{ background: "#E6F1FB", border: "0.5px solid #93c5fd", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{req.rank} {req.first_name} {req.last_name}</div>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: req.request_type === "cadet" ? "#fef3c7" : "#E6F1FB", color: req.request_type === "cadet" ? "#92400e" : "#0C447C" }}>{req.request_type || "commandant"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Email: {req.school_email}</div>
                {req.commandant_email && <div style={{ fontSize: 12, color: "#6b7280" }}>Commandant: {req.commandant_email}</div>}
                {req.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>Phone: {req.phone}</div>}
                <div style={{ fontSize: 12, color: "#6b7280" }}>Brigade: {req.brigades?.name || "Not specified"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Battalion: {req.battalions ? `${req.battalions.unit_number} — ${req.battalions.school_name}` : "Not specified"}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Requested: {new Date(req.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveRequest(req)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Approve</button>
                <button onClick={() => denyRequest(req.id)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 13, cursor: "pointer" }}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading...</div> : roleGroups.map(group => {
        const groupUsers = users.filter(u => u.role === group.role);
        if (groupUsers.length === 0) return null;
        const isExpanded = expandedRoles[group.role];
        return (
          <div key={group.role} style={{ marginBottom: 16 }}>
            <div onClick={() => setExpandedRoles(e => ({ ...e, [group.role]: !e[group.role] }))} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isExpanded ? 10 : 0, cursor: "pointer", padding: "8px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: group.color, textTransform: "uppercase", textDecoration: "underline", letterSpacing: "0.04em" }}>{group.label}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: group.bg, color: group.color }}>{groupUsers.length}</span>
              <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>{isExpanded ? "▲" : "▼"}</span>
            </div>
            {isExpanded && (
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px 60px", padding: "8px 14px", background: "#f9fafb", borderBottom: "0.5px solid #e5e7eb", gap: 8 }}>
                  {["Name", "Role", "Brigade", "Battalion", "Status", ""].map(h => <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{h}</div>)}
                </div>
                {groupUsers.map(user => (
                  <div key={user.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px 60px", padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{user.full_name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{user.email}</div>
                    </div>
                    <select value={user.role} onChange={e => updateUser(user.id, { role: e.target.value })} style={{ width: "100%", padding: "5px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 11, background: "#fff", color: "#111827" }}>
                      {["pending", "battalion_staff", "brigade_staff", "admin", "state_admin"].map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                    </select>
                    <select value={user.brigade_id || ""} onChange={e => updateUser(user.id, { brigade_id: e.target.value || null })} style={{ width: "100%", padding: "5px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 11, background: "#fff", color: "#111827" }}>
                      <option value="">None</option>
                      {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={user.battalion_id || ""} onChange={e => updateUser(user.id, { battalion_id: e.target.value || null })} style={{ width: "100%", padding: "5px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 11, background: "#fff", color: "#111827" }}>
                      <option value="">None</option>
                      {sortBattalions(battalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 2 }}>
                      {statusOptions.map(s => (
                        <button key={s.value} onClick={() => updateUser(user.id, { status: s.value })} style={{ flex: 1, padding: "4px 1px", borderRadius: 5, border: (user.status === s.value || (!user.status && s.value === "active")) ? `1.5px solid ${s.color}` : "0.5px solid #e5e7eb", background: (user.status === s.value || (!user.status && s.value === "active")) ? s.bg : "#fff", color: (user.status === s.value || (!user.status && s.value === "active")) ? s.color : "#9ca3af", fontSize: 8, cursor: "pointer", fontWeight: 500 }}>{s.label}</button>
                      ))}
                    </div>
                    <button onClick={() => deleteUser(user.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 10, cursor: "pointer" }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SUM INVENTORY ───────────────────────────────────────────────────────────

function sumInv(inventory, battalionIds, catalogItemId) {
  const rows = inventory.filter(i => battalionIds.includes(i.battalion_id) && i.catalog_item_id === catalogItemId);
  return {
    qty_serviceable: rows.reduce((s, r) => s + (r.qty_serviceable || 0), 0),
    qty_unserviceable: rows.reduce((s, r) => s + (r.qty_unserviceable || 0), 0),
    qty_issued: rows.reduce((s, r) => s + (r.qty_issued || 0), 0),
  };
}

// ─── STATE DASHBOARD ─────────────────────────────────────────────────────────

function StateDashboard({ categories, brigades, battalions, inventory, stateInventory, fetchInventoryOnly, userRole }) {
  const [open, setOpen] = useState({});
  const [localCats, setLocalCats] = useState(categories);
  const [localStateInv, setLocalStateInv] = useState(stateInventory);
  const [sectionEdits, setSectionEdits] = useState({});
  const [savingSection, setSavingSection] = useState({});
  const [savedSection, setSavedSection] = useState({});
  const [noticeBanner, setNoticeBanner] = useState("");
  const [noticeEdit, setNoticeEdit] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);

  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const activeBats = battalions.filter(b => b.status === "active");
  const totalCadets = battalions.reduce((s, b) => s + (b.cadet_count || 0), 0);
  const allBatIds = battalions.map(b => b.id);
  const allItems = Object.values(localCats).flat();
  const isAdminOrAbove = ["state_admin", "admin"].includes(userRole?.role);

  useEffect(() => { setLocalCats(categories); }, [categories]);
  useEffect(() => { setLocalStateInv(stateInventory); }, [stateInventory]);
  useEffect(() => { fetchNotice(); }, []);

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

  function getStateInv(itemId) { return localStateInv.find(s => s.catalog_item_id === itemId) || { qty_warehouse: 0, shortage_threshold: 0 }; }
  function getEdit(cat, itemId, field) {
    if (sectionEdits[cat]?.[itemId]?.[field] !== undefined) return sectionEdits[cat][itemId][field];
    const si = getStateInv(itemId);
    if (field === "qty_warehouse") return si.qty_warehouse || 0;
    if (field === "shortage_threshold") return si.shortage_threshold || 0;
    return 0;
  }
  function setEdit(cat, itemId, field, value) { setSectionEdits(e => ({ ...e, [cat]: { ...e[cat], [itemId]: { ...e[cat]?.[itemId], [field]: parseInt(value) || 0 } } })); }
  function catHasEdits(cat) { return sectionEdits[cat] && Object.keys(sectionEdits[cat]).length > 0; }

  async function toggleStock(item) {
    const newVal = !item.in_stock;
    const now = newVal ? null : new Date().toISOString();
    setLocalCats(prev => {
      const updated = {};
      for (const [cat, items] of Object.entries(prev)) updated[cat] = items.map(i => i.id === item.id ? { ...i, in_stock: newVal, out_of_stock_at: now } : i);
      return updated;
    });
    await supabase.from("catalog_items").update({ in_stock: newVal, out_of_stock_at: now }).eq("id", item.id);
  }

  async function saveSection(cat, items) {
    setSavingSection(s => ({ ...s, [cat]: true }));
    for (const item of items) {
      if (!sectionEdits[cat]?.[item.id]) continue;
      const existing = localStateInv.find(s => s.catalog_item_id === item.id);
      const data = { catalog_item_id: item.id, qty_warehouse: getEdit(cat, item.id, "qty_warehouse"), shortage_threshold: getEdit(cat, item.id, "shortage_threshold"), updated_at: new Date().toISOString() };
      if (existing) await supabase.from("state_inventory").update(data).eq("id", existing.id);
      else await supabase.from("state_inventory").insert([data]);
    }
    const { data: fresh } = await supabase.from("state_inventory").select("*");
    if (fresh) setLocalStateInv(fresh);
    setSectionEdits(e => { const n = { ...e }; delete n[cat]; return n; });
    setSavingSection(s => ({ ...s, [cat]: false }));
    setSavedSection(s => ({ ...s, [cat]: true }));
    setTimeout(() => setSavedSection(s => ({ ...s, [cat]: false })), 3000);
  }

  // Build export rows for State
  function buildExportRows() {
    const rows = [];
    SECTIONS.forEach(section => {
      section.groups.forEach(cat => {
        (localCats[cat] || []).forEach(item => {
          const batInv = sumInv(inventory, allBatIds, item.id);
          const warehouse = getEdit(cat, item.id, "qty_warehouse");
          const inStock = Math.max(0, warehouse - (batInv.qty_issued || 0));
          rows.push({ section: section.header, category: cat, item: item.item_name, size: item.size_label, svc: warehouse, unsvc: batInv.qty_unserviceable, issued: batInv.qty_issued, inStock });
        });
      });
    });
    return rows;
  }

  return (
    <div>
      {/* State Notice Board (Item 10) */}
      {(noticeBanner || isAdminOrAbove) && (
        <div style={{ background: "#fef3c7", border: "0.5px solid #fcd34d", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>State HQ Notice</div>
              {noticeEdit ? (
                <textarea value={noticeBanner} onChange={e => setNoticeBanner(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #fcd34d", fontSize: 13, color: "#111827", background: "#fff", resize: "vertical", boxSizing: "border-box" }} placeholder="Enter a notice for all units (e.g. supply delays, known shortages)..." />
              ) : (
                <div style={{ fontSize: 13, color: "#92400e" }}>{noticeBanner || <span style={{ color: "#d97706", fontStyle: "italic" }}>No active notice. Click Edit to add one.</span>}</div>
              )}
            </div>
            {isAdminOrAbove && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {noticeEdit ? (
                  <>
                    <button onClick={saveNotice} disabled={noticeSaving} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#92400e", color: "#fff", fontSize: 12, cursor: "pointer" }}>{noticeSaving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setNoticeEdit(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #fcd34d", background: "#fff", color: "#92400e", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setNoticeEdit(true)} style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #fcd34d", background: "#fff", color: "#92400e", fontSize: 12, cursor: "pointer" }}>Edit</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[["Active battalions", activeBats.length], ["Total cadets", totalCadets.toLocaleString()], ["Catalog items", allItems.length], ["Out of stock", allItems.filter(i => !i.in_stock).length]].map(([label, value]) => (
          <div key={label} style={{ background: "#fff", borderRadius: 10, padding: 14, border: "0.5px solid #e5e7eb" }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0C2340" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Export Inventory Button (Item 3) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => exportInventoryCSV("State-All", buildExportRows())} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export inventory — CSV</button>
        <button onClick={() => exportInventoryPDF("State — All Units", "Complete state warehouse inventory", buildExportRows())} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export inventory — PDF</button>
      </div>

      {SECTIONS.map(section => (
        <div key={section.header} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>{section.header}</div>
          {section.groups.map(cat => {
            const items = localCats[cat] || [];
            if (items.length === 0) return null;
            const hasEdits = catHasEdits(cat);
            return (
              <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                  <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {open[cat] && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 80px 90px 100px 80px 80px", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8 }}>
                      {["Item / Size", "Stock", "Alert", "Warehouse", "Unserviceable", "Issued", "In stock"].map((h, i) => (
                        <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: i === 0 ? "left" : "center" }}>{h}</div>
                      ))}
                    </div>
                    {items.map(item => {
                      const batInv = sumInv(inventory, allBatIds, item.id);
                      const warehouse = getEdit(cat, item.id, "qty_warehouse");
                      const threshold = getEdit(cat, item.id, "shortage_threshold");
                      const inStock = Math.max(0, warehouse - (batInv.qty_issued || 0));
                      const isAlert = threshold > 0 && inStock < threshold;
                      return (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 70px 80px 90px 100px 80px 80px", padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, background: isAlert ? "#FEF2F2" : "#fff" }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#111827", fontWeight: isAlert ? 600 : 400 }}>{item.item_name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
                          </div>
                          <div style={{ display: "flex", gap: 3 }}>
                            <button onClick={() => { if (!item.in_stock) toggleStock(item); }} style={{ flex: 1, padding: "4px 2px", borderRadius: 6, border: item.in_stock ? "1.5px solid #166534" : "0.5px solid #e5e7eb", background: item.in_stock ? "#dcfce7" : "#fff", color: item.in_stock ? "#166534" : "#9ca3af", fontSize: 9, cursor: item.in_stock ? "default" : "pointer", fontWeight: 500 }}>In</button>
                            <button onClick={() => { if (item.in_stock) toggleStock(item); }} style={{ flex: 1, padding: "4px 2px", borderRadius: 6, border: !item.in_stock ? "1.5px solid #991b1b" : "0.5px solid #e5e7eb", background: !item.in_stock ? "#fee2e2" : "#fff", color: !item.in_stock ? "#991b1b" : "#9ca3af", fontSize: 9, cursor: !item.in_stock ? "default" : "pointer", fontWeight: 500 }}>Out</button>
                          </div>
                          <div style={{ textAlign: "center" }}><input type="number" min="0" value={threshold} onChange={e => setEdit(cat, item.id, "shortage_threshold", e.target.value)} style={{ width: 52, padding: "4px", borderRadius: 6, border: isAlert ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} /></div>
                          <div style={{ textAlign: "center" }}><input type="number" min="0" value={warehouse} onChange={e => setEdit(cat, item.id, "qty_warehouse", e.target.value)} style={{ width: 60, padding: "4px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} /></div>
                          <div style={{ fontSize: 13, color: batInv.qty_unserviceable > 0 ? "#991b1b" : "#111827", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{batInv.qty_unserviceable}</div>
                          <div style={{ fontSize: 13, color: "#111827", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{batInv.qty_issued}</div>
                          <div style={{ textAlign: "center" }}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                        </div>
                      );
                    })}
                    {hasEdits && (
                      <div style={{ padding: "10px 14px", background: "#f9fafb", borderTop: "0.5px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => saveSection(cat, items)} disabled={savingSection[cat]} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
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

// ─── BRIGADE PAGE ─────────────────────────────────────────────────────────────

function BrigadePage({ brigades, battalions, inventory, categories }) {
  const [selectedBrigade, setSelectedBrigade] = useState("");
  const [open, setOpen] = useState({});
  const [expandedItems, setExpandedItems] = useState({}); // Item 6
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const toggleItem = itemId => setExpandedItems(o => ({ ...o, [itemId]: !o[itemId] }));

  const brig = brigades.find(b => b.id === selectedBrigade);
  const bats = sortBattalions(battalions.filter(b => b.brigade_id === selectedBrigade));
  const batIds = bats.map(b => b.id);
  const totalCadets = bats.reduce((s, b) => s + (b.cadet_count || 0), 0);

  function getBatAlert(bat) {
    return inventory.filter(i => i.battalion_id === bat.id).some(i => { const t = i.shortage_threshold || 0; if (!t) return false; return Math.max(0, (i.qty_serviceable || 0) - (i.qty_issued || 0)) < t; });
  }

  // Build export rows for Brigade (Item 3)
  function buildExportRows() {
    const rows = [];
    SECTIONS.forEach(section => {
      section.groups.forEach(cat => {
        (categories[cat] || []).forEach(item => {
          const inv = sumInv(inventory, batIds, item.id);
          const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
          rows.push({ section: section.header, category: cat, item: item.item_name, size: item.size_label, svc: inv.qty_serviceable, unsvc: inv.qty_unserviceable, issued: inv.qty_issued, inStock });
        });
      });
    });
    return rows;
  }

  return (
    <div>
      <select onChange={e => { setSelectedBrigade(e.target.value); setOpen({}); setExpandedItems({}); }} value={selectedBrigade} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827", marginBottom: 16 }}>
        <option value="">Select a brigade...</option>
        {brigades.map(b => <option key={b.id} value={b.id}>{b.name} — {b.region}</option>)}
      </select>

      {brig && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Battalions", bats.length], ["Active", bats.filter(b => b.status === "active").length], ["Cadets", totalCadets]].map(([label, value]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 10, padding: 12, border: "0.5px solid #e5e7eb" }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0C2340" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Export Buttons (Item 3) */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => exportInventoryCSV(`${brig.name.replace(/\s+/g, "-")}`, buildExportRows())} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export inventory — CSV</button>
            <button onClick={() => exportInventoryPDF(brig.name, `Aggregate inventory across ${bats.length} battalions`, buildExportRows())} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export inventory — PDF</button>
          </div>

          {/* Battalion list */}
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 600, fontSize: 13, color: "#111827" }}>Battalions in {brig.name}</div>
            {bats.map(bat => {
              const hasAlert = getBatAlert(bat);
              return (
                <div key={bat.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: hasAlert ? "#FEF2F2" : "#fff" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
                      {bat.unit_number}
                      {hasAlert && <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: 999 }}>shortage alert</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{bat.school_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#111827" }}>{bat.cadet_count} cadets</div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: bat.status === "active" ? "#dcfce7" : "#f3f4f6", color: bat.status === "active" ? "#166534" : "#6b7280" }}>{bat.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregate Inventory — with expandable battalion rows (Items 6 & 7) */}
          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 10 }}>Aggregate inventory — {brig.name}</div>
          {SECTIONS.map(section => (
            <div key={section.header} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>{section.header}</div>
              {section.groups.map(cat => {
                const items = categories[cat] || [];
                if (items.length === 0) return null;
                return (
                  <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length}</span>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {open[cat] && (
                      <div>
                        {/* Column headers (Item 7 — fixed width aligned columns) */}
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 100px", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Item / Size</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Svc</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Unsvc</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Issued</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>In stock</div>
                        </div>

                        {items.map(item => {
                          const inv = sumInv(inventory, batIds, item.id);
                          const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
                          const isExpanded = expandedItems[item.id];

                          return (
                            <div key={item.id}>
                              {/* Brigade aggregate row (Items 6 & 7) */}
                              <div onClick={() => toggleItem(item.id)} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 100px", padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, cursor: "pointer", background: isExpanded ? "#f9fafb" : "#fff" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 11, color: "#185FA5", flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                                  <div>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.item_name}</span>
                                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{item.size_label}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, color: "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_serviceable}</div>
                                <div style={{ fontSize: 13, color: inv.qty_unserviceable > 0 ? "#991b1b" : "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_unserviceable}</div>
                                <div style={{ fontSize: 13, color: "#111827", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{inv.qty_issued}</div>
                                <div style={{ textAlign: "right" }}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: inStock > 0 ? "#dcfce7" : "#f3f4f6", color: inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                              </div>

                              {/* Battalion breakdown rows (Item 6) */}
                              {isExpanded && bats.map(bat => {
                                const batRow = inventory.find(i => i.battalion_id === bat.id && i.catalog_item_id === item.id);
                                const bSvc = batRow?.qty_serviceable || 0;
                                const bUnsvc = batRow?.qty_unserviceable || 0;
                                const bIssued = batRow?.qty_issued || 0;
                                const bStock = Math.max(0, bSvc - bIssued);
                                return (
                                  <div key={bat.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 80px 100px", padding: "7px 14px 7px 36px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, background: "#f9fafb" }}>
                                    <div>
                                      <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>{bat.unit_number}</span>
                                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>{bat.school_name}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bSvc}</div>
                                    <div style={{ fontSize: 12, color: bUnsvc > 0 ? "#991b1b" : "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bUnsvc}</div>
                                    <div style={{ fontSize: 12, color: "#374151", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{bIssued}</div>
                                    <div style={{ textAlign: "right" }}><span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, background: bStock > 0 ? "#dcfce7" : "#f3f4f6", color: bStock > 0 ? "#166534" : "#6b7280" }}>{bStock}</span></div>
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

// ─── BATTALION PAGE ───────────────────────────────────────────────────────────

function BattalionPage({ brigades, battalions, inventory, categories, fetchInventoryOnly, userRole }) {
  const [selectedBat, setSelectedBat] = useState("");
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

  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const toggleSupplyCat = cat => setSupplyOpen(o => ({ ...o, [cat]: !o[cat] }));

  useEffect(() => { setLocalInventory(inventory); }, [inventory]);

  const bat = battalions.find(b => b.id === selectedBat);
  const brig = bat ? brigades.find(b => b.id === bat.brigade_id) : null;

  function getInvRow(itemId) { return localInventory.find(i => i.battalion_id === selectedBat && i.catalog_item_id === itemId); }
  function getEdit(cat, itemId, field) {
    if (sectionEdits[cat]?.[itemId]?.[field] !== undefined) return sectionEdits[cat][itemId][field];
    const inv = getInvRow(itemId);
    return inv ? (inv[field] || 0) : 0;
  }
  function setEdit(cat, itemId, field, value) { setSectionEdits(e => ({ ...e, [cat]: { ...e[cat], [itemId]: { ...e[cat]?.[itemId], [field]: parseInt(value) || 0 } } })); }
  function catHasEdits(cat) { return sectionEdits[cat] && Object.keys(sectionEdits[cat]).length > 0; }

  async function fetchMyRequests(batId) {
    const { data } = await supabase.from("supply_requests").select("*, supply_request_items(*)").eq("battalion_id", batId).order("submitted_at", { ascending: false });
    setMyRequests(data || []);
  }

  async function saveSection(cat, items) {
    setSavingSection(s => ({ ...s, [cat]: true }));
    const newInvRows = [];
    for (const item of items) {
      if (!sectionEdits[cat]?.[item.id]) continue;
      const existing = getInvRow(item.id);
      const data = { battalion_id: selectedBat, catalog_item_id: item.id, qty_serviceable: getEdit(cat, item.id, "qty_serviceable"), qty_unserviceable: getEdit(cat, item.id, "qty_unserviceable"), qty_issued: getEdit(cat, item.id, "qty_issued"), shortage_threshold: getEdit(cat, item.id, "shortage_threshold"), updated_at: new Date().toISOString() };
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
        if (idx >= 0) updated[idx] = row; else updated.push(row);
      }
      return updated;
    });
    setSectionEdits(e => { const n = { ...e }; delete n[cat]; return n; });
    setSavingSection(s => ({ ...s, [cat]: false }));
    setSavedSection(s => ({ ...s, [cat]: true }));
    setTimeout(() => setSavedSection(s => ({ ...s, [cat]: false })), 3000);
  }

  // Submit supply request to the ticket system (Item 8)
  async function submitSupplyRequest() {
    const items = Object.entries(supplyQtys).filter(([, qty]) => qty > 0);
    if (items.length === 0) { alert("Please enter at least one item quantity."); return; }

    setSubmittingRequest(true);

    // Generate ticket ID via Supabase function
    const brigNumber = brig?.brigade_number || "0";
    const batNumber = bat.unit_number.split("-")[1] || bat.unit_number;
    const abbr = bat.school_abbr || bat.school_name.slice(0, 4).toUpperCase();

    const { data: ticketData, error: ticketError } = await supabase.rpc("generate_ticket_id", {
      p_brigade_number: String(brigNumber),
      p_battalion_number: batNumber,
      p_school_abbr: abbr,
    });

    if (ticketError) { alert("Error generating ticket ID: " + ticketError.message); setSubmittingRequest(false); return; }

    const { data: reqData, error: reqError } = await supabase.from("supply_requests").insert([{
      ticket_id: ticketData,
      battalion_id: selectedBat,
      brigade_id: bat.brigade_id,
      status: "submitted",
    }]).select().single();

    if (reqError || !reqData) { alert("Error creating request: " + (reqError?.message || "unknown")); setSubmittingRequest(false); return; }

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
    fetchMyRequests(selectedBat);
  }

  function exportCurrentInventoryCSV() {
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
    exportInventoryCSV(`${bat.unit_number}-${bat.school_name.replace(/\s+/g, "-")}`, rows);
  }

  function exportCurrentInventoryPDF() {
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
    exportInventoryPDF(`${bat.unit_number} — ${bat.school_name}`, `${brig?.name} | Commandant: ${bat.commandant_name || "N/A"}`, rows);
  }

  function exportSupplyRequestPDF() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
    let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;font-weight:normal;color:#555;margin-bottom:20px}h3{font-size:13px;text-transform:uppercase;text-decoration:underline;margin:20px 0 8px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{text-align:left;padding:6px 10px;background:#f3f4f6;font-size:11px;border-bottom:1px solid #e5e7eb}td{padding:6px 10px;border-bottom:0.5px solid #f3f4f6}.highlighted{background:#FEF9C3;font-weight:bold}.footer{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#555}</style></head><body><h1>CACC Supply Request — ${bat.unit_number} ${bat.school_name}</h1><h2>Date: ${dateStr} | Brigade: ${brig?.name} | Commandant: ${bat.commandant_name || "N/A"}</h2>`;
    SECTIONS.forEach(section => {
      html += `<h3>${section.header}</h3><table><thead><tr><th>Item</th><th>Size</th><th>Qty requested</th></tr></thead><tbody>`;
      section.groups.forEach(g => { (categories[g] || []).forEach(item => { const qty = supplyQtys[item.id] || 0; if (qty > 0) html += `<tr class="highlighted"><td>${item.item_name}</td><td>${item.size_label}</td><td>${qty}</td></tr>`; }); });
      html += `</tbody></table>`;
    });
    html += `<div class="footer"><strong>Unit:</strong> ${bat.unit_number} | <strong>School:</strong> ${bat.school_name} | <strong>Email:</strong> ${bat.commandant_email || "N/A"} | <strong>Phone:</strong> ${bat.phone || "N/A"}</div></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  }

  function exportSupplyRequestCSV() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}`;
    let csv = `CACC Supply Request - ${bat.unit_number} - ${bat.school_name}\nDate: ${dateStr}\nBrigade: ${brig?.name}\nCommandant: ${bat.commandant_name || ""}\n\nSection,Item,Size,Qty requested\n`;
    SECTIONS.forEach(section => { section.groups.forEach(g => { (categories[g] || []).forEach(item => { const qty = supplyQtys[item.id] || 0; if (qty > 0) csv += `${section.header},"${item.item_name}","${item.size_label}",${qty}\n`; }); }); });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Supply-Request-${bat.unit_number}-${dateStr}.csv`; a.click();
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
      <select onChange={e => { setSelectedBat(e.target.value); setOpen({}); setSectionEdits({}); setShowSupply(false); setSupplyQtys({}); setRequestSubmitted(false); if (e.target.value) fetchMyRequests(e.target.value); }} value={selectedBat} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827", marginBottom: 12 }}>
        <option value="">Select a battalion...</option>
        {sortBattalions(battalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
      </select>

      {bat && (
        <>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Unit", bat.unit_number], ["School", bat.school_name], ["Brigade", brig?.name], ["Cadets", bat.cadet_count], ["Commandant", bat.commandant_name || "Not set"], ["Status", bat.status]].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Export current inventory (Item 3) */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={exportCurrentInventoryCSV} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Export inventory — CSV</button>
            <button onClick={exportCurrentInventoryPDF} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Export inventory — PDF</button>
          </div>

          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#E6F1FB", borderRadius: 8, fontSize: 13, color: "#0C447C" }}>
            Tap any category to expand it. A save button appears at the bottom of each section when you make changes.
          </div>

          {SECTIONS.map(section => (
            <div key={section.header} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>{section.header}</div>
              {section.groups.map(cat => {
                const items = categories[cat] || [];
                if (items.length === 0) return null;
                const hasEdits = catHasEdits(cat);
                return (
                  <div key={cat} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div onClick={() => toggleCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#f9fafb" }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{items.length}</span>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{open[cat] ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {open[cat] && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 70px 70px 70px 70px", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 6 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Item / Size</div>
                          {["Alert", "Svc", "Unsvc", "Issued", "Stock"].map(h => <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>{h}</div>)}
                        </div>
                        {items.map(item => {
                          const svc = getEdit(cat, item.id, "qty_serviceable");
                          const unsvc = getEdit(cat, item.id, "qty_unserviceable");
                          const issued = getEdit(cat, item.id, "qty_issued");
                          const threshold = getEdit(cat, item.id, "shortage_threshold");
                          const inStock = Math.max(0, svc - issued);
                          const isAlert = threshold > 0 && inStock < threshold;
                          return (
                            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 60px 70px 70px 70px 70px", padding: "8px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 6, background: isAlert ? "#FEF2F2" : "#fff" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: isAlert ? 600 : 400, color: "#111827" }}>{item.item_name}</div>
                                <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
                              </div>
                              <input type="number" min="0" value={threshold} onChange={e => setEdit(cat, item.id, "shortage_threshold", e.target.value)} style={{ width: "100%", padding: "5px 2px", borderRadius: 6, border: isAlert ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={svc} onChange={e => setEdit(cat, item.id, "qty_serviceable", e.target.value)} style={{ width: "100%", padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={unsvc} onChange={e => setEdit(cat, item.id, "qty_unserviceable", e.target.value)} style={{ width: "100%", padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <input type="number" min="0" value={issued} onChange={e => setEdit(cat, item.id, "qty_issued", e.target.value)} style={{ width: "100%", padding: "5px 2px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                              <div style={{ textAlign: "center" }}><span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 999, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span></div>
                            </div>
                          );
                        })}
                        {hasEdits && (
                          <div style={{ padding: "10px 14px", background: "#f9fafb", borderTop: "0.5px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => saveSection(cat, items)} disabled={savingSection[cat]} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
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

          {/* My Requests Tracker (Item 13) */}
          {myRequests.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div onClick={() => setShowMyRequests(s => !s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#fff", borderRadius: showMyRequests ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>My supply requests</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, background: "#E6F1FB", color: "#0C447C", padding: "2px 8px", borderRadius: 999 }}>{myRequests.length}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{showMyRequests ? "▲" : "▼"}</span>
                </div>
              </div>
              {showMyRequests && (
                <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {myRequests.map(req => {
                    const sc = statusConfig[req.status] || statusConfig.submitted;
                    return (
                      <div key={req.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid #f3f4f6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", marginBottom: 2 }}>{req.ticket_id}</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{req.supply_request_items?.length || 0} items requested</div>
                          </div>
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label.split("—")[0].trim()}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Submitted: {formatDateShort(req.submitted_at)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>Updated: {formatDateShort(req.last_updated_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Supply Request Form (Items 1, 4, 8) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8, marginBottom: 24 }}>
            <button onClick={() => { setShowSupply(s => !s); setRequestSubmitted(false); }} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "0.5px solid #185FA5", background: showSupply ? "#185FA5" : "#fff", color: showSupply ? "#fff" : "#185FA5", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>{showSupply ? "Hide supply request" : "Submit a supply request"}</button>
            <button onClick={() => window.open(`mailto:logistics@cacadets.org?subject=Supply Request — ${bat.unit_number} ${bat.school_name}&body=Please find attached our supply request.`)} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", color: "#111827", fontSize: 14, cursor: "pointer" }}>Email HQ logistics</button>
          </div>

          {showSupply && !requestSubmitted && (
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#111827" }}>Supply request form</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Enter quantities for items you need. Items marked out of stock are unavailable from State HQ at this time.</div>

              {SECTIONS.map(section => (
                <div key={section.header} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#111827", textTransform: "uppercase" }}>{section.header}</div>
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
                              <div key={item.id} style={{ padding: "10px 14px", borderTop: "0.5px solid #f3f4f6", background: "#FEF2F2" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: 13, color: "#6b7280" }}>{item.item_name}</div>
                                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.size_label}</div>
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
                            <div key={item.id} style={{ padding: "10px 14px", borderTop: "0.5px solid #f3f4f6", background: qty > 0 ? "#FEF9C3" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: qty > 0 ? 600 : 400, color: "#111827" }}>{item.item_name}</div>
                                <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[["Battalion", bat.unit_number], ["School", bat.school_name], ["Brigade", brig?.name], ["Commandant", bat.commandant_name || "Not set"], ["Email", bat.commandant_email || "Not set"], ["Phone", bat.phone || "Not set"]].map(([label, value]) => (
                    <div key={label}><div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{label}</div><div style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{value}</div></div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Submit to ticket system (Item 8) */}
                <button onClick={submitSupplyRequest} disabled={submittingRequest} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                  {submittingRequest ? "Submitting..." : "Submit request to State HQ"}
                </button>
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>— or save a copy for your records —</div>
                {/* Export buttons (Item 4 — clearly labeled as Supply Request) */}
                <button onClick={exportSupplyRequestCSV} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export supply request — CSV</button>
                <button onClick={exportSupplyRequestPDF} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Export supply request — PDF</button>
              </div>
            </div>
          )}

          {showSupply && requestSubmitted && (
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Request submitted to State HQ</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Your request is in the queue. You can track its status in the "My supply requests" section above.</div>
              <button onClick={() => { setRequestSubmitted(false); setShowSupply(false); }} style={{ padding: "10px 20px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#111827" }}>Done</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── UNITS PAGE ───────────────────────────────────────────────────────────────

function UnitsPage({ brigades, battalions, fetchBattalionsOnly }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ unit_number: "", school_name: "", school_abbr: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" });
  const [saving, setSaving] = useState(false);
  const [abbrConflict, setAbbrConflict] = useState(""); // Item 19
  const [expandedBrigades, setExpandedBrigades] = useState({});
  const [localBattalions, setLocalBattalions] = useState(battalions);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { setLocalBattalions(battalions); }, [battalions]);

  const activeBats = localBattalions.filter(b => !b.archived);
  const archivedBats = localBattalions.filter(b => b.archived);
  const allExpanded = brigades.every(b => expandedBrigades[b.id] !== false);

  const groupedByBrigade = brigades.map(brig => ({
    ...brig,
    bats: sortBattalions(activeBats.filter(b => b.brigade_id === brig.id)),
  }));
  const unassigned = sortBattalions(activeBats.filter(b => !b.brigade_id));

  // Item 19 — Auto-deconflict abbreviations
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

  async function updateStatus(batId, status) {
    await supabase.from("battalions").update({ status }).eq("id", batId);
    setLocalBattalions(prev => prev.map(b => b.id === batId ? { ...b, status } : b));
  }

  async function archiveUnit(batId) {
    await supabase.from("battalions").update({ archived: true }).eq("id", batId);
    setLocalBattalions(prev => prev.map(b => b.id === batId ? { ...b, archived: true } : b));
  }

  async function unarchiveUnit(batId) {
    await supabase.from("battalions").update({ archived: false }).eq("id", batId);
    setLocalBattalions(prev => prev.map(b => b.id === batId ? { ...b, archived: false } : b));
  }

  async function deleteUnit(batId) {
    if (!window.confirm("Permanently delete this unit? This cannot be undone. Consider archiving instead.")) return;
    await supabase.from("battalions").delete().eq("id", batId);
    setLocalBattalions(prev => prev.filter(b => b.id !== batId));
  }

  function startEdit(bat) {
    setEditingId(bat.id);
    setForm({ unit_number: bat.unit_number || "", school_name: bat.school_name || "", school_abbr: bat.school_abbr || "", school_address: bat.school_address || "", cadet_count: bat.cadet_count || "", commandant_name: bat.commandant_name || "", commandant_email: bat.commandant_email || "", phone: bat.phone || "", brigade_id: bat.brigade_id || "" });
    setAbbrConflict("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const statusOptions = [
    { value: "active", label: "Active", color: "#166534", bg: "#dcfce7" },
    { value: "inactive", label: "Inactive", color: "#991b1b", bg: "#fee2e2" },
    { value: "pending", label: "Pending", color: "#92400e", bg: "#fef3c7" },
  ];

  function BatRow({ bat, showArchiveBtn = true }) {
    return (
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{bat.unit_number || "No unit #"}</div>
            {bat.school_abbr && <span style={{ fontSize: 10, fontFamily: "monospace", background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: 4 }}>{bat.school_abbr}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{bat.school_name}</div>
          {bat.commandant_name && <div style={{ fontSize: 11, color: "#9ca3af" }}>{bat.commandant_name}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!bat.archived && (
            <div style={{ display: "flex", gap: 2 }}>
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => updateStatus(bat.id, s.value)} style={{ padding: "3px 6px", borderRadius: 5, border: bat.status === s.value ? `1.5px solid ${s.color}` : "0.5px solid #e5e7eb", background: bat.status === s.value ? s.bg : "#fff", color: bat.status === s.value ? s.color : "#9ca3af", fontSize: 9, cursor: "pointer", fontWeight: 500 }}>{s.label}</button>
              ))}
            </div>
          )}
          <button onClick={() => startEdit(bat)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #185FA5", background: "#fff", color: "#185FA5", fontSize: 10, cursor: "pointer" }}>Edit</button>
          {showArchiveBtn && !bat.archived && <button onClick={() => archiveUnit(bat.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #92400e", background: "#fff", color: "#92400e", fontSize: 10, cursor: "pointer" }}>Archive</button>}
          {bat.archived && <button onClick={() => unarchiveUnit(bat.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #166534", background: "#fff", color: "#166534", fontSize: 10, cursor: "pointer" }}>Restore</button>}
          <button onClick={() => deleteUnit(bat.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 10, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{activeBats.length} active units</div>
          <button onClick={() => setExpandedBrigades(Object.fromEntries(brigades.map(b => [b.id, !allExpanded])))} style={{ padding: "5px 10px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 11, cursor: "pointer", color: "#6b7280" }}>{allExpanded ? "Collapse all" : "Expand all"}</button>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ unit_number: "", school_name: "", school_abbr: "", school_address: "", cadet_count: "", commandant_name: "", commandant_email: "", phone: "", brigade_id: "" }); setAbbrConflict(""); }} style={{ padding: "10px 16px", borderRadius: 8, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer" }}>+ Add new unit</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: "#111827" }}>{editingId ? "Edit unit" : "Add new unit"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["unit_number", "Unit number (e.g. 1-105)"], ["school_name", "School name"], ["school_address", "School address"], ["cadet_count", "Number of cadets"], ["commandant_name", "Commandant name and rank"], ["commandant_email", "Commandant email"], ["phone", "Phone number"]].map(([field, label]) => (
              <div key={field}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#ffffff", boxSizing: "border-box" }} />
              </div>
            ))}

            {/* School abbreviation with live deconflict (Item 19) */}
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>School abbreviation (3–5 chars, used in ticket IDs)</div>
              <input
                value={form.school_abbr}
                onChange={e => {
                  const val = e.target.value.toUpperCase().slice(0, 5);
                  setForm(f => ({ ...f, school_abbr: val }));
                  checkAbbrConflict(val, editingId);
                }}
                placeholder="e.g. NMS, SHHS, WJSHS"
                maxLength={5}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: abbrConflict ? "1.5px solid #ef4444" : "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box", fontFamily: "monospace" }}
              />
              {abbrConflict && <div style={{ fontSize: 11, color: "#991b1b", marginTop: 4, padding: "6px 10px", background: "#FEF2F2", borderRadius: 6 }}>⚠ {abbrConflict}</div>}
              {!abbrConflict && form.school_abbr && <div style={{ fontSize: 11, color: "#166534", marginTop: 4 }}>✓ Abbreviation is available</div>}
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
              <select value={form.brigade_id} onChange={e => setForm(f => ({ ...f, brigade_id: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                <option value="">Select brigade...</option>
                {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setAbbrConflict(""); }} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Cancel</button>
            <button onClick={saveUnit} disabled={saving || !!abbrConflict} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "none", background: abbrConflict ? "#9ca3af" : "#185FA5", color: "#fff", fontSize: 14, cursor: abbrConflict ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : editingId ? "Update unit" : "Save unit"}</button>
          </div>
        </div>
      )}

      {groupedByBrigade.map(brig => {
        if (brig.bats.length === 0) return null;
        const isExpanded = expandedBrigades[brig.id] !== false;
        return (
          <div key={brig.id} style={{ marginBottom: 12 }}>
            <div onClick={() => setExpandedBrigades(e => ({ ...e, [brig.id]: !isExpanded }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: isExpanded ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em" }}>{brig.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>{brig.bats.length} units</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>
            {isExpanded && (
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {brig.bats.map(bat => <BatRow key={bat.id} bat={bat} />)}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", background: "#f9fafb", borderRadius: "10px 10px 0 0", border: "0.5px solid #e5e7eb" }}>Unassigned</div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
            {unassigned.map(bat => <BatRow key={bat.id} bat={bat} />)}
          </div>
        </div>
      )}

      {archivedBats.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div onClick={() => setShowArchived(s => !s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f3f4f6", borderRadius: showArchived ? "10px 10px 0 0" : 10, border: "0.5px solid #e5e7eb", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>Archived units</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", background: "#e5e7eb", padding: "2px 8px", borderRadius: 999 }}>{archivedBats.length}</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{showArchived ? "▲" : "▼"}</span>
            </div>
          </div>
          {showArchived && (
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
              {sortBattalions(archivedBats).map(bat => <BatRow key={bat.id} bat={bat} showArchiveBtn={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

