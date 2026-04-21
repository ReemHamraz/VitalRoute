import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle, Zap, MapPin, Siren,
  Loader2, Navigation, X, Info, Radio, Snowflake, ShieldCheck, Clock
} from "lucide-react";

// ─────────────────────────────────────────────
// DESIGN: Cold War Teletype Command Terminal
// Palette: warm charcoal · phosphor vermilion · verdigris
// ─────────────────────────────────────────────

const C = {
  bg:       "#0F0D0A",
  panel:    "#131109",
  rule:     "rgba(237,228,210,0.08)",
  ruleHard: "rgba(237,228,210,0.14)",
  text:     "#EDE8D2",
  mid:      "rgba(237,232,210,0.50)",
  dim:      "rgba(237,232,210,0.26)",
  faint:    "rgba(237,232,210,0.09)",
  red:      "#E03820",
  redGlow:  "rgba(224,56,32,0.22)",
  redDim:   "rgba(224,56,32,0.12)",
  redBd:    "rgba(224,56,32,0.36)",
  teal:     "#3D8A78",
  tealBd:   "rgba(61,138,120,0.42)",
  tealDim:  "rgba(61,138,120,0.14)",
  orange:   "#C05C18",
  orangeDim:"rgba(192,92,24,0.14)",
  orangeBd: "rgba(192,92,24,0.38)",
  olive:    "#78803A",
  oliveDim: "rgba(120,128,58,0.12)",
  oliveBd:  "rgba(120,128,58,0.36)",
};

const LKO_BASE = { lat: 26.8638, lng: 80.9228 };
const mono  = "'Courier Prime', 'Courier New', monospace";
const bebas = "'Bebas Neue', Impact, sans-serif";

function Ping({ color = C.red, sz = 5 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: sz + 8, height: sz + 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.22, animation: "vr-ping 1.9s ease-out infinite" }} />
      <span style={{ width: sz, height: sz, borderRadius: "50%", background: color }} />
    </span>
  );
}

// ── TACTICAL RADAR (No-Cost Maps Alternative) ────────────────────────────────

