const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isPremium = false;
let subscriptionPlan = "premium";
let currentWeek = [];
let substitutionCursors = {};
let favoriteMeals = new Set();
let familyHousehold = null;
let currentUserId = null;

const plans={
any:[
  ["Berry oatmeal bowl","Chicken quinoa avocado bowl","Salmon brown rice & broccoli"],
  ["Eggs + whole-grain toast","Turkey hummus wrap","Chicken sweet potato bowls"],
  ["Greek yogurt berry parfait","Tuna avocado salad","Lemon chicken veggie rice"],
  ["Overnight oats + chia","Chicken spinach quinoa bowl","Shrimp vegetable stir-fry"],
  ["Veggie egg scramble","Black bean quinoa bowl","Turkey broccoli brown rice"],
  ["Banana peanut butter oats","Hummus chickpea wrap","Herb chicken & roasted vegetables"],
  ["Apple cinnamon oatmeal","Lentil tomato grain bowl","Salmon avocado salad"]
],
vegetarian:[
  ["Berry oatmeal bowl","Chickpea quinoa avocado bowl","Tofu brown rice & broccoli"],
  ["Eggs + whole-grain toast","Hummus veggie wrap","Lentil sweet potato bowls"],
  ["Greek yogurt berry parfait","Black bean avocado salad","Chickpea veggie rice"],
  ["Overnight oats + chia","Tofu spinach quinoa bowl","Chickpea vegetable stir-fry"],
  ["Veggie egg scramble","Lentil quinoa bowl","Black bean broccoli rice"],
  ["Banana peanut butter oats","Hummus chickpea wrap","Tofu roasted vegetable bowls"],
  ["Apple cinnamon oatmeal","Lentil tomato grain bowl","Chickpea avocado salad"]
],
highprotein:[
  ["Protein oats with berries","Chicken quinoa avocado bowl","Salmon brown rice & broccoli"],
  ["Eggs + whole-grain toast","Turkey hummus wrap","Chicken sweet potato bowls"],
  ["Greek yogurt protein parfait","Tuna avocado salad","Lean chicken veggie rice"],
  ["Egg & spinach scramble","Chicken spinach quinoa bowl","Shrimp vegetable stir-fry"],
  ["Cottage cheese berry bowl","Turkey broccoli brown rice","Chicken lentil power bowl"],
  ["Protein banana oats","Turkey chickpea wrap","Herb chicken & roasted vegetables"],
  ["Eggs + avocado toast","Salmon quinoa salad","Chicken broccoli sweet potato"]
],
lowercarb:[
  ["Eggs + avocado","Chicken spinach avocado salad","Salmon broccoli & roasted vegetables"],
  ["Greek yogurt berry bowl","Turkey hummus lettuce wrap","Chicken cauliflower veggie bowl"],
  ["Cottage cheese + berries","Tuna avocado salad","Lemon chicken spinach plate"],
  ["Eggs + spinach","Chicken avocado quinoa salad","Shrimp vegetable stir-fry"],
  ["Greek yogurt + chia","Turkey broccoli vegetable bowl","Chicken sweet potato greens"],
  ["Egg muffins + avocado","Hummus veggie lettuce wrap","Herb chicken & roasted vegetables"],
  ["Greek yogurt + fruit","Salmon avocado salad","Chicken broccoli zucchini bowl"]
],
mediterranean:[
  ["Greek yogurt + fruit","Chicken quinoa Greek salad","Salmon brown rice & broccoli"],
  ["Eggs + tomato toast","Turkey & hummus whole-grain wrap","Lemon chicken veggie rice"],
  ["Oatmeal + berries","Tuna avocado salad","Greek chicken spinach bowl"],
  ["Eggs + spinach","Chickpea quinoa Mediterranean bowl","Shrimp tomato vegetable skillet"],
  ["Yogurt + granola","Lentil tomato grain bowl","Herb chicken & roasted vegetables"],
  ["Avocado toast + eggs","Hummus chickpea wrap","Salmon avocado salad"],
  ["Fruit + yogurt","Chickpea avocado salad","Lemon chicken & sweet potatoes"]
],
familyfriendly:[
  ["Banana peanut butter oats","Chicken quinoa avocado bowl","Cheesy chicken brown rice & broccoli"],
  ["Eggs + whole-grain toast","Turkey hummus wrap","Chicken sweet potato bowls"],
  ["Greek yogurt berry parfait","Tuna avocado salad","Chicken veggie rice bowls"],
  ["Overnight oats + chia","Chicken spinach quinoa bowl","Turkey broccoli brown rice"],
  ["Veggie egg scramble","Black bean quinoa bowl","Chicken roasted vegetable bowls"],
  ["Banana peanut butter oats","Hummus chickpea wrap","Chicken whole-grain pasta & veggies"],
  ["Apple cinnamon oatmeal","Turkey avocado wrap","Chicken broccoli sweet potato"]
],
higherfiber:[
  ["Overnight oats + chia berries","Chickpea quinoa avocado bowl","Lentil tomato brown rice"],
  ["Oatmeal + apple + walnuts","Hummus veggie wrap","Black bean sweet potato bowls"],
  ["Greek yogurt berry chia bowl","Black bean avocado salad","Chickpea veggie rice"],
  ["Eggs + whole-grain toast","Lentil quinoa bowl","Tofu broccoli brown rice"],
  ["Oatmeal + berries","Lentil tomato grain bowl","Three-bean vegetable chili"],
  ["Banana peanut butter oats","Hummus chickpea wrap","Tofu roasted vegetable bowls"],
  ["Fruit + chia yogurt","Chickpea avocado salad","Lentil sweet potato bowl"]
]};

const healthyFoodChoices=[
  "Oats","Bananas","Berries","Greek yogurt","Eggs","Avocado","Apples","Peanut butter","Chia seeds",
  "Whole-grain bread","Spinach","Tomatoes","Broccoli","Carrots","Mixed vegetables","Sweet potatoes",
  "Brown rice","Quinoa","Chicken breast","Turkey","Salmon","Tuna","Shrimp","Tofu","Chickpeas",
  "Lentils","Black beans","Hummus","Almonds","Walnuts","Pumpkin seeds","Olive oil","Beans","Whole-grain tortillas"
];
const groceryCatalog=[...healthyFoodChoices];
const dietaryExclusionChoices=["Dairy","Eggs","Gluten","Nuts","Seafood","Soy","Poultry"];
const exclusionFoodMap={
  "Dairy":["Greek yogurt"],
  "Eggs":["Eggs"],
  "Gluten":["Whole-grain bread","Whole-grain tortillas"],
  "Nuts":["Almonds","Walnuts","Peanut butter","Pumpkin seeds"],
  "Seafood":["Salmon","Tuna","Shrimp"],
  "Soy":["Tofu"],
  "Poultry":["Chicken breast","Turkey"]
};
let dietaryExclusions = new Set();
let currentGroceries=[];
let preferredGroceries = new Set();

