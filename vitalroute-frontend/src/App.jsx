import { useState, useRef, useEffect, useMemo } from "react";
import {
  AlertTriangle, Zap, Droplet, MapPin, Siren,
  Loader2, TrendingUp, Navigation, ChevronRight,
  X, Info, Activity, Package, Radio, Shield, Truck, Clock
} from "lucide-react";
import { GoogleMap, TrafficLayer, DirectionsRenderer, Marker, useJsApiLoader } from '@react-google-maps/api';

// ── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F0D0A",
  panel: "#131109",
  rule: "rgba(237,228,210,0.08)",
  ruleHard: "rgba(237,228,210,0.14)",
  text: "#EDE8D2",
  mid: "rgba(237,232,210,0.50)",
  dim: "rgba(237,232,210,0.26)",
  faint: "rgba(237,232,210,0.09)",
  red: "#E03820",
  redGlow: "rgba(224,56,32,0.22)",
  redDim: "rgba(224,56,32,0.12)",
  redBd: "rgba(224,56,32,0.36)",
  teal: "#3D8A78",
  tealBd: "rgba(61,138,120,0.42)",
  tealDim: "rgba(61,138,120,0.14)",
  orange: "#C05C18",
  orangeDim: "rgba(192,92,24,0.14)",
  orangeBd: "rgba(192,92,24,0.38)",
  olive: "#78803A",
  oliveDim: "rgba(120,128,58,0.12)",
  oliveBd: "rgba(120,128,58,0.36)",
  slate: "#487080",
  slateDim: "rgba(72,112,128,0.12)",
  slateBd: "rgba(72,112,128,0.36)",
};

const URGENCY = {
  CRITICAL: { color: C.red, dim: C.redDim, bd: C.redBd, label: "CRITICAL" },
  HIGH: { color: C.orange, dim: C.orangeDim, bd: C.orangeBd, label: "HIGH" },
  MODERATE: { color: C.olive, dim: C.oliveDim, bd: C.oliveBd, label: "MODERATE" },
  LOW: { color: C.slate, dim: C.slateDim, bd: C.slateBd, label: "LOW" },
};

const tacticalMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#0F0D0A" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#3D8A78" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
];

const mono = "'Courier Prime', 'Courier New', monospace";
const bebas = "'Bebas Neue', Impact, sans-serif";

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const Badge = ({ level }) => {
  const u = URGENCY[level] || URGENCY.LOW;
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, letterSpacing: "0.18em", padding: "2px 6px",
      background: u.dim, border: `1px solid ${u.bd}`, color: u.color,
    }}>{u.label}</span>
  );
};

const Ping = ({ color = C.red, sz = 5 }) => (
  <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: sz + 8, height: sz + 8, flexShrink: 0 }}>
    <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.22, animation: "vr-ping 1.9s ease-out infinite" }} />
    <span style={{ width: sz, height: sz, borderRadius: "50%", background: color }} />
  </span>
);

const FeedCard = ({ entry, isActive, onClick }) => {
  const u = URGENCY[entry.urgency] || URGENCY.LOW;
  return (
    <div onClick={onClick} style={{
      borderBottom: `1px solid ${C.rule}`, background: isActive ? u.dim : "transparent",
      borderLeft: `3px solid ${isActive ? u.color : "transparent"}`,
      padding: "12px", cursor: "pointer", transition: "background 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <Badge level={entry.urgency} />
        <span style={{ fontFamily: mono, fontSize: 9, color: C.dim }}>{entry.ts}</span>
      </div>
      <div style={{ fontFamily: bebas, fontSize: 18, color: C.text, marginBottom: 4 }}>{entry.title}</div>
      <div style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 9, color: C.mid }}>
        <MapPin size={10} /> {entry.loc}
      </div>
    </div>
  );
};

// ── MAIN APPLICATION ──────────────────────────────────────────────────────────

