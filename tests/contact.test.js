import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../contact.js',import.meta.url),'utf8');
function browser(sendResponse){
 const button={},status={},fields=Object.fromEntries(['name','phone','vehicle','issue','website'].map(k=>['wt-'+k,{value:k==='website'?'':'synthetic '+k}]));
 fields['wt-consent']={checked:true};let submit,options,resets=0,clears=0;const calls=[];
 const form={querySelector:()=>button,reportValidity:()=>true,addEventListener:(_,fn)=>submit=fn,reset:()=>clears++};
 const document={getElementById:id=>id==='wt-contact-form'?form:id==='wt-status'?status:fields[id],createElement:()=>({}),head:{appendChild(){}}};
 const window={turnstile:{render:(_,o)=>{options=o;return 0;},reset:()=>resets++}};
 vm.runInNewContext(source,{document,window,AbortSignal,fetch:async(url,opts)=>{calls.push({url,opts});return url==='/api/form-config'?{ok:true,json:async()=>({siteKey:'public'})}:sendResponse();}});
 return {window,button,status,calls,submit:()=>submit({preventDefault(){}}),get options(){return options;},get resets(){return resets;},get clears(){return clears;}};
}
test('frontend sends JSON once, confirms only after 201, clears form and resets captcha',async()=>{
 const b=browser(async()=>({status:201,json:async()=>({ok:true})}));assert.equal(b.button.disabled,true);
 await b.window.wtTurnstileReady();b.options.callback('token');await b.submit();
 assert.equal(b.calls.length,2);assert.equal(b.calls[1].url,'/api/zgloszenie');const payload=JSON.parse(b.calls[1].opts.body);assert.equal(payload.consent,true);assert.equal(payload.turnstileToken,'token');
 assert.match(b.status.textContent,/zostało przyjęte/);assert.equal(b.clears,1);assert.equal(b.resets,1);assert.equal(b.button.disabled,true);
});
test('frontend preserves input and does not retry failed writes',async()=>{
 const b=browser(async()=>{throw new Error('timeout');});await b.window.wtTurnstileReady();b.options.callback('token');await b.submit();assert.equal(b.clears,0);assert.equal(b.calls.length,2);assert.match(b.status.textContent,/uniknąć duplikatu/);
});
test('frontend expires token and blocks submission without challenge',async()=>{
 const b=browser(()=>assert.fail('write'));await b.window.wtTurnstileReady();b.options.callback('token');b.options['expired-callback']();await b.submit();assert.equal(b.calls.length,1);assert.equal(b.button.disabled,true);
});
test('frontend rejects double click while request is in flight',async()=>{
 let finish;const b=browser(()=>new Promise(resolve=>finish=resolve));await b.window.wtTurnstileReady();b.options.callback('token');const pending=b.submit();await b.submit();assert.equal(b.calls.length,2);finish({status:201,json:async()=>({ok:true})});await pending;
});