const healthyMealLibrary=[
  {type:"breakfast",name:"Berry oatmeal bowl",foods:["Oats","Berries","Greek yogurt","Pumpkin seeds"],cost:1,tags:["fiber"]},
  {type:"breakfast",name:"Banana peanut butter oats",foods:["Oats","Bananas","Peanut butter"],cost:1,tags:["protein","fiber"]},
  {type:"breakfast",name:"Eggs + whole-grain toast",foods:["Eggs","Whole-grain bread","Spinach"],cost:1,tags:["protein"]},
  {type:"breakfast",name:"Greek yogurt berry parfait",foods:["Greek yogurt","Berries","Almonds","Walnuts"],cost:2,tags:["protein","fiber"]},
  {type:"breakfast",name:"Overnight oats + chia",foods:["Oats","Chia seeds","Berries","Pumpkin seeds"],cost:1,tags:["fiber"]},
  {type:"breakfast",name:"Veggie egg scramble",foods:["Eggs","Spinach","Tomatoes","Mixed vegetables"],cost:1,tags:["protein"]},
  {type:"breakfast",name:"Apple cinnamon oatmeal",foods:["Oats","Apples","Walnuts"],cost:1,tags:["fiber"]},
  {type:"breakfast",name:"Avocado toast + eggs",foods:["Avocado","Whole-grain bread","Eggs"],cost:2,tags:["protein"]},
  {type:"breakfast",name:"Greek yogurt + fruit chia bowl",foods:["Greek yogurt","Apples","Chia seeds"],cost:1,tags:["protein","fiber"]},
  {type:"breakfast",name:"Spinach tomato egg bowl",foods:["Eggs","Spinach","Tomatoes","Avocado"],cost:2,tags:["protein"]},
  {type:"breakfast",name:"Oatmeal + banana + seeds",foods:["Oats","Bananas","Pumpkin seeds","Chia seeds"],cost:1,tags:["fiber"]},
  {type:"breakfast",name:"Yogurt berry walnut bowl",foods:["Greek yogurt","Berries","Walnuts"],cost:2,tags:["protein","fiber"]},
  {type:"breakfast",name:"Peanut butter apple oats",foods:["Oats","Apples","Peanut butter"],cost:1,tags:["fiber"]},

  {type:"lunch",name:"Chicken quinoa avocado bowl",foods:["Chicken breast","Quinoa","Avocado","Spinach","Olive oil"],cost:2,tags:["protein"]},
  {type:"lunch",name:"Turkey hummus whole-grain wrap",foods:["Turkey","Hummus","Whole-grain tortillas","Spinach"],cost:2,tags:["protein","mediterranean"]},
  {type:"lunch",name:"Tuna avocado salad",foods:["Tuna","Avocado","Spinach","Tomatoes","Olive oil"],cost:2,tags:["protein","lowercarb"]},
  {type:"lunch",name:"Chickpea quinoa Mediterranean bowl",foods:["Chickpeas","Quinoa","Tomatoes","Spinach","Hummus"],cost:1,tags:["fiber","mediterranean"]},
  {type:"lunch",name:"Black bean avocado salad",foods:["Black beans","Avocado","Tomatoes","Spinach"],cost:1,tags:["fiber","lowercarb"]},
  {type:"lunch",name:"Chicken spinach quinoa bowl",foods:["Chicken breast","Spinach","Quinoa","Carrots"],cost:2,tags:["protein"]},
  {type:"lunch",name:"Hummus veggie whole-grain wrap",foods:["Hummus","Whole-grain tortillas","Carrots","Spinach","Tomatoes"],cost:1,tags:["fiber","mediterranean"]},
  {type:"lunch",name:"Lentil tomato grain bowl",foods:["Lentils","Brown rice","Tomatoes","Carrots","Spinach"],cost:1,tags:["fiber"]},
  {type:"lunch",name:"Shrimp avocado quinoa salad",foods:["Shrimp","Avocado","Quinoa","Mixed vegetables"],cost:3,tags:["protein","lowercarb"]},
  {type:"lunch",name:"Tofu broccoli brown rice bowl",foods:["Tofu","Broccoli","Brown rice","Carrots"],cost:1,tags:["fiber","protein"]},
  {type:"lunch",name:"Salmon avocado salad",foods:["Salmon","Avocado","Spinach","Tomatoes","Olive oil"],cost:3,tags:["protein","lowercarb","mediterranean"]},
  {type:"lunch",name:"Turkey broccoli quinoa bowl",foods:["Turkey","Broccoli","Quinoa","Carrots"],cost:2,tags:["protein","fiber"]},
  {type:"lunch",name:"Three-bean quinoa salad",foods:["Beans","Black beans","Quinoa","Tomatoes","Spinach"],cost:1,tags:["fiber"]},
  {type:"lunch",name:"Chicken hummus veggie bowl",foods:["Chicken breast","Hummus","Spinach","Carrots","Tomatoes"],cost:2,tags:["protein","mediterranean"]},
  {type:"lunch",name:"Tuna whole-grain veggie wrap",foods:["Tuna","Whole-grain tortillas","Spinach","Tomatoes","Hummus"],cost:2,tags:["protein"]},
  {type:"lunch",name:"Lentil hummus quinoa bowl",foods:["Lentils","Hummus","Quinoa","Carrots"],cost:1,tags:["fiber","mediterranean"]},
  {type:"lunch",name:"Tofu avocado spinach bowl",foods:["Tofu","Avocado","Spinach","Tomatoes","Quinoa"],cost:2,tags:["protein","lowercarb"]},
  {type:"lunch",name:"Salmon quinoa veggie bowl",foods:["Salmon","Quinoa","Broccoli","Carrots"],cost:3,tags:["protein"]},
  {type:"lunch",name:"Black bean hummus wrap",foods:["Black beans","Hummus","Whole-grain tortillas","Spinach"],cost:1,tags:["fiber","mediterranean"]},

  {type:"dinner",name:"Salmon brown rice & broccoli",foods:["Salmon","Brown rice","Broccoli","Olive oil"],cost:3,tags:["protein","mediterranean"]},
  {type:"dinner",name:"Chicken sweet potato bowls",foods:["Chicken breast","Sweet potatoes","Spinach","Mixed vegetables"],cost:2,tags:["protein","fiber"]},
  {type:"dinner",name:"Lemon chicken veggie rice",foods:["Chicken breast","Brown rice","Mixed vegetables","Carrots","Olive oil"],cost:2,tags:["protein"]},
  {type:"dinner",name:"Shrimp vegetable stir-fry",foods:["Shrimp","Mixed vegetables","Broccoli","Brown rice"],cost:3,tags:["protein"]},
  {type:"dinner",name:"Turkey broccoli brown rice",foods:["Turkey","Broccoli","Brown rice","Carrots"],cost:2,tags:["protein","fiber"]},
  {type:"dinner",name:"Herb chicken & roasted vegetables",foods:["Chicken breast","Sweet potatoes","Broccoli","Carrots","Olive oil"],cost:2,tags:["protein","fiber","mediterranean"]},
  {type:"dinner",name:"Black bean sweet potato bowls",foods:["Black beans","Sweet potatoes","Avocado","Spinach"],cost:1,tags:["fiber","lowercarb"]},
  {type:"dinner",name:"Chickpea veggie rice",foods:["Chickpeas","Brown rice","Mixed vegetables","Spinach"],cost:1,tags:["fiber"]},
  {type:"dinner",name:"Tofu spinach quinoa bowl",foods:["Tofu","Spinach","Quinoa","Broccoli"],cost:1,tags:["protein","fiber"]},
  {type:"dinner",name:"Lentil tomato brown rice",foods:["Lentils","Brown rice","Tomatoes","Carrots"],cost:1,tags:["fiber"]},
  {type:"dinner",name:"Chicken broccoli sweet potato",foods:["Chicken breast","Broccoli","Sweet potatoes","Spinach"],cost:2,tags:["protein","fiber"]},
  {type:"dinner",name:"Turkey hummus whole-grain wrap",foods:["Turkey","Hummus","Whole-grain tortillas","Spinach","Tomatoes"],cost:2,tags:["protein","mediterranean"]},
  {type:"dinner",name:"Tuna avocado whole-grain wrap",foods:["Tuna","Avocado","Whole-grain tortillas","Spinach"],cost:2,tags:["protein","lowercarb"]},
  {type:"dinner",name:"Tofu roasted vegetable bowls",foods:["Tofu","Sweet potatoes","Mixed vegetables","Broccoli","Olive oil"],cost:1,tags:["protein","fiber"]},
  {type:"dinner",name:"White bean tomato vegetable stew",foods:["Beans","Tomatoes","Carrots","Mixed vegetables","Olive oil"],cost:1,tags:["fiber","mediterranean"]},
  {type:"dinner",name:"Chicken quinoa broccoli bowl",foods:["Chicken breast","Quinoa","Broccoli","Spinach"],cost:2,tags:["protein","fiber"]},
  {type:"dinner",name:"Turkey sweet potato veggie bowl",foods:["Turkey","Sweet potatoes","Mixed vegetables","Avocado"],cost:2,tags:["protein","fiber"]},
  {type:"dinner",name:"Chickpea spinach tomato stew",foods:["Chickpeas","Spinach","Tomatoes","Carrots","Olive oil"],cost:1,tags:["fiber","mediterranean"]},
  {type:"dinner",name:"Black bean quinoa stuffed peppers",foods:["Black beans","Quinoa","Tomatoes","Mixed vegetables"],cost:1,tags:["fiber"]},
  {type:"dinner",name:"Salmon sweet potato spinach plate",foods:["Salmon","Sweet potatoes","Spinach","Avocado"],cost:3,tags:["protein","lowercarb"]},
  {type:"dinner",name:"Shrimp quinoa veggie bowl",foods:["Shrimp","Quinoa","Broccoli","Avocado"],cost:3,tags:["protein"]},
  {type:"dinner",name:"Tofu hummus whole-grain bowl",foods:["Tofu","Hummus","Whole-grain tortillas","Spinach","Tomatoes"],cost:1,tags:["protein","fiber","mediterranean"]}
];

const mealFoodMap=Object.fromEntries(healthyMealLibrary.map(meal=>[meal.name,meal.foods]));
const mealMetaMap=Object.fromEntries(healthyMealLibrary.map(meal=>[meal.name,meal]));
const healthyMealsByType={
  breakfast:healthyMealLibrary.filter(meal=>meal.type==="breakfast"),
  lunch:healthyMealLibrary.filter(meal=>meal.type==="lunch"),
  dinner:healthyMealLibrary.filter(meal=>meal.type==="dinner")
};

const preferenceMealTemplates={};
healthyFoodChoices.forEach(food=>{
  preferenceMealTemplates[food]=healthyMealLibrary.filter(meal=>meal.foods.includes(food)).map(meal=>meal.name);
});

