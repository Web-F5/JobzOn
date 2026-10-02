/**
 * Validates the GPO engine against Ben's locked benchmarks.
 * B01-B05 from Benchmark Suite sheet — see lib/electricianQuoteEngine.ts for assumptions.
 *
 * Run: node scripts/validate-gpo-engine.mjs
 */

// ── Inline the engine here (since we can't import TS directly) ──────────────

const A = {
  B6:0.35,B8:0.015,B9:0.022,B12:0.11,B13:0.0025,B15:0.055,B16:0.01,
  B17:0.35,B18:0.45,B22:1.25,B23:41,E5:0.45,E6:0.50,E7:0.20,E17:0.20,
  E21:0.025,E22:0.35,E28:0.75,E31:0.30,E32:0.02,H45:0.10,H46:0.18,
  H48:0.025,H49:0.06,H50:0.28,H51:0.22,H55:0.50,H66:0.25,H67:0.06,
  H68:0.006,H107:0.25,H108:0.18,H109:0.12,H110:0.65,K6:0.55,
};
const S = { E5:12, E6:6, E8:3.20, Q6:1.95, K:[0.60,0.45,0.35,0.25,0.18,0.12] };

function routeRate(r) {
  if(r==="UNDERFLOOR") return A.B8;
  if(r==="FLOOR") return A.E21;
  if(r==="CONDUIT") return A.B12;
  if(r==="OPEN FRAME") return A.B13;
  return A.B9; // ROOF
}
function clippingRate(r) {
  if(r==="UNDERFLOOR") return A.B15;
  if(r==="ROOF"||r==="FLOOR") return A.B16;
  return 0;
}
function progressiveMarkup(mat) {
  const tiers=[[50,.6],[200,.45],[500,.35],[1500,.25],[3000,.18],[Infinity,.12]];
  let rem=mat,markup=0,prev=0;
  for(const[cap,rate] of tiers){const b=Math.max(0,Math.min(rem,cap-prev));markup+=b*rate;rem-=b;prev=cap;if(rem<=0)break;}
  return markup;
}
function resolveRoute(g, setup) {
  if(g.qty===0) return "CONDUIT";
  const ov=g.routeOverride;
  if(ov==="MANUAL / SITE CHECK") return ov;
  if((ov==="UNDERFLOOR"||ov==="FLOOR")&&setup.underfloor!=="Yes") return "INVALID - NO FLOOR ACCESS";
  if(ov!=="AUTO") return ov;
  const isNewBuild=setup.quoteType==="New Build";
  const wholeOpenFrame=setup.openFrame==="Yes";
  if(isNewBuild||wholeOpenFrame) return "OPEN FRAME";
  if(setup.underfloor==="Yes"&&g.height==="Low") return "UNDERFLOOR";
  if(setup.roofAccess!=="None") return "ROOF";
  return "CONDUIT";
}
function groupLabour(g, setup, route) {
  const{qty,height,wallType,corner,layout,cableRun,newCircuit}=g;
  const isLow=height==="Low",isHigh=height==="High";
  const separate=layout==="Separate locations";
  const twoStorey=setup.storeys==="Two storey";
  const pullSheets=setup.roofAccess==="Pull sheets";
  if(route==="INVALID - NO FLOOR ACCESS"||route==="MANUAL / SITE CHECK") return 0;
  if(route==="OPEN FRAME") {
    const isNewBuild=setup.quoteType==="New Build";
    return qty*(A.H50+A.H51)+cableRun*A.B13+(isNewBuild?0:A.H66)+(twoStorey?qty*A.H67+cableRun*A.H68:0)+(newCircuit==="Yes"?A.B22:0);
  }
  if(setup.quoteType==="New Build") {
    return qty*(A.H50+A.H51)+cableRun*(routeRate(route)+clippingRate(route))+(route==="CONDUIT"?A.E22:0)+(route==="ROOF"&&pullSheets?cableRun*A.H48+qty*A.H49:0)+(twoStorey?qty*A.H67+cableRun*A.H68:0)+(newCircuit==="Yes"?A.B22:0);
  }
  const brickMul=layout==="Same area / shared run"&&wallType==="Exterior brick"&&qty>5?A.H110:1;
  const addOuts=separate?Math.max(qty-1,0)*A.K6:Math.min(Math.max(qty-1,0),4)*A.H107+Math.min(Math.max(qty-5,0),5)*A.H108+Math.max(qty-10,0)*A.H109;
  const wallD=wallType==="Interior wall"?Math.min(qty,2)*A.E5:wallType==="Exterior weatherboard"?A.E6+Math.max(qty-1,0)*A.E17:0;
  const crnr=corner==="Yes"?(separate?qty:1)*A.E7:0;
  return A.B6+qty*(isLow?A.H45:0)+addOuts+cableRun*routeRate(route)+cableRun*clippingRate(route)+(isLow&&setup.underfloor==="No"?qty*A.H46*brickMul:0)+(route==="ROOF"&&pullSheets?cableRun*A.H48+qty*A.H49:0)+wallD+crnr+(route==="UNDERFLOOR"&&isHigh?A.B17:0)+(route==="ROOF"&&isLow?A.B18:0)+(route==="CONDUIT"?A.E22:0)+(twoStorey?qty*A.E31+cableRun*A.E32:0)+(newCircuit==="Yes"?A.B22:0);
}
function groupMaterials(g, route) {
  if(route==="INVALID - NO FLOOR ACCESS"||route==="MANUAL / SITE CHECK") return 0;
  return g.qty*(S.E5+S.E6)+g.cableRun*S.Q6+(route==="CONDUIT"?g.cableRun*S.E8:0)+(g.newCircuit==="Yes"?A.B23:0);
}
function calcJob(setup, groups, settings) {
  const active=groups.filter(g=>g.qty>0);
  const grs=groups.map(g=>{const r=resolveRoute(g,setup);const l=g.qty>0?groupLabour(g,setup,r):0;const m=g.qty>0?groupMaterials(g,r):0;return{route:r,labourHrs:l,materials:m};});
  const modHrs=grs.reduce((s,r)=>s+r.labourHrs,0);
  const rawMat=grs.reduce((s,r)=>s+r.materials,0)+(setup.extraMaterials??0);
  const setupHrs=active.length===0?0:modHrs<=4?0.65:modHrs<=10?1.0:1.4;
  const hasOpenFrame=grs.some(r=>r.route==="OPEN FRAME");
  const hasRoof=grs.some(r=>r.route==="ROOF");
  const pullSheets=setup.roofAccess==="Pull sheets";
  const jobExtra=(setup.extraLabour??0)+(hasOpenFrame?A.E28:0)+(pullSheets&&hasRoof&&setup.quoteType!=="New Build"?A.H55:0);
  const totalHrs=modHrs+setupHrs+jobExtra;
  const labourSell=totalHrs*settings.labourSellRate;
  const markup=progressiveMarkup(rawMat);
  const travel=(setup.travelOverride??0)>0?(setup.travelOverride??0):settings.travelCallout;
  const travelCost=active.length>0?travel:0;
  const base=labourSell+rawMat+markup+travelCost;
  const overhead=base*settings.overheadAllowance;
  const contingency=base*settings.contingencyAllowance;
  const subtotalExGst=active.length===0?0:Math.max(settings.minimumJobCharge,base+overhead+contingency);
  const gst=subtotalExGst*0.10;
  const totalIncGst=active.length===0?0:Math.ceil((subtotalExGst+gst)/settings.quoteRounding)*settings.quoteRounding;
  return{totalHrs,subtotalExGst,totalIncGst,modHrs,setupHrs,rawMat,labourSell,grs};
}

