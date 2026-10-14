const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{act}=React,Renderer=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let calls=[],shares=[],saveOk=true,fail=false;const load=Module._load;
const client={from(table){assert.equal(table,'quote_shares');return {select(){return this;},eq(){return this;},order(){return this;},then(a,b){return Promise.resolve({data:shares,error:null}).then(a,b);}};},async rpc(name,args){calls.push({name,args});if(fail)return {error:{}};if(name==='create_quote_share'){shares.push({id:'share1',recipient_email:args.recipient,created_at:'2026-10-14T12:00:00Z',revoked_at:null});return {data:'share1',error:null};}shares=shares.map(s=>({...s,revoked_at:'2026-10-14T12:00:00Z'}));return {error:null};}};
Module._load=function(id,parent,...args){if(id==='@/lib/supabase/client')return {createClient:()=>client};return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const Access=require('../components/husprojekt/QuoteAccess.tsx').default;const text=n=>typeof n==='string'?n:n.children?.map(text).join('')??'';let r;
async function button(label){await act(async()=>r.root.findAllByType('button').find(b=>text(b)===label).props.onClick());}
(async()=>{
 await act(async()=>{r=Renderer.create(React.createElement(Access,{taskId:'s1',onSave:async()=>saveOk}));});
 await button('Gem og giv adgang til valgt modtager');assert.equal(calls.length,0);
 await act(async()=>r.root.findByProps({'aria-label':'Tilbudsmodtagerens e-mail'}).props.onChange({target:{value:' Person@Example.test '}}));
 saveOk=false;await button('Gem og giv adgang til valgt modtager');assert.equal(calls.length,0);
 saveOk=true;fail=true;await button('Gem og giv adgang til valgt modtager');assert(text(r.root).includes('Adgang kunne ikke oprettes'));fail=false;
 await button('Gem og giv adgang til valgt modtager');assert.deepEqual(calls.at(-1),{name:'create_quote_share',args:{task_id:'s1',recipient:'person@example.test'}});assert(text(r.root).includes('Ingen mail er sendt'));
 await button('Tilbagekald adgang');assert.equal(calls.at(-1).name,'revoke_quote_share');assert(text(r.root).includes('Tilbagekaldt'));assert.equal(r.root.findAllByType('button').filter(b=>text(b)==='Tilbagekald adgang').length,0);
 await act(async()=>r.unmount());console.log('PASS: recipient validation, save-before-share, failed grants, normalized recipient, listing and revocation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