export default function VitalRoute() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" // Replace with your key
  });

  const [feed, setFeed] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const feedRef = useRef(null);

  const activeEntry = useMemo(() => feed.find(f => f.id === activeId), [feed, activeId]);

  // Connect to Node.js Backend on Port 8080
  const extract = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8080/api/crisis-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });

      if (!res.ok) throw new Error("Backend connection failed.");
      
      const data = await res.json();
      
      // Add simulated coords if backend doesn't provide them yet
      const entry = {
        id: Date.now(),
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        coords: { lat: 26.8890 + (Math.random() - 0.5) * 0.05, lng: 80.9333 + (Math.random() - 0.5) * 0.05 },
        ...data
      };

      setFeed(prev => [entry, ...prev]);
      setActiveId(entry.id);
      setInput("");
    } catch (err) {
      setError("COMMAND LINK FAILURE: Ensure Port 8080 is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: "100%", height: "100vh", display: "grid", 
      gridTemplateRows: "46px 1fr", gridTemplateColumns: "190px 1fr 306px",
      background: C.bg, color: C.text, overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime:wght@400;700&display=swap');
        @keyframes radar-sweep { to { transform: rotate(360deg); } }
        @keyframes vr-ping { 0%{transform:scale(1);opacity:.22} 70%{transform:scale(2.8);opacity:0} }
        @keyframes vr-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .vr-ta:focus { outline: none; border-color: ${C.redBd} !important; }
        .vr-scan-bg {
          background-image: linear-gradient(${C.rule} 1px, transparent 1px), linear-gradient(90deg, ${C.rule} 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {/* ══ TOP BAR ══ */}
      <header style={{
        gridColumn: "1/-1", background: C.panel, borderBottom: `1px solid ${C.ruleHard}`,
        display: "flex", alignItems: "center", padding: "0 18px", animation: "vr-in 0.4s ease both"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: 18, borderRight: `1px solid ${C.rule}` }}>
          <Siren size={14} color={C.red} />
          <span style={{ fontFamily: bebas, fontSize: 22, letterSpacing: "0.12em" }}>VITALROUTE</span>
          <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginLeft: 4 }}>CRISIS LOGISTICS v2.5</span>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 20, paddingLeft: 20 }}>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.teal }}>● NETWORK LIVE</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>NODES: 50 HOSPITALS ACTIVE</span>
        </div>
      </header>

      {/* ══ LEFT: ANALYTICS ══ */}
      <aside style={{
        background: C.panel, borderRight: `1px solid ${C.ruleHard}`, display: "flex", flexDirection: "column",
        padding: "16px", animation: "vr-in 0.5s ease 0.1s both"
      }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, marginBottom: 20 }}>OPERATIONAL METRICS</div>
        <StatItem label="TOTAL ASSETS" val={feed.length} color={C.text} />
        <StatItem label="CRITICAL NEED" val={feed.filter(f => f.urgency === 'CRITICAL').length} color={C.red} />
        <StatItem label="REROUTED" val="02" color={C.teal} />
        <div style={{ marginTop: "auto", borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Radio size={10} color={C.dim} />
            <span style={{ fontSize: 8, color: C.dim }}>CH-7 ENCRYPTED</span>
          </div>
        </div>
      </aside>

      {/* ══ CENTER: MAP ══ */}
      <main style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="vr-scan-bg" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />
        
        {isLoaded ? (
          <div style={{ flex: 1, position: "relative" }}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={{ lat: 26.8890, lng: 80.9333 }}
              zoom={13}
              options={{ styles: tacticalMapStyle, disableDefaultUI: true }}
            >
              <TrafficLayer />
              {feed.map(e => (
                <Marker 
                  key={e.id} position={e.coords} 
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: e.id === activeId ? 10 : 6,
                    fillColor: URGENCY[e.urgency]?.color || C.teal,
                    fillOpacity: 1, strokeWeight: 2, strokeColor: "#FFF"
                  }}
                />
              ))}
            </GoogleMap>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(224,56,32,0.03) 80deg, transparent 96deg)`,
              animation: "radar-sweep 10s linear infinite"
            }} />
          </div>
        ) : (
          <div style={{ margin: "auto", fontFamily: mono, color: C.dim }}>LOADING TACTICAL GRID...</div>
        )}

        {/* INCIDENT DETAIL STRIP (Restored) */}
        {activeEntry && (
          <div style={{ 
            height: "120px", background: URGENCY[activeEntry.urgency].dim, 
            borderTop: `1px solid ${URGENCY[activeEntry.urgency].bd}`, 
            display: "flex", zIndex: 3, animation: "vr-in 0.3s ease" 
          }}>
            <div style={{ padding: "15px", borderRight: `1px solid ${C.rule}`, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <Ping color={URGENCY[activeEntry.urgency].color} sz={4} />
                <span style={{ fontSize: 9, color: URGENCY[activeEntry.urgency].color }}>{activeEntry.urgency}</span>
              </div>
              <div style={{ fontFamily: bebas, fontSize: 20 }}>{activeEntry.title}</div>
            </div>
            <div style={{ flex: 1, padding: "15px", borderRight: `1px solid ${C.rule}` }}>
              <div style={{ fontSize: 8, color: C.dim, marginBottom: 5 }}>REQUIRED SUPPLIES</div>
              {activeEntry.items?.map((item, i) => (
                <div key={i} style={{ fontSize: 11 }}>{item.q} {item.u} {item.n}</div>
              ))}
            </div>
            <div style={{ padding: "15px", display: "flex", alignItems: "center" }}>
              <button style={{ 
                background: URGENCY[activeEntry.urgency].dim, border: `1px solid ${URGENCY[activeEntry.urgency].bd}`,
                color: URGENCY[activeEntry.urgency].color, padding: "8px 15px", fontFamily: mono, fontSize: 10, cursor: "pointer"
              }}>DISPATCH SMART ROUTE</button>
            </div>
          </div>
        )}
      </main>

      {/* ══ RIGHT: FEED & COMMAND ══ */}
      <aside style={{
        background: C.panel, borderLeft: `1px solid ${C.ruleHard}`, display: "flex", flexDirection: "column",
        animation: "vr-in 0.5s ease 0.2s both"
      }}>
        <div style={{ padding: "12px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: bebas, fontSize: 16 }}>LIVE LOGISTICS</span>
          <Ping color={C.red} sz={4} />
        </div>
        
        <div style={{ flex: 1, overflowY: "auto" }}>
          {feed.map(f => <FeedCard key={f.id} entry={f} isActive={f.id === activeId} onClick={() => setActiveId(f.id)} />)}
        </div>

        {/* CRISIS COMMAND INPUT (Restored) */}
        <div style={{ padding: "12px", borderTop: `1px solid ${C.ruleHard}`, background: C.panel }}>
          <div style={{ fontSize: 8, color: C.dim, marginBottom: 8 }}>CRISIS COMMAND INPUT</div>
          <textarea 
            className="vr-ta" value={input} onChange={e => setInput(e.target.value)}
            placeholder="E.g. Hospital A needs 4 oxygen tanks..."
            style={{ 
              width: "100%", background: "rgba(237,232,210,0.04)", border: `1px solid ${C.rule}`,
              color: C.text, fontFamily: mono, fontSize: 11, padding: "8px", height: "80px", resize: "none"
            }}
          />
          <button 
            onClick={extract} disabled={!input.trim() || loading}
            style={{ 
              width: "100%", marginTop: "10px", background: loading ? "transparent" : C.redDim, 
              border: `1px solid ${C.redBd}`, color: loading ? C.dim : C.red, 
              padding: "8px", fontFamily: mono, fontSize: 10, cursor: "pointer" 
            }}
          >
            {loading ? "ANALYZING..." : "EXTRACT & REROUTE"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function StatItem({ label, val, color }) {
  return (
    <div style={{ marginBottom: 25 }}>
      <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 36, fontFamily: bebas, color, lineHeight: 1 }}>{val}</div>
    </div>
  );
}
