"use strict";
// ================= NOFRIDGE ENGINE (pure, local, deterministic; no network) =================
const FRESH_MS=18*3600e3; // fridge-less: perishables count as usable only if bought/opened within this window
const CATS=["Grains & flour","Pulses & legumes","Soy & plant protein","Dairy","Vegetables","Fruits","Condiments & sauces","Oils & fats","Spices & seasonings","Ready-to-eat","Other"];
const EQ_OPTS=[["induction","Induction / electric stovetop"],["gas","Gas stove"],["kettle","Electric kettle / boiler"],["airfryer","Air fryer"],["micro","Microwave"],["rc","Rice cooker"],["mixer","Mixer / grinder"],["none","No appliance (ready-to-eat only)"]];
const EQN={stove:"a stove (induction or gas)",water:"a kettle or stove to boil water",airfryer:"an air fryer",micro:"a microwave",rc:"a rice cooker",mixer:"a mixer/grinder"};
function hasEq1(c,e){switch(c){case"stove":return e.includes("induction")||e.includes("gas");case"water":return e.includes("kettle")||e.includes("induction")||e.includes("gas");case"airfryer":return e.includes("airfryer");case"micro":return e.includes("micro");case"rc":return e.includes("rc");case"mixer":return e.includes("mixer")}return false}
const hasEq=(code,eq)=>code.split("|").some(c=>hasEq1(c,eq||[]));

// ---- ingredient reference: nutrition n=[kcal,protein,carb,fat,fibre] per nb (100 g/ml, or 1 piece) in the stated state.
// Values are APPROXIMATE typical food-composition figures (not looked up live). Prices are ₹ estimates per nb; editable by the user.
// p: 0 shelf-stable, 1 produce (room temp, short life), 2 needs refrigeration | dt: 0 vegan,1 vegetarian(dairy),2 egg | ao: becomes perishable once opened
const I={};
[
["pasta","Pasta (dry)",0,"g",[371,13,75,1.5,3],12,{al:["gluten"],pk:200,sg:"Airtight container, dry place.",a:"penne macaroni spaghetti"}],
["noodles","Instant noodles (70 g pack)",0,"pcs",[310,6.5,43,13,1.5],14,{al:["gluten"],sg:"Keep sealed and dry. Use the sachet the day you open it.",a:"maggi ramen"}],
["rice","Rice (raw)",0,"g",[360,7,79,.6,1.3],6,{pk:500,sg:"Airtight container, dry place."}],
["atta","Atta (wheat flour)",0,"g",[340,12,71,1.7,11],4.5,{al:["gluten"],pk:500,sg:"Airtight container; keep dry."}],
["poha","Poha (flattened rice)",0,"g",[350,6.6,77,1.2,2],7,{pk:250,sg:"Airtight container, dry place.",a:"aval flattened rice"}],
["murmura","Murmura (puffed rice)",0,"g",[402,6,87,1,1],10,{pk:200,sg:"Airtight; it goes soggy in humidity.",a:"puffed rice mamra"}],
["channa_dry","Dry black channa",1,"g",[364,19,61,6,17],12,{pk:250,sg:"Airtight, dry place. Needs overnight soaking and thorough boiling.",a:"kala chana chickpea"}],
["channa_can","Cooked chickpeas (sealed tin/pouch)",1,"g",[164,8.9,27,2.6,7.6],9,{ao:1,pk:200,sg:"Sealed: dry place. Once opened it is perishable; use it in one sitting.",a:"chole canned chickpeas ready to eat"}],
["moong_dry","Moong dal (split, dry)",1,"g",[347,24,63,1.2,16],13,{pk:250,sg:"Airtight container, dry place."}],
["toor_dry","Toor dal (dry)",1,"g",[343,22,63,1.5,15],16,{pk:250,sg:"Airtight container, dry place."}],
["peanuts","Roasted peanuts (ready-to-eat)",1,"g",[567,26,16,49,8.5],14,{al:["peanut"],pk:200,sg:"Airtight; they turn rancid in heat over weeks.",a:"moongfali groundnut"}],
["roasted_chana","Roasted chana (ready-to-eat)",9,"g",[380,20,58,6,17],14,{pk:200,sg:"Airtight; keep dry so it stays crisp.",a:"bhuna chana"}],
["soya_dry","Soya chunks (dry)",2,"g",[345,52,33,.5,13],16,{al:["soy"],pk:200,sg:"Airtight, dry place. Always soak/boil before eating.",a:"nutrela meal maker soy"}],
["paneer","Paneer",3,"g",[296,18,3.4,23,0],38,{p:2,dt:1,al:["dairy"],pk:200,sg:"Perishable and needs refrigeration. With no fridge, buy it the day you cook.",a:"cottage cheese"}],
["tomato","Tomato",4,"g",[18,.9,3.9,.2,1.2],4,{p:1,sg:"Cool, ventilated spot. Use within a few days; discard soft or mouldy ones.",a:"tamatar"}],
["onion","Onion",4,"g",[40,1.1,9,.1,1.7],3.5,{p:1,sg:"Dark, ventilated, dry spot.",a:"pyaz kanda"}],
["potato","Potato",4,"g",[77,2,17,.1,2.2],3,{p:1,sg:"Dark, ventilated spot; discard green or sprouting ones.",a:"aloo"}],
["cucumber","Cucumber",4,"g",[15,.7,3.6,.1,.5],4,{p:1,sg:"Cool spot; use within a few days.",a:"kheera"}],
["green_chilli","Green chilli",4,"g",[40,2,9,.2,1.5],8,{p:1,sg:"Cool, dry spot; use within a few days.",a:"hari mirch"}],
["capsicum","Capsicum",4,"g",[20,.9,4.6,.2,1.7],8,{p:1,sg:"Cool spot; use within a few days.",a:"bell pepper shimla mirch"}],
["carrot","Carrot",4,"g",[41,.9,9.6,.2,2.8],5,{p:1,sg:"Cool spot; use within a few days.",a:"gajar"}],
["garlic","Garlic",4,"g",[149,6.4,33,.5,2.1],20,{p:1,pk:50,sg:"Dry, ventilated spot.",a:"lehsun"}],
["ginger","Ginger",4,"g",[80,1.8,18,.8,2],15,{p:1,pk:50,sg:"Cool, dry spot.",a:"adrak"}],
["coriander","Coriander leaves",4,"g",[23,2.1,3.7,.5,2.8],10,{p:1,pk:50,sg:"Wilts fast; buy small and use the same day.",a:"dhania cilantro"}],
["lemon","Lemon",5,"pcs",[20,.6,6,.2,1.6],4,{p:1,pk:1,sg:"Cool spot; use within days.",a:"nimbu"}],
["egg","Egg",10,"pcs",[72,6.3,.4,4.8,0],7,{p:1,dt:2,al:["egg"],pk:2,sg:"Never use cracked eggs; buy only what you'll use within days.",a:"anda"}],
["schezwan","Schezwan sauce",6,"g",[130,2,28,1.5,1],56,{al:["soy","gluten"],pk:200,sg:"Follow the label after opening; buy small packs without a fridge."}],
["chilli_sauce","Chilli sauce",6,"g",[80,1,18,.5,.5],30,{pk:200,sg:"Follow the label after opening."}],
["tomato_sauce","Tomato sauce / ketchup",6,"g",[100,1.2,25,.1,.4],24,{pk:200,sg:"Follow the label after opening.",a:"ketchup"}],
["mayo_tandoori","Tandoori mayonnaise",6,"g",[300,1,10,28,0],40,{pk:200,sg:"Check the label (eggless?) and storage after opening; buy small packs without a fridge.",a:"mayonnaise"}],
["oil","Cooking oil",7,"ml",[828,0,0,92,0],15,{pk:200,sg:"Cool, dark place; keep capped.",a:"refined sunflower"}],
["salt","Salt",8,"g",[0,0,0,0,0],2,{pk:50}],
["pepper","Black pepper",8,"g",[251,10,64,3.3,25],80,{pk:50}],
["garam","Garam masala",8,"g",[379,15,45,15,30],60,{pk:50}],
["chilli_flakes","Chilli flakes",8,"g",[282,12,50,14,35],50,{pk:50}],
["oregano","Oregano",8,"g",[265,9,69,4,43],70,{pk:50}],
["chaat_masala","Chaat masala",8,"g",[250,8,45,6,25],50,{pk:50}],
["turmeric","Turmeric powder",8,"g",[312,10,67,3,22],20,{pk:50,a:"haldi"}],
["cumin","Cumin seeds",8,"g",[375,18,44,22,11],40,{pk:50,a:"jeera"}],
["chilli_powder","Red chilli powder",8,"g",[282,12,50,14,35],30,{pk:50}]
].forEach(([id,name,c,u,n,pr,o])=>{I[id]=Object.assign({id,name,c,u,nb:u==="pcs"?1:100,n,pr,pk:u==="pcs"?1:100,p:0,dt:0,al:[],ao:0,sg:"",a:""},o||{})});
const ALLERGENS=["gluten","soy","peanut","dairy","egg"];

