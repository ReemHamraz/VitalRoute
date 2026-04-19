import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import {
  AlertTriangle, Activity, Zap, Droplet, Package,
  MapPin, Siren, Loader2, TrendingUp,
  CircleDot, X, Info, Navigation, ChevronRight, Clock
} from "lucide-react";

// ── PALETTE & CONFIG ────────────────────────────────────────────────────────
const P = {
  bg:           "#080C14",
  amber:        "#C4970A",
  amberDim:     "rgba(196,151,10,0.16)",
  amberBorder:  "rgba(196,151,10,0.42)",
  teal:         "#2A8B7A",
  tealDim:      "rgba(42,139,122,0.16)",
  tealBorder:   "rgba(42,139,122,0.42)",
  orange:       "#B86520",
  orangeDim:    "rgba(184,101,32,0.15)",
  orangeBorder: "rgba(184,101,32,0.42)",
  olive:        "#7A8040",
  oliveDim:     "rgba(122,128,64,0.14)",
  oliveBorder:  "rgba(122,128,64,0.38)",
  slate:        "#3A6A7A",
  slateDim:     "rgba(58,106,122,0.14)",
  slateBorder:  "rgba(58,106,122,0.38)",
  text:         "rgba(224,214,190,0.92)",
  textMid:      "rgba(224,214,190,0.45)",
  textDim:      "rgba(224,214,190,0.24)",
  textFaint:    "rgba(224,214,190,0.09)",
};

const URGENCY_CONFIG = {
  CRITICAL: { color: P.amber,  bg: P.amberDim,  border: P.amberBorder,  label: "CRITICAL" },
  HIGH:     { color: P.orange, bg: P.orangeDim, border: P.orangeBorder, label: "HIGH"     },
  URGENT:   { color: P.orange, bg: P.orangeDim, border: P.orangeBorder, label: "URGENT"   },
  MODERATE: { color: P.olive,  bg: P.oliveDim,  border: P.oliveBorder,  label: "MODERATE" },
  LOW:      { color: P.slate,  bg: P.slateDim,  border: P.slateBorder,  label: "LOW"      },
};

const glass = {
  background: "rgba(8,12,20,0.65)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: `0.5px solid ${P.textFaint}`,
  boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 0.5px 0 ${P.textFaint}`,
};

// ── GOOGLE MAPS CONFIG ──────────────────────────────────────────────────────
const mapContainerStyle = { width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 0 };
const center = { lat: 26.8467, lng: 80.9462 }; // Lucknow HQ
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b0c10' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0c10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c5c6c7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2833' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A8B7A' }], stylers: [{ lightness: -50 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050608' }] }
];

// ── ATOMS ───────────────────────────────────────────────────────────────────
function UrgencyBadge({ level }) {
  const c = URGENCY_CONFIG[level] || URGENCY_CONFIG.LOW;
  return (
    <span style={{ fontSize: 9, fontFamily: "'Inter',sans-serif", letterSpacing: "0.16em", fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: c.bg, border: `0.5px solid ${c.border}`, color: c.color }}>{c.label}</span>
  );
}

function Dot({ color = P.amber, size = 5 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + 6, height: size + 6 }}>
      <span style={{ position: "absolute", width: size + 6, height: size + 6, borderRadius: "50%", background: color, opacity: 0.25, animation: "vr-ping 1.8s ease-out infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, position: "relative" }} />
    </span>
  );
}

function IncidentNode({ entry, active, onClick }) {
  const c = URGENCY_CONFIG[entry.urgency] || URGENCY_CONFIG.LOW;
  const isCrit = entry.urgency === "CRITICAL";
  return (
    <div onClick={onClick} style={{ position: "absolute", left: `${entry.coords.x}%`, top: `${entry.coords.y}%`, transform: "translate(-50%,-50%)", cursor: "pointer", zIndex: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isCrit && <span style={{ position: "absolute", width: 30, height: 30, borderRadius: "50%", border: `1px solid ${c.color}`, opacity: 0.35, animation: "vr-ring 2.2s ease-out infinite" }} />}
        {active && <span style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: c.color, opacity: 0.12 }} />}
        <div style={{ width: active ? 18 : 13, height: active ? 18 : 13, borderRadius: "50%", background: active ? c.bg : "rgba(8,12,20,0.9)", border: `${active ? 2 : 1}px solid ${c.color}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s", boxShadow: active ? `0 0 16px ${c.color}44` : "none" }}>
          {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />}
        </div>
      </div>
    </div>
  );
}

