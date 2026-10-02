/**
 * Phase 4 engine validation — Underground (B18-B21) and Data/TV (S25-03)
 * Underground benchmarks B18-B21 are LOCKED (Stage 24/Phase 3).
 * S25-03 is a Stage 25 CALIBRATION CANDIDATE: refHrs = module hours (E5/E11), not job total.
 * B22-B25 are REVERIFY (Stage 24 values may differ from Stage 25 constants) — run informational only.
 * Run: node scripts/validate-phase4-engine.mjs
 */

// ── Shared helpers ────────────────────────────────────────────────────────────
const A = {
  B8:0.015, B9:0.022, B12:0.11, B13:0.0025, B15:0.055, B16:0.01,
  E21:0.025, E22:0.35, H48:0.025, H49:0.06,
};
const S_K = [0.60,0.45,0.35,0.25,0.18,0.12];
const MARKUP_TIERS = [[50,S_K[0]],[200,S_K[1]],[500,S_K[2]],[1500,S_K[3]],[3000,S_K[4]],[Infinity,S_K[5]]];
function progressiveMarkup(mat) {
  let rem=mat,markup=0,prev=0;
  for(const[cap,rate] of MARKUP_TIERS){const b=Math.max(0,Math.min(rem,cap-prev));markup+=b*rate;rem-=b;prev=cap;if(rem<=0)break;}
  return markup;
}
function jobTotal(totalHrs, rawMat, ext=0, settings) {
  const ls = totalHrs * settings.labourSellRate;
  const mm = progressiveMarkup(rawMat);
  const base = ls + rawMat + mm + ext + settings.travelCallout;
  const sub = Math.max(settings.minimumJobCharge, base * (1 + settings.overheadAllowance + settings.contingencyAllowance));
  return Math.ceil(sub * 1.10 / settings.quoteRounding) * settings.quoteRounding;
}
const SETTINGS = {labourSellRate:140, overheadAllowance:0.10, contingencyAllowance:0.05,
  minimumJobCharge:500, travelCallout:0, quoteRounding:10};
const SETUP_SMALL=0.65, SETUP_MEDIUM=1.00, SETUP_LARGE=1.40;
function setupHrs(m) { return m<=4?SETUP_SMALL:m<=10?SETUP_MEDIUM:SETUP_LARGE; }

// ── Underground engine ────────────────────────────────────────────────────────
const AUG = {
  H64:0.012, H97:0.15, H98:0.005, H99:0.02, H111:0.3,
  K13:0.015, K14:0.18, K15:0.06, K16:0.045, K17:0.06, K18:0.035, K19:0.75,
};
const UG_SIZE_FACTOR = {"1.5 mm²":1.0,"2.5 mm²":1.0,"4 mm²":1.1,"6 mm²":1.2,"10 mm²":1.35,"16 mm²":1.5,"25 mm²":1.7};
const OLEX_CAP = {
  "1.5 mm²":[4,7,13,22,36,59], "2.5 mm²":[3,5,10,16,27,44], "4 mm²":[2,4,7,12,19,32],
  "6 mm²":[1,3,6,9,16,26], "10 mm²":[1,2,4,7,11,18], "16 mm²":[1,1,3,5,8,14], "25 mm²":[0,1,2,3,5,9],
};
const UG_CONDUIT_SIZES=["20 mm","25 mm","32 mm","40 mm","50 mm","63 mm"];
const UG_CABLE_COST={"1.5 mm²":1.36,"2.5 mm²":2.18,"4 mm²":2.95,"6 mm²":4.09,"10 mm²":7.12,"16 mm²":10.52,"25 mm²":15.01};
const UG_CONDUIT_COST={"20 mm":14,"25 mm":18,"32 mm":25,"40 mm":34,"50 mm":48,"63 mm":70};

function ugAutoSize(cables) {
  for(let i=0;i<UG_CONDUIT_SIZES.length;i++){
    const r=cables.reduce((s,c)=>{const cap=OLEX_CAP[c.size][i];return s+(cap===0?999:c.qty/cap);},0);
    if(r<=1) return UG_CONDUIT_SIZES[i];
  }
  return "63 mm";
}
function ugConduitCount(cables, sz) {
  const idx=UG_CONDUIT_SIZES.indexOf(sz);
  if(idx<0)return 1;
  const r=cables.reduce((s,c)=>{const cap=OLEX_CAP[c.size][idx];return s+(cap===0?999:c.qty/cap);},0);
  return r<=1?1:Math.ceil(r);
}