// ---- recipes: R(id,name,desc,cuisine,meal,"ing:qty,opt:qty?","equipment|alt",prep,cook,wait,servings,effort1-5,cleanup1-5,spice0-3,group,style,"tags",[steps "text|timerMin"],note)
const RECIPES=[];
function R(id,n,d,cu,meal,ing,eq,prep,cook,wait,sv,eff,cl,spice,grp,style,tags,steps,note){
 RECIPES.push({id,n,d,cu,meal,ing:ing.split(",").map(s=>{const o=s.endsWith("?");const [i,q]=s.replace("?","").split(":");return{id:i,q:+q,o}}),eq:eq?eq.split(","):[],prep,cook,wait,sv,eff,cl,spice,grp,style,tags:tags.split(" "),steps:steps.map(s=>{const[t,m]=s.split("|");return{t,m:m?+m:0}}),note:note||"",fridge:false});
}
R("soya_salad","Spiced soya with cucumber-tomato-onion salad","Soft spiced soya over a crunchy fresh salad.","Indian","lunch","soya_dry:50,cucumber:100,tomato:80,onion:40,salt:2,garam:1,pepper:1?,chilli_flakes:1?,lemon:0.5?,chaat_masala:1?","water",8,5,15,1,1,1,1,"soy","boil","tangy fresh spicy",["Pour just-boiled water over the soya chunks in a bowl and soak until fully soft|15","Drain and squeeze out the water. Boil in fresh water 5 min if you have a stove|5","Chop the cucumber, tomato and onion","Toss the soya with garam masala, salt and any pepper or flakes","Mix with the salad; finish with lemon or chaat masala if you have it"],"Dry soya chunks are not ready-to-eat. Always soak or boil first.");
R("soya_noodles","Soya masala noodles","Instant noodles bulked up with soya and onion.","Indo-Chinese","dinner","noodles:1,soya_dry:30,onion:40,tomato:40?,green_chilli:1?,garam:1?,oil:5?,salt:1?","stove",8,10,15,1,2,2,2,"noodle","stirfry","spicy saucy comfort",["Soak the soya chunks in just-boiled water until soft, then squeeze dry|15","Boil the noodle cake 2 min in a pot, drain","Heat the pan (with a little oil if you have it); fry onion, chilli and tomato 3 min|3","Add soya, garam masala and the noodle sachet; fry 2 min|2","Toss in the noodles and mix well"],"Use the tastemaker sachet the same day you open it.");
R("schezwan_soya_noodles","Schezwan soya noodles","Hot, saucy noodles with soya for protein.","Indo-Chinese","dinner","noodles:1,soya_dry:30,schezwan:20,onion:40,capsicum:40?,oil:5?,chilli_flakes:1?","stove",8,10,15,1,2,2,3,"noodle","stirfry","spicy saucy",["Soak soya chunks in just-boiled water until soft; squeeze dry|15","Boil the noodle cake 2 min; drain","Stir-fry onion (and capsicum) 3 min|3","Add soya and schezwan sauce; cook 2 min|2","Add noodles and toss until coated"],"");
R("af_masala_paneer","Air-fryer masala paneer","Tandoori-style paneer cubes, crisp outside, soft inside.","Indian","snack","paneer:100,mayo_tandoori:15,garam:1,salt:1,pepper:1,oil:3?","airfryer",5,10,10,1,1,1,2,"paneer","airfry","spicy crispy",["Cube the paneer and coat with tandoori mayo, garam masala, salt and pepper","Rest 10 min|10","Air-fry at 180 °C for 8 to 10 min, turning once|10","Eat hot"],"Paneer is perishable: use it fresh the same day when you have no fridge.");
R("paneer_tomato_skillet","Paneer and tomato skillet","Saucy tomato-onion paneer in one pan.","Indian","dinner","paneer:100,tomato:150,onion:60,garam:1.5,salt:2,oil:10,green_chilli:1?,chilli_powder:1?","stove",8,15,0,1,2,2,2,"paneer","saute","saucy spicy comfort",["Heat the oil; fry onion until golden|5","Add tomato, green chilli and spices; cook down to a thick sauce|8","Add the paneer cubes and a splash of water; simmer 3 min|3","Serve hot"],"Cook only what you'll eat now.");
R("paneer_bhurji","Paneer bhurji","Dry, crumbly spiced paneer scramble.","Indian","breakfast","paneer:100,onion:50,tomato:60,garam:1,salt:2,oil:8,green_chilli:1?","stove",6,10,0,1,1,1,2,"paneer","saute","spicy comfort",["Heat the oil; fry onion 3 min|3","Add tomato and chilli; cook 3 min|3","Crumble in the paneer with garam masala and salt; stir 3 min|3","Serve at once"],"");
R("af_paneer_bites","Air-fryer crispy paneer bites","Lightly coated paneer pieces with a ketchup dip.","Indian","snack","paneer:100,atta:15,garam:1,salt:1,chilli_flakes:1?,tomato_sauce:20?,oil:5?","airfryer",8,10,0,1,2,2,1,"paneer","airfry","crispy",["Mix atta, garam masala, salt and a splash of water into a thin paste","Toss paneer cubes in the paste","Air-fry at 180 °C for 10 min, shaking halfway|10","Serve with tomato sauce"],"Eat the same day.");
R("af_potato_masala","Air-fryer crisp potato masala","Crisp wedges with garam masala and pepper.","Indian","snack","potato:250,garam:1,salt:2,pepper:1,chilli_flakes:1?,tomato_sauce:15?,oil:5?","airfryer",6,22,0,1,1,1,2,"potato","airfry","crispy spicy",["Cut potatoes into wedges; soak in water 10 min if you have time, then dry well|10","Toss with spices (and a little oil if you have it)","Air-fry at 190 °C for 20 to 22 min, shaking twice|22","Serve with tomato sauce"],"");
R("af_chilli_potato","Air-fryer chilli potato","Crisp potato tossed in a sticky chilli glaze.","Indo-Chinese","snack","potato:200,chilli_sauce:15,tomato_sauce:15,onion:30?,capsicum:40?,salt:1,oil:5?","airfryer",8,20,0,1,2,2,2,"potato","airfry","spicy saucy crispy",["Cut potatoes into thin fingers and dry well","Air-fry at 190 °C for 15 min until crisp|15","Warm the two sauces in a bowl; toss in the fries and onion or capsicum","Eat immediately while crisp"],"");
R("af_soya_bites","Air-fryer crispy soya bites","Rehydrated soya, tandoori-coated and air-fried.","Indian","snack","soya_dry:40,mayo_tandoori:10,garam:1,salt:1,pepper:1,chilli_flakes:1?","water,airfryer",5,12,15,1,2,2,2,"soy","airfry","crispy spicy",["Soak soya chunks in just-boiled water until soft|15","Squeeze out all water, boil 5 min in fresh water if you can|5","Coat with mayo and spices","Air-fry at 180 °C for 10 to 12 min, shaking once|12"],"Dry soya chunks must be soaked and cooked first.");
R("channa_chaat_can","Channa chaat (ready cooked chickpeas)","No-cook chickpea chaat with onion, tomato, cucumber.","Indian","snack","channa_can:150,onion:40,tomato:60,cucumber:60,salt:1,green_chilli:1?,lemon:0.5?,chaat_masala:1?,chilli_flakes:1?,tomato_sauce:10?","",8,0,0,1,1,1,1,"channa","nocook","tangy fresh",["Drain the cooked chickpeas","Chop onion, tomato, cucumber and chilli","Mix everything with salt, lemon and chaat masala"],"Opened tinned or pouch chickpeas are perishable: finish the whole opened portion in one sitting.");
R("channa_masala_dry","Channa masala (from dry channa)","Slow-cooked black channa in a spiced onion-tomato gravy.","Indian","dinner","channa_dry:70,onion:80,tomato:120,green_chilli:1,garam:2,salt:3,oil:12,turmeric:1?,chilli_powder:1?,ginger:3?","stove",15,100,480,1,4,4,2,"channa","simmer","spicy comfort saucy",["Rinse the channa and soak in plenty of water for at least 8 hours or overnight|480","Drain; boil in fresh water with salt until completely soft (no pressure cooker: allow about 60 to 75 min)|70","Heat oil; fry onion until brown|8","Add tomato, chilli and spices; cook to a thick masala|8","Stir in the boiled channa with a little cooking water; simmer 10 min|10"],"Long recipe: soaking is unattended waiting time. Channa must be boiled until completely soft.");
R("channa_salad_dry","Boiled channa salad (from dry channa)","Boiled black channa tossed with fresh onion, tomato, cucumber.","Indian","lunch","channa_dry:60,onion:40,tomato:60,cucumber:60,salt:2,pepper:1,lemon:0.5?,chaat_masala:1?","stove",10,70,480,1,3,3,1,"channa","boil","tangy fresh",["Rinse and soak the channa for at least 8 hours or overnight|480","Boil in fresh salted water until completely soft (allow about 60 to 75 min on a stove without a pressure cooker)|70","Drain; cool a few minutes","Toss with chopped onion, tomato, cucumber, pepper and lemon"],"Long recipe. Never eat under-cooked pulses.");
R("spiced_pasta","Spiced tomato-onion pasta","Sauteed tomato and onion sauce over pasta.","Fusion","dinner","pasta:90,tomato:120,onion:50,salt:2,oil:8,oregano:1?,chilli_flakes:1?,green_chilli:1?","stove",8,18,0,1,2,2,2,"pasta","saute","saucy spicy comfort",["Boil pasta in salted water until al dente; keep a cup of the water|10","Heat oil; fry onion 3 min, then tomato until pulpy|8","Add oregano, flakes and salt; stir in pasta with a splash of pasta water","Serve hot"],"");
R("saucy_pasta","Tomato-chilli sauce pasta (no oil)","Boiled pasta tossed in a tomato-chilli sauce blend.","Fusion","dinner","pasta:90,tomato_sauce:40,chilli_sauce:15,salt:2,pepper:1,onion:40?,oregano:1?,chilli_flakes:1?","stove",5,12,0,1,1,1,2,"pasta","boil","saucy",["Boil pasta in salted water until al dente|10","Drain, keeping a few spoons of water","Mix the two sauces with pepper, oregano and flakes; toss with the pasta and water","Top with raw onion if you have it"],"");
R("pasta_soya","Soya-loaded masala pasta","Pasta with soya for extra protein, in a schezwan-tomato sauce.","Fusion","dinner","pasta:70,soya_dry:30,schezwan:15,tomato_sauce:20,onion:40,salt:1?,oil:5?","stove",10,15,15,1,3,3,2,"pasta","saute","saucy spicy",["Soak soya chunks in just-boiled water until soft; squeeze dry|15","Boil pasta until al dente|10","Fry onion and soya 4 min|4","Add schezwan and tomato sauce; fold in the pasta"],"");
R("kettle_noodles","Kettle noodles with fresh crunch","Instant noodles with just a kettle, plus chilli sauce and raw veg.","Indo-Chinese","snack","noodles:1,chilli_sauce:10,onion:20?,cucumber:50?,tomato_sauce:5?","water",3,5,0,1,1,1,2,"noodle","kettle","spicy saucy",["Break the noodle cake into a bowl and cover with just-boiled water; cover 4 min|4","Drain most of the water; stir in sachet and chilli sauce","Top with raw onion and cucumber"],"Handle boiling water carefully.");
R("egg_bhurji","Egg bhurji","Spiced scrambled eggs with onion and tomato.","Indian","breakfast","egg:2,onion:40,tomato:50,salt:1,oil:8,green_chilli:1?,garam:1?","stove",5,8,0,1,1,1,2,"egg","saute","spicy comfort",["Heat oil; fry onion and chilli 3 min|3","Add tomato; cook 2 min|2","Beat in eggs with salt; stir until fully set|3"],"Cook eggs until firm throughout. Eat now.");
R("egg_masala","Egg masala","Boiled eggs in an onion-tomato masala.","Indian","dinner","egg:2,onion:80,tomato:100,garam:1.5,salt:2,oil:10,green_chilli:1?","stove",8,20,0,1,2,2,2,"egg","simmer","saucy spicy comfort",["Hard-boil the eggs 10 min, cool, peel|10","Fry onion in oil until golden; add tomato and spices; cook to a masala|10","Slit the eggs, add, and simmer 3 min|3"],"Cook eggs fully. Eat now.");
R("egg_chaat","Boiled egg chaat","Hard-boiled eggs with fresh onion and tomato.","Indian","snack","egg:2,onion:30,tomato:40,salt:1,pepper:1,cucumber:40?,lemon:0.5?,chilli_flakes:1?","stove",5,10,0,1,1,1,1,"egg","boil","tangy fresh",["Hard-boil eggs 10 min, cool and peel|10","Chop eggs and veg; toss with salt, pepper, flakes and lemon"],"Eat now; don't leave cooked eggs out.");
R("veg_pulao","Simple vegetable pulao","One-pot pulao with potato, onion and garam masala.","Indian","dinner","rice:80,onion:40,potato:80,garam:1.5,salt:2,oil:10,carrot:40?,green_chilli:1?","stove|rc",8,25,0,1,2,2,1,"rice","onepot","comfort",["Rinse the rice","Heat oil; fry onion, potato, carrot and spices 4 min|4","Add rice and about 2x water; cover and cook until done|18","Rest 5 min, fluff, eat"],"Cooked rice shouldn't sit out; eat it now.");
R("soya_pulao","Soya pulao","Protein-rich one-pot pulao with soya.","Indian","dinner","rice:70,soya_dry:30,onion:40,garam:1.5,salt:2,oil:10,green_chilli:1?","stove|rc",8,25,15,1,3,2,2,"rice","onepot","spicy comfort",["Soak soya chunks in just-boiled water until soft; squeeze dry|15","Fry onion and soya in oil with spices 4 min|4","Add rinsed rice and about 2x water; cook covered|18","Rest and fluff"],"Cooked rice shouldn't sit out; eat it now.");
R("rc_tomato_rice","Rice-cooker tomato rice","Tomato, onion and garam masala cooked with rice in a cooker.","Indian","dinner","rice:80,tomato:80,onion:40,garam:1,salt:2,oil:8?","rc",5,25,0,1,1,1,1,"rice","onepot","comfort",["Rinse rice; add to the cooker with chopped tomato, onion, spices, salt and water about 1.8x the rice","Start the cooker; when it clicks off, rest 5 min and fluff|25"],"Cooked rice shouldn't sit out; eat it now.");
R("moong_khichdi","Moong dal khichdi","Soft one-pot rice and moong comfort food.","Indian","dinner","rice:50,moong_dry:40,salt:2,turmeric:1?,oil:5?,ginger:3?,cumin:1?","stove|rc",5,30,15,1,1,1,0,"dal","onepot","comfort",["Rinse rice and moong together and soak|15","Cook with 4x water, salt and turmeric until completely soft and porridge-like|25","Finish with a little oil or ginger if you have it"],"Eat now; pulses and rice don't keep at room temperature.");
R("dal_tadka","Simple dal tadka","Toor dal with a tomato-onion tadka.","Indian","dinner","toor_dry:50,tomato:60,onion:40,salt:2,oil:8,turmeric:1?,cumin:1?,chilli_powder:1?","stove",8,45,20,1,2,2,1,"dal","simmer","comfort saucy",["Rinse the dal and soak|20","Boil with water, salt and turmeric until fully soft, about 40 min|40","Heat oil; fry cumin, onion, tomato; pour over the dal and simmer 3 min|5"],"Boil dal thoroughly. Eat now.");
R("moong_chilla","Moong dal chilla","Savoury lentil pancakes from soaked, ground moong.","Indian","breakfast","moong_dry:60,onion:30,green_chilli:1,salt:2,oil:5","stove,mixer",10,15,240,1,3,3,1,"dal","griddle","crispy",["Soak moong 4 hours|240","Grind with water, chilli and salt to a pourable batter","Heat a lightly oiled pan; spread a ladle of batter; sprinkle onion|3","Cook both sides until golden; repeat"],"Use the batter the same day; don't store it.");
R("jeera_aloo_roti","Jeera aloo with roti","Dry potato sabzi with fresh rotis.","Indian","dinner","potato:200,atta:70,oil:10,salt:2,cumin:1?,turmeric:1?,chilli_powder:1?","stove",15,35,0,1,3,3,1,"potato","saute","comfort",["Knead atta with water and a pinch of salt; rest 10 min|10","Fry cumin, add cubed potato, salt, spices and a splash of water; cover and cook until tender|20","Roll and cook rotis on a hot pan","Eat hot"],"");
R("bhel","Murmura bhel","No-cook puffed rice snack with fresh veg.","Indian","snack","murmura:40,onion:30,tomato:40,salt:1,cucumber:40?,peanuts:15?,tomato_sauce:10?,chilli_sauce:5?,lemon:0.5?","",8,0,0,1,1,1,1,"nocook","nocook","tangy crispy fresh",["Chop onion, tomato and cucumber","Mix everything just before eating so it stays crisp"],"Eat immediately.");
R("peanut_chaat","Peanut masala chaat","No-cook roasted peanut chaat.","Indian","snack","peanuts:40,onion:30,tomato:40,salt:1,cucumber:40?,green_chilli:1?,lemon:0.5?,chaat_masala:1?","",8,0,0,1,1,1,2,"nocook","nocook","tangy crispy fresh",["Chop onion, tomato, chilli and cucumber","Mix with peanuts, salt, lemon and chaat masala"],"Peanut allergen.");
R("roasted_chana_chaat","Roasted chana chaat","No-cook crunchy roasted chana chaat.","Indian","snack","roasted_chana:50,onion:30,tomato:40,salt:1,cucumber:40?,lemon:0.5?,chaat_masala:1?,chilli_flakes:1?","",8,0,0,1,1,1,1,"nocook","nocook","tangy crispy fresh",["Chop onion, tomato and cucumber","Toss with roasted chana, salt, lemon and chaat masala"],"");
R("kanda_poha","Kanda poha","Classic onion poha with peanuts.","Indian","breakfast","poha:60,onion:50,salt:1,oil:8,potato:40?,peanuts:15?,green_chilli:1?,lemon:0.5?,turmeric:1?","stove",8,10,0,1,1,1,1,"poha","saute","comfort tangy",["Rinse poha in a sieve until soft; drain well|3","Heat oil; fry peanuts, onion, chilli (and potato) until soft|7","Add poha, salt, turmeric; toss 2 min|2","Finish with lemon"],"");
R("kettle_poha","No-stove poha","Poha softened with hot water, tossed with raw veg.","Indian","breakfast","poha:60,salt:1,onion:30?,tomato:30?,peanuts:15?,lemon:0.5?,chilli_flakes:1?","water",5,0,5,1,1,1,1,"poha","kettle","tangy fresh",["Rinse the poha in a sieve","Pour a little just-boiled water over it; cover 5 min|5","Fluff; mix in salt, chopped onion or tomato, peanuts and lemon"],"");

