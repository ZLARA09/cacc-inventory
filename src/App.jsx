import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY;

async function sendEmail(to, subject, html) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: "CACC Inventory <onboarding@resend.dev>", to, subject, html }),
    });
  } catch (e) { console.error("Email error:", e); }
}

const SECTIONS = [
  { header: "Accoutrements", groups: ["Accoutrements Class A", "Accoutrements Class B"] },
  { header: "Uniforms", groups: ["Class A Uniform", "Class B Uniform", "Class C Uniform", "PT Uniform"] },
  { header: "Ribbons", groups: ["Ribbons", "Ribbon Backers / Devices"] },
  { header: "Patches", groups: ["Position Patches"] },
];

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
      if (existing.role !== "pending") fetchAll();
    } else if (email.endsWith("@cacadets.org") || email.endsWith("@cacc.internal")) {
      const newUser = { user_id: session.user.id, email, full_name: name, role: "pending" };
      await supabase.from("user_roles").insert([newUser]);
      await sendEmail("zak.lara@cacadets.org", "New CACC Inventory user — action required", `<p>New user signed in: <strong>${name}</strong> (${email})</p><p>Log in to approve their access at <a href="https://cacc-inventory.vercel.app">cacc-inventory.vercel.app</a></p>`);
      setUserRole({ ...newUser, role: "pending" });
      setAuthLoading(false);
    } else {
      setUserRole(null);
      setAuthLoading(false);
    }
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

  async function submitAccountRequest() {
    if (!requestForm.first_name || !requestForm.last_name || !requestForm.school_email) {
      alert("Please fill in at least your first name, last name, and email.");
      return;
    }
    setRequestSaving(true);
    await supabase.from("account_requests").insert([{
      ...requestForm,
      rank: requestForm.rank || null,
      brigade_id: requestForm.brigade_id || null,
      battalion_id: requestForm.battalion_id || null,
      request_type: requestType,
    }]);
    await sendEmail(
      "zak.lara@cacadets.org",
      `New ${requestType} account request — ${requestForm.first_name} ${requestForm.last_name}`,
      `<p><strong>${requestForm.rank || ""} ${requestForm.first_name} ${requestForm.last_name}</strong> has requested a ${requestType} account.</p>
      <p>Email: ${requestForm.school_email}</p>
      ${requestType === "cadet" ? `<p>Commandant email: ${requestForm.commandant_email}</p>` : ""}
      <p>Review and approve at <a href="https://cacc-inventory.vercel.app">cacc-inventory.vercel.app</a> → User management</p>`
    );
    setRequestSaving(false);
    setRequestSubmitted(true);
  }

  async function signInWithMicrosoft() {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: { scopes: "email", redirectTo: window.location.origin },
    });
  }

  async function signInWithPassword() {
    setStaffLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: staffEmail, password: staffPassword });
    if (error) setStaffLoginError("Invalid username or password. Please try again.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f4", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
          <div style={{ fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f4", fontFamily: "sans-serif", padding: 16 }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "0.5px solid #e5e7eb", textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 28 }}>California Cadet Corps — Supply Management</div>
            <button onClick={signInWithMicrosoft} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 15, cursor: "pointer", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontWeight: 500, marginBottom: 10 }}>
              <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </button>
            <button onClick={() => setShowStaffLogin(s => !s)} style={{ width: "100%", padding: "12px 20px", borderRadius: 10, border: "0.5px solid #d1d5db", background: "#f9fafb", fontSize: 14, cursor: "pointer", color: "#6b7280", marginBottom: 10 }}>
              Staff / approved account login
            </button>
            {showStaffLogin && (
              <div style={{ textAlign: "left", marginBottom: 10 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Username</div>
                  <input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="Username or email" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Password</div>
                  <input type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && signInWithPassword()} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                </div>
                {staffLoginError && <div style={{ fontSize: 12, color: "#991b1b", marginBottom: 8 }}>{staffLoginError}</div>}
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
                <button onClick={() => setRequestType("commandant")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: requestType === "commandant" ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: requestType === "commandant" ? "#E6F1FB" : "#fff", color: requestType === "commandant" ? "#185FA5" : "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: requestType === "commandant" ? 600 : 400 }}>
                  Commandant
                </button>
                <button onClick={() => setRequestType("cadet")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: requestType === "cadet" ? "1.5px solid #185FA5" : "0.5px solid #d1d5db", background: requestType === "cadet" ? "#E6F1FB" : "#fff", color: requestType === "cadet" ? "#185FA5" : "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: requestType === "cadet" ? 600 : 400 }}>
                  Supply cadet
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>First name *</div>
                    <input value={requestForm.first_name} onChange={e => setRequestForm(f => ({ ...f, first_name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Last name *</div>
                    <input value={requestForm.last_name} onChange={e => setRequestForm(f => ({ ...f, last_name: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{requestType === "cadet" ? "Cadet rank" : "Rank"}</div>
                    <input value={requestForm.rank} onChange={e => setRequestForm(f => ({ ...f, rank: e.target.value }))} placeholder={requestType === "cadet" ? "e.g. C/SGT" : "e.g. MAJ"} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Phone number</div>
                    <input value={requestForm.phone} onChange={e => setRequestForm(f => ({ ...f, phone: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{requestType === "cadet" ? "School email *" : "Email *"}</div>
                  <input value={requestForm.school_email} onChange={e => setRequestForm(f => ({ ...f, school_email: e.target.value }))} placeholder={requestType === "cadet" ? "your.name@school.edu" : "you@school.edu"} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                </div>
                {requestType === "commandant" && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>CACC email (if you have one)</div>
                    <input value={requestForm.cacc_email} onChange={e => setRequestForm(f => ({ ...f, cacc_email: e.target.value }))} placeholder="you@cacadets.org" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                )}
                {requestType === "cadet" && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Commandant email (for approval) *</div>
                    <input value={requestForm.commandant_email} onChange={e => setRequestForm(f => ({ ...f, commandant_email: e.target.value }))} placeholder="your.commandant@school.edu" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#fff" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
                  <select value={requestForm.brigade_id} onChange={e => setRequestForm(f => ({ ...f, brigade_id: e.target.value, battalion_id: "" }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                    <option value="">Select your brigade...</option>
                    {requestBrigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Battalion / School</div>
                  <select value={requestForm.battalion_id} onChange={e => setRequestForm(f => ({ ...f, battalion_id: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                    <option value="">Select your battalion...</option>
                    {(requestForm.brigade_id ? requestBattalions.filter(b => b.brigade_id === requestForm.brigade_id) : requestBattalions).map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
                  </select>
                </div>
                <button onClick={submitAccountRequest} disabled={requestSaving} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500, marginTop: 4 }}>
                  {requestSaving ? "Submitting..." : "Submit account request"}
                </button>
              </div>
            </div>
          )}

          {showRequestForm && requestSubmitted && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "0.5px solid #e5e7eb", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Request submitted!</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>State HQ has been notified. You will receive access once your account is approved.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f4", fontFamily: "sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%", margin: "0 16px", border: "0.5px solid #e5e7eb", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Your email is not authorized for this system.</div>
          <div style={{ fontSize: 13, color: "#111827", marginBottom: 24, padding: "12px 16px", background: "#FEF2F2", borderRadius: 8 }}>
            Signed in as: <strong>{session.user.email}</strong><br/>Only authorized accounts are permitted.
          </div>
          <button onClick={signOut} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Sign out</button>
        </div>
      </div>
    );
  }

  if (userRole.role === "pending") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f4", fontFamily: "sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, maxWidth: 400, width: "100%", margin: "0 16px", border: "0.5px solid #e5e7eb", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CACC <span style={{ color: "#185FA5" }}>Inventory</span></div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Welcome! Your account is pending approval.</div>
          <div style={{ fontSize: 13, color: "#111827", marginBottom: 24, padding: "12px 16px", background: "#EAF3DE", borderRadius: 8 }}>
            Signed in as: <strong>{session.user.email}</strong><br/><br/>
            State HQ has been notified and will assign your access level shortly.
          </div>
          <button onClick={signOut} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Sign out</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "state", label: "State dashboard" },
    { id: "brigade", label: "Brigade inventory" },
    { id: "battalion", label: "Battalion dashboard" },
    { id: "units", label: "Unit management" },
    ...(userRole.role === "state_admin" ? [{ id: "users", label: "User management" }] : []),
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f5f4" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600, fontSize: 16, padding: "14px 0", marginRight: 16, flexShrink: 0 }}>
          CACC <span style={{ color: "#185FA5" }}>Inventory</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }} className="desktop-tabs">
            {tabs.map(t => (
              <div key={t.id} onClick={() => setPage(t.id)} style={{ padding: "14px 12px", fontSize: 13, cursor: "pointer", borderBottom: page === t.id ? "2px solid #185FA5" : "2px solid transparent", color: page === t.id ? "#185FA5" : "#6b7280", fontWeight: page === t.id ? 500 : 400, whiteSpace: "nowrap" }}>
                {t.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="desktop-tabs" style={{ fontSize: 12, color: "#6b7280" }}>{userRole.full_name} · {userRole.role.replace(/_/g, " ")}</div>
          <button onClick={signOut} className="desktop-tabs" style={{ padding: "6px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 12, cursor: "pointer", color: "#111827" }}>Sign out</button>
          <button onClick={() => setMenuOpen(m => !m)} className="mobile-menu-btn" style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer", color: "#111827", flexShrink: 0 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <style>{`
        .desktop-tabs { display: flex; }
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .desktop-tabs { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>

      {menuOpen && (
        <div style={{ background: "#fff", borderBottom: "0.5px solid #e5e7eb", padding: "8px 0" }}>
          <div style={{ padding: "10px 20px", fontSize: 12, color: "#6b7280", borderBottom: "0.5px solid #f3f4f6" }}>{userRole.full_name} · {userRole.role.replace(/_/g, " ")}</div>
          {tabs.map(t => (
            <div key={t.id} onClick={() => { setPage(t.id); setMenuOpen(false); }} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", background: page === t.id ? "#E6F1FB" : "#fff", color: page === t.id ? "#185FA5" : "#111827", fontWeight: page === t.id ? 500 : 400, borderLeft: page === t.id ? "3px solid #185FA5" : "3px solid transparent" }}>
              {t.label}
            </div>
          ))}
          <div onClick={signOut} style={{ padding: "14px 20px", fontSize: 14, cursor: "pointer", color: "#991b1b" }}>Sign out</div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : (
          <>
            {page === "state" && <StateDashboard categories={categories} brigades={brigades} battalions={battalions} inventory={inventory} stateInventory={stateInventory} fetchAll={fetchAll} />}
            {page === "brigade" && <BrigadePage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} />}
            {page === "battalion" && <BattalionPage brigades={brigades} battalions={battalions} inventory={inventory} categories={categories} fetchAll={fetchAll} />}
            {page === "units" && <UnitsPage brigades={brigades} battalions={battalions} fetchAll={fetchAll} />}
            {page === "users" && userRole.role === "state_admin" && <UserManagement brigades={brigades} battalions={battalions} fetchAll={fetchAll} />}
          </>
        )}
      </div>
    </div>
  );
}

function UserManagement({ brigades, battalions, fetchAll }) {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

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
    setSaving(s => ({ ...s, [userId]: true }));
    await supabase.from("user_roles").update(updates).eq("id", userId);
    await fetchData();
    setSaving(s => ({ ...s, [userId]: false }));
  }

  async function approveRequest(req) {
    setSaving(s => ({ ...s, [req.id]: true }));
    const fullName = `${req.rank ? req.rank + " " : ""}${req.first_name} ${req.last_name}`;
    await supabase.from("user_roles").insert([{
      email: req.school_email,
      full_name: fullName,
      role: req.request_type === "cadet" ? "battalion_staff" : "battalion_staff",
      brigade_id: req.brigade_id || null,
      battalion_id: req.battalion_id || null,
      status: "active",
    }]);
    await supabase.from("account_requests").update({ status: "approved" }).eq("id", req.id);
    await sendEmail("zak.lara@cacadets.org", `Account approved — ${fullName}`, `<p>Account for <strong>${fullName}</strong> (${req.school_email}) has been approved.</p>`);
    await fetchData();
    setSaving(s => ({ ...s, [req.id]: false }));
  }

  async function denyRequest(reqId) {
    await supabase.from("account_requests").update({ status: "denied" }).eq("id", reqId);
    await fetchData();
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

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#111827" }}>User management</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Manage access for all CACC Inventory users.</div>

      {requests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0C447C", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "#E6F1FB", color: "#0C447C", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>{requests.length} new</span>
            Account requests
          </div>
          {requests.map(req => (
            <div key={req.id} style={{ background: "#E6F1FB", border: "0.5px solid #93c5fd", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{req.rank} {req.first_name} {req.last_name}</div>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: req.request_type === "cadet" ? "#fef3c7" : "#E6F1FB", color: req.request_type === "cadet" ? "#92400e" : "#0C447C" }}>{req.request_type || "commandant"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Email: {req.school_email}</div>
                {req.cacc_email && <div style={{ fontSize: 12, color: "#6b7280" }}>CACC email: {req.cacc_email}</div>}
                {req.commandant_email && <div style={{ fontSize: 12, color: "#6b7280" }}>Commandant: {req.commandant_email}</div>}
                {req.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>Phone: {req.phone}</div>}
                <div style={{ fontSize: 12, color: "#6b7280" }}>Brigade: {req.brigades?.name || "Not specified"}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Battalion: {req.battalions ? `${req.battalions.unit_number} — ${req.battalions.school_name}` : "Not specified"}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Requested: {new Date(req.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveRequest(req)} disabled={saving[req.id]} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                  {saving[req.id] ? "..." : "Approve"}
                </button>
                <button onClick={() => denyRequest(req.id)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "0.5px solid #fca5a5", background: "#fff", color: "#991b1b", fontSize: 13, cursor: "pointer" }}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading users...</div>
      ) : (
        roleGroups.map(group => {
          const groupUsers = users.filter(u => u.role === group.role);
          if (groupUsers.length === 0) return null;
          return (
            <div key={group.role} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: group.color, textTransform: "uppercase", textDecoration: "underline", letterSpacing: "0.04em" }}>{group.label}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: group.bg, color: group.color }}>{groupUsers.length}</span>
              </div>
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "8px 14px", background: "#f9fafb", borderBottom: "0.5px solid #e5e7eb", gap: 8 }}>
                  {["Name", "Role", "Brigade", "Battalion", "Status"].map(h => (
                    <div key={h} style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{h}</div>
                  ))}
                </div>
                {groupUsers.map(user => (
                  <div key={user.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 120px", padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8 }}>
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
                      {battalions.map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 4 }}>
                      {statusOptions.map(s => (
                        <button key={s.value} onClick={() => updateUser(user.id, { status: s.value })} style={{ flex: 1, padding: "4px 2px", borderRadius: 6, border: user.status === s.value || (!user.status && s.value === "active") ? `1.5px solid ${s.color}` : "0.5px solid #e5e7eb", background: user.status === s.value || (!user.status && s.value === "active") ? s.bg : "#fff", color: user.status === s.value || (!user.status && s.value === "active") ? s.color : "#9ca3af", fontSize: 9, cursor: "pointer", fontWeight: 500 }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function sumInv(inventory, battalionIds, catalogItemId) {
  const rows = inventory.filter(i => battalionIds.includes(i.battalion_id) && i.catalog_item_id === catalogItemId);
  return {
    qty_serviceable: rows.reduce((s, r) => s + (r.qty_serviceable || 0), 0),
    qty_unserviceable: rows.reduce((s, r) => s + (r.qty_unserviceable || 0), 0),
    qty_issued: rows.reduce((s, r) => s + (r.qty_issued || 0), 0),
  };
}

function StateDashboard({ categories, brigades, battalions, inventory, stateInventory, fetchAll }) {
  const [open, setOpen] = useState({});
  const [warehouseEdits, setWarehouseEdits] = useState({});
  const [thresholdEdits, setThresholdEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [togglingStock, setTogglingStock] = useState(null);
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const activeBats = battalions.filter(b => b.status === "active");
  const totalCadets = battalions.reduce((s, b) => s + (b.cadet_count || 0), 0);
  const allBatIds = battalions.map(b => b.id);
  const allItems = Object.values(categories).flat();

  function getStateInv(itemId) { return stateInventory.find(s => s.catalog_item_id === itemId) || { qty_warehouse: 0, shortage_threshold: 0 }; }
  function getWarehouse(itemId) { if (warehouseEdits[itemId] !== undefined) return warehouseEdits[itemId]; return getStateInv(itemId).qty_warehouse || 0; }
  function getThreshold(itemId) { if (thresholdEdits[itemId] !== undefined) return thresholdEdits[itemId]; return getStateInv(itemId).shortage_threshold ?? 0; }

  async function toggleStock(item) {
    setTogglingStock(item.id);
    await supabase.from("catalog_items").update({ in_stock: !item.in_stock }).eq("id", item.id);
    await fetchAll();
    setTogglingStock(null);
  }

  async function saveStateInventory() {
    setSaving(true);
    for (const itemId of Object.keys({ ...warehouseEdits, ...thresholdEdits })) {
      const existing = stateInventory.find(s => s.catalog_item_id === itemId);
      const data = { catalog_item_id: itemId, qty_warehouse: getWarehouse(itemId), shortage_threshold: getThreshold(itemId), updated_at: new Date().toISOString() };
      if (existing) await supabase.from("state_inventory").update(data).eq("id", existing.id);
      else await supabase.from("state_inventory").insert([data]);
    }
    await fetchAll();
    setWarehouseEdits({});
    setThresholdEdits({});
    setSaving(false);
  }

  const hasEdits = Object.keys({ ...warehouseEdits, ...thresholdEdits }).length > 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[["Active battalions", activeBats.length], ["Total cadets", totalCadets.toLocaleString()], ["Catalog items", allItems.length], ["Out of stock", allItems.filter(i => !i.in_stock).length]].map(([label, value]) => (
          <div key={label} style={{ background: "#f3f4f6", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>
      {hasEdits && (
        <button onClick={saveStateInventory} disabled={saving} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", marginBottom: 16, fontWeight: 500 }}>
          {saving ? "Saving..." : "Save warehouse inventory"}
        </button>
      )}
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
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 90px 100px 80px 80px", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Item / Size</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>Stock</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Alert</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Warehouse</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Unserviceable</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>Issued</div>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "right" }}>In stock</div>
                    </div>
                    {items.map(item => {
                      const batInv = sumInv(inventory, allBatIds, item.id);
                      const warehouse = getWarehouse(item.id);
                      const threshold = getThreshold(item.id);
                      const inStock = Math.max(0, warehouse - (batInv.qty_issued || 0));
                      const isAlert = threshold > 0 && inStock < threshold;
                      return (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 60px 80px 90px 100px 80px 80px", padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", alignItems: "center", gap: 8, background: isAlert ? "#FEF2F2" : "#fff" }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#111827", fontWeight: isAlert ? 600 : 400 }}>{item.item_name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <button onClick={() => toggleStock(item)} disabled={togglingStock === item.id} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: item.in_stock ? "#dcfce7" : "#fee2e2", color: item.in_stock ? "#166534" : "#991b1b", fontSize: 10, cursor: "pointer", fontWeight: 500, width: "100%" }}>
                              {togglingStock === item.id ? "..." : item.in_stock ? "In" : "Out"}
                            </button>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <input type="number" min="0" value={threshold} onChange={e => setThresholdEdits(t => ({ ...t, [item.id]: parseInt(e.target.value) || 0 }))} style={{ width: 56, padding: "4px 6px", borderRadius: 6, border: isAlert ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <input type="number" min="0" value={warehouse} onChange={e => setWarehouseEdits(w => ({ ...w, [item.id]: parseInt(e.target.value) || 0 }))} style={{ width: 64, padding: "4px 6px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 12, color: "#111827", textAlign: "center", background: "#fff" }} />
                          </div>
                          <div style={{ fontSize: 13, color: batInv.qty_unserviceable > 0 ? "#991b1b" : "#111827", textAlign: "right" }}>{batInv.qty_unserviceable}</div>
                          <div style={{ fontSize: 13, color: "#111827", textAlign: "right" }}>{batInv.qty_issued}</div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280" }}>{inStock}</span>
                          </div>
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

  function getBatAlert(bat) {
    const batInv = inventory.filter(i => i.battalion_id === bat.id);
    return batInv.some(i => { const t = i.shortage_threshold || 0; if (!t) return false; return Math.max(0, (i.qty_serviceable || 0) - (i.qty_issued || 0)) < t; });
  }

  return (
    <div>
      <select onChange={e => { setSelectedBrigade(e.target.value); setOpen({}); }} value={selectedBrigade} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827", marginBottom: 16 }}>
        <option value="">Select a brigade...</option>
        {brigades.map(b => <option key={b.id} value={b.id}>{b.name} — {b.region}</option>)}
      </select>
      {brig && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["Battalions", bats.length], ["Active", bats.filter(b => b.status === "active").length], ["Cadets", totalCadets]].map(([label, value]) => (
              <div key={label} style={{ background: "#f3f4f6", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 500, fontSize: 13 }}>Battalions in {brig.name}</div>
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
          <div style={{ marginBottom: 10, fontWeight: 500, fontSize: 13, color: "#111827" }}>Aggregate inventory — {brig.name}</div>
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
                    {open[cat] && items.map(item => {
                      const inv = sumInv(inventory, batIds, item.id);
                      const inStock = Math.max(0, (inv.qty_serviceable || 0) - (inv.qty_issued || 0));
                      return (
                        <div key={item.id} style={{ padding: "10px 14px", borderTop: "0.5px solid #f3f4f6" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.item_name}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
                            </div>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: inStock > 0 ? "#dcfce7" : "#f3f4f6", color: inStock > 0 ? "#166534" : "#6b7280", flexShrink: 0, marginLeft: 8 }}>{inStock} in stock</span>
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                            <span style={{ color: "#6b7280" }}>Svc: <strong style={{ color: "#111827" }}>{inv.qty_serviceable}</strong></span>
                            <span style={{ color: "#6b7280" }}>Unsvc: <strong style={{ color: inv.qty_unserviceable > 0 ? "#991b1b" : "#111827" }}>{inv.qty_unserviceable}</strong></span>
                            <span style={{ color: "#6b7280" }}>Issued: <strong style={{ color: "#111827" }}>{inv.qty_issued}</strong></span>
                          </div>
                        </div>
                      );
                    })}
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

function BattalionPage({ brigades, battalions, inventory, categories, fetchAll }) {
  const [selectedBat, setSelectedBat] = useState("");
  const [open, setOpen] = useState({});
  const [edits, setEdits] = useState({});
  const [thresholdEdits, setThresholdEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSupply, setShowSupply] = useState(false);
  const [supplyQtys, setSupplyQtys] = useState({});
  const [supplyOpen, setSupplyOpen] = useState({});
  const toggleCat = cat => setOpen(o => ({ ...o, [cat]: !o[cat] }));
  const toggleSupplyCat = cat => setSupplyOpen(o => ({ ...o, [cat]: !o[cat] }));
  const bat = battalions.find(b => b.id === selectedBat);
  const brig = bat ? brigades.find(b => b.id === bat.brigade_id) : null;

  function getInvRow(itemId) { return inventory.find(i => i.battalion_id === selectedBat && i.catalog_item_id === itemId); }
  function getEdit(itemId, field) { const inv = getInvRow(itemId); if (edits[itemId]?.[field] !== undefined) return edits[itemId][field]; return inv ? (inv[field] || 0) : 0; }
  function getThreshold(itemId) { if (thresholdEdits[itemId] !== undefined) return thresholdEdits[itemId]; const inv = getInvRow(itemId); return inv ? (inv.shortage_threshold || 0) : 0; }
  function setEdit(itemId, field, value) { setEdits(e => ({ ...e, [itemId]: { ...e[itemId], [field]: parseInt(value) || 0 } })); }

  async function saveAll() {
    setSaving(true);
    const allItems = Object.values(categories).flat();
    for (const item of allItems) {
      if (!edits[item.id] && !thresholdEdits[item.id]) continue;
      const existing = getInvRow(item.id);
      const data = { battalion_id: selectedBat, catalog_item_id: item.id, qty_serviceable: getEdit(item.id, "qty_serviceable"), qty_unserviceable: getEdit(item.id, "qty_unserviceable"), qty_issued: getEdit(item.id, "qty_issued"), shortage_threshold: getThreshold(item.id), updated_at: new Date().toISOString() };
      if (existing) await supabase.from("inventory").update(data).eq("id", existing.id);
      else await supabase.from("inventory").insert([data]);
    }
    await fetchAll();
    setEdits({});
    setThresholdEdits({});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function exportSupplyPDF() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2,"0")}/${(date.getMonth()+1).toString().padStart(2,"0")}/${date.getFullYear()}`;
    let html = `<html><head><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}h1{font-size:18px;margin-bottom:4px}h2{font-size:14px;font-weight:normal;color:#555;margin-bottom:20px}h3{font-size:13px;text-transform:uppercase;text-decoration:underline;margin:20px 0 8px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{text-align:left;padding:6px 10px;background:#f3f4f6;font-size:11px;border-bottom:1px solid #e5e7eb}td{padding:6px 10px;border-bottom:0.5px solid #f3f4f6}.highlighted{background:#FEF9C3;font-weight:bold}.footer{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#555}</style></head><body><h1>CACC Supply Requisition — ${bat.unit_number} ${bat.school_name}</h1><h2>Date: ${dateStr} | Brigade: ${brig?.name} | Commandant: ${bat.commandant_name || "N/A"}</h2>`;
    SECTIONS.forEach(section => {
      html += `<h3>${section.header}</h3><table><thead><tr><th>Item</th><th>Size</th><th>Qty requested</th></tr></thead><tbody>`;
      section.groups.forEach(g => { (categories[g] || []).forEach(item => { const qty = supplyQtys[item.id] || 0; html += `<tr${qty > 0 ? ' class="highlighted"' : ''}><td>${item.item_name}</td><td>${item.size_label}</td><td>${qty > 0 ? qty : ""}</td></tr>`; }); });
      html += `</tbody></table>`;
    });
    html += `<div class="footer"><strong>Unit:</strong> ${bat.unit_number} | <strong>School:</strong> ${bat.school_name} | <strong>Email:</strong> ${bat.commandant_email || "N/A"} | <strong>Phone:</strong> ${bat.phone || "N/A"}</div></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  }

  function exportSupplyExcel() {
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2,"0")}-${(date.getMonth()+1).toString().padStart(2,"0")}-${date.getFullYear()}`;
    let csv = `CACC Supply Requisition - ${bat.unit_number} - ${bat.school_name}\nDate: ${dateStr}\nBrigade: ${brig?.name}\nCommandant: ${bat.commandant_name || ""}\nEmail: ${bat.commandant_email || ""}\nPhone: ${bat.phone || ""}\n\nSection,Item,Size,Qty requested\n`;
    SECTIONS.forEach(section => { section.groups.forEach(g => { (categories[g] || []).forEach(item => { const qty = supplyQtys[item.id] || 0; if (qty > 0) csv += `${section.header},"${item.item_name}","${item.size_label}",${qty}\n`; }); }); });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Supply-Request-${bat.unit_number}-${dateStr}.csv`; a.click();
  }

  const hasEdits = Object.keys({ ...edits, ...thresholdEdits }).length > 0;

  return (
    <div>
      <select onChange={e => { setSelectedBat(e.target.value); setOpen({}); setEdits({}); setThresholdEdits({}); setShowSupply(false); setSupplyQtys({}); }} value={selectedBat} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827", marginBottom: 12 }}>
        <option value="">Select a battalion...</option>
        {battalions.map(b => <option key={b.id} value={b.id}>{b.unit_number} — {b.school_name}</option>)}
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
          <button onClick={saveAll} disabled={saving || !hasEdits} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: hasEdits ? "#185FA5" : "#d1d5db", color: "#fff", fontSize: 14, cursor: hasEdits ? "pointer" : "default", marginBottom: 16, fontWeight: 500 }}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save inventory"}
          </button>
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#E6F1FB", borderRadius: 8, fontSize: 13, color: "#0C447C" }}>
            Tap any category to expand it, update the numbers, then tap Save inventory.
          </div>
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
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 14px", borderBottom: "0.5px solid #e5e7eb", background: "#f9fafb", gap: 8 }}>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Item / Size</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>Alert<div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 400 }}>(25% rec.)</div></div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>Serviceable</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>Unserviceable</div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, textAlign: "center" }}>Issued</div>
                        </div>
                        {items.map(item => {
                          const svc = getEdit(item.id, "qty_serviceable");
                          const unsvc = getEdit(item.id, "qty_unserviceable");
                          const issued = getEdit(item.id, "qty_issued");
                          const threshold = getThreshold(item.id);
                          const inStock = Math.max(0, svc - issued);
                          const isAlert = threshold > 0 && inStock < threshold;
                          return (
                            <div key={item.id} style={{ padding: "10px 14px", borderBottom: "0.5px solid #f3f4f6", background: isAlert ? "#FEF2F2" : "#fff" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: isAlert ? 600 : 500, color: "#111827" }}>{item.item_name}</div>
                                  <div style={{ fontSize: 11, color: "#6b7280" }}>{item.size_label}</div>
                                </div>
                                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: isAlert ? "#fee2e2" : inStock > 0 ? "#dcfce7" : "#f3f4f6", color: isAlert ? "#991b1b" : inStock > 0 ? "#166534" : "#6b7280", flexShrink: 0 }}>{inStock} in stock</span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                                {[["Alert", "shortage_threshold", threshold, true], ["Serviceable", "qty_serviceable", svc, false], ["Unserviceable", "qty_unserviceable", unsvc, false], ["Issued", "qty_issued", issued, false]].map(([label, field, val, isThresh]) => (
                                  <div key={field} style={{ textAlign: "center" }}>
                                    <input type="number" min="0" value={val} onChange={e => isThresh ? setThresholdEdits(t => ({ ...t, [item.id]: parseInt(e.target.value) || 0 })) : setEdit(item.id, field, e.target.value)} style={{ width: "100%", padding: "8px 4px", borderRadius: 6, border: isAlert && isThresh ? "1.5px solid #fca5a5" : "0.5px solid #d1d5db", fontSize: 13, color: "#111827", textAlign: "center", background: "#ffffff" }} />
                                  </div>
                                ))}
                              </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8, marginBottom: 24 }}>
            <button onClick={() => setShowSupply(s => !s)} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "0.5px solid #185FA5", background: showSupply ? "#185FA5" : "#fff", color: showSupply ? "#fff" : "#185FA5", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
              {showSupply ? "Hide supply request" : "Supply request form"}
            </button>
            <button onClick={() => window.open(`mailto:logistics@cacadets.org?subject=Supply Request — ${bat.unit_number} ${bat.school_name}&body=Please find attached our supply request.`)} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "0.5px solid #d1d5db", background: "#fff", color: "#111827", fontSize: 14, cursor: "pointer" }}>
              Email HQ logistics
            </button>
          </div>
          {showSupply && (
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#111827" }}>Supply requisition form</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Enter quantities for items you are requesting. Requested items will be highlighted.</div>
              {SECTIONS.map(section => (
                <div key={section.header} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginBottom: 10, color: "#111827", textTransform: "uppercase" }}>{section.header}</div>
                  {section.groups.map(cat => {
                    const items = (categories[cat] || []).filter(i => i.in_stock);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat} style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                        <div onClick={() => toggleSupplyCat(cat)} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: "#111827" }}>{cat}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{supplyOpen[cat] ? "▲" : "▼"}</span>
                        </div>
                        {supplyOpen[cat] && items.map(item => {
                          const qty = supplyQtys[item.id] || 0;
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
                    <div key={label}>
                      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "14px 0", borderTop: "0.5px solid #e5e7eb" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>IF YOUR REQUEST IS READY TO SUBMIT, EXPORT BELOW</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={exportSupplyExcel} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #27500A", background: "#EAF3DE", color: "#27500A", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Export to Excel (CSV)</button>
                  <button onClick={exportSupplyPDF} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "0.5px solid #0C447C", background: "#E6F1FB", color: "#0C447C", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Export to PDF</button>
                </div>
              </div>
            </div>
          )}
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
        <div style={{ fontSize: 13, color: "#6b7280" }}>{battalions.length} total units</div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 16px", borderRadius: 8, border: "0.5px solid #185FA5", background: "#185FA5", color: "#fff", fontSize: 13, cursor: "pointer" }}>+ Add new unit</button>
      </div>
      {showForm && (
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 14, color: "#111827" }}>Add new unit</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["unit_number", "Unit number (e.g. 1-105)"], ["school_name", "School name"], ["school_address", "School address"], ["cadet_count", "Number of cadets"], ["commandant_name", "Commandant name and rank"], ["commandant_email", "Commandant email"], ["phone", "Phone number"]].map(([field, label]) => (
              <div key={field}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, color: "#111827", background: "#ffffff" }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Brigade</div>
              <select value={form.brigade_id} onChange={e => setForm(f => ({ ...f, brigade_id: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "0.5px solid #d1d5db", fontSize: 14, background: "#fff", color: "#111827" }}>
                <option value="">Select brigade...</option>
                {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "0.5px solid #d1d5db", background: "#fff", fontSize: 14, cursor: "pointer", color: "#111827" }}>Cancel</button>
            <button onClick={saveUnit} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: 6, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer" }}>
              {saving ? "Saving..." : "Save unit"}
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        {battalions.map(bat => {
          const brig = brigades.find(b => b.id === bat.brigade_id);
          return (
            <div key={bat.id} style={{ padding: "12px 14px", borderBottom: "0.5px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{bat.unit_number}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{bat.school_name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{brig?.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#111827" }}>{bat.cadet_count} cadets</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: bat.status === "active" ? "#dcfce7" : "#f3f4f6", color: bat.status === "active" ? "#166534" : "#6b7280" }}>{bat.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}