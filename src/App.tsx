import { useState, useCallback, useEffect, useRef } from "react";

const SUPABASE_URL = "https://edlcobufsarpzakzscpl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbGNvYnVmc2FycHpha3pzY3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODI0NDAsImV4cCI6MjA5MjQ1ODQ0MH0.pZcav2FMpqYh2io57F1HGVAuhullZC89KB34qNUxBoQ";

async function sbGet(key) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/planner_data?key=eq.${key}&select=value`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } });
    const data = await r.json();
    if (!data || data.length === 0) return null;
    return JSON.parse(data[0].value);
  } catch { return null; }
}
async function sbSet(key, value) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/planner_data`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
    });
  } catch {}
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SHIFT_TYPES = {
  dag:      { id:"dag",      label:"Dag",     time:"15:00–21:00", startHour:15, hours:6,   color:"#f59e0b", bg:"#78350f" },
  avond:    { id:"avond",    label:"Avond",   time:"17:00–01:00", startHour:17, hours:8,   color:"#3b82f6", bg:"#1e3a5f" },
  nacht:    { id:"nacht",    label:"Nacht",   time:"21:00–05:00", startHour:21, hours:8,   color:"#8b5cf6", bg:"#3b0764" },
  off:      { id:"off",      label:"Vrij",    time:"",            startHour:0,  hours:0,   color:"#374151", bg:"#111827" },
  vacation: { id:"vacation", label:"Vakantie",time:"",            startHour:0,  hours:0,   color:"#065f46", bg:"#022c22" },
  sick:     { id:"sick",     label:"Ziek",    time:"",            startHour:0,  hours:0,   color:"#7f1d1d", bg:"#450a0a" },
};

function getShift(id) { return SHIFT_TYPES[id] || SHIFT_TYPES.off; }