// ---- explicit substitution map (recipe-specific where needed). Never silent: always listed in the result.
const SUBS=[
{f:"chilli_flakes",t:"green_chilli",q:1,m:"1 fresh chilli ≈ 1 g flakes; fresher heat",tc:0},
{f:"green_chilli",t:"chilli_flakes",q:1,m:"1 g flakes ≈ 1 green chilli",tc:0},
{f:"schezwan",t:"chilli_sauce",q:1,m:"Milder, less garlic",r:["schezwan_soya_noodles","pasta_soya"],tc:0},
{f:"tomato_sauce",t:"chilli_sauce",q:.7,m:"Hotter, thinner",r:["bhel","kettle_noodles","saucy_pasta"],tc:0},
{f:"soya_dry",t:"paneer",q:2.2,m:"No soaking needed (saves ~15 min), softer texture; adds dairy",r:["soya_noodles","soya_pulao"],tc:-15}
];
const NO_SUB_NOTE={channa_can:"Dry channa is not a substitute for cooked chickpeas: it needs overnight soaking and long boiling.",soya_dry:"Soya chunks cannot replace ready-to-eat protein without soaking and cooking."};

// ---- core helpers
const DR={vegan:0,veg:1,egg:2,non:3,any:3};
const recDiet=r=>r.ing.reduce((m,x)=>x.o?m:Math.max(m,I[x.id].dt),0);
const needFresh=(g,it)=>g.p===2||(g.ao&&it&&it.o);
const priceOf=(id,ctx)=>{const u=ctx.prices&&ctx.prices[id];return typeof u==="number"&&u>=0?u:I[id].pr};
const unitCost=(id,amt,ctx)=>amt>0?amt*priceOf(id,ctx)/I[id].nb:0;
const buyCost=(id,amt,ctx)=>{if(!(amt>0))return 0;const g=I[id];return Math.ceil(amt/g.pk)*g.pk*priceOf(id,ctx)/g.nb};
const roleW=g=>g.c===8?.25:(g.c===6||g.c===7)?.5:(g.c===4||g.c===5)?1:2;
function usable(id,ctx){
 const it=ctx.pantry[id],g=I[id];
 if(!it){if((ctx.staples||[]).includes(id))return{ok:true,q:null,unk:true,staple:true};return{ok:false,reason:"none"}}
 if(it.st==="out")return{ok:false,reason:"finished"};
 if(needFresh(g,it)&&ctx.prefs.setup==="none"&&!(it.t&&ctx.now-it.t<FRESH_MS))return{ok:false,reason:"stale"};
 const unk=typeof it.q!=="number"||!isFinite(it.q);
 return{ok:true,q:unk?null:it.q,unk,low:it.st==="low"};
}
const blocked=(id,P)=>I[id].al.some(a=>(P.exAl||[]).includes(a))||(P.exIng||[]).includes(id)||I[id].dt>DR[P.diet||"any"];