function calcUgJob({runLength, trenchMethod="Customer supplied trench", groundDifficulty="Normal",
    conduitOverride="AUTO", backfill="No", warningTape="Yes", bedding="No", termination="Yes",
    plantDays=0, extraPlantCost=0, extraLabour=0, extraMaterial=0,
    protectionActive="No", protectionPoints=0, protectionLength=0}, cables) {
  const active = cables.filter(c=>c.qty>0&&c.length>0);
  const R = runLength;
  const trenchRate = trenchMethod==="Hand dig"?AUG.K14:trenchMethod==="Own machine"?AUG.K15:trenchMethod==="Hired trencher / excavator"?AUG.K16:AUG.K13;
  const diffMult = groundDifficulty==="Very difficult"?1.6:groundDifficulty==="Difficult"?1.3:1.0;
  const selectedConduit = conduitOverride==="AUTO"?ugAutoSize(active):conduitOverride;
  const nConduits = ugConduitCount(active, selectedConduit);
  const conduitMetres = R * nConduits;
  const cablePullHrs = active.reduce((s,c)=>s+c.qty*c.length*AUG.H64*(UG_SIZE_FACTOR[c.size]||1),0);
  const totalActiveCables = active.reduce((s,c)=>s+c.qty,0);
  const modHrs =
    AUG.K19 + R*trenchRate*diffMult + conduitMetres*AUG.K18
    + (backfill==="Yes"?R*AUG.K17:0) + cablePullHrs
    + (warningTape==="Yes"?R*AUG.H98:0) + (bedding==="Yes"?R*AUG.H99:0)
    + (termination==="Yes"?totalActiveCables*AUG.H97:0) + extraLabour
    + (protectionActive==="Yes"?protectionPoints*AUG.H111:0);
  const sh = setupHrs(modHrs);
  const totalHrs = modHrs+sh;
  const conduit4m = Math.ceil(conduitMetres/4);
  const conduitMat = conduit4m*(UG_CONDUIT_COST[selectedConduit]||0)+nConduits*25;
  const cableMat = active.reduce((s,c)=>s+c.qty*c.length*(UG_CABLE_COST[c.size]||0),0);
  const rawMat =
    conduitMat+cableMat
    + (warningTape==="Yes"?R*0.45:0) + (bedding==="Yes"?R*3.50:0)
    + (termination==="Yes"?totalActiveCables*15:0) + extraMaterial
    + (protectionActive==="Yes"?protectionPoints*protectionLength*15:0);
  const ext = (trenchMethod==="Hired trencher / excavator"?plantDays*280:0)+extraPlantCost;
  const price = jobTotal(totalHrs, rawMat, ext, SETTINGS);
  return {modHrs, sh, totalHrs, rawMat, ext, price, selectedConduit, nConduits};
}

// ── Data/TV engine ────────────────────────────────────────────────────────────
const ADTV = {
  H84:1.5, H85:0.3, H86:0.15, H87:0.45, H88:0.25, H89:0.3,
  H90:0.08, H91:0.1, H92:0.004, H93:1.5, H94:0.5, H95:0.35, H96:0.2, H100:0.2,
};
const DTV_MAT = {
  cat6PerM:0.85, cat6aPerM:1.35, rj45Cat6:10, rj45Cat6a:14, plate:5, centralJack:6,
  tvCoaxPerM:0.95, tvMech:8, splitter2:18, splitter4:28, antenna:110, mast:45, amplifier:90,
};

function resolveDtvRoute(setup, grp) {
  if(grp.routeOverride==="MANUAL / SITE CHECK") return "MANUAL / SITE CHECK";
  if((grp.routeOverride==="UNDERFLOOR"||grp.routeOverride==="FLOOR")&&setup.underfloor!=="Yes") return "INVALID - NO FLOOR ACCESS";
  if(grp.routeOverride!=="AUTO") return grp.routeOverride;
  if(setup.quoteType==="New Build"||grp.areaCondition==="Open frame"||(grp.areaCondition==="Use site default"&&setup.openFrame==="Yes")) return "OPEN FRAME";
  if(setup.underfloor==="Yes") return "UNDERFLOOR";
  return "ROOF";
}

