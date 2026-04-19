import { useState, useCallback, useEffect, useMemo, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SHIFTS = {
  MORNING:  { id:"morning",  label:"Dag",     time:"15:00–21:00", startHour:15, endHour:21,  hours:6,   color:"#f59e0b", bg:"#78350f" },
  EVENING:  { id:"evening",  label:"Avond",   time:"21:00–05:00", startHour:21, endHour:29,  hours:8,   color:"#3b82f6", bg:"#1e3a5f" },
  NIGHT:    { id:"night",    label:"Nacht",   time:"21:00–05:30", startHour:21, endHour:29.5,hours:8.5, color:"#8b5cf6", bg:"#3b0764" },
  OFF:      { id:"off",      label:"Vrij",    time:"",            startHour:0,  endHour:0,   hours:0,   color:"#374151", bg:"#111827" },
  VACATION: { id:"vacation", label:"Vakantie",time:"",            startHour:0,  endHour:0,   hours:0,   color:"#065f46", bg:"#022c22" },
  SICK:     { id:"sick",     label:"Ziek",    time:"",            startHour:0,  endHour:0,   hours:0,   color:"#7f1d1d", bg:"#450a0a" },
};
const FTE_VACATION = { 1.0:24, 0.8:19, 0.5:12 };
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
             holidays:"co3_holidays", vacations:"co3_vacations", year:"co3_year",
             locks:"co3_locks", gasUrl:"co3_gasurl" };
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
  const s=new Date(jan4);
  s.setDate(jan4.getDate()-((jan4.getDay()+6)%7));
  const start=new Date(s); start.setDate(s.getDate()+(week-1)*7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d; });
}
function toDS(date){ return date.toISOString().slice(0,10); }
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
function isLeapYear(y){ return (y%4===0&&y%100!==0)||(y%400===0); }
function getWeeksInYear(y){
  const dec28=new Date(y,11,28);
  return getISOWeek(dec28);
}
function lockKey(sid,ds){ return `${sid}::${ds}`; }

// ─── GENERATOR ───────────────────────────────────────────────────────────────

// ─── CONSTANTS (extern gedefinieerd, hier als referentie) ────────────────────
// SHIFTS, toDS, getISOWeek, getWeeksInYear, getDayDemand,
// isAvailOnDate, isWeekend, lockKey — worden extern aangeleverd.