// ---- ingredient coverage (quantity-weighted)
function coverage(r,ctx){
 const P=ctx.prefs,sv=P.sv>0?P.sv:1,sc=sv/(r.sv>0?r.sv:1);
 const rows=[],miss=[],subs=[],used=[];let ws=0,cs=0,unc=0;
 for(const x of r.ing){
  const g=I[x.id],need=x.q*sc,u=usable(x.id,ctx);
  if(x.o){ if(!blocked(x.id,P)&&u.ok)used.push({id:x.id,q:need}); rows.push({x,g,need,u,st:u.ok?"have":"missing",opt:true});continue }
  const w=roleW(g);ws+=w;let c=0,st="have",have=0,sub=null;
  if(u.ok){ if(u.unk){c=1;st="uncertain";unc++;have=need} else{have=u.q;c=Math.min(u.q/need,1);st=c>=1?"have":"partial"} }
  else st=u.reason==="stale"?"stale":u.reason==="finished"?"finished":"missing";
  if(c<1&&P.subs!==false){
   const s=SUBS.find(s=>s.f===x.id&&(!s.r||s.r.includes(r.id))&&!blocked(s.t,P)&&(()=>{const v=usable(s.t,ctx);return v.ok&&(v.unk||v.q>=(need-have)*s.q)})());
   if(s){sub={from:x.id,to:s.t,q:Math.round((need-have)*s.q*10)/10,note:s.m,tc:s.tc};subs.push(sub);c=Math.max(c,.9);st="swap"}
  }
  const short=sub?0:Math.max(need-have,0);
  if(!sub&&c<1)miss.push({id:x.id,need:Math.round(need*10)/10,have:u.ok&&!u.unk?have:0,buy:Math.round(short*10)/10,cost:buyCost(x.id,short,ctx),reason:st});
  cs+=w*c;rows.push({x,g,need,u,st,have,sub});
 }
 return{rows,miss,subs,used,cov:ws?cs/ws:1,unc};
}