const SETTINGS={labourSellRate:140,overheadAllowance:0.10,contingencyAllowance:0.05,minimumJobCharge:500,travelCallout:0,quoteRounding:10};
const DEF_SETUP={quoteType:"Existing Home",storeys:"Single storey",underfloor:"No",roofAccess:"Manhole",openFrame:"No"};
function g(qty,height,wall,layout,cable,newCircuit="No"){return{qty,height,wallType:wall,corner:"No",layout,cableRun:cable,newCircuit,routeOverride:"AUTO"};}
function emptyGroups(n=10){return Array.from({length:n},()=>g(0,"Low","Interior wall","Separate locations",0));}

// ── Benchmarks ───────────────────────────────────────────────────────────────
const benchmarks = [
  {
    id:"B01",desc:"1 low GPO, 10m, finished",
    setup:{...DEF_SETUP},
    groups:[g(1,"Low","Interior wall","Separate locations",10),...emptyGroups(9)],
    refHrs:2.5, refTotal:550, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B02",desc:"10 low GPOs, no floor access, 30m",
    setup:{...DEF_SETUP},
    groups:[g(10,"Low","Interior wall","Separate locations",30),...emptyGroups(9)],
    refHrs:11.81, refTotal:2540, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B03",desc:"10 high GPOs, pull-sheets roof, 30m",
    setup:{...DEF_SETUP,roofAccess:"Pull sheets"},
    groups:[g(10,"High","Interior wall","Separate locations",30),...emptyGroups(9)],
    refHrs:10.01, refTotal:2220, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B04",desc:"10 GPOs, full open-frame renovation",
    setup:{...DEF_SETUP,quoteType:"Renovation",openFrame:"Yes"},
    groups:[g(10,"Low","Interior wall","Same area / shared run",30),...emptyGroups(9)],
    refHrs:7.075, refTotal:1700, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B05",desc:"20 GPOs, new build bulk",
    setup:{...DEF_SETUP,quoteType:"New Build"},
    groups:[g(20,"Low","Interior wall","Same area / shared run",30),...emptyGroups(9)],
    refHrs:12.275, refTotal:2990, labTol:0.05, priceTol:0.075,
  },
];

let allPass=true;
for(const b of benchmarks){
  const r=calcJob(b.setup,b.groups,SETTINGS);
  const hrsOk=Math.abs(r.totalHrs-b.refHrs)/b.refHrs<=b.labTol;
  const priceOk=Math.abs(r.totalIncGst-b.refTotal)/b.refTotal<=b.priceTol;
  const status=hrsOk&&priceOk?"✓ PASS":"✗ FAIL";
  if(!(hrsOk&&priceOk)) allPass=false;
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Labour: ${r.totalHrs.toFixed(3)} hrs  (ref ${b.refHrs}, diff ${((r.totalHrs-b.refHrs)/b.refHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"FAIL"}`);
  console.log(`       Total:  $${r.totalIncGst.toFixed(0)}     (ref $${b.refTotal}, diff ${((r.totalIncGst-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"FAIL"}`);
  console.log(`       [modHrs=${r.modHrs.toFixed(3)}, setup=${r.setupHrs}, mat=${r.rawMat.toFixed(2)}, labour$=${r.labourSell.toFixed(2)}]`);
  console.log();
}
console.log(allPass ? "✓ All benchmarks pass!" : "✗ Some benchmarks failed.");
