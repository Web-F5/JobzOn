/**
 * Phase 2 engine validation — Light Install (B06-B08) and New Circuit (B11-B13)
 * Benchmarks from Aussie Sparky Quote Builder v10 Stage 25.
 * Run: node scripts/validate-phase2-engine.mjs
 */

// ── Shared Assumptions ───────────────────────────────────────────────────────
const A = {
  B8:0.015,B9:0.022,B12:0.11,B13:0.0025,B15:0.055,B16:0.01,
  E21:0.025,E22:0.35,E28:0.75,H48:0.025,H55:0.50,H66:0.25,
};
const S_K = [0.60,0.45,0.35,0.25,0.18,0.12];
const MARKUP_TIERS = [[50,S_K[0]],[200,S_K[1]],[500,S_K[2]],[1500,S_K[3]],[3000,S_K[4]],[Infinity,S_K[5]]];
function progressiveMarkup(mat) {
  let rem=mat,markup=0,prev=0;
  for(const[cap,rate] of MARKUP_TIERS){const b=Math.max(0,Math.min(rem,cap-prev));markup+=b*rate;rem-=b;prev=cap;if(rem<=0)break;}
  return markup;
}
function jobTotal(totalHrs, rawMat, settings) {
  const ls = totalHrs * settings.labourSellRate;
  const mm = progressiveMarkup(rawMat);
  const tc = settings.travelCallout;
  const base = ls + rawMat + mm + tc;
  const sub = Math.max(settings.minimumJobCharge, base * (1 + settings.overheadAllowance + settings.contingencyAllowance));
  return Math.ceil(sub * 1.10 / settings.quoteRounding) * settings.quoteRounding;
}
const SETTINGS = {labourSellRate:140, overheadAllowance:0.10, contingencyAllowance:0.05,
  minimumJobCharge:500, travelCallout:0, quoteRounding:10};
const SETUP_SMALL=0.65, SETUP_MEDIUM=1.00, SETUP_LARGE=1.40;
function setupHrs(modHrs) { return modHrs<=4?SETUP_SMALL:modHrs<=10?SETUP_MEDIUM:SETUP_LARGE; }

// ── New Circuit Engine ───────────────────────────────────────────────────────
const ANC = { E24:0.75,E25:0.35,E26:0.25,E27:0.18,E33:0.03,H70:0.35,H71:0.008 };
const NC_E23 = 0.95;
const NC_SIZE_FACTOR = {"1.5 mm²":1.0,"2.5 mm²":1.0,"4 mm²":1.1,"6 mm²":1.2,"10 mm²":1.35,"16 mm²":1.5,"25 mm²":1.7};
const NC_CABLE_COST  = {"1.5 mm²":1.15,"2.5 mm²":1.95,"4 mm²":2.99,"6 mm²":4.25};
const RCBO_COST      = {"10 A":35,"16 A":35,"20 A":35,"32 A":42};
const NC_FIXED=6, NC_ISO=35;
function rcboFromSize(s){if(s==="1.5 mm²")return"10 A";if(s==="2.5 mm²")return"16 A";if(s==="4 mm²")return"20 A";return"32 A";}
function routeRate(r){if(r==="UNDERFLOOR")return A.B8;if(r==="FLOOR")return A.E21;if(r==="CONDUIT")return A.B12;if(r==="OPEN FRAME")return A.B13;return A.B9;}
function clippingRate(r){if(r==="UNDERFLOOR")return A.B15;if(r==="ROOF"||r==="FLOOR")return A.B16;return 0;}