// ---- nutrition: sums ingredient quantity × density / servings. Unknown data => null, never zero.
function nutri(r,usedOpt,sv){
 const keys=["k","p","c","f","fi"],tot=[0,0,0,0,0];let unknown=false;
 const list=r.ing.filter(x=>!x.o).concat((usedOpt||[]).map(o=>({id:o.id,q:o.q/(sv>0?sv/r.sv:1)})));
 for(const x of list){const g=I[x.id];if(!g||!Array.isArray(g.n)){unknown=true;continue}for(let i=0;i<5;i++)tot[i]+=x.q*g.n[i]/g.nb}
 const d=r.sv>0?r.sv:1;
 if(unknown)return{k:null,p:null,c:null,f:null,fi:null,unknown:true};
 const o={unknown:false};keys.forEach((k,i)=>o[k]=Math.round(tot[i]/d*10)/10);return o;
}

// ---- food safety (conservative; no jokes, no guessed shelf lives)
const SAFE={
 channa_dry:"Dry channa needs overnight soaking and thorough boiling. It is not a quick-cook food, and under-cooked pulses are unsafe.",
 soya_dry:"Dry soya chunks are not ready-to-eat. Soak in hot water and cook before eating.",
 paneer:"Paneer is perishable. Buy it fresh the day you cook, or keep it refrigerated as per the pack. Do not treat it as a room-temperature staple.",
 channa_can:"Opened cooked chickpeas are perishable. Use the whole opened portion in one sitting and follow the pack label.",
 egg:"Cook eggs until white and yolk are firm. Never use cracked eggs.",
 rice:"Cooked rice should not sit at room temperature. Eat it now.",
 moong_dry:"Boil pulses until completely soft.",toor_dry:"Boil pulses until completely soft."
};
function safetyWarnings(r,ctx){
 const w=[];
 if(ctx.prefs.setup==="none"&&r.eq.length)w.push("Cook only the portion you'll eat now. You don't have a fridge for leftovers.");
 for(const x of r.ing){if(x.o)continue;const m=SAFE[x.id];if(m&&!w.includes(m))w.push(m)}
 return w;
}
const leftoverAdvice=setup=>setup==="none"?"No fridge: finish the meal in one sitting. Don't keep cooked food for later.":"Cool quickly, refrigerate within 2 hours, eat within a day or two, and reheat until steaming hot.";
const canKeepCooked=setup=>setup!=="none";