function preferredGroceriesStorageKey(){
  return currentUserId ? "smartmeal:preferred-groceries:" + currentUserId : "smartmeal:preferred-groceries";
}
function dietaryExclusionsStorageKey(){
  return currentUserId ? "smartmeal:dietary-exclusions:" + currentUserId : "smartmeal:dietary-exclusions";
}
function foodIsExcluded(food, exclusions){
  return exclusions.some(exclusion => (exclusionFoodMap[exclusion] || []).includes(food));
}
function loadPreferredGroceries(){
  try{
    const saved=JSON.parse(localStorage.getItem(preferredGroceriesStorageKey()) || "[]");
    preferredGroceries = new Set(saved.filter(item=>healthyFoodChoices.includes(item) && !foodIsExcluded(item,selectedDietaryExclusions())));
  }catch{ preferredGroceries = new Set(); }
  document.querySelectorAll("[data-preferred-grocery]").forEach(box=>box.checked=preferredGroceries.has(box.dataset.preferredGrocery));
  updatePreferredGroceryCount();
}
function loadDietaryExclusions(){
  try{
    const saved=JSON.parse(localStorage.getItem(dietaryExclusionsStorageKey()) || "[]");
    dietaryExclusions = new Set(saved.filter(item=>dietaryExclusionChoices.includes(item)));
  }catch{ dietaryExclusions = new Set(); }
  document.querySelectorAll("[data-dietary-exclusion]").forEach(box=>box.checked=dietaryExclusions.has(box.dataset.dietaryExclusion));
  document.querySelectorAll("[data-preferred-grocery]").forEach(box=>{
    if(foodIsExcluded(box.dataset.preferredGrocery,selectedDietaryExclusions())) box.checked=false;
  });
  preferredGroceries=new Set(selectedPreferredGroceries());
  updatePreferredGroceryCount();
  updateDietaryExclusionCount();
}
function selectedDietaryExclusions(){
  return Array.from(document.querySelectorAll("[data-dietary-exclusion]:checked")).map(box=>box.dataset.dietaryExclusion);
}
function selectedPreferredGroceries(){
  return [...new Set(Array.from(document.querySelectorAll("[data-preferred-grocery]:checked"))
    .map(box=>box.dataset.preferredGrocery)
    .filter(food=>!foodIsExcluded(food,selectedDietaryExclusions())))]
    .slice(0,12);
}
function savePreferredGroceries(){
  preferredGroceries=new Set(selectedPreferredGroceries());
  localStorage.setItem(preferredGroceriesStorageKey(),JSON.stringify(Array.from(preferredGroceries)));
  updatePreferredGroceryCount();
}
function saveDietaryExclusions(){
  dietaryExclusions=new Set(selectedDietaryExclusions());
  document.querySelectorAll("[data-preferred-grocery]").forEach(box=>{
    if(foodIsExcluded(box.dataset.preferredGrocery,[...dietaryExclusions])) box.checked=false;
  });
  preferredGroceries=new Set(selectedPreferredGroceries());
  localStorage.setItem(dietaryExclusionsStorageKey(),JSON.stringify(Array.from(dietaryExclusions)));
  localStorage.setItem(preferredGroceriesStorageKey(),JSON.stringify(Array.from(preferredGroceries)));
  updatePreferredGroceryCount();
  updateDietaryExclusionCount();
}
function updatePreferredGroceryCount(){
  const count=document.getElementById("preferred-grocery-count");
  if(count) count.textContent=selectedPreferredGroceries().length+" / 12";
}
function updateDietaryExclusionCount(){
  const count=document.getElementById("dietary-exclusion-count");
  if(count) count.textContent=selectedDietaryExclusions().length;
}
function mealUsesPreference(meal,item){
  const foods=mealFoodMap[meal];
  return Array.isArray(foods) && foods.includes(item);
}
function mealMatchesTarget(meal,target){
  const tags=(mealMetaMap[meal]?.tags || []);
  return tags.includes(target);
}
function mealCostTier(meal){
  return mealMetaMap[meal]?.cost || 2;
}
function isMealExcluded(meal,exclusions){
  const foods=mealFoodMap[meal] || [];
  if(exclusions.includes("Poultry") && foods.some(food=>["Chicken breast","Turkey"].includes(food))) return true;
  if(exclusions.includes("Dairy") && foods.includes("Greek yogurt")) return true;
  if(exclusions.includes("Eggs") && foods.includes("Eggs")) return true;
  if(exclusions.includes("Gluten") && foods.some(food=>["Whole-grain bread","Whole-grain tortillas"].includes(food))) return true;
  if(exclusions.includes("Nuts") && foods.some(food=>["Almonds","Walnuts","Peanut butter","Pumpkin seeds"].includes(food))) return true;
  if(exclusions.includes("Seafood") && foods.some(food=>["Salmon","Tuna","Shrimp"].includes(food))) return true;
  if(exclusions.includes("Soy") && foods.includes("Tofu")) return true;
  return false;
}
function isMealCompatible(meal,diet,exclusions=[]){
  if(diet==="vegetarian" && /(chicken|turkey|salmon|tuna|shrimp)/i.test(meal)) return false;
  return !isMealExcluded(meal,exclusions);
}
function targetTagForPlan(requestedTarget){
  return requestedTarget==="highprotein" ? "protein"
    : requestedTarget==="lowercarb" ? "lowercarb"
    : requestedTarget==="higherfiber" ? "fiber"
    : requestedTarget==="mediterranean" ? "mediterranean"
    : "";
}
function budgetTargetTier(budget){
  return budget==="tight" ? 1 : budget==="low" ? 1.5 : budget==="high" ? 2.5 : budget==="premium" ? 3 : 2;
}
function scorePlannerMeal(meal,selected,remaining,target,budget,usedCounts,recentMeals,optimizer){
  const foods=mealFoodMap[meal] || [];
  let score=0;
  const preferenceMatches=selected.filter(food=>foods.includes(food)).length;
  const newCoverage=remaining.filter(food=>foods.includes(food)).length;
  score += preferenceMatches*28 + newCoverage*45;
  if(target && mealMatchesTarget(meal,target)) score += 18;
  const tier=budgetTargetTier(budget);
  score += Math.max(0,6-Math.abs(mealCostTier(meal)-tier)*5);
  const used=usedCounts[meal] || 0;
  score -= used*55;
  if(recentMeals.includes(meal)) score -= 30;
  if(optimizer && recentMeals.length){
    const shared=recentMeals.flatMap(name=>mealFoodMap[name]||[]).filter(food=>foods.includes(food));
    score += Math.min(3,new Set(shared).size)*5;
  }
  return score;
}
function chooseMealForSlot(type,selected,remaining,target,budget,usedCounts,recentMeals,diet,exclusions,optimizer,baseMeal){
  let pool=healthyMealsByType[type].filter(meal=>!usedCounts[meal.name] && isMealCompatible(meal.name,diet,exclusions));
  if(baseMeal && !usedCounts[baseMeal] && mealFoodMap[baseMeal] && isMealCompatible(baseMeal,diet,exclusions)) pool=[{name:baseMeal,foods:mealFoodMap[baseMeal],cost:mealCostTier(baseMeal),tags:mealMetaMap[baseMeal]?.tags||[]},...pool];
  const dedup=new Map(pool.map(meal=>[meal.name,meal]));
  pool=[...dedup.values()];
  pool.sort((a,b)=>{
    const sa=scorePlannerMeal(a.name,selected,remaining,target,budget,usedCounts,recentMeals,optimizer);
    const sb=scorePlannerMeal(b.name,selected,remaining,target,budget,usedCounts,recentMeals,optimizer);
    return sb-sa;
  });
  return pool[0] || null;
}
function personalizeWeek(basePlan,diet,selected,exclusions=[],target="",budget="mid",optimizer=false){
  const week=Array.from({length:7},()=>[null,null,null]);
  const usedCounts={};
  const covered=new Set();
  const types=["breakfast","lunch","dinner"];

  const compatibleSelected=selected.filter(food=>!foodIsExcluded(food,exclusions));
  const selectionOrder=[...compatibleSelected].sort((a,b)=>{
    const ac=healthyMealLibrary.filter(meal=>meal.foods.includes(a)&&isMealCompatible(meal.name,diet,exclusions)).length;
    const bc=healthyMealLibrary.filter(meal=>meal.foods.includes(b)&&isMealCompatible(meal.name,diet,exclusions)).length;
    return ac-bc;
  });

  // First pass: each chosen food gets a real slot whenever a compatible meal exists.
  for(const food of selectionOrder){
    let best=null;
    for(let day=0;day<7;day++){
      for(let slot=0;slot<3;slot++){
        if(week[day][slot]) continue;
        const type=types[slot];
        const candidates=healthyMealsByType[type].filter(meal=>!usedCounts[meal.name]&&isMealCompatible(meal.name,diet,exclusions)&&meal.foods.includes(food));
        for(const meal of candidates){
          const newCoverage=selected.filter(item=>!covered.has(item)&&meal.foods.includes(item)).length;
          const score=newCoverage*80 + scorePlannerMeal(meal.name,selected,selected.filter(item=>!covered.has(item)),target,budget,usedCounts,week[day].filter(Boolean),optimizer) - day;
          if(!best || score>best.score) best={day,slot,meal,score};
        }
      }
    }
    if(best){
      week[best.day][best.slot]=best.meal.name;
      usedCounts[best.meal.name]=(usedCounts[best.meal.name]||0)+1;
      best.meal.foods.forEach(item=>{if(selected.includes(item))covered.add(item);});
    }
  }

  // Second pass: fill every remaining breakfast/lunch/dinner slot while preserving variety.
  for(let day=0;day<7;day++){
    for(let slot=0;slot<3;slot++){
      if(week[day][slot]) continue;
      const pick=chooseMealForSlot(types[slot],selected,selected.filter(item=>!covered.has(item)),target,budget,usedCounts,week[day].filter(Boolean),diet,exclusions,optimizer,basePlan?.[day]?.[slot]);
      if(pick){
        week[day][slot]=pick.name;
        usedCounts[pick.name]=(usedCounts[pick.name]||0)+1;
        (mealFoodMap[pick.name]||[]).forEach(item=>{if(selected.includes(item))covered.add(item);});
      }
    }
  }

  return week;
}

const groceryRules=[
  {pattern:/oatmeal|overnight oats|protein oats|oat/i,items:["Oats"]},
  {pattern:/banana/i,items:["Bananas"]},
  {pattern:/apple/i,items:["Apples"]},
  {pattern:/egg|omelet|muffin/i,items:["Eggs"]},
  {pattern:/whole-grain (toast|bread)|toast|french toast/i,items:["Whole-grain bread"]},
  {pattern:/yogurt/i,items:["Greek yogurt"]},
  {pattern:/berries/i,items:["Berries"]},
  {pattern:/granola/i,items:["Granola"]},
  {pattern:/peanut butter/i,items:["Peanut butter"]},
  {pattern:/chia/i,items:["Chia seeds"]},
  {pattern:/almond/i,items:["Almonds"]},
  {pattern:/walnut/i,items:["Walnuts"]},
  {pattern:/pumpkin seed/i,items:["Pumpkin seeds"]},
  {pattern:/avocado/i,items:["Avocado"]},
  {pattern:/spinach/i,items:["Spinach"]},
  {pattern:/tomato/i,items:["Tomatoes"]},
  {pattern:/broccoli/i,items:["Broccoli"]},
  {pattern:/carrot/i,items:["Carrots"]},
  {pattern:/sweet potato/i,items:["Sweet potatoes"]},
  {pattern:/mixed vegetable|vegetable|veggie|zucchini|cauliflower/i,items:["Mixed vegetables"]},
  {pattern:/chicken/i,items:["Chicken breast"]},
  {pattern:/turkey|beef/i,items:["Turkey"]},
  {pattern:/salmon/i,items:["Salmon"]},
  {pattern:/tuna/i,items:["Tuna"]},
  {pattern:/shrimp/i,items:["Shrimp"]},
  {pattern:/tofu/i,items:["Tofu"]},
  {pattern:/chickpea/i,items:["Chickpeas"]},
  {pattern:/lentil/i,items:["Lentils"]},
  {pattern:/black bean/i,items:["Black beans"]},
  {pattern:/bean/i,items:["Beans"]},
  {pattern:/brown rice|rice/i,items:["Brown rice"]},
  {pattern:/quinoa/i,items:["Quinoa"]},
  {pattern:/whole-grain tortilla|tortilla|wrap|taco|quesadilla|lettuce wrap/i,items:["Whole-grain tortillas"]},
  {pattern:/hummus/i,items:["Hummus"]},
  {pattern:/olive oil/i,items:["Olive oil"]}
];

function ingredientsForMeal(meal){
  const exact=mealFoodMap[meal];
  if(Array.isArray(exact) && exact.length) return [...exact];
  const found=[];
  groceryRules.forEach(rule=>{
    if(rule.pattern.test(meal)){
      rule.items.forEach(item=>{ if(!found.includes(item)) found.push(item); });
    }
  });
  if(found.length===0) return /leftover/i.test(meal) ? ["Brown rice","Mixed vegetables"] : ["Mixed vegetables"];
  return found;
}