function Radar({ activeMatch }) {
  const R = 148; 
  const D = R * 2;
  
  let blipX = R;
  let blipY = R;
  
  if (activeMatch) {
    // Map GPS diffs to radar pixels
    const latDiff = (activeMatch.lat - LKO_BASE.lat) * 2000;
    const lngDiff = (activeMatch.lng - LKO_BASE.lng) * 2000;
    blipX = R + lngDiff;
    blipY = R - latDiff; 
  }

  return (
    <div style={{ position: "relative", width: D, height: D, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", border: `1px solid ${C.ruleHard}` }}>
        <svg width={D} height={D} style={{ position: "absolute", inset: 0 }}>
          {[0.28, 0.55, 0.78, 1].map((r, i) => (
            <circle key={i} cx={R} cy={R} r={R * r} fill="none" stroke={i === 3 ? C.ruleHard : C.rule} strokeWidth={i === 3 ? 1 : 0.5} />
          ))}
          <line x1={R} y1={0} x2={R} y2={D} stroke={C.rule} strokeWidth="0.5" />
          <line x1={0} y1={R} x2={D} y2={R} stroke={C.rule} strokeWidth="0.5" />
        </svg>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(61,138,120,0.1) 52deg, transparent 96deg)`,
          animation: "radar-sweep 5s linear infinite",
        }} />
      </div>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 5, height: 5, borderRadius: "50%", background: C.teal, transform: "translate(-50%,-50%)", boxShadow: `0 0 8px ${C.teal}` }} />
      {activeMatch && (
        <div style={{ position: "absolute", left: blipX, top: blipY, transform: "translate(-50%, -50%)" }}>
          <Ping color={C.teal} sz={6} />
        </div>
      )}
    </div>
  );
}

// ── MAIN APPLICATION ──────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState("");
  const [hospitalLoc, setHospitalLoc] = useState(LKO_BASE);
  const [coldChain, setColdChain] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [match, setMatch] = useState(null);
  const [eta, setEta] = useState("");
  const [error, setError] = useState(null);

  async function handleFindSupplier() {
    setIsLoading(true); setError(null); setMatch(null);
    try {
      const res = await fetch("http://localhost:8080/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          hospitalLocation: hospitalLoc,
          requiresColdChain: coldChain
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMatch(data.match);
        setEta(data.etaText);
      } else {
        setError(data.error || "No matching medical assets found.");
      }
    } catch (e) {
      setError("SYS_ERR: Backend connection refused (Check Port 8080).");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", height: "100vh", display: "grid", gridTemplateRows: "46px 1fr", gridTemplateColumns: "340px 1fr", background: C.bg, color: C.text, overflow: "hidden" }}>
      
      {/* HEADER */}
      <header style={{ gridColumn: "1 / -1", background: C.panel, borderBottom: `1px solid ${C.ruleHard}`, display: "flex", alignItems: "center", padding: "0 18px" }}>
        <Siren size={18} color={C.red} style={{ marginRight: 10 }} />
        <span style={{ fontFamily: bebas, fontSize: 22, letterSpacing: "0.12em" }}>VITALROUTE // CRISIS CMD</span>
      </header>

      {/* LEFT INPUT PANEL */}
      <aside style={{ background: C.panel, borderRight: `1px solid ${C.ruleHard}`, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ fontFamily: mono, fontSize: 9, color: C.red, letterSpacing: "0.12em" }}>DISTRESS SIGNAL (AI PARSE)</span>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type emergency details here..."
            className="vr-ta"
            style={{ width: "100%", height: 100, background: C.bg, border: `1px solid ${C.rule}`, color: C.text, padding: 10, fontFamily: mono, fontSize: 12, marginTop: 8, resize: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.dim }}>LATITUDE</span>
            <input type="number" value={hospitalLoc.lat} onChange={e => setHospitalLoc({...hospitalLoc, lat: parseFloat(e.target.value)})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.rule}`, color: C.text, padding: 8, fontFamily: mono, fontSize: 11 }} />
          </div>
          <div>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.dim }}>LONGITUDE</span>
            <input type="number" value={hospitalLoc.lng} onChange={e => setHospitalLoc({...hospitalLoc, lng: parseFloat(e.target.value)})} style={{ width: "100%", background: C.bg, border: `1px solid ${C.rule}`, color: C.text, padding: 8, fontFamily: mono, fontSize: 11 }} />
          </div>
        </div>

        <button 
          onClick={() => setColdChain(!coldChain)}
          style={{ width: "100%", background: coldChain ? C.tealDim : "transparent", border: `1px solid ${coldChain ? C.tealBd : C.rule}`, padding: 12, color: coldChain ? C.teal : C.dim, fontFamily: mono, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Snowflake size={14} /> {coldChain ? "COLD CHAIN REQUIRED" : "STANDARD TRANSIT"}
        </button>

        <button 
          onClick={handleFindSupplier}
          disabled={isLoading}
          style={{ width: "100%", background: C.redDim, border: `1px solid ${C.redBd}`, color: C.red, padding: 14, fontFamily: mono, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
          INITIATE MATCH
        </button>

        {error && <div style={{ color: C.red, fontFamily: mono, fontSize: 10, border: `1px solid ${C.redBd}`, padding: 10, background: C.redDim }}>{error}</div>}
      </aside>

      {/* MAIN RADAR VIEW */}
      <main style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="vr-scan-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        <Radar activeMatch={match} />
        
        {/* MATCH RESULTS BLOCK */}
        <div style={{ position: "absolute", bottom: 0, width: "100%", background: C.panel, borderTop: `1px solid ${C.ruleHard}`, padding: 20, height: 160 }}>
          {match ? (
            <div style={{ animation: "vr-reveal 0.3s ease both" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.teal, border: `1px solid ${C.tealBd}`, padding: "2px 6px" }}>ATOMIC LOCK ACTIVE</span>
                    {match.hasRefrigeration && <span style={{ fontFamily: mono, fontSize: 9, color: C.teal, border: `1px solid ${C.tealBd}`, padding: "2px 6px" }}>COLD CHAIN VERIFIED</span>}
                  </div>
                  <h2 style={{ fontFamily: bebas, fontSize: 32, color: C.text }}>{match.name}</h2>
                  <p style={{ fontFamily: mono, fontSize: 11, color: C.mid }}>TYPE: {match.type.toUpperCase()} // STATUS: {match.status.toUpperCase()}</p>
                </div>
                <div style={{ textAlign: "right", background: C.tealDim, padding: "10px 20px", border: `1px solid ${C.tealBd}` }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: C.teal }}>TRAFFIC-AWARE ETA</span>
                  <div style={{ fontFamily: bebas, fontSize: 32, color: C.teal }}>{eta}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
              <Radio size={20} />
              <span style={{ fontFamily: mono, fontSize: 12, marginLeft: 10 }}>AWAITING DISTRESS SIGNAL...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}