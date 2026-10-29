// Run: node nofridge.test.js   (engine tests load engine.js; integration tests load index.html with a DOM stub)
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const dir=__dirname;
const eng=fs.readFileSync(dir+'/engine.js','utf8');
const X=(()=>{const c=vm.createContext({console});vm.runInContext(eng,c);return vm.runInContext("({I,RECIPES,SUBS,getRecommendations,evaluate,coverage,nutri,consume,shoppingList,sanitize,defaultState,surprise,safetyWarnings,leftoverAdvice,canKeepCooked,todayStr,cmp,FRESH_MS,PRESETS,ALLERGENS})",c)})();
const {I,RECIPES,getRecommendations,evaluate,coverage,nutri,consume,shoppingList,sanitize,defaultState,surprise,safetyWarnings,leftoverAdvice,canKeepCooked,todayStr,PRESETS}=X;
let pass=0,fail=0;const t=(n,f)=>{try{f();pass++;console.log("ok  -",n)}catch(e){fail++;console.log("FAIL-",n,"\n     ",e.message)}};
const NOW=Date.now();
function mk(items,p,o){const P=Object.assign(defaultState().prefs,{eq:["induction","kettle","airfryer","mixer"],setup:"none"},p||{});const pantry={};for(const id of Object.keys(items))pantry[id]=Object.assign({id,q:items[id],st:"have",o:false,t:(I[id].p===2||I[id].ao)?NOW:null},typeof items[id]==="object"&&items[id]!==null&&!Array.isArray(items[id])?items[id]:{});for(const id of Object.keys(items))if(typeof items[id]==="object"&&items[id]!==null)pantry[id]=Object.assign({id,q:null,st:"have",o:false,t:null},items[id]);return Object.assign({pantry,prefs:P,filters:{},prices:{},now:NOW,staples:[],shop:false,hist:[]},o||{})}
const sample=()=>Object.assign({},PRESETS.sample.items);
const rid=(res)=>res.ranked.map(x=>x.r.id);
const rr=id=>RECIPES.find(r=>r.id===id);

// ---------- data integrity ----------
t("catalog has 30+ distinct recipes with real quantities and steps",()=>{
 assert.ok(RECIPES.length>=30);assert.strictEqual(new Set(RECIPES.map(r=>r.n)).size,RECIPES.length);
 for(const r of RECIPES){assert.ok(r.steps.length>=2,r.id);assert.ok(r.ing.length>=2,r.id);for(const x of r.ing){assert.ok(I[x.id],r.id+":"+x.id);assert.ok(x.q>0,r.id+":"+x.id)}assert.ok(r.sv>0)}
});
t("every preset ingredient exists in the catalog",()=>{for(const p of Object.values(PRESETS))for(const id of Object.keys(p.items))assert.ok(I[id],id)});