const groceryMeta={
  "Oats":{category:"Pantry & grains",unit:"cups",perPerson:0.5},
  "Bananas":{category:"Produce",unit:"each",perPerson:1},
  "Berries":{category:"Produce",unit:"cups",perPerson:0.75},
  "Greek yogurt":{category:"Dairy & alternatives",unit:"cups",perPerson:0.75},
  "Eggs":{category:"Protein",unit:"eggs",perPerson:2},
  "Avocado":{category:"Produce",unit:"each",perPerson:0.5},
  "Apples":{category:"Produce",unit:"each",perPerson:1},
  "Peanut butter":{category:"Pantry & grains",unit:"tbsp",perPerson:2},
  "Chia seeds":{category:"Pantry & grains",unit:"tbsp",perPerson:1},
  "Whole-grain bread":{category:"Pantry & grains",unit:"slices",perPerson:2},
  "Almonds":{category:"Pantry & grains",unit:"oz",perPerson:1},
  "Walnuts":{category:"Pantry & grains",unit:"oz",perPerson:1},
  "Pumpkin seeds":{category:"Pantry & grains",unit:"oz",perPerson:1},
  "Spinach":{category:"Produce",unit:"cups",perPerson:1},
  "Tomatoes":{category:"Produce",unit:"cups",perPerson:0.5},
  "Broccoli":{category:"Produce",unit:"cups",perPerson:1},
  "Carrots":{category:"Produce",unit:"cups",perPerson:0.5},
  "Mixed vegetables":{category:"Produce",unit:"cups",perPerson:1},
  "Sweet potatoes":{category:"Produce",unit:"each",perPerson:1},
  "Chicken breast":{category:"Protein",unit:"oz",perPerson:6},
  "Turkey":{category:"Protein",unit:"oz",perPerson:5},
  "Salmon":{category:"Protein",unit:"oz",perPerson:6},
  "Tuna":{category:"Protein",unit:"oz",perPerson:5},
  "Shrimp":{category:"Protein",unit:"oz",perPerson:6},
  "Tofu":{category:"Protein",unit:"oz",perPerson:5},
  "Chickpeas":{category:"Protein & beans",unit:"cups",perPerson:0.75},
  "Lentils":{category:"Protein & beans",unit:"cups",perPerson:0.75},
  "Black beans":{category:"Protein & beans",unit:"cups",perPerson:0.75},
  "Beans":{category:"Protein & beans",unit:"cups",perPerson:0.75},
  "Hummus":{category:"Pantry & grains",unit:"tbsp",perPerson:3},
  "Brown rice":{category:"Pantry & grains",unit:"cups cooked",perPerson:0.75},
  "Quinoa":{category:"Pantry & grains",unit:"cups cooked",perPerson:0.75},
  "Whole-grain tortillas":{category:"Pantry & grains",unit:"each",perPerson:1},
  "Olive oil":{category:"Pantry & grains",unit:"tbsp",perPerson:1}
};

function groceryBudgetLabel(budget){
  return budget==="tight" ? "$50–$70" : budget==="low" ? "$70–$90" : budget==="mid" ? "$90–$120" : budget==="high" ? "$120–$160" : "$160+";
}

function formatGroceryQuantity(value,unit){
  const rounded=Math.round(value*10)/10;
  const clean=Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  if(unit==="tbsp" && rounded>=16) return (Math.round(rounded/16*10)/10)+" cups";
  if(unit==="oz" && rounded>=16) return (Math.round(rounded/16*10)/10)+" lb";
  return clean+" "+unit;
}

function buildGroceryList(week,people=4,budget="mid"){
  const map=new Map();
  const servingCount=Number(people)||4;

  week.flat().forEach(meal=>{
    ingredientsForMeal(meal).forEach(item=>{
      const meta=groceryMeta[item] || {category:"Other",unit:"each",perPerson:1};
      if(!map.has(item)) map.set(item,{item,category:meta.category,unit:meta.unit,perPerson:meta.perPerson,count:0,meals:new Set()});
      const entry=map.get(item);
      entry.count += 1;
      entry.meals.add(meal);
    });
  });

  currentGroceries=Array.from(map.values())
    .map(entry=>({
      item:entry.item,
      category:entry.category,
      quantity:formatGroceryQuantity(entry.count*entry.perPerson*servingCount,entry.unit),
      meals:Array.from(entry.meals),
      servings:entry.count*servingCount
    }))
    .sort((a,b)=>a.category.localeCompare(b.category)||a.item.localeCompare(b.item));

  return currentGroceries;
}

const groceryCategoryOrder=["Produce","Protein","Protein & beans","Dairy & alternatives","Pantry & grains","Other"];

function groceryCategories(items){
  const groups=new Map(groceryCategoryOrder.map(category=>[category,[]]));
  items.forEach(item=>{
    if(!groups.has(item.category)) groups.set(item.category,[]);
    groups.get(item.category).push(item);
  });
  return Array.from(groups.entries()).filter(([,entries])=>entries.length);
}

const substitutions={
  "Chicken rice bowls":["Turkey rice bowls","Tofu rice bowls","Chicken quinoa bowls"],
  "Turkey tacos":["Chicken tacos","Black bean tacos","Turkey lettuce tacos"],
  "Chicken pasta":["Turkey pasta","Chickpea pasta","Chicken pesto pasta"],
  "Chicken stir-fry":["Turkey stir-fry","Tofu stir-fry","Shrimp stir-fry"],
  "Bean & beef chili":["Turkey chili","Three-bean chili","Lentil chili"],
  "Chicken wraps":["Turkey wraps","Hummus veggie wraps","Tuna wraps"],
  "Chickpea rice bowls":["Black bean rice bowls","Tofu rice bowls","Lentil rice bowls"],
  "Black bean tacos":["Lentil tacos","Chicken tacos","Tofu tacos"],
  "Lentil pasta":["Chickpea pasta","Turkey pasta","Tomato basil pasta"],
  "Tofu stir-fry":["Chickpea stir-fry","Chicken stir-fry","Turkey stir-fry"],
  "Vegetarian chili":["Three-bean chili","Lentil chili","Chickpea chili"],
  "Chicken salad bowls":["Turkey salad bowls","Tofu salad bowls","Tuna salad bowls"],
  "Turkey lettuce tacos":["Chicken lettuce tacos","Black bean lettuce tacos","Turkey taco salad"],
  "Chicken pesto vegetables":["Turkey pesto vegetables","Tofu pesto vegetables","Chicken salad"]
};

function showToast(message){
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(window.smartMealToastTimer);
  window.smartMealToastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 2800);
}

function recipeQuantity(food,people){
  const meta=groceryMeta[food];
  if(!meta) return "as needed";
  const factor=meta.unit==="eggs" ? meta.perPerson*people : meta.perPerson*people;
  return formatGroceryQuantity(factor,meta.unit);
}

function recipeSteps(meal,type){
  const name=meal.toLowerCase();
  if(name.includes("oatmeal") || name.includes("overnight oats") || name.includes("protein oats") || name.includes("chia"))
    return ["Combine the oats and listed toppings with the liquid of your choice.","Cook gently on the stove until creamy, or refrigerate overnight for an overnight-oat version.","Add fruit, seeds, or nut butter just before serving."];
  if(name.includes("egg") || name.includes("scramble") || name.includes("egg bowl"))
    return ["Whisk the eggs and prepare the vegetables.","Cook the vegetables in a lightly oiled skillet until tender.","Add the eggs and gently stir until set. Serve with the listed toast or toppings."];
  if(name.includes("yogurt"))
    return ["Spoon the yogurt into serving bowls.","Layer in the fruit and listed seeds or nuts.","Serve chilled and add a small drizzle of nut butter or honey if desired."];
  if(name.includes("wrap") || name.includes("taco") || name.includes("tortilla") || name.includes("quesadilla"))
    return ["Warm the whole-grain tortilla in a dry skillet.","Prepare the filling by cooking the protein or warming the beans and vegetables.","Layer the filling with the listed vegetables or hummus, fold, and serve."];
  if(name.includes("salad"))
    return ["Wash and chop the vegetables.","Cook and cool the protein or grains if needed.","Toss everything with olive oil or your preferred simple dressing and serve."];
  if(name.includes("bowl") || name.includes("rice") || name.includes("quinoa") || type==="dinner" || type==="lunch")
    return ["Cook the grain or base according to its package directions.","Cook the protein and vegetables until fully done and tender.","Combine the cooked ingredients in bowls and finish with the listed toppings or olive oil."];
  return ["Prepare the listed ingredients.","Cook the main ingredients until fully done.","Combine, season to taste, and serve."];
}

function recipeTypeLabel(type){
  return type ? type.charAt(0).toUpperCase()+type.slice(1) : "Meal";
}

function openRecipe(meal){
  const modal=document.getElementById("recipe-modal");
  if(!modal) return;
  const meta=mealMetaMap[meal] || {type:"meal",foods:ingredientsForMeal(meal),cost:2,tags:[]};
  const people=Number(document.getElementById("people")?.value)||4;
  const ingredients=(meta.foods||ingredientsForMeal(meal)).map(food=>{
    const qty=recipeQuantity(food,people);
    return "<li><span>"+escapeHtml(food)+"</span><strong>"+escapeHtml(qty)+"</strong></li>";
  }).join("");
  const directions=recipeSteps(meal,meta.type).map(step=>"<li>"+escapeHtml(step)+"</li>").join("");
  const tagText=(meta.tags||[]).map(tag=>tag==="protein"?"higher protein":tag==="fiber"?"fiber-focused":tag==="lowercarb"?"lower carb":tag==="mediterranean"?"Mediterranean":"").filter(Boolean);
  document.getElementById("recipe-type").textContent=recipeTypeLabel(meta.type);
  document.getElementById("recipe-title").textContent=meal;
  document.getElementById("recipe-meta").textContent=people+" "+(people===1?"serving":"servings")+(tagText.length ? " · "+tagText.join(" · ") : "");
  document.getElementById("recipe-ingredients").innerHTML=ingredients;
  document.getElementById("recipe-directions").innerHTML=directions;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
}