// ---- scoring
const DEFW={av:.30,af:.20,pri:.20,time:.10,nut:.10,taste:.05,clean:.05};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
function evaluate(r,ctx){
 const P=ctx.prefs,F=ctx.filters||{},sv=P.sv>0?P.sv:1;
 const rej=(kind,msg)=>({r,ok:false,kind,msg});
 if(recDiet(r)>DR[P.diet||"any"])return rej("diet","Doesn't match your diet.");
 for(const e of r.eq)if(!hasEq(e,P.eq))return rej("equipment","Needs "+EQN[e.split("|")[0]]+".");
 if(r.fridge&&P.setup==="none")return rej("fridge","Needs refrigeration.");
 for(const x of r.ing)if(!x.o&&blocked(x.id,P))return rej("allergen",I[x.id].name+" is excluded by your settings.");
 if(F.airfryer&&!r.eq.includes("airfryer")&&!r.eq.some(e=>e.includes("airfryer")))return rej("filter","Not an air-fryer recipe.");
 if(F.nocook&&r.eq.length)return rej("filter","Needs cooking.");
 if(F.onepot&&r.cl>2)return rej("filter","More cleanup than one-pot.");
 const total=r.prep+r.cook+r.wait,active=r.prep+r.cook;
 if(F.max&&total>F.max)return rej("time","Takes "+total+" min.");
 const c=coverage(r,ctx);
 if(c.miss.length&&!ctx.shop){
  const m=c.miss.map(x=>{const g=I[x.id];return x.reason==="stale"?g.name+" isn't safe to use without a fridge unless bought today":x.reason==="finished"?g.name+" is finished":g.name+" missing"});
  return rej("missing",m.join("; ")+".");
 }
 // cost: consumed (what the meal actually uses) vs incremental (what you'd have to buy)
 let consumed=0;for(const row of c.rows)if(!row.opt||c.used.some(u=>u.id===row.x.id))consumed+=unitCost(row.x.id,row.need,ctx);
 const cost=consumed/sv,incr=c.miss.reduce((a,m)=>a+m.cost,0);
 if(P.budget>0&&P.strictBudget&&cost>P.budget)return rej("budget","About "+Math.round(cost)+" per serving, over your strict budget.");
 const nut=nutri(r,c.used,sv);
 if(F.protein&&(nut.p==null||nut.p<15))return rej("filter","Under 15 g protein.");
 const w=Object.assign({},DEFW,P.w||{}),pri=F.pri||(P.pri&&P.pri[0])||"balanced";
 const B=P.budget>0?P.budget:0;
 const aff=clamp((B?(cost<=B?100:100-(cost-B)/B*100):60)-(B?Math.min(30,incr/B*30):Math.min(30,incr/60*30)));
 const tT=F.max||P.maxTime||0;
 const time=tT?(total<=tT?100:clamp(100-(total-tT)/tT*100)):clamp(100*(1-Math.min(total,240)/240));
 const pT=P.protT>0?P.protT:20,kT=P.calT>0?P.calT:550;
 const nutS=nut.unknown?50:clamp(50*Math.min(nut.p/pT,1)+50*(1-Math.min(Math.abs(nut.k-kT)/kT,1)));
 const ppr=nut.unknown||cost<=0?0:nut.p/cost;
 const taste=(P.likes||[]).length?clamp(60+20*r.tags.filter(t=>P.likes.includes(t)).length):60;
 const prio={cheap:clamp(100*(1-cost/80)),protein:nut.unknown?30:clamp(50*Math.min(nut.p/30,1)*2*.5+50*Math.min(ppr/3,1)),balanced:nutS,fast:time,taste,clean:clamp((5-r.cl)/4*100)}[pri]??nutS;
 const clean=clamp((5-r.cl)/4*100);
 const avail=c.cov*100;
 let score=(w.av*avail+w.af*aff+w.pri*prio+w.time*time+w.nut*nutS+w.taste*taste+w.clean*clean)/(w.av+w.af+w.pri+w.time+w.nut+w.taste+w.clean);
 if(ctx.hist&&ctx.hist.some(h=>h.rid===r.id&&ctx.now-h.t<72*3600e3))score-=5;
 score=clamp(score);
 const why=[];
 if(!c.miss.length)why.push(c.subs.length?"Works with a swap from your pantry.":incr===0?"You have everything. No extra shopping needed.":"");
 else why.push("Missing "+c.miss.length+": "+c.miss.map(m=>I[m.id].name.toLowerCase()).join(", ")+" (about ₹"+Math.round(incr)+" to buy).");
 if(!nut.unknown&&cost>0)why.push("~"+Math.round(nut.p)+" g protein for ~₹"+Math.round(cost)+".");
 if(total<=15)why.push("Ready in "+total+" minutes.");
 if(r.eq.includes("airfryer")&&r.cl<=2)why.push("Uses your air fryer with very little cleanup.");
 const mains=c.rows.filter(z=>!z.x.o&&(z.g.c===2||z.g.c===3||z.g.c===1)&&z.u.ok).map(z=>z.g.name.split(" (")[0].toLowerCase());
 if(mains.length&&!c.miss.length)why.push("Uses your "+mains.join(" and ")+".");
 return{r,ok:true,score,adj:score,cov:c.cov,miss:c.miss,subs:c.subs,rows:c.rows,incr,cost,consumed,nut,total,active,wait:r.wait,why:why.filter(Boolean),warns:safetyWarnings(r,ctx),conf:(c.unc>0||nut.unknown)?"low":"medium",unc:c.unc,pri};
}
const cmp=(a,b)=>(Math.round(b.score*100)-Math.round(a.score*100))||(b.cov-a.cov)||(a.incr-b.incr)||(a.total-b.total)||(a.r.id<b.r.id?-1:a.r.id>b.r.id?1:0);
function getRecommendations(ctx){
 const recipes=ctx.recipes||RECIPES;
 const all=recipes.map(r=>evaluate(r,ctx)),rejected=all.filter(x=>!x.ok),ok=all.filter(x=>x.ok).sort(cmp);
 // greedy diversity re-rank: similar dominant protein / cooking style slides down when similarly scored alternatives exist
 const pool=ok.slice(),ranked=[];
 while(pool.length){
  for(const x of pool)x.adj=x.score-6*ranked.filter(y=>y.r.grp===x.r.grp).length-3*ranked.filter(y=>y.r.style===x.r.style).length;
  let bi=0;for(let i=1;i<pool.length;i++){const a=pool[i],b=pool[bi],d=Math.round(a.adj*100)-Math.round(b.adj*100);if(d>0||(d===0&&cmp(a,b)<0))bi=i}
  ranked.push(pool.splice(bi,1)[0]);
 }
 let unlock=[];
 if(ranked.length<3){
  const c2=Object.assign({},ctx,{shop:true}),cnt={};
  for(const r of recipes){const e=evaluate(r,c2);if(e.ok&&e.miss.length===1)cnt[e.miss[0].id]=(cnt[e.miss[0].id]||0)+1}
  unlock=Object.keys(cnt).map(id=>({id,count:cnt[id]})).sort((a,b)=>b.count-a.count||(a.id<b.id?-1:1));
 }
 return{ranked,rejected,unlock};
}
function surprise(ranked,rand){const top=ranked.filter(x=>x.score>=(ranked[0]?ranked[0].score:0)-15).slice(0,5);return top.length?top[Math.floor((rand||Math.random)()*top.length)%top.length]:null}