function LogCard({ entry, isNew, active, onClick }) {
  const c = URGENCY_CONFIG[entry.urgency] || URGENCY_CONFIG.LOW;
  return (
    <div onClick={onClick} style={{ ...glass, borderRadius: 8, padding: "12px 13px", marginBottom: 8, borderLeft: `2px solid ${c.color}`, border: `0.5px solid ${active ? c.border : P.textFaint}`, animation: isNew ? "vr-slide-in 0.45s cubic-bezier(0.22,1,0.36,1)" : "none", cursor: "pointer", boxShadow: active ? `0 0 18px ${c.color}18` : "none", transition: "box-shadow 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {entry.urgency === "CRITICAL" && <Dot color={P.amber} size={4} />}
          <UrgencyBadge level={entry.urgency} />
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.textDim, letterSpacing: "0.06em" }}><Clock size={8} style={{display:'inline', marginRight:2}}/> {entry.timestamp}</span>
      </div>
      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 600, color: P.text, margin: "0 0 3px", lineHeight: 1.35 }}>{entry.summary}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
        <MapPin size={9} color={P.textDim} />
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: P.textDim }}>{entry.location}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 7 }}>
        {entry.items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Droplet size={8} color={c.color} strokeWidth={2.5} />
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: P.textMid }}><span style={{ fontWeight: 600, color: P.text }}>{item.qty} {item.unit}</span> {item.name.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {(entry.flags || []).map((flag, i) => (
          <span key={i} style={{ fontFamily: "'Inter',sans-serif", fontSize: 8.5, letterSpacing: "0.1em", color: P.textDim, background: P.textFaint, borderRadius: 3, padding: "2px 5px", border: `0.5px solid ${P.textFaint}` }}>{flag.toUpperCase()}</span>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function VitalRoute() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [feed, setFeed] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const feedRef = useRef(null);

  // 1. Listen to Real-Time Firebase Data
  useEffect(() => {
    try {
      const q = query(collection(db, 'supply_requests'), orderBy('createdAt', 'desc'), limit(15));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            urgency: data.urgency || "MODERATE",
            summary: data.context_note || "Logistics Request",
            location: data.hospitalId || "Lucknow General",
            items: (data.items || []).map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })),
            flags: data.flags || [],
            coords: { x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 } // Visual mock coords
          });
        });
        setFeed(requests);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore listener failed, waiting for connection.");
    }
  }, []);

  // 2. The Gemini Backend AI Hook
  async function handleExtract() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null);
    
    try {
      const res = await fetch("http://localhost:8080/api/crisis-command", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: input.trim(), hospitalId: "lucknow_gen" }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Backend parsing failed");

      const parsed = data.parsed;
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Inject AI result directly into UI for immediate feedback
      const entry = { 
        id: Date.now(), timestamp: ts, 
        coords: { x: 50, y: 50 }, 
        summary: parsed.context_note || "Emergency Event",
        urgency: parsed.urgency, location: "Local Hospital",
        items: parsed.items.map(i => ({ name: i.name, qty: i.quantity, unit: i.unit })),
        flags: parsed.flags || []
      };
      
      setActiveId(entry.id);
      setFeed(prev => [entry, ...prev]);
      setInput("");
    } catch (err) { 
      setError("Extraction failed — ensure backend is running."); 
    } finally { 
      setLoading(false); 
    }
  }

  const btnOn = input.trim() && !loading;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;700&display=swap');
        @keyframes vr-ping     { 0%{transform:scale(1);opacity:0.3} 70%{transform:scale(2.6);opacity:0} 100%{transform:scale(2.6);opacity:0} }
        @keyframes vr-ring     { 0%{transform:scale(0.8);opacity:0.5} 100%{transform:scale(2.1);opacity:0} }
        @keyframes vr-slide-in { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes vr-fade-in  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vr-scan     { 0%{top:0} 100%{top:100%} }
        @keyframes vr-blink    { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes spin        { to{transform:rotate(360deg)} }
        .vr-input::placeholder { color:rgba(224,214,190,0.2); }
        .vr-input:focus        { outline:none; }
        .vr-feed::-webkit-scrollbar       { width:2px; }
        .vr-feed::-webkit-scrollbar-track { background:transparent; }
        .vr-feed::-webkit-scrollbar-thumb { background:rgba(196,151,10,0.2); border-radius:4px; }
        .vr-map-grid {
          background-image: linear-gradient(rgba(42,139,122,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(42,139,122,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
        }
      `}</style>

      <div style={{ width: "100%", height: "100vh", position: "relative", background: P.bg, overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>

        {/* 1. THE GOOGLE MAP BASE */}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            options={{ styles: darkMapStyle, disableDefaultUI: true, zoomControl: false }}
          />
        )}

        {/* 2. THE CINEMATIC OVERLAY */}
        <div className="vr-map-grid" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${P.teal}44, transparent)`, animation: "vr-scan 8s linear infinite" }} />
        </div>

        {/* 3. VISUAL MAP NODES (Floating over map) */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
          {feed.map(e => <IncidentNode key={e.id} entry={e} active={e.id === activeId} onClick={() => setActiveId(e.id)} />)}
        </div>

        {/* TOP BAR */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, ...glass, borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: `0.5px solid ${P.textFaint}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Siren size={15} color={P.amber} strokeWidth={1.6} />
              <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: P.text }}>VitalRoute</span>
            </div>
            <div style={{ width: 1, height: 15, background: P.textFaint }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.textDim, letterSpacing: "0.15em" }}>CRISIS COMMAND v2.5</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["NETWORK","LIVE"],["FEEDS",feed.length],["DB","SYNCED"]].map(([l,v]) => (
              <div key={l} style={{ display: "flex", gap: 5 }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.textDim, letterSpacing: "0.1em" }}>{l}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.teal, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LEFT STATS */}
        <div style={{ position: "absolute", top: 70, left: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 15, animation: "vr-fade-in 0.6s ease 0.2s both" }}>
          {[
            { icon: <Activity size={11} color={P.amber} />, label: "Active Incidents", val: feed.filter(f => f.urgency === "CRITICAL" || f.urgency === "HIGH").length },
            { icon: <Package size={11} color={P.orange} />, label: "Requests Queued", val: feed.length },
            { icon: <TrendingUp size={11} color={P.teal} />, label: "Units Dispatched", val: 14 },
          ].map((s, i) => (
            <div key={i} style={{ ...glass, borderRadius: 8, padding: "10px 13px", minWidth: 155 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                {s.icon}
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, color: P.textDim, letterSpacing: "0.12em" }}>{s.label.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: P.text, lineHeight: 1.05 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* RIGHT SIDEBAR (Firebase Feed) */}
        <div style={{ position: "absolute", top: 50, right: 0, bottom: 0, width: 320, ...glass, borderRadius: 0, borderTop: "none", borderRight: "none", borderBottom: "none", borderLeft: `0.5px solid ${P.textFaint}`, display: "flex", flexDirection: "column", zIndex: 15, animation: "vr-fade-in 0.5s ease 0.1s both" }}>
          <div style={{ padding: "13px 15px 9px", borderBottom: `0.5px solid ${P.textFaint}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: P.text }}>Live Logistics Feed</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Dot color={P.amber} size={4} />
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.amber, letterSpacing: "0.1em", animation: "vr-blink 2.2s ease infinite" }}>LIVE</span>
              </div>
            </div>
          </div>
          <div ref={feedRef} className="vr-feed" style={{ flex: 1, overflowY: "auto", padding: "10px 12px 12px" }}>
            {feed.map((e, idx) => <LogCard key={e.id} entry={e} isNew={idx === 0} active={e.id === activeId} onClick={() => setActiveId(e.id)} />)}
          </div>
        </div>

        {/* COMMAND BAR */}
        <div style={{ position: "absolute", bottom: 25, left: "50%", transform: "translateX(-50%)", width: "min(620px,calc(100vw - 360px))", ...glass, borderRadius: 11, padding: "13px 14px", zIndex: 20, animation: "vr-fade-in 0.6s ease 0.35s both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
            <CircleDot size={10} color={P.amber} strokeWidth={2} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 11.5, fontWeight: 600, color: P.textMid }}>Crisis Command</span>
            <div style={{ flex: 1, height: "0.5px", background: P.textFaint }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8.5, color: P.textDim, letterSpacing: "0.1em" }}>GEMINI 2.5 FLASH</span>
          </div>

          <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
            <textarea className="vr-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleExtract(); } }}
              placeholder={`Describe emergency — e.g. "Highway pileup, need 10 units O-negative blood"`}
              rows={2}
              style={{ flex: 1, resize: "none", background: "rgba(224,214,190,0.04)", border: `0.5px solid ${P.textFaint}`, borderRadius: 7, color: P.text, fontFamily: "'Inter',sans-serif", fontSize: 12.5, lineHeight: 1.6, padding: "8px 12px", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = P.amberBorder}
              onBlur={e => e.target.style.borderColor = P.textFaint}
            />
            <button onClick={handleExtract} disabled={!btnOn}
              style={{ height: 60, minWidth: 122, borderRadius: 7, cursor: btnOn ? "pointer" : "not-allowed", background: btnOn ? P.amberDim : "rgba(224,214,190,0.03)", border: `0.5px solid ${btnOn ? P.amberBorder : P.textFaint}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.2s", flexShrink: 0 }}
            >
              {loading ? <Loader2 size={14} color={P.textMid} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={13} color={btnOn ? P.amber : P.textDim} strokeWidth={1.8} />}
              <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 9.5, letterSpacing: "0.1em", color: btnOn ? P.text : P.textDim }}>{loading ? "PARSING…" : "EXTRACT"}</span>
            </button>
          </div>
          
          {error && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: P.amberDim, borderRadius: 5, border: `0.5px solid ${P.amberBorder}` }}>
              <AlertTriangle size={10} color={P.amber} />
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10.5, color: P.amber }}>{error}</span>
              <X size={10} color={P.textDim} style={{ marginLeft: "auto", cursor: "pointer" }} onClick={() => setError(null)} />
            </div>
          )}
        </div>

      </div>
    </>
  );
}