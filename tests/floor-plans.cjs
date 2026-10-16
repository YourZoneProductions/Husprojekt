const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/package.json');
const ts = req('typescript');
const React = req('react');
const { act } = React;
const Renderer = req('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const png = new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])], 'plan.png', {type:'image/png'});
let plans = [], calls = [], uploadFails = false, metadataFails = false, downloadFails = false;
let counter = 0;
const revoked = [];
URL.createObjectURL = () => 'blob:plan-' + (++counter);
URL.revokeObjectURL = url => revoked.push(url);
const client = {
  from(table) {
    assert.equal(table, 'floor_plans', 'Only floor-plan metadata may be written');
    return {
      insert(row) { this.row = row; calls.push({kind:'metadata',row}); return this; },
      select() { return this; },
      eq(_, floorId) { this.floorId = floorId; return this; },
      order() { return this; },
      async single() {
        if (metadataFails) return {data:null,error:{message:'metadata unavailable'}};
        const row = {id: 'plan-' + (plans.length+1), created_at: new Date().toISOString(), ...this.row};
        plans.unshift(row);
        return {data: row, error:null};
      },
      then(resolve, reject) { return Promise.resolve({data:plans.filter(p=>p.floor_id===this.floorId),error:null}).then(resolve,reject); },
    };
  },
  storage: { from(bucket) {
    assert.equal(bucket, 'floor-plans');
    return {
      async upload(path, file, options) {
        calls.push({kind:'upload',path,options});
        assert.equal(options.upsert, false, 'Existing versions must never be overwritten');
        return {data:uploadFails?null:{path},error:uploadFails?{message:'unavailable'}:null};
      },
      async remove(paths) { calls.push({kind:'cleanup',paths}); return {data:[],error:null}; },
      async download(path) { calls.push({kind:'download',path}); return {data:downloadFails?null:new Blob(['image']),error:downloadFails?{message:'unavailable'}:null}; },
    };
  }},
};
const originalLoad = Module._load;
Module._load = function(id,parent,...args) {
  if(id === '@/lib/supabase/client') return {createClient:()=>client};
  return originalLoad.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);
};
require.extensions['.ts'] = require.extensions['.tsx'] = (m,name) => m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},
}).outputText,name);
const {validateFloorPlanFile,MAX_FLOOR_PLAN_BYTES} = req('./lib/floor-plan-files.ts');
const Panel = req('./components/husprojekt/FloorPlanPanel.tsx').default;
let renderer;
function text(node) {return typeof node==='string'?node:node.children?.map(text).join('')??'';}
function has(s) {assert(text(renderer.root).includes(s), 'Expected '+s);}
async function upload(file=png) {await act(async()=>renderer.root.findByProps({'aria-label':'Upload plantegning'}).props.onChange({target:{files:[file]}}));}
async function button(label) {await act(async()=>renderer.root.findAllByType('button').find(b=>text(b)===label || b.props['aria-label']===label).props.onClick());}
(async()=>{
  assert.equal(await validateFloorPlanFile(png),'png');
  await assert.rejects(()=>validateFloorPlanFile(new File([], 'empty.png',{type:'image/png'})),/tom/);
  await assert.rejects(()=>validateFloorPlanFile(new File(['not a png'],'fake.png',{type:'image/png'})),/indhold/);
  await assert.rejects(()=>validateFloorPlanFile(new File(['<svg/>'],'plan.svg',{type:'image/svg+xml'})),/PNG/);
  await assert.rejects(()=>validateFloorPlanFile(new File([new Uint8Array(MAX_FLOOR_PLAN_BYTES+1)],'large.png',{type:'image/png'})),/10 MB/);
  const floors=[{id:'floor-a',name:'Stueetage'},{id:'floor-b',name:'Kælder'}];
  await act(async()=>{renderer=Renderer.create(React.createElement(Panel,{floors}));});
  has('Ingen plantegning');
  await upload(new File(['bad'],'fake.png',{type:'image/png'}));
  assert.equal(calls.filter(c=>c.kind==='upload').length,0,'Invalid files must never reach Storage');
  uploadFails=true;await upload();has('Billedet kunne ikke uploades');assert.equal(plans.length,0);
  uploadFails=false;metadataFails=true;await upload();has('Uploaden kunne ikke gemmes');
  assert.equal(calls.filter(c=>c.kind==='cleanup').length,1,'Failed metadata must clean up only its new object');
  metadataFails=false;await upload();has('Plantegningen er gemt');has('100 %');
  assert.equal(plans.length,1);assert(plans[0].file_path.startsWith('floor-a/'));
  await button('Zoom ind');has('125 %');await button('Tilpas bredde');has('100 %');
  await upload();assert.equal(plans.length,2);assert.notEqual(plans[0].file_path,plans[1].file_path);
  assert.equal(renderer.root.findAllByType('select')[1].findAllByType('option').length,2);
  const previous=plans[1];await act(async()=>renderer.root.findAllByType('select')[1].props.onChange({target:{value:previous.id}}));
  assert.equal(calls.filter(c=>c.kind==='download').at(-1).path,previous.file_path);assert(revoked.length>0);
  await act(async()=>renderer.root.findAllByType('select')[0].props.onChange({target:{value:'floor-b'}}));
  has('Ingen plantegning');await upload();assert.equal(plans.length,3);assert.equal(plans[0].floor_id,'floor-b');
  await act(async()=>renderer.root.findAllByType('select')[0].props.onChange({target:{value:'floor-a'}}));
  assert.equal(renderer.root.findAllByType('select')[1].findAllByType('option').length,2);
  downloadFails=true;await act(async()=>renderer.root.findAllByType('select')[1].props.onChange({target:{value:previous.id}}));
  has('Tegningen kunne ikke hentes');downloadFails=false;await button('Prøv igen');has('100 %');
  has('Automatisk rumgenkendelse er ikke tilkoblet endnu');
  await act(async()=>renderer.unmount());
  console.log('PASS: file signatures, MIME/size limits, upload failures, cleanup, private downloads, per-floor history, zoom, retry and blob cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