// ---- pantry deduction: never removes a whole packet for a small portion
function consume(pantry,r,sv,sel){
 const out=JSON.parse(JSON.stringify(pantry)),sc=(sv>0?sv:1)/(r.sv>0?r.sv:1),changes=[];
 for(const x of r.ing){
  if(!sel.includes(x.id)||!out[x.id])continue;const it=out[x.id],need=x.q*sc;
  if(typeof it.q==="number"&&isFinite(it.q)){it.q=Math.max(0,Math.round((it.q-need)*10)/10);if(it.q===0)it.st="out";changes.push({id:x.id,used:need,left:it.q})}
  else{it.st="out";changes.push({id:x.id,used:null,left:null})}
 }
 return{pantry:out,changes};
}

// ---- shopping list: merge duplicates, subtract pantry; fresh-only perishables are bought on the day (no fridge)
const todayStr=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function shoppingList(plan,ctx,opt){
 const need={};
 for(const e of plan){const r=RECIPES.find(x=>x.id===e.rid);if(!r)continue;const sc=(e.sv>0?e.sv:1)/(r.sv>0?r.sv:1),isToday=e.day===todayStr(new Date(ctx.now));
  for(const x of r.ing){if(x.o&&!(opt&&opt.optional))continue;if(blocked(x.id,ctx.prefs))continue;
   const n=need[x.id]||(need[x.id]={id:x.id,today:0,future:0,days:[]});n[isToday?"today":"future"]+=x.q*sc;if(!n.days.includes(e.day))n.days.push(e.day)}}
 const items=[];
 for(const id of Object.keys(need).sort()){
  const n=need[id],g=I[id],it=ctx.pantry[id],total=n.today+n.future;let have=0,uncertain=false,fresh=false;
  const q=it&&it.st!=="out"?it.q:0;
  if(it&&it.st!=="out"&&typeof q!=="number")uncertain=true;
  const perish=g.p===2||(g.ao&&it&&it.o);
  let buy;
  if(perish&&ctx.prefs.setup==="none"){fresh=true;const freshQ=it&&it.t&&ctx.now-it.t<FRESH_MS&&typeof q==="number"?q:0;buy=Math.max(n.today-freshQ,0)+n.future}
  else{have=typeof q==="number"?q:0;buy=uncertain?0:Math.max(total-have,0)}
  buy=Math.round(buy*10)/10;
  if(buy<=0&&!uncertain)continue;
  items.push({id,name:g.name,u:g.u,need:Math.round(total*10)/10,have:Math.round(have*10)/10,buy,cost:buyCost(id,buy,ctx),fresh,uncertain,days:n.days.sort()});
 }
 return{items,total:items.reduce((a,i)=>a+i.cost,0)};
}

