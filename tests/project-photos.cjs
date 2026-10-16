const assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{act}=React,Renderer=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let photos=[],calls=[],failUpload=false,failMetadata=false,failRead=false,count=0;const revoked=[];
URL.createObjectURL=()=>`blob:photo-${++count}`;URL.revokeObjectURL=value=>revoked.push(value);
const client={from(table){assert.equal(table,'project_photos');return {insert(row){this.row=row;calls.push({kind:'insert',row});return this;},select(){return this;},eq(_,id){this.id=id;return this;},order(){return this;},async single(){if(failMetadata)return {error:{}};const data={id:'photo-'+(photos.length+1),created_at:new Date().toISOString(),...this.row};photos.unshift(data);return {data,error:null};},then(resolve,reject){return Promise.resolve({data:photos.filter(photo=>photo.project_id===this.id),error:null}).then(resolve,reject);}};},storage:{from(bucket){assert.equal(bucket,'project-photos');return {async upload(path,file,options){calls.push({kind:'upload',path,options});assert.equal(options.upsert,false);return {error:failUpload?{}:null};},async remove(paths){calls.push({kind:'cleanup',paths});return {error:null};},async download(path){calls.push({kind:'download',path});return {data:failRead?null:new Blob(['image']),error:failRead?{}:null};}};}}};
const load=Module._load;Module._load=function(id,parent,...args){if(id==='@/lib/supabase/client')return {createClient:()=>client};return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);};
require.extensions['.ts']=require.extensions['.tsx']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,name);
const Photos=require('../components/husprojekt/ProjectPhotos.tsx').default;let r;
const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'before.png',{type:'image/png'});
const text=n=>typeof n==='string'?n:n.children?.map(text).join('')??'';
async function change(label,value){await act(async()=>r.root.findByProps({'aria-label':label}).props.onChange({target:{value}}));}
async function file(value){await act(async()=>r.root.findByProps({'aria-label':'Vælg projektbillede'}).props.onChange({target:{files:[value]}}));}
async function submit(){await act(async()=>r.root.findByType('form').props.onSubmit({preventDefault(){}}));}
(async()=>{
 await act(async()=>{r=Renderer.create(React.createElement(Photos,{projectId:'project-a',today:'2026-10-14'}));});
 await submit();assert.equal(calls.length,0);await file(new File(['bad'],'bad.png',{type:'image/png'}));await submit();assert.equal(calls.length,0);
 await file(png);await change('Billedets fase','after');await change('Billedbeskrivelse','Nye kabler');
 failUpload=true;await submit();assert.equal(photos.length,0);assert.equal(calls.filter(c=>c.kind==='cleanup').length,0);
 failUpload=false;failMetadata=true;await submit();assert.equal(calls.filter(c=>c.kind==='cleanup').length,1);assert.equal(photos.length,0);assert.equal(r.root.findByProps({'aria-label':'Billedbeskrivelse'}).props.value,'Nye kabler');
 failMetadata=false;await submit();assert.equal(photos.length,1);assert.equal(photos[0].stage,'after');assert.equal(photos[0].project_id,'project-a');assert.equal(photos[0].taken_on,'2026-10-14');assert(photos[0].file_path.startsWith('project-a/'));assert.equal(calls.filter(c=>c.kind==='cleanup').length,1);
 assert(r.root.findByType('img').props.src.startsWith('blob:'));await change('Filtrér billedarkiv','before');assert(text(r.root).includes('Ingen billeder'));assert.equal(revoked.length,1);
 failRead=true;await change('Filtrér billedarkiv','all');assert(text(r.root).includes('Billedet kunne ikke hentes'));failRead=false;await act(async()=>r.root.findAllByType('button').find(b=>text(b)==='Prøv billedet igen').props.onClick());assert(r.root.findByType('img'));
 await act(async()=>r.update(React.createElement(Photos,{key:'project-b',projectId:'project-b',today:'2026-10-14'})));assert(text(r.root).includes('Ingen billeder'));assert.equal(r.root.findAllByType('img').length,0);assert(revoked.length>=2);
 await act(async()=>r.unmount());console.log('PASS: private project photos, validation, failed writes/cleanup, phase filter, project isolation, retry and blob cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