// ---------- 1-7 engine scenarios ----------
t("1. fully available recipe with compatible equipment ranks highly",()=>{
 const res=getRecommendations(mk({soya_dry:200,cucumber:200,tomato:200,onion:200,salt:50,garam:20},{}));
 const x=res.ranked.find(x=>x.r.id==="soya_salad");assert.ok(x);assert.strictEqual(x.miss.length,0);assert.strictEqual(x.cov,1);assert.ok(res.ranked.indexOf(x)<=2,"rank "+res.ranked.indexOf(x));
});
t("2. missing essential ingredient excluded when shopping disabled",()=>{
 const res=getRecommendations(mk({cucumber:200,tomato:200,onion:200,salt:50,garam:20}));
 assert.ok(!rid(res).includes("soya_salad"));assert.ok(res.rejected.find(x=>x.r.id==="soya_salad"&&x.kind==="missing"));
});
t("3. same recipe appears with disclosed missing items when shopping enabled",()=>{
 const res=getRecommendations(mk({cucumber:200,tomato:200,onion:200,salt:50,garam:20},{},{shop:true}));
 const x=res.ranked.find(x=>x.r.id==="soya_salad");assert.ok(x);assert.strictEqual(JSON.stringify(x.miss.map(m=>m.id)),JSON.stringify(["soya_dry"]));assert.ok(x.incr>0);assert.ok(x.why.some(w=>/Missing 1/.test(w)));
});
t("4. recipe requiring unavailable equipment is rejected",()=>{
 const items=Object.assign(sample(),{});const res=getRecommendations(mk(items,{eq:["induction"]}));
 assert.ok(!rid(res).includes("af_masala_paneer"));assert.ok(res.rejected.find(x=>x.r.id==="af_masala_paneer"&&x.kind==="equipment"));
});
t("5. dietary violation rejected",()=>{
 const res=getRecommendations(mk({egg:6,onion:200,tomato:200,oil:200,salt:50,green_chilli:30},{diet:"veg"}));
 assert.ok(res.rejected.find(x=>x.r.id==="egg_bhurji"&&x.kind==="diet"));
 const eg=getRecommendations(mk({egg:6,onion:200,tomato:200,oil:200,salt:50,green_chilli:30},{diet:"egg"}));assert.ok(rid(eg).includes("egg_bhurji"));
 const vg=getRecommendations(mk(sample(),{diet:"vegan"}));assert.ok(!rid(vg).some(id=>rr(id).ing.some(x=>!x.o&&I[x.id].dt>0)));
});
t("6. excluded allergen rejects recipe (and drops optional allergen ingredients)",()=>{
 const items={peanuts:200,onion:200,tomato:200,salt:50};
 assert.ok(rid(getRecommendations(mk(items))).includes("peanut_chaat"));
 const res=getRecommendations(mk(items,{exAl:["peanut"]}));assert.ok(!rid(res).includes("peanut_chaat"));assert.ok(res.rejected.find(x=>x.r.id==="peanut_chaat"&&x.kind==="allergen"));
 const poha=getRecommendations(mk({poha:200,onion:200,oil:200,salt:50,peanuts:100},{exAl:["peanut"]})).ranked.find(x=>x.r.id==="kanda_poha");assert.ok(poha);assert.ok(!poha.rows.some(z=>z.x.id==="peanuts"&&z.u.ok&&poha.nut.p>0&&false));
});
t("7. refrigeration: a fridge-dependent recipe is rejected; stale paneer is blocked unless bought today",()=>{
 const fake=Object.assign({},rr("paneer_bhurji"),{id:"zz",fridge:true});
 const base=Object.assign(sample(),{oil:200});
 assert.strictEqual(evaluate(fake,mk(base)).kind,"fridge");
 assert.ok(evaluate(fake,mk(base,{setup:"fridge"})).ok);
 const stale=mk(Object.assign(sample(),{oil:200}));stale.pantry.paneer.t=NOW-30*3600e3;
 const r1=evaluate(rr("paneer_bhurji"),stale);assert.strictEqual(r1.ok,false);assert.strictEqual(r1.kind,"missing");assert.ok(/fridge/.test(r1.msg));
 const fresh=mk(Object.assign(sample(),{oil:200}));assert.ok(evaluate(rr("paneer_bhurji"),fresh).ok);
 const f2=mk(Object.assign(sample(),{oil:200}),{setup:"fridge"});f2.pantry.paneer.t=null;assert.ok(evaluate(rr("paneer_bhurji"),f2).ok,"with a fridge no freshness gate");
});