function dtvGroupLabour(setup, grp) {
  if(grp.locations===0) return 0;
  const route=resolveDtvRoute(setup,grp);
  if(route==="INVALID - NO FLOOR ACCESS"||route==="MANUAL / SITE CHECK") return 0;
  const isOpen=route==="OPEN FRAME", isTv=grp.service==="TV coax", isNew=grp.installType==="New";
  const two=setup.storeys==="Two storey", pull=setup.roofAccess==="Pull sheets";
  const baseHrs=isOpen?ADTV.H89:(isTv?(isNew?ADTV.H87:ADTV.H88):(isNew?ADTV.H84:ADTV.H85));
  const rr=route==="OPEN FRAME"?A.B13:route==="UNDERFLOOR"?A.B8+A.B15:route==="FLOOR"?A.E21+A.B16:route==="CONDUIT"?A.B12:A.B9+A.B16;
  const totalPorts=grp.locations*grp.portsEach;
  return grp.locations*baseHrs+Math.max(totalPorts-grp.locations,0)*ADTV.H86+grp.cableRun*rr
    +(grp.centralTermination==="Yes"?totalPorts*ADTV.H90:0)+ADTV.H100
    +(route==="CONDUIT"&&grp.cableRun>0?A.E22:0)
    +(route==="ROOF"&&pull?grp.cableRun*A.H48+grp.locations*ADTV.H49:0)
    +(two?grp.locations*ADTV.H91+grp.cableRun*ADTV.H92:0);
}

function dtvGroupMat(grp) {
  if(grp.locations===0) return 0;
  const totalPorts=grp.locations*grp.portsEach;
  if(grp.service==="TV coax") {
    const spl=totalPorts<=1?0:totalPorts<=2?DTV_MAT.splitter2:Math.ceil(totalPorts/4)*DTV_MAT.splitter4;
    return grp.cableRun*DTV_MAT.tvCoaxPerM+grp.locations*DTV_MAT.plate+totalPorts*DTV_MAT.tvMech+(grp.centralTermination==="Yes"?spl:0);
  }
  const cpm=grp.service==="Data Cat6A"?DTV_MAT.cat6aPerM:DTV_MAT.cat6PerM;
  const rj=grp.service==="Data Cat6A"?DTV_MAT.rj45Cat6a:DTV_MAT.rj45Cat6;
  return grp.cableRun*cpm+grp.locations*DTV_MAT.plate+totalPorts*rj+(grp.centralTermination==="Yes"?totalPorts*DTV_MAT.centralJack:0);
}

function calcDtvJob(setup, groups, antenna={active:"No"}) {
  const modHrs = groups.reduce((s,g)=>s+dtvGroupLabour(setup,g),0) + (()=>{
    if(antenna.active!=="Yes") return 0;
    const spl=antenna.splitterCount<=1?0:antenna.splitterCount<=2?DTV_MAT.splitter2:Math.ceil(antenna.splitterCount/4)*DTV_MAT.splitter4;
    return ADTV.H93+(antenna.mast==="Yes"?ADTV.H94:0)+(antenna.amplifier==="Yes"?ADTV.H95:0)+(antenna.splitterCount>1?ADTV.H96:0)+(antenna.antennaCableRun||0)*(A.B9+A.B16)+(antenna.extraLabour||0);
  })();
  const rawMat = groups.reduce((s,g)=>s+dtvGroupMat(g),0) + (()=>{
    if(antenna.active!=="Yes") return 0;
    const spl=(antenna.splitterCount||0)<=1?0:(antenna.splitterCount||0)<=2?DTV_MAT.splitter2:Math.ceil((antenna.splitterCount||0)/4)*DTV_MAT.splitter4;
    return (antenna.newAntenna==="Yes"?DTV_MAT.antenna:0)+(antenna.mast==="Yes"?DTV_MAT.mast:0)+(antenna.amplifier==="Yes"?DTV_MAT.amplifier:0)+spl+(antenna.antennaCableRun||0)*DTV_MAT.tvCoaxPerM+(antenna.extraMaterial||0);
  })();
  const sh = setupHrs(modHrs);
  const totalHrs = modHrs+sh;
  const price = jobTotal(totalHrs, rawMat, 0, SETTINGS);
  return {modHrs, sh, totalHrs, rawMat, price};
}

