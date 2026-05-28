import { useState, useEffect, useMemo, useRef } from "react";

// ── Persistence ────────────────────────────────────────────────────────────
const STORAGE_KEY = "arco_setlist_v1";
const SETTINGS_KEY = "arco_setlist_settings_v1";

const loadSongs = () => {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
};
const saveSongs = (songs) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); } catch {}
};
const loadSettings = () => {
  try { const d = localStorage.getItem(SETTINGS_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
};
const saveSettings = (s) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
};

// ── Default data ───────────────────────────────────────────────────────────
const DEFAULT_SONGS = [
  { id:1, title:"Canon in D", artist:"Pachelbel", adjustableVolume:true,  quality:9, notes:"Great opener. Crowd favorite." },
  { id:2, title:"A Thousand Years", artist:"Christina Perri", adjustableVolume:true,  quality:10, notes:"Bridal processional staple." },
  { id:3, title:"Clair de Lune", artist:"Debussy", adjustableVolume:false, quality:8, notes:"Need more practice on the bridge." },
  { id:4, title:"At Last", artist:"Etta James", adjustableVolume:true,  quality:7, notes:"Unity candle or cocktail hour." },
  { id:5, title:"Signed, Sealed, Delivered", artist:"Stevie Wonder", adjustableVolume:true,  quality:9, notes:"Recessional energy is perfect." },
];

// ── Accent presets ─────────────────────────────────────────────────────────
const ACCENTS = [
  { id:"blue",   label:"Blue",   color:"#0071e3" },
  { id:"rose",   label:"Rose",   color:"#e3406b" },
  { id:"violet", label:"Violet", color:"#7c3aed" },
  { id:"sage",   label:"Sage",   color:"#2d8c5e" },
  { id:"amber",  label:"Amber",  color:"#c97200" },
  { id:"graphite",label:"Graphite",color:"#475569"},
];

const lighten = (hex, amt=0.45) => {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,Math.round(r+(255-r)*amt))},${Math.min(255,Math.round(g+(255-g)*amt))},${Math.min(255,Math.round(b+(255-b)*amt))})`;
};

// ── Quality helpers ────────────────────────────────────────────────────────
const qualityLabel = (q) => {
  if (q <= 4)  return "Not Ready";
  if (q <= 7)  return "Needs Work";
  return "Ready";
};
// Fixed stage colors: Rose / Amber / Sage
const STAGE_COLORS = { notready:"#e3406b", needswork:"#c97200", ready:"#2d8c5e" };
const qualityColor = (q) => {
  if (q <= 4) return STAGE_COLORS.notready;
  if (q <= 7) return STAGE_COLORS.needswork;
  return STAGE_COLORS.ready;
};

let _id = Date.now();
const newId = () => ++_id;

// ── Tokens ─────────────────────────────────────────────────────────────────
const makeTokens = (accent, dark) => {
  const a2 = lighten(accent, 0.42);
  if (dark) return {
    accent, a2,
    bg:"#111113", surface:"#1c1c1e", surface2:"#28282a", surface3:"#323234",
    border:"rgba(255,255,255,0.08)", borderStrong:"rgba(255,255,255,0.14)",
    text:"#f5f5f7", textSub:"#98989d", textMuted:"#48484a",
    inputBg:"#28282a", inputBorder:"rgba(255,255,255,0.1)",
    header:"rgba(17,17,19,0.9)",
    shadow:"0 2px 16px rgba(0,0,0,0.45)",
    shadowCard:"0 1px 4px rgba(0,0,0,0.35)",
    green:"#30d158", red:"#ff453a", yellow:"#ffd60a", orange:"#ff9f0a",
  };
  return {
    accent, a2,
    bg:"#f2f2f7", surface:"#ffffff", surface2:"#f2f2f7", surface3:"#e5e5ea",
    border:"rgba(0,0,0,0.07)", borderStrong:"rgba(0,0,0,0.13)",
    text:"#1d1d1f", textSub:"#86868b", textMuted:"#c7c7cc",
    inputBg:"#ffffff", inputBorder:"rgba(0,0,0,0.12)",
    header:"rgba(242,242,247,0.9)",
    shadow:"0 2px 16px rgba(0,0,0,0.10)",
    shadowCard:"0 1px 3px rgba(0,0,0,0.07)",
    green:"#34c759", red:"#ff3b30", yellow:"#ffcc00", orange:"#ff9500",
  };
};

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────
  const [songs, setSongs] = useState(() => loadSongs() || DEFAULT_SONGS);
  const [dark, setDark] = useState(() => loadSettings()?.dark ?? false);
  const [accentId, setAccentId] = useState(() => loadSettings()?.accentId ?? "blue");
  const [customAccent, setCustomAccent] = useState(() => loadSettings()?.customAccent ?? "#0071e3");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("title"); // title | quality | artist
  const [filterVolume, setFilterVolume] = useState("all"); // all | yes | no
  const [filterStage, setFilterStage] = useState("all");   // all | notready | needswork | ready
  const [showForm, setShowForm] = useState(false);
  const [editSong, setEditSong] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window!=="undefined"?window.innerWidth:1200);

  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = windowWidth < 768;

  // ── Persist ──────────────────────────────────────────────────────────
  useEffect(() => { saveSongs(songs); }, [songs]);
  useEffect(() => { saveSettings({ dark, accentId, customAccent }); }, [dark, accentId, customAccent]);

  const accent = accentId === "custom" ? customAccent : (ACCENTS.find(a=>a.id===accentId)||ACCENTS[0]).color;
  const tk = useMemo(() => makeTokens(accent, dark), [accent, dark]);

  // ── Filtered / sorted list ────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...songs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
    }
    if (filterVolume === "yes") list = list.filter(s => s.adjustableVolume);
    if (filterVolume === "no")  list = list.filter(s => !s.adjustableVolume);
    if (filterStage === "notready")  list = list.filter(s => s.quality <= 4);
    if (filterStage === "needswork") list = list.filter(s => s.quality >= 5 && s.quality <= 7);
    if (filterStage === "ready")     list = list.filter(s => s.quality >= 8);
    list.sort((a,b) => {
      if (sortBy === "quality") return b.quality - a.quality;
      if (sortBy === "artist")  return a.artist.localeCompare(b.artist);
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [songs, search, sortBy, filterVolume, filterStage]);

  // ── Song CRUD ────────────────────────────────────────────────────────
  const openNew  = () => { setEditSong({ id:newId(), title:"", artist:"", adjustableVolume:true, quality:7, notes:"" }); setShowForm(true); };
  const openEdit = (s) => { setEditSong({...s}); setShowForm(true); };
  const saveSong = () => {
    if (!editSong.title.trim()) return alert("Song title is required.");
    setSongs(prev => prev.find(s=>s.id===editSong.id) ? prev.map(s=>s.id===editSong.id?editSong:s) : [...prev,editSong]);
    setShowForm(false); setEditSong(null);
  };
  const deleteSong = (id) => { if (confirm("Remove this song?")) setSongs(prev=>prev.filter(s=>s.id!==id)); };
  const updEdit = (f,v) => setEditSong(s=>({...s,[f]:v}));

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: songs.length,
    ready: songs.filter(s=>s.quality>=8).length,
    avgQ: songs.length ? (songs.reduce((a,s)=>a+s.quality,0)/songs.length).toFixed(1) : "—",
    volYes: songs.filter(s=>s.adjustableVolume).length,
  }), [songs]);

  // ── Shared styles ────────────────────────────────────────────────────
  const btnPrimary = { background:tk.accent, color:"#fff", border:"none", borderRadius:12, padding:isMobile?"12px 20px":"10px 20px", fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit", WebkitTapHighlightColor:"transparent", letterSpacing:-0.2 };
  const btnGhost   = { background:"none", border:`1.5px solid ${tk.borderStrong}`, color:tk.text, borderRadius:12, padding:isMobile?"12px 18px":"10px 18px", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-text-size-adjust:100%;}
        body{background:${tk.bg};}
        input,select,textarea{font-family:'DM Sans',-apple-system,sans-serif!important;}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${tk.accent}!important;box-shadow:0 0 0 3px ${tk.accent}28!important;}
        ::placeholder{color:${tk.textMuted}!important;}
        select{-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868b' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
        .song-row:hover{background:${dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.02)"}!important;transition:background 0.12s;}
        .song-row:active{background:${dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.04)"}!important;}
        .pill-btn{transition:all 0.15s!important;}
        .pill-btn:hover{opacity:0.85!important;}
        .icon-btn:hover{background:${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.07)"}!important;}
        input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:${tk.surface3};outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${tk.accent};cursor:pointer;box-shadow:0 2px 8px ${tk.accent}55;}
        input[type=color]{-webkit-appearance:none;appearance:none;width:36px;height:36px;border:none;border-radius:50%;padding:0;cursor:pointer;background:none;}
        input[type=color]::-webkit-color-swatch-wrapper{padding:0;border-radius:50%;}
        input[type=color]::-webkit-color-swatch{border:none;border-radius:50%;}
        @keyframes slideUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        .animate-up{animation:slideUp 0.28s cubic-bezier(0.34,1.1,0.64,1) both;}
        .fade-in{animation:fadeIn 0.2s ease both;}
      `}</style>

      <div style={{minHeight:"100vh",background:tk.bg,fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif",color:tk.text,transition:"background 0.2s,color 0.2s"}}>

        {/* ══ HEADER ══ */}
        <header style={{position:"sticky",top:0,zIndex:100,background:tk.header,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:`1px solid ${tk.border}`}}>
          <div style={{maxWidth:900,margin:"0 auto",padding:`0 ${isMobile?16:28}px`,height:isMobile?54:62,display:"flex",alignItems:"center",gap:12}}>
            {/* Logo */}
            <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(145deg,${tk.accent},${tk.a2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,boxShadow:`0 3px 10px ${tk.accent}44`}}>🎵</div>
            <div style={{flex:1}}>
              <div style={{fontSize:isMobile?16:18,fontWeight:700,letterSpacing:-0.5,color:tk.text,lineHeight:1}}>Set List</div>
              {!isMobile && <div style={{fontSize:11,color:tk.textSub,letterSpacing:0.2,marginTop:2}}>Master Performance Library</div>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {!isMobile && (
                <button onClick={openNew} style={{...btnPrimary,padding:"8px 18px",borderRadius:20,fontSize:14}}>+ Add Song</button>
              )}
              <button onClick={()=>setShowSettings(true)} className="icon-btn" style={{width:36,height:36,borderRadius:10,border:`1px solid ${tk.border}`,background:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.12s",WebkitTapHighlightColor:"transparent"}}>⚙️</button>
            </div>
          </div>
        </header>

        {/* ══ MAIN ══ */}
        <main style={{maxWidth:900,margin:"0 auto",padding:isMobile?`20px 14px 100px`:"28px 28px 60px"}}>

          {/* ── Stats row ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:isMobile?8:12,marginBottom:isMobile?20:24}} className="animate-up">
            {[
              { label:"Songs",         value:stats.total },
              { label:"Stage Ready",   value:stats.ready },
              { label:"Avg Quality",   value:stats.avgQ  },
              { label:"Adjustable Vol",value:stats.volYes},
            ].map((s,i) => (
              <div key={i} style={{background:tk.surface,borderRadius:isMobile?14:16,padding:isMobile?"14px 10px":"18px 18px",border:`1px solid ${tk.border}`,boxShadow:tk.shadowCard,textAlign:"center"}}>
                <div style={{fontSize:isMobile?22:28,fontWeight:700,color:tk.accent,letterSpacing:-0.5,lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:isMobile?10:11,color:tk.textSub,marginTop:5,fontWeight:500,letterSpacing:0.1}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Search + Filters ── */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}} className="animate-up">
            {/* Search + Sort row */}
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:10}}>
              <div style={{position:"relative",flex:1}}>
                <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:tk.textSub,pointerEvents:"none"}}>🔍</div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search songs or artists…"
                  style={{width:"100%",padding:"10px 12px 10px 36px",border:`1px solid ${tk.inputBorder}`,borderRadius:12,fontSize:15,background:tk.inputBg,color:tk.text}}/>
              </div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{padding:"10px 36px 10px 13px",border:`1px solid ${tk.inputBorder}`,borderRadius:12,fontSize:14,background:tk.inputBg,color:tk.text,minWidth:148}}>
                <option value="title">Sort: Title A–Z</option>
                <option value="artist">Sort: Artist A–Z</option>
                <option value="quality">Sort: Quality ↓</option>
              </select>
            </div>

            {/* Filter pills row */}
            <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:10}}>
              {/* Volume filter */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap",minWidth:isMobile?60:undefined}}>Volume</span>
                <div style={{display:"flex",gap:6}}>
                  {[{v:"all",l:"All"},{v:"yes",l:"🔊 Adjustable"},{v:"no",l:"🔇 Fixed"}].map(o=>(
                    <button key={o.v} className="pill-btn" onClick={()=>setFilterVolume(o.v)}
                      style={{padding:"7px 12px",borderRadius:10,border:`1.5px solid ${filterVolume===o.v?tk.accent:tk.borderStrong}`,background:filterVolume===o.v?tk.accent+"18":"none",color:filterVolume===o.v?tk.accent:tk.textSub,fontSize:12,fontWeight:filterVolume===o.v?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent"}}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage filter */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4,whiteSpace:"nowrap",minWidth:isMobile?60:undefined}}>Stage</span>
                <div style={{display:"flex",gap:6}}>
                  {[
                    {v:"all",      l:"All",        color:null},
                    {v:"notready", l:"Not Ready",  color:STAGE_COLORS.notready},
                    {v:"needswork",l:"Needs Work", color:STAGE_COLORS.needswork},
                    {v:"ready",    l:"Ready",      color:STAGE_COLORS.ready},
                  ].map(o=>{
                    const active = filterStage===o.v;
                    const c = o.color || STAGE_COLORS.ready;
                    return (
                      <button key={o.v} className="pill-btn" onClick={()=>setFilterStage(o.v)}
                        style={{padding:"7px 12px",borderRadius:10,border:`1.5px solid ${active?(o.color||tk.accent):tk.borderStrong}`,background:active?(c+"18"):"none",color:active?c:tk.textSub,fontSize:12,fontWeight:active?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",WebkitTapHighlightColor:"transparent"}}>
                        {o.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Song List ── */}
          <div style={{background:tk.surface,borderRadius:18,border:`1px solid ${tk.border}`,boxShadow:tk.shadow,overflow:"hidden"}} className="animate-up">
            {displayed.length === 0 && (
              <div style={{padding:"56px 24px",textAlign:"center"}}>
                <div style={{fontSize:44,marginBottom:12}}>🎼</div>
                <div style={{fontSize:17,fontWeight:600,color:tk.text,marginBottom:6}}>No songs found</div>
                <div style={{fontSize:14,color:tk.textSub}}>{search ? "Try a different search term" : "Add your first song to get started"}</div>
              </div>
            )}

            {displayed.map((song, idx) => {
              const isExpanded = expandedId === song.id;
              const qColor = qualityColor(song.quality);
              return (
                <div key={song.id} className="song-row"
                  style={{borderBottom:idx<displayed.length-1?`1px solid ${tk.border}`:"none",transition:"background 0.12s",cursor:"pointer"}}
                  onClick={()=>setExpandedId(isExpanded?null:song.id)}>

                  {/* Main row */}
                  <div style={{display:"flex",alignItems:"center",gap:isMobile?12:16,padding:isMobile?"13px 14px":"14px 20px"}}>

                    {/* Quality ring */}
                    <div style={{width:isMobile?42:48,height:isMobile?42:48,borderRadius:"50%",background:`conic-gradient(${qColor} ${song.quality*36}deg, ${dark?"#28282a":"#e5e5ea"} 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
                      <div style={{width:isMobile?32:36,height:isMobile?32:36,borderRadius:"50%",background:tk.surface,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                        <div style={{fontSize:isMobile?13:14,fontWeight:700,color:qColor,lineHeight:1}}>{song.quality}</div>
                      </div>
                    </div>

                    {/* Title / artist */}
                    <div style={{flex:1,minWidth:0,textAlign:"center"}}>
                      <div style={{fontSize:isMobile?15:16,fontWeight:600,color:tk.text,letterSpacing:-0.3,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{song.title}</div>
                      <div style={{fontSize:13,color:tk.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{song.artist}</div>
                    </div>

                    {/* Badges */}
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,width:isMobile?undefined:200,justifyContent:"flex-end"}}>
                      {!isMobile && (
                        <div style={{fontSize:11,fontWeight:600,color:qColor,background:qColor+"1a",borderRadius:20,padding:"3px 10px",letterSpacing:0.1,whiteSpace:"nowrap",minWidth:90,textAlign:"center"}}>{qualityLabel(song.quality)}</div>
                      )}
                      <div style={{fontSize:11,fontWeight:500,color:song.adjustableVolume?tk.green:tk.textMuted,background:song.adjustableVolume?tk.green+"18":tk.surface3,borderRadius:20,padding:"3px 10px",whiteSpace:"nowrap"}}>
                        {song.adjustableVolume?"🔊 Adj":"🔇 Fixed"}
                      </div>
                      <div style={{color:tk.textSub,fontSize:14,transform:`rotate(${isExpanded?180:0}deg)`,transition:"transform 0.2s"}}>⌃</div>
                    </div>
                  </div>

                  {/* Expanded row */}
                  {isExpanded && (
                    <div className="fade-in" style={{padding:isMobile?"0 14px 16px":"0 20px 18px",borderTop:`1px solid ${tk.border}`}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?12:16,paddingTop:14}}>

                        {/* Quality slider */}
                        <div style={{background:tk.surface2,borderRadius:14,padding:"14px 16px",border:`1px solid ${tk.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div style={{fontSize:12,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4}}>Performance Quality</div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{fontSize:18,fontWeight:700,color:qColor}}>{song.quality}</div>
                              <div style={{fontSize:11,color:qColor,background:qColor+"1a",borderRadius:10,padding:"2px 8px",fontWeight:600}}>{qualityLabel(song.quality)}</div>
                            </div>
                          </div>
                          <input type="range" min={0} max={10} step={1} value={song.quality}
                            onChange={e=>setSongs(prev=>prev.map(s=>s.id===song.id?{...s,quality:Number(e.target.value)}:s))}
                            style={{accentColor:qColor}}/>
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                            <span style={{fontSize:10,color:tk.textMuted}}>0</span>
                            <span style={{fontSize:10,color:tk.textMuted}}>10</span>
                          </div>
                        </div>

                        {/* Volume toggle */}
                        <div style={{background:tk.surface2,borderRadius:14,padding:"14px 16px",border:`1px solid ${tk.border}`,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                          <div style={{fontSize:12,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4,marginBottom:10}}>Adjustable Volume</div>
                          <div style={{display:"flex",gap:8}}>
                            {[{v:true,l:"🔊 Yes"},{v:false,l:"🔇 No"}].map(o=>(
                              <button key={String(o.v)} onClick={()=>setSongs(prev=>prev.map(s=>s.id===song.id?{...s,adjustableVolume:o.v}:s))}
                                style={{flex:1,padding:"11px 8px",borderRadius:12,border:`2px solid ${song.adjustableVolume===o.v?(o.v?tk.green:tk.red):tk.border}`,background:song.adjustableVolume===o.v?(o.v?tk.green+"18":tk.red+"18"):"none",color:song.adjustableVolume===o.v?(o.v?tk.green:tk.red):tk.textSub,fontSize:13,fontWeight:song.adjustableVolume===o.v?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {(song.notes||true) && (
                          <div style={{gridColumn:isMobile?undefined:"1/-1",background:tk.surface2,borderRadius:14,padding:"14px 16px",border:`1px solid ${tk.border}`}}>
                            <div style={{fontSize:12,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8}}>Notes</div>
                            <textarea value={song.notes} onChange={e=>setSongs(prev=>prev.map(s=>s.id===song.id?{...s,notes:e.target.value}:s))}
                              placeholder="Performance notes, tips, reminders…"
                              rows={2}
                              style={{width:"100%",padding:"9px 12px",border:`1px solid ${tk.inputBorder}`,borderRadius:10,fontSize:14,background:tk.inputBg,color:tk.text,resize:"vertical",fontFamily:"inherit"}}/>
                          </div>
                        )}
                      </div>

                      {/* Row actions */}
                      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
                        <button onClick={()=>openEdit(song)} style={{...btnGhost,padding:"8px 16px",fontSize:13}}>✏️ Edit</button>
                        <button onClick={()=>deleteSong(song.id)} style={{...btnGhost,padding:"8px 16px",fontSize:13,color:tk.red,borderColor:tk.red+"44"}}>🗑 Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {displayed.length > 0 && (
            <div style={{textAlign:"center",marginTop:14,fontSize:12,color:tk.textMuted}}>{displayed.length} of {songs.length} songs</div>
          )}
        </main>

        {/* ══ ADD / EDIT MODAL ══ */}
        {showForm && editSong && (
          <div onClick={()=>{setShowForm(false);setEditSong(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
            <div onClick={e=>e.stopPropagation()} className="animate-up"
              style={{background:tk.surface,borderRadius:isMobile?"24px 24px 0 0":22,padding:isMobile?"24px 18px 40px":"28px 28px 24px",width:isMobile?"100%":520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.4)",border:`1px solid ${tk.border}`}}>
              {isMobile && <div style={{width:40,height:4,borderRadius:2,background:tk.surface3,margin:"0 auto 20px"}}/>}

              <div style={{fontSize:20,fontWeight:700,letterSpacing:-0.5,color:tk.text,marginBottom:22}}>
                {songs.find(s=>s.id===editSong.id) ? "Edit Song" : "Add Song"}
              </div>

              {/* Title */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:tk.textSub,marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Song Title *</label>
                <input value={editSong.title} onChange={e=>updEdit("title",e.target.value)} placeholder="e.g. Canon in D"
                  style={{width:"100%",padding:"11px 13px",border:`1px solid ${tk.inputBorder}`,borderRadius:12,fontSize:16,background:tk.inputBg,color:tk.text}}/>
              </div>

              {/* Artist */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:tk.textSub,marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Artist / Composer</label>
                <input value={editSong.artist} onChange={e=>updEdit("artist",e.target.value)} placeholder="e.g. Pachelbel"
                  style={{width:"100%",padding:"11px 13px",border:`1px solid ${tk.inputBorder}`,borderRadius:12,fontSize:16,background:tk.inputBg,color:tk.text}}/>
              </div>

              {/* Quality */}
              <div style={{marginBottom:14,background:tk.surface2,borderRadius:14,padding:"14px 16px",border:`1px solid ${tk.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <label style={{fontSize:12,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.4}}>Performance Quality</label>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:20,fontWeight:700,color:qualityColor(editSong.quality)}}>{editSong.quality}</span>
                    <span style={{fontSize:11,color:qualityColor(editSong.quality),background:qualityColor(editSong.quality)+"1a",padding:"2px 8px",borderRadius:10,fontWeight:600}}>{qualityLabel(editSong.quality)}</span>
                  </div>
                </div>
                <input type="range" min={0} max={10} step={1} value={editSong.quality} onChange={e=>updEdit("quality",Number(e.target.value))}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:10,color:tk.textMuted}}>0 – Not Ready</span>
                  <span style={{fontSize:10,color:tk.textMuted}}>10 – Ready</span>
                </div>
              </div>

              {/* Adjustable Volume */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:tk.textSub,marginBottom:8,textTransform:"uppercase",letterSpacing:0.4}}>Adjustable Volume</label>
                <div style={{display:"flex",gap:10}}>
                  {[{v:true,l:"🔊 Yes – Can Adjust"},{v:false,l:"🔇 No – Fixed"}].map(o=>(
                    <button key={String(o.v)} onClick={()=>updEdit("adjustableVolume",o.v)}
                      style={{flex:1,padding:"12px 8px",borderRadius:12,border:`2px solid ${editSong.adjustableVolume===o.v?(o.v?tk.green:tk.red):tk.border}`,background:editSong.adjustableVolume===o.v?(o.v?tk.green+"18":tk.red+"18"):"none",color:editSong.adjustableVolume===o.v?(o.v?tk.green:tk.red):tk.textSub,fontSize:13,fontWeight:editSong.adjustableVolume===o.v?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{marginBottom:22}}>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:tk.textSub,marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Notes</label>
                <textarea value={editSong.notes} onChange={e=>updEdit("notes",e.target.value)} placeholder="Performance notes, cues, reminders…" rows={3}
                  style={{width:"100%",padding:"11px 13px",border:`1px solid ${tk.inputBorder}`,borderRadius:12,fontSize:15,background:tk.inputBg,color:tk.text,resize:"vertical",fontFamily:"inherit"}}/>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setShowForm(false);setEditSong(null);}} style={{...btnGhost,flex:1,padding:"13px"}}>Cancel</button>
                <button onClick={saveSong} style={{...btnPrimary,flex:2,padding:"13px"}}>
                  {songs.find(s=>s.id===editSong.id) ? "Save Changes" : "Add to Set List"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ SETTINGS MODAL ══ */}
        {showSettings && (
          <div onClick={()=>setShowSettings(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
            <div onClick={e=>e.stopPropagation()} className="animate-up"
              style={{background:tk.surface,borderRadius:isMobile?"24px 24px 0 0":22,padding:isMobile?"24px 18px 40px":"28px 28px 24px",width:isMobile?"100%":400,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.4)",border:`1px solid ${tk.border}`}}>
              {isMobile && <div style={{width:40,height:4,borderRadius:2,background:tk.surface3,margin:"0 auto 20px"}}/>}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
                <div style={{fontSize:18,fontWeight:700,letterSpacing:-0.4,color:tk.text}}>Appearance</div>
                <button onClick={()=>setShowSettings(false)} style={{background:tk.surface2,border:"none",color:tk.textSub,cursor:"pointer",width:28,height:28,borderRadius:"50%",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>✕</button>
              </div>

              {/* Mode */}
              <div style={{fontSize:11,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Appearance Mode</div>
              <div style={{display:"flex",gap:10,marginBottom:24}}>
                {[{l:"☀️  Light",v:false},{l:"🌙  Dark",v:true}].map(o=>(
                  <button key={String(o.v)} onClick={()=>setDark(o.v)} style={{flex:1,padding:"11px",borderRadius:12,border:`2px solid ${dark===o.v?tk.accent:tk.border}`,background:dark===o.v?tk.accent+"18":"none",color:tk.text,fontSize:14,fontWeight:dark===o.v?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{o.l}</button>
                ))}
              </div>

              {/* Accent presets */}
              <div style={{fontSize:11,fontWeight:600,color:tk.textSub,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Accent Color</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                {ACCENTS.map(a=>(
                  <button key={a.id} onClick={()=>setAccentId(a.id)}
                    style={{padding:"9px 8px",borderRadius:12,border:`2px solid ${accentId===a.id?a.color:"transparent"}`,background:accentId===a.id?a.color+"18":tk.surface2,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",fontFamily:"inherit"}}>
                    <div style={{width:14,height:14,borderRadius:"50%",background:a.color,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:accentId===a.id?600:400,color:tk.text}}>{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom color */}
              <div style={{background:tk.surface2,borderRadius:14,padding:"14px 16px",marginBottom:24,border:`1px solid ${tk.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:tk.text,marginBottom:2}}>Custom Color</div>
                    <div style={{fontSize:11,color:tk.textSub}}>{accentId==="custom"?customAccent.toUpperCase():"Pick a custom color"}</div>
                  </div>
                  <div style={{position:"relative",width:40,height:40}}>
                    <input type="color" value={customAccent} onChange={e=>{setCustomAccent(e.target.value);setAccentId("custom");}}
                      style={{position:"absolute",inset:0,opacity:0,zIndex:2,cursor:"pointer",width:"100%",height:"100%"}}/>
                    <div style={{width:40,height:40,borderRadius:"50%",background:accentId==="custom"?`linear-gradient(135deg,${customAccent},${lighten(customAccent)})`:`conic-gradient(red,yellow,lime,cyan,blue,magenta,red)`,border:`2px solid ${accentId==="custom"?tk.accent:tk.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{accentId==="custom"?"":"🎨"}</div>
                  </div>
                </div>
              </div>

              <button onClick={()=>setShowSettings(false)} style={{...btnPrimary,width:"100%",padding:"13px"}}>Done</button>
            </div>
          </div>
        )}

        {/* ══ MOBILE BOTTOM TAB BAR ══ */}
        {isMobile && (
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:tk.header,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${tk.border}`,display:"flex",alignItems:"stretch",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
            <div style={{flex:1,padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:22,lineHeight:1}}>🎼</span>
              <span style={{fontSize:10,fontWeight:600,color:tk.accent,letterSpacing:0.2}}>Set List</span>
            </div>
            <button onClick={openNew} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${tk.accent},${tk.a2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",marginTop:-18,boxShadow:`0 4px 16px ${tk.accent}55`}}>+</div>
              <span style={{fontSize:10,color:tk.textSub,letterSpacing:0.2,marginTop:2}}>Add Song</span>
            </button>
            <button onClick={()=>setShowSettings(true)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:22,lineHeight:1}}>⚙️</span>
              <span style={{fontSize:10,color:tk.textSub,letterSpacing:0.2}}>Settings</span>
            </button>
          </div>
        )}

      </div>
    </>
  );
}