function calcCircuitJob(setup, circuits) {
  const res = circuits.map(c=>{
    const route = c.routeOverride!=="AUTO"?c.routeOverride:(setup.quoteType==="New Build"?"OPEN FRAME":setup.underfloor==="Yes"?"UNDERFLOOR":"ROOF");
    const sf = NC_SIZE_FACTOR[c.cableSize]||1;
    const rr = routeRate(route), cr = clippingRate(route);
    const two = setup.storeys==="Two storey";
    const isNewBuild = setup.quoteType==="New Build";
    const isOF = route==="OPEN FRAME";
    const hrs = ANC.E25+ANC.E26
      +c.cableRun*sf*(rr+cr)
      +(route==="CONDUIT"?A.E22:0)
      +(two&&!isOF&&!isNewBuild?NC_E23+c.cableRun*sf*ANC.E33:0)
      +(two&&(isNewBuild||isOF)?ANC.H70+c.cableRun*ANC.H71:0)
      +(isOF&&!isNewBuild?A.H66:0)
      +(c.isolator==="Yes"?0.5:0)
      +(isOF?ANC.E27:0);
    const rcboKey = c.rcboOverride==="AUTO"?rcboFromSize(c.cableSize):c.rcboOverride;
    const mat = c.cableRun*(NC_CABLE_COST[c.cableSize]||0)
      +(route==="CONDUIT"?c.cableRun*3.20:0)
      +(RCBO_COST[rcboKey]||35)+NC_FIXED+(c.isolator==="Yes"?NC_ISO:0);
    return {route,hrs,mat};
  });
  const sumHrs = res.reduce((s,r)=>s+r.hrs,0);
  const modHrs = ANC.E24+sumHrs;
  const rawMat = res.reduce((s,r)=>s+r.mat,0);
  const sh = setupHrs(modHrs);
  const totalHrs = modHrs+sh;
  const total = jobTotal(totalHrs, rawMat, SETTINGS);
  return {totalHrs,total,modHrs,rawMat};
}

// ── Light Install Engine ─────────────────────────────────────────────────────
const ALT = {H5:0.38,H6:0.32,H8:0.32,H9:0.32,H10:1.00,H11:0.55,H12:0.75,
  H15:1.65,H57:0.60,H58:0.50,H59:0.70,H60:0.55,H61:0.15,H62:0.55,
  H76:0.65,H77:0.40,H78:0.10,H79:0.08,H80:0.15,H81:0.12,H82:0.12,H83:0.15,
  K8:0.12,B10:0.032,B16:A.B16,E15:0.50};
const ML = {E7:1.15,E24:20,E25:6,E26:8,E27:10,E28:18,E29:55,E30:45,E31:15};
const LIGHT_COST = {Downlight:22,Pendant:45,Batten:18,Other:25,"Ceiling fan":10,IXL:0};
function baseHrs(t){if(t==="Downlight")return 0.32;if(t==="Pendant")return 0.32;if(t==="Batten")return 0.32;return 0.38;}

function calcLightJob(setup, points, controls) {
  const openFrame = setup.openFrame==="Yes"||setup.quoteType==="New Build";
  const isReno = setup.quoteType==="Renovation";

  const ptHrs = points.reduce((s,p)=>{
    if(!p.qty)return s;
    if(p.type==="Ceiling fan"){
      if(openFrame) return s+p.qty*ALT.H62+(p.timber?p.qty*ALT.H12:0)+p.cable*A.B13+(isReno?A.H66:0);
      return s+ALT.H10+Math.max(p.qty-1,0)*ALT.H11+(p.newPos?p.qty*0.35:0)+(p.timber?p.qty*ALT.H12:0)+p.cable*A.B9;
    }
    if(openFrame) return s+p.qty*(p.type==="Downlight"?ALT.H58:p.type==="Pendant"?ALT.H59:p.type==="Batten"?ALT.H60:ALT.H57)+p.cable*A.B13+(p.exterior?p.qty*ALT.H61:0)+(isReno?A.H66:0);
    if(p.newPos) return s+p.qty*Math.max(0.85,baseHrs(p.type)+ALT.K8)+p.cable*ALT.B10*ALT.H15+p.cable*ALT.B16+(p.exterior?ALT.E15:0);
    return s+p.qty*baseHrs(p.type)+p.cable*A.B9*0.25+(p.exterior?ALT.E15:0);
  },0);

  const ctrlHrs = controls.reduce((s,c)=>{
    if(!c.locations)return s;
    const total = (c.w1||0)+(c.w2||0)+(c.inter||0)+(c.dim||0)+(c.fan||0)+(c.other||0);
    return s
      +c.locations*(openFrame?ALT.H77:ALT.H76)
      +Math.max(total-c.locations,0)*ALT.H78
      +(c.w2||0)*ALT.H79+(c.inter||0)*ALT.H80+(c.dim||0)*ALT.H81+(c.fan||0)*ALT.H82
      +(openFrame&&isReno?ALT.H83:0);
  },0);

  const modHrs = ptHrs+ctrlHrs;
  const sh = setupHrs(modHrs);
  const totalHrs = modHrs+sh;

  const ptMat = points.reduce((s,p)=>{
    if(!p.qty)return s;
    if(p.type==="Ceiling fan") return s+p.qty*LIGHT_COST["Ceiling fan"]+(p.timber?p.qty*ML.E24:0)+p.cable*ML.E7;
    return s+(p.supply==="S&I"?p.qty*LIGHT_COST[p.type]:0)+p.cable*ML.E7;
  },0);
  const ctrlMat = controls.reduce((s,c)=>s+c.locations*ML.E25+(c.w1||0)*ML.E26+(c.w2||0)*ML.E27+(c.inter||0)*ML.E28+(c.dim||0)*ML.E29+(c.fan||0)*ML.E30+(c.other||0)*ML.E31,0);
  const rawMat = ptMat+ctrlMat;
  const total = jobTotal(totalHrs, rawMat, SETTINGS);
  return {totalHrs,total,modHrs,rawMat,ptHrs,ctrlHrs};
}