function closeRecipe(){
  const modal=document.getElementById("recipe-modal");
  if(!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
}

function selectMeal(meal){
  openRecipe(meal);
}

function handleCheckoutReturn(){
  const params = new URLSearchParams(window.location.search);
  const result = params.get("premium");
  if (!result) return;

  if (result === "success") {
    showToast("Payment received. Your subscription is being activated.");
    setTimeout(refreshPremiumStatus, 1200);
    setTimeout(refreshPremiumStatus, 4000);
  } else if (result === "cancel") {
    showToast("Checkout canceled. No payment was made.");
  }

  const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
  window.history.replaceState({}, document.title, cleanUrl);
}

function escapeHtml(value){
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function refreshPremiumStatus(){
  try {
    const { data } = await supabaseClient.auth.getSession();

    const signupButton = document.getElementById("signup-button");
    const signoutButton = document.getElementById("signout-button");
    const status = document.getElementById("account-status");

    if (!data.session) {
      isPremium = false;
      if (signupButton) signupButton.style.display = "inline-flex";
      if (signoutButton) signoutButton.style.display = "none";
      if (status) status.style.display = "none";
      subscriptionPlan = "premium";
      currentUserId = null;
      updatePremiumUI();
      await loadSavedPlans();
      await loadFavorites();
      await loadFamilyHousehold();
      return;
    }

    if (signupButton) signupButton.style.display = "none";
    if (signoutButton) signoutButton.style.display = "inline-flex";
    if (status) status.style.display = "inline-flex";
    currentUserId = data.session.user.id;

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("is_premium, subscription_plan, subscription_status")
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    if (error) {
      console.error("SmartMeal premium status error:", error);
      isPremium = false;
    } else {
      isPremium = profile?.is_premium === true;
      subscriptionPlan = profile?.subscription_plan || "premium";
    }

    updatePremiumUI();
    await loadSavedPlans();
    await loadFavorites();
    await loadFamilyHousehold();
  } catch (error) {
    console.error("SmartMeal premium status error:", error);
    isPremium = false;
    subscriptionPlan = "premium";
    updatePremiumUI();
    await loadSavedPlans();
    await loadFavorites();
    await loadFamilyHousehold();
  }
}

function updatePremiumUI(){
  const tools = document.getElementById("premium-tools");
  const upsell = document.getElementById("premium-upsell");
  const status = document.getElementById("account-status");

  if (tools) tools.style.display = isPremium ? "block" : "none";
  if (upsell) upsell.style.display = isPremium ? "none" : "block";

  if (status) {
    status.textContent = isPremium ? (subscriptionPlan === "family" ? "✨ Family Premium" : "✨ Premium") : "Free";
  }
}

function requirePremium(actionName){
  if (isPremium) return true;
  showToast(actionName + " is a Premium feature. Upgrade to unlock it.");
  return false;
}

function generate(){
  const people=+document.getElementById("people").value;
  const budget=document.getElementById("budget").value;
  const diet=document.getElementById("diet").value;
  const base={tight:60,low:80,mid:105,high:140,premium:175}[budget];
  const cost=Math.round(base*people/4);
  const requestedTarget=document.getElementById("nutrition-target")?.value || "balanced";
  const optimizerCheckbox=document.getElementById("reuse-optimizer");
  let plan=plans[diet] || plans.any;
  let targetNote="";
  if(requestedTarget!=="balanced"){
    if(!requirePremium("Nutrition focus")){
      const nutrition=document.getElementById("nutrition-target");
      if(nutrition) nutrition.value="balanced";
    }else if(requestedTarget==="highprotein"){ plan=plans.highprotein; targetNote=" · higher protein";
    }else if(requestedTarget==="lowercarb"){ plan=plans.lowercarb; targetNote=" · lower carb";
    }else if(requestedTarget==="higherfiber"){ plan=plans.higherfiber; targetNote=" · higher fiber";
    }else if(requestedTarget==="mediterranean"){ plan=plans.mediterranean; targetNote=" · Mediterranean focus"; }
  }
  if(optimizerCheckbox?.checked && !isPremium) optimizerCheckbox.checked=false;
  if(isPremium && optimizerCheckbox?.checked) targetNote+=" · ingredient reuse optimized";
  const selectedPreferences=selectedPreferredGroceries();
  const selectedExclusions=selectedDietaryExclusions();
  const optimizerEnabled=isPremium && optimizerCheckbox?.checked===true;
  const selectedTarget=targetTagForPlan(requestedTarget);
  currentWeek=personalizeWeek(plan,diet,selectedPreferences,selectedExclusions,selectedTarget,budget,optimizerEnabled);
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const mealTypes=["Breakfast","Lunch","Dinner"];
  const covered=selectedPreferences.filter(food=>currentWeek.flat().some(meal=>mealUsesPreference(meal,food)));
  const coveredText=selectedPreferences.length || selectedExclusions.length
    ? `<div class="preference-summary">${selectedPreferences.length ? `<strong>Built around your foods:</strong> ${escapeHtml(covered.join(", "))} <span>· ${covered.length}/${selectedPreferences.length} selected foods used</span>` : ""}${selectedExclusions.length ? `<small class="preference-exclusions"><strong>Avoiding:</strong> ${escapeHtml(selectedExclusions.join(", "))}</small>` : ""}</div>`
    : `<div class="preference-summary muted">Choose healthy foods above and SmartMeal will build your 7-day plan around them.</div>`;
  document.getElementById("result").innerHTML=
    `<h3>Your personalized 7-day week <span style="color:#2e7d50">· 21 meals</span><small>3 meals per day · about ${cost}${escapeHtml(targetNote)}</small></h3>
    ${coveredText}
    <div class="week">${currentWeek.map((d,i)=>
      `<div class="day"><b>${days[i]}</b>${d.map((m,slot)=>
        `<div class="meal-slot"><span class="meal-type">${mealTypes[slot]}</span><button type="button" class="meal" data-meal="${escapeHtml(m)}">${escapeHtml(m)}${isPremium ? " ☆" : ""}</button></div>`
      ).join("")}</div>`).join("")}</div>
    ${renderGroceryList(buildGroceryList(currentWeek,people,budget),people,budget)}`;
  enhancePlannerControls();
}
async function saveCurrentPlan(){
  if (!requirePremium("Saving plans")) return;

  const result = document.getElementById("result");
  if (!result || !result.textContent.trim()) {
    showToast("Generate a plan first.");
    return;
  }

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      openAuth("signin", "premium");
      return;
    }

    const plan = {
      title: "SmartMeal weekly plan",
      saved_at: new Date().toISOString(),
      household: document.getElementById("people")?.value || null,
      budget: document.getElementById("budget")?.value || null,
      diet: document.getElementById("diet")?.value || null,
      nutrition_target: document.getElementById("nutrition-target")?.value || "balanced",
      ingredient_reuse_optimized: document.getElementById("reuse-optimizer")?.checked === true,
      preferred_groceries: selectedPreferredGroceries(),
      dietary_exclusions: selectedDietaryExclusions(),
      meals: currentWeek.map(day => [...day]),
      html: result.innerHTML
    };

    const { error } = await supabaseClient
      .from("saved_plans")
      .insert({ user_id: user.id, plan });

    if (error) throw error;

    showToast("⭐ This week was saved to your SmartMeal account.");
    await loadSavedPlans();
  } catch (error) {
    console.error("SmartMeal save plan error:", error);
    showToast(error.message || "Unable to save this week.");
  }
}

function groceryStorageKey(){
  return currentUserId ? "smartmeal:grocery-checks:" + currentUserId : "smartmeal:grocery-checks";
}

function groceryChecks(){
  try { return JSON.parse(localStorage.getItem(groceryStorageKey()) || "{}"); }
  catch { return {}; }
}

function updateGroceryProgress(){const area=document.querySelector('#result .grocery-area');if(!area)return;const boxes=Array.from(area.querySelectorAll('input[data-grocery-name]'));const checked=boxes.filter(b=>b.checked).length;const total=boxes.length;const count=area.querySelector('.grocery-progress-count');const status=area.querySelector('.grocery-progress-status');if(count)count.textContent=checked+' / '+total+' checked';if(status)status.textContent=checked===total&&total?'Shopping list complete':Math.max(0,total-checked)+' item'+(Math.max(0,total-checked)===1?'':'s')+' left to shop';}
function clearCheckedGroceries(){const checks=groceryChecks();document.querySelectorAll('#result input[data-grocery-name]').forEach(b=>{b.checked=false;checks[b.dataset.groceryName]=false;});localStorage.setItem(groceryStorageKey(),JSON.stringify(checks));updateGroceryProgress();showToast('Checked grocery items cleared.');}
function printGroceryList(){const area=document.querySelector('#result .grocery-area');if(!area)return;const win=window.open('','_blank');if(!win){showToast('Please allow pop-ups to print the list.');return;}const copy=area.cloneNode(true);copy.querySelectorAll('.grocery-actions').forEach(e=>e.remove());win.document.write('<html><head><title>SmartMeal Grocery List</title></head><body style="font-family:Arial;padding:25px">'+copy.innerHTML+'</body></html>');win.document.close();win.focus();setTimeout(()=>win.print(),150);}
function enhancePlannerControls(){
  const result = document.getElementById("result");
  if (!result) return;
  const days = Array.from(result.querySelectorAll(".day"));

  result.querySelectorAll(".meal").forEach(meal => {
    if (meal.dataset.smartEnhanced === "1") return;
    const day = meal.closest(".day");
    const dayIndex = days.indexOf(day);
    const mealIndex = day ? Array.from(day.querySelectorAll(".meal")).indexOf(meal) : -1;
    const mealName = (meal.dataset.meal || meal.textContent || "").replace(/\s+☆$/, "").trim();
    meal.dataset.meal = mealName;

    const wrapper = document.createElement("div");
    wrapper.className = "meal-enhanced";
    meal.parentNode.insertBefore(wrapper, meal);
    wrapper.appendChild(meal);

    const actions = document.createElement("div");
    actions.className = "meal-actions";

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "meal-action meal-favorite";
    favorite.dataset.favoriteMeal = mealName;
    favorite.textContent = favoriteMeals.has(mealName) ? "★" : "☆";
    favorite.title = "Save meal to favorites";
    actions.appendChild(favorite);

    const swap = document.createElement("button");
    swap.type = "button";
    swap.className = "meal-action meal-swap";
    swap.dataset.swapDay = String(dayIndex);
    swap.dataset.swapMeal = String(mealIndex);
    swap.textContent = "↔ Swap";
    actions.appendChild(swap);

    wrapper.appendChild(actions);
    meal.dataset.smartEnhanced = "1";
  });

  result.querySelectorAll(".gitem").forEach(item => {
    if (item.dataset.groceryEnhanced === "1") return;
    const checkbox = item.querySelector("input[type=checkbox]");
    if (checkbox) {
      checkbox.dataset.groceryName = item.dataset.groceryName || "";
      checkbox.checked = groceryChecks()[item.dataset.groceryName] === true;
    }
    item.dataset.groceryEnhanced = "1";
  });
}

