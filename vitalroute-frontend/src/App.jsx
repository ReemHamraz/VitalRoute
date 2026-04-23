import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle, Zap, Droplet, MapPin, Siren,
  Loader2, TrendingUp, Navigation, ChevronRight,
  X, Info, Activity, Package, Radio, Snowflake, Mic 
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
  slate:    "#487080",
  slateDim: "rgba(72,112,128,0.12)",
  slateBd:  "rgba(72,112,128,0.36)",
};

const URGENCY = {
  CRITICAL: { color: C.red,    dim: C.redDim,    bd: C.redBd,    label: "CRITICAL" },
  HIGH:     { color: C.orange, dim: C.orangeDim, bd: C.orangeBd, label: "HIGH"     },
  MODERATE: { color: C.olive,  dim: C.oliveDim,  bd: C.oliveBd,  label: "MODERATE" },
  LOW:      { color: C.slate,  dim: C.slateDim,  bd: C.slateBd,  label: "LOW"      },
};

const SEED = [
  { id: 1, ts: "08:41", loc: "Memorial Hospital, Bay 4", urgency: "HIGH",
    items: [{ n: "O-negative blood", q: 4, u: "units" }, { n: "Plasma", q: 2, u: "bags" }],
    flags: ["Trauma", "Surgical standby"], title: "Post-op Haemorrhage", coords: { x: 58, y: 37 } },
  { id: 2, ts: "08:39", loc: "I-95 Interchange, Mile 142", urgency: "CRITICAL",
    items: [{ n: "O-negative blood", q: 10, u: "units" }, { n: "Burn dressings", q: 20, u: "kits" }, { n: "Morphine", q: 6, u: "vials" }],
    flags: ["Mass casualty", "Pileup", "Fire hazard"], title: "Multi-Vehicle Collision", coords: { x: 34, y: 62 } },
  { id: 3, ts: "08:35", loc: "St. Raphael Pediatric Ward", urgency: "MODERATE",
    items: [{ n: "AB-positive blood", q: 2, u: "units" }, { n: "Epinephrine", q: 4, u: "doses" }],
    flags: ["Pediatric", "Allergic reaction"], title: "Anaphylaxis — Age 7", coords: { x: 65, y: 26 } },
  { id: 4, ts: "08:28", loc: "Downtown Fire Station 7", urgency: "LOW",
    items: [{ n: "Saline IV", q: 6, u: "bags" }],
    flags: ["Routine"], title: "Station Resupply", coords: { x: 50, y: 74 } },
];

const R = 148; // radar radius px
const D = R * 2;

function blipXY(coords) {
  return {
    x: ((coords.x - 50) / 50) * R * 0.80,
    y: ((coords.y - 50) / 50) * R * 0.80,
  };
}

// ── ATOMS ─────────────────────────────────────────────────────────────────────

const mono  = "'Courier Prime', 'Courier New', monospace";
const bebas = "'Bebas Neue', Impact, sans-serif";

function Badge({ level }) {
  const u = URGENCY[level] || URGENCY.LOW;
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, letterSpacing: "0.18em", padding: "2px 6px",
      background: u.dim, border: `1px solid ${u.bd}`, color: u.color,
    }}>{u.label}</span>
  );
}

function Ping({ color = C.red, sz = 5 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: sz + 8, height: sz + 8, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.22, animation: "vr-ping 1.9s ease-out infinite" }} />
      <span style={{ width: sz, height: sz, borderRadius: "50%", background: color }} />
    </span>
  );
}

// ── RADAR ─────────────────────────────────────────────────────────────────────

