import { GoogleMap, useJsApiLoader, OverlayViewF, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useRef, useEffect, useMemo } from "react";
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
  { 
    id: 1, ts: "08:41", loc: "Memorial Hospital, Bay 4", urgency: "HIGH",
    items: [{ n: "O-negative blood", q: 4, u: "units" }, { n: "Plasma", q: 2, u: "bags" }],
    flags: ["Trauma", "Surgical standby"], title: "Post-op Haemorrhage", 
    coords: { x: 58, y: 37, lat: 26.8750, lng: 80.9300 }, 
    etaText: "14 mins in current traffic",
    matchInfo: { name: "Red Cross Blood Bank", lat: 26.8650, lng: 80.9400, id: "sup-01", hasRefrigeration: true }
  },
  { 
    id: 2, ts: "08:39", loc: "I-95 Interchange, Mile 142", urgency: "CRITICAL",
    items: [{ n: "O-negative blood", q: 10, u: "units" }, { n: "Burn dressings", q: 20, u: "kits" }, { n: "Morphine", q: 6, u: "vials" }],
    flags: ["Mass casualty", "Pileup", "Fire hazard"], title: "Multi-Vehicle Collision", 
    coords: { x: 34, y: 62, lat: 26.8520, lng: 80.9150 }, 
    etaText: "8 mins in current traffic",
    matchInfo: { name: "City Emergency Hub", lat: 26.8450, lng: 80.9250, id: "sup-02", hasRefrigeration: true }
  },
  { 
    id: 3, ts: "08:35", loc: "St. Raphael Pediatric Ward", urgency: "MODERATE",
    items: [{ n: "AB-positive blood", q: 2, u: "units" }, { n: "Epinephrine", q: 4, u: "doses" }],
    flags: ["Pediatric", "Allergic reaction"], title: "Anaphylaxis — Age 7", 
    coords: { x: 65, y: 26, lat: 26.8850, lng: 80.9400 }, 
    etaText: "12 mins in current traffic",
    matchInfo: { name: "Apollo Pharmacy Hub", lat: 26.8950, lng: 80.9500, id: "sup-03", hasRefrigeration: true }
  },
  { 
    id: 4, ts: "08:28", loc: "Downtown Fire Station 7", urgency: "LOW",
    items: [{ n: "Saline IV", q: 6, u: "bags" }],
    flags: ["Routine"], title: "Station Resupply", 
    coords: { x: 50, y: 74, lat: 26.8400, lng: 80.9200 }, 
    etaText: "10 mins in current traffic",
    matchInfo: { name: "Central Medical Supply", lat: 26.8350, lng: 80.9150, id: "sup-04", hasRefrigeration: false }
  }
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
  const isDispatched = entry.dispatched;
  const urgencyKey = entry.emergencyDetails?.urgency || entry.urgency;
  const baseUrgency = URGENCY[urgencyKey] || URGENCY.LOW;

  const u = isDispatched 
    ? { ...baseUrgency, color: "#EAB308", dim: "rgba(234,179,8,0.15)", bd: "rgba(234,179,8,0.4)" } 
    : baseUrgency;

  const itemsToRender = entry.emergencyDetails?.items || entry.items;

  return (
    <div style={{ 
      width: "100%", borderTop: `1px solid ${u.bd}`, background: u.dim, 
      display: "flex", animation: "vr-reveal 0.3s ease both",
      overflow: "hidden" 
    }}>
      
      <div style={{ padding: "12px", borderRight: `1px solid ${C.rule}`, flex: "1 1 25%", minWidth: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <Ping color={u.color} sz={4} />
          <span style={{ fontFamily: mono, fontSize: 9, color: u.color, letterSpacing: "0.16em" }}>
            {urgencyKey.toUpperCase()}
          </span>
        </div>
        <div style={{ fontFamily: bebas, fontSize: 20, color: C.text, letterSpacing: "0.06em", lineHeight: 1.05, marginBottom: 4, wordBreak: "break-word" }}>
          {entry.emergencyDetails?.heading || entry.title}
        </div>
      </div>

      <div style={{ padding: "12px", borderRight: `1px solid ${C.rule}`, flex: "1 1 30%", minWidth: 100 }}>
        <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 7 }}>REQUESTED SUPPLIES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {itemsToRender.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: bebas, fontSize: 16, color: u.color, letterSpacing: "0.05em", lineHeight: 1 }}>
                {item.quantity || item.q}
              </span>
              <span style={{ fontFamily: mono, fontSize: 9, color: C.mid, letterSpacing: "0.04em", wordBreak: "break-word" }}>
                {item.u ? item.u.toUpperCase() + " " : "x "}{item.name || item.n}
              </span>
            </div>
          ))}
        </div>
      </div>

      {entry.matchInfo ? (
         <div style={{ padding: "12px", borderRight: `1px solid ${C.rule}`, flex: "1 1 20%", minWidth: 110, background: C.tealDim }}>
            <div style={{ fontFamily: mono, fontSize: 8, color: C.teal, letterSpacing: "0.16em", marginBottom: 7 }}>LIVE ETA (GOOGLE)</div>
            <div style={{ fontFamily: bebas, fontSize: 22, color: C.teal, lineHeight: 1, wordBreak: "break-word" }}>{entry.etaText}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
               <span style={{ fontFamily: mono, fontSize: 8, color: C.teal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>ID: {entry.matchInfo.id}</span>
               {entry.matchInfo.hasRefrigeration && <span style={{ fontFamily: mono, fontSize: 8, color: C.teal }}>❄ COLD CHAIN ACTIVE</span>}
            </div>
         </div>
      ) : (
        <div style={{ padding: "12px", borderRight: `1px solid ${C.rule}`, flex: "1 1 15%", minWidth: 90 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 7 }}>FLAGS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {entry.flags.map((f, i) => (
              <span key={i} style={{ fontFamily: mono, fontSize: 9, color: C.mid, wordBreak: "break-word" }}>• {f.toUpperCase()}</span>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "flex-end", flex: "1 1 25%", minWidth: 130 }}>
        {isDispatched ? (
          <div style={{ 
            fontFamily: mono, color: "#EAB308", textAlign: "right",
            display: "flex", flexDirection: "column", gap: 4,
            wordBreak: "break-word", whiteSpace: "normal" 
          }}>
            <span style={{ fontSize: 11, fontWeight: "bold", letterSpacing: "0.1em", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 5, flexWrap: "wrap" }}>
              <Navigation size={12} color={"#EAB308"} style={{ marginTop: 2, flexShrink: 0 }} /> 
              <span>ASSETS DISPATCHED</span>
            </span>
            <span style={{ fontSize: 9, color: C.text, lineHeight: 1.4, opacity: 0.8 }}>
              Will reach in {entry.etaText || "calculating..."}
            </span>
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => onDispatch(entry.id)} 
            style={{ 
              fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: u.color, 
              background: u.dim, border: `1px solid ${u.bd}`, padding: "8px 14px", 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s",
              flexShrink: 0
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
  const isDispatched = entry.dispatched;
  const urgencyKey = entry.emergencyDetails?.urgency || entry.urgency;
  const baseUrgency = URGENCY[urgencyKey] || URGENCY.LOW;

  const u = isDispatched 
    ? { ...baseUrgency, color: "#EAB308", dim: "rgba(234,179,8,0.1)", bd: "rgba(234,179,8,0.3)" } 
    : baseUrgency;

  return (
    <div onClick={onClick} style={{
      borderBottom: `1px solid ${C.rule}`,
      background: isActive ? u.dim : "transparent",
      borderLeft: `3px solid ${isActive || isDispatched ? u.color : "transparent"}`,
      padding: "11px 14px 11px 12px",
      cursor: "pointer", transition: "background 0.18s",
      opacity: isDispatched ? 0.7 : 1, 
      animation: isNew ? "vr-slide 0.4s cubic-bezier(0.22,1,0.36,1)" : "none",
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.faint; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isDispatched ? (
             <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.18em", padding: "2px 6px", background: u.dim, border: `1px solid ${u.bd}`, color: u.color }}>
               EN ROUTE
             </span>
          ) : (
            <>
              {urgencyKey === "CRITICAL" && <Ping color={C.red} sz={4} />}
              <Badge level={urgencyKey} />
            </>
          )}
        </div>
        <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.08em" }}>{entry.ts}</span>
      </div>

      <div style={{ fontFamily: bebas, fontSize: 17, color: isDispatched ? "#EAB308" : C.text, letterSpacing: "0.05em", lineHeight: 1.1, marginBottom: 4 }}>
        {entry.emergencyDetails?.heading || entry.title}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
        <MapPin size={9} color={C.dim} />
        <span style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>{entry.loc}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 7 }}>
        {(entry.emergencyDetails?.items || entry.items).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontFamily: bebas, fontSize: 14, color: u.color, lineHeight: 1 }}>{item.quantity || item.q}</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.mid }}>{item.unit || item.u ? (item.unit || item.u) + " " : ""}{item.name || item.n}</span>
          </div>
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
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [viewMode, setViewMode] = useState("radar");
  const [dispatchedCount, setDispatchedCount] = useState(14);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
  });

  const active = feed.find(f => f.id === activeId) || feed[0];

  const mapCenter = useMemo(() => ({ lat: 26.8638, lng: 80.9228 }), []);
  const mapContainerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const mapOptions = useMemo(() => ({ 
    disableDefaultUI: true, 
    gestureHandling: "greedy",
    backgroundColor: C.bg 
  }), []);

  useEffect(() => {
    setDirectionsResponse(null);
  }, [activeId]);

  useEffect(() => {
    if (!isLoaded || !active || !active.dispatched) return;

    const directionsService = new window.google.maps.DirectionsService();

    const origin = active.matchInfo?.lat
      ? { lat: Number(active.matchInfo.lat), lng: Number(active.matchInfo.lng) }
      : { lat: 26.8638, lng: 80.9228 }; 

    const destination = { lat: Number(active.coords.lat), lng: Number(active.coords.lng) };

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
        } else {
          console.error(`Native Route Error: ${status}`);
        }
      }
    );
  }, [isLoaded, active?.id, active?.dispatched, active?.matchInfo]);

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

  const handleDispatch = (idToDispatch) => {
    setFeed(prevFeed => prevFeed.map(item => 
      item.id === idToDispatch ? { ...item, dispatched: true } : item
    ));
    
    setDispatchedCount(prev => prev + 1);

    setTimeout(() => {
      setFeed(prevFeed => prevFeed.filter(item => item.id !== idToDispatch));
      setActiveId(prevId => prevId === idToDispatch ? null : prevId);
    }, 600000); 
  };
  
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [feed]);

  async function extract() {
  if (!input.trim() || loading) return;
  setLoading(true);
  setError(null);

  try {
    // Use the env var — don't hardcode the Cloud Run URL
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    const res = await fetch(`${API_BASE_URL}/api/match`, {  // ← use the variable
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_API_KEY
      },
      body: JSON.stringify({
        text: input.trim(),
        hospitalLocation: { lat: 26.8638, lng: 80.9228 },
        requiresColdChain: coldChain
      }),
    });

    if (!res.ok) throw new Error(`Server Error: ${res.status}`);

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Match failed.");

      const now  = new Date();
      const ts   = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      
      const entry = { 
        id: Date.now(), 
        ts, 
        title: data.emergencyDetails?.heading || "EMERGENCY LOGISTICS REQUEST",
        urgency: data.emergencyDetails?.urgency || "HIGH",
        loc: data.match.name,
        items: data.emergencyDetails?.items || [{ name: "Requested Assets", quantity: 1, unit: "batch" }],
        flags: [coldChain ? "Cold Chain" : "Standard", data.match.status || "Active"],
        coords: { 
          x: 32 + Math.random() * 36, 
          y: 28 + Math.random() * 40,
          lat: 26.8638 + (Math.random() - 0.5) * 0.08, 
          lng: 80.9228 + (Math.random() - 0.5) * 0.08  
        },
        etaText: data.etaText,
        matchInfo: data.match,
        emergencyDetails: data.emergencyDetails 
      };
      
      setActiveId(entry.id);
      setNewId(entry.id); 
      setFeed(prev => [entry, ...prev]);
      setInput("");
      
    } catch (err) { 
        console.error(err);
        setError("Fetch failed. Is backend running? Are ports correct?"); 
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
        
        .vr-ta::-webkit-scrollbar { display: none; }
        
        .vr-ta { -ms-overflow-style: none; scrollbar-width: none; }

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
        width: "100%", 
        height: isMobile ? "auto" : "100vh", 
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "190px 1fr 306px",
        gridTemplateRows: isMobile ? "auto auto auto auto" : "46px 1fr",
        background: C.bg, color: C.text,
        overflow: isMobile ? "auto" : "hidden",
      }}>

        {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
        <div style={{
          gridColumn: "1 / -1", gridRow: "1",
          background: C.panel,
          borderBottom: `1px solid ${C.ruleHard}`,
          display: "flex", alignItems: "center",
          padding: "0 18px", gap: 0,
          flexWrap: isMobile ? "wrap" : "nowrap",
          minHeight: isMobile ? "auto" : "46px",
          paddingTop: isMobile ? "8px" : "0",
          paddingBottom: isMobile ? "8px" : "0",
          animation: "vr-in 0.4s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: 18, borderRight: `1px solid ${C.rule}` }}>
            <Siren size={14} color={C.red} strokeWidth={2.5} />
            <div style={{ fontFamily: bebas, fontSize: 22, color: C.text, letterSpacing: "0.1em", marginTop: 2 }}>
              VITALROUTE
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, flex: 1, paddingLeft: 1 }}>
            {[["NETWORK","LIVE",C.teal],["FEEDS", feed.length.toString() ,C.mid],["UNITS ACTIVE","12",C.mid],["SIGNAL","98%",C.teal]].map(([l,v,vc]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", borderRight: `1px solid ${C.rule}` }}>
                <span style={{ fontFamily: mono, fontSize: 9, color: C.dim, letterSpacing: "0.12em" }}>{l}</span>
                <span style={{ fontFamily: bebas, fontSize: 14, color: vc, letterSpacing: "0.08em" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 7, paddingLeft: 18, borderLeft: `1px solid ${C.rule}` }}>
            <Ping color={C.teal} sz={4} />
            <span style={{ fontFamily: mono, fontSize: 9, color: C.teal, letterSpacing: "0.12em" }}>ALL SYSTEMS NOMINAL</span>
          </div>
        </div>

        {/* ══ LEFT PANEL — STATS ═══════════════════════════════════════════════ */}
        <div style={{ 
          gridColumn: isMobile ? "1 / -1" : "1", // THE FIX: Fills width on mobile safely
          gridRow: isMobile ? "4" : "2", 
          width: "100%", 
          borderRight: isMobile ? "none" : `1px solid ${C.rule}`,
          borderTop: isMobile ? `1px solid ${C.rule}` : "none",
          display: "flex", 
          flexDirection: isMobile ? "row" : "column", 
          flexWrap: isMobile ? "wrap" : "nowrap",
          minHeight: 0, 
          overflowY: "auto"
        }}>
        
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.rule}` }}>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>OPERATIONAL STATUS</span>
          </div>

          {[
            { 
              label: "ACTIVE INCIDENTS",  
              val: feed.filter(f => !f.dispatched && (f.urgency === "CRITICAL" || f.urgency === "HIGH")).length, 
              color: C.red,    
              sub: "REQUIRES IMMEDIATE ACTION" 
            },
            { 
              label: "REQUESTS QUEUED",   
              val: feed.filter(f => !f.dispatched).length, 
              color: C.orange, 
              sub: "AWAITING DISPATCH" 
            },
            { 
              label: "UNITS DISPATCHED",  
              val: dispatchedCount,          
              color: C.teal,   
              sub: "ASSETS EN ROUTE" 
            },
          ].map((s, i) => (
            <div key={i} style={{ padding: "16px 14px", borderBottom: `1px solid ${C.rule}`, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: bebas, fontSize: 56, color: s.color, lineHeight: 0.9, letterSpacing: "0.02em" }}>{s.val}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.dim, marginTop: 6, letterSpacing: "0.1em" }}>{s.sub}</div>
            </div>
          ))}

          <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.rule}`, marginTop: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Radio size={10} color={C.dim} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>CHANNEL 7 OPEN</span>
            </div>
          </div>
        </div>

        {/* ══ CENTER — RADAR + DETAIL STRIP ════════════════════════════════════ */}
        <div style={{
          gridColumn: isMobile ? "1 / -1" : "2", // THE FIX: Forces column 1 on mobile
          gridRow: "2", // Ensures it stays right beneath Top bar
          display: "flex", flexDirection: "column",
          alignItems: "center", position: "relative",
          overflow: "hidden",
          minHeight: 0, 
          height: isMobile ? "50vh" : "100%", // THE FIX: Strict mobile boundary
          animation: "vr-in 0.5s ease 0.15s both",
        }}>

          <div className="vr-scan-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,56,32,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 0 10px", width: "100%", paddingBottom: active ? 0 : 10, position: "relative" }}>
            
            <div 
              onClick={() => setViewMode(prev => prev === "radar" ? "satellite" : "radar")}
              style={{ 
                position: "absolute", top: 0, right: 10, zIndex: 20, 
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer" 
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 9, color: C.teal, letterSpacing: "0.1em" }}>
                {viewMode === "radar" ? "TACTICAL" : "SATELLITE"}
              </span>
              <div style={{ 
                position: "relative", width: 36, height: 20, 
                background: viewMode === "satellite" ? C.teal : C.dim, 
                borderRadius: 20, transition: "background 0.3s" 
              }}>
                <div style={{ 
                  position: "absolute", top: 2, 
                  left: viewMode === "satellite" ? 18 : 2, 
                  width: 16, height: 16, background: C.bg, borderRadius: "50%", 
                  transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)", 
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)" 
                }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ height: 1, width: 40, background: C.rule }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.2em" }}>REGIONAL DISPATCH GRID</span>
              <div style={{ height: 1, width: 40, background: C.rule }} />
            </div>

            {viewMode === "radar" ? (
              <Radar entries={feed} activeId={activeId} onSelect={setActiveId} />
            ) : (
              <div style={{ flex: 1, width: "100%", height: "100%", minHeight: 300, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.ruleHard}`, position: "relative" }}>
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}                   
                    zoom={14}
                    mapTypeId="hybrid"
                    options={mapOptions}                  

                  >
                    {directionsResponse && active && active.dispatched && (
                      <DirectionsRenderer
                        options={{
                          directions: directionsResponse,
                          suppressMarkers: true, 
                          polylineOptions: {
                            strokeColor: "#3D8A78", 
                            strokeWeight: 4,
                            strokeOpacity: 0.8,
                          },
                        }}
                      />
                    )}

                    {active && active.dispatched && active.matchInfo && (
                      <OverlayViewF 
                        position={{ lat: active.matchInfo.lat, lng: active.matchInfo.lng }} 
                        mapPaneName="overlayMouseTarget"
                        getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -(height / 2) })}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
                          <div style={{
                            width: 10, height: 10, background: "#3D8A78", 
                            border: `2px solid ${C.bg}`, boxShadow: `0 0 10px #3D8A78`
                          }} />
                          <div style={{
                            marginTop: 6, fontFamily: mono, fontSize: 8, color: "#3D8A78", 
                            background: C.bg, padding: "2px 6px", border: `1px solid #3D8A78`, 
                            whiteSpace: "nowrap", boxShadow: `0 4px 6px rgba(0,0,0,0.4)`
                          }}>
                            SUPPLIER: {active.matchInfo.name.toUpperCase()}
                          </div>
                        </div>
                      </OverlayViewF>
                    )}

                    {feed.map(e => {
                      const u = URGENCY[e.emergencyDetails?.urgency || e.urgency] || URGENCY.LOW;
                      const isA = e.id === activeId;
                      const dotColor = e.dispatched ? "#EAB308" : u.color;
                      
                      return (
                        <OverlayViewF 
                          key={e.id} 
                          position={{ lat: e.coords.lat, lng: e.coords.lng }} 
                          mapPaneName="overlayMouseTarget"
                          getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -(height / 2) })}
                        >
                          <div 
                            onClick={() => setActiveId(e.id)} 
                            style={{ 
                              position: "absolute", 
                              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", zIndex: isA ? 10 : 1 
                            }}
                          >
                            {isA && <span style={{ position: "absolute", inset: -5, borderRadius: "50%", border: `1px solid ${dotColor}`, opacity: 0.5, animation: "vr-ring 1.8s ease-out infinite" }} />}
                            <div style={{
                              width: isA ? 12 : 8, height: isA ? 12 : 8, borderRadius: "50%",
                              background: dotColor, opacity: isA ? 1 : 0.85,
                              boxShadow: isA ? `0 0 14px ${dotColor}, 0 0 5px ${dotColor}` : "none",
                              transition: "all 0.25s", border: `1px solid ${C.bg}`
                            }} />
                            {isA && (
                              <div style={{
                                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                                fontFamily: mono, fontSize: 8, color: dotColor, letterSpacing: "0.12em",
                                whiteSpace: "nowrap", background: C.bg, padding: "2px 6px",
                                border: `1px solid ${dotColor}`, boxShadow: `0 4px 6px rgba(0,0,0,0.4)`
                              }}>
                                {(e.emergencyDetails?.heading || e.title).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </OverlayViewF>
                      );
                    })}
                  </GoogleMap>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", background: C.panel }}>
                    <Loader2 size={24} color={C.dim} style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 18, marginTop: 4 }}>
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

          {active && <DetailStrip key={activeId} entry={active} onDispatch={handleDispatch} />}

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            transform: active ? "translateY(100%)" : "none",
          }} />
        </div>

        {/* ══ RIGHT SIDEBAR — LIVE FEED ════════════════════════════════════════ */}
        <div style={{
          gridColumn: isMobile ? "1 / -1" : "3", // THE FIX: Fills width on mobile safely
          gridRow: isMobile ? "3" : "2", // Right below Center Panel on mobile
          background: C.panel,
          borderLeft: isMobile ? "none" : `1px solid ${C.ruleHard}`,
          borderTop: isMobile ? `1px solid ${C.ruleHard}` : "none",
          display: "flex", flexDirection: "column",
          height: isMobile ? "65vh" : "100%", // THE FIX: Bounded height fixes the flex-overflow bug!
          minHeight: 0, 
          overflow: "hidden" 
        }}>

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

          <div 
            className="vr-feed" 
            ref={feedRef} 
            style={{ 
              flex: 1, 
              overflowY: "auto", 
              padding: "10px", 
              display: "flex", flexDirection: "column", gap: 10 
            }}
          >
            {feed.map(item => (
              <FeedCard
                key={item.id}
                entry={item}
                isNew={item.id === newId}
                isActive={item.id === activeId}
                onClick={() => setActiveId(item.id)}
              />
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${C.ruleHard}`, background: C.panel, flexShrink: 0 }}>
            <div style={{ padding: "9px 14px 7px", borderBottom: `1px solid ${C.rule}`, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, background: btnOn ? C.red : C.dim, display: "inline-block" }} />
              <span style={{ fontFamily: mono, fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>CRISIS COMMAND INPUT</span>
            </div>

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
                  padding: "8px 30px 8px 10px", 
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
                  animation: isListening ? "vr-ping 1.5s infinite" : "none", 
                }}
              >
                <Mic size={16} />
              </button>
            </div>
            
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

            {error && (
              <div style={{ margin: "0 12px 10px", padding: "6px 10px", background: C.redDim, border: `1px solid ${C.redBd}`, display: "flex", alignItems: "center", gap: 7 }}>
                <AlertTriangle size={10} color={C.red} />
                <span style={{ fontFamily: mono, fontSize: 9.5, color: C.red, flex: 1 }}>{error}</span>
                <X size={10} color={C.dim} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setError(null)} />
              </div>
            )}

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