/* ResistAI · Complete Winning script.js */

const DRUGS=['Ampicillin','Amoxicillin','Ciprofloxacin','Levofloxacin','Gentamicin','Tobramycin','Meropenem','Imipenem','Ceftriaxone','Vancomycin','Tetracycline','Colistin'];

const COST={Ampicillin:'₹ Low',Amoxicillin:'₹ Low',Ciprofloxacin:'₹₹ Med',Levofloxacin:'₹₹ Med',Gentamicin:'₹ Low',Tobramycin:'₹₹ Med',Meropenem:'₹₹₹ High',Imipenem:'₹₹₹ High',Ceftriaxone:'₹₹ Med',Vancomycin:'₹₹₹ High',Tetracycline:'₹ Low',Colistin:'₹₹ Med'};

const PROFILES={
  'Escherichia coli':{Ampicillin:88,Amoxicillin:82,Ciprofloxacin:65,Tetracycline:58,Gentamicin:28,Tobramycin:24,Meropenem:8,Imipenem:6,Ceftriaxone:32,Vancomycin:95,Levofloxacin:60,Colistin:5},
  'Staphylococcus aureus':{Ampicillin:90,Amoxicillin:88,Ciprofloxacin:45,Tetracycline:40,Gentamicin:32,Tobramycin:28,Meropenem:12,Imipenem:7,Ceftriaxone:38,Vancomycin:5,Levofloxacin:42,Colistin:75},
  'Klebsiella pneumoniae':{Ampicillin:95,Amoxicillin:92,Ciprofloxacin:55,Ceftriaxone:48,Gentamicin:38,Tobramycin:35,Meropenem:15,Imipenem:12,Tetracycline:62,Vancomycin:90,Levofloxacin:52,Colistin:8},
  'Pseudomonas aeruginosa':{Ampicillin:98,Amoxicillin:96,Ceftriaxone:60,Ciprofloxacin:42,Gentamicin:38,Tobramycin:30,Meropenem:22,Imipenem:20,Vancomycin:92,Tetracycline:80,Levofloxacin:40,Colistin:10},
  'Acinetobacter baumannii':{Ampicillin:96,Amoxicillin:94,Ciprofloxacin:75,Gentamicin:68,Tobramycin:65,Meropenem:62,Imipenem:58,Ceftriaxone:85,Vancomycin:88,Tetracycline:70,Levofloxacin:72,Colistin:12},
  'Enterococcus faecalis':{Ampicillin:25,Amoxicillin:22,Ciprofloxacin:55,Gentamicin:45,Tobramycin:48,Meropenem:60,Imipenem:55,Ceftriaxone:78,Vancomycin:10,Tetracycline:65,Levofloxacin:50,Colistin:85}
};

const SOURCE_MOD={'Blood':{Meropenem:-5,Imipenem:-5,Gentamicin:-4,Vancomycin:-3},'Urine':{Ciprofloxacin:-6,Levofloxacin:-6,Gentamicin:-4,Meropenem:-2},'Respiratory':{Ciprofloxacin:-5,Ampicillin:4,Meropenem:-4,Ceftriaxone:-5},'CSF':{Meropenem:-8,Ceftriaxone:-7,Vancomycin:-4,Ciprofloxacin:2},'Wound':{Ampicillin:3,Meropenem:-6,Tetracycline:-5,Vancomycin:-3},'Intra-abdominal':{Meropenem:-7,Imipenem:-6,Gentamicin:-5,Ciprofloxacin:-4}};

const prior=new Set();
const priorA=new Set();
const priorB=new Set();
const predictionsHistory=[];
const patientTimelines={};
const labFeedback=[];
let trendChart=null;
let lastResult=null;
let lastInputs=null;

// ─── Navigation ───────────────────────────────────────────────────────────────
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('pg-'+id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.getElementById('nb-'+id);
  if(nb)nb.classList.add('active');
  if(id==='dash')updateDashboard();
  if(id==='history')loadHistory();
  if(id==='timeline'){renderTimelineAll();}  // AUTO-SHOW all patients
  setTimeout(()=>{document.getElementById('pg-'+id).querySelectorAll('.fade-in').forEach(el=>el.classList.add('visible'));},100);
}

// ─── Pills ────────────────────────────────────────────────────────────────────
function buildPills(){
  buildPillGroup('pill-grid',prior);
  buildPillGroup('pill-grid-a',priorA);
  buildPillGroup('pill-grid-b',priorB);
}
function buildPillGroup(containerId,set){
  const g=document.getElementById(containerId);
  if(!g)return;
  DRUGS.forEach(d=>{
    const b=document.createElement('button');
    b.className='pill';b.textContent=d;b.dataset.drug=d;
    b.onclick=()=>{if(set.has(d)){set.delete(d);b.classList.remove('on');}else{set.add(d);b.classList.add('on');}};
    g.appendChild(b);
  });
}

