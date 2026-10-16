const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
let calls=[],failed=false;
const load=Module._load;
Module._load=function(id,parent,...args){
 if(id==='next/navigation')return {redirect:path=>{throw {redirect:path};}};
 if(id==='@/lib/supabase/server')return {createClient:async()=>({auth:{exchangeCodeForSession:async code=>{calls.push({code});return {error:failed?{}:null};},verifyOtp:async value=>{calls.push(value);return {error:failed?{}:null};}}})};
 return load.call(this,id.startsWith('@/')?process.cwd()+'/'+id.slice(2):id,parent,...args);
};
require.extensions['.ts']=(m,name)=>m._compile(ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,name);
const {GET}=require('../app/auth/confirm/route.ts');
async function callback(query){try{await GET({url:'https://example.test/auth/confirm?'+query});assert.fail('Missing redirect');}catch(e){if(!e.redirect)throw e;return e.redirect;}}
(async()=>{
 assert.equal(await callback('code=test&next=https://evil.test'),'/protected');assert.deepEqual(calls.pop(),{code:'test'});
 assert.equal(await callback('token_hash=test&type=recovery'),'/auth/update-password');assert.deepEqual(calls.pop(),{token_hash:'test',type:'recovery'});
 assert.equal(await callback('code=test&next=/auth/update-password'),'/auth/update-password');calls=[];
 assert((await callback('token_hash=test&type=invalid')).startsWith('/auth/error?'));assert.equal(calls.length,0);
 assert((await callback('error=access_denied&code=test')).startsWith('/auth/error?'));assert.equal(calls.length,0);
 failed=true;assert((await callback('code=expired')).startsWith('/auth/error?'));
 console.log('PASS: confirmation/recovery callbacks, invalid tokens and external redirect rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