function renderGroceryList(list,people=Number(document.getElementById("people")?.value)||4,budget=document.getElementById("budget")?.value||"mid"){
  const items=list || [];
  if(!items.length) return "<div class=\"grocery-empty\">No grocery items found for this week yet.</div>";
  const checked=groceryChecks();
  const categories=groceryCategories(items);
  const categoryHtml=categories.map(([category,entries])=>{
    return "<section class=\"grocery-category\"><div class=\"grocery-category-head\"><h4>"+escapeHtml(category)+"</h4><span>"+entries.length+" item"+(entries.length===1?"":"s")+"</span></div><div class=\"groceries\">"+
      entries.map(entry=>"<div class=\"gitem\" data-grocery-name=\""+escapeHtml(entry.item)+"\"><input type=\"checkbox\" data-grocery-name=\""+escapeHtml(entry.item)+"\""+(checked[entry.item]===true?" checked":"")+" onchange=\"updateGroceryProgress()\"><div class=\"grocery-copy\"><div class=\"grocery-name-row\"><span class=\"grocery-name\">"+escapeHtml(entry.item)+"</span><strong class=\"grocery-qty\">"+escapeHtml(entry.quantity)+"</strong></div><small>Used in "+entry.meals.length+" meal"+(entry.meals.length===1?"":"s")+": "+escapeHtml(entry.meals.slice(0,3).join(" · "))+(entry.meals.length>3?" · +"+(entry.meals.length-3)+" more":"")+"</small></div></div>").join("")+
      "</div></section>";
  }).join("");

  return "<div class=\"grocery-area\">"+
    "<div class=\"grocery-header\"><div><strong>Your weekly shopping list</strong><span>"+items.length+" ingredients for "+people+" "+(people===1?"person":"people")+" · scaled from your 21 meals</span></div><span class=\"grocery-count\">"+people+" "+(people===1?"person":"people")+"</span></div>"+
    "<div class=\"grocery-budget-note\"><strong>Budget target:</strong> "+escapeHtml(groceryBudgetLabel(budget))+" · quantities are scaled to your household size. <span>These are planning estimates, not exact package sizes.</span></div>"+
    "<div class=\"grocery-progress\"><div class=\"grocery-progress-top\"><span class=\"grocery-progress-status\">"+items.length+" items left to shop</span><span class=\"grocery-progress-count\">0 / "+items.length+" checked</span></div><div class=\"grocery-progress-bar\"><span></span></div></div>"+
    "<div class=\"grocery-actions\"><button type=\"button\" class=\"btn outline small\" onclick=\"clearCheckedGroceries()\">Clear checked</button><button type=\"button\" class=\"btn outline small\" onclick=\"printGroceryList()\">Print list</button></div>"+
    categoryHtml+
    "</div>";
}
function updateFavoriteButtons(){
  document.querySelectorAll(".meal-favorite").forEach(button => {
    const meal = button.dataset.favoriteMeal || "";
    button.textContent = favoriteMeals.has(meal) ? "★" : "☆";
  });
}

function renderFavoriteMeals(){
  const section = document.getElementById("favorite-meals");
  const list = document.getElementById("favorite-meals-list");
  if (!section || !list) return;
  if (!isPremium) { section.style.display = "none"; list.innerHTML = ""; return; }
  section.style.display = "block";
  list.innerHTML = "";
  if (favoriteMeals.size === 0) {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = "No favorite meals yet. Tap ☆ beside a meal to save it.";
    list.appendChild(empty);
    return;
  }
  favoriteMeals.forEach(meal => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "favorite-chip";
    button.dataset.favoriteMeal = meal;
    button.textContent = "★ " + meal;
    list.appendChild(button);
  });
}

async function loadFavorites(){
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user || !isPremium) {
      favoriteMeals = new Set();
      renderFavoriteMeals();
      updateFavoriteButtons();
      return;
    }
    const { data, error } = await supabaseClient
      .from("favorite_meals")
      .select("meal")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    favoriteMeals = new Set((data || []).map(item => item.meal));
    renderFavoriteMeals();
    updateFavoriteButtons();
  } catch (error) {
    console.error("SmartMeal favorites error:", error);
  }
}

async function toggleFavorite(meal){
  if (!requirePremium("Favorite meals")) return;
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) { openAuth("signin", "premium"); return; }
    if (favoriteMeals.has(meal)) {
      const { error } = await supabaseClient.from("favorite_meals").delete().eq("user_id", user.id).eq("meal", meal);
      if (error) throw error;
      favoriteMeals.delete(meal);
      showToast("Removed from favorites.");
    } else {
      const { error } = await supabaseClient.from("favorite_meals").insert({ user_id: user.id, meal });
      if (error) throw error;
      favoriteMeals.add(meal);
      showToast("⭐ Added to favorites.");
    }
    renderFavoriteMeals();
    updateFavoriteButtons();
  } catch (error) {
    console.error("SmartMeal favorite update error:", error);
    showToast(error.message || "Unable to update favorites.");
  }
}

function swapMeal(dayIndex, mealIndex){
  if (!requirePremium("Meal substitutions")) return;
  const meal = currentWeek?.[dayIndex]?.[mealIndex];
  if (!meal) return;
  const options = substitutions[meal] || ["Chicken bowl","Turkey bowl","Vegetable bowl"];
  const key = dayIndex + ":" + mealIndex;
  const cursor = substitutionCursors[key] || 0;
  const next = options[cursor % options.length];
  currentWeek[dayIndex][mealIndex] = next;
  substitutionCursors[key] = cursor + 1;

  const days = Array.from(document.querySelectorAll("#result .day"));
  const day = days[dayIndex];
  const buttons = day ? Array.from(day.querySelectorAll(".meal")) : [];
  const button = buttons[mealIndex];
  if (button) {
    button.dataset.meal = next;
    button.textContent = next + (isPremium ? " ☆" : "");
    const favorite = button.parentElement?.querySelector(".meal-favorite");
    if (favorite) { favorite.dataset.favoriteMeal = next; favorite.textContent = favoriteMeals.has(next) ? "★" : "☆"; }
  }
  const people=Number(document.getElementById("people")?.value)||4; const budget=document.getElementById("budget")?.value||"mid"; const groceryArea=document.querySelector("#result .grocery-area"); if(groceryArea){ const fresh=document.createElement("div"); fresh.innerHTML=renderGroceryList(buildGroceryList(currentWeek,people,budget),people,budget); groceryArea.replaceWith(fresh.firstElementChild); enhancePlannerControls(); } showToast("Meal swapped to " + next + ". Grocery list updated.");
}


function setFamilyVisibility(show){
  const section=document.getElementById("family-tools");
  if(section) section.style.display=show ? "block" : "none";
}

async function loadFamilyHousehold(){
  const section=document.getElementById("family-tools");
  const onboarding=document.getElementById("family-onboarding");
  const dashboard=document.getElementById("family-dashboard");
  if(!section || !onboarding || !dashboard) return;

  if(!isPremium || subscriptionPlan !== "family"){
    familyHousehold=null;
    section.style.display="none";
    return;
  }

  section.style.display="block";

  try{
    const {data,error}=await supabaseClient.rpc("get_my_household");
    if(error) throw error;

    if(!data || data.length===0){
      familyHousehold=null;
      onboarding.style.display="block";
      dashboard.style.display="none";
      return;
    }

    familyHousehold=data[0];
    onboarding.style.display="none";
    dashboard.style.display="block";

    document.getElementById("family-household-name").textContent=familyHousehold.household_name || "My Family";
    document.getElementById("family-invite-code").textContent=familyHousehold.invite_code || "--------";
    document.getElementById("family-member-count").textContent=(familyHousehold.member_count || 0) + ((familyHousehold.member_count || 0) === 1 ? " member" : " members");

    await Promise.all([loadFamilyMembers(),loadFamilyPreferences(),loadFamilyGrocery()]);
  }catch(error){
    console.error("SmartMeal family household error:",error);
    onboarding.style.display="block";
    dashboard.style.display="none";
    showToast(error.message || "Unable to load your family household.");
  }
}

async function createFamilyHousehold(){
  if(!isPremium || subscriptionPlan !== "family"){
    showToast("A Family subscription is required.");
    return;
  }
  const input=document.getElementById("family-name");
  const name=(input?.value || "").trim();
  try{
    const {data,error}=await supabaseClient.rpc("create_household",{p_name:name || "My Family"});
    if(error) throw error;
    showToast("Family household created.");
    await loadFamilyHousehold();
  }catch(error){
    showToast(error.message || "Unable to create your household.");
  }
}

async function joinFamilyHousehold(){
  if(!isPremium || subscriptionPlan !== "family"){
    showToast("A Family subscription is required.");
    return;
  }
  const input=document.getElementById("family-join-code");
  const code=(input?.value || "").trim();
  if(!code){showToast("Enter an invite code.");return;}
  try{
    const {error}=await supabaseClient.rpc("join_household",{p_invite_code:code});
    if(error) throw error;
    showToast("You joined the family household.");
    if(input) input.value="";
    await loadFamilyHousehold();
  }catch(error){
    showToast(error.message || "Unable to join the household.");
  }
}

async function loadFamilyMembers(){
  const list=document.getElementById("family-members-list");
  if(!list || !familyHousehold?.household_id) return;
  try{
    const {data,error}=await supabaseClient.rpc("get_my_household_members");
    if(error) throw error;
    list.innerHTML=(data||[]).map(member=>{
      const mine=member.user_id===currentUserId;
      const label=mine ? (member.email ? "You · " + member.email : "You") : (member.email || "Family member");
      return "<div class=\"family-member\"><span>"+escapeHtml(label)+"</span><small>"+escapeHtml(member.role==="owner" ? "Owner" : "Member")+"</small></div>";
    }).join("") || "<div class=\"saved-empty\">No members yet.</div>";
  }catch(error){
    console.error("SmartMeal family members error:",error);
    list.innerHTML="<div class=\"saved-empty\">Unable to load members.</div>";
  }
}
async function loadFamilyPreferences(){
  if(!familyHousehold?.household_id) return;
  try{
    const {data,error}=await supabaseClient
      .from("household_preferences")
      .select("diet, notes")
      .eq("household_id",familyHousehold.household_id)
      .maybeSingle();
    if(error) throw error;
    if(data){
      const diet=document.getElementById("family-diet");
      const notes=document.getElementById("family-notes");
      if(diet) diet.value=data.diet || "balanced";
      if(notes) notes.value=data.notes || "";
    }
  }catch(error){
    console.error("SmartMeal family preferences error:",error);
  }
}

function useFamilyPreferences(){
  if(!familyHousehold) return;
  const diet=document.getElementById("family-diet")?.value || "balanced";
  const map={balanced:"any",vegetarian:"vegetarian",highprotein:"highprotein",lowercarb:"any"};
  const target= diet==="lowercarb" ? "lowercarb" : "balanced";
  const dietControl=document.getElementById("diet");
  const targetControl=document.getElementById("nutrition-target");
  if(dietControl) dietControl.value=map[diet];
  if(targetControl) targetControl.value=target;
  document.getElementById("app")?.scrollIntoView({behavior:"smooth"});
  setTimeout(generate,250);
  showToast("Family preferences applied to your next plan.");
}