// ── Benchmarks ────────────────────────────────────────────────────────────────
const DEF_SETUP = {quoteType:"Existing Home",storeys:"Single storey",underfloor:"No",roofAccess:"Manhole",openFrame:"No"};

const locked = [
  {
    id:"B18", desc:"30 m customer trench, 1 × 6 mm² cable",
    run:()=>calcUgJob({runLength:30,trenchMethod:"Customer supplied trench",warningTape:"Yes",termination:"Yes"},
      [{size:"6 mm²",qty:1,length:30}]),
    refHrs:3.632, refTotal:1180, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B19", desc:"30 m hand dig, warning tape + bedding + backfill",
    run:()=>calcUgJob({runLength:30,trenchMethod:"Hand dig",warningTape:"Yes",bedding:"Yes",backfill:"Yes",termination:"Yes"},
      [{size:"6 mm²",qty:1,length:30}]),
    refHrs:11.732, refTotal:2790, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B20", desc:"60 m hired plant, 16 mm² cable, 2 plant days",
    run:()=>calcUgJob({runLength:60,trenchMethod:"Hired trencher / excavator",plantDays:2,warningTape:"Yes",bedding:"Yes",backfill:"Yes",termination:"Yes"},
      [{size:"16 mm²",qty:1,length:60}]),
    refHrs:13.28, refTotal:4930, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B21", desc:"40 m shared conduit: 6 mm² + 2.5 mm²",
    run:()=>calcUgJob({runLength:40,trenchMethod:"Customer supplied trench",warningTape:"Yes",termination:"Yes"},
      [{size:"6 mm²",qty:1,length:40},{size:"2.5 mm²",qty:1,length:40}]),
    refHrs:5.306, refTotal:1840, labTol:0.05, priceTol:0.075,
  },
];

// S25-03: CALIBRATION CANDIDATE — refHrs is module hrs (E5/E11), refTotal is job price
const calibration = [
  {
    id:"S25-03", desc:"1 new Cat6 point, 1 port, 15 m roof route [module hrs check]",
    run:()=>calcDtvJob(DEF_SETUP,
      [{service:"Data Cat6",locations:1,portsEach:1,cableRun:15,installType:"New",routeOverride:"AUTO",areaCondition:"Use site default",centralTermination:"No"}]),
    refModuleHrs:2.18, refTotal:560, labTol:0.05, priceTol:0.075,
    isCalibration:true,
  },
  {
    id:"S25-05", desc:"30 m customer trench, 1 × 6 mm², 2 × 1 m protection [module hrs check]",
    run:()=>calcUgJob({runLength:30,trenchMethod:"Customer supplied trench",warningTape:"Yes",termination:"Yes",protectionActive:"Yes",protectionPoints:2,protectionLength:1},
      [{size:"6 mm²",qty:1,length:30}]),
    refModuleHrs:3.582, refTotal:1330, labTol:0.05, priceTol:0.075,
    isCalibration:true,
  },
];