// ─── SHIFT POOLS ─────────────────────────────────────────────────────────────
const SHIFT_POOLS = [
  { start: 15.0, duration: 7.0 },
  { start: 16.5, duration: 7.0 },
  { start: 18.0, duration: 7.5 },
  { start: 19.0, duration: 7.0 },
  { start: 20.0, duration: 8.0 },
  { start: 21.0, duration: 8.0 },
  { start: 22.0, duration: 7.5 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Geeft een consistente shift uit SHIFT_POOLS voor een medewerker,
 * gebaseerd op hun ID en positie in het werkblok.
 * Vroeger in het blok (posFromEnd groter) → latere shift.
 * Later in het blok (posFromEnd kleiner) → vroegere shift.
 */
function getPersonalShift(staffId, posFromEnd, blockLen) {
  const len = SHIFT_POOLS.length;
  const baseIdx = staffId % len;
  // ratio loopt van 0 (begin blok) naar 1 (einde blok)
  const ratio = posFromEnd / Math.max(blockLen - 1, 1);
  // Hoog posFromEnd → hoog idx (late shift). Laag posFromEnd → laag idx (vroege shift).
  const idx = Math.min(Math.floor(ratio * (len - 1 - baseIdx) + baseIdx), len - 1);
  return SHIFT_POOLS[Math.max(0, idx)];
}

/**
 * Formateert een decimaal uur (bv. 22.5) naar "HH:MM".
 * Uren >= 24 worden gewrapped naar de volgende dag.
 */
function formatHour(h) {
  const normalized = h >= 24 ? h - 24 : h;
  const hh = Math.floor(normalized);
  const mm = Math.round((normalized - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Leidt een shift-ID af uit het startuur.
 * < 18:00 → "morning", 18–21 → "evening", >= 21 → "night"
 */
function deriveShiftId(startHour) {
  if (startHour < 18) return "morning";
  if (startHour < 21) return "evening";
  return "night";
}

/**
 * Geeft het jaardoelaantal uren voor een medewerker.
 * Flexijobbers hebben geen limiet.
 */
function getTargetHours(s) {
  if (s.isFlexijob) return 9999;
  return s.fte * 38 * 52;
}

/**
 * Berekent het absolute einduur (in uren sinds epoch) van een shift.
 */
function getShiftEndAbsolute(ds, shiftId) {
  const shift = SHIFTS[shiftId?.toUpperCase()];
  if (!shift || shift.hours === 0) return 0;
  const date = new Date(ds);
  const dayStartHours = date.getTime() / (1000 * 60 * 60);
  return dayStartHours + shift.startHour + shift.hours;
}

/**
 * Controleert of er genoeg rust zit tussen de vorige shift en het
 * vroegst mogelijke starttijdstip van de nieuwe dag (15:00 = OP_DAY_START).
 * Dit is conservatiever dan checken op de exacte volgende shift,
 * maar correct omdat we de volgende shift nog niet kennen bij het filteren.
 */
function hasEnoughRest(prevDs, prevShiftId, nextDs, minRestHours) {
  const prevShift = SHIFTS[prevShiftId?.toUpperCase()];
  if (!prevShift || prevShift.hours === 0) return true;

  const prevEnd = getShiftEndAbsolute(prevDs, prevShiftId);
  if (prevEnd === 0) return true;

  const nextDate = new Date(nextDs);
  const nextDayStartHours = nextDate.getTime() / (1000 * 60 * 60);
  // Vroegst mogelijke start op de volgende dag = 15:00
  const earliestNextStart = nextDayStartHours + 15;

  return (earliestNextStart - prevEnd) >= minRestHours;
}

/**
 * Geeft de dag-index binnen het jaar terug (0 = 1 jan, 364/365 = 31 dec).
 */
function getDayIndex(date, year) {
  const startOfYear = new Date(year, 0, 1);
  return Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Geeft het aantal dagen in een jaar terug (365 of 366 voor schrikkeljaar).
 */
function getDaysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

/**
 * Bouwt een werkblok-patroon (array van "work"/"off") voor elke medewerker
 * voor het volledige jaar. Het patroon is gebaseerd op FTE en wordt
 * gelijkmatig verspreid over het team via een offset.
 */
/**
 * Bouwt een werkblok-patroon per medewerker voor het volledige jaar.
 *
 * Kernwijziging: de cyclus wordt berekend op basis van het aantal
 * beschikbare dagen van de medewerker, niet een vaste 7-daagse week.
 * Doel: 4–5 werkdagen en 2–3 vrije dagen per beschikbare week.
 */
function buildWorkBlocks(staff, year) {
  const totalDays = getDaysInYear(year);
  const patterns  = {};

  staff.forEach((s, idx) => {

    // Flexijobbers: altijd beschikbaar, geen patroon nodig
    if (s.isFlexijob) {
      patterns[s.id] = Array(totalDays).fill("work");
      return;
    }

    // Hoeveel dagen per week is deze medewerker contractueel beschikbaar?
    const availPerWeek = s.availableDays ? s.availableDays.length : 7;

    // Bereken werkdagen en vrije dagen op basis van FTE én beschikbaarheid.
    // Doel: ~4–5 werkdagen per beschikbare week voor voltijds,
    //       proportioneel minder voor deeltijds.
    let workDays, freeDays;

    if (s.fte >= 1.0) {
      // Voltijds: 5 werkdagen, rest vrij
      workDays = Math.min(5, availPerWeek);
      freeDays = Math.max(availPerWeek - workDays, 2);
    } else if (s.fte >= 0.8) {
      // 4/5: 4 werkdagen
      workDays = Math.min(4, availPerWeek);
      freeDays = Math.max(availPerWeek - workDays, 1);
    } else {
      // Halftijds: 3 werkdagen
      workDays = Math.min(3, availPerWeek);
      freeDays = Math.max(availPerWeek - workDays, 1);
    }

    // Cyclus = werkdagen + vrije dagen (enkel over beschikbare dagen)
    const cycleLen = workDays + freeDays;

    // Spreid medewerkers gelijkmatig over de cyclus
    // zodat niet iedereen tegelijk vrij heeft
    const offset = Math.floor((idx * cycleLen) / Math.max(staff.length, 1)) % cycleLen;

    // Bouw het dagpatroon voor het volledige jaar.
    // Belangrijk: we tellen ALLEEN beschikbare dagen mee in de cyclus.
    // Op niet-beschikbare dagen (bv. maandag voor iemand die ma niet werkt)
    // zetten we altijd "off" — de availableDays-check in generateSchedule
    // doet dit toch al, maar dit maakt het patroon consistent.
    const days = [];
    let availableDayCounter = 0; // telt enkel beschikbare dagen

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(year, 0, 1);
      date.setDate(date.getDate() + i);
      const dow = (date.getDay() + 6) % 7; // 0=ma … 6=zo

      if (!s.availableDays || s.availableDays.includes(dow)) {
        // Beschikbare dag: volg het cyclus-patroon
        const posInCycle = (availableDayCounter + offset) % cycleLen;
        days.push(posInCycle < workDays ? "work" : "off");
        availableDayCounter++;
      } else {
        // Niet-beschikbare dag: altijd vrij
        days.push("off");
      }
    }

    patterns[s.id] = days;
  });

  return patterns;
}


/**
 * getDaysInYear — ongewijzigd, hier herhaald voor volledigheid.
 */
function getDaysInYear(year) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}


/**
 * Bepaalt de positie en lengte van het huidige werkblok
 * waarbinnen een medewerker op een bepaalde dag valt.
 */
function getBlockPosition(workBlocks, staffId, dayIdx) {
  const block = workBlocks[staffId];
  if (!block || block[dayIdx] !== "work") return { posInBlock: 0, blockLen: 1 };

  let blockStart = dayIdx;
  while (blockStart > 0 && block[blockStart - 1] === "work") blockStart--;

  let blockEnd = dayIdx;
  while (blockEnd < block.length - 1 && block[blockEnd + 1] === "work") blockEnd++;

  return {
    posInBlock: dayIdx - blockStart,
    blockLen: blockEnd - blockStart + 1,
  };
}

/**
 * Controleert of de huidige bezetting voor een dag al voldoet aan de minimumvraag.
 */
function isCoverageSufficient(ds, currentSchedule, staff, demand) {
  let morning = 0;
  let evening = 0;
  staff.forEach(s => {
    const sh = (currentSchedule[s.id] || {})[ds];
    if (sh === "morning") morning++;
    if (sh === "evening" || sh === "night") evening++;
  });
  return morning >= demand.morning && evening >= demand.evening;
}

// ─── GENERATOR ────────────────────────────────────────────────────────────────

function generateSchedule(staff, year, settings, holidays, vacations, existingSchedule, locks, lockDate) {
  const schedule = {};
  const regular = staff.filter(s => !s.isFlexijob && s.autoSchedule !== false);
  const flexi   = staff.filter(s =>  s.isFlexijob && s.autoSchedule !== false);
  const all = [...regular, ...flexi];

  // Kopieer bestaand rooster als basis (o.a. manuele locks en vakantie)
  all.forEach(s => {
    schedule[s.id] = { ...(existingSchedule[s.id] || {}) };
  });

  const stats = {};
  const hoursWorked = {};
  const workBlocks = buildWorkBlocks(all, year);

  all.forEach(s => {
    stats[s.id] = {
      weekendShifts: 0,
      nightShifts: 0,
      totalHours: 0,
      consecutiveNights: 0,
    };
    hoursWorked[s.id] = 0;
  });

  const lockDateObj = lockDate ? new Date(lockDate) : null;

  for (let d = new Date(year, 0, 1); d <= new Date(year, 11, 31); d.setDate(d.getDate() + 1)) {
    const ds = toDS(d);

    // Sla gelockte datums over — bestaande shifts blijven staan
    if (lockDateObj && d <= lockDateObj) continue;

    const isoWeek = getISOWeek(d);
    const demand  = getDayDemand(ds, settings, holidays, vacations);

    // Bepaal wie beschikbaar is op deze dag
    const available = all.filter(s => {
      // Individueel gelockte cel → niet overschrijven
      if (locks[lockKey(s.id, ds)]) return false;

      // Beschikbaarheidsdagen (contractueel)
      if (!isAvailOnDate(s, ds, isoWeek)) return false;

      // Max opeenvolgende nachtdiensten bereikt
      if (stats[s.id].consecutiveNights >= settings.maxConsecNights) return false;

      // Vaste medewerkers: alleen inplannen op "work"-dagen
      if (!s.isFlexijob) {
        const dayIdx = getDayIndex(d, year);
        const block  = workBlocks[s.id];
        if (block && block[dayIdx] === "off") return false;
      }

      // Niet meer dan 5% boven jaardoeluren
      const target = getTargetHours(s);
      if (hoursWorked[s.id] >= target * 1.05) return false;

      // Minimum rusttijd na vorige shift
      const prevDate = new Date(d);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDs    = toDS(prevDate);
      const prevShift = (schedule[s.id] || {})[prevDs];
      if (prevShift && prevShift !== "off" && prevShift !== "vacation" && prevShift !== "sick") {
        if (!hasEnoughRest(prevDs, prevShift, ds, settings.minRestHours || 11)) {
          return false;
        }
      }

      return true;
    });

    // Sorteer op uren-achterstand (wie het verste achterloopt, gaat voor)
    const sorted = [...available].sort((a, b) => {
      const ratioA = hoursWorked[a.id] / Math.max(getTargetHours(a), 1);
      const ratioB = hoursWorked[b.id] / Math.max(getTargetHours(b), 1);
      return ratioA - ratioB;
    });

    // Gelockte cellen tellen al mee als toegewezen
    const assigned = new Set();
    all.forEach(s => { if (locks[lockKey(s.id, ds)]) assigned.add(s.id); });

    // ── 1. Eerst avond/nacht bezetting invullen (hogere prioriteit) ──────────
    let eveningAssigned = 0;
    for (const s of sorted) {
      if (eveningAssigned >= demand.evening) break;
      if (assigned.has(s.id)) continue;

      const dayIdx = getDayIndex(d, year);
      const { posInBlock, blockLen } = getBlockPosition(workBlocks, s.id, dayIdx);
      const posFromEnd = blockLen - 1 - posInBlock;
      const shift = getPersonalShift(s.id, posFromEnd, blockLen);

      // Sla over als dit een dagshift zou worden
      if (shift.start < 18) continue;

      const shiftId = deriveShiftId(shift.start);
      schedule[s.id][ds] = shiftId;
      hoursWorked[s.id]  += shift.duration;
      stats[s.id].totalHours += shift.duration;

      // consecutiveNights enkel verhogen bij echte nachtshift
      if (shiftId === "night") {
        stats[s.id].consecutiveNights++;
        stats[s.id].nightShifts++;
      } else {
        // Avondshift reset de nacht-teller
        stats[s.id].consecutiveNights = 0;
      }

      if (isWeekend(d)) stats[s.id].weekendShifts++;
      assigned.add(s.id);
      eveningAssigned++;
    }

    // ── 2. Dan dagbezetting invullen ─────────────────────────────────────────
    let morningAssigned = 0;
    for (const s of sorted) {
      if (morningAssigned >= demand.morning) break;
      if (assigned.has(s.id)) continue;

      const dayIdx = getDayIndex(d, year);
      const { posInBlock, blockLen } = getBlockPosition(workBlocks, s.id, dayIdx);
      const posFromEnd = blockLen - 1 - posInBlock;
      const shift = getPersonalShift(s.id, posFromEnd, blockLen);

      // Sla over als dit een avond/nachtshift zou worden
      if (shift.start >= 18) continue;

      schedule[s.id][ds] = "morning";
      hoursWorked[s.id]  += shift.duration;
      stats[s.id].totalHours += shift.duration;
      stats[s.id].consecutiveNights = 0;

      if (isWeekend(d)) stats[s.id].weekendShifts++;
      assigned.add(s.id);
      morningAssigned++;
    }

    // ── 3. Niet ingeplanden krijgen vrij ─────────────────────────────────────
    all.forEach(s => {
      if (assigned.has(s.id)) return;
      schedule[s.id][ds] = "off";
      stats[s.id].consecutiveNights = 0;
    });

    // ── 4. Overbezetting bij rustige periodes afvlakken ───────────────────────
    // Medewerkers die op een "work"-dag staan maar niet nodig zijn → vrij
    if (isCoverageSufficient(ds, schedule, all, demand)) {
      all.forEach(s => {
        if (s.isFlexijob) return;
        if (locks[lockKey(s.id, ds)]) return;
        const dayIdx = getDayIndex(d, year);
        const block  = workBlocks[s.id];
        // Alleen aanpassen als het werkblok "work" zegt maar persoon niet kritisch is
        if (block && block[dayIdx] === "work" && schedule[s.id][ds] === "off") {
          // Al "off" gezet in stap 3, coverage is voldoende → geen actie nodig
        }
      });
    }
  }

  // Statistieken afronden
  all.forEach(s => {
    stats[s.id].targetHours  = Math.round(getTargetHours(s));
    stats[s.id].plannedHours = Math.round(hoursWorked[s.id]);
    stats[s.id].hoursDiff    = Math.round(hoursWorked[s.id] - getTargetHours(s));
  });

  return { schedule, stats };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const style=`
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#c9a84c;--gold-dim:#8a6f2e;--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a28;--surface3:#22223a;--border:#2a2a42;--text:#e8e8f0;--text-dim:#888899;--red:#ef4444;--yellow:#f59e0b;--green:#22c55e;--blue:#3b82f6;--purple:#8b5cf6;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:var(--bg);}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.app{display:flex;height:100vh;overflow:hidden;}
.sidebar{width:224px;min-width:224px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;}
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
.topbar{height:56px;min-height:56px;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 24px;gap:10px;}
.topbar-title{font-family:'DM Serif Display',serif;font-size:17px;color:var(--text);flex:1;}
.topbar-actions{display:flex;gap:8px;align-items:center;}
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
.btn-lock{background:#1e3a5f;border-color:#3b82f6;color:#60a5fa;}
.content{flex:1;overflow:auto;padding:24px;}
.week-grid{width:100%;border-collapse:collapse;}
.week-grid th{background:var(--surface2);padding:8px 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);border:1px solid var(--border);font-weight:500;white-space:nowrap;}
.week-grid th.weekend{color:var(--gold);}
.week-grid td{border:1px solid var(--border);padding:3px;vertical-align:top;min-width:88px;}
.staff-cell{background:var(--surface);padding:6px 8px;font-size:12px;font-weight:500;border-right:2px solid var(--border);white-space:nowrap;max-width:148px;overflow:hidden;text-overflow:ellipsis;}
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
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
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
.year-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
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
.shift-picker{position:fixed;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px;z-index:50;display:flex;flex-direction:column;gap:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);}
.shift-option{padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;display:flex;gap:8px;align-items:center;transition:filter .1s;}
.shift-option:hover{filter:brightness(1.3);}
.alert-banner{background:#7f1d1d30;border:1px solid #7f1d1d;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--red);display:flex;align-items:center;gap:8px;cursor:pointer;transition:background .15s;}
.alert-banner:hover{background:#7f1d1d50;}
.warn-banner{background:#78350f30;border:1px solid #78350f;border-radius:8px;padding:10px 14px;margin-bottom:8px;font-size:12px;color:var(--yellow);display:flex;align-items:center;gap:8px;}
.legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-dim);}
.legend-dot{width:10px;height:10px;border-radius:3px;}
.day-checks{display:flex;gap:6px;flex-wrap:wrap;}
.day-check{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--text-dim);cursor:pointer;}
.day-check input{accent-color:var(--gold);width:14px;height:14px;cursor:pointer;}
.day-check.active{color:var(--text);}
.gas-steps{counter-reset:step;}
.gas-step{counter-increment:step;display:flex;gap:12px;margin-bottom:16px;padding:14px;background:var(--surface3);border-radius:8px;border-left:3px solid var(--gold);}
.gas-step::before{content:counter(step);font-family:'IBM Plex Mono',monospace;font-size:18px;color:var(--gold);font-weight:700;min-width:24px;}
.gas-code{background:#0d1117;border:1px solid var(--border);border-radius:8px;padding:14px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#e6edf3;overflow-x:auto;white-space:pre;margin-top:8px;max-height:260px;overflow-y:auto;}
.slider-row{display:flex;align-items:center;gap:10px;}
.slider-row input[type=range]{flex:1;accent-color:var(--gold);}
.freq-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);margin-top:2px;}
.storage-options{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}
.storage-card{background:var(--surface3);border:1px solid var(--border);border-radius:10px;padding:16px;}
.storage-card h3{font-size:13px;color:var(--gold);margin-bottom:8px;font-family:'DM Serif Display',serif;}
.storage-card p{font-size:12px;color:var(--text-dim);line-height:1.6;}
.pro{color:var(--green);font-size:11px;margin-top:2px;}
.con{color:var(--red);font-size:11px;margin-top:2px;}
.lock-date-badge{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--yellow);background:#78350f30;padding:3px 8px;border-radius:4px;border:1px solid #78350f;}
`;

// ─── SHIFT PICKER ────────────────────────────────────────────────────────────
function ShiftPicker({pos,onSelect,onClose,isLocked,onToggleLock}){
  useEffect(()=>{ const h=()=>onClose(); window.addEventListener("click",h); return()=>window.removeEventListener("click",h); },[onClose]);
  return(
    <div className="shift-picker" style={{top:pos.y,left:Math.min(pos.x,window.innerWidth-240)}} onClick={e=>e.stopPropagation()}>
      {Object.values(SHIFTS).map(s=>(
        <div key={s.id} className="shift-option" style={{background:s.bg,color:s.color}} onClick={()=>{onSelect(s.id);onClose();}}>
          <div style={{width:8,height:8,borderRadius:3,background:s.color}}/>
          <span style={{minWidth:60}}>{s.label}</span>
          {s.time&&<span style={{opacity:.7,fontFamily:"'IBM Plex Mono',monospace",fontSize:11}}>{s.time}</span>}
        </div>
      ))}
      <div style={{borderTop:"1px solid var(--border)",marginTop:4,paddingTop:4}}>
        <div className="shift-option" style={{background:isLocked?"#1e3a5f30":"#1e3a5f",color:"#60a5fa"}}
          onClick={()=>{onToggleLock();onClose();}}>
          {isLocked?"🔓 Ontgrendelen":"🔒 Vergrendelen"}
        </div>
      </div>
    </div>
  );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({staff,schedule,setSchedule,weekNum,year,settings,holidays,vacations,locks,setLocks,lockDate,onNavigateAlert}){
  const [picker,setPicker]=useState(null);
  const [unavailWarn,setUnavailWarn]=useState(null);
  const dates=getWeekDates(year,weekNum);
  const weeksInYear=getWeeksInYear(year);

  const handleShiftClick=useCallback((e,staffId,dateStr,isLocked)=>{
    if(isLocked) return;
    const ds=dateStr;
    const lockDateObj=lockDate?new Date(lockDate):null;
    if(lockDateObj&&new Date(ds)<=lockDateObj){ setUnavailWarn("🔒 Deze datum is globaal gelockt."); setTimeout(()=>setUnavailWarn(null),3000); return; }
    e.stopPropagation();
    setPicker({x:e.clientX,y:e.clientY,staffId,dateStr});
  },[lockDate]);

  const handleSelect=useCallback((shiftId)=>{
    if(!picker) return;
    const {staffId,dateStr}=picker;
    const s=staff.find(x=>x.id===staffId);
    const date=new Date(dateStr); const dow=(date.getDay()+6)%7;
    if(s&&!["off","vacation","sick"].includes(shiftId)&&!s.availableDays.includes(dow)){
      setUnavailWarn(`⚠️ ${s.name} is normaal niet beschikbaar op ${DAYS_FULL[dow]}.`);
      setTimeout(()=>setUnavailWarn(null),4000);
    }
    if(shiftId==="vacation"){
      const used=countVacDays(staffId,schedule,year);
      if(used>=(s?.vacationDays||0)){
        setUnavailWarn(`⚠️ ${s?.name} heeft geen vakantiedagen meer.`);
        setTimeout(()=>setUnavailWarn(null),4000);
      }
    }
    setSchedule(prev=>({...prev,[staffId]:{...(prev[staffId]||{}),[dateStr]:shiftId}}));
    // auto-lock vacation/sick
    if(shiftId==="vacation"||shiftId==="sick"){
      setLocks(prev=>({...prev,[lockKey(staffId,dateStr)]:true}));
    }
  },[picker,setSchedule,staff,schedule,year,setLocks]);

  const handleToggleLock=useCallback(()=>{
    if(!picker) return;
    const k=lockKey(picker.staffId,picker.dateStr);
    setLocks(prev=>({...prev,[k]:!prev[k]}));
  },[picker,setLocks]);

  // Coverage
  const coverage=dates.map(date=>{
    const ds=toDS(date);
    const demand=getDayDemand(ds,settings,holidays,vacations);
    let morning=0,evening=0;
    staff.forEach(s=>{ const sh=(schedule[s.id]||{})[ds]; if(sh==="morning") morning++; if(sh==="evening"||sh==="night") evening++; });
    return{morning,evening,demMorning:demand.morning,demEvening:demand.evening,ds};
  });

  // Fatigue conflicts
  const conflicts=[];
  staff.forEach(s=>{
    dates.forEach((date,i)=>{
      if(i===0) return;
      const ds=toDS(date); const sh=(schedule[s.id]||{})[ds];
      const prevDs=toDS(dates[i-1]); const prevSh=(schedule[s.id]||{})[prevDs];
      if((prevSh==="evening"||prevSh==="night")&&sh==="morning") conflicts.push({staffId:s.id,dateStr:ds});
    });
  });

  // ALERTS (interactive)
  const alerts=[];
  coverage.forEach(c=>{
    const date=new Date(c.ds); const di=(date.getDay()+6)%7;
    if(c.morning<c.demMorning) alerts.push({msg:`Onderbezetting dag: ${DAYS_NL[di]} ${date.getDate()}/${date.getMonth()+1} (${c.morning}/${c.demMorning})`,ds:c.ds,type:"under"});
    if(c.evening<c.demEvening) alerts.push({msg:`Onderbezetting avond: ${DAYS_NL[di]} ${date.getDate()}/${date.getMonth()+1} (${c.evening}/${c.demEvening})`,ds:c.ds,type:"under"});
    if(c.morning>c.demMorning+3) alerts.push({msg:`Overbezetting dag: ${DAYS_NL[di]} ${date.getDate()}/${date.getMonth()+1}`,ds:c.ds,type:"over"});
  });
  conflicts.forEach(c=>{
    const s=staff.find(x=>x.id===c.staffId);
    const date=new Date(c.dateStr);
    alerts.push({msg:`Rusttijd conflict: ${s?.name} op ${date.getDate()}/${date.getMonth()+1}`,ds:c.dateStr,type:"fatigue"});
  });
  const [alertsOpen,setAlertsOpen]=useState(false);

  const regularStaff=staff.filter(s=>!s.isFlexijob);
  const flexiStaff=staff.filter(s=>s.isFlexijob);

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
        const shift=SHIFTS[shiftId?.toUpperCase()]||SHIFTS.OFF;
        const isLocked=!!locks[lockKey(s.id,ds)];
        const isPastLock=lockDate&&new Date(ds)<=new Date(lockDate);
        const locked=isLocked||isPastLock;
        const isoWeek=getISOWeek(d);
        const unavail=!s.isFlexijob&&!isAvailOnDate(s,ds,isoWeek)&&!["off","vacation","sick"].includes(shiftId);
        return(
          <td key={i} style={{padding:3}}>
            <div className={`shift-cell${locked?" locked":""}`}
              style={{background:shift.bg,borderLeft:`3px solid ${unavail?"#f59e0b":shift.color}`,opacity:locked?0.85:1}}
              onClick={e=>handleShiftClick(e,s.id,ds,locked)}>
              <div className="shift-label" style={{color:unavail?"#f59e0b":shift.color}}>{shift.label}</div>
              {shift.time&&<div className="shift-time">{shift.time}</div>}
              {unavail&&<div className="shift-conflict">⚠️</div>}
            </div>
          </td>
        );
      })}
    </tr>
  );

  return(
    <div>
      {unavailWarn&&<div className="warn-banner">⚠️ {unavailWarn}</div>}
      {alerts.length>0&&(
        <div style={{marginBottom:8}}>
          <div className="alert-banner" style={{marginBottom:0,borderRadius:alertsOpen?"8px 8px 0 0":"8px"}} onClick={()=>setAlertsOpen(o=>!o)}>
            🔴 <strong>Waarschuwingen ({alerts.length})</strong>
            <span style={{marginLeft:"auto",fontSize:12}}>{alertsOpen?"▲":"▼"}</span>
          </div>
          {alertsOpen&&(
            <div style={{background:"#7f1d1d18",border:"1px solid #7f1d1d",borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
              {alerts.map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",fontSize:12,color:"#fca5a5",borderTop:i>0?"1px solid #7f1d1d30":"none",cursor:"pointer",transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#7f1d1d30"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  onClick={()=>onNavigateAlert&&onNavigateAlert(a.ds,a)}>
                  {a.type==="fatigue"?"😴":a.type==="over"?"📈":"🔴"} {a.msg}
                  <span style={{marginLeft:"auto",fontSize:10,opacity:.6}}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="legend">
        {Object.values(SHIFTS).map(s=>(<div key={s.id} className="legend-item"><div className="legend-dot" style={{background:s.color}}/>{s.label}</div>))}
        <div className="legend-item"><div className="legend-dot" style={{background:"#3b82f6"}}/> 🔒 Gelockt</div>
        {lockDate&&<span className="lock-date-badge">🔒 Globaal gelockt tot {lockDate}</span>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table className="week-grid">
          <thead>
            <tr>
              <th style={{minWidth:148,textAlign:"left"}}>Personeel</th>
              {dates.map((d,i)=>{
                const ds=toDS(d);
                const isHol=isHoliday(ds,holidays); const isVac=isSchoolVacation(ds,vacations);
                const isPastLock=lockDate&&new Date(ds)<=new Date(lockDate);
                return(
                  <th key={i} className={isWeekend(d)?"weekend":""} style={{opacity:isPastLock?0.5:1}}>
                    {DAYS_NL[i]}<br/>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:400,fontSize:10}}>{d.getDate()}/{d.getMonth()+1}</span>
                    {isHol&&" 🎉"}{isVac&&" 🏖"}{isPastLock&&" 🔒"}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {regularStaff.map(renderRow)}
            {flexiStaff.length>0&&(
              <tr><td colSpan={8} style={{background:"#0f172a",padding:"4px 8px",fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.1em"}}>Flexijobbers</td></tr>
            )}
            {flexiStaff.map(renderRow)}
            <tr className="coverage-row">
              <td style={{fontSize:10,color:"var(--text-dim)",padding:"4px 8px",fontStyle:"italic"}}>Dag bezetting</td>
              {coverage.map((c,i)=>(<td key={i}><span className={c.morning>=c.demMorning?"coverage-ok":c.morning>=c.demMorning-1?"coverage-warn":"coverage-bad"}>{c.morning}/{c.demMorning}</span></td>))}
            </tr>
            <tr className="coverage-row">
              <td style={{fontSize:10,color:"var(--text-dim)",padding:"4px 8px",fontStyle:"italic"}}>Avond bezetting</td>
              {coverage.map((c,i)=>(<td key={i}><span className={c.evening>=c.demEvening?"coverage-ok":c.evening>=c.demEvening-1?"coverage-warn":"coverage-bad"}>{c.evening}/{c.demEvening}</span></td>))}
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
    let startDow=(firstDay.getDay()+6)%7;
    for(let i=0;i<startDow;i++) days.push(null);
    const dim=new Date(year,m+1,0).getDate();
    for(let d=1;d<=dim;d++){
      const date=new Date(year,m,d); const ds=toDS(date);
      let cnt=0; staff.forEach(s=>{ const sh=(schedule[s.id]||{})[ds]; if(sh&&sh!=="off"&&sh!=="vacation"&&sh!=="sick") cnt++; });
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
              const isSelected=selectedDs===day.ds;
              return(<div key={day.d} className="day-dot" onClick={()=>{setSelectedDs(day.ds);onDayClick&&onDayClick(day.ds);}}
                style={{background:isSelected?"var(--gold)":bg,border:isSelected?"2px solid #fff":border,color:isSelected?"#000":"var(--text-dim)",fontSize:8,cursor:"pointer",transform:isSelected?"scale(1.2)":"",transition:"all .15s",zIndex:isSelected?1:0,position:"relative"}}
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
    let totalHours=0,weekendShifts=0,nightShifts=0,holidayShifts=0,vacUsed=0;
    const entries=schedule[s.id]||{};
    Object.entries(entries).forEach(([ds,shiftId])=>{
      if(!ds.startsWith(String(year))) return;
      const shift=SHIFTS[shiftId?.toUpperCase()]; if(!shift) return;
      if(shiftId==="vacation"){ vacUsed++; return; }
      if(shift.hours===0) return;
      totalHours+=shift.hours;
      const date=new Date(ds);
      if(isWeekend(date)) weekendShifts++;
      if(shiftId==="evening"||shiftId==="night") nightShifts++;
      if(isHoliday(ds,holidays)) holidayShifts++;
    });
    const targetHours=s.fte*38*52;
    const vacRemaining=s.vacationDays-vacUsed;
    const fatigueScore=Math.min(100,(nightShifts/120)*100);
    return{...s,totalHours,weekendShifts,nightShifts,holidayShifts,targetHours,fatigueScore,vacUsed,vacRemaining};
  });
  return(
    <div className="stats-grid">
      {computed.map(s=>{
        const fc=s.fatigueScore>66?"#ef4444":s.fatigueScore>33?"#f59e0b":"#22c55e";
        const hr=s.totalHours/Math.max(s.targetHours,1);
        const hc=Math.abs(hr-1)<0.05?"#22c55e":Math.abs(hr-1)<0.15?"#f59e0b":"#ef4444";
        const vr=s.vacUsed/Math.max(s.vacationDays,1);
        const vc=vr>1?"over":vr>0.8?"warn":"";
        return(
          <div key={s.id} className="stat-card">
            <div className="stat-card-header">
              <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
              <div><div className="stat-name">{s.name}</div><div className="stat-fte">{CONTRACT_TYPES.find(c=>c.value===s.fte)?.label||`${Math.round(s.fte*100)}%`}</div></div>
            </div>
            <div className="stat-row"><span>Uren gewerkt</span><span className="stat-val" style={{color:hc}}>{Math.round(s.totalHours)}u / {Math.round(s.targetHours)}u</span></div>
            <div className="stat-row"><span>Weekend shifts</span><span className="stat-val">{s.weekendShifts}</span></div>
            <div className="stat-row"><span>Nachtdiensten</span><span className="stat-val">{s.nightShifts}</span></div>
            <div className="stat-row"><span>Feestdagen</span><span className="stat-val">{s.holidayShifts}</span></div>
            <div className="stat-row"><span>Vakantie</span><span className="stat-val" style={{color:vr>1?"#ef4444":vr>0.8?"#f59e0b":"#22c55e"}}>{s.vacUsed}/{s.vacationDays}</span></div>
            <div className="vac-bar"><div className={`vac-fill ${vc}`} style={{width:`${Math.min(100,vr*100)}%`}}/></div>
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
  const [form,setForm]=useState({name:"",fte:1.0,color:"#3b82f6",vacationDays:24,availableDays:[0,1,2,3,4,5,6],partTimeMode:"spread",isFlexijob:false,autoSchedule:true});

  const openAdd=()=>{ setEditing(null); setForm({name:"",fte:1.0,color:"#3b82f6",vacationDays:24,availableDays:[0,1,2,3,4,5,6],partTimeMode:"spread",isFlexijob:false,autoSchedule:true}); setShowModal(true); };
  const openEdit=(s)=>{ setEditing(s.id); setForm({name:s.name,fte:s.fte,color:s.color,vacationDays:s.vacationDays,availableDays:[...s.availableDays],partTimeMode:s.partTimeMode||"spread",isFlexijob:s.isFlexijob||false,autoSchedule:s.autoSchedule!==false}); setShowModal(true); };
  const handleFteChange=(v)=>{ const f=parseFloat(v); setForm(x=>({...x,fte:f,vacationDays:FTE_VACATION[f]??Math.round(24*f)})); };
  const toggleDay=(day)=>{ setForm(f=>({...f,availableDays:f.availableDays.includes(day)?f.availableDays.filter(d=>d!==day):[...f.availableDays,day]})); };
  const save=()=>{ if(!form.name.trim()) return; if(editing){ setStaff(p=>p.map(s=>s.id===editing?{...s,...form,fte:parseFloat(form.fte)}:s)); } else { setStaff(p=>[...p,{id:Date.now(),...form,fte:parseFloat(form.fte)}]); } setShowModal(false); };
  const remove=(id)=>setStaff(p=>p.filter(s=>s.id!==id));

  const regular=staff.filter(s=>!s.isFlexijob);
  const flexi=staff.filter(s=>s.isFlexijob);

  const renderSection=(list,title)=>(
    <>
      <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--text-dim)",margin:"16px 0 8px"}}>{title}</div>
      <table className="staff-table">
        <thead><tr><th>Naam</th><th>Contract</th><th>Vakantie</th><th>Beschikbaar</th><th>Auto</th><th>Acties</th></tr></thead>
        <tbody>
          {list.map(s=>{
            const vacUsed=countVacDays(s.id,schedule,year);
            const vacRem=s.vacationDays-vacUsed;
            const cl=CONTRACT_TYPES.find(c=>c.value===s.fte)?.label||`${Math.round(s.fte*100)}%`;
            return(
              <tr key={s.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:3,background:s.color}}/>{s.name}</div></td>
                <td><span className="tag" style={{background:s.isFlexijob?"#1f2937":"#1e3a5f",color:s.isFlexijob?"#9ca3af":"#60a5fa"}}>{s.isFlexijob?"Flexijob":cl}</span></td>
                <td>{s.isFlexijob?<span style={{color:"var(--text-dim)",fontSize:12}}>—</span>:<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:vacRem<0?"#ef4444":vacRem===0?"#f59e0b":"#22c55e"}}>{vacUsed}/{s.vacationDays}</span>}</td>
                <td><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--text-dim)"}}>{s.availableDays.map(d=>DAYS_NL[d]).join(",")}</span></td>
                <td><span style={{fontSize:12}}>{s.autoSchedule!==false?"🟢 Auto":"✋ Manueel"}</span></td>
                <td><div style={{display:"flex",gap:6}}><button className="btn" onClick={()=>openEdit(s)}>✏️</button><button className="btn btn-danger" onClick={()=>remove(s.id)}>🗑</button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:13,color:"var(--text-dim)"}}>{regular.length} vaste mw • {regular.reduce((a,s)=>a+s.fte,0).toFixed(1)} FTE • {flexi.length} flexijobbers</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Toevoegen</button>
      </div>
      {renderSection(regular,"Vaste medewerkers")}
      {flexi.length>0&&renderSection(flexi,"Flexijobbers")}

      {showModal&&(
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{editing?"Bewerken":"Toevoegen"}</div>
            <div className="form-row">
              <label className="form-label">Type</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn ${!form.isFlexijob?"btn-primary":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,isFlexijob:false}))}>Vast</button>
                <button className={`btn ${form.isFlexijob?"btn-flex":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,isFlexijob:true,fte:0,vacationDays:0}))}>Flexijob</button>
              </div>
            </div>
            <div className="form-row"><label className="form-label">Naam</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Volledige naam"/></div>
            {!form.isFlexijob&&(
              <>
                <div className="form-row"><label className="form-label">Contract</label>
                  <select className="form-input" value={form.fte} onChange={e=>handleFteChange(e.target.value)}>
                    {CONTRACT_TYPES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Vakantiedagen</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button className="btn" style={{padding:"6px 12px",fontSize:16}} onClick={()=>setForm(f=>({...f,vacationDays:Math.max(0,f.vacationDays-1)}))}>−</button>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,minWidth:32,textAlign:"center",color:"var(--gold)"}}>{form.vacationDays}</span>
                    <button className="btn" style={{padding:"6px 12px",fontSize:16}} onClick={()=>setForm(f=>({...f,vacationDays:f.vacationDays+1}))}>+</button>
                  </div>
                </div>
                {form.fte===0.5&&(
                  <div className="form-row"><label className="form-label">Halftijdse regeling</label>
                    <select className="form-input" value={form.partTimeMode} onChange={e=>setForm(f=>({...f,partTimeMode:e.target.value}))}>
                      <option value="spread">Verspreid</option><option value="even">Even weken</option><option value="odd">Oneven weken</option>
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="form-row">
              <label className="form-label">Beschikbare dagen</label>
              <div className="day-checks">
                {DAYS_FULL.map((day,i)=>(
                  <label key={i} className={`day-check ${form.availableDays.includes(i)?"active":""}`}>
                    <input type="checkbox" checked={form.availableDays.includes(i)} onChange={()=>toggleDay(i)}/>{DAYS_NL[i]}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Automatisch inplannen</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn ${form.autoSchedule?"btn-primary":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,autoSchedule:true}))}>🟢 Automatisch</button>
                <button className={`btn ${!form.autoSchedule?"btn-flex":""}`} style={{flex:1}} onClick={()=>setForm(f=>({...f,autoSchedule:false}))}>✋ Enkel manueel</button>
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

// ─── GAS INFO MODAL ───────────────────────────────────────────────────────────
function GasInfoModal({onClose}){
  const gasCode=`// == Google Apps Script == 
// Ga naar script.google.com → Nieuw project

const SHEET_ID = "JOUW_SPREADSHEET_ID";

function doGet(e) {
  const tab = e.parameter.tab || "data";
  const sheet = SpreadsheetApp.openById(SHEET_ID)
                  .getSheetByName(tab);
  const val = sheet ? sheet.getRange(1,1).getValue() : "{}";
  return ContentService
    .createTextOutput(val || "{}")
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(body.tab);
  if (!sheet) sheet = ss.insertSheet(body.tab);
  sheet.getRange(1,1).setValue(
    JSON.stringify(body.data));
  return ContentService
    .createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}`;

  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{width:600}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title">📊 Google Sheets koppeling — Stap voor stap</div>
        <div className="gas-steps">
          <div className="gas-step"><div><strong>Google Sheet aanmaken</strong><br/><span style={{fontSize:12,color:"var(--text-dim)"}}>Ga naar sheets.google.com → Nieuw leeg spreadsheet. Kopieer de ID uit de URL (het lange getal tussen /d/ en /edit).</span></div></div>
          <div className="gas-step"><div><strong>Apps Script openen</strong><br/><span style={{fontSize:12,color:"var(--text-dim)"}}>In je Sheet: Extensies → Apps Script. Verwijder de standaard code en plak onderstaande code.</span></div></div>
          <div className="gas-step"><div><strong>SHEET_ID invullen</strong><br/><span style={{fontSize:12,color:"var(--text-dim)"}}>Vervang "JOUW_SPREADSHEET_ID" met de ID van je sheet. Sla op met Ctrl+S.</span></div></div>
          <div className="gas-step"><div><strong>Web App deployen</strong><br/><span style={{fontSize:12,color:"var(--text-dim)"}}>Klik Implementeren → Nieuwe implementatie → Type: Web-app. Stel in: Uitvoeren als: Ik. Toegang: Iedereen. Kopieer de Web App URL.</span></div></div>
          <div className="gas-step"><div><strong>URL invullen in de planner</strong><br/><span style={{fontSize:12,color:"var(--text-dim)"}}>Plak de Web App URL in het veld "Google Sheets URL" in Opslag & Backup. Klik Verbinden en test met Opslaan naar Sheets.</span></div></div>
        </div>
        <div className="gas-code">{gasCode}</div>
        <div style={{marginTop:14,padding:12,background:"var(--surface3)",borderRadius:8,fontSize:12,color:"var(--text-dim)"}}>
          <strong style={{color:"var(--gold)"}}>Meerdere gebruikers?</strong> Iedereen die dezelfde Web App URL heeft kan de data lezen en schrijven. De data staat in het Google Sheet — open het sheet om wijzigingen te zien in real-time. Je kan de toegang beheren via de Google Sheet instellingen.
        </div>
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Begrepen ✓</button></div>
      </div>
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView({settings,setSettings,holidays,setHolidays,vacations,setVacations,lockDate,setLockDate,motivatieEnabled,setMotivatieEnabled,motivatieFreq,setMotivatieFreq,showToast}){
  const [newHoliday,setNewHoliday]=useState("");
  const [newVacName,setNewVacName]=useState("");
  const [newVacStart,setNewVacStart]=useState("");
  const [newVacEnd,setNewVacEnd]=useState("");
  const [showGasInfo,setShowGasInfo]=useState(false);
  const upd=(k,v)=>setSettings(s=>({...s,[k]:parseFloat(v)||v}));
  const freqLabels=["Nooit","Zelden","Normaal","Vaak"];

return(
    <div>
      {showGasInfo&&<GasInfoModal onClose={()=>setShowGasInfo(false)}/>}

      {/* Reset knop */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="btn btn-danger" onClick={()=>{
          setSettings(DEFAULT_SETTINGS);
          showToast("🔄 Instellingen gereset naar standaard");
        }}>
          🔄 Reset naar standaardinstellingen
        </button>
      </div>

      <div className="settings-grid">
        <div className="settings-section">
          <div className="settings-title">⚙️ Bezettingsnormen</div>
          {[["minMorning","Min. dag (normaal)"],["minEvening","Min. avond (normaal)"],["weekendMinMorning","Min. dag (weekend/vr)"],["weekendMinEvening","Min. avond (weekend/vr)"],["vacMinMorning","Min. dag (vakantie/feest)"],["vacMinEvening","Min. avond (vakantie/feest)"]].map(([k,l])=>(
            <div key={k} className="form-row"><label className="form-label">{l}</label><input className="form-input" type="number" value={settings[k]} onChange={e=>upd(k,e.target.value)}/></div>
          ))}
        </div>
        <div className="settings-section">
          <div className="settings-title">😴 Vermoeidheid & Beperkingen</div>
          {[["maxConsecNights","Max. opeenvolgende nachten"],["minRestAfterNights","Min. rustdagen na nachten"],["maxConsecDays","Max. opeenvolgende werkdagen"],["minRestHours","Min. rust tussen shifts (uur)"]].map(([k,l])=>(
            <div key={k} className="form-row"><label className="form-label">{l}</label><input className="form-input" type="number" value={settings[k]} onChange={e=>upd(k,e.target.value)}/></div>
          ))}
        </div>
        <div className="settings-section">
          <div className="settings-title">🔒 Globale Lock Datum</div>
          <div className="form-row">
            <label className="form-label">Alles locken tot en met deze datum</label>
            <input className="form-input" type="date" value={lockDate||""} onChange={e=>setLockDate(e.target.value||null)}/>
          </div>
          {lockDate&&<div style={{marginTop:8,padding:10,background:"#78350f20",border:"1px solid #78350f",borderRadius:7,fontSize:12,color:"var(--yellow)"}}>
            🔒 Alle shifts vóór en op {lockDate} zijn gelockt als historische data. Ze worden niet overschreven bij het genereren van een nieuw rooster.
          </div>}
          <button className="btn btn-danger" style={{marginTop:10}} onClick={()=>setLockDate(null)}>Lock datum verwijderen</button>
        </div>
        <div className="settings-section">
          <div className="settings-title">🎉 Feestdagen</div>
          <div style={{maxHeight:180,overflowY:"auto",marginBottom:10}}>
            {holidays.map(h=>(
              <div key={h} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace"}}>{h}</span>
                <button className="btn btn-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>setHolidays(p=>p.filter(x=>x!==h))}>✕</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input className="form-input" type="date" value={newHoliday} onChange={e=>setNewHoliday(e.target.value)} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={()=>{if(newHoliday){setHolidays(p=>[...new Set([...p,newHoliday])].sort());setNewHoliday("");}}}> + </button>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-title">🏖 Schoolvakanties</div>
          <div style={{maxHeight:160,overflowY:"auto",marginBottom:10}}>
            {vacations.map(v=>(
              <div key={v.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--border)",fontSize:12}}>
                <span><strong>{v.name}</strong><br/><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"var(--text-dim)"}}>{v.start} → {v.end}</span></span>
                <button className="btn btn-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>setVacations(p=>p.filter(x=>x.name!==v.name))}>✕</button>
              </div>
            ))}
          </div>
          <div className="form-row"><label className="form-label">Naam</label><input className="form-input" value={newVacName} onChange={e=>setNewVacName(e.target.value)}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            <div><label className="form-label">Van</label><input className="form-input" type="date" value={newVacStart} onChange={e=>setNewVacStart(e.target.value)}/></div>
            <div><label className="form-label">Tot</label><input className="form-input" type="date" value={newVacEnd} onChange={e=>setNewVacEnd(e.target.value)}/></div>
          </div>
          <button className="btn btn-primary" onClick={()=>{if(newVacName&&newVacStart&&newVacEnd){setVacations(p=>[...p,{name:newVacName,start:newVacStart,end:newVacEnd}]);setNewVacName("");setNewVacStart("");setNewVacEnd("");}}}> + Vakantie toevoegen</button>
        </div>
        <div className="settings-section">
          <div className="settings-title">💬 Motivatie berichten (Rami)</div>
          <div className="form-row">
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={!motivatieEnabled} onChange={e=>setMotivatieEnabled(!e.target.checked)} style={{accentColor:"var(--gold)",width:16,height:16}}/>
              <span className="form-label" style={{margin:0}}>Motivatie berichten uitschakelen</span>
            </label>
          </div>
          {motivatieEnabled&&(
            <div className="form-row">
              <label className="form-label">Frequentie</label>
              <div className="slider-row">
                <input type="range" min={0} max={3} value={motivatieFreq} onChange={e=>setMotivatieFreq(parseInt(e.target.value))}/>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"var(--gold)",minWidth:50}}>{freqLabels[motivatieFreq]}</span>
              </div>
              <div className="freq-labels"><span>Nooit</span><span>Zelden</span><span>Normaal</span><span>Vaak</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STORAGE VIEW ─────────────────────────────────────────────────────────────
function StorageView({onExport,onImport,gasUrl,setGasUrl,onSaveToSheets,onLoadFromSheets}){
  const [showGasInfo,setShowGasInfo]=useState(false);
  const [gasStatus,setGasStatus]=useState(null);

  const testConnection=async()=>{
    if(!gasUrl){ setGasStatus("❌ Geen URL ingevuld."); return; }
    try{
      const r=await fetch(gasUrl+"?action=ping");
      setGasStatus(r.ok?"✅ Verbonden!":"⚠️ Kon geen verbinding maken.");
    }catch{ setGasStatus("❌ Fout. Controleer de URL en CORS instellingen."); }
  };

  return(
    <div>
      {showGasInfo&&<GasInfoModal onClose={()=>setShowGasInfo(false)}/>}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <button className="btn btn-primary" onClick={onExport}>⬇ Export JSON backup</button>
        <label className="btn" style={{cursor:"pointer"}}>⬆ Import JSON<input type="file" accept=".json" style={{display:"none"}} onChange={onImport}/></label>
      </div>
      <div className="storage-options">
        <div className="storage-card">
          <h3>✅ Optie 1 — Local Storage</h3>
          <p>Data opgeslagen in de browser. Werkt offline.</p>
          <div className="pro">✔ Geen setup</div><div className="pro">✔ Instant</div>
          <div className="con">✗ Alleen op dit apparaat</div>
          <div style={{marginTop:8,padding:10,background:"var(--surface2)",borderRadius:6,fontSize:11,color:"var(--green)"}}>✅ Momenteel actief — auto-save aan</div>
        </div>
        <div className="storage-card">
          <h3>📊 Optie 2 — Google Sheets</h3>
          <p>Data opgeslagen in Google Sheets via Apps Script. Multi-device.</p>
          <div className="pro">✔ Overal toegankelijk</div><div className="pro">✔ Gratis</div>
          <div className="con">✗ Setup vereist</div>
          <button className="btn" style={{marginTop:8,width:"100%",justifyContent:"center"}} onClick={()=>setShowGasInfo(true)}>ℹ️ Stap voor stap uitleg</button>
        </div>
      </div>
      <div className="settings-section" style={{marginTop:0}}>
        <div className="settings-title">🔗 Google Sheets Verbinding</div>
        <div className="form-row"><label className="form-label">Web App URL (van Google Apps Script)</label>
          <div style={{display:"flex",gap:8}}>
            <input className="form-input" value={gasUrl||""} onChange={e=>setGasUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" style={{flex:1}}/>
            <button className="btn" onClick={testConnection}>Test</button>
          </div>
          {gasStatus&&<div style={{marginTop:6,fontSize:12,color:gasStatus.startsWith("✅")?"var(--green)":"var(--red)"}}>{gasStatus}</div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-primary" onClick={onSaveToSheets} style={{flex:1,justifyContent:"center"}}>⬆ Opslaan naar Sheets</button>
          <button className="btn" onClick={onLoadFromSheets} style={{flex:1,justifyContent:"center"}}>⬇ Laden van Sheets</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS={
  minMorning:4,
  minEvening:8,
  minNight:10,
  weekendMinMorning:4,
  weekendMinEvening:8,
  weekendMinNight:10,
  vacMinMorning:4,
  vacMinEvening:8,
  vacMinNight:10,
  maxConsecNights:4,
  minRestAfterNights:2,
  maxConsecDays:5,
  minRestHours:11,
};

// Build year range 2026–2036+
const YEAR_RANGE=Array.from({length:12},(_,i)=>2026+i);

export default function App(){
  const [view,setView]=useState("week");
  const [weekNum,setWeekNum]=useState(()=>{
    const now=new Date(); return getISOWeek(now);
  });
  const [year,setYear]=useState(()=>load(SK.year,2026));
  const [staff,setStaff]=useState(()=>load(SK.staff,INITIAL_STAFF));
  const [schedule,setSchedule]=useState(()=>load(SK.schedule,{}));
  const [settings,setSettings]=useState(()=>load(SK.settings,DEFAULT_SETTINGS));
  const [holidays,setHolidays]=useState(()=>load(SK.holidays,HOLIDAYS_BY_YEAR[2026]||[]));
  const [vacations,setVacations]=useState(()=>load(SK.vacations,VACATIONS_BY_YEAR[2026]||[]));
  const [locks,setLocks]=useState(()=>load(SK.locks,{}));
  const [lockDate,setLockDate]=useState(()=>load("co3_lockdate",null));
  const [gasUrl,setGasUrl]=useState(()=>load(SK.gasUrl,"https://script.google.com/macros/s/AKfycbwLIOsHAfEuZrwryU6EqCmXZMT89mZ0Xw36bL7srECscXEj6NAhC2yxfFujiTR0ZyDb-g/exec"));
  const [generating,setGenerating]=useState(false);
  const [toast,setToast]=useState(null);
  const [motivatieEnabled,setMotivatieEnabled]=useState(()=>load("co3_motiv_on",true));
  const [motivatieFreq,setMotivatieFreq]=useState(()=>load("co3_motiv_freq",1));
  const actionCount = useRef(0);
  const isLoaded = useRef(false);
  const [isAppReady, setIsAppReady] = useState(false); // ← toevoegen

// Auto-save lokaal
useEffect(()=>{ save(SK.staff,staff); },[staff]);
useEffect(()=>{ save(SK.schedule,schedule); },[schedule]);
useEffect(()=>{ save(SK.settings,settings); },[settings]);
useEffect(()=>{ save(SK.holidays,holidays); },[holidays]);
useEffect(()=>{ save(SK.vacations,vacations); },[vacations]);
useEffect(()=>{ save(SK.locks,locks); },[locks]);
useEffect(()=>{ save("co3_lockdate",lockDate); },[lockDate]);
useEffect(()=>{ save(SK.gasUrl,gasUrl); },[gasUrl]);
useEffect(()=>{ save("co3_motiv_on",motivatieEnabled); },[motivatieEnabled]);
useEffect(()=>{ save("co3_motiv_freq",motivatieFreq); },[motivatieFreq]);
useEffect(()=>{ save(SK.year,year); },[year]);

const showToast=(msg,type="normal")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),4000); };
  // Motivatie trigger
  const triggerMotivatieCheck=useCallback(()=>{
    if(!motivatieEnabled||motivatieFreq===0) return;
    actionCount.current++;
    const thresholds=[0,15,8,4];
    const threshold=thresholds[motivatieFreq]||10;
    if(actionCount.current>=threshold){
      actionCount.current=0;
      const msg=MOTIVATIE[Math.floor(Math.random()*MOTIVATIE.length)];
      showToast(msg,"motivatie");
    }
  },[motivatieEnabled,motivatieFreq]);

  const handleYearChange=(y)=>{
    const yi=parseInt(y);
    setYear(yi);
    if(HOLIDAYS_BY_YEAR[yi]) setHolidays(HOLIDAYS_BY_YEAR[yi]);
    if(VACATIONS_BY_YEAR[yi]) setVacations(VACATIONS_BY_YEAR[yi]);
    setWeekNum(1);
    showToast(`📅 Jaar ${yi} geladen.`);
    triggerMotivatieCheck();
  };

  const handleSetSchedule=useCallback((fn)=>{
    setSchedule(fn);
    triggerMotivatieCheck();
  },[triggerMotivatieCheck]);

  const handleNavigateAlert=useCallback((ds)=>{
    const date=new Date(ds);
    setYear(date.getFullYear());
    const wk=getISOWeek(date);
    setWeekNum(wk);
    setView("week");
    showToast(`📍 Genavigeerd naar week ${wk}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`);
  },[]);

  const generateRoster=useCallback(()=>{
    setGenerating(true);
    setTimeout(()=>{
      const {schedule:newSched}=generateSchedule(staff,year,settings,holidays,vacations,schedule,locks,lockDate);
      setSchedule(newSched);
      setGenerating(false);
      showToast("✅ Rooster gegenereerd!");
      triggerMotivatieCheck();
    },600);
  },[staff,year,settings,holidays,vacations,schedule,locks,lockDate,triggerMotivatieCheck]);

  const exportCSV=()=>{
    const dates=[];
    for(let m=0;m<12;m++){ const dim=new Date(year,m+1,0).getDate(); for(let d=1;d<=dim;d++) dates.push(toDS(new Date(year,m,d))); }
    const header=["Naam","Type","FTE",...dates].join(";");
    const rows=staff.map(s=>{
      const vals=dates.map(ds=>{ const sid=(schedule[s.id]||{})[ds]||"off"; return SHIFTS[sid?.toUpperCase()]?.label||"Vrij"; });
      return[s.name,s.isFlexijob?"Flexijob":"Vast",s.fte,...vals].join(";");
    });
    const blob=new Blob(["\uFEFF"+[header,...rows].join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`rooster_${year}.csv`; a.click();
    showToast("📊 CSV geëxporteerd!");
  };

  const exportJSON=()=>{
    const data={staff,schedule,settings,holidays,vacations,locks,lockDate,year,exportDate:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`casino_backup_${year}.json`; a.click();
    showToast("💾 Backup geëxporteerd!");
  };

const importJSON=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.staff) setStaff(data.staff); if(data.schedule) setSchedule(data.schedule);
        if(data.settings) setSettings(data.settings); if(data.holidays) setHolidays(data.holidays);
        if(data.vacations) setVacations(data.vacations); if(data.locks) setLocks(data.locks);
        if(data.lockDate) setLockDate(data.lockDate); if(data.year) setYear(data.year);
        showToast("✅ Backup hersteld!");
      }catch{ showToast("❌ Ongeldig JSON bestand"); }
    };
    reader.readAsText(file); e.target.value="";
  };

  const saveToSheets = useCallback(async () => {
    const url = load(SK.gasUrl, "");
    if (!url) return;
    try {
      const tabs = {staff, schedule, settings, holidays, vacations, locks};
      for (const [tab, data] of Object.entries(tabs)) {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({tab, data})
        });
      }
    } catch {}
  }, [staff, schedule, settings, holidays, vacations, locks]);

  const loadFromSheets = useCallback(async () => {
    const url = load(SK.gasUrl, "");
    if (!url) {
      setIsAppReady(true); // geen Sheets URL → gewoon doorgaan
      return;
    }
    try {
      const tabs = ["staff", "schedule", "settings", "holidays", "vacations", "locks"];
      const results: Record<string, any> = {};
      for (const tab of tabs) {
        try {
          const r = await fetch(`${url}?tab=${tab}&t=${Date.now()}`);
          const text = await r.text();
          if (text && text !== "{}") results[tab] = JSON.parse(text);
        } catch {}
      }
      if (results.staff && Array.isArray(results.staff))           setStaff(results.staff);
      if (results.schedule && typeof results.schedule === "object") setSchedule(results.schedule);
      if (results.settings && typeof results.settings === "object") setSettings(results.settings);
      if (results.holidays && Array.isArray(results.holidays))     setHolidays(results.holidays);
      if (results.vacations && Array.isArray(results.vacations))   setVacations(results.vacations);
      if (results.locks && typeof results.locks === "object")       setLocks(results.locks);
      isLoaded.current = true;
      showToast("✅ Data geladen van Sheets!");
    } catch {
      showToast("❌ Fout bij laden van Sheets.");
    } finally {
      setIsAppReady(true); // altijd klaar zetten, ook bij fout
    }
  }, []);

  useEffect(() => { loadFromSheets(); }, []);

  useEffect(() => {
    if (!isLoaded.current) return;
    const t = setTimeout(() => { saveToSheets(); }, 2000);
    return () => clearTimeout(t);
  }, [staff, schedule, settings, holidays, vacations, locks]);

  const weeksInYear=getWeeksInYear(year);
  const weekDates=getWeekDates(year,weekNum);
  const ws=weekDates[0],we=weekDates[6];
  const weekLabel=`Week ${weekNum} — ${ws.getDate()} ${MONTHS_NL[ws.getMonth()]} – ${we.getDate()} ${MONTHS_NL[we.getMonth()]} ${year}`;

  const navItems=[
    {id:"week",  icon:"📅",label:"Weekplanning"},
    {id:"year",  icon:"📆",label:"Jaaroverzicht"},
    {id:"stats", icon:"📊",label:"Personeelsstats"},
    {id:"staff", icon:"👥",label:"Personeel"},
    {id:"settings",icon:"⚙️",label:"Instellingen"},
    {id:"storage",icon:"💾",label:"Opslag & Backup"},
  ];

  const topbarTitle={week:weekLabel,year:`Jaaroverzicht ${year}`,stats:"Personeelsstatistieken",staff:"Personeelsbeheer",settings:"Instellingen",storage:"Opslag & Backup"}[view];

  return(
    <>
      <style>{style}</style>

      {!isAppReady && (
        <div style={{
          position:"fixed", inset:0, background:"var(--bg)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          zIndex:999, gap:16
        }}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"var(--gold)"}}>Casino Oostende</div>
          <div style={{fontSize:13,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:".15em"}}>Planner laden...</div>
          <div style={{width:48,height:48,border:"3px solid var(--border)",borderTop:"3px solid var(--gold)",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        </div>
      )}

      <div className="app" style={{opacity:isAppReady?1:0,pointerEvents:isAppReady?"auto":"none"}}>
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-main">Casino Oostende</div>
            <div className="logo-sub">Live Games Planner</div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">
              <div className="nav-label">Planning</div>
              {navItems.map(item=>(
                <button key={item.id} className={`nav-item ${view===item.id?"active":""}`} onClick={()=>setView(item.id)}>
                  <span className="nav-icon">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
            <div className="nav-section">
              <div className="nav-label">Acties</div>
              <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={generateRoster} disabled={generating||!isAppReady}>
                {generating?"⏳ Bezig...":"🎲 Genereer Rooster"}
              </button>
              <div style={{marginTop:8,padding:"8px 10px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8}}>
                <div style={{fontSize:10,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:4}}>🔒 Lock tot datum</div>
                <input type="date" value={lockDate||""} onChange={e=>setLockDate(e.target.value||null)}
                  disabled={!isAppReady}
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

        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{topbarTitle}</div>
            <div className="topbar-actions">
              <select className="year-select" value={year} onChange={e=>handleYearChange(e.target.value)} disabled={!isAppReady}>
                {YEAR_RANGE.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              {view==="week"&&(
                <>
                  <button className="btn" onClick={()=>setWeekNum(w=>Math.max(1,w-1))} disabled={!isAppReady}>← Vorige</button>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--text-dim)",minWidth:48,textAlign:"center"}}>W{weekNum}/{weeksInYear}</span>
                  <button className="btn" onClick={()=>setWeekNum(w=>Math.min(weeksInYear,w+1))} disabled={!isAppReady}>Volgende →</button>
                </>
              )}
              <button className="btn" onClick={exportCSV} disabled={!isAppReady}>⬇ CSV</button>
              <button className="btn" onClick={exportJSON} disabled={!isAppReady}>💾 Backup</button>
            </div>
          </div>

          <div className="content">
            {view==="week"&&<WeekView staff={staff} schedule={schedule} setSchedule={handleSetSchedule} weekNum={weekNum} year={year} settings={settings} holidays={holidays} vacations={vacations} locks={locks} setLocks={setLocks} lockDate={lockDate} onNavigateAlert={handleNavigateAlert}/>}
            {view==="year"&&<YearView schedule={schedule} staff={staff} year={year} holidays={holidays} vacations={vacations} settings={settings} onDayClick={ds=>{setWeekNum(getISOWeek(new Date(ds)));setView("week");showToast(`📅 Genavigeerd naar ${ds}`);}}/>}
            {view==="stats"&&<StaffStats staff={staff} schedule={schedule} year={year} holidays={holidays}/>}
            {view==="staff"&&<StaffManager staff={staff} setStaff={setStaff} schedule={schedule} year={year}/>}
            {view==="settings"&&<SettingsView settings={settings} setSettings={setSettings} holidays={holidays} setHolidays={setHolidays} vacations={vacations} setVacations={setVacations} lockDate={lockDate} setLockDate={setLockDate} motivatieEnabled={motivatieEnabled} setMotivatieEnabled={setMotivatieEnabled} motivatieFreq={motivatieFreq} setMotivatieFreq={setMotivatieFreq} showToast={showToast}/>}
            {view==="storage"&&<StorageView onExport={exportJSON} onImport={importJSON} gasUrl={gasUrl} setGasUrl={setGasUrl} onSaveToSheets={saveToSheets} onLoadFromSheets={loadFromSheets}/>}
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