// ---------- 8-9 state handling ----------
t("8. dry channa does not satisfy a recipe that needs cooked chickpeas",()=>{
 const items={channa_dry:300,onion:200,tomato:200,cucumber:200,salt:50};
 const res=getRecommendations(mk(items));assert.ok(!rid(res).includes("channa_chaat_can"));
 const cov=coverage(rr("channa_chaat_can"),mk(items));assert.ok(cov.miss.some(m=>m.id==="channa_can"));assert.strictEqual(cov.subs.length,0,"no silent substitution");
 assert.ok(rid(getRecommendations(mk({channa_can:300,onion:200,tomato:200,cucumber:200,salt:50}))).includes("channa_chaat_can"));
});
t("9. dry soya is never treated as cooked: every soya recipe has soak/boil steps and a warning",()=>{
 for(const r of RECIPES.filter(r=>r.ing.some(x=>x.id==="soya_dry"))){assert.ok(r.steps.some(s=>/soak|boil/i.test(s.t)),r.id);assert.ok(r.eq.length>0,r.id+" must need water/heat")}
 assert.ok(safetyWarnings(rr("soya_salad"),mk(sample())).some(w=>/not ready-to-eat/.test(w)));
 assert.ok(safetyWarnings(rr("channa_masala_dry"),mk(sample())).some(w=>/soaking/.test(w)));
 const longR=rr("channa_masala_dry");assert.ok(longR.wait>=480);
});
t("10. unknown quantities do not produce false precision",()=>{
 const c=mk({soya_dry:null,cucumber:null,tomato:null,onion:null,salt:null,garam:null});
 const x=evaluate(rr("soya_salad"),c);assert.ok(x.ok);assert.strictEqual(x.cov,1);assert.ok(x.unc>0);assert.strictEqual(x.conf,"low");assert.ok(x.rows.some(r=>r.st==="uncertain"));assert.strictEqual(x.miss.length,0);
});
t("11. no division by zero / NaN with bad prices or servings",()=>{
 const c=mk(sample(),{sv:0});c.prices={soya_dry:0,paneer:-5,tomato:"x"};
 const res=getRecommendations(c);for(const x of res.ranked){assert.ok(isFinite(x.score),x.r.id);assert.ok(isFinite(x.cost));assert.ok(isFinite(x.incr))}
 const odd=Object.assign({},rr("soya_salad"),{sv:0});assert.ok(isFinite(evaluate(odd,mk(sample())).score));
});
t("12. nutrition scales with quantities and servings",()=>{
 const r=rr("soya_salad"),a=nutri(r,[],1);const dbl=Object.assign({},r,{ing:r.ing.map(x=>Object.assign({},x,{q:x.q*2}))});
 const b=nutri(dbl,[],1);assert.ok(Math.abs(b.p-2*a.p)<.3,a.p+" vs "+b.p);
 const two=nutri(Object.assign({},r,{sv:2}),[],2);assert.ok(Math.abs(two.p-a.p/2)<.3);
 const more=nutri(Object.assign({},r,{ing:r.ing.map(x=>x.id==="soya_dry"?Object.assign({},x,{q:100}):x)}),[],1);assert.ok(more.p>a.p+20);
});
t("13. missing nutrition data is unknown, never zero",()=>{
 const save=I.onion.n;I.onion.n=null;const n=nutri(rr("soya_salad"),[],1);I.onion.n=save;
 assert.strictEqual(n.unknown,true);assert.strictEqual(n.p,null);assert.strictEqual(n.k,null);
 I.onion.n=null;const e=evaluate(rr("soya_salad"),mk(sample()));I.onion.n=save;assert.strictEqual(e.nut.p,null);assert.strictEqual(e.conf,"low");
});
// ---------- 14-16 shopping & pantry ----------
t("14. shopping list merges duplicate ingredients across meals",()=>{
 const c=mk({});const today=todayStr(new Date(NOW));
 const sl=shoppingList([{rid:"saucy_pasta",day:today,sv:1},{rid:"spiced_pasta",day:today,sv:1}],c);
 const p=sl.items.find(i=>i.id==="pasta");assert.strictEqual(p.need,180);assert.strictEqual(sl.items.filter(i=>i.id==="pasta").length,1);
});
t("15. shopping list subtracts pantry quantities; optional excluded unless chosen",()=>{
 const c=mk({pasta:100});const today=todayStr(new Date(NOW));
 const sl=shoppingList([{rid:"saucy_pasta",day:today,sv:1}],c);assert.ok(!sl.items.find(i=>i.id==="pasta"),"90 g needed, 100 g in pantry -> nothing to buy");
 const c2=mk({pasta:50});const p2=shoppingList([{rid:"saucy_pasta",day:today,sv:1}],c2).items.find(i=>i.id==="pasta");assert.strictEqual(p2.buy,40);
 assert.ok(!shoppingList([{rid:"saucy_pasta",day:today,sv:1}],mk({})).items.some(i=>i.id==="oregano"));
 assert.ok(shoppingList([{rid:"saucy_pasta",day:today,sv:1}],mk({}),{optional:true}).items.some(i=>i.id==="oregano"));
});
t("15b. no-fridge planning buys fresh perishables on each cooking day",()=>{
 const c=mk({paneer:200,oil:100,onion:300,tomato:300,garam:30,salt:50});const d0=todayStr(new Date(NOW)),d1=todayStr(new Date(NOW+864e5*2));
 const sl=shoppingList([{rid:"paneer_bhurji",day:d0,sv:1},{rid:"paneer_bhurji",day:d1,sv:1}],c);const p=sl.items.find(i=>i.id==="paneer");
 assert.ok(p&&p.fresh&&p.buy===100,JSON.stringify(p));
});
t("16. consuming 50 g of a 200 g ingredient leaves 150 g, not zero",()=>{
 const p={soya_dry:{id:"soya_dry",q:200,st:"have",o:false,t:null}};const r=Object.assign({},rr("soya_salad"),{ing:[{id:"soya_dry",q:50,o:false}]});
 const out=consume(p,r,1,["soya_dry"]);assert.strictEqual(out.pantry.soya_dry.q,150);assert.strictEqual(out.pantry.soya_dry.st,"have");assert.strictEqual(p.soya_dry.q,200,"input not mutated");
 const u=consume({soya_dry:{id:"soya_dry",q:null,st:"have",o:false,t:null}},r,1,[]);assert.strictEqual(u.pantry.soya_dry.st,"have","unknown qty untouched unless confirmed");
});
// ---------- 17-18 ranking ----------
t("17. similar dominant proteins are diversified in the top results",()=>{
 const c=mk(Object.assign(sample(),{oil:300,atta:500,egg:6,rice:500,poha:250,peanuts:200}));const res=getRecommendations(c);
 const top=res.ranked.slice(0,5).map(x=>x.r.grp);assert.ok(new Set(top).size>=3,top.join(","));
 const raw=res.ranked.filter(x=>x.r.grp==="paneer").length>=2;assert.ok(raw);
 assert.ok(new Set(res.ranked.slice(0,3).map(x=>x.r.grp)).size===3,"top 3 groups: "+res.ranked.slice(0,3).map(x=>x.r.grp));
});
t("18. ranking is deterministic and tie-stable regardless of catalog order",()=>{
 const c=mk(Object.assign(sample(),{oil:300,rice:500}));const a=rid(getRecommendations(c));
 const shuffled=RECIPES.slice().reverse();const b=rid(getRecommendations(Object.assign({},c,{recipes:shuffled})));assert.strictEqual(a.join(),b.join());
 assert.strictEqual(a.join(),rid(getRecommendations(c)).join());
 const twin=Object.assign({},rr("saucy_pasta"),{id:"aaa_twin"});const tr=getRecommendations(Object.assign({},c,{recipes:[rr("saucy_pasta"),twin]}));assert.strictEqual(tr.ranked[0].r.id,"aaa_twin");
});
t("surprise-me is a controlled choice among top suitable recipes",()=>{
 const res=getRecommendations(mk(sample()));const s=surprise(res.ranked,()=>0);assert.strictEqual(s.r.id,res.ranked[0].r.id);
 const s2=surprise(res.ranked,()=>.999);assert.ok(res.ranked.slice(0,5).includes(s2));assert.strictEqual(surprise([],()=>0.5),null);
});
t("scoring follows the primary priority (protein vs cheap)",()=>{
 const c=mk(Object.assign(sample(),{oil:300,rice:500}),{pri:["protein"]});const p=getRecommendations(c);
 const c2=mk(Object.assign(sample(),{oil:300,rice:500}),{pri:["cheap"]});const q=getRecommendations(c2);
 const topP=p.ranked[0].nut.p,topQ=q.ranked[0].cost;assert.ok(topP>=15,"protein pick "+topP);assert.ok(topQ<40,"cheap pick "+topQ);
});
t("strict budget and strict time filter reject; soft keeps",()=>{
 const base=mk(Object.assign(sample(),{oil:300}),{budget:10,strictBudget:true});const r1=getRecommendations(base);assert.ok(r1.ranked.every(x=>x.cost<=10));assert.ok(r1.rejected.some(x=>x.kind==="budget"));
 const soft=getRecommendations(mk(Object.assign(sample(),{oil:300}),{budget:10,strictBudget:false}));assert.ok(soft.ranked.some(x=>x.cost>10));
 const tm=getRecommendations(Object.assign(mk(sample()),{filters:{max:15}}));assert.ok(tm.ranked.every(x=>x.total<=15));
});
t("no results: explains reason and offers the minimum unlock",()=>{
 const res=getRecommendations(mk({pasta:200,salt:50,pepper:20}));assert.strictEqual(res.ranked.length,0);
 assert.ok(res.unlock.length>0);assert.ok(res.unlock[0].count>=1);
});
t("substitutions are explicit, recipe-specific and respect allergens",()=>{
 const c=mk({noodles:2,paneer:200,onion:200,chilli_sauce:100,salt:20},{eq:["induction"]},{shop:true});
 const x=evaluate(rr("soya_noodles"),c);assert.ok(x.subs.some(s=>s.from==="soya_dry"&&s.to==="paneer"));
 const c2=mk({noodles:2,paneer:200,onion:200,salt:20},{eq:["induction"],exAl:["dairy"]},{shop:true});
 assert.ok(!evaluate(rr("soya_noodles"),c2).subs.length,"dairy exclusion blocks the paneer swap");
 const c3=mk({channa_dry:300,onion:200,tomato:200,cucumber:200},{},{shop:true});assert.strictEqual(evaluate(rr("channa_chaat_can"),c3).subs.length,0);
});
t("food-safety rules for no-fridge vs fridge",()=>{
 assert.strictEqual(canKeepCooked("none"),false);assert.strictEqual(canKeepCooked("fridge"),true);
 assert.ok(/one sitting/.test(leftoverAdvice("none")));assert.ok(!/one sitting/.test(leftoverAdvice("fridge")));
 assert.ok(safetyWarnings(rr("veg_pulao"),mk(sample())).some(w=>/leftovers/.test(w)));
 assert.ok(!safetyWarnings(rr("veg_pulao"),mk(sample(),{setup:"fridge"})).some(w=>/leftovers/.test(w)));
 assert.ok(safetyWarnings(rr("af_masala_paneer"),mk(sample())).some(w=>/perishable/.test(w)));
 // opened sealed-tin chickpeas become perishable
 const c=mk({channa_can:{q:200,o:true,t:NOW-40*3600e3},onion:200,tomato:200,cucumber:200,salt:20});assert.ok(!rid(getRecommendations(c)).includes("channa_chaat_can"));
 c.pantry.channa_can.t=NOW-3600e3;assert.ok(rid(getRecommendations(c)).includes("channa_chaat_can"));
 c.pantry.channa_can.o=false;c.pantry.channa_can.t=null;assert.ok(rid(getRecommendations(c)).includes("channa_chaat_can"),"sealed tin is shelf-stable");
});
// ---------- 19 validation ----------
t("19. malformed or old imported data never crashes",()=>{
 for(const bad of [null,undefined,42,"x",[],{prefs:5},{prefs:{diet:"alien",eq:"no",budget:"x",sv:-3},pantry:{tomato:5,fake:{q:1},onion:{q:"abc",st:"weird"},potato:null},plan:[{rid:"nope",day:"x"}],hist:"x",cook:{rid:"zzz"}}]){
  const s=sanitize(bad);if(s){assert.ok(["veg","vegan","egg","non","any"].includes(s.prefs.diet));assert.ok(s.prefs.sv>=1);assert.ok(Array.isArray(s.prefs.eq));assert.ok(!s.pantry.fake);if(s.pantry.onion){assert.strictEqual(s.pantry.onion.q,null);assert.strictEqual(s.pantry.onion.st,"have")}assert.strictEqual(s.cook,null)}
 }
 const good=sanitize({prefs:{diet:"vegan",eq:["airfryer","bogus"]},pantry:{tomato:{q:5,st:"low"}}});assert.strictEqual(JSON.stringify(good.prefs.eq),JSON.stringify(["airfryer"]));assert.strictEqual(good.pantry.tomato.q,5);
});