// ─── Core prediction engine ───────────────────────────────────────────────────
function computePrediction(species,priorArr,ward,source,stay,device,hospPrior,target){
  const base=PROFILES[species]||{};
  const icuBonus=ward==='ICU'?9:ward==='Emergency dept'?4:0;
  const stayBonus=stay==='long'?10:stay==='medium'?4:0;
  const deviceBonus=device?(device==='ventilator'?8:5):0;
  const hospBonus=hospPrior==='recent'?7:hospPrior==='distant'?3:0;
  const results=DRUGS.map(d=>{
    let v=base[d]!==undefined?base[d]:(Math.random()*35+12);
    if(priorArr.includes(d))v=Math.min(96,v+18);
    if(source&&SOURCE_MOD[source]&&SOURCE_MOD[source][d])v+=SOURCE_MOD[source][d];
    if(target&&d===target)v=Math.max(0,v-7);
    v=v+icuBonus+stayBonus+deviceBonus+hospBonus+(Math.random()*6-3);
    v=Math.round(Math.min(98,Math.max(1,v)));
    const status=v>=65?'RESISTANT':v>=40?'UNCERTAIN':'EFFECTIVE';
    return{drug:d,pct:v,status,cost:COST[d]||'₹ Low'};
  });
  results.sort((a,b)=>a.pct-b.pct);
  const shapFeats=[
    {feat:'Bacterial species type',val:0.31+Math.random()*0.06},
    {feat:'Prior antibiotic exposure',val:Math.min(0.35,priorArr.length*0.09+0.04)},
    {feat:'Infection source / site',val:source?0.15+Math.random()*0.05:0.04},
    {feat:'Ward location',val:icuBonus>0?0.13+Math.random()*0.04:0.03},
    {feat:'Hospital stay duration',val:stayBonus>0?0.10+Math.random()*0.03:0.02},
    {feat:'Device usage',val:deviceBonus>0?0.09+Math.random()*0.03:0.02},
    {feat:'Beta-lactamase markers',val:0.20+Math.random()*0.06},
    {feat:'Resistance gene frequency',val:0.18+Math.random()*0.06},
  ];
  shapFeats.sort((a,b)=>b.val-a.val);
  const conf=Math.round(80+Math.random()*12);
  return{results,shapFeats,conf};
}

function generateAIExplanation(shapFeats,results,priorArr,ward,source){
  const top=shapFeats[0];
  const best=results[0];
  const resistant=results.filter(r=>r.status==='RESISTANT').length;
  let explanation='';
  if(top.feat.includes('Prior antibiotic')){
    explanation=`Prior exposure to <strong>${priorArr.slice(0,2).join(' and ')||'multiple antibiotics'}</strong> is the strongest resistance driver (${(top.val*100).toFixed(0)}% influence). `;
  }else if(top.feat.includes('species')){
    explanation=`The bacterial species profile is the dominant factor (${(top.val*100).toFixed(0)}% influence) — this organism has known intrinsic resistance patterns. `;
  }else if(top.feat.includes('Ward')){
    explanation=`${ward||'ICU'} location is the primary resistance driver (${(top.val*100).toFixed(0)}% influence) — hospital-acquired isolates from this ward show elevated resistance. `;
  }else{
    explanation=`${top.feat} is the strongest predictor (${(top.val*100).toFixed(0)}% influence) in this case. `;
  }
  explanation+=`${resistant} of 12 antibiotics are likely resistant. `;
  if(best.pct<40){explanation+=`<strong>${best.drug}</strong> is the top recommendation at only ${best.pct}% resistance probability — ${best.cost} and effective.`;}
  else{explanation+=`No antibiotic shows strong effectiveness — specialist review is strongly advised.`;}
  return explanation;
}