async function saveFamilyPreferences(){
  if(!familyHousehold?.household_id) return;
  try{
    const diet=document.getElementById("family-diet")?.value || "balanced";
    const notes=(document.getElementById("family-notes")?.value || "").trim();
    const {error}=await supabaseClient
      .from("household_preferences")
      .upsert({
        household_id:familyHousehold.household_id,
        diet,
        notes,
        updated_by:(await supabaseClient.auth.getUser()).data.user?.id || null,
        updated_at:new Date().toISOString()
      },{onConflict:"household_id"});
    if(error) throw error;
    showToast("Family preferences saved.");
  }catch(error){
    showToast(error.message || "Unable to save family preferences.");
  }
}

async function loadFamilyGrocery(){
  const list=document.getElementById("family-grocery-list");
  if(!list || !familyHousehold?.household_id) return;
  try{
    const {data,error}=await supabaseClient
      .from("household_grocery_items")
      .select("id,item,checked,created_at")
      .eq("household_id",familyHousehold.household_id)
      .order("created_at",{ascending:true});
    if(error) throw error;
    list.innerHTML=(data||[]).map(row=>
      "<label class=\"family-grocery-item\"><input type=\"checkbox\" data-family-grocery-id=\""+escapeHtml(row.id)+"\" "+(row.checked ? "checked" : "")+"><span>"+escapeHtml(row.item)+"</span><button type=\"button\" class=\"family-grocery-delete\" data-family-grocery-delete=\""+escapeHtml(row.id)+"\" aria-label=\"Delete "+escapeHtml(row.item)+"\">×</button></label>"
    ).join("") || "<div class=\"saved-empty\">Your shared list is empty.</div>";
  }catch(error){
    console.error("SmartMeal family grocery error:",error);
    list.innerHTML="<div class=\"saved-empty\">Unable to load the shared list.</div>";
  }
}

async function shareCurrentGroceries(){
  if(!familyHousehold?.household_id || !currentWeek.length){
    showToast("Create a family household and generate a plan first.");
    return;
  }
  try{
    const {data:sessionData}=await supabaseClient.auth.getSession();
    const user=sessionData?.session?.user;
    if(!user) throw new Error("Sign in required");
    const {error}=await supabaseClient
      .from("household_grocery_items")
      .insert((currentGroceries.length ? currentGroceries : buildGroceryList(currentWeek)).map(entry=>({household_id:familyHousehold.household_id,item:entry.item,added_by:user.id})));
    if(error) throw error;
    await loadFamilyGrocery();
    document.getElementById("family")?.scrollIntoView({behavior:"smooth"});
    showToast("Your grocery list was added to the family list.");
  }catch(error){
    showToast(error.message || "Unable to share your grocery list.");
  }
}

async function addFamilyGroceryItem(){
  if(!familyHousehold?.household_id) return;
  const input=document.getElementById("family-grocery-input");
  const item=(input?.value || "").trim();
  if(!item) return;
  try{
    const {data:sessionData}=await supabaseClient.auth.getSession();
    const user=sessionData?.session?.user;
    if(!user) throw new Error("Sign in required");
    const {error}=await supabaseClient
      .from("household_grocery_items")
      .insert({household_id:familyHousehold.household_id,item,added_by:user.id});
    if(error) throw error;
    if(input) input.value="";
    await loadFamilyGrocery();
    showToast("Added to the shared grocery list.");
  }catch(error){
    showToast(error.message || "Unable to add grocery item.");
  }
}

async function toggleFamilyGrocery(id,checked){
  try{
    const {error}=await supabaseClient.from("household_grocery_items").update({checked}).eq("id",id);
    if(error) throw error;
  }catch(error){
    showToast(error.message || "Unable to update grocery item.");
  }
}

async function deleteFamilyGrocery(id){
  try{
    const {error}=await supabaseClient.from("household_grocery_items").delete().eq("id",id);
    if(error) throw error;
    await loadFamilyGrocery();
    showToast("Removed from the shared grocery list.");
  }catch(error){
    showToast(error.message || "Unable to remove grocery item.");
  }
}

async function copyFamilyInviteCode(){
  const code=document.getElementById("family-invite-code")?.textContent?.trim();
  if(!code || code==="--------") return;
  try{
    await navigator.clipboard.writeText(code);
    showToast("Invite code copied.");
  }catch{
    showToast("Invite code: " + code);
  }
}


async function loadSavedPlans(){
  const savedSection = document.getElementById("saved-plans");
  const list = document.getElementById("saved-plans-list");
  if (!savedSection || !list) return;

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user || !isPremium) {
      savedSection.style.display = "none";
      list.innerHTML = "";
      return;
    }

    const { data, error } = await supabaseClient
      .from("saved_plans")
      .select("id, created_at, plan")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    savedSection.style.display = "block";

    if (!data || data.length === 0) {
      list.innerHTML = `<div class="saved-empty">No saved plans yet. Generate a week and click “Save this week”.</div>`;
      return;
    }

    list.innerHTML = data.map(item => {
      const plan = item.plan || {};
      const created = item.created_at ? new Date(item.created_at).toLocaleString() : "Saved plan";
      const household = plan.household ? plan.household + " people" : "";
      const diet = plan.diet === "vegetarian" ? "Vegetarian" : plan.diet === "highprotein" ? "High protein" : plan.diet === "lowercarb" ? "Lower carb" : plan.diet === "mediterranean" ? "Mediterranean" : plan.diet === "familyfriendly" ? "Family-friendly" : "Balanced";
      const budget = plan.budget === "tight" ? "$50–$70" : plan.budget === "low" ? "$70–$90" : plan.budget === "mid" ? "$90–$120" : plan.budget === "high" ? "$120–$160" : "$160+";
      return `
        <article class="saved-plan-card">
          <div class="saved-plan-top">
            <div>
              <h4>${escapeHtml(plan.title || "SmartMeal weekly plan")}</h4>
              <small>${escapeHtml(created)}</small>
            </div>
            <span class="pill">PREMIUM</span>
          </div>
          <p>${escapeHtml(diet)} · ${escapeHtml(budget)}${household ? " · " + escapeHtml(household) : ""}</p>
          <div class="saved-plan-actions">
            <button class="btn small" type="button" data-restore-plan="${escapeHtml(item.id)}">Open plan</button>
            <button class="btn outline small" type="button" data-delete-plan="${escapeHtml(item.id)}">Delete</button>
          </div>
        </article>`;
    }).join("");

    list._plans = new Map(data.map(item => [item.id, item.plan || {}]));
  } catch (error) {
    console.error("SmartMeal saved plans error:", error);
    savedSection.style.display = "block";
    list.innerHTML = `<div class="saved-empty">Unable to load saved plans right now.</div>`;
  }
}

async function restoreSavedPlan(planId){
  const list = document.getElementById("saved-plans-list");
  const plan = list?._plans?.get(planId);
  if (!plan) {
    showToast("Saved plan not found.");
    return;
  }

  if (!requirePremium("Saved plans")) return;

  const result = document.getElementById("result");
  if (!result) return;

  if (plan.household) document.getElementById("people").value = plan.household;
  if (plan.budget) document.getElementById("budget").value = plan.budget;
  if (plan.diet) document.getElementById("diet").value = plan.diet;
  if (document.getElementById("nutrition-target") && plan.nutrition_target) {
    document.getElementById("nutrition-target").value = plan.nutrition_target;
  }
  if (document.getElementById("reuse-optimizer")) {
    document.getElementById("reuse-optimizer").checked = plan.ingredient_reuse_optimized === true;
  }

  if (Array.isArray(plan.meals) && plan.meals.length) {
    currentWeek = plan.meals.map(day => [...day]);
    substitutionCursors = {};
  }
  if (Array.isArray(plan.preferred_groceries)) {
    preferredGroceries = new Set(plan.preferred_groceries);
    localStorage.setItem(preferredGroceriesStorageKey(), JSON.stringify(plan.preferred_groceries));
    document.querySelectorAll("[data-preferred-grocery]").forEach(box=>{
      box.checked = preferredGroceries.has(box.dataset.preferredGrocery);
    });
    updatePreferredGroceryCount();
  }
  if (Array.isArray(plan.dietary_exclusions)) {
    dietaryExclusions = new Set(plan.dietary_exclusions.filter(item=>dietaryExclusionChoices.includes(item)));
    localStorage.setItem(dietaryExclusionsStorageKey(), JSON.stringify(Array.from(dietaryExclusions)));
    document.querySelectorAll("[data-dietary-exclusion]").forEach(box=>{
      box.checked = dietaryExclusions.has(box.dataset.dietaryExclusion);
    });
    document.querySelectorAll("[data-preferred-grocery]").forEach(box=>{
      box.checked = selectedPreferredGroceries().includes(box.dataset.preferredGrocery);
    });
    updateDietaryExclusionCount();
    updatePreferredGroceryCount();
  }
  result.innerHTML = plan.html || "";
  enhancePlannerControls();
  document.getElementById("app").scrollIntoView({behavior:"smooth"});
  showToast("⭐ Saved plan opened.");
}

async function deleteSavedPlan(planId){
  if (!requirePremium("Deleting saved plans")) return;

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      openAuth("signin", "premium");
      return;
    }

    const { error } = await supabaseClient
      .from("saved_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", user.id);

    if (error) throw error;

    showToast("Saved plan deleted.");
    await loadSavedPlans();
  } catch (error) {
    console.error("SmartMeal delete saved plan error:", error);
    showToast(error.message || "Unable to delete saved plan.");
  }
}

function showApp(){
  supabaseClient.auth.getSession().then(({data}) => {
    if (!data.session) {
      openAuth("signup", "free");
      return;
    }
    document.getElementById("app").scrollIntoView({behavior:"smooth"});
    refreshPremiumStatus();
    setTimeout(generate,300);
  });
}

let authMode = "signup";
let authAfter = "free";

function openAuth(mode = "signup", after = "free"){
  authMode = mode;
  authAfter = after;
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  updateAuthForm();
  setTimeout(() => document.getElementById(authMode === "reset" ? "auth-password" : "auth-email").focus(), 50);
}

function closeAuth(){
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.getElementById("auth-message").textContent = "";
}

function toggleAuthMode(){
  if (authMode === "reset") {
    authMode = "signin";
  } else {
    authMode = authMode === "signup" ? "signin" : "signup";
  }
  updateAuthForm();
}

async function signOut(){
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    isPremium = false;
    subscriptionPlan = "premium";
    favoriteMeals = new Set();
    familyHousehold = null;
    currentUserId = null;
    updatePremiumUI();
    await loadSavedPlans();
    await loadFavorites();
    await loadFamilyHousehold();
    showToast("You are signed out.");
    window.scrollTo({top: 0, behavior: "smooth"});
  } catch (error) {
    console.error("SmartMeal sign out error:", error);
    showToast(error.message || "Unable to sign out.");
  }
}