// B22-B25: REVERIFY (Stage 24 refs, Stage 25 constants — expect possible deviation)
const reverify = [
  {
    id:"B22", desc:"4 Cat6 locations, 4 ports, 60 m, central term [REVERIFY]",
    run:()=>calcDtvJob(DEF_SETUP,[
      {service:"Data Cat6",locations:4,portsEach:1,cableRun:60,installType:"New",routeOverride:"AUTO",areaCondition:"Use site default",centralTermination:"Yes"},
    ]),
    refHrs:6.24, refTotal:1370, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B23", desc:"4 Cat6 locations, 8 ports, 100 m [REVERIFY]",
    run:()=>calcDtvJob(DEF_SETUP,[
      {service:"Data Cat6",locations:4,portsEach:2,cableRun:100,installType:"New",routeOverride:"AUTO",areaCondition:"Use site default",centralTermination:"No"},
    ]),
    refHrs:8.44, refTotal:1930, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B24", desc:"6 TV outlets + new antenna + mast [REVERIFY]",
    run:()=>calcDtvJob(DEF_SETUP,
      [{service:"TV coax",locations:6,portsEach:1,cableRun:60,installType:"New",routeOverride:"AUTO",areaCondition:"Use site default",centralTermination:"No"}],
      {active:"Yes",newAntenna:"Yes",mast:"Yes",amplifier:"No",splitterCount:6,antennaCableRun:10,extraLabour:0,extraMaterial:0}),
    refHrs:10.68, refTotal:2680, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B25", desc:"6 Cat6A locations open-frame reno [REVERIFY]",
    run:()=>calcDtvJob(
      {quoteType:"Renovation",storeys:"Single storey",underfloor:"No",roofAccess:"Manhole",openFrame:"No"},
      [{service:"Data Cat6A",locations:6,portsEach:1,cableRun:60,installType:"New",routeOverride:"AUTO",areaCondition:"Open frame",centralTermination:"No"}]),
    refHrs:4.98, refTotal:1360, labTol:0.05, priceTol:0.075,
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────
let allPass=true;
console.log("═══ LOCKED benchmarks ═══");
for(const b of locked){
  const r=b.run();
  const hrsOk=Math.abs(r.totalHrs-b.refHrs)/b.refHrs<=b.labTol;
  const priceOk=Math.abs(r.price-b.refTotal)/b.refTotal<=b.priceTol;
  if(!(hrsOk&&priceOk))allPass=false;
  const status=hrsOk&&priceOk?"✓ PASS":"✗ FAIL";
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Labour: ${r.totalHrs.toFixed(3)} hrs  (ref ${b.refHrs}, diff ${((r.totalHrs-b.refHrs)/b.refHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"FAIL"}`);
  console.log(`       Total:  $${r.price.toFixed(0)}  (ref $${b.refTotal}, diff ${((r.price-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"FAIL"}`);
  console.log(`       [modHrs=${r.modHrs.toFixed(3)}, setup=${r.sh}, mat=${r.rawMat.toFixed(2)}, ext=${r.ext}, conduit=${r.nConduits}×${r.selectedConduit}]`);
  console.log();
}

console.log("═══ CALIBRATION CANDIDATE benchmarks (refHrs = module hrs) ═══");
for(const b of calibration){
  const r=b.run();
  const modHrs=r.modHrs;
  const hrsOk=Math.abs(modHrs-b.refModuleHrs)/b.refModuleHrs<=b.labTol;
  const priceOk=Math.abs(r.price-b.refTotal)/b.refTotal<=b.priceTol;
  if(!(hrsOk&&priceOk))allPass=false;
  const status=hrsOk&&priceOk?"✓ PASS":"✗ FAIL";
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Module hrs: ${modHrs.toFixed(3)}  (ref ${b.refModuleHrs}, diff ${((modHrs-b.refModuleHrs)/b.refModuleHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"FAIL"}`);
  console.log(`       Total:  $${r.price.toFixed(0)}  (ref $${b.refTotal}, diff ${((r.price-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"FAIL"}`);
  console.log(`       [setup=${r.sh}, mat=${r.rawMat.toFixed(2)}]`);
  console.log();
}

console.log("═══ REVERIFY benchmarks (Stage 24 refs — informational only) ═══");
for(const b of reverify){
  const r=b.run();
  const hrsOk=Math.abs(r.totalHrs-b.refHrs)/b.refHrs<=b.labTol;
  const priceOk=Math.abs(r.price-b.refTotal)/b.refTotal<=b.priceTol;
  const status=hrsOk&&priceOk?"✓":"✗";
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Labour: ${r.totalHrs.toFixed(3)}  (ref ${b.refHrs}, diff ${((r.totalHrs-b.refHrs)/b.refHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"REVERIFY"}`);
  console.log(`       Total:  $${r.price.toFixed(0)}  (ref $${b.refTotal}, diff ${((r.price-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"REVERIFY"}`);
  console.log(`       [modHrs=${r.modHrs.toFixed(3)}, mat=${r.rawMat.toFixed(2)}]`);
  console.log();
}

console.log(allPass?"✓ All LOCKED + CALIBRATION benchmarks pass!":"✗ Some LOCKED/CALIBRATION benchmarks failed.");