const FTE_VACATION   = { 1.0:24, 0.8:19, 0.5:12 };
const CONTRACT_TYPES = [
  { value:1.0, label:"Voltijds (100%)", weekHours:38 },
  { value:0.8, label:"4/5 (80%)",       weekHours:30.4 },
  { value:0.5, label:"Halftijds (50%)", weekHours:19 },
];
const DAYS_NL   = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const DAYS_FULL = ["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
const MONTHS_NL = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

const HOLIDAYS_BY_YEAR = {
  2026:["2026-01-01","2026-04-06","2026-05-01","2026-05-14","2026-05-25","2026-07-21","2026-08-15","2026-11-01","2026-11-11","2026-12-25"],
  2027:["2027-01-01","2027-03-29","2027-05-01","2027-05-06","2027-05-17","2027-07-21","2027-08-15","2027-11-01","2027-11-11","2027-12-25"],
  2028:["2028-01-01","2028-04-17","2028-05-01","2028-05-25","2028-06-05","2028-07-21","2028-08-15","2028-11-01","2028-11-11","2028-12-25"],
};
const VACATIONS_BY_YEAR = {
  2026:[
    {name:"Kerstvakantie", start:"2026-01-01",end:"2026-01-04"},
    {name:"Krokusvakantie",start:"2026-02-16",end:"2026-02-22"},
    {name:"Paasvakantie",  start:"2026-04-06",end:"2026-04-19"},
    {name:"Zomervakantie", start:"2026-07-01",end:"2026-08-31"},
    {name:"Herfstvakantie",start:"2026-11-02",end:"2026-11-08"},
    {name:"Kerstvakantie2",start:"2026-12-21",end:"2026-12-31"},
  ],
  2027:[
    {name:"Kerstvakantie", start:"2027-01-01",end:"2027-01-03"},
    {name:"Krokusvakantie",start:"2027-03-01",end:"2027-03-07"},
    {name:"Paasvakantie",  start:"2027-03-29",end:"2027-04-11"},
    {name:"Zomervakantie", start:"2027-07-01",end:"2027-08-31"},
    {name:"Herfstvakantie",start:"2027-11-01",end:"2027-11-07"},
    {name:"Kerstvakantie2",start:"2027-12-20",end:"2027-12-31"},
  ],
};

const MOTIVATIE = [
  "Goed bezig Rami 💪 deze planning begint er echt strak uit te zien.",
  "Rami, dit casino draait straks als een Zwitsers uurwerk. 🎰",
  "Sterk werk Rami. De dealers gaan je dankbaar zijn. 🃏",
  "Rami, een planning als een koninklijk flush. 👑",
  "Fantastisch Rami! Zelfs de croupiers zijn onder de indruk. ✨",
  "Rami, je plant beter dan de beste blackjack strategie. 🂡",
];

const INITIAL_STAFF = [
  {id:1, name:"Marie Devos",      fte:1.0, color:"#ef4444", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:2, name:"Pieter Claes",     fte:1.0, color:"#f97316", vacationDays:26, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:3, name:"Sophie Maes",      fte:1.0, color:"#eab308", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:4, name:"Luca Janssen",     fte:1.0, color:"#22c55e", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:5, name:"Emma Van Acker",   fte:1.0, color:"#06b6d4", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:6, name:"Koen De Smedt",    fte:1.0, color:"#3b82f6", vacationDays:28, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:7, name:"Nathalie Peeters", fte:1.0, color:"#8b5cf6", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:8, name:"Raf Willems",      fte:1.0, color:"#ec4899", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:9, name:"Julie Bogaert",    fte:0.5, color:"#f43f5e", vacationDays:12, availableDays:[1,2,3,4,5],     partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:10,name:"Tim Hermans",      fte:0.8, color:"#14b8a6", vacationDays:19, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:11,name:"Sara Nijs",        fte:1.0, color:"#a855f7", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:12,name:"Dries Lemmens",    fte:1.0, color:"#fb923c", vacationDays:24, availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:false, autoSchedule:true},
  {id:13,name:"Flex 1",           fte:0,   color:"#6b7280", vacationDays:0,  availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:true,  autoSchedule:true},
  {id:14,name:"Flex 2",           fte:0,   color:"#9ca3af", vacationDays:0,  availableDays:[0,1,2,3,4,5,6], partTimeMode:"spread", isFlexijob:true,  autoSchedule:false},
];

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const SK = { staff:"co3_staff", schedule:"co3_schedule", settings:"co3_settings",
             holidays:"co3_holidays", vacations:"co3_vacations", year:"co3_year", locks:"co3_locks" };
function load(k,fb){ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):fb; }catch{ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getISOWeek(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const y=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-y)/86400000)+1)/7);
}
function getWeekDates(year,week){
  const jan4=new Date(year,0,4);
  const s=new Date(jan4); s.setDate(jan4.getDate()-((jan4.getDay()+6)%7));
  const start=new Date(s); start.setDate(s.getDate()+(week-1)*7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d; });
}
function toDS(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function isHoliday(ds,holidays){ return holidays.includes(ds); }
function isSchoolVacation(ds,vacations){ return vacations.some(v=>ds>=v.start&&ds<=v.end); }
function isWeekend(date){ const d=date.getDay(); return d===0||d===6; }
function getDayDemand(ds,settings,holidays,vacations){
  const date=new Date(ds); const dow=date.getDay();
  if(isHoliday(ds,holidays)||isSchoolVacation(ds,vacations))
    return {morning:settings.vacMinMorning,evening:settings.vacMinEvening};
  if(dow===5||dow===0||dow===6)
    return {morning:settings.weekendMinMorning,evening:settings.weekendMinEvening};
  return {morning:settings.minMorning,evening:settings.minEvening};
}
function countVacDays(sid,schedule,year){
  return Object.entries(schedule[sid]||{}).filter(([ds,sh])=>ds.startsWith(String(year))&&sh==="vacation").length;
}
function isAvailOnDate(s,ds,isoWeek){
  const date=new Date(ds); const dow=(date.getDay()+6)%7;
  if(!s.availableDays.includes(dow)) return false;
  if(s.fte===0.5&&s.partTimeMode!=="spread"){
    const even=isoWeek%2===0;
    if(s.partTimeMode==="even"&&!even) return false;
    if(s.partTimeMode==="odd"&&even) return false;
  }
  return true;
}
function getWeeksInYear(y){ return getISOWeek(new Date(y,11,28)); }
function lockKey(sid,ds){ return `${sid}::${ds}`; }

// ─── SCHEDULER ────────────────────────────────────────────────────────────────
// Doelstelling:
//   1. Elke medewerker werkt ~4-5 dagen/week (afhankelijk van FTE)
//   2. Elke dag wordt de minimumbezetting (dag+avond) zo goed mogelijk gehaald
//   3. Max 5 opeenvolgende werkdagen, daarna min 2 vrij
//   4. Locks en globale lockDate worden gerespecteerd
// Aanpak: week-per-week, per week bepalen welke dagen iemand werkt

function generateSchedule(staff, year, settings, holidays, vacations, existingSchedule, locks, lockDate) {
  const autoStaff = staff.filter(s => s.autoSchedule !== false);
  const schedule  = {};
  autoStaff.forEach(s => { schedule[s.id] = { ...(existingSchedule[s.id] || {}) }; });

  const lockDateObj = lockDate ? new Date(lockDate + "T23:59:59") : null;

  // Bereken target werkdagen per week per medewerker
  // Voltijds = 5 dagen/week, 80% = 4, 50% = 2-3
  function targetDaysPerWeek(s) {
    if (s.isFlexijob) return 3;
    if (s.fte >= 1.0) return 5;
    if (s.fte >= 0.8) return 4;
    return 2; // 50%
  }

  // Alle dagen van het jaar, per week gegroepeerd
  const weekMap = {}; // weekNr -> [dateStr, ...]
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const ds = toDS(new Date(d));
    const wk = getISOWeek(new Date(d));
    if (!weekMap[wk]) weekMap[wk] = [];
    weekMap[wk].push(ds);
  }

  const weeks = Object.keys(weekMap).map(Number).sort((a,b)=>a-b);

  const consec = {};
  const shiftCounts = {};
  // Geef elke medewerker een andere startfase zodat de rotatie niet synchroon loopt
  // Fase 0 = start nacht, fase 1 = start avond, fase 2 = start dag
  autoStaff.forEach((s, idx) => {
    consec[s.id] = 0;
    const phase = idx % 3;
    shiftCounts[s.id] = {
      dag:   phase === 2 ? 1 : 0,
      avond: phase === 1 ? 1 : 0,
      nacht: phase === 0 ? 1 : 0,
    };
  });

  for (const wk of weeks) {
    const days = weekMap[wk];

    // Bepaal per dag de al-geboekte bezetting (locked + vacation/sick)
    // en bereken hoeveel extra mensen we nog nodig hebben
    const dagNeed   = {}; // dag + avond (vroege helft: 15:00–21:00 / 17:00–01:00)
    const avondNeed = {}; // avond (late helft) + nacht
    days.forEach(ds => {
      const locked = lockDateObj && new Date(ds) <= lockDateObj;
      if (locked) { dagNeed[ds] = 0; avondNeed[ds] = 0; return; }
      const demand = getDayDemand(ds, settings, holidays, vacations);
      let vroegCount = 0, laafCount = 0;
      autoStaff.forEach(s => {
        const ex = (schedule[s.id] || {})[ds];
        if (ex === "dag" || ex === "avond") vroegCount++;  // dag + avond tellen als "vroeg"
        if (ex === "nacht")                 laafCount++;   // nacht telt als "laat"
      });
      dagNeed[ds]   = Math.max(0, demand.morning - vroegCount);
      avondNeed[ds] = Math.max(0, demand.evening - laafCount);
    });

    for (const s of autoStaff) {
      const target = targetDaysPerWeek(s);

      // Welke dagen zijn al ingepland (locked/vacation/sick)?
      const alreadyWorking = days.filter(ds => {
        const ex = (schedule[s.id] || {})[ds];
        return ex && ex !== "off";
      });
      const neededExtra = Math.max(0, target - alreadyWorking.length);

      // Kandidaatdagen: niet gelockt, beschikbaar, niet al ingevuld
      const candidates = days.filter(ds => {
        if (lockDateObj && new Date(ds) <= lockDateObj) return false;
        if (locks[lockKey(s.id, ds)]) return false;
        const ex = (schedule[s.id] || {})[ds];
        if (ex && ex !== "off") return false; // al ingepland
        const isoWeek = getISOWeek(new Date(ds));
        if (!isAvailOnDate(s, ds, isoWeek)) return false;
        return true;
      });

      // Sorteer kandidaten zodat dagen met de grootste bezettingsnood eerst komen
      candidates.sort((a, b) => {
        const needA = dagNeed[a] + avondNeed[a];
        const needB = dagNeed[b] + avondNeed[b];
        return needB - needA; // hoogste nood eerst
      });

      // Kies de beste dagen, rekening houdend met max 5 opeenvolgend
      let assigned = 0;
      for (const ds of candidates) {
        if (assigned >= neededExtra) break;

        // Check opeenvolgend: kijk naar dag vóór
        const prev = new Date(ds); prev.setDate(prev.getDate() - 1);
        const prevDs = toDS(prev);
        const prevShift = (schedule[s.id] || {})[prevDs];
        const wasWorking = prevShift && prevShift !== "off";

        // Reset of verhoog streak
        const streak = wasWorking ? (consec[s.id] || 0) + 1 : 1;
        if (streak > 5) continue; // max 5 op rij

        // Kies shift type: eerlijke rotatie dag/avond/nacht + bezettingsnood
        // Tel reeds toegewezen shifts dit jaar voor eerlijke verdeling
        const counts = shiftCounts[s.id];
        const total  = counts.dag + counts.avond + counts.nacht || 1;
        const rDag   = counts.dag   / total;
        const rAvond = counts.avond / total;
        const rNacht = counts.nacht / total;
        const TARGET = 1/3;

        // PRIORITEIT 1: minimumbezetting — als één type nog tekort heeft, kies dat
        const dagTekort   = dagNeed[ds]   > 0;
        const avondTekort = avondNeed[ds] > 0;

        let shiftType;
        if (dagTekort && !avondTekort) {
          // Vroeg tekort → dag of avond (beide dekken de vroege periode)
          shiftType = (TARGET - rDag) >= (TARGET - rAvond) ? "dag" : "avond";
        } else if (avondTekort && !dagTekort) {
          // Laat tekort → nacht (dekt de late periode)
          shiftType = "nacht";
        } else if (dagTekort && avondTekort) {
          // Beide tekort: vroeg tekort → dag/avond, laat tekort → nacht
          // Kies op basis van welk tekort groter is
          shiftType = dagNeed[ds] >= avondNeed[ds]
            ? ((TARGET - rDag) >= (TARGET - rAvond) ? "dag" : "avond")
            : "nacht";
        } else {
          // PRIORITEIT 2: eerlijke verdeling (geen tekort meer)
          const shortage = {
            dag:   TARGET - rDag,
            avond: TARGET - rAvond,
            nacht: TARGET - rNacht,
          };
          shiftType = Object.entries(shortage).sort((a,b)=>b[1]-a[1])[0][0];
        }

        // PRIORITEIT 3: rotatie nacht→avond→dag binnen werkblok
        // Enkel toegepast als minimumbezetting al gedekt is (geen tekort)
        if (!dagTekort && !avondTekort && consec[s.id] > 0) {
          const prev = new Date(ds); prev.setDate(prev.getDate()-1);
          const prevShift = (schedule[s.id]||{})[toDS(prev)];
          const order = ["nacht","avond","dag"];
          const prevIdx = order.indexOf(prevShift);
          const suggestedType = prevIdx >= 0 && prevIdx < order.length-1
            ? order[prevIdx+1]
            : prevIdx === -1 ? order[0] : shiftType;
          const rSug = counts[suggestedType] / total;
          if (suggestedType !== shiftType && (TARGET - rSug) > -0.15) {
            shiftType = suggestedType;
          }
        }

        schedule[s.id][ds] = shiftType;
        if (shiftType === "dag" || shiftType === "avond") dagNeed[ds]   = Math.max(0, dagNeed[ds]   - 1);
        if (shiftType === "nacht")                        avondNeed[ds] = Math.max(0, avondNeed[ds] - 1);
        if (shiftType === "dag")   shiftCounts[s.id].dag++;
        if (shiftType === "avond") shiftCounts[s.id].avond++;
        if (shiftType === "nacht") shiftCounts[s.id].nacht++;
        consec[s.id] = streak;
        assigned++;
      }

      // Resterende dagen van de week -> "off" (als niet al ingevuld)
      days.forEach(ds => {
        if (lockDateObj && new Date(ds) <= lockDateObj) return;
        const ex = (schedule[s.id] || {})[ds];
        if (!ex || ex === "off") {
          schedule[s.id][ds] = "off";
        }
      });
    }
  }

  return { schedule };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const style=`
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#c9a84c;--gold-dim:#8a6f2e;--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a28;--surface3:#22223a;--border:#2a2a42;--text:#e8e8f0;--text-dim:#888899;--red:#ef4444;--yellow:#f59e0b;--green:#22c55e;--blue:#3b82f6;--purple:#8b5cf6;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.app{display:flex;height:100vh;overflow:hidden;}
.sidebar{width:224px;min-width:224px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:transform .25s ease;}
@media(max-width:768px){.sidebar{position:fixed;top:0;left:0;height:100vh;z-index:300;transform:translateX(-100%);}.sidebar.open{transform:translateX(0);}.main{width:100%;}}
.sidebar-logo{padding:20px 16px 14px;border-bottom:1px solid var(--border);}
.logo-main{font-family:'DM Serif Display',serif;font-size:18px;color:var(--gold);letter-spacing:.05em;}
.logo-sub{font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.15em;margin-top:2px;}
.sidebar-nav{flex:1;padding:12px 8px;overflow-y:auto;}
.nav-section{margin-bottom:18px;}
.nav-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-dim);padding:0 8px;margin-bottom:6px;}
.nav-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--text-dim);transition:all .15s;border:none;background:none;width:100%;text-align:left;}
.nav-item:hover{background:var(--surface2);color:var(--text);}
.nav-item.active{background:var(--surface3);color:var(--gold);font-weight:500;}
.nav-icon{font-size:15px;width:18px;text-align:center;}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.topbar{height:56px;min-height:56px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:10px;}
.topbar-title{font-family:'DM Serif Display',serif;font-size:17px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.topbar-actions{display:flex;gap:6px;align-items:center;}
.hamburger{display:none;background:none;border:none;color:var(--text);font-size:20px;cursor:pointer;padding:4px 8px;}
@media(max-width:768px){.hamburger{display:flex;align-items:center;}.topbar{padding:0 10px;}.topbar-title{font-size:14px;}.btn-hide-mobile{display:none !important;}.year-select{max-width:72px;}}
.year-select{background:var(--surface2);border:1px solid var(--border);color:var(--gold);padding:6px 10px;border-radius:7px;font-size:13px;font-family:'IBM Plex Mono',monospace;cursor:pointer;}
.year-select:focus{outline:none;border-color:var(--gold-dim);}
.btn{padding:7px 14px;border-radius:7px;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--text);transition:all .15s;display:flex;align-items:center;gap:6px;}
.btn:hover{background:var(--surface3);border-color:var(--gold-dim);}
.btn:disabled{opacity:.4;cursor:not-allowed;}
.btn-primary{background:var(--gold);color:#0a0a0f;border-color:var(--gold);}
.btn-primary:hover{background:#e0b95a;}
.btn-danger{border-color:#7f1d1d;color:var(--red);}
.btn-danger:hover{background:#7f1d1d30;}
.btn-flex{background:#1f2937;border-color:#374151;color:#9ca3af;}
.content{flex:1;overflow:auto;padding:24px;}
@media(max-width:768px){.content{padding:12px;}}
.week-grid{width:100%;border-collapse:collapse;}
.week-grid th{background:var(--surface2);padding:8px 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);border:1px solid var(--border);font-weight:500;white-space:nowrap;}
.week-grid th.weekend{color:var(--gold);}
.week-grid td{border:1px solid var(--border);padding:3px;vertical-align:top;min-width:88px;}
.staff-cell{background:var(--surface);padding:6px 8px;font-size:12px;font-weight:500;border-right:2px solid var(--border);white-space:nowrap;max-width:148px;overflow:hidden;text-overflow:ellipsis;position:sticky;left:0;z-index:2;}
@media(max-width:768px){.staff-cell{max-width:80px;font-size:10px;}.week-grid td{min-width:58px;}.shift-cell{min-height:34px;padding:2px 3px;}.shift-label{font-size:10px;}.shift-time{display:none;}}
.staff-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;}
.fte-badge{font-size:10px;color:var(--text-dim);font-family:'IBM Plex Mono',monospace;margin-left:4px;}
.flex-badge{font-size:9px;background:#1f2937;color:#9ca3af;padding:1px 5px;border-radius:3px;margin-left:4px;}
.shift-cell{min-height:44px;border-radius:6px;padding:4px 6px;cursor:pointer;position:relative;transition:filter .1s;user-select:none;}
.shift-cell:hover{filter:brightness(1.2);}
.shift-cell.locked{cursor:default;}
.shift-cell.locked::after{content:'🔒';position:absolute;bottom:2px;right:4px;font-size:9px;}
.shift-label{font-size:11px;font-weight:600;}
.shift-time{font-size:10px;opacity:.7;font-family:'IBM Plex Mono',monospace;}
.shift-conflict{position:absolute;top:3px;right:3px;font-size:10px;}
.coverage-row td{background:var(--surface2);padding:3px 4px;font-size:11px;font-family:'IBM Plex Mono',monospace;text-align:center;}
.coverage-ok{color:var(--green);}.coverage-warn{color:var(--yellow);}.coverage-bad{color:var(--red);}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.stat-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;}
.stat-card-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.stat-name{font-size:13px;font-weight:500;}
.stat-fte{font-size:10px;color:var(--text-dim);font-family:'IBM Plex Mono',monospace;}
.stat-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:var(--text-dim);}
.stat-val{color:var(--text);font-family:'IBM Plex Mono',monospace;font-weight:600;}
.fatigue-bar{height:4px;border-radius:2px;margin-top:8px;background:var(--border);overflow:hidden;}
.fatigue-fill{height:100%;border-radius:2px;transition:width .4s;}
.vac-bar{height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:6px;}
.vac-fill{height:100%;border-radius:3px;background:var(--green);transition:width .4s;}
.vac-fill.warn{background:var(--yellow);}.vac-fill.over{background:var(--red);}
.settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
.settings-section{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:20px;}
.settings-title{font-family:'DM Serif Display',serif;font-size:16px;color:var(--gold);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border);}
.form-row{margin-bottom:12px;}
.form-label{font-size:12px;color:var(--text-dim);margin-bottom:4px;display:block;}
.form-input{width:100%;background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 10px;border-radius:6px;font-family:'DM Sans',sans-serif;font-size:13px;}
.form-input:focus{outline:none;border-color:var(--gold-dim);}
.staff-table{width:100%;border-collapse:collapse;}
.staff-table th,.staff-table td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--border);font-size:13px;}
.staff-table th{color:var(--text-dim);font-size:11px;text-transform:uppercase;letter-spacing:.08em;}
.staff-table tr:hover td{background:var(--surface2);}
.tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-family:'IBM Plex Mono',monospace;}
.year-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px;}
.month-card{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px;}
.month-title{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin-bottom:8px;}
.month-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.day-dot{width:100%;aspect-ratio:1;border-radius:3px;font-size:8px;display:flex;align-items:center;justify-content:center;color:transparent;}
.day-dot:hover{color:white;cursor:pointer;}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:100;overflow-y:auto;padding:20px;}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;}
.modal-title{font-family:'DM Serif Display',serif;font-size:18px;color:var(--gold);margin-bottom:16px;}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;}
.toast{position:fixed;bottom:20px;right:20px;background:var(--surface2);border:1px solid var(--gold-dim);border-radius:8px;padding:12px 16px;font-size:13px;z-index:200;animation:slideIn .4s ease;max-width:340px;}
.toast.motivatie{border:1.5px solid var(--gold);background:linear-gradient(135deg,#2a1f00,#1a1400,#12121a);color:var(--gold);padding:16px 20px;font-size:14px;bottom:28px;right:28px;border-radius:12px;box-shadow:0 0 24px #c9a84c40,0 8px 32px rgba(0,0,0,.6);animation:motivatieIn .5s cubic-bezier(.16,1,.3,1);}
@keyframes slideIn{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
@keyframes motivatieIn{from{transform:translateY(28px) scale(.95);opacity:0;}to{transform:translateY(0) scale(1);opacity:1;}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
.shift-picker{position:fixed;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px;z-index:50;display:flex;flex-direction:column;gap:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);max-height:80vh;overflow-y:auto;}
.shift-option{padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;display:flex;gap:8px;align-items:center;transition:filter .1s;}
.shift-option:hover{filter:brightness(1.3);}
.alert-banner{background:#7f1d1d30;border:1px solid #7f1d1d;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--red);display:flex;align-items:center;gap:8px;cursor:pointer;}
.warn-banner{background:#78350f30;border:1px solid #78350f;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--yellow);display:flex;align-items:center;gap:8px;}
.legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-dim);}
.legend-dot{width:10px;height:10px;border-radius:3px;}
.day-checks{display:flex;gap:6px;flex-wrap:wrap;}
.day-check{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--text-dim);cursor:pointer;}
.day-check input{accent-color:var(--gold);width:14px;height:14px;cursor:pointer;}
.day-check.active{color:var(--text);}
.slider-row{display:flex;align-items:center;gap:10px;}
.slider-row input[type=range]{flex:1;accent-color:var(--gold);}
.freq-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);margin-top:2px;}
.lock-date-badge{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--yellow);background:#78350f30;padding:3px 8px;border-radius:4px;border:1px solid #78350f;}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:299;}
.sidebar-overlay.open{display:block;}
`;

// ─── SHIFT PICKER ─────────────────────────────────────────────────────────────
function ShiftPicker({pos,onSelect,onClose,isLocked,onToggleLock}){
  useEffect(()=>{ const h=()=>onClose(); window.addEventListener("click",h); return()=>window.removeEventListener("click",h); },[onClose]);
  const shiftOpts = ["dag","avond","nacht","off","vacation","sick"];
  return(
    <div className="shift-picker" style={{top:Math.min(pos.y,window.innerHeight-320),left:Math.min(pos.x,window.innerWidth-220)}} onClick={e=>e.stopPropagation()}>
      {shiftOpts.map(id=>{
        const s=getShift(id);
        return(
          <div key={id} className="shift-option" style={{background:s.bg,color:s.color}} onClick={()=>{onSelect(id);onClose();}}>
            <div style={{width:8,height:8,borderRadius:3,background:s.color}}/>
            <span style={{minWidth:55}}>{s.label}</span>
            {s.time&&<span style={{opacity:.7,fontFamily:"'IBM Plex Mono',monospace",fontSize:10}}>{s.time}</span>}
          </div>
        );
      })}
      <div style={{borderTop:"1px solid var(--border)",marginTop:4,paddingTop:4}}>
        <div className="shift-option" style={{background:"#1e3a5f30",color:"#60a5fa"}} onClick={()=>{onToggleLock();onClose();}}>
          {isLocked?"🔓 Ontgrendelen":"🔒 Vergrendelen"}
        </div>
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({staff,schedule,setSchedule,weekNum,year,settings,holidays,vacations,locks,setLocks,lockDate,onNavigateAlert}){
  const [picker,setPicker]=useState(null);
  const [warn,setWarn]=useState(null);
  const dates=getWeekDates(year,weekNum);

  const handleClick=useCallback((e,sid,ds,locked)=>{
    const lockDateObj=lockDate?new Date(lockDate+"T23:59:59"):null;
    if(lockDateObj&&new Date(ds)<=lockDateObj){ setWarn("🔒 Globaal gelockt."); setTimeout(()=>setWarn(null),2500); return; }
    e.stopPropagation();
    setPicker({x:e.clientX,y:e.clientY,staffId:sid,dateStr:ds});
  },[lockDate]);

  const handleSelect=useCallback((shiftId)=>{
    if(!picker) return;
    const {staffId,dateStr}=picker;
    setSchedule(prev=>({...prev,[staffId]:{...(prev[staffId]||{}),[dateStr]:shiftId}}));
    if(shiftId==="vacation"||shiftId==="sick")
      setLocks(prev=>({...prev,[lockKey(staffId,dateStr)]:true}));
    else
      setLocks(prev=>({...prev,[lockKey(staffId,dateStr)]:true}));
  },[picker,setSchedule,setLocks]);

  const handleToggleLock=useCallback(()=>{
    if(!picker) return;
    const k=lockKey(picker.staffId,picker.dateStr);
    setLocks(prev=>({...prev,[k]:!prev[k]}));
  },[picker,setLocks]);

  const coverage=dates.map(date=>{
    const ds=toDS(date);
    const demand=getDayDemand(ds,settings,holidays,vacations);
    let dag=0,avond=0;
    staff.forEach(s=>{ const sh=(schedule[s.id]||{})[ds];
      if(sh==="dag"||sh==="avond") dag++;   // vroege periode
      if(sh==="nacht")             avond++; // late periode
    });
    return{ds,dag,avond,demDag:demand.morning,demAvond:demand.evening};
  });

  const alerts=[];
  coverage.forEach(c=>{
    const date=new Date(c.ds); const di=(date.getDay()+6)%7;
    if(c.dag<c.demDag)   alerts.push({msg:`Dag tekort: ${DAYS_NL[di]} ${date.getDate()}/${date.getMonth()+1} (${c.dag}/${c.demDag})`,ds:c.ds});
    if(c.avond<c.demAvond) alerts.push({msg:`Avond tekort: ${DAYS_NL[di]} ${date.getDate()}/${date.getMonth()+1} (${c.avond}/${c.demAvond})`,ds:c.ds});
  });
  const [alertsOpen,setAlertsOpen]=useState(false);

  const renderRow=(s)=>(
    <tr key={s.id}>
      <td className="staff-cell">
        <span className="staff-dot" style={{background:s.color}}/>
        {s.name}
        {s.isFlexijob&&<span className="flex-badge">{s.autoSchedule?"Flex":"Flex✋"}</span>}
        {!s.isFlexijob&&s.fte<1&&<span className="fte-badge">{Math.round(s.fte*100)}%</span>}
      </td>
      {dates.map((d,i)=>{
        const ds=toDS(d);
        const shiftId=(schedule[s.id]||{})[ds]||"off";
        const shift=getShift(shiftId);
        const isLocked=!!locks[lockKey(s.id,ds)];
        const isPastLock=lockDate&&new Date(ds)<=new Date(lockDate+"T23:59:59");
        const locked=isLocked||isPastLock;
        return(
          <td key={i} style={{padding:3}}>
            <div className={`shift-cell${locked?" locked":""}`}
              style={{background:shift.bg,borderLeft:`3px solid ${shift.color}`,opacity:locked?.85:1}}
              onClick={e=>handleClick(e,s.id,ds,locked)}>
              <div className="shift-label" style={{color:shift.color}}>{shift.label}</div>
              {shift.time&&<div className="shift-time">{shift.time}</div>}
            </div>
          </td>
        );
      })}
    </tr>
  );

  const regular=staff.filter(s=>!s.isFlexijob);
  const flexi=staff.filter(s=>s.isFlexijob);

  return(
    <div>
      {warn&&<div className="warn-banner">⚠️ {warn}</div>}
      {alerts.length>0&&(
        <div style={{marginBottom:8}}>
          <div className="alert-banner" style={{marginBottom:0,borderRadius:alertsOpen?"8px 8px 0 0":"8px"}} onClick={()=>setAlertsOpen(o=>!o)}>
            🔴 <strong>Waarschuwingen ({alerts.length})</strong>
            <span style={{marginLeft:"auto"}}>{alertsOpen?"▲":"▼"}</span>
          </div>
          {alertsOpen&&(
            <div style={{background:"#7f1d1d18",border:"1px solid #7f1d1d",borderTop:"none",borderRadius:"0 0 8px 8px"}}>
              {alerts.map((a,i)=>(
                <div key={i} style={{padding:"7px 14px",fontSize:12,color:"#fca5a5",borderTop:i>0?"1px solid #7f1d1d30":"none",cursor:"pointer"}}
                  onClick={()=>onNavigateAlert&&onNavigateAlert(a.ds)}>
                  🔴 {a.msg} <span style={{opacity:.6,fontSize:10}}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="legend">
        {["dag","avond","nacht","off","vacation","sick"].map(id=>{ const s=getShift(id); return(
          <div key={id} className="legend-item"><div className="legend-dot" style={{background:s.color}}/>{s.label}</div>
        );})}
        {lockDate&&<span className="lock-date-badge">🔒 gelockt tot {lockDate}</span>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table className="week-grid">
          <thead>
            <tr>
              <th style={{minWidth:148,textAlign:"left"}}>Personeel</th>
              {dates.map((d,i)=>{
                const ds=toDS(d); const isPL=lockDate&&new Date(ds)<=new Date(lockDate+"T23:59:59");
                return(
                  <th key={i} className={isWeekend(d)?"weekend":""} style={{opacity:isPL?.5:1}}>
                    {DAYS_NL[i]}<br/>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:400,fontSize:10}}>{d.getDate()}/{d.getMonth()+1}</span>
                    {isHoliday(ds,holidays)&&" 🎉"}{isSchoolVacation(ds,vacations)&&" 🏖"}{isPL&&" 🔒"}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {regular.map(renderRow)}
            {flexi.length>0&&<tr><td colSpan={8} style={{background:"#0f172a",padding:"4px 8px",fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:".1em"}}>Flexijobbers</td></tr>}
            {flexi.map(renderRow)}
            <tr className="coverage-row">
              <td style={{fontSize:10,color:"var(--text-dim)",padding:"4px 8px",fontStyle:"italic"}}>Dag+Avond</td>
              {coverage.map((c,i)=>(<td key={i}><span className={c.dag>=c.demDag?"coverage-ok":c.dag>=c.demDag-1?"coverage-warn":"coverage-bad"}>{c.dag}/{c.demDag}</span></td>))}
            </tr>
            <tr className="coverage-row">
              <td style={{fontSize:10,color:"var(--text-dim)",padding:"4px 8px",fontStyle:"italic"}}>Laat+Nacht</td>
              {coverage.map((c,i)=>(<td key={i}><span className={c.avond>=c.demAvond?"coverage-ok":c.avond>=c.demAvond-1?"coverage-warn":"coverage-bad"}>{c.avond}/{c.demAvond}</span></td>))}
            </tr>
          </tbody>
        </table>
      </div>
      {picker&&<ShiftPicker pos={picker} onSelect={handleSelect} onClose={()=>setPicker(null)} isLocked={!!locks[lockKey(picker.staffId,picker.dateStr)]} onToggleLock={handleToggleLock}/>}
    </div>
  );
}

// ─── YEAR VIEW ────────────────────────────────────────────────────────────────
function YearView({schedule,staff,year,holidays,vacations,settings,onDayClick}){
  const [selectedDs,setSelectedDs]=useState(null);
  const months=Array.from({length:12},(_,m)=>{
    const days=[]; const firstDay=new Date(year,m,1);
    let sd=(firstDay.getDay()+6)%7; for(let i=0;i<sd;i++) days.push(null);
    const dim=new Date(year,m+1,0).getDate();
    for(let d=1;d<=dim;d++){
      const date=new Date(year,m,d); const ds=toDS(date);
      let cnt=0; staff.forEach(s=>{ const sh=(schedule[s.id]||{})[ds]; if(sh&&!["off","vacation","sick"].includes(sh)) cnt++; });
      const demand=getDayDemand(ds,settings,holidays,vacations);
      days.push({d,ds,cnt,min:demand.morning+demand.evening,isHol:isHoliday(ds,holidays),isVac:isSchoolVacation(ds,vacations),isWE:isWeekend(date)});
    }
    return{name:MONTHS_NL[m],days};
  });
  return(
    <div className="year-grid">
      {months.map(month=>(
        <div key={month.name} className="month-card">
          <div className="month-title">{month.name}</div>
          <div style={{display:"flex",gap:3,marginBottom:6}}>{DAYS_NL.map(d=><div key={d} style={{flex:1,textAlign:"center",fontSize:9,color:"var(--text-dim)"}}>{d}</div>)}</div>
          <div className="month-days">
            {month.days.map((day,i)=>{
              if(!day) return <div key={`p${i}`}/>;
              const ratio=day.cnt/Math.max(day.min,1);
              const bg=day.isHol?"#c9a84c40":day.isVac?"#22c55e30":day.isWE?"#3b82f620":ratio<0.8?"#ef444430":ratio<1?"#f59e0b30":"#22c55e20";
              const border=ratio<0.8?"1px solid #ef4444":ratio<1?"1px solid #f59e0b":"1px solid transparent";
              const isSel=selectedDs===day.ds;
              return(<div key={day.d} className="day-dot"
                onClick={()=>{setSelectedDs(day.ds);onDayClick&&onDayClick(day.ds);}}
                style={{background:isSel?"var(--gold)":bg,border:isSel?"2px solid #fff":border,
                  color:isSel?"#000":"var(--text-dim)",fontSize:8,cursor:"pointer",
                  transform:isSel?"scale(1.2)":"",transition:"all .15s",position:"relative",zIndex:isSel?1:0}}
                title={`${day.ds}: ${day.cnt} staff`}>{day.d}</div>);
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── STAFF STATS ──────────────────────────────────────────────────────────────
function StaffStats({staff,schedule,year,holidays}){
  const regular=staff.filter(s=>!s.isFlexijob);
  const computed=regular.map(s=>{
    let totalHours=0,weekendShifts=0,nightShifts=0,holidayShifts=0,vacUsed=0,workDays=0;
    Object.entries(schedule[s.id]||{}).forEach(([ds,sid])=>{
      if(!ds.startsWith(String(year))) return;
      if(sid==="vacation"){ vacUsed++; return; }
      const sh=getShift(sid); if(sh.hours===0) return;
      totalHours+=sh.hours; workDays++;
      if(isWeekend(new Date(ds))) weekendShifts++;
      if(sh.startHour>=21) nightShifts++;
      if(isHoliday(ds,holidays)) holidayShifts++;
    });
    const targetHours=s.fte*38*52;
    const vr=vacUsed/Math.max(s.vacationDays,1);
    const hr=totalHours/Math.max(targetHours,1);
    const fatigueScore=Math.min(100,(nightShifts/120)*100);
    return{...s,totalHours,weekendShifts,nightShifts,holidayShifts,targetHours,vacUsed,vr,hr,fatigueScore,workDays};
  });
  return(
    <div className="stats-grid">
      {computed.map(s=>{
        const fc=s.fatigueScore>66?"#ef4444":s.fatigueScore>33?"#f59e0b":"#22c55e";
        const hc=Math.abs(s.hr-1)<0.05?"#22c55e":Math.abs(s.hr-1)<0.15?"#f59e0b":"#ef4444";
        const vc=s.vr>1?"over":s.vr>0.8?"warn":"";
        return(
          <div key={s.id} className="stat-card">
            <div className="stat-card-header">
              <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
              <div><div className="stat-name">{s.name}</div>
              <div className="stat-fte">{CONTRACT_TYPES.find(c=>c.value===s.fte)?.label||`${Math.round(s.fte*100)}%`}</div></div>
            </div>
            <div style={{background:"var(--surface3)",borderRadius:7,padding:"10px 12px",marginBottom:8}}>
              <div className="stat-row"><span>Gepland</span><span className="stat-val" style={{color:hc}}>{Math.round(s.totalHours)}u / {Math.round(s.targetHours)}u</span></div>
              <div className="stat-row"><span>Werkdagen</span><span className="stat-val">{s.workDays}</span></div>
              <div style={{height:5,borderRadius:3,background:"var(--border)",overflow:"hidden",marginTop:8}}>
                <div style={{height:"100%",borderRadius:3,background:hc,width:`${Math.min(100,s.hr*100)}%`,transition:"width .4s"}}/>
              </div>
            </div>
            <div className="stat-row"><span>Weekend</span><span className="stat-val">{s.weekendShifts}</span></div>
            <div className="stat-row"><span>Nacht</span><span className="stat-val">{s.nightShifts}</span></div>
            <div className="stat-row"><span>Feestdagen</span><span className="stat-val">{s.holidayShifts}</span></div>
            <div className="stat-row"><span>Vakantie</span><span className="stat-val" style={{color:s.vr>1?"#ef4444":s.vr>0.8?"#f59e0b":"#22c55e"}}>{s.vacUsed}/{s.vacationDays}</span></div>
            <div className="vac-bar"><div className={`vac-fill ${vc}`} style={{width:`${Math.min(100,s.vr*100)}%`}}/></div>
            <div className="stat-row" style={{marginTop:8}}><span>Vermoeidheid</span><span className="stat-val" style={{color:fc}}>{s.fatigueScore>66?"🔴 Hoog":s.fatigueScore>33?"🟡 Medium":"🟢 Laag"}</span></div>
            <div className="fatigue-bar"><div className="fatigue-fill" style={{width:`${s.fatigueScore}%`,background:fc}}/></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STAFF MANAGER ────────────────────────────────────────────────────────────
function StaffManager({staff,setStaff,schedule,year}){
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const def={name:"",fte:1.0,color:"#3b82f6",vacationDays:24,availableDays:[0,1,2,3,4,5,6],partTimeMode:"spread",isFlexijob:false,autoSchedule:true};
  const [form,setForm]=useState(def);
  const openAdd=()=>{setEditing(null);setForm(def);setShowModal(true);};
  const openEdit=(s)=>{setEditing(s.id);setForm({name:s.name,fte:s.fte,color:s.color,vacationDays:s.vacationDays,availableDays:[...s.availableDays],partTimeMode:s.partTimeMode||"spread",isFlexijob:s.isFlexijob||false,autoSchedule:s.autoSchedule!==false});setShowModal(true);};
  const handleFteChange=(v)=>{const f=parseFloat(v);setForm(x=>({...x,fte:f,vacationDays:FTE_VACATION[f]??Math.round(24*f)}));};
  const toggleDay=(day)=>setForm(f=>({...f,availableDays:f.availableDays.includes(day)?f.availableDays.filter(d=>d!==day):[...f.availableDays,day]}));
  const save=()=>{if(!form.name.trim())return;if(editing){setStaff(p=>p.map(s=>s.id===editing?{...s,...form,fte:parseFloat(form.fte)}:s));}else{setStaff(p=>[...p,{id:Date.now(),...form,fte:parseFloat(form.fte)}]);}setShowModal(false);};
  const remove=(id)=>setStaff(p=>p.filter(s=>s.id!==id));
  const regular=staff.filter(s=>!s.isFlexijob); const flexi=staff.filter(s=>s.isFlexijob);
  const renderSection=(list,title)=>(
    <>
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:".1em",color:"var(--text-dim)",margin:"16px 0 8px"}}>{title}</div>
      <table className="staff-table">
        <thead><tr><th>Naam</th><th>Contract</th><th>Vakantie</th><th>Dagen</th><th>Auto</th><th></th></tr></thead>
        <tbody>{list.map(s=>{
          const vu=countVacDays(s.id,schedule,year);
          return(<tr key={s.id}>
            <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:s.color}}/>{s.name}</div></td>
            <td><span className="tag" style={{background:s.isFlexijob?"#1f2937":"#1e3a5f",color:s.isFlexijob?"#9ca3af":"#60a5fa"}}>{s.isFlexijob?"Flexijob":CONTRACT_TYPES.find(c=>c.value===s.fte)?.label}</span></td>
            <td>{s.isFlexijob?<span style={{color:"var(--text-dim)"}}>—</span>:<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:vu>s.vacationDays?"#ef4444":"#22c55e"}}>{vu}/{s.vacationDays}</span>}</td>
            <td><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--text-dim)"}}>{s.availableDays.map(d=>DAYS_NL[d]).join(",")}</span></td>
            <td><span>{s.autoSchedule!==false?"🟢":"✋"}</span></td>
            <td><div style={{display:"flex",gap:6}}><button className="btn" onClick={()=>openEdit(s)}>✏️</button><button className="btn btn-danger" onClick={()=>remove(s.id)}>🗑</button></div></td>
          </tr>);
        })}</tbody>
      </table>
    </>
  );
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:13,color:"var(--text-dim)"}}>{regular.length} vaste • {regular.reduce((a,s)=>a+s.fte,0).toFixed(1)} FTE • {flexi.length} flex</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Toevoegen</button>
      </div>
      {renderSection(regular,"Vaste medewerkers")}
      {flexi.length>0&&renderSection(flexi,"Flexijobbers")}
      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{editing?"Bewerken":"Toevoegen"}</div>
            <div className="form-row"><label className="form-label">Type</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn ${!form.isFlexijob?"btn-primary":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,isFlexijob:false}))}>Vast</button>
                <button className={`btn ${form.isFlexijob?"btn-flex":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,isFlexijob:true,fte:0,vacationDays:0}))}>Flexijob</button>
              </div>
            </div>
            <div className="form-row"><label className="form-label">Naam</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            {!form.isFlexijob&&(<>
              <div className="form-row"><label className="form-label">Contract</label>
                <select className="form-input" value={form.fte} onChange={e=>handleFteChange(e.target.value)}>
                  {CONTRACT_TYPES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-row"><label className="form-label">Vakantiedagen</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button className="btn" style={{padding:"6px 12px"}} onClick={()=>setForm(f=>({...f,vacationDays:Math.max(0,f.vacationDays-1)}))}>−</button>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,minWidth:32,textAlign:"center",color:"var(--gold)"}}>{form.vacationDays}</span>
                  <button className="btn" style={{padding:"6px 12px"}} onClick={()=>setForm(f=>({...f,vacationDays:f.vacationDays+1}))}>+</button>
                </div>
              </div>
              {form.fte===0.5&&(<div className="form-row"><label className="form-label">Halftijdse regeling</label>
                <select className="form-input" value={form.partTimeMode} onChange={e=>setForm(f=>({...f,partTimeMode:e.target.value}))}>
                  <option value="spread">Verspreid</option><option value="even">Even weken</option><option value="odd">Oneven weken</option>
                </select>
              </div>)}
            </>)}
            <div className="form-row"><label className="form-label">Beschikbare dagen</label>
              <div className="day-checks">{DAYS_FULL.map((day,i)=>(
                <label key={i} className={`day-check ${form.availableDays.includes(i)?"active":""}`}>
                  <input type="checkbox" checked={form.availableDays.includes(i)} onChange={()=>toggleDay(i)}/>{DAYS_NL[i]}
                </label>
              ))}</div>
            </div>
            <div className="form-row"><label className="form-label">Automatisch inplannen</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn ${form.autoSchedule?"btn-primary":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,autoSchedule:true}))}>🟢 Auto</button>
                <button className={`btn ${!form.autoSchedule?"btn-flex":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,autoSchedule:false}))}>✋ Manueel</button>
              </div>
            </div>
            <div className="form-row"><label className="form-label">Kleur</label><input className="form-input" type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{height:40,padding:4}}/></div>
            <div className="modal-actions">
              <button className="btn" onClick={()=>setShowModal(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={save}>Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS={
  minMorning:3, minEvening:6,
  weekendMinMorning:4, weekendMinEvening:8,
  vacMinMorning:4, vacMinEvening:8,
  maxConsecNights:4, minRestAfterNights:2, maxConsecDays:5, minRestHours:11,
};

function SettingsView({settings,setSettings,holidays,setHolidays,vacations,setVacations,lockDate,setLockDate,motivatieEnabled,setMotivatieEnabled,motivatieFreq,setMotivatieFreq,showToast}){
  const [newH,setNewH]=useState(""); const [nVN,setNVN]=useState(""); const [nVS,setNVS]=useState(""); const [nVE,setNVE]=useState("");
  const upd=(k,v)=>setSettings(s=>({...s,[k]:parseFloat(v)||v}));
  const freqLabels=["Nooit","Zelden","Normaal","Vaak"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="btn btn-danger" onClick={()=>{setSettings(DEFAULT_SETTINGS);showToast("🔄 Reset naar standaard");}}>🔄 Reset</button>
      </div>
      <div className="settings-grid">
        <div className="settings-section">
          <div className="settings-title">⚙️ Bezettingsnormen</div>
          {[["minMorning","Min. dag (normaal)"],["minEvening","Min. avond (normaal)"],["weekendMinMorning","Min. dag (weekend)"],["weekendMinEvening","Min. avond (weekend)"],["vacMinMorning","Min. dag (vakantie/feest)"],["vacMinEvening","Min. avond (vakantie/feest)"]].map(([k,l])=>(
            <div key={k} className="form-row"><label className="form-label">{l}</label><input className="form-input" type="number" value={settings[k]||0} onChange={e=>upd(k,e.target.value)}/></div>
          ))}
        </div>
        <div className="settings-section">
          <div className="settings-title">😴 Beperkingen</div>
          {[["maxConsecNights","Max. opeenvolgende nachten"],["minRestAfterNights","Min. rust na nachten"],["maxConsecDays","Max. opeenvolgende werkdagen"],["minRestHours","Min. rust tussen shifts (uur)"]].map(([k,l])=>(
            <div key={k} className="form-row"><label className="form-label">{l}</label><input className="form-input" type="number" value={settings[k]||0} onChange={e=>upd(k,e.target.value)}/></div>
          ))}
        </div>
        <div className="settings-section">
          <div className="settings-title">🔒 Globale Lock Datum</div>
          <div className="form-row"><label className="form-label">Alles locken tot en met</label>
            <input className="form-input" type="date" value={lockDate||""} onChange={e=>setLockDate(e.target.value||null)}/>
          </div>
          {lockDate&&<div style={{padding:10,background:"#78350f20",border:"1px solid #78350f",borderRadius:7,fontSize:12,color:"var(--yellow)",marginBottom:8}}>🔒 Historische data beschermd tot {lockDate}</div>}
          <button className="btn btn-danger" onClick={()=>setLockDate(null)}>Verwijderen</button>
        </div>
        <div className="settings-section">
          <div className="settings-title">🎉 Feestdagen</div>
          <div style={{maxHeight:180,overflowY:"auto",marginBottom:10}}>
            {holidays.map(h=>(<div key={h} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace"}}>{h}</span>
              <button className="btn btn-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>setHolidays(p=>p.filter(x=>x!==h))}>✕</button>
            </div>))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input className="form-input" type="date" value={newH} onChange={e=>setNewH(e.target.value)} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={()=>{if(newH){setHolidays(p=>[...new Set([...p,newH])].sort());setNewH("");}}}> + </button>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-title">🏖 Schoolvakanties</div>
          <div style={{maxHeight:160,overflowY:"auto",marginBottom:10}}>
            {vacations.map(v=>(<div key={v.name} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
              <span><strong>{v.name}</strong><br/><span style={{fontSize:10,color:"var(--text-dim)"}}>{v.start} → {v.end}</span></span>
              <button className="btn btn-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>setVacations(p=>p.filter(x=>x.name!==v.name))}>✕</button>
            </div>))}
          </div>
          <div className="form-row"><label className="form-label">Naam</label><input className="form-input" value={nVN} onChange={e=>setNVN(e.target.value)}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            <div><label className="form-label">Van</label><input className="form-input" type="date" value={nVS} onChange={e=>setNVS(e.target.value)}/></div>
            <div><label className="form-label">Tot</label><input className="form-input" type="date" value={nVE} onChange={e=>setNVE(e.target.value)}/></div>
          </div>
          <button className="btn btn-primary" onClick={()=>{if(nVN&&nVS&&nVE){setVacations(p=>[...p,{name:nVN,start:nVS,end:nVE}]);setNVN("");setNVS("");setNVE("");}}}>+ Toevoegen</button>
        </div>
        <div className="settings-section">
          <div className="settings-title">💬 Motivatie (Rami)</div>
          <div className="form-row">
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={!motivatieEnabled} onChange={e=>setMotivatieEnabled(!e.target.checked)} style={{accentColor:"var(--gold)",width:16,height:16}}/>
              <span className="form-label" style={{margin:0}}>Uitschakelen</span>
            </label>
          </div>
          {motivatieEnabled&&(<div className="form-row"><label className="form-label">Frequentie</label>
            <div className="slider-row">
              <input type="range" min={0} max={3} value={motivatieFreq} onChange={e=>setMotivatieFreq(parseInt(e.target.value))}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"var(--gold)",minWidth:50}}>{freqLabels[motivatieFreq]}</span>
            </div>
            <div className="freq-labels"><span>Nooit</span><span>Zelden</span><span>Normaal</span><span>Vaak</span></div>
          </div>)}
        </div>
      </div>
    </div>
  );
}

// ─── STORAGE VIEW ─────────────────────────────────────────────────────────────
function StorageView({onExport,onImport,onSaveToSheets,onLoadFromSheets}){
  return(
    <div>
      <div style={{marginBottom:16,padding:16,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10}}>
        <div style={{fontSize:13,color:"var(--gold)",fontFamily:"'DM Serif Display',serif",marginBottom:8}}>☁️ Supabase Sync</div>
        <div style={{fontSize:12,color:"var(--text-dim)",marginBottom:12}}>Automatische sync tussen alle apparaten.</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-primary" onClick={onSaveToSheets} style={{flex:1,justifyContent:"center"}}>⬆ Opslaan</button>
          <button className="btn" onClick={onLoadFromSheets} style={{flex:1,justifyContent:"center"}}>⬇ Laden</button>
        </div>
      </div>
      <div style={{padding:16,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10}}>
        <div style={{fontSize:13,color:"var(--gold)",fontFamily:"'DM Serif Display',serif",marginBottom:8}}>💾 Lokale Backup</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-primary" onClick={onExport}>⬇ Export JSON</button>
          <label className="btn" style={{cursor:"pointer"}}>⬆ Import JSON<input type="file" accept=".json" style={{display:"none"}} onChange={onImport}/></label>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const YEAR_RANGE=Array.from({length:12},(_,i)=>2026+i);
const LOADING_MSGS=["Even geduld, het casino ontwaakt... 🎰","De shifts worden geshuffeld... 🃏","Rami's planning machine staat op poten...","De kaarten worden geschud, zo klaar! 🂡"];

export default function App(){
  const [view,setView]=useState("week");
  const [weekNum,setWeekNum]=useState(()=>getISOWeek(new Date()));
  const [year,setYear]=useState(()=>load(SK.year,2026));
  const [staff,setStaff]=useState(()=>load(SK.staff,INITIAL_STAFF));
  const [schedule,setSchedule]=useState(()=>load(SK.schedule,{}));
  const [settings,setSettings]=useState(()=>load(SK.settings,DEFAULT_SETTINGS));
  const [holidays,setHolidays]=useState(()=>load(SK.holidays,HOLIDAYS_BY_YEAR[2026]||[]));
  const [vacations,setVacations]=useState(()=>load(SK.vacations,VACATIONS_BY_YEAR[2026]||[]));
  const [locks,setLocks]=useState(()=>load(SK.locks,{}));
  const [lockDate,setLockDate]=useState(()=>load("co3_lockdate",null));
  const [generating,setGenerating]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const [motivatieEnabled,setMotivatieEnabled]=useState(()=>load("co3_motiv_on",true));
  const [motivatieFreq,setMotivatieFreq]=useState(()=>load("co3_motiv_freq",1));
  const [isAppReady,setIsAppReady]=useState(false);
  const actionCount=useRef(0);
  const isLoaded=useRef(false);
  const [loadingMsg]=useState(()=>LOADING_MSGS[Math.floor(Math.random()*LOADING_MSGS.length)]);

  // Auto-save lokaal
  useEffect(()=>{ save(SK.staff,staff); },[staff]);
  useEffect(()=>{ save(SK.schedule,schedule); },[schedule]);
  useEffect(()=>{ save(SK.settings,settings); },[settings]);
  useEffect(()=>{ save(SK.holidays,holidays); },[holidays]);
  useEffect(()=>{ save(SK.vacations,vacations); },[vacations]);
  useEffect(()=>{ save(SK.locks,locks); },[locks]);
  useEffect(()=>{ save("co3_lockdate",lockDate); },[lockDate]);
  useEffect(()=>{ save("co3_motiv_on",motivatieEnabled); },[motivatieEnabled]);
  useEffect(()=>{ save("co3_motiv_freq",motivatieFreq); },[motivatieFreq]);
  useEffect(()=>{ save(SK.year,year); },[year]);

  const showToast=(msg,type="normal")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const triggerMotivatie=useCallback(()=>{
    if(!motivatieEnabled||motivatieFreq===0) return;
    actionCount.current++;
    const thresh=[0,15,8,4][motivatieFreq]||10;
    if(actionCount.current>=thresh){ actionCount.current=0; showToast(MOTIVATIE[Math.floor(Math.random()*MOTIVATIE.length)],"motivatie"); }
  },[motivatieEnabled,motivatieFreq]);

  const handleYearChange=(y)=>{
    const yi=parseInt(y); setYear(yi);
    if(HOLIDAYS_BY_YEAR[yi]) setHolidays(HOLIDAYS_BY_YEAR[yi]);
    if(VACATIONS_BY_YEAR[yi]) setVacations(VACATIONS_BY_YEAR[yi]);
    setWeekNum(1); showToast(`📅 Jaar ${yi} geladen.`);
  };

  const handleNavigateAlert=useCallback((ds)=>{
    setYear(new Date(ds).getFullYear());
    setWeekNum(getISOWeek(new Date(ds)));
    setView("week");
    showToast(`📍 Genavigeerd naar ${ds}`);
  },[]);

  const generateRoster=useCallback(()=>{
    setGenerating(true);
    setTimeout(()=>{
      const {schedule:ns}=generateSchedule(staff,year,settings,holidays,vacations,schedule,locks,lockDate);
      setSchedule(ns);
      setGenerating(false);
      showToast("✅ Rooster gegenereerd!");
      triggerMotivatie();
    },600);
  },[staff,year,settings,holidays,vacations,schedule,locks,lockDate,triggerMotivatie]);

  const exportCSV=()=>{
    const dates=[]; for(let m=0;m<12;m++){const dim=new Date(year,m+1,0).getDate();for(let d=1;d<=dim;d++) dates.push(toDS(new Date(year,m,d)));}
    const header=["Naam","FTE",...dates].join(";");
    const rows=staff.map(s=>[s.name,s.fte,...dates.map(ds=>getShift((schedule[s.id]||{})[ds]||"off").label)].join(";"));
    const blob=new Blob(["\uFEFF"+[header,...rows].join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`rooster_${year}.csv`; a.click();
    showToast("📊 CSV geëxporteerd!");
  };
  const exportJSON=()=>{
    const blob=new Blob([JSON.stringify({staff,schedule,settings,holidays,vacations,locks,lockDate,year},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`casino_backup_${year}.json`; a.click();
    showToast("💾 Backup geëxporteerd!");
  };
  const importJSON=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(d.staff) setStaff(d.staff); if(d.schedule) setSchedule(d.schedule);
        if(d.settings) setSettings(d.settings); if(d.holidays) setHolidays(d.holidays);
        if(d.vacations) setVacations(d.vacations); if(d.locks) setLocks(d.locks);
        if(d.lockDate) setLockDate(d.lockDate); if(d.year) setYear(d.year);
        showToast("✅ Backup hersteld!");
      }catch{ showToast("❌ Ongeldig bestand"); }
    };
    reader.readAsText(file); e.target.value="";
  };

  const saveToSheets=useCallback(async()=>{
    try{
      await Promise.all([sbSet("staff",staff),sbSet("schedule",schedule),sbSet("settings",settings),sbSet("holidays",holidays),sbSet("vacations",vacations),sbSet("locks",locks)]);
      showToast("✅ Opgeslagen naar Supabase!");
    }catch{ showToast("❌ Fout bij opslaan."); }
  },[staff,schedule,settings,holidays,vacations,locks]);

  const loadFromSheets=useCallback(async()=>{
    try{
      const [sd,sc,se,sh,sv,sl]=await Promise.all([sbGet("staff"),sbGet("schedule"),sbGet("settings"),sbGet("holidays"),sbGet("vacations"),sbGet("locks")]);
      if(sd&&Array.isArray(sd)&&sd.length>0){
        isLoaded.current=false;
        setStaff(sd.map(s=>({...s,id:Number(s.id)})));
        if(sc){ const fx={}; Object.entries(sc).forEach(([k,v])=>{fx[Number(k)]=v;}); setSchedule(fx); }
        if(se) setSettings(s=>({...s,...se}));
        if(sh) setHolidays(sh);
        if(sv) setVacations(sv);
        if(sl) setLocks(sl);
        setTimeout(()=>{ isLoaded.current=true; showToast("✅ Data geladen!"); },2000);
      } else { isLoaded.current=true; }
    }catch{ isLoaded.current=true; }
    finally{ setIsAppReady(true); }
  },[]);

  useEffect(()=>{ loadFromSheets(); },[]);

  // Auto-save naar Supabase (debounced)
  useEffect(()=>{
    if(!isLoaded.current) return;
    const t=setTimeout(async()=>{
      try{ await Promise.all([sbSet("staff",staff),sbSet("schedule",schedule),sbSet("settings",settings),sbSet("holidays",holidays),sbSet("vacations",vacations),sbSet("locks",locks)]); }catch{}
    },2000);
    return()=>clearTimeout(t);
  },[staff,schedule,settings,holidays,vacations,locks]);

  const weeksInYear=getWeeksInYear(year);
  const weekDates=getWeekDates(year,weekNum);
  const ws=weekDates[0],we=weekDates[6];
  const weekLabel=`Week ${weekNum} — ${ws.getDate()} ${MONTHS_NL[ws.getMonth()]} – ${we.getDate()} ${MONTHS_NL[we.getMonth()]} ${year}`;
  const navItems=[
    {id:"week",icon:"📅",label:"Weekplanning"},
    {id:"year",icon:"📆",label:"Jaaroverzicht"},
    {id:"stats",icon:"📊",label:"Personeelsstats"},
    {id:"staff",icon:"👥",label:"Personeel"},
    {id:"settings",icon:"⚙️",label:"Instellingen"},
    {id:"storage",icon:"💾",label:"Opslag & Backup"},
  ];

  return(
    <>
      <style>{style}</style>
      {!isAppReady&&(
        <div style={{position:"fixed",inset:0,background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:999,gap:16}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"var(--gold)"}}>Casino Oostende</div>
          <div style={{fontSize:11,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:".2em"}}>Live Games Planner</div>
          <div style={{width:48,height:48,border:"3px solid var(--border)",borderTop:"3px solid var(--gold)",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
          <div style={{marginTop:8,fontSize:13,color:"var(--text-dim)",fontStyle:"italic",maxWidth:300,textAlign:"center",padding:"12px 20px",background:"var(--surface2)",borderRadius:10,border:"1px solid var(--border)"}}>{loadingMsg}</div>
        </div>
      )}
      <div className="app" style={{opacity:isAppReady?1:0,pointerEvents:isAppReady?"auto":"none"}}>
        <div className={`sidebar${sidebarOpen?" open":""}`}>
          <div className="sidebar-logo">
            <div className="logo-main">Casino Oostende</div>
            <div className="logo-sub">Live Games Planner</div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-label">Planning</div>
              {navItems.map(item=>(
                <button key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>{setView(item.id);setSidebarOpen(false);}}>
                  <span className="nav-icon">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
            <div className="nav-section">
              <div className="nav-label">Acties</div>
              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={generateRoster} disabled={generating||!isAppReady}>
                {generating?"⏳ Bezig...":"🎲 Genereer Rooster"}
              </button>
              <button className="btn btn-danger" style={{width:"100%",justifyContent:"center",marginTop:6}} onClick={()=>{
                if(!window.confirm("Schema volledig wissen voor "+year+"?")) return;
                const empty={};
                staff.forEach(s=>{ empty[s.id]={}; });
                setSchedule(prev=>({...prev,...empty}));
                showToast("🗑 Schema gewist voor "+year);
              }} disabled={!isAppReady}>
                🗑 Reset schema {year}
              </button>
              <div style={{marginTop:8,padding:"8px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8}}>
                <div style={{fontSize:10,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>🔒 Lock tot datum</div>
                <input type="date" value={lockDate||""} onChange={e=>setLockDate(e.target.value||null)}
                  style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",color:lockDate?"var(--yellow)":"var(--text-dim)",padding:"5px 8px",borderRadius:6,fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}/>
                {lockDate&&<div style={{fontSize:10,color:"var(--yellow)",marginTop:4}}>Beschermd tot {lockDate}</div>}
              </div>
            </div>
          </nav>
          <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",fontSize:11,color:"var(--text-dim)"}}>
            {staff.filter(s=>!s.isFlexijob).length} mw • {staff.filter(s=>!s.isFlexijob).reduce((a,s)=>a+s.fte,0).toFixed(1)} FTE
            {lockDate&&<div style={{marginTop:4}}><span className="lock-date-badge">🔒 tot {lockDate}</span></div>}
          </div>
        </div>
        <div className={`sidebar-overlay${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}/>
        <div className="main">
          <div className="topbar">
            <button className="hamburger" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>
            <div className="topbar-title">{{week:weekLabel,year:`Jaaroverzicht ${year}`,stats:"Personeelsstatistieken",staff:"Personeelsbeheer",settings:"Instellingen",storage:"Opslag & Backup"}[view]}</div>
            <div className="topbar-actions">
              <select className="year-select" value={year} onChange={e=>handleYearChange(e.target.value)}>
                {YEAR_RANGE.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              {view==="week"&&(<>
                <button className="btn" onClick={()=>setWeekNum(w=>Math.max(1,w-1))}>←</button>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--text-dim)",minWidth:48,textAlign:"center"}}>W{weekNum}/{weeksInYear}</span>
                <button className="btn" onClick={()=>setWeekNum(w=>Math.min(weeksInYear,w+1))}>→</button>
              </>)}
              <button className="btn btn-hide-mobile" onClick={exportCSV}>⬇ CSV</button>
              <button className="btn btn-hide-mobile" onClick={exportJSON}>💾</button>
            </div>
          </div>
          <div className="content">
            {view==="week"&&<WeekView staff={staff} schedule={schedule} setSchedule={setSchedule} weekNum={weekNum} year={year} settings={settings} holidays={holidays} vacations={vacations} locks={locks} setLocks={setLocks} lockDate={lockDate} onNavigateAlert={handleNavigateAlert}/>}
            {view==="year"&&<YearView schedule={schedule} staff={staff} year={year} holidays={holidays} vacations={vacations} settings={settings} onDayClick={ds=>{setWeekNum(getISOWeek(new Date(ds)));setView("week");}}/>}
            {view==="stats"&&<StaffStats staff={staff} schedule={schedule} year={year} holidays={holidays}/>}
            {view==="staff"&&<StaffManager staff={staff} setStaff={setStaff} schedule={schedule} year={year}/>}
            {view==="settings"&&<SettingsView settings={settings} setSettings={setSettings} holidays={holidays} setHolidays={setHolidays} vacations={vacations} setVacations={setVacations} lockDate={lockDate} setLockDate={setLockDate} motivatieEnabled={motivatieEnabled} setMotivatieEnabled={setMotivatieEnabled} motivatieFreq={motivatieFreq} setMotivatieFreq={setMotivatieFreq} showToast={showToast}/>}
            {view==="storage"&&<StorageView onExport={exportJSON} onImport={importJSON} onSaveToSheets={saveToSheets} onLoadFromSheets={loadFromSheets}/>}
          </div>
        </div>
      </div>
      {toast&&<div className={`toast ${toast.type==="motivatie"?"motivatie":""}`}>
        {toast.type==="motivatie"&&<div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".12em",marginBottom:6,opacity:.8,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"spin 3s linear infinite",display:"inline-block"}}>🎰</span> Bericht voor Rami</div>}
        {toast.msg}
      </div>}
    </>
  );
}