function Radar({ entries, activeId, onSelect }) {
  return (
    <div style={{ position: "relative", width: D, height: D, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", border: `1px solid ${C.ruleHard}` }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(224,56,32,0.04) 0%, transparent 70%)" }} />
        <svg width={D} height={D} style={{ position: "absolute", inset: 0 }}>
          {[0.28, 0.55, 0.78, 1].map((r, i) => (
            <circle key={i} cx={R} cy={R} r={R * r} fill="none" stroke={i === 3 ? C.ruleHard : C.rule} strokeWidth={i === 3 ? 1 : 0.5} />
          ))}
          <line x1={R} y1={0} x2={R} y2={D} stroke={C.rule} strokeWidth="0.5" />
          <line x1={0} y1={R} x2={D} y2={R} stroke={C.rule} strokeWidth="0.5" />
          <line x1={20} y1={20} x2={D - 20} y2={D - 20} stroke={C.faint} strokeWidth="0.3" strokeDasharray="2 4" />
          <line x1={D - 20} y1={20} x2={20} y2={D - 20} stroke={C.faint} strokeWidth="0.3" strokeDasharray="2 4" />
          {["25", "50", "75"].map((l, i) => (
            <text key={l} x={R + 4} y={R - R * [0.28, 0.55, 0.78][i] - 2} fill={C.dim} fontSize="7" fontFamily={mono} letterSpacing="0.06em">{l}KM</text>
          ))}
          {[["N", R - 4, 12], ["S", R - 4, D - 4], ["W", 4, R + 5], ["E", D - 14, R + 5]].map(([l, x, y]) => (
            <text key={l} x={x} y={y} fill={C.dim} fontSize="8" fontFamily={mono} letterSpacing="0.1em">{l}</text>
          ))}
        </svg>

        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(224,56,32,0.0) 0deg, rgba(224,56,32,0.18) 52deg, rgba(224,56,32,0.05) 80deg, transparent 96deg)`,
          animation: "radar-sweep 5s linear infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)" }} />
      </div>

      <div style={{ position: "absolute", left: "50%", top: "50%", width: 5, height: 5, borderRadius: "50%", background: C.red, transform: "translate(-50%,-50%)", boxShadow: `0 0 8px ${C.red}`, zIndex: 3 }} />

      {entries.map(e => {
        const u   = URGENCY[e.urgency] || URGENCY.LOW;
        const pos = blipXY(e.coords);
        const isA = e.id === activeId;
        return (
          <div key={e.id} onClick={() => onSelect(e.id)} style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            cursor: "pointer", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            {isA && <span style={{ position: "absolute", inset: -5, borderRadius: "50%", border: `1px solid ${u.color}`, opacity: 0.5, animation: "vr-ring 1.8s ease-out infinite" }} />}
            <div style={{
              width: isA ? 11 : 7, height: isA ? 11 : 7, borderRadius: "50%",
              background: u.color, opacity: isA ? 1 : 0.65,
              boxShadow: isA ? `0 0 14px ${u.color}, 0 0 5px ${u.color}` : "none",
              transition: "all 0.25s",
            }} />
            {isA && (
              <div style={{
                position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
                fontFamily: mono, fontSize: 8, color: u.color, letterSpacing: "0.12em",
                whiteSpace: "nowrap", background: C.bg, padding: "1px 4px",
                border: `1px solid ${u.bd}`,
              }}>
                {e.title.toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
      <span style={{ position: "absolute", bottom: 6, right: 10, fontFamily: mono, fontSize: 7, color: C.dim, letterSpacing: "0.1em" }}>26°51′N  80°55′E</span>
    </div>
  );
}

// ── INCIDENT DETAIL STRIP ─────────────────────────────────────────────────────


function DetailStrip({ entry, onDispatch }) {
  // Smart Urgency Fallback (Prioritizes backend emergencyDetails)
  const urgencyKey = entry.emergencyDetails?.urgency || entry.urgency;
  const u = URGENCY[urgencyKey] || URGENCY.LOW;
  
  const [dispatchStatus, setDispatchStatus] = useState("pending");

  // Reset status when a new emergency is selected
  useEffect(() => {
    setDispatchStatus("pending");
  }, [entry.id]);

  // Smart Items Array (Prioritizes backend emergencyDetails)
  const itemsToRender = entry.emergencyDetails?.items || entry.items;

  return (
    <div style={{ width: "100%", borderTop: `1px solid ${u.bd}`, background: u.dim, display: "flex", gap: 0, animation: "vr-reveal 0.3s ease both" }}>
      
      {/* 1. Dynamic Identity Block */}
      <div style={{ padding: "12px 16px", borderRight: `1px solid ${C.rule}`, minWidth: 190, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <Ping color={u.color} sz={4} />
          <span style={{ fontFamily: mono, fontSize: 9, color: u.color, letterSpacing: "0.16em" }}>
            {urgencyKey.toUpperCase()}
          </span>
        </div>
        <div style={{ fontFamily: bebas, fontSize: 22, color: C.text, letterSpacing: "0.06em", lineHeight: 1.05, marginBottom: 4 }}>
          {entry.emergencyDetails?.heading || entry.title}
        </div>
      </div>

      {/* 2. Dynamic Items Block */}
      <div style={{ padding: "12px 16px", borderRight: `1px solid ${C.rule}`, flex: 1 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 7 }}>REQUESTED SUPPLIES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {itemsToRender.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: bebas, fontSize: 16, color: u.color, letterSpacing: "0.05em", lineHeight: 1 }}>
                {item.quantity || item.q}
              </span>
              <span style={{ fontFamily: mono, fontSize: 9, color: C.mid, letterSpacing: "0.04em" }}>
                {item.u ? item.u.toUpperCase() + " " : "x "}{item.name || item.n}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Match Info & ETA */}
      {entry.matchInfo ? (
         <div style={{ padding: "12px 14px", borderRight: `1px solid ${C.rule}`, minWidth: 150, flexShrink: 0, background: C.tealDim }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: C.teal, letterSpacing: "0.16em", marginBottom: 7 }}>LIVE ETA (HAVERSINE)</div>
            <div style={{ fontFamily: bebas, fontSize: 24, color: C.teal, lineHeight: 1 }}>{entry.etaText}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
               <span style={{ fontFamily: mono, fontSize: 8, color: C.teal }}>ID: {entry.matchInfo.id}</span>
               {entry.matchInfo.hasRefrigeration && <span style={{ fontFamily: mono, fontSize: 8, color: C.teal }}>❄ COLD CHAIN ACTIVE</span>}
            </div>
         </div>
      ) : (
        <div style={{ padding: "12px 14px", borderRight: `1px solid ${C.rule}`, width: 140, flexShrink: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 7 }}>FLAGS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {entry.flags.map((f, i) => (
              <span key={i} style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>• {f.toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}
      
      {/* 3. Conditional Dispatch UI */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 120, flexShrink: 0 }}>
        {dispatchStatus === "en_route" ? (
          <div style={{ 
            fontFamily: mono, fontSize: 11, color: C.teal, letterSpacing: "0.1em",
            display: "flex", alignItems: "center", gap: 6, fontWeight: "bold",
            textShadow: `0 0 8px ${C.teal}`, animation: "vr-ping 2s infinite" 
          }}>
            🚚 EN ROUTE<br/>{entry.etaText}
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => setDispatchStatus("en_route")} // Changes state instead of deleting
            style={{ 
              fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: u.color, 
              background: u.dim, border: `1px solid ${u.bd}`, padding: "8px 14px", 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" 
            }}
            onMouseEnter={e => e.currentTarget.style.background = u.bd.replace("0.36","0.22")}
            onMouseLeave={e => e.currentTarget.style.background = u.dim}
          >
            <Navigation size={11} color={u.color} strokeWidth={2} />
            DISPATCH
          </button>
        )}
      </div>
    </div>
  );
}


// ── FEED CARD ─────────────────────────────────────────────────────────────────

function FeedCard({ entry, isNew, isActive, onClick }) {
  const u = URGENCY[entry.urgency] || URGENCY.LOW;
  return (
    <div onClick={onClick} style={{
      borderBottom: `1px solid ${C.rule}`,
      background: isActive ? u.dim : "transparent",
      borderLeft: `3px solid ${isActive ? u.color : "transparent"}`,
      padding: "11px 14px 11px 12px",
      cursor: "pointer", transition: "background 0.18s",
      animation: isNew ? "vr-slide 0.4s cubic-bezier(0.22,1,0.36,1)" : "none",
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.faint; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {entry.urgency === "CRITICAL" && <Ping color={C.red} sz={4} />}
          <Badge level={entry.urgency} />
        </div>
        <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>{entry.ts}</span>
      </div>

      <div style={{ fontFamily: bebas, fontSize: 17, color: C.text, letterSpacing: "0.05em", lineHeight: 1.1, marginBottom: 4 }}>{entry.title}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
        <MapPin size={9} color={C.dim} />
        <span style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>{entry.loc}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
        {entry.items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontFamily: bebas, fontSize: 14, color: u.color, lineHeight: 1 }}>{item.q}</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>{item.u} {item.n}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {entry.flags.map((f, i) => (
          <span key={i} style={{ fontFamily: mono, fontSize: 8, letterSpacing: "0.1em", color: C.dim, border: `1px solid ${C.rule}`, padding: "1px 5px" }}>
            {f.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function VitalRoute() {
  const [feed, setFeed]       = useState(SEED);
  const [input, setInput]     = useState("");
  const [coldChain, setColdChain] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [newId, setNewId]     = useState(null);
  const [activeId, setActiveId] = useState(SEED[1].id);
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prevText) => prevText + (prevText ? " " : "") + transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };
  const feedRef = useRef(null);
  const active = feed.find(f => f.id === activeId) || feed[0];
  const handleDispatch = (idToDispatch) => {
    setFeed(prevFeed => prevFeed.filter(item => item.id !== idToDispatch));
    setActiveId(prevId => prevId === idToDispatch ? null : prevId);
  };
  
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [feed]);
  async function extract() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    
    try {
      const res = await fetch("http://localhost:8080/api/match", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.trim(),
          hospitalLocation: { lat: 26.8638, lng: 80.9228 }, // Lucknow Base
          requiresColdChain: coldChain
        }),
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
         throw new Error(data.error || "No supplier match found.");
      }

      const now  = new Date();
      const ts   = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      
      const entry = { 
        id: Date.now(), 
        ts, 
        title: data.title || "EMERGENCY LOGISTICS REQUEST",
        urgency: input.toLowerCase().includes("critical") || input.toLowerCase().includes("casualty") ? "CRITICAL" : "HIGH",
        loc: data.match.name,
        items: data.items || [{ n: "Requested Assets", q: 1, u: "batch" }],
        flags: [coldChain ? "Cold Chain" : "Standard", data.match.status],
        coords: { x: 32 + Math.random() * 36, y: 28 + Math.random() * 40 },
        etaText: data.etaText,
        matchInfo: data.match
      };
      
      setNewId(entry.id); 
      setActiveId(entry.id);
      setFeed(prev => [entry, ...prev]);
      setInput("");
      setTimeout(() => setNewId(null), 2000);
      
    } catch (err) { 
        setError(err.message || "Parse failed — check backend connection."); 
    } finally { 
        setLoading(false); 
    }
  }

  const btnOn = input.trim() && !loading;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes radar-sweep { to { transform: rotate(360deg); } }
        @keyframes vr-ping  { 0%{transform:scale(1);opacity:.22} 70%{transform:scale(2.8);opacity:0} 100%{opacity:0} }
        @keyframes vr-ring  { 0%{transform:scale(.85);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes vr-slide { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes vr-reveal{ from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vr-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }

        .vr-ta::placeholder { color: rgba(237,232,210,0.2); font-family: 'Courier Prime', monospace; font-size: 12px; }
        .vr-ta:focus        { outline: none; }
        .vr-feed::-webkit-scrollbar       { width: 2px; }
        .vr-feed::-webkit-scrollbar-track { background: transparent; }
        .vr-feed::-webkit-scrollbar-thumb { background: rgba(224,56,32,0.25); }

        .vr-scan-bg {
          background-image:
            linear-gradient(rgba(237,228,210,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(237,228,210,0.04) 1px, transparent 1px);
          background-size: 44px 44px;
        }
      `}</style>

      {/* ROOT — CSS GRID */}
      <div style={{
        width: "100%", height: "100vh", minHeight: 560,
        display: "grid",
        gridTemplateRows: "46px 1fr",
        gridTemplateColumns: "190px 1fr 306px",
        background: C.bg, color: C.text,
        overflow: "hidden",
      }}>

        {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
        <div style={{
          gridColumn: "1 / -1", gridRow: "1",
          background: C.panel,
          borderBottom: `1px solid ${C.ruleHard}`,
          display: "flex", alignItems: "center",
          padding: "0 18px", gap: 0,
          animation: "vr-in 0.4s ease both",
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: 18, borderRight: `1px solid ${C.rule}` }}>
            <Siren size={14} color={C.red} strokeWidth={1.8} />
            <span style={{ fontFamily: bebas, fontSize: 22, color: C.text, letterSpacing: "0.12em" }}>VITALROUTE</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.14em", marginLeft: 4 }}>CRISIS CMD v2.4</span>
          </div>

          {/* Status nodes */}
          <div style={{ display: "flex", gap: 0, flex: 1, paddingLeft: 1 }}>
            {[["NETWORK","LIVE",C.teal],["FEEDS", feed.length.toString() ,C.mid],["UNITS ACTIVE","12",C.mid],["SIGNAL","98%",C.teal]].map(([l,v,vc]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", borderRight: `1px solid ${C.rule}` }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.12em" }}>{l}</span>
                <span style={{ fontFamily: bebas, fontSize: 14, color: vc, letterSpacing: "0.08em" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Op status */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 18, borderLeft: `1px solid ${C.rule}` }}>
            <Ping color={C.teal} sz={4} />
            <span style={{ fontFamily: mono, fontSize: 9, color: C.teal, letterSpacing: "0.12em" }}>ALL SYSTEMS NOMINAL</span>
          </div>
        </div>

        {/* ══ LEFT PANEL — STATS ═══════════════════════════════════════════════ */}
        <div style={{
          gridColumn: "1", gridRow: "2",
          background: C.panel,
          borderRight: `1px solid ${C.ruleHard}`,
          display: "flex", flexDirection: "column",
          animation: "vr-in 0.5s ease 0.1s both",
        }}>
          {/* Panel header */}
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.rule}` }}>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>OPERATIONAL STATUS</span>
          </div>

          {/* Stat blocks */}
          {[
            { label: "ACTIVE INCIDENTS",  val: feed.filter(f => f.urgency === "CRITICAL" || f.urgency === "HIGH").length, color: C.red,    sub: "↑ 2 PAST HOUR" },
            { label: "REQUESTS QUEUED",   val: feed.length, color: C.orange, sub: `${feed.filter(f => f.urgency === "CRITICAL").length} CRITICAL` },
            { label: "UNITS DISPATCHED",  val: 14,          color: C.teal,   sub: "AVG ETA 8 MIN" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "16px 14px", borderBottom: `1px solid ${C.rule}`, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: bebas, fontSize: 56, color: s.color, lineHeight: 0.9, letterSpacing: "0.02em" }}>{s.val}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 6, letterSpacing: "0.1em" }}>{s.sub}</div>
            </div>
          ))}

          {/* Radio footer */}
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.rule}`, marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Radio size={10} color={C.dim} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>CHANNEL 7 OPEN</span>
            </div>
          </div>
        </div>

        {/* ══ CENTER — RADAR + DETAIL STRIP ════════════════════════════════════ */}
        <div style={{
          gridColumn: "2", gridRow: "2",
          display: "flex", flexDirection: "column",
          alignItems: "center", position: "relative",
          overflow: "hidden",
          animation: "vr-in 0.5s ease 0.15s both",
        }}>
          {/* Topographic grid background */}
          <div className="vr-scan-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

          {/* Atmospheric glow */}
          <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,56,32,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

          {/* Radar section — fills center vertically */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 0 10px", width: "100%", paddingBottom: active ? 0 : 10 }}>
            {/* Section label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ height: 1, width: 40, background: C.rule }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.2em" }}>REGIONAL DISPATCH GRID</span>
              <div style={{ height: 1, width: 40, background: C.rule }} />
            </div>

            <Radar entries={feed} activeId={activeId} onSelect={setActiveId} />

            {/* Incident count underneath radar */}
            <div style={{ display: "flex", gap: 18 }}>
              {Object.entries(URGENCY).map(([key, u]) => {
                const count = feed.filter(f => f.urgency === key).length;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: count > 0 ? u.color : C.dim, display: "inline-block" }} />
                    <span style={{ fontFamily: mono, fontSize: 8, color: count > 0 ? u.color : C.dim, letterSpacing: "0.12em" }}>{count} {key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Update this single line to pass the function */}
          {active && <DetailStrip key={activeId} entry={active} onDispatch={handleDispatch} />}

          {/* Command Bar — absolutely positioned at very bottom inside center */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            transform: active ? "translateY(100%)" : "none",
          }} />
        </div>

        {/* ══ RIGHT SIDEBAR — LIVE FEED ════════════════════════════════════════ */}
        <div style={{
          gridColumn: "3", gridRow: "2",
          background: C.panel,
          borderLeft: `1px solid ${C.ruleHard}`,
          display: "flex", flexDirection: "column",
          animation: "vr-in 0.5s ease 0.2s both",
          overflow: "hidden" // ADDED to ensure proper scrolling
        }}>
          {/* Feed header */}
          <div style={{ padding: "10px 14px 9px", borderBottom: `1px solid ${C.ruleHard}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: bebas, fontSize: 16, color: C.text, letterSpacing: "0.1em" }}>LIVE LOGISTICS FEED</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Ping color={C.red} sz={4} />
                <span style={{ fontFamily: mono, fontSize: 9, color: C.red, letterSpacing: "0.12em" }}>LIVE</span>
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>{feed.length} ACTIVE REQUESTS — CLICK TO FOCUS</span>
          </div>

          {/* Scrollable feed */}
          <div ref={feedRef} className="vr-feed" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {feed.map(e => (
              <FeedCard key={e.id} entry={e} isNew={e.id === newId} isActive={e.id === activeId} onClick={() => setActiveId(e.id)} />
            ))}
          </div>

          {/* Command input — pinned to bottom of sidebar */}
          <div style={{ borderTop: `1px solid ${C.ruleHard}`, background: C.panel, flexShrink: 0 }}>
            {/* Label */}
            <div style={{ padding: "9px 14px 7px", borderBottom: `1px solid ${C.rule}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, background: btnOn ? C.red : C.dim, display: "inline-block" }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>CRISIS COMMAND INPUT</span>
            </div>

            {/* Textarea + Microphone UI */}
            <div style={{ padding: "10px 12px 8px", position: "relative" }}>
              <textarea
                className="vr-ta"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); extract(); } }}
                placeholder={"Describe the emergency — e.g. \"Pileup on I-95, need 10 units O-negative\""}
                rows={3}
                style={{
                  width: "100%", resize: "none",
                  background: "rgba(237,232,210,0.04)",
                  border: `1px solid ${btnOn ? C.redBd : C.rule}`,
                  color: C.text, fontFamily: mono, fontSize: 11.5, lineHeight: 1.6,
                  padding: "8px 30px 8px 10px", // Added right padding for mic
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = C.redBd}
                onBlur={e => e.target.style.borderColor = btnOn ? C.redBd : C.rule}
              />
              
              <button
                type="button"
                onClick={startListening}
                title="Use Voice Command"
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "20px",
                  background: "transparent",
                  border: "none",
                  color: isListening ? C.red : C.dim,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  animation: isListening ? "vr-ping 1.5s infinite" : "none", // Uses your existing ping animation
                }}
              >
                <Mic size={16} />
              </button>
            </div>
            
            {/* Cold Chain Toggle added to Claude's Layout */}
            <div style={{ padding: "0 12px 10px", display: "flex", alignItems: "center" }}>
              <button
                onClick={() => setColdChain(!coldChain)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: coldChain ? C.tealDim : "transparent",
                  border: `1px solid ${coldChain ? C.tealBd : C.rule}`,
                  padding: "6px 0", cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <Snowflake size={10} color={coldChain ? C.teal : C.dim} />
                <span style={{ fontFamily: mono, fontSize: 9, color: coldChain ? C.teal : C.dim, letterSpacing: "0.1em" }}>
                  {coldChain ? "COLD CHAIN: REQUIRED" : "STANDARD TRANSIT"}
                </span>
              </button>
            </div>

            {/* Extract button */}
            <div style={{ padding: "0 12px 10px" }}>
              <button
                onClick={extract}
                disabled={!btnOn}
                style={{
                  width: "100%", fontFamily: mono, fontSize: 10, letterSpacing: "0.18em",
                  color: btnOn ? C.red : C.dim,
                  background: btnOn ? C.redDim : "transparent",
                  border: `1px solid ${btnOn ? C.redBd : C.rule}`,
                  padding: "9px 0", cursor: btnOn ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (btnOn) e.currentTarget.style.background = C.redGlow; }}
                onMouseLeave={e => { if (btnOn) e.currentTarget.style.background = C.redDim; }}
              >
                {loading
                  ? <Loader2 size={12} color={C.dim} style={{ animation: "spin 1s linear infinite" }} />
                  : <Zap size={12} color={btnOn ? C.red : C.dim} strokeWidth={2} />
                }
                {loading ? "PARSING EMERGENCY DATA…" : "EXTRACT NEEDS"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: "0 12px 10px", padding: "6px 10px", background: C.redDim, border: `1px solid ${C.redBd}`, display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle size={10} color={C.red} />
                <span style={{ fontFamily: mono, fontSize: 9.5, color: C.red, flex: 1 }}>{error}</span>
                <X size={10} color={C.dim} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setError(null)} />
              </div>
            )}

            {/* Hint */}
            <div style={{ padding: "0 12px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Info size={9} color={C.dim} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.06em", lineHeight: 1.5 }}>
                AI PARSES URGENCY · ITEMS · QTY · FLAGS{"\n"}PRESS ENTER OR CLICK EXTRACT
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}