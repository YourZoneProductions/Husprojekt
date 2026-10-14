const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {act} = React;
const Renderer = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = {location:{origin:'https://example.test'}};
let calls=[],refreshes=0,pushes=[],fail=false,session=null;
const client={
 rpc:async(name,args)=>{calls.push({name,args});return {data:fail?null:'house-new',error:fail?{}:null};},
 auth:{signUp:async(args)=>{calls.push(args);return {data:{session},error:fail?{}:null};}},
 from(table){return {insert(row){calls.push({table,row});return this;},select(){return this;},async single(){return {data:fail?null:{id:'new-floor'},error:fail?{}:null};}};},
};
const load=Module._load;
Module._load=function(id,parent,...args){
 if(id==='next/link')return {default:({children,...props})=>React.createElement('a',props,children)};
 if(id==='next/navigation')return {useRouter:()=>({refresh:()=>refreshes++,push:path=>pushes.push(path)}),redirect:path=>{throw {redirect:path};}};
 if(id==='@/lib/supabase/client')return {createClient:()=>client};
 if(id==='@/components/logout-button')return {LogoutButton:()=>null};
 return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);
};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const Setup=require('../components/husprojekt/HouseSetup.tsx').default;
const Structure=require('../components/husprojekt/StructureManager.tsx').default;
const {SignUpForm}=require('../components/sign-up-form.tsx');
const {authReturnPath}=require('../lib/auth-return.ts');
let r;
async function mount(Component,props={}){if(r)await act(async()=>r.unmount());await act(async()=>{r=Renderer.create(React.createElement(Component,props));});}
async function change(props,value){await act(async()=>r.root.findByProps(props).props.onChange({target:{value}}));}
async function submit(index=0){await act(async()=>r.root.findAllByType('form')[index].props.onSubmit({preventDefault(){}}));}
(async()=>{
 assert.equal(authReturnPath('https://evil.test'),'/protected');
 assert.equal(authReturnPath('//evil.test','recovery'),'/auth/update-password');
 assert.equal(authReturnPath('/auth/update-password'),'/auth/update-password');
 await mount(Setup);await submit();assert.equal(calls.length,0);
 await change({placeholder:'Fx Vores hus'},' Mit hus ');
 fail=true;await submit();assert.equal(refreshes,0);assert.equal(r.root.findByProps({placeholder:'Fx Vores hus'}).props.value,' Mit hus ');
 fail=false;await submit();await submit();assert.equal(calls.length,2);assert.equal(refreshes,1);assert.deepEqual(calls[1],{name:'create_house_with_floors',args:{house_name:'Mit hus',floor_names:['Stueetage']}});
 calls=[];
 await mount(Setup);await change({placeholder:'Fx Vores hus'},'Etagehus');
 for(const label of ['1. Sal','2. Sal','Kælder']) await act(async()=>r.root.findByProps({'aria-label':label}).props.onChange({target:{checked:true}}));
 await submit();assert.deepEqual(calls[0].args.floor_names,['Kælder','Stueetage','1. Sal','2. Sal']);
 calls=[];await mount(Setup);await change({placeholder:'Fx Vores hus'},'Custom');
 await act(async()=>r.root.findByProps({'aria-label':'Stueetage'}).props.onChange({target:{checked:false}}));
 await submit();assert.equal(calls.length,0);
 await act(async()=>r.root.findByProps({'aria-label':'Etage med eget navn'}).props.onChange({target:{checked:true}}));
 await change({placeholder:'Fx 3. Sal'},'Tagetage');await submit();assert.deepEqual(calls[0].args.floor_names,['Tagetage']);
 calls=[];let saved=[];
 await mount(Structure,{houseId:'own-house',floors:[{id:'own-floor',name:'Stue'}],onSaved:id=>saved.push(id)});
 await change({placeholder:'Fx Køkken'},'Køkken');await change({placeholder:'Fx 12,5'},'-1');await submit(1);assert.equal(calls.length,0);
 await change({placeholder:'Fx 12,5'},'12,5');fail=true;await submit(1);assert.equal(saved.length,0);assert.equal(r.root.findByProps({placeholder:'Fx Køkken'}).props.value,'Køkken');
 fail=false;await submit(1);assert.deepEqual(calls[1],{table:'rooms',row:{floor_id:'own-floor',name:'Køkken',area_m2:12.5}});assert.deepEqual(saved,['own-floor']);
 await change({placeholder:'Fx 1. sal'},'1. sal');await submit();assert.equal(calls[2].row.house_id,'own-house');
 calls=[];await mount(SignUpForm);
 await change({id:'email'},' user@example.test ');await change({id:'password'},'password123');await change({id:'repeat-password'},'different');await submit();assert.equal(calls.length,0);
 await change({id:'repeat-password'},'password123');await submit();assert.equal(pushes.at(-1),'/auth/sign-up-success');assert.equal(calls[0].email,'user@example.test');assert.equal(calls[0].options.emailRedirectTo,'https://example.test/auth/confirm?next=/protected');
 session={};await submit();assert.equal(pushes.at(-1),'/protected');
 await act(async()=>r.unmount());console.log('PASS: account validation, email confirmation routing, safe return paths, atomic setup/retry, floor/room scope and decimal area.');
})().catch(e=>{console.error(e);process.exitCode=1;});