function updateAuthForm(){
  const signup = authMode === "signup";
  const signin = authMode === "signin";
  const reset = authMode === "reset";
  const emailLabel = document.getElementById("auth-email-label");
  const resetButton = document.getElementById("auth-reset");
  const resendButton = document.getElementById("auth-resend");
  const switchButton = document.getElementById("auth-switch");
  document.getElementById("auth-title").textContent = signup ? "Create your account" : reset ? "Choose a new password" : "Welcome back";
  document.getElementById("auth-subtitle").textContent = signup ? "Use your email and password to get started." : reset ? "Enter a new password for your SmartMeal account." : "Sign in to continue to SmartMeal.";
  document.getElementById("auth-submit").textContent = signup ? "Create account" : reset ? "Update password" : "Sign in";
  document.getElementById("auth-password").autocomplete = signup || reset ? "new-password" : "current-password";
  if (emailLabel) emailLabel.style.display = reset ? "none" : "block";
  document.getElementById("auth-email").required = !reset;
  if (resetButton) resetButton.style.display = signin ? "inline-block" : "none";
  if (resendButton) resendButton.style.display = signup ? "inline-block" : "none";
  if (switchButton) switchButton.textContent = reset ? "Back to sign in" : signup ? "Already have an account? Sign in" : "Need an account? Create one";
}

async function submitAuth(event){
  event.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const message = document.getElementById("auth-message");
  const button = document.getElementById("auth-submit");

  message.textContent = "";
  button.disabled = true;

  try {
    let result;

    if (authMode === "reset") {
      result = await supabaseClient.auth.updateUser({ password });
      if (result.error) throw result.error;
      message.textContent = "Password updated. You can now sign in.";
      setTimeout(() => { authMode = "signin"; updateAuthForm(); }, 800);
      return;
    }

    if (authMode === "signup") {
      result = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

    await refreshPremiumStatus();

    if (authMode === "signup" && !result.data.session) {
      message.textContent = "Account created. Check your email to confirm your address, then sign in.";
      return;
    }

    message.textContent = "Signed in successfully.";

    setTimeout(() => {
      closeAuth();
      if (authAfter === "premium" || authAfter === "family") {
        fakeCheckout(authAfter);
      } else {
        document.getElementById("app").scrollIntoView({behavior:"smooth"});
        setTimeout(generate,300);
      }
    }, 500);
  } catch (error) {
    message.textContent = error.message || "Something went wrong.";
  } finally {
    button.disabled = false;
  }
}

async function requestPasswordReset(){
  const email = document.getElementById("auth-email").value.trim();
  const message = document.getElementById("auth-message");
  if (!email) {
    message.textContent = "Enter your email address first.";
    return;
  }
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    message.textContent = "Password reset email sent. Check your inbox and spam folder.";
  } catch (error) {
    message.textContent = error.message || "Unable to send the reset email.";
  }
}
async function resendConfirmation(){
  const email = document.getElementById("auth-email").value.trim();
  const message = document.getElementById("auth-message");
  if (!email) {
    message.textContent = "Enter your email address first.";
    return;
  }
  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    message.textContent = "A new confirmation email was sent. Check your inbox and spam folder.";
  } catch (error) {
    message.textContent = error.message || "Unable to resend the confirmation email.";
  }
}

async function startFamilyCheckout(){
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth("signup", "family");
    return;
  }
  if (isPremium) {
    if (subscriptionPlan === "family") {
      document.getElementById("family")?.scrollIntoView({behavior:"smooth"});
      showToast("You already have the Family plan.");
    } else {
      showToast("You already have Premium. Use Manage subscription to change your plan.");
      document.getElementById("premium-tools")?.scrollIntoView({behavior:"smooth"});
    }
    return;
  }
  fakeCheckout("family");
}

async function fakeCheckout(plan = "premium"){
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth("signin", plan);
    return;
  }
  try {
    const response = await fetch("/api/create-checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + data.session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ plan })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
    window.location.href = result.url;
  } catch (error) {
    showToast(error.message || "Unable to start checkout.");
  }
}

async function openCustomerPortal(){
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth("signin", "free");
    return;
  }
  try {
    const response = await fetch("/api/create-portal", {
      method: "POST",
      headers: { Authorization: "Bearer " + data.session.access_token }
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Unable to open subscription management.");
    window.location.href = result.url;
  } catch (error) {
    showToast(error.message || "Unable to open subscription management.");
  }
}
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("SmartMeal auth:", event);
  if (event === "PASSWORD_RECOVERY") {
    openAuth("reset");
    return;
  }
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
    setTimeout(refreshPremiumStatus, 0);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  refreshPremiumStatus();

  const recipeModal=document.getElementById("recipe-modal");
  if(recipeModal){
    recipeModal.addEventListener("click",(event)=>{
      if(event.target.matches("[data-recipe-close]") || event.target===recipeModal) closeRecipe();
    });
  }
  document.addEventListener("keydown",(event)=>{ if(event.key==="Escape") closeRecipe(); });
  const result = document.getElementById("result");
  if (!result) return;

  result.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[type=checkbox][data-grocery-name]");
    if (!checkbox) return;
    const checks = groceryChecks();
    checks[checkbox.dataset.groceryName] = checkbox.checked;
    localStorage.setItem(groceryStorageKey(), JSON.stringify(checks));
    updateGroceryProgress();
  });

  const observer = new MutationObserver(() => enhancePlannerControls());
  observer.observe(result, { childList: true, subtree: true });
  enhancePlannerControls();

  const familyGroceryList = document.getElementById("family-grocery-list");
  if (familyGroceryList) {
    familyGroceryList.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-family-grocery-id]");
      if (checkbox) toggleFamilyGrocery(checkbox.dataset.familyGroceryId, checkbox.checked);
    });
    familyGroceryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-family-grocery-delete]");
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        deleteFamilyGrocery(button.dataset.familyGroceryDelete);
      }
    });
  }

  handleCheckoutReturn();
  loadDietaryExclusions();
  loadPreferredGroceries();

  const preferredWrap = document.getElementById("grocery-preferences");
  if (preferredWrap) {
    preferredWrap.addEventListener("change", (event) => {
      const box = event.target.closest("[data-preferred-grocery]");
      if (!box) return;
      const checkedCount = document.querySelectorAll("[data-preferred-grocery]:checked").length;
      if (box.checked && checkedCount > 12) {
        box.checked = false;
        showToast("Choose up to 12 foods so SmartMeal can build a full week around them.");
      }
      savePreferredGroceries();
    });
  }
  const exclusionWrap = document.getElementById("dietary-exclusions");
  if (exclusionWrap) {
    exclusionWrap.addEventListener("change", (event) => {
      const box = event.target.closest("[data-dietary-exclusion]");
      if (!box) return;
      saveDietaryExclusions();
      showToast(box.checked ? "SmartMeal will avoid " + box.dataset.dietaryExclusion + "." : box.dataset.dietaryExclusion + " can be used again.");
    });
  }

  document.querySelectorAll("[data-select-food-group]").forEach(button => {
    button.addEventListener("click", () => {
      const group = button.dataset.selectFoodGroup;
      const boxes = Array.from(document.querySelectorAll("[data-food-group='" + group + "'] [data-preferred-grocery]"));
      const current = selectedPreferredGroceries();
      const existing = new Set(current);
      const remaining = Math.max(0, 12 - current.length);
      boxes.filter(box=>!existing.has(box.dataset.preferredGrocery) && !foodIsExcluded(box.dataset.preferredGrocery,selectedDietaryExclusions()))
        .slice(0,remaining)
        .forEach(box=>box.checked=true);
      savePreferredGroceries();
      showToast("Selected as many " + group + " foods as fit in your 12-food preference set.");
    });
  });

  const selectAllButton = document.getElementById("select-all-foods");
  if (selectAllButton) {
    selectAllButton.addEventListener("click", () => {
      document.querySelectorAll("[data-preferred-grocery]").forEach(box=>box.checked=false);
      let count=0;
      document.querySelectorAll("[data-preferred-grocery]").forEach(box=>{
        if(count>=12 || foodIsExcluded(box.dataset.preferredGrocery,selectedDietaryExclusions())) return;
        box.checked=true;
        count++;
      });
      savePreferredGroceries();
      showToast("Selected up to 12 foods for the weekly meal builder.");
    });
  }

  const clearPreferred = document.getElementById("clear-preferred-groceries");
  if (clearPreferred) {
    clearPreferred.addEventListener("click", () => {
      document.querySelectorAll("[data-preferred-grocery]").forEach(box => { box.checked = false; });
      savePreferredGroceries();
      showToast("Food preferences cleared.");
    });
  }

  const favoriteList = document.getElementById("favorite-meals-list");
  if (favoriteList) {
    favoriteList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-favorite-meal]");
      if (button) toggleFavorite(button.dataset.favoriteMeal || "");
    });
  }

  const savedList = document.getElementById("saved-plans-list");
  if (savedList) {
    savedList.addEventListener("click", (event) => {
      const restoreButton = event.target.closest("[data-restore-plan]");
      if (restoreButton) restoreSavedPlan(restoreButton.dataset.restorePlan);
      const deleteButton = event.target.closest("[data-delete-plan]");
      if (deleteButton) deleteSavedPlan(deleteButton.dataset.deletePlan);
    });
  }

  result.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".meal-favorite");
    if (favoriteButton) { toggleFavorite(favoriteButton.dataset.favoriteMeal || ""); return; }
    const swapButton = event.target.closest(".meal-swap");
    if (swapButton) { swapMeal(Number(swapButton.dataset.swapDay), Number(swapButton.dataset.swapMeal)); return; }
    const mealButton = event.target.closest(".meal");
    if (!mealButton) return;
    selectMeal((mealButton.dataset.meal || "").replace(/\s+☆$/, ""));
  });

  const optimizerCheckbox = document.getElementById("reuse-optimizer");
  if (optimizerCheckbox) {
    optimizerCheckbox.addEventListener("change", () => {
      if (!isPremium && optimizerCheckbox.checked) {
        optimizerCheckbox.checked = false;
        fakeCheckout();
      }
    });
  }

  const nutrition = document.getElementById("nutrition-target");
  if (nutrition) {
    nutrition.addEventListener("change", () => {
      if (!isPremium && nutrition.value !== "balanced") {
        nutrition.value = "balanced";
        fakeCheckout();
      }
    });
  }
});
