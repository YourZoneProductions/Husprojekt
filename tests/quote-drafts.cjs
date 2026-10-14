const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{act}=React,Renderer=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let saved=null,calls=[],fail=false,loadFail=false;const revoked=[];URL.createObjectURL=()=> 'blob:attachment';URL.revokeObjectURL=value=>revoked.push(value);
const photo={id:'photo-1',project_id:'p1',stage:'before',taken_on:'2026-10-14',description:'El før',file_path:'p1/image.png'};
const plan={id:'plan-1',floor_id:'f1',file_path:'f1/plan.png',created_at:'2026-10-14T12:00:00Z',floors:{name:'Stueetage',house_id:'h1'}};
const client={from(table){return {select(){return this;},eq(key,value){calls.push({table,key,value});return this;},order(){return this;},maybeSingle(){return Promise.resolve({data:saved,error:loadFail?{}:null});},async upsert(row,options){calls.push({write:row,options});if(fail)return {error:{}};saved=row;return {error:null};},then(resolve,reject){return Promise.resolve({data:table==='project_photos'?[photo]:[plan],error:loadFail?{}:null}).then(resolve,reject);}};},storage:{from(bucket){return {async download(path){calls.push({download:path,bucket});return {data:new Blob(['image']),error:null};}};}}};
const load=Module._load;Module._load=function(id,parent,...args){if(id==='@/lib/supabase/client')return {createClient:()=>client};return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const Draft=require('../components/husprojekt/QuoteDraft.tsx').default;
const project={id:'p1',name:'Hemmelig projektoverskrift',budget:123456,subtasks:[{id:'s1',name:'El',description:null,due_date:'2026-11-01'}]};let r;
const text=n=>typeof n==='string'?n:n.children?.map(text).join('')??'';
async function mount(){await act(async()=>{r=Renderer.create(React.createElement(Draft,{project,taskId:'s1',houseId:'h1',onClose(){}}));});}
async function button(label){await act(async()=>r.root.findAllByType('button').find(b=>text(b)===label).props.onClick());}
async function change(label,value){await act(async()=>r.root.findByProps({'aria-label':label}).props.onChange({target:{value}}));}
(async()=>{
 await mount();await button('Gennemse tilbudspakke');assert(text(r.root).includes('Skriv en titel'));assert.equal(saved,null);
 await change('Tilbudsbeskrivelse','Skift installationer');await act(async()=>r.root.findByProps({'aria-label':'Vedhæft billede photo-1'}).props.onChange({target:{checked:true}}));await change('Vedhæft plantegning','plan-1');
 await button('Gennemse tilbudspakke');assert.equal(r.root.findAllByType('img').length,2);assert(!text(r.root).includes('123456'));assert(!text(r.root).includes('Hemmelig projektoverskrift'));
 fail=true;await button('Gem privat kladde');assert(text(r.root).includes('kunne ikke gemmes'));assert.equal(saved,null);fail=false;await button('Gem privat kladde');assert.deepEqual(saved.photo_ids,['photo-1']);assert.equal(saved.floor_plan_id,'plan-1');assert.equal(saved.subtask_id,'s1');assert.equal(saved.project_id,'p1');assert(!('budget' in saved));assert(text(r.root).includes('Ingen har fået adgang'));
 await act(async()=>r.unmount());assert.equal(revoked.length,2);await mount();assert.equal(r.root.findByProps({'aria-label':'Tilbudsbeskrivelse'}).props.value,'Skift installationer');await act(async()=>r.unmount());
 loadFail=true;await mount();assert(text(r.root).includes('kunne ikke hentes'));assert.equal(r.root.findByType('fieldset').props.disabled,true);await act(async()=>r.unmount());
 console.log('PASS: private quote draft validation, selected attachments only, no budget, preview/download cleanup, save/reload, failed writes and blocked failed loads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
