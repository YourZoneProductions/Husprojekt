const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{act}=React,Renderer=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let rows=[],calls=[],fail=false,lost=false,loadFail=false;
const client={from(table){assert.equal(table,'quote_responses');return {select(){return this;},eq(key,value){this[key]=value;return this;},order(){return this;},insert(row){this.row=row;calls.push(row);return this;},async single(){if(!this.row)return {data:rows.find(row=>row.id===this.id),error:null};if(fail)return {data:null,error:{}};if(rows.some(row=>row.id===this.row.id))return {data:null,error:{code:'23505'}};const data={...this.row,created_at:'2026-10-16T10:00:00Z'};rows.unshift(data);return lost?{data:null,error:{}}:{data,error:null};},then(resolve,reject){return Promise.resolve({data:rows.filter(row=>row.share_id===this.share_id),error:loadFail?{}:null}).then(resolve,reject);}};}};
const load=Module._load;Module._load=function(id,parent,...args){if(id==='@/lib/supabase/client')return {createClient:()=>client};return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const {responseValues}=require('../lib/quote-response.ts');const Responses=require('../components/husprojekt/QuoteResponses.tsx').default;
const valid={amount:'12500,50',priceType:'fixed',scope:'Elinstallation',reservations:'Eksisterende tavle',start:'2026-11-01',end:'2026-11-02'};
let r;const text=n=>typeof n==='string'?n:n.children?.map(text).join('')??'';
async function mount(canRespond=true,shareId='share1'){await act(async()=>{r=Renderer.create(React.createElement(Responses,{shareId,canRespond}));});}
async function click(label){await act(async()=>r.root.findAllByType('button').find(b=>text(b)===label).props.onClick());}
async function change(label,value){await act(async()=>r.root.findByProps({'aria-label':label}).props.onChange({target:{value}}));}
async function fill(){await change('Tilbudspris i kroner','12500,50');await change('Tilbuddets omfang','Elinstallation');}
(async()=>{
 assert.equal(responseValues(valid).amount_dkk,12500.5);
 for(const amount of ['-1','1.234,56','NaN','12.345','1e3',''])assert.throws(()=>responseValues({...valid,amount}));
 assert.throws(()=>responseValues({...valid,end:'2026-10-01'}));assert.throws(()=>responseValues({...valid,start:'2026-02-30'}));assert.throws(()=>responseValues({...valid,scope:''}));
 await mount();await click('Gennemse dit tilbud');assert.equal(calls.length,0);await fill();await click('Gennemse dit tilbud');
 fail=true;await click('Gem tilbud til ejeren');assert(text(r.root).includes('kunne ikke gemmes'));fail=false;lost=true;await click('Gem tilbud til ejeren');assert.equal(rows.length,1);const retryId=calls.at(-1).id;lost=false;await click('Gem tilbud til ejeren');assert.equal(calls.at(-1).id,retryId);assert.equal(rows.length,1);assert(text(r.root).includes('budgettet er uændret'));
 await fill();await click('Gennemse dit tilbud');await click('Gem tilbud til ejeren');assert.equal(rows.length,2);assert(text(r.root).includes('Tidligere tilbud'));assert(!('submitted_by' in calls.at(-1)));assert(!('created_at' in calls.at(-1)));
 await act(async()=>r.unmount());await mount(false);assert.equal(r.root.findAllByType('input').length,0);assert(text(r.root).includes('Modtagne tilbud'));await act(async()=>r.unmount());
 loadFail=true;await mount();assert.equal(r.root.findByType('fieldset').props.disabled,true);await act(async()=>r.unmount());console.log('PASS: response validation, comma prices, dates, preview, failed writes, lost-response idempotence, history, owner read-only and failed loads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
