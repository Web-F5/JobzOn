/**
 * Phase 3 engine validation — Switchboard (B15, B16)
 * Custom Job has no dedicated benchmarks (free-form builder).
 * Run: node scripts/validate-phase3-engine.mjs
 */

// ── Shared helpers ────────────────────────────────────────────────────────────
const A = {
  B8:0.015, B9:0.022, B12:0.11, B13:0.0025, B15:0.055, B16:0.01,
  E21:0.025, E22:0.35, H48:0.025, H66:0.25,
};
const S_K = [0.60,0.45,0.35,0.25,0.18,0.12];
const MARKUP_TIERS = [[50,S_K[0]],[200,S_K[1]],[500,S_K[2]],[1500,S_K[3]],[3000,S_K[4]],[Infinity,S_K[5]]];
function progressiveMarkup(mat) {
  let rem=mat,markup=0,prev=0;
  for(const[cap,rate] of MARKUP_TIERS){const b=Math.max(0,Math.min(rem,cap-prev));markup+=b*rate;rem-=b;prev=cap;if(rem<=0)break;}
  return markup;
}
const SETTINGS={labourSellRate:140,overheadAllowance:0.10,contingencyAllowance:0.05,
  minimumJobCharge:500,travelCallout:0,quoteRounding:10};
const SETUP_SB=0.5, SETUP_SMALL=0.65, SETUP_MEDIUM=1.00, SETUP_LARGE=1.40;

// ── Switchboard Engine ────────────────────────────────────────────────────────
const ASB = { K16:0.15, H72:1.5, H73:0.9, H70:0.35, H71:0.008 };
const SB_WORK_HRS = { New:3, Upgrade:4, Modification:1 };
const SB_RCBO_MAT=35, SB_RCD_MAT=45, SB_SUNDRIES=40;
const SB_MAIN_MAT=180, SB_SUB_MAT=120, SB_SWITCH_MAT=45, SB_INSPECTOR=350;
const SB_CABLE_COST={"2.5 mm²":1.95,"4 mm²":2.99,"6 mm²":4.25,"10 mm²":7.12,"16 mm²":12,"25 mm²":15.01};
const NC_SIZE_FACTOR={"1.5 mm²":1.0,"2.5 mm²":1.0,"4 mm²":1.1,"6 mm²":1.2,"10 mm²":1.35,"16 mm²":1.5,"25 mm²":1.7};

function routeRate(r){if(r==="UNDERFLOOR")return A.B8;if(r==="FLOOR")return A.E21;if(r==="CONDUIT")return A.B12;if(r==="OPEN FRAME")return A.B13;return A.B9;}
function clippingRate(r){if(r==="UNDERFLOOR")return A.B15;if(r==="ROOF"||r==="FLOOR")return A.B16;return 0;}

function sbEntryLabour(e, setup) {
  if(e.board==="Not used") return 0;
  const route = e.cableLength===0?"NONE":
    (e.routeOverride!=="AUTO"?e.routeOverride:
    (setup.quoteType==="New Build"||setup.openFrame==="Yes"?"OPEN FRAME":
    setup.storeys==="Two storey"?"CONDUIT":
    setup.underfloor==="Yes"?"UNDERFLOOR":"ROOF"));
  const base = SB_WORK_HRS[e.workType];
  const pd = (e.rcboQty+e.rcdQty)*ASB.K16;
  let cable = 0;
  if(e.cableLength>0&&route!=="NONE"&&route!=="INVALID - NO FLOOR ACCESS"&&route!=="MANUAL / SITE CHECK"){
    const sf=NC_SIZE_FACTOR[e.cableSize]||1;
    const rr=routeRate(route),cr=clippingRate(route);
    const pull=setup.roofAccess==="Pull sheets";
    const two=setup.storeys==="Two storey";
    const isNB=setup.quoteType==="New Build";
    const isOF=route==="OPEN FRAME";
    const fi=e.board==="Main board"?ASB.H72:ASB.H73;
    cable=fi+e.cableLength*sf*(rr+cr)+(route==="CONDUIT"?A.E22:0)
      +(route==="ROOF"&&pull?e.cableLength*sf*A.H48:0)
      +(two&&(isNB||isOF)?ASB.H70+e.cableLength*ASB.H71:0)
      +(isOF&&!isNB?A.H66:0);
  }
  return base+pd+cable+(e.extraLabour||0);
}

