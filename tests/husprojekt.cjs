const {createRequire}=require('node:module'), fs=require('fs'),Module=require('module'),assert=require('node:assert/strict');
const req=createRequire(process.cwd()+'/package.json'),ts=req('typescript'),React=req('react'),{act}=React,Renderer=req('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let fail=false;const requests=[];let items={};
const client={from(table){return {table,mode:'read',body:{},id:null,update(body){this.mode='update';this.body=body;return this},insert(body){this.mode='insert';this.body=body;return this},delete(){this.mode='delete';return this},eq(key,id){this.id=id;return this},order(){return this},select(fields){this.fields=fields;return this},single(){return this.execute(true)},then(a,b){return this.execute(false).then(a,b)},async execute(single){requests.push({table:this.table,mode:this.mode,body:this.body});if(this.table==='floor_plans'||this.table==='project_photos')return {data:[],error:null};if(fail)return {data:null,error:{message:'Test error'}};if(this.mode==='insert'){const row={id:'s3',description:null,status:'todo',budget:0,actual_cost:0,sort_order:1,due_date:null,...this.body};items.s3=row;return{data:row,error:null}};if(this.mode==='delete'){delete items[this.id];return {data:[{id:this.id}],error:null}};const row={...items[this.id],...this.body};items[this.id]=row;return {data:single?(this.fields ? Object.fromEntries(this.fields.split(",").map(key=>[key,row[key]])) : row):[row],error:null}}}}};
const load=Module._load;Module._load=function(id,parent,...args){if(id==='next/navigation')return {useRouter:()=>({refresh(){},push(){}})};if(id==='@/lib/supabase/client')return {createClient:()=>client};return load.call(this,id.startsWith('@/') ? process.cwd()+'/'+id.slice(2) : id,parent,...args)};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const House=req('./components/husprojekt/HouseApp.tsx').default;
const sub={id:'s1',name:'Maling',description:null,status:'todo',budget:1000,actual_cost:250,sort_order:0,due_date:'2020-01-01'};
const p1={id:'p1',name:'Nyt køkken',status:'active',budget:10000,actual_cost:99999,expected_start:null,expected_end:null,project_rooms:[{room_id:'r1'},{room_id:'r2'}],subtasks:[sub]};
const p2={...p1,id:'p2',name:'Afsluttet projekt',status:'completed',budget:2000,project_rooms:[{room_id:'r1'}],subtasks:[{...sub,id:'s2',status:'completed',actual_cost:500}]};
items={s1:sub,s2:p2.subtasks[0],p1,p2};
let props={houseId:'h1',floors:[{id:'f1',name:'Stueetage',rooms:[{id:'r1',name:'Køkken',area_m2:20},{id:'r2',name:'Gang',area_m2:5}]}],projects:[p1,p2]},renderer;
function text(n){return typeof n==='string'||typeof n==='number'?String(n):n.children?.map(text).join('')??''}
function button(name){return renderer.root.findAllByType('button').find(n=>text(n).trim()===name)}
async function click(name){assert(button(name),'Missing button '+name);await act(async()=>button(name).props.onClick())}
async function starts(name){await act(async()=>renderer.root.findAllByType('button').find(n=>text(n).startsWith(name)).props.onClick())}
function card(label,value){const n=renderer.root.findAll(n=>typeof n.type==='function'&&n.type.name==='StatCard'&&n.props.title===label)[0];assert.equal(n?.props.value,value,label)}
function includes(value){assert(text(renderer.root).includes(value),'Missing text '+value)}
async function field(type,index,value){await act(async()=>renderer.root.findAllByType('input').filter(n=>n.props.type===type)[index].props.onChange({target:{value}}))}
const projectCard=()=>renderer.root.findAllByProps({className:'cursor-pointer rounded-xl border border-slate-200 p-5 hover:bg-slate-50'})[0];
(async()=>{
await act(async()=>{renderer=Renderer.create(React.createElement(House,props))});
card('Aktive projekter','1');card('Budget','12.000 kr.');card('Forbrugt','750 kr.');
await click('Skjul rum og områder');assert.equal(button('Vis rum og områder').props['aria-expanded'],false);await click('Vis rum og områder');
await starts('Nyt køkken');card('Forbrugt','250 kr.');includes('1 overskredet delopgave');
await click('Rediger');await field('number',1,'1800');fail=true;await click('Gem');card('Forbrugt','250 kr.');assert.equal(renderer.root.findAllByProps({role:'alert'}).length,1);fail=false;await click('Gem');card('Forbrugt','1.800 kr.');
await click('Overblik');card('Forbrugt','2.300 kr.');await starts('Køkken');card('Forbrugt','2.300 kr.');assert.equal(button('Skjul rum og områder').props['aria-expanded'],true);
await act(async()=>projectCard().props.onClick());await act(async()=>renderer.root.findByProps({type:'checkbox'}).props.onChange());includes('1 af 1 delopgaver færdige');
await click('+ Ny delopgave');await act(async()=>renderer.root.findByProps({placeholder:'Navn på delopgave'}).props.onChange({target:{value:'Gulv'}}));await click('Opret delopgave');includes('Gulv');
await click('← Tilbage til Køkken');await act(async()=>projectCard().props.onClick());includes('Gulv');includes('1 af 2 delopgaver færdige');
await act(async()=>renderer.root.findAllByType('button').find(n=>text(n)==='Slet').props.onClick());fail=true;await click('Ja, slet');includes('Maling');fail=false;await click('Ja, slet');assert(!text(renderer.root).includes('Maling'));card('Forbrugt','0 kr.');
await click('Rediger projekt');await field('number',0,'-1');const before=requests.length;await act(async()=>renderer.root.findByType(req('./components/husprojekt/ProjectEditor.tsx').default).findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(requests.length,before);includes('Budgettet skal være');
await field('number',0,'12000');await act(async()=>renderer.root.findByType(req('./components/husprojekt/ProjectEditor.tsx').default).findByType('select').props.onChange({target:{value:'completed'}}));await act(async()=>renderer.root.findAllByType('input').find(n=>n.props.value==='Nyt køkken').props.onChange({target:{value:'Køkken færdigt'}}));
fail=true;await act(async()=>renderer.root.findByType(req('./components/husprojekt/ProjectEditor.tsx').default).findByType('form').props.onSubmit({preventDefault(){}}));includes('Projektet kunne ikke gemmes');fail=false;await act(async()=>renderer.root.findByType(req('./components/husprojekt/ProjectEditor.tsx').default).findByType('form').props.onSubmit({preventDefault(){}}));includes('Køkken færdigt');includes('Status: Afsluttet');card('Budget','12.000 kr.');
await click('Overblik');card('Aktive projekter','0');card('Budget','14.000 kr.');card('Forbrugt','500 kr.');
props={...props,projects:[p1,p2,{...p1,id:'p3',name:'Nyt serverprojekt',budget:3000,subtasks:[]}]};await act(async()=>renderer.update(React.createElement(House,props)));includes('Nyt serverprojekt');card('Aktive projekter','2');card('Budget','15.000 kr.');
await act(async()=>renderer.unmount());console.log('PASS: totals; persistent mobile menu; subtask edit/create/status/delete and failed writes; project validation/edit/status and failed save; overview and server refresh.');
})().catch(e=>{console.error(e);process.exitCode=1});
