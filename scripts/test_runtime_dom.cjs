/* Optional DOM integration smoke test. Browser APIs and network are mocked;
   this checks runtime behavior, not visual layout, media decoding, or CSP. */
const {JSDOM,requestInterceptor,VirtualConsole}=require('jsdom');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const project=path.resolve(__dirname,'..');
const fixtures=JSON.parse(execFileSync(process.env.PYTHON || 'python3',[path.join(__dirname,'render_theme_fixtures.py')],{cwd:project,encoding:'utf8'}));
const resources={interceptors:[requestInterceptor(request=>{
 const u=new URL(request.url);
 if(u.pathname.startsWith('/static/')){
  const file=path.join(project,'static',decodeURIComponent(u.pathname.slice(8)));
  try{return new Response(fs.readFileSync(file),{headers:{'Content-Type':file.endsWith('.js')?'application/javascript':'text/css'}});}catch(e){console.error('MISSING RESOURCE',file);return new Response('',{status:404});}
 }
 return new Response('',{status:200});
})]};
(async()=>{
const results=[];
for(const sample of fixtures){
 const errors=[], requests=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented: navigation|Not implemented: HTMLCanvas|Could not parse CSS/.test(e.message))errors.push(e.message+' '+(e.detail?.stack||''));});
 const dom=new JSDOM(sample.html,{url:'http://localhost/riswan-iin-'+sample.theme+'/?to=Adrian%20%26%20Pasangan',runScripts:'dangerously',resources,pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{get(){return 100}});
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  w.matchMedia=()=>({matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.IntersectionObserver=class{constructor(cb){this.cb=cb;this.active=true;}observe(el){setTimeout(()=>{if(this.active)this.cb([{target:el,isIntersecting:true,intersectionRatio:1,boundingClientRect:el.getBoundingClientRect()}],this)},1);}unobserve(){}disconnect(){this.active=false}};
  w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
  w.scrollTo=()=>{};w.scrollBy=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLElement.prototype.scrollTo=function(){};
  w.HTMLElement.prototype.animate=function(){return{finished:Promise.resolve(),cancel(){},pause(){},play(){},addEventListener(){}}};
  w.HTMLMediaElement.prototype.play=function(){this._paused=false;return Promise.resolve()};
  w.HTMLMediaElement.prototype.pause=function(){this._paused=true};
  w.HTMLMediaElement.prototype.load=function(){};
  Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false}});
  if(w.HTMLDialogElement){w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))}};
  w.URL.createObjectURL=()=> 'blob:http://localhost/test';w.URL.revokeObjectURL=()=>{};
  w.fetch=async(url,opts={})=>{requests.push({url,opts});return{ok:true,status:opts.method==='POST'?201:200,json:async()=>opts.method==='POST'?{ok:true,message:'Konfirmasi diterima server.'}:{wishes:[{name:'Tamu contoh',message:'Selamat berbahagia.',created_at:'2026-10-24T10:00:00Z'}]}}};
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{}}});
 }});
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}));
 await new Promise(r=>setTimeout(r,80));
 const w=dom.window,d=w.document;
 const guest=d.querySelector('[data-guest], #guestName:not(input), .guest-name');
 assert(guest?.textContent.includes('Adrian & Pasangan'),'guest theme '+sample.theme);
 assert(d.querySelector('img[src="/media/custom-client-photo.webp"]'),'custom image not preserved '+sample.theme);
 const oldNames=/Andi|Sada|Kelvin|Chyntia|Endah|Evan/.test(d.body.textContent); assert(!oldNames,'Original source name remains in theme '+sample.theme);
 const calendar=w.RewamoreRuntime.calendarText();
 assert(calendar.includes('DTSTART:20271106T030000Z'),'calendar time '+sample.theme);
 assert(calendar.includes('SUMMARY:Pernikahan Riswan & Iin'),'calendar title '+sample.theme);
 assert(!calendar.includes('Andi'),'calendar demo '+sample.theme);
 const opener=d.querySelector('#openInvitation, #open-invitation, #openCover, #open-cover, [data-open-invitation]');
 if(opener)opener.click();
 await new Promise(r=>setTimeout(r,30));
 if(['1','2','10'].includes(sample.theme))assert.equal(d.body.dataset.open,'true','cover opens '+sample.theme);
 if(['3','4'].includes(sample.theme))assert(d.body.classList.contains('invitation-open'),'cover opens '+sample.theme);
 if(['5','7','8'].includes(sample.theme))assert(d.body.classList.contains('opened'),'cover opens '+sample.theme);
 if(sample.theme==='9')assert(d.documentElement.classList.contains('experience-open'),'cover opens9');
 const galImg=d.querySelector('img[src="/media/client-gallery.webp"], img[data-src="/media/client-gallery.webp"]');
 if(galImg){const trigger=galImg.closest('[data-gallery-index],[data-gallery],.gallery-photo'); assert(trigger,'gallery trigger '+sample.theme);trigger.click();await new Promise(r=>setTimeout(r,30));const light=d.querySelector('#lightboxImage,#lightbox-image');assert(light.src.endsWith('/media/client-gallery.webp'),'gallery custom popup '+sample.theme);const allDialogs=d.querySelectorAll('dialog[open]');allDialogs.forEach(el=>el.close());}
 const form=d.querySelector('#rsvpForm,#rsvp-form');assert(form,'form exists '+sample.theme);
 const name=form.querySelector('[name="name"],#rsvpName,#rsvp-name,input#guestName');name.value='Adrian & Pasangan';
 const msg=form.querySelector('textarea');msg.value='Selamat <script>alert(1)</script>';
 const radio=form.querySelector('input[name="attendance"]');if(radio)radio.checked=true;
 const select=form.querySelector('select[name="attendance"],select#attendance');if(select)select.selectedIndex=1;
 const consent=form.querySelector('[name="publish_message"]');consent.checked=true;
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(r=>setTimeout(r,40));
 const post=requests.find(r=>r.opts.method==='POST');assert(post,'RSVP POST '+sample.theme);
 const payload=new URLSearchParams(post.opts.body);assert.equal(payload.get('name'),'Adrian & Pasangan');assert.equal(payload.get('attendance'),'yes');assert.equal(payload.get('publish_message'),'true');assert(payload.get('csrfmiddlewaretoken'),'CSRF '+sample.theme);
 assert.equal(w.localStorage.length,0,'No local RSVP '+sample.theme);
 const stat=form.querySelector('#rsvpStatus,#rsvp-status');assert.equal(stat.textContent,'Konfirmasi diterima server.');
 results.push({theme:sample.theme,opener:opener?.id||'NONE',oldNames,errors,requests:requests.length});
 dom.window.close();
}
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
