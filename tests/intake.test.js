import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/zgloszenie.js';
import config from '../api/form-config.js';
const originalEnv={...process.env};
const originalFetch=globalThis.fetch;
const body={name:'Test integracji',phone:'000000000',vehicle:'Pojazd testowy',issue:'Syntetyczny test bez danych klienta',consent:true,turnstileToken:'synthetic-token',website:''};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
const request=(b=body)=>({method:'POST',headers:{origin:'https://warsztatech.vercel.app','content-type':'application/json'},body:{...b}});
function setup(){process.env={...originalEnv,VERCEL_ENV:'production',NOTION_API_KEY:'synthetic-notion',TURNSTILE_SECRET_KEY:'synthetic-turnstile',TURNSTILE_SITE_KEY:'public-widget'};}
test.afterEach(()=>{process.env={...originalEnv};globalThis.fetch=originalFetch;});
test('writes once using verified existing data source and exact schema',async()=>{
 setup();const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({success:true,action:'zgloszenie',hostname:'warsztatech.vercel.app'})};};
 const res=response();await handler(request(),res);assert.equal(res.code,201);assert.equal(calls.length,2);
 const payload=JSON.parse(calls[1].options.body);assert.deepEqual(payload.parent,{type:'data_source_id',data_source_id:'ffed7123-d3cc-46ab-8a2c-794e5d20d86c'});
 assert.equal(payload.properties.Status.status.name,'Nowe');assert.equal(payload.properties['Źródło'].select.name,'WWW');
 assert.equal(calls[1].options.headers['Notion-Version'],'2025-09-03');assert.deepEqual(res.body,{ok:true});
});
for(const [label,modify,code] of [
 ['GET',r=>r.method='GET',405],['foreign origin',r=>r.headers.origin='https://evil.example',403],
 ['missing origin',r=>delete r.headers.origin,403],['invalid content type',r=>r.headers['content-type']='text/plain',415],
 ['string consent',r=>r.body.consent='true',400],['false consent',r=>r.body.consent=false,400],
 ['empty name',r=>r.body.name=' ',400],['oversize name',r=>r.body.name='x'.repeat(81),400],
 ['phone with too few digits',r=>r.body.phone='( ) --- 1',400],['missing vehicle',r=>delete r.body.vehicle,400],
 ['short issue',r=>r.body.issue='short',400],['oversize token',r=>r.body.turnstileToken='x'.repeat(2049),400],
 ['array body',r=>r.body=[],400],['large body',r=>r.body.extra='x'.repeat(10001),413],
 ['honeypot',r=>r.body.website='spam',200]
]) test(label+' never contacts external services',async()=>{setup();globalThis.fetch=()=>{assert.fail('unexpected network');};const req=request();modify(req);const res=response();await handler(req,res);assert.equal(res.code,code);});
for(const verdict of [{success:false},{success:true,action:'wrong',hostname:'warsztatech.vercel.app'},{success:true,action:'zgloszenie',hostname:'evil.example'}]) test('invalid captcha verdict '+JSON.stringify(verdict),async()=>{
 setup();let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>verdict};};const res=response();await handler(request(),res);assert.equal(res.code,400);assert.equal(calls,1);
});
test('missing secret fails closed',async()=>{setup();delete process.env.NOTION_API_KEY;const res=response();await handler(request(),res);assert.equal(res.code,503);});
test('preview allows only exact deployment domains',async()=>{setup();process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='preview-drsn1.vercel.app';const res=response();await handler(request(),res);assert.equal(res.code,403);});
test('official Turnstile test pair is accepted only in preview',async()=>{
 setup();process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='preview-drsn1.vercel.app';process.env.TURNSTILE_SITE_KEY='1x00000000000000000000AA';process.env.TURNSTILE_SECRET_KEY='1x0000000000000000000000000000000AA';
 const req=request();req.headers.origin='https://preview-drsn1.vercel.app';let calls=0;globalThis.fetch=async()=>++calls===1?{ok:true,json:async()=>({success:true,action:'test',hostname:'localhost'})}:{ok:true};
 const res=response();await handler(req,res);assert.equal(res.code,201);assert.equal(calls,2);
});
test('official Turnstile test pair never relaxes production validation',async()=>{
 setup();process.env.TURNSTILE_SITE_KEY='1x00000000000000000000AA';process.env.TURNSTILE_SECRET_KEY='1x0000000000000000000000000000000AA';
 let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({success:true,action:'test',hostname:'localhost'})};};
 const res=response();await handler(request(),res);assert.equal(res.code,503);assert.equal(calls,0);
});
test('Notion failure is not retried or exposed',async()=>{setup();let calls=0;globalThis.fetch=async()=>++calls===1?{ok:true,json:async()=>({success:true,action:'zgloszenie',hostname:'warsztatech.vercel.app'})}:{ok:false,status:403};const res=response();await handler(request(),res);assert.equal(res.code,502);assert.equal(calls,2);assert.deepEqual(res.body,{error:'intake_unavailable'});});
test('network exception is not retried or exposed',async()=>{setup();let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('private detail');};const res=response();await handler(request(),res);assert.equal(res.code,502);assert.equal(calls,1);assert.ok(!JSON.stringify(res.body).includes('private detail'));});
test('public configuration exposes only sitekey',()=>{setup();const res=response();config({method:'GET'},res);assert.equal(res.code,200);assert.deepEqual(res.body,{siteKey:'public-widget'});});
test('public configuration disabled until all keys exist',()=>{setup();delete process.env.NOTION_API_KEY;const res=response();config({method:'GET'},res);assert.equal(res.code,503);assert.ok(!('siteKey' in res.body));});