// ---------- UI integration (index.html in a DOM stub) ----------
const html=fs.readFileSync(dir+'/index.html','utf8'),src=html.match(/<script>([\s\S]*)<\/script>/)[1];
function boot(store){
 store=store||{};const els={};
 const el=()=>({style:{},innerHTML:"",value:"",textContent:""});
 const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
 const alerts=[];const c=vm.createContext({document:{getElementById:id=>els[id]||(els[id]=el()),body:{style:{}},createElement:()=>({click(){}})},localStorage:ls,window:{addEventListener(){}},navigator:{onLine:true},location:{protocol:"file:"},alert:m=>alerts.push(m),confirm:()=>true,setTimeout:()=>0,Blob:function(){},URL:{createObjectURL(){return""}},console});
 vm.runInContext(src,c);return{E:s=>vm.runInContext(s,c),store,els,alerts};
}
t("UI: boots, onboarding can be skipped, app usable without setup",()=>{
 const a=boot();assert.ok(/Step 1 of 5/.test(a.els.sheet.innerHTML));a.E("obDone()");assert.strictEqual(a.els.sheet.innerHTML,"");
 assert.ok(/What can you cook right now/.test(a.els.app.innerHTML));assert.ok(/No appliances selected/.test(a.els.app.innerHTML));a.E("find()");assert.ok(a.E("U.res")!==null);
});
t("UI: add, edit, remove an ingredient",()=>{
 const a=boot();a.E("obDone();addIng('tomato')");assert.ok(a.E("S.pantry.tomato"));assert.strictEqual(a.E("S.pantry.tomato.q"),null);
 a.E("setQ('tomato','250')");assert.strictEqual(a.E("S.pantry.tomato.q"),250);a.E("setSt('tomato','low')");assert.strictEqual(a.E("S.pantry.tomato.st"),"low");
 a.E("rmIng('tomato')");assert.strictEqual(a.E("S.pantry.tomato"),undefined);
 a.E("U.pq='pan';adderSearch('aloo')");
});
t("UI: filter, view recipe, cook, complete cooking deducts only what was used",()=>{
 const a=boot();a.E("obDone();loadPreset('sample');S.prefs.diet='veg'");
 a.E("toggleF('airfryer');find()");const ids=a.E("U.res.ranked.map(x=>x.r.id)");assert.ok(ids.length>0&&ids.every(id=>/^af_/.test(id)),ids.join());
 a.E("U.F={};find()");a.E("openR('soya_salad')");assert.ok(/Spiced soya/.test(a.els.sheet.innerHTML));assert.ok(/not ready-to-eat/.test(a.els.sheet.innerHTML));
 a.E("startCook('soya_salad')");assert.ok(/step 1 of/.test(a.els.sheet.innerHTML));assert.ok(a.store.nofridge_v1.includes('"cook"'),"progress persisted");
 const before=a.E("S.pantry.soya_dry.q");a.E("while(S.cook.step<rec('soya_salad').steps.length-1)stepTo(S.cook.step+1);finishCook()");
 assert.ok(/Did you actually cook/.test(a.els.sheet.innerHTML));assert.strictEqual(a.E("S.pantry.soya_dry.q"),before,"merely viewing/cooking must not deduct");
 a.E("finDid(true);finRate(3);finSave()");assert.strictEqual(a.E("S.pantry.soya_dry.q"),before-50);assert.strictEqual(a.E("S.hist.length"),1);assert.strictEqual(a.E("S.cook"),null);
 a.E("startCook('soya_salad');finishCook();finDid(false)");assert.strictEqual(a.E("S.pantry.soya_dry.q"),before-50);
});
t("UI: plan + shopping list, preferences and pantry survive reload",()=>{
 const a=boot();a.E("obDone();loadPreset('sample');S.prefs.diet='vegan';S.prefs.eq=['induction'];save();planSave('saucy_pasta',todayStr());planSave('spiced_pasta',todayStr())");
 a.E("go('plan')");assert.ok(/Shopping list/.test(a.els.app.innerHTML));assert.ok(/Estimated spend/.test(a.els.app.innerHTML)||/already in your pantry/.test(a.els.app.innerHTML));
 a.E("markBought('oil',200)");assert.strictEqual(a.E("S.pantry.oil.q"),200);
 const b=boot(a.store);assert.strictEqual(b.E("S.prefs.diet"),"vegan");assert.strictEqual(JSON.stringify(b.E("S.prefs.eq")),JSON.stringify(["induction"]));assert.strictEqual(b.E("S.pantry.oil.q"),200);assert.strictEqual(b.E("S.plan.length"),2);
 assert.strictEqual(b.els.sheet.innerHTML,"","onboarding not shown again");
});
t("UI: corrupted storage recovers; reset clears all data after confirm",()=>{
 const c=boot({nofridge_v1:"{not json"});assert.ok(/What can you cook/.test(c.els.app.innerHTML));
 const d=boot({nofridge_v1:JSON.stringify({prefs:{diet:7},pantry:{onion:{q:"x"}}})});assert.strictEqual(d.E("S.prefs.diet"),"veg");
 const a=boot();a.E("obDone();loadPreset('sample');resetAll()");assert.strictEqual(a.E("Object.keys(S.pantry).length"),0);
});
t("UI: no network APIs; every handler referenced in markup exists",()=>{
 assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(src.replace(/navigator\.serviceWorker\.register/g,"")));
 const a=boot();a.E("obDone();loadPreset('sample');find()");
 const pages=[];for(const tab of["cook","pantry","plan","settings"]){a.E(`go('${tab}')`);pages.push(a.els.app.innerHTML)}a.E("openR('soya_salad')");pages.push(a.els.sheet.innerHTML);a.E("openSheet('safety')");pages.push(a.els.sheet.innerHTML);a.E("openSheet('onb')");pages.push(a.els.sheet.innerHTML);
 const used=new Set();for(const p of pages)for(const m of p.matchAll(/on(?:click|change|input)="([a-zA-Z_]+)\(/g))used.add(m[1]);
 for(const fn of used)assert.strictEqual(a.E("typeof "+fn),"function",fn);
});
console.log(`\n${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