// ── Benchmarks ───────────────────────────────────────────────────────────────
const benchmarks = [
  // New Circuit
  {
    id:"B11",desc:"30m 2.5mm² roof circuit",
    run:()=>calcCircuitJob(
      {quoteType:"Existing Home",storeys:"Single storey",underfloor:"No"},
      [{cableRun:30,cableSize:"2.5 mm²",rcboOverride:"AUTO",isolator:"No",routeOverride:"AUTO"}]
    ),
    refHrs:2.96, refTotal:720, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B12",desc:"60m 6mm² conduit circuit + isolator",
    run:()=>calcCircuitJob(
      {quoteType:"Existing Home",storeys:"Single storey",underfloor:"No"},
      [{cableRun:60,cableSize:"6 mm²",rcboOverride:"AUTO",isolator:"Yes",routeOverride:"CONDUIT"}]
    ),
    refHrs:11.52, refTotal:2980, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B13",desc:"30m 4mm² underfloor circuit",
    run:()=>calcCircuitJob(
      {quoteType:"Existing Home",storeys:"Single storey",underfloor:"Yes"},
      [{cableRun:30,cableSize:"4 mm²",rcboOverride:"AUTO",isolator:"No",routeOverride:"AUTO"}]
    ),
    refHrs:4.31, refTotal:1020, labTol:0.05, priceTol:0.075,
  },
  // Light Install
  {
    id:"B06",desc:"6 replacement downlights (customer supplied), no new controls",
    run:()=>calcLightJob(
      {quoteType:"Existing Home",storeys:"Single storey",openFrame:"No"},
      [{qty:6,type:"Downlight",newPos:false,supply:"CS",cable:0,timber:false,exterior:false}],
      []
    ),
    refHrs:2.57, refTotal:550, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B07",desc:"8 new downlights S&I, 35m cable + 2-way pair + dimmer",
    run:()=>calcLightJob(
      {quoteType:"Existing Home",storeys:"Single storey",openFrame:"No"},
      [{qty:8,type:"Downlight",newPos:true,supply:"S&I",cable:35,timber:false,exterior:false}],
      [{locations:2,w1:0,w2:2,inter:0,dim:1,fan:0,other:0}]
    ),
    refHrs:12.078, refTotal:2700, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B08",desc:"2 ceiling fans (customer supplied), timber, 20m cable, 2 fan controls",
    run:()=>calcLightJob(
      {quoteType:"Existing Home",storeys:"Single storey",openFrame:"No"},
      [{qty:2,type:"Ceiling fan",newPos:true,supply:"CS",cable:20,timber:true,exterior:false}],
      [{locations:2,w1:0,w2:0,inter:0,dim:0,fan:2,other:0}]
    ),
    refHrs:6.73, refTotal:1550, labTol:0.05, priceTol:0.075,
  },
];

let allPass = true;
for(const b of benchmarks){
  const r = b.run();
  const hrsOk   = Math.abs(r.totalHrs - b.refHrs)/b.refHrs <= b.labTol;
  const priceOk = Math.abs(r.total    - b.refTotal)/b.refTotal <= b.priceTol;
  const status  = hrsOk&&priceOk?"✓ PASS":"✗ FAIL";
  if(!(hrsOk&&priceOk)) allPass=false;
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Labour: ${r.totalHrs.toFixed(3)} hrs  (ref ${b.refHrs}, diff ${((r.totalHrs-b.refHrs)/b.refHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"FAIL"}`);
  console.log(`       Total:  $${r.total.toFixed(0)}     (ref $${b.refTotal}, diff ${((r.total-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"FAIL"}`);
  console.log(`       [modHrs=${r.modHrs.toFixed(3)}, mat=${r.rawMat.toFixed(2)}]`);
  console.log();
}
console.log(allPass ? "✓ All Phase 2 benchmarks pass!" : "✗ Some benchmarks failed.");