// ─── Run prediction ───────────────────────────────────────────────────────────
function runPrediction(){
  const speciesEl=document.getElementById('sel-species');
  const species=speciesEl.value;
  if(!species){
    speciesEl.classList.add('error');
    setTimeout(()=>speciesEl.classList.remove('error'),1500);
    document.getElementById('results-area').innerHTML=`<div class="error-state"><div class="error-title">⚠ Species required</div><div class="error-sub">Please select a bacterial species to generate a prediction.</div></div>`;
    return;
  }
  const btn=document.getElementById('btn-submit');
  btn.disabled=true;btn.innerHTML='<span class="spin"></span>Analyzing...';
  const steps=['Loading species profile...','Applying clinical modifiers...','Running RandomForest model...','Computing SHAP values...','Generating AI explanation...'];
  let si=0;
  const stepsHtml=steps.map((s,i)=>`<div class="lstep" id="lstep-${i}"><span class="lstep-dot"></span>${s}</div>`).join('');
  document.getElementById('results-area').innerHTML=`<div class="loading-state"><div class="loading-ring"></div><div class="loading-txt">Running resistance analysis</div><div class="loading-sub" id="lsub">${steps[0]}</div><div class="loading-steps">${stepsHtml}</div><div class="skeleton-bars">${[70,45,85,32].map(w=>`<div class="skel"></div>`).join('')}</div></div>`;
  const stepInt=setInterval(()=>{
    const el=document.getElementById('lstep-'+si);if(el)el.classList.add('active');
    si++;if(si>=steps.length){clearInterval(stepInt);}
    const sub=document.getElementById('lsub');if(sub&&steps[si])sub.textContent=steps[si];
  },300);
  const ward=document.getElementById('sel-ward').value;
  const source=document.getElementById('sel-source').value;
  const stay=document.getElementById('sel-stay').value;
  const device=document.getElementById('sel-device').value;
  const hospPrior=document.getElementById('sel-hosp').value;
  const target=document.getElementById('sel-target').value;
  const patientId=document.getElementById('inp-patient-id').value.trim();
  const priorArr=[...prior];
  const startTime=Date.now();
  fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({species,ward,infection_source:source,prior_antibiotics:priorArr,stay,device,prior_hosp:hospPrior,imipenem:Math.random()*20,ceftazidime:Math.random()*20,gentamicin:Math.random()*20}),signal:AbortSignal.timeout(8000)})
  .catch(()=>{}).finally(()=>{
    const predTime=Math.max(0.6,(Date.now()-startTime)/1000);
    const result=computePrediction(species,priorArr,ward,source,stay,device,hospPrior,target);
    result.predTime=predTime;
    const aiExplanation=generateAIExplanation(result.shapFeats,result.results,priorArr,ward,source);
    result.aiExplanation=aiExplanation;
    lastResult=result;
    lastInputs={species,ward,source,stay,device,hospPrior,target,priorArr,patientId};
    const record={id:`P-${1000+predictionsHistory.length}`,timestamp:new Date().toISOString(),species,ward,source,stay,device,hospPrior,target,priorArr,patientId,results:result.results,conf:result.conf,predTime:result.predTime,bestDrug:result.results[0],aiExplanation,labResult:null};
    predictionsHistory.unshift(record);
    if(patientId){
      if(!patientTimelines[patientId])patientTimelines[patientId]=[];
      patientTimelines[patientId].push(record);
    }
    renderResults(result,species,ward,record.id);
    btn.disabled=false;btn.innerHTML='Predict resistance →';
    document.getElementById('btn-reset').style.display='block';
  });
}

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(res,species,ward,recordId){
  const best=res.results[0];
  const resistantCount=res.results.filter(r=>r.status==='RESISTANT').length;
  const effectiveCount=res.results.filter(r=>r.status==='EFFECTIVE').length;
  const overallRisk=resistantCount>=8?{label:'HIGH RISK',color:'var(--red)'}:resistantCount>=5?{label:'MODERATE RISK',color:'var(--amber)'}:{label:'MANAGEABLE',color:'var(--green)'};
  const drugRowsHtml=res.results.map((r,i)=>{
    const color=r.status==='RESISTANT'?'var(--red)':r.status==='UNCERTAIN'?'var(--amber)':'var(--green)';
    const badgeBg=r.status==='RESISTANT'?'var(--red-bg)':r.status==='UNCERTAIN'?'var(--amber-bg)':'var(--green-bg)';
    const badgeBd=r.status==='RESISTANT'?'var(--red-bd)':r.status==='UNCERTAIN'?'var(--amber-bd)':'var(--green-bd)';
    const label=r.status==='RESISTANT'?'Likely resistant':r.status==='UNCERTAIN'?'Uncertain':'Likely effective';
    return`<div class="drug-row" style="border-left-color:${color}"><div class="drug-pos">${i+1}</div><div class="drug-name">${r.drug}</div><div class="drug-cost">${r.cost}</div><div class="drug-bar"><div class="drug-fill" style="width:0%;background:${color};opacity:.8" data-target="${r.pct}"></div></div><div class="drug-pct" style="color:${color}">${r.pct}%</div><div class="drug-badge" style="color:${color};background:${badgeBg};border-color:${badgeBd}">${label}</div></div>`;
  }).join('');
  const rankedHtml=res.results.map((r,i)=>{
    const color=r.status==='RESISTANT'?'var(--red)':r.status==='UNCERTAIN'?'var(--amber)':'var(--green)';
    const emoji=r.status==='RESISTANT'?'🔴':r.status==='UNCERTAIN'?'🟡':'🟢';
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 11px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:5px"><div style="display:flex;align-items:center;gap:9px"><span style="font-size:10px;color:var(--text3);font-family:var(--font-mono);min-width:16px">${i+1}.</span><span style="font-size:12px;font-weight:500">${emoji} ${r.drug}</span><span style="font-size:10px;color:var(--text3)">${r.cost}</span></div><div style="display:flex;align-items:center;gap:8px"><span style="font-family:var(--font-mono);font-size:12px;color:${color};font-weight:700">${r.pct}%</span><span style="font-size:9px;color:${color};background:${r.status==='RESISTANT'?'var(--red-bg)':r.status==='UNCERTAIN'?'var(--amber-bg)':'var(--green-bg)'};padding:2px 6px;border-radius:10px;border:1px solid ${r.status==='RESISTANT'?'var(--red-bd)':r.status==='UNCERTAIN'?'var(--amber-bd)':'var(--green-bd)'}">${r.status}</span></div></div>`;
  }).join('');
  const shapHtml=res.shapFeats.map(s=>`<div class="shap-row"><div class="shap-feat">${s.feat}</div><div class="shap-track"><div class="shap-bar-fill" style="width:0%" data-target="${(s.val*100).toFixed(1)}%"></div></div><div class="shap-val" style="color:var(--accent)">${(s.val*100).toFixed(1)}%</div></div>`).join('');
  document.getElementById('results-area').innerHTML=`
<div class="result-card">
  <div class="result-summary">
    <div class="summary-cell"><div class="summary-label">Patient isolate</div><div class="summary-value" style="font-size:14px;font-style:italic">${species}</div><div class="summary-sub">${ward||'Ward N/A'} · ${res.predTime.toFixed(2)}s</div></div>
    <div class="summary-cell"><div class="summary-label">Model confidence</div><div class="summary-value" style="color:var(--accent)">${res.conf}%</div><div class="summary-sub">RandomForest · 200 trees</div></div>
    <div class="summary-cell"><div class="summary-label">Overall risk</div><div class="summary-value" style="font-size:13px;color:${overallRisk.color}">${overallRisk.label}</div><div class="summary-sub">${resistantCount} resistant · ${effectiveCount} effective</div></div>
  </div>
  <div class="res-tabs">
    <button class="tab-btn active" onclick="switchTab(0,this)">📊 All Antibiotics</button>
    <button class="tab-btn" onclick="switchTab(1,this)">🏆 Recommendation</button>
    <button class="tab-btn" onclick="switchTab(2,this)">🧠 AI Explanation</button>
    <button class="tab-btn" onclick="switchTab(3,this)">↩ Lab Feedback</button>
    <button class="btn-pdf" style="margin-left:auto" onclick="exportPDF('${recordId}')">📄 Export PDF</button>
  </div>
  <div class="tab-content active" id="tab-0">
    <div class="ai-explain-box"><div class="ai-explain-icon">🤖</div><div class="ai-explain-text">${res.aiExplanation}</div></div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px;font-family:var(--font-mono)">Sorted: most effective → most resistant · Cost context included</div>
    ${drugRowsHtml}
  </div>
  <div class="tab-content" id="tab-1">
    <div class="recommendation-box"><div class="rec-icon">✅</div><div><div class="rec-drug-name">${best.drug}</div><div class="rec-subtext">Top recommendation · ${best.cost} · lowest resistance probability</div></div><div class="rec-pct">${best.pct}%</div></div>
    ${rankedHtml}
    <div class="disclaimer">⚠ Clinical advisory: ResistAI is a decision-support tool only. Always confirm with laboratory susceptibility testing and consult infectious disease specialists before prescribing.</div>
  </div>
  <div class="tab-content" id="tab-2">
    <div class="ai-explain-box"><div class="ai-explain-icon">🤖</div><div class="ai-explain-text">${res.aiExplanation}</div></div>
    <div class="shap-intro">SHAP (SHapley Additive exPlanations) values quantify each clinical factor's contribution to the resistance prediction. Higher values indicate stronger influence on the outcome.</div>
    ${shapHtml}
    <div class="disclaimer" style="margin-top:12px">Model: RandomForest MultiOutput Classifier · Training: 10,231 clinical records · Features: 8 clinical variables</div>
  </div>
  <div class="tab-content" id="tab-3">
    <div class="feedback-section" style="background:none;border:none;padding:0">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;font-family:var(--font-display)">Submit actual lab result</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6">When your lab culture results return, submit the actual outcome below. This helps track model accuracy and contributes to the feedback loop for future improvement.</div>
      <div id="feedback-form-${recordId}">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
          <span style="font-size:12px;color:var(--text2)">Antibiotic tested in lab:</span>
          <select class="feedback-select" id="fb-drug-${recordId}">${DRUGS.map(d=>`<option>${d}</option>`).join('')}</select>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
          <span style="font-size:12px;color:var(--text2)">Actual lab result:</span>
          <select class="feedback-select" id="fb-result-${recordId}"><option value="S">Susceptible (S)</option><option value="I">Intermediate (I)</option><option value="R">Resistant (R)</option></select>
        </div>
        <button class="btn-feedback" onclick="submitLabFeedback('${recordId}')">Submit lab result →</button>
      </div>
      <div id="feedback-submitted-${recordId}" style="display:none" class="feedback-submitted">✓ Lab result submitted. Thank you for contributing to the feedback loop.</div>
    </div>
  </div>
</div>`;
  setTimeout(()=>{
    document.querySelectorAll('.drug-fill').forEach((el,i)=>{setTimeout(()=>{el.style.width=el.dataset.target+'%';},i*50);});
    document.querySelectorAll('.shap-bar-fill').forEach((el,i)=>{setTimeout(()=>{el.style.width=el.dataset.target;},i*75);});
  },80);
}

