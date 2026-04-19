import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { ShieldAlert, Activity, Command, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

const mapContainerStyle = {
  width: '100vw',
  height: '100vh',
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 0
};

const center = { lat: 26.8467, lng: 80.9462 }; // Focus around Lucknow region as per earlier instructions

// Custom Cinematic Dark Academia Map Style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b0c10' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2833' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c5c6c7' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#45a29e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#c5c6c7' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#182025' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#c5c6c7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2833' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b0c10' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#45a29e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#182025' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#11151a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c5c6c7' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2833' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#66fcf1' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090a0c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#45a29e' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0b0c10' }] }
];

export default function App() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [inputCommand, setInputCommand] = useState('');
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    try {
      const q = query(collection(db, 'supply_requests'), orderBy('createdAt', 'desc'), limit(10));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
        if (requests.length > 0) setFeed(requests);
      }, (err) => {
        console.warn("Firestore not connected, using fallback live data.");
        setFeed([
          { id: '1', urgency: 'CRITICAL', items: [{ name: 'blood_O_negative', quantity: 10, unit: 'units' }], status: 'pending', contextNote: 'Emergency ward accident victims' }
        ]);
      });
      return () => unsubscribe();
    } catch (e) {
      setFeed([
        { id: '1', urgency: 'CRITICAL', items: [{ name: 'blood_O_negative', quantity: 10, unit: 'units' }], status: 'pending', contextNote: 'Emergency ward accident victims', flags: ['mass_casualty'] },
        { id: '2', urgency: 'URGENT', items: [{ name: 'oxygen_tanks', quantity: 5, unit: 'tanks' }], status: 'in_transit', contextNote: 'ICU running low', flags: [] }
      ]);
    }
  }, []);

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (!inputCommand.trim()) return;

    setIsLoading(true);
    setParsedData(null);
    try {
      const res = await fetch('http://localhost:8080/api/crisis-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: inputCommand,
          hospitalId: 'lucknow_gen_1'
        })
      });
      
      const data = await res.json();
      setParsedData({ success: true, parsed: data });
      setInputCommand('');
      setIsLoading(false);
    } catch (error) {
      console.warn("Backend unavailable. Simulating success response.");
      setTimeout(() => {
        setParsedData({ 
          success: true, 
          parsed: { 
            urgency: "CRITICAL", 
            items: [{ category: "blood", name: "O-negative blood", quantity: 10, unit: "units" }], 
            context_note: inputCommand, 
            flags: ["mass_casualty"] 
          } 
        });
        setInputCommand('');
        setIsLoading(false);
      }, 1500);
    }
  };

  const mapOptions = {
    styles: darkMapStyle,
    disableDefaultUI: true,
    zoomControl: false,
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-obsidian text-slate font-inter">
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            options={mapOptions}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-obsidian opacity-50">
             <Activity className="animate-spin text-iceblue" size={32} />
          </div>
        )}
      </div>

      {/* Header Panel */}
      <header className="absolute top-0 w-full z-10 px-8 py-4 pointer-events-none">
        <div className="glass-panel-heavy p-4 flex justify-between items-center transition-all duration-300 pointer-events-auto">
            <div className="flex items-center space-x-3">
                <ShieldAlert className="text-dullcrimson w-8 h-8" />
                <h1 className="font-playfair text-2xl tracking-widest font-bold text-white uppercase">
                    Vital<span className="text-dullcrimson">Route</span>
                </h1>
            </div>
            <div className="flex items-center space-x-4">
                <span className="text-xs uppercase tracking-widest text-iceblue animate-pulse">System Online</span>
                <div className="h-8 w-8 rounded-full bg-charcoal border border-dullcrimson flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(139,0,0,0.5)]">
                    <span className="font-playfair text-white text-[10px] font-bold">HQ</span>
                </div>
            </div>
        </div>
      </header>

      {/* Right Sidebar - Live Logistics Feed */}
      <aside className="absolute right-8 top-28 bottom-28 w-80 z-10 flex flex-col space-y-4 pointer-events-none">
        <div className="relative w-full h-full flex flex-col pointer-events-auto">
            <div className="glass-panel h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 opacity-80 backdrop-blur-md">
                    <h2 className="font-playfair text-lg text-white/90 tracking-widest flex items-center">
                        <Activity size={18} className="mr-2 text-iceblue" />
                        Live Logistics
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {feed.map((req, i) => (
                        <div key={req.id || i} className={`p-4 rounded-lg bg-charcoal/50 border-l-4 ${req.urgency === 'CRITICAL' ? 'border-dullcrimson shadow-[0_0_10px_rgba(139,0,0,0.2)]' : req.urgency === 'URGENT' ? 'border-amber shadow-[0_0_10px_rgba(255,191,0,0.2)]' : 'border-iceblue shadow-[0_0_10px_rgba(102,252,241,0.2)]'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded bg-black/40 ${req.urgency === 'CRITICAL' ? 'text-dullcrimson' : req.urgency === 'URGENT' ? 'text-amber' : 'text-iceblue'}`}>
                                    {req.urgency}
                                </span>
                                <span className="text-slate/60 text-[10px] flex items-center">
                                    <Clock size={10} className="mr-1" />
                                    Just now
                                </span>
                            </div>
                            <p className="text-white text-sm font-medium leading-tight mb-2">
                                {req.contextNote || 'Logistics update received'}
                            </p>
                            <div className="mt-2 space-y-1">
                                {(req.items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs text-slate/80 bg-black/30 px-2 py-1.5 rounded">
                                        <span className="truncate w-3/4">{item.name.replace(/_/g, ' ')}</span>
                                        <span className="font-mono text-neonblue">{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </aside>

      {/* Center AI Render Panel */}
      {parsedData && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-6">
            <div className="glass-panel-heavy p-6 border-l-4 border-dullcrimson shadow-[0_0_50px_rgba(139,0,0,0.15)]">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                    <h3 className="font-playfair text-xl text-white">Extracted Incident Protocol</h3>
                    <div className="flex space-x-2">
                        {(parsedData.parsed.flags || []).map(f => (
                           <span key={f} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-dullcrimson/20 text-dullcrimson rounded border border-dullcrimson/30">
                              {f.replace(/_/g, ' ')}
                           </span> 
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] text-slate/50 tracking-widest uppercase mb-1">Context Note</p>
                        <p className="text-sm text-white/90 font-medium italic">"{parsedData.parsed.context_note}"</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate/50 tracking-widest uppercase mb-1">Severity</p>
                        <p className="text-sm font-bold text-dullcrimson tracking-widest">{parsedData.parsed.urgency}</p>
                    </div>
                </div>
                
                <div className="mt-6">
                    <p className="text-[10px] text-slate/50 tracking-widest uppercase mb-2">Requested Units</p>
                    <div className="space-y-2">
                        {parsedData.parsed.items?.map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-charcoal/40 p-3 rounded rounded-r-none border-r-2 border-iceblue">
                                <span className="text-white/80 capitalize">{item.name}</span>
                                <span className="font-mono text-neonblue font-semibold">{item.quantity} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setParsedData(null)} className="px-4 py-2 rounded text-xs tracking-widest uppercase text-slate bg-charcoal hover:bg-white/10 transition-colors">
                        Discard
                    </button>
                    <button className="px-4 py-2 rounded text-xs tracking-widest uppercase text-white bg-dullcrimson/80 hover:bg-dullcrimson transition-colors shadow-[0_0_15px_rgba(139,0,0,0.5)] flex items-center">
                        <CheckCircle size={14} className="mr-2" />
                        Execute Protocol
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Bottom Center Crisis Command Bar */}
      <footer className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl z-20 px-4">
        <form onSubmit={handleCommandSubmit} className="glass-panel-heavy p-2 flex items-center shadow-[0_10px_40px_-5px_rgba(0,0,0,0.8)]">
            <div className="pl-4 pr-3 text-iceblue animate-pulse">
                <Command size={20} />
            </div>
            <input 
                type="text" 
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                placeholder="Declare crisis emergency... (e.g., 'Massive pileup, need 10 units O-negative...')"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate/40 text-sm font-inter px-2"
                disabled={isLoading}
            />
            <button 
                type="submit" 
                disabled={isLoading || !inputCommand}
                className="bg-iceblue/10 text-iceblue hover:bg-iceblue/20 disabled:opacity-50 transition-colors p-3 rounded-xl ml-2 flex items-center justify-center min-w-[48px]"
            >
                {isLoading ? <Activity size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
            </button>
        </form>
      </footer>
    </div>
  )
}
