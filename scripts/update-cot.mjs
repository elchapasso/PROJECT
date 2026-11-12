#!/usr/bin/env node
// Télécharge les rapports COT de la CFTC (huile de soja et graines de soja) et écrit un fichier JSON par format.
// Usage : node scripts/update-cot.mjs [dossier de sortie]   (par défaut : docs/terminal/cot)
// Un fichier n’est réécrit que si les données ont changé, pour éviter des commits vides.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {cotDatasets,socrataUrl,buildDataset,validateDataset,serializeDataset,sameData,addDaysISO} from '../docs/terminal/cot-model.mjs';

const outDir=process.argv[2]||'docs/terminal/cot';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function getJSON(url){
  let lastError;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'olea-terminal-cot/1.0 (+https://github.com/elchapasso/PROJECT)'},signal:AbortSignal.timeout(60000)});
      if(!response.ok)throw new Error('HTTP '+response.status+' '+(await response.text()).slice(0,300));
      return await response.json();
    }catch(error){
      lastError=error;
      console.warn('Tentative '+attempt+' échouée : '+error.message);
      await sleep(2000*2**attempt);
    }
  }
  throw lastError;
}

const generatedAt=new Date().toISOString().replace(/\.\d+Z$/,'Z');
const built=[];
let failed=false;
for(const key of Object.keys(cotDatasets)){
  const rows=await getJSON(socrataUrl(key));
  if(!Array.isArray(rows)||!rows.length)throw new Error(key+' : réponse vide de la CFTC.');
  const dataset=buildDataset(key,rows,generatedAt);
  const {errors,warnings}=validateDataset(dataset);
  const counts=Object.entries(dataset.markets).map(([market,m])=>market+' '+m.rows.length+' rapports ('+m.rows[0][0]+' → '+m.rows.at(-1)[0]+')').join(' · ');
  console.log(key+' · '+cotDatasets[key].id+' · '+rows.length+' lignes API · '+counts);
  for(const w of warnings)console.warn('  avertissement · '+w);
  for(const e of errors)console.error('  erreur · '+e);
  if(errors.length){
    failed=true;
    console.error('  colonnes reçues : '+Object.keys(rows.at(-1)).join(', '));
  }
  built.push(dataset);
}
if(failed){
  console.error('Données rejetées : aucun fichier n’a été modifié.');
  process.exit(1);
}

// Contrôle du complément direct utilisé par le navigateur : requête incrémentale et accès depuis le site (CORS).
try{
  const probe=built[0];
  const after=addDaysISO(probe.latest,-14);
  const response=await fetch(socrataUrl(probe.dataset,{after}),{headers:{Accept:'application/json',Origin:'https://elchapasso.github.io'},signal:AbortSignal.timeout(30000)});
  const rows=response.ok?await response.json():[];
  const dates=[...new Set(rows.map(r=>String(r.report_date_as_yyyy_mm_dd).slice(0,10)))].sort();
  const cors=response.headers.get('access-control-allow-origin');
  const ok=response.ok&&dates.length>0&&dates[0]>after&&(cors==='*'||cors==='https://elchapasso.github.io');
  console[ok?'log':'warn']('Complément navigateur · HTTP '+response.status+' · '+rows.length+' lignes après le '+after+' ('+dates.join(', ')+') · CORS '+(cors??'absent')+(ok?' · OK':' · À VÉRIFIER'));
}catch(error){console.warn('Complément navigateur · contrôle impossible : '+error.message);}

await mkdir(outDir,{recursive:true});
let changed=0;
for(const dataset of built){
  const file=path.join(outDir,dataset.dataset+'.json');
  let previous=null;
  try{previous=JSON.parse(await readFile(file,'utf8'));}catch{}
  if(sameData(previous,dataset)){console.log(dataset.dataset+' : inchangé (dernier rapport '+dataset.latest+').');continue;}
  await writeFile(file,serializeDataset(dataset));
  changed++;
  console.log(dataset.dataset+' : écrit, dernier rapport '+dataset.latest+(previous?.latest?' (précédent '+previous.latest+')':'')+'.');
}
console.log(changed?changed+' fichier(s) mis à jour.':'Aucun nouveau rapport.');