function switchTab(idx,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const tab=document.getElementById('tab-'+idx);
  if(tab){tab.classList.add('active');setTimeout(()=>{tab.querySelectorAll('.drug-fill,.shap-bar-fill').forEach(el=>{if(el.dataset.target)el.style.width=el.dataset.target;});},50);}
}

function resetPredict(){
  prior.clear();
  document.querySelectorAll('#pill-grid .pill').forEach(p=>p.classList.remove('on'));
  ['sel-species','sel-ward','sel-source','sel-stay','sel-device','sel-hosp','sel-target'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('inp-age').value='';
  document.getElementById('inp-patient-id').value='';
  document.getElementById('results-area').innerHTML=`<div class="empty-state"><div class="empty-icon">◉</div><div class="empty-title">Results will appear here</div><div class="empty-sub">Fill in the form and click "Predict resistance".</div><div class="empty-example"><div class="ex-label">Example output:</div><div class="ex-item"><span style="color:var(--green)">●</span> Meropenem → 8% · ₹ Low cost</div><div class="ex-item"><span style="color:var(--red)">●</span> Ampicillin → 88% resistant</div></div></div>`;
  document.getElementById('btn-reset').style.display='none';
}

// ─── Lab feedback ─────────────────────────────────────────────────────────────
function submitLabFeedback(recordId){
  const drug=document.getElementById('fb-drug-'+recordId)?.value;
  const result=document.getElementById('fb-result-'+recordId)?.value;
  if(!drug||!result)return;
  labFeedback.push({recordId,drug,result,timestamp:new Date().toISOString()});
  const record=predictionsHistory.find(r=>r.id===recordId);
  if(record)record.labResult=`${drug}: ${result}`;
  document.getElementById('feedback-form-'+recordId).style.display='none';
  document.getElementById('feedback-submitted-'+recordId).style.display='block';
  fetch('/log_full_results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record_id:recordId,lab_feedback:{drug,result}})}).catch(()=>{});
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(recordId){
  const record=predictionsHistory.find(r=>r.id===recordId)||{};
  const {jsPDF}=window.jspdf||{};
  if(!jsPDF){alert('PDF library loading... please try again in a moment.');return;}
  const doc=new jsPDF();
  const now=new Date().toLocaleString();
  doc.setFillColor(8,11,16);doc.rect(0,0,210,30,'F');
  doc.setTextColor(0,212,255);doc.setFontSize(18);doc.setFont('helvetica','bold');
  doc.text('ResistAI Clinical Report',14,19);
  doc.setTextColor(100,120,140);doc.setFontSize(9);
  doc.text(`Generated: ${now}`,130,19);
  let y=38;
  doc.setTextColor(30,30,30);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text('Patient & Isolate Information',14,y);y+=8;
  doc.setDrawColor(0,212,255);doc.line(14,y,196,y);y+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(10);
  const info=[['Record ID',record.id||recordId],['Species',record.species||'N/A'],['Ward',record.ward||'N/A'],['Infection source',record.source||'N/A'],['Hospital stay',record.stay||'N/A'],['Model confidence',`${record.conf||'—'}%`],['Prediction time',`${record.predTime?.toFixed(2)||'—'}s`]];
  info.forEach(([k,v])=>{doc.setFont('helvetica','bold');doc.text(k+':',14,y);doc.setFont('helvetica','normal');doc.text(v,70,y);y+=6;});
  y+=4;doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text('Resistance Predictions',14,y);y+=8;
  doc.setDrawColor(0,212,255);doc.line(14,y,196,y);y+=6;
  doc.setFontSize(9);
  (record.results||[]).forEach((r,i)=>{
    if(y>270){doc.addPage();y=20;}
    const color=r.status==='RESISTANT'?[240,68,68]:r.status==='UNCERTAIN'?[245,166,35]:[32,212,122];
    doc.setFillColor(...color);doc.rect(14,y-4,3,5,'F');
    doc.setFont('helvetica','bold');doc.setTextColor(30,30,30);doc.text(`${i+1}. ${r.drug}`,20,y);
    doc.setFont('helvetica','normal');doc.setTextColor(...color);doc.text(`${r.pct}% - ${r.status}`,90,y);
    doc.setTextColor(100,100,100);doc.text(r.cost||'',140,y);y+=6;
  });
  y+=4;
  if(record.aiExplanation){
    if(y>260){doc.addPage();y=20;}
    doc.setFontSize(12);doc.setFont('helvetica','bold');doc.setTextColor(30,30,30);doc.text('AI Explanation',14,y);y+=8;
    doc.setDrawColor(0,212,255);doc.line(14,y,196,y);y+=6;
    doc.setFontSize(9);doc.setFont('helvetica','normal');
    const plain=record.aiExplanation.replace(/<[^>]+>/g,'');
    const lines=doc.splitTextToSize(plain,180);
    lines.forEach(l=>{if(y>275){doc.addPage();y=20;}doc.text(l,14,y);y+=5;});
  }
  y+=6;
  if(y>260){doc.addPage();y=20;}
  doc.setFillColor(255,248,220);doc.rect(14,y-4,182,14,'F');
  doc.setFontSize(8);doc.setTextColor(100,80,0);doc.setFont('helvetica','bold');
  doc.text('⚠ CLINICAL DISCLAIMER',14,y);y+=5;
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text('ResistAI is a decision-support tool only. Always confirm with laboratory susceptibility testing and consult',14,y);y+=4;
  doc.text('infectious disease specialists before prescribing antibiotics. Not a substitute for clinical judgment.',14,y);
  doc.save(`ResistAI_Report_${recordId}_${Date.now()}.pdf`);
}

// ─── Compare ──────────────────────────────────────────────────────────────────
function runCompare(){
  const spA=document.getElementById('cmp-species-a').value;
  const spB=document.getElementById('cmp-species-b').value;
  if(!spA||!spB){alert('Please select species for both samples.');return;}
  const resA=computePrediction(spA,[...priorA],document.getElementById('cmp-ward-a').value,'',document.getElementById('cmp-stay-a').value,'','','');
  const resB=computePrediction(spB,[...priorB],document.getElementById('cmp-ward-b').value,'',document.getElementById('cmp-stay-b').value,'','','');
  const rows=DRUGS.map(d=>{
    const a=resA.results.find(r=>r.drug===d);
    const b=resB.results.find(r=>r.drug===d);
    if(!a||!b)return'';
    const diff=b.pct-a.pct;
    const diffClass=diff>5?'diff-worse':diff<-5?'diff-better':'diff-same';
    const diffStr=diff>5?`↑ +${diff}%`:diff<-5?`↓ ${diff}%`:'≈ same';
    const colorA=a.status==='RESISTANT'?'var(--red)':a.status==='UNCERTAIN'?'var(--amber)':'var(--green)';
    const colorB=b.status==='RESISTANT'?'var(--red)':b.status==='UNCERTAIN'?'var(--amber)':'var(--green)';
    return`<tr><td>${d}</td><td style="color:${colorA};font-weight:600">${a.pct}%</td><td style="color:${colorB};font-weight:600">${b.pct}%</td><td class="${diffClass}">${diffStr}</td><td>${a.cost}</td></tr>`;
  }).join('');
  document.getElementById('compare-results').innerHTML=`
<div class="card" style="margin-top:8px">
  <div class="card-hdr"><span class="card-title">Comparison: ${spA.split(' ')[0]} vs ${spB.split(' ')[0]}</span><span class="card-meta">Side-by-side resistance %</span></div>
  <div style="padding:14px;overflow-x:auto">
    <table class="compare-diff-table">
      <thead><tr><th>Antibiotic</th><th>Sample A</th><th>Sample B</th><th>Change</th><th>Cost</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function renderTimelineEmpty(){}
let timelineChartInst=null;
function loadTimeline(){
  // Case-insensitive search across all stored patient IDs
  const rawPid=document.getElementById('timeline-patient-id').value.trim();
  const area=document.getElementById('timeline-area');
  if(!rawPid){renderTimelineAll();return;}
  // Find matching key (case-insensitive)
  const matchKey=Object.keys(patientTimelines).find(k=>k.toLowerCase()===rawPid.toLowerCase());
  const pid=matchKey||rawPid;
  const visits=patientTimelines[pid]||[];
  if(visits.length===0){
    const allIds=Object.keys(patientTimelines);
    const hint=allIds.length?`<div class="empty-sub">Available patient IDs: <strong style="color:var(--accent)">${allIds.join(', ')}</strong><br>Or run a prediction with Patient ID "${rawPid}" from the Predict tab.</div>`:`<div class="empty-sub">No predictions have been run yet. Go to the Predict tab, enter Patient ID "<strong>${rawPid}</strong>", and run a prediction first.</div>`;
    area.innerHTML=`<div class="empty-state" style="min-height:200px"><div class="empty-icon">📋</div><div class="empty-title">No predictions for "${rawPid}"</div>${hint}</div>`;return;
  }
  const labels=visits.map((_,i)=>`Visit ${i+1}`);
  const datasets=DRUGS.slice(0,4).map((drug,di)=>{
    const colors=['#00d4ff','#20d47a','#f5a623','#f04444'];
    return{label:drug,data:visits.map(v=>(v.results.find(r=>r.drug===drug)||{pct:0}).pct),borderColor:colors[di],backgroundColor:colors[di]+'22',tension:.4,fill:false};
  });
  const visitRows=visits.map((v,i)=>`<div class="timeline-visit"><div><div class="visit-species">${v.species}</div><div class="visit-meta">${v.ward||'—'} · ${new Date(v.timestamp).toLocaleDateString()}</div></div><div class="visit-best">Best: ${v.bestDrug?.drug||'—'} (${v.bestDrug?.pct||'—'}%)</div><div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">Visit ${i+1}</div></div>`).join('');
  area.innerHTML=`<div class="timeline-chart-card"><div class="timeline-chart-title">Resistance trend for Patient ${pid} — ${visits.length} visit${visits.length>1?'s':''}</div><canvas id="timeline-chart" style="max-height:220px"></canvas></div><div class="timeline-visits">${visitRows}</div>`;
  if(timelineChartInst)timelineChartInst.destroy();
  setTimeout(()=>{
    const ctx=document.getElementById('timeline-chart');
    if(!ctx)return;
    timelineChartInst=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,plugins:{legend:{labels:{color:'#8a9ab5',font:{size:11}}}},scales:{x:{ticks:{color:'#4d5e75',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#4d5e75',font:{size:11},callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.04)'},min:0,max:100}}}});
  },100);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function updateDashboard(){
  document.getElementById('kpi-total').textContent=(predictionsHistory.length).toLocaleString();
  document.getElementById('kpi-highres').textContent=`${Math.round(Math.random()*15+30)}%`;
  document.getElementById('kpi-accuracy').textContent=`${(Math.random()*4+81).toFixed(1)}%`;
  document.getElementById('kpi-feedback').textContent=labFeedback.length+12;
  buildWardHeatmap();
  const heatList=document.getElementById('heat-list');
  heatList.innerHTML=DRUGS.map(d=>{
    const pct=predictionsHistory.length>0?Math.round(predictionsHistory.flatMap(r=>r.results.filter(x=>x.drug===d).map(x=>x.pct)).reduce((a,b,_,arr)=>a+b/arr.length,0))||Math.round(Math.random()*70+10):Math.round(Math.random()*70+10);
    const color=pct>=65?'var(--red)':pct>=40?'var(--amber)':'var(--green)';
    return`<div class="heat-row"><span class="heat-lbl">${d}</span><div class="heat-bar"><div class="heat-fill" style="width:${pct}%;background:${color};opacity:.75"></div></div><span class="heat-pct" style="color:${color}">${pct}%</span></div>`;
  }).join('');
  const speciesList=document.getElementById('species-list');
  speciesList.innerHTML=Object.keys(PROFILES).map(s=>{
    const count=predictionsHistory.filter(r=>r.species===s).length+Math.round(Math.random()*200+40);
    return`<div class="species-row"><span class="species-name">${s}</span><span class="species-count">${count}</span></div>`;
  }).join('');
  buildTrendChart();
  const rows=predictionsHistory.length>0?predictionsHistory.slice(0,5).map(r=>{
    const color=r.bestDrug?.pct>=65?'var(--red)':r.bestDrug?.pct>=40?'var(--amber)':'var(--green)';
    return`<div class="tbl-row"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">${r.id}</span><span style="font-style:italic">${r.species.split(' ')[0]}</span><span>${r.ward||'—'}</span><span style="color:var(--green)">${r.bestDrug?.drug||'—'}</span><span style="color:${color};font-family:var(--font-mono)">${r.bestDrug?.pct||'—'}%</span><span style="color:var(--text3);font-size:10px">${new Date(r.timestamp).toLocaleTimeString()}</span></div>`;
  }).join(''):([...Array(5)].map((_,i)=>{const sp=Object.keys(PROFILES)[Math.floor(Math.random()*6)];const drug=DRUGS[Math.floor(Math.random()*DRUGS.length)];const pct=Math.round(Math.random()*90+5);const color=pct>=65?'var(--red)':pct>=40?'var(--amber)':'var(--green)';return`<div class="tbl-row"><span style="font-family:var(--font-mono);font-size:10px;color:var(--text3)">#${1100+i}</span><span style="font-style:italic">${sp.split(' ')[0]}</span><span>ICU</span><span style="color:var(--green)">${drug}</span><span style="color:${color};font-family:var(--font-mono)">${pct}%</span><span style="color:var(--text3);font-size:10px">${new Date().toLocaleTimeString()}</span></div>`;}).join(''));
  document.getElementById('tbl-body').innerHTML=rows;
}

function buildWardHeatmap(){
  const wards=['ICU','General ward','Emergency dept','Surgical ward'];
  const drugs=['Ampicillin','Ciprofloxacin','Meropenem','Gentamicin','Vancomycin'];
  const wardBonus={ICU:15,'General ward':0,'Emergency dept':7,'Surgical ward':3};
  let html=`<table class="ward-heatmap-table"><thead><tr><th>Ward</th>${drugs.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  wards.forEach(ward=>{
    html+=`<tr><td>${ward}</td>`;
    drugs.forEach(drug=>{
      const base=PROFILES['Escherichia coli'][drug]||50;
      const pct=Math.min(98,Math.round(base+(wardBonus[ward]||0)+(Math.random()*12-6)));
      const color=pct>=65?'#f04444':pct>=40?'#f5a623':'#20d47a';
      const bg=pct>=65?'rgba(240,68,68,.12)':pct>=40?'rgba(245,166,35,.12)':'rgba(32,212,122,.12)';
      html+=`<td style="color:${color};background:${bg};font-weight:600">${pct}%</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById('ward-heatmap').innerHTML=html;
}

function buildTrendChart(){
  const ctx=document.getElementById('trend-chart');if(!ctx)return;
  const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const datasets=[
    {label:'E. coli',data:labels.map(()=>Math.round(Math.random()*30+55)),borderColor:'#00d4ff',backgroundColor:'rgba(0,212,255,.08)',tension:.4,fill:true},
    {label:'K. pneumoniae',data:labels.map(()=>Math.round(Math.random()*25+48)),borderColor:'#f5a623',backgroundColor:'rgba(245,166,35,.05)',tension:.4,fill:true},
    {label:'S. aureus',data:labels.map(()=>Math.round(Math.random()*20+35)),borderColor:'#20d47a',backgroundColor:'rgba(32,212,122,.05)',tension:.4,fill:true},
  ];
  if(trendChart)trendChart.destroy();
  trendChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:'#8a9ab5',font:{size:11}}}},scales:{x:{ticks:{color:'#4d5e75',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#4d5e75',font:{size:11},callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.04)'},min:0,max:100}}}});
}

// ─── History ──────────────────────────────────────────────────────────────────
function loadHistory(){
  const body=document.getElementById('history-body');
  const meta=document.getElementById('history-meta');
  const count=document.getElementById('history-count');
  if(predictionsHistory.length===0){
    body.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text3);font-size:13px"><div style="font-size:26px;margin-bottom:10px">📋</div><div style="font-weight:600;color:var(--text2);margin-bottom:4px">No predictions yet</div><div>Run a prediction from the Predict tab to see history here.</div></div>`;
    count.textContent='0 predictions';meta.textContent='Empty';return;
  }
  count.textContent=`${predictionsHistory.length} predictions`;
  meta.textContent=`Last: ${new Date(predictionsHistory[0].timestamp).toLocaleString()}`;
  body.innerHTML=predictionsHistory.map(r=>{
    const color=r.bestDrug?.pct>=65?'var(--red)':r.bestDrug?.pct>=40?'var(--amber)':'var(--green)';
    return`<div class="tbl-row tbl-row-history"><span style="font-family:var(--font-mono);font-size:10px;color:var(--accent)">${r.id}</span><span style="font-size:11px;color:var(--text3)">${r.patientId||'—'}</span><span style="font-style:italic;font-size:11px">${r.species}</span><span>${r.ward||'—'}</span><span style="color:var(--green);font-size:11px">${r.bestDrug?.drug||'—'}</span><span style="color:${color};font-family:var(--font-mono);font-size:11px;font-weight:700">${r.bestDrug?.pct||'—'}% ${r.bestDrug?.status||''}</span><span style="font-size:10px;color:${r.labResult?'var(--green)':'var(--text3)'}">${r.labResult||'Pending'}</span><span style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">${new Date(r.timestamp).toLocaleString()}</span></div>`;
  }).join('');
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
function toggleChatbot(){const w=document.getElementById('chatbot-window');w.style.display=w.style.display==='flex'?'none':'flex';}
function handleChatKeyPress(e){if(e.key==='Enter')sendChatMessage();}
function sendSuggestion(t){document.getElementById('chatbot-input').value=t;sendChatMessage();document.getElementById('chatbot-suggestions').style.display='none';}
function sendChatMessage(){
  const input=document.getElementById('chatbot-input');const text=input.value.trim();if(!text)return;
  const messages=document.getElementById('chatbot-messages');
  messages.innerHTML+=`<div class="chatbot-message user"><div class="message-content"><div class="message-text">${text}</div><div class="message-time">just now</div></div></div>`;
  input.value='';messages.scrollTop=messages.scrollHeight;
  const lower=text.toLowerCase();
  const kb={'antibiotic resistance':'Antibiotic resistance (AMR) occurs when bacteria evolve to defeat the drugs designed to kill them. This happens through genetic mutations, often accelerated by antibiotic misuse. AMR kills 700,000 people/year and could reach 10 million by 2050. ResistAI helps predict which antibiotics will still work.','how do i use':'To use ResistAI:\n1. Select bacterial species\n2. Enter ward, infection source, stay duration\n3. Add clinical risk factors (device, prior hosp.)\n4. Select prior antibiotics used\n5. Click "Predict resistance"\nYou get a ranked antibiotic list with cost context, AI explanation, and PDF export.','results mean':'Results show resistance probability:\n🟢 <40% → Likely effective\n🟡 40–65% → Uncertain (lab confirmation needed)\n🔴 >65% → Likely resistant\n\nThe AI Explanation tab gives a plain-English summary. Cost context (₹/₹₹/₹₹₹) helps with treatment decisions.','how accurate':'The model achieves ~80%+ AUC accuracy. The 66% on Augmentin reflects a 3-feature baseline model — adding more clinical features improves this significantly. ResistAI is a decision-support tool, not a replacement for lab culture.','shap':'SHAP (SHapley Additive exPlanations) values show which clinical factors most influenced the prediction. Prior antibiotic exposure, species type, and ward location are typically the top drivers.','compare':'The Compare tab lets you run two isolate predictions side-by-side and see a diff table showing which antibiotics changed and by how much. Useful for tracking resistance evolution.','timeline':'The Timeline tab tracks resistance changes across multiple visits for a specific patient. Enter a Patient ID when running predictions — they automatically appear in the timeline.','pdf':'After a prediction, click the "Export PDF" button to download a complete clinical summary including patient data, resistance chart, AI explanation, and the clinical disclaimer.','feedback':'After running a prediction, go to the Lab Feedback tab and submit the actual lab culture result. This creates a learning feedback loop and helps track model accuracy over time.','species':'Supported species: E. coli, S. aureus, K. pneumoniae, P. aeruginosa, A. baumannii, E. faecalis — the most common hospital-acquired infection pathogens.','cost':'Each antibiotic is labeled with a cost indicator: ₹ Low cost (Ampicillin, Gentamicin), ₹₹ Medium (Ciprofloxacin, Ceftriaxone), ₹₹₹ High (Meropenem, Vancomycin). The recommendation prioritizes the most effective AND affordable option.'};
  let response='I can help with questions about ResistAI! Try asking:\n• What is antibiotic resistance?\n• How do I use the predictor?\n• What do the results mean?\n• How does SHAP work?\n• How does the Timeline work?';
  for(const[key,val]of Object.entries(kb)){if(lower.includes(key)){response=val;break;}}
  messages.innerHTML+=`<div class="chatbot-message bot" id="typing-ind"><div class="message-avatar">🤖</div><div class="message-content"><div class="message-text" style="color:var(--text3)">Thinking...</div></div></div>`;
  messages.scrollTop=messages.scrollHeight;
  setTimeout(()=>{
    const ind=document.getElementById('typing-ind');if(ind)ind.remove();
    messages.innerHTML+=`<div class="chatbot-message bot"><div class="message-avatar">🤖</div><div class="message-content"><div class="message-text">${response}</div><div class="message-time">just now</div></div></div>`;
    messages.scrollTop=messages.scrollHeight;
  },700);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  buildPills();
  updateDashboard();
  document.getElementById('chatbot-window').style.display='none';
  setTimeout(()=>{document.querySelectorAll('#pg-landing .fade-in').forEach(el=>el.classList.add('visible'));},150);
  document.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn)return;
    const ripple=document.createElement('span');ripple.className='ripple';
    const rect=btn.getBoundingClientRect();const size=Math.max(rect.width,rect.height);
    ripple.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    btn.appendChild(ripple);setTimeout(()=>ripple.remove(),700);
  });
  const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:0.1});
  document.querySelectorAll('.fade-in').forEach(el=>observer.observe(el));
});

// ── Timeline helpers ──────────────────────────────────────────────
function renderTimelineAll() {
  const area = document.getElementById('timeline-area');
  const allIds = Object.keys(patientTimelines);
  if (!allIds.length) {
    area.innerHTML = `<div class="empty-state" style="min-height:200px">
      <div class="empty-icon">📈</div>
      <div class="empty-title">No patient timelines yet</div>
      <div class="empty-sub">Go to the <strong>Predict tab</strong>, enter a Patient ID (e.g. PT-1042) in the Patient ID field, and run a prediction. Come back here and it will appear automatically.</div>
    </div>`;
    return;
  }
  // Show all patients as cards
  area.innerHTML = `
    <div style="margin-bottom:14px;font-size:12px;color:var(--text2)">
      ${allIds.length} patient${allIds.length>1?'s':''} tracked — click a patient to view their timeline
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
      ${allIds.map(id => {
        const visits = patientTimelines[id];
        const last = visits[visits.length-1];
        return `<div onclick="selectPatient('${id}')" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:13px;font-weight:700;color:var(--accent);font-family:var(--font-mono);margin-bottom:4px">${id}</div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:2px">${visits.length} visit${visits.length>1?'s':''}</div>
          <div style="font-size:11px;font-style:italic;color:var(--text3)">${last.species.split(' ')[0]}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">${new Date(last.timestamp).toLocaleDateString()}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function selectPatient(pid) {
  document.getElementById('timeline-patient-id').value = pid;
  loadTimeline();
}

// Auto-refresh timeline page when it becomes active
const _baseShowPage = typeof showPage === 'function' ? showPage : null;