// ---- validation of persisted/imported data
function defaultState(){return{v:1,onb:false,prefs:{diet:"veg",setup:"none",eq:[],pri:["balanced"],budget:null,strictBudget:false,protT:20,calT:550,sv:1,spice:2,skill:"any",shop:false,maxTime:null,hist:true,subs:true,likes:[],exAl:[],exIng:[],w:{}},pantry:{},staples:[],prices:{},plan:[],hist:[],cook:null}}
function sanitize(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const d=defaultState(),p=raw.prefs&&typeof raw.prefs==="object"?raw.prefs:{},P=d.prefs;
 const num=(v,def,lo=0,hi=1e6)=>typeof v==="number"&&isFinite(v)&&v>=lo&&v<=hi?v:def;
 const arr=(v,ok)=>Array.isArray(v)?[...new Set(v.filter(ok))]:[];
 if(["vegan","veg","egg","non","any"].includes(p.diet))P.diet=p.diet;
 if(["none","fridge","limited"].includes(p.setup))P.setup=p.setup;
 P.eq=arr(p.eq,e=>EQ_OPTS.some(o=>o[0]===e));
 P.pri=arr(p.pri,e=>["cheap","protein","balanced","fast","taste","clean"].includes(e));if(!P.pri.length)P.pri=["balanced"];
 P.budget=p.budget==null?null:num(p.budget,null,1,5000);P.strictBudget=!!p.strictBudget;
 P.protT=num(p.protT,20,1,200);P.calT=num(p.calT,550,50,3000);P.sv=num(p.sv,1,1,8)||1;P.spice=num(p.spice,2,0,3);
 P.skill=["any","easy","medium"].includes(p.skill)?p.skill:"any";P.shop=!!p.shop;P.maxTime=p.maxTime==null?null:num(p.maxTime,null,1,1000);
 P.hist=p.hist!==false;P.subs=p.subs!==false;P.likes=arr(p.likes,e=>typeof e==="string"&&e.length<20);
 P.exAl=arr(p.exAl,e=>ALLERGENS.includes(e));P.exIng=arr(p.exIng,e=>!!I[e]);
 if(raw.pantry&&typeof raw.pantry==="object"&&!Array.isArray(raw.pantry))for(const id of Object.keys(raw.pantry)){
  const it=raw.pantry[id];if(!I[id]||!it||typeof it!=="object")continue;
  d.pantry[id]={id,q:typeof it.q==="number"&&isFinite(it.q)&&it.q>=0?it.q:null,st:["have","low","out"].includes(it.st)?it.st:"have",o:!!it.o,t:typeof it.t==="number"&&isFinite(it.t)?it.t:null};
 }
 d.staples=arr(raw.staples,e=>!!I[e]);
 if(raw.prices&&typeof raw.prices==="object")for(const id of Object.keys(raw.prices))if(I[id]&&typeof raw.prices[id]==="number"&&raw.prices[id]>=0)d.prices[id]=raw.prices[id];
 if(Array.isArray(raw.plan))d.plan=raw.plan.filter(e=>e&&RECIPES.some(r=>r.id===e.rid)&&/^\d{4}-\d\d-\d\d$/.test(e.day)).map(e=>({rid:e.rid,day:e.day,sv:num(e.sv,1,1,8)||1})).slice(0,60);
 if(Array.isArray(raw.hist))d.hist=raw.hist.filter(h=>h&&RECIPES.some(r=>r.id===h.rid)&&typeof h.t==="number").map(h=>({rid:h.rid,t:h.t,rate:num(h.rate,0,0,3)})).slice(-100);
 if(raw.cook&&typeof raw.cook==="object"&&RECIPES.some(r=>r.id===raw.cook.rid))d.cook={rid:raw.cook.rid,step:num(raw.cook.step,0,0,50),checks:raw.cook.checks&&typeof raw.cook.checks==="object"?raw.cook.checks:{}};
 d.onb=!!raw.onb;
 return d;
}
const PRESETS={
 sample:{eq:["induction","kettle","airfryer","mixer"],items:{pasta:300,noodles:4,soya_dry:200,channa_dry:250,paneer:200,tomato:300,onion:400,potato:500,cucumber:200,green_chilli:40,salt:500,pepper:50,garam:50,schezwan:150,chilli_sauce:150,tomato_sauce:200,oregano:20,chilli_flakes:30,mayo_tandoori:150}},
 staples:{eq:[],items:{rice:1000,atta:1000,toor_dry:500,moong_dry:500,poha:250,murmura:150,peanuts:200,roasted_chana:150,oil:500,turmeric:50,cumin:50,chilli_powder:50,chaat_masala:30,salt:500,onion:500,potato:500,tomato:300,garlic:50,ginger:50,lemon:4}}
};