function sbEntryMat(e, setup) {
  if(e.board==="Not used") return 0;
  const route = e.cableLength===0?"NONE":
    (e.routeOverride!=="AUTO"?e.routeOverride:
    (setup.quoteType==="New Build"||setup.openFrame==="Yes"?"OPEN FRAME":
    setup.storeys==="Two storey"?"CONDUIT":
    setup.underfloor==="Yes"?"UNDERFLOOR":"ROOF"));
  const pd=e.rcboQty*SB_RCBO_MAT+e.rcdQty*SB_RCD_MAT;
  const bd=(e.workType==="New"||e.workType==="Upgrade")
    ?((e.board==="Main board"?SB_MAIN_MAT:SB_SUB_MAT)+SB_SUNDRIES):0;
  const sw=e.mainSwitch==="Yes"?SB_SWITCH_MAT:0;
  let cm=0;
  if(e.cableLength>0&&route!=="NONE"&&route!=="INVALID - NO FLOOR ACCESS"){
    cm=e.cableLength*(SB_CABLE_COST[e.cableSize]||0)+(route==="CONDUIT"?e.cableLength*3.20:0);
  }
  return pd+bd+sw+cm+(e.extraMaterial||0);
}

function calcSbJob(setup, entries, sbOnly=true) {
  const active=entries.filter(e=>e.board!=="Not used");
  const hrs=entries.reduce((s,e)=>s+sbEntryLabour(e,setup),0);
  const mat=entries.reduce((s,e)=>s+sbEntryMat(e,setup),0);
  const inspector=entries.some(e=>e.board!=="Not used"&&e.inspector==="Yes");
  const ext=inspector?SB_INSPECTOR:0;
  const sh=active.length===0?0:(sbOnly?SETUP_SB:(hrs<=4?SETUP_SMALL:hrs<=10?SETUP_MEDIUM:SETUP_LARGE));
  const total=hrs+sh;
  const ls=total*SETTINGS.labourSellRate;
  const mm=progressiveMarkup(mat);
  const base=ls+mat+mm+ext;
  const sub=Math.max(SETTINGS.minimumJobCharge,base*(1+SETTINGS.overheadAllowance+SETTINGS.contingencyAllowance));
  const price=Math.ceil(sub*1.1/SETTINGS.quoteRounding)*SETTINGS.quoteRounding;
  return {totalHrs:total,modHrs:hrs,setupHrs:sh,rawMat:mat,ext,price};
}

// ── Benchmarks ────────────────────────────────────────────────────────────────
const DEF_SETUP={quoteType:"Existing Home",storeys:"Single storey",underfloor:"No",roofAccess:"Manhole",openFrame:"No"};

const benchmarks = [
  {
    id:"B15",desc:"Main board modification, 6 RCBOs",
    run:()=>calcSbJob(DEF_SETUP,[
      {board:"Main board",workType:"Modification",rcboQty:6,rcdQty:0,mainSwitch:"No",
       cableSize:"16 mm²",cableLength:0,routeOverride:"AUTO",inspector:"No",extraLabour:0,extraMaterial:0}
    ]),
    refHrs:2.4, refTotal:820, labTol:0.05, priceTol:0.075,
  },
  {
    id:"B16",desc:"Main-board upgrade + 8m mains + inspector (9 RCBOs + main switch assumed from refHrs)",
    run:()=>calcSbJob(DEF_SETUP,[
      {board:"Main board",workType:"Upgrade",rcboQty:9,rcdQty:0,mainSwitch:"Yes",
       cableSize:"16 mm²",cableLength:8,routeOverride:"AUTO",inspector:"Yes",extraLabour:0,extraMaterial:0}
    ]),
    refHrs:7.734, refTotal:3000, labTol:0.05, priceTol:0.075,
  },
];

let allPass=true;
for(const b of benchmarks){
  const r=b.run();
  const hrsOk=Math.abs(r.totalHrs-b.refHrs)/b.refHrs<=b.labTol;
  const priceOk=Math.abs(r.price-b.refTotal)/b.refTotal<=b.priceTol;
  const status=hrsOk&&priceOk?"✓ PASS":"✗ FAIL";
  if(!(hrsOk&&priceOk))allPass=false;
  console.log(`${status} ${b.id}: ${b.desc}`);
  console.log(`       Labour: ${r.totalHrs.toFixed(3)} hrs  (ref ${b.refHrs}, diff ${((r.totalHrs-b.refHrs)/b.refHrs*100).toFixed(1)}%)  ${hrsOk?"OK":"FAIL"}`);
  console.log(`       Total:  $${r.price.toFixed(0)}     (ref $${b.refTotal}, diff ${((r.price-b.refTotal)/b.refTotal*100).toFixed(1)}%)  ${priceOk?"OK":"FAIL"}`);
  console.log(`       [modHrs=${r.modHrs.toFixed(3)}, setup=${r.setupHrs}, mat=${r.rawMat.toFixed(2)}, ext=${r.ext}]`);
  console.log();
}
console.log(allPass?"✓ All Phase 3 benchmarks pass!":"✗ Some benchmarks failed.");
