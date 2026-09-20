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
["Oatmeal + banana","Chicken rice bowls"],["Eggs + toast","Turkey tacos"],["Greek yogurt + berries","Chicken pasta"],
["Oatmeal + berries","Chicken stir-fry"],["Eggs + toast","Bean & beef chili"],["Pancakes + banana","Chicken wraps"],["Yogurt + granola","Leftover bowl"]
],
vegetarian:[
["Oatmeal + banana","Chickpea rice bowls"],["Eggs + toast","Black bean tacos"],["Greek yogurt + berries","Lentil pasta"],
["Oatmeal + berries","Tofu stir-fry"],["Eggs + toast","Vegetarian chili"],["Pancakes + banana","Chickpea wraps"],["Yogurt + granola","Leftover bowl"]
],
highprotein:[
["Eggs + oatmeal","Chicken rice bowls"],["Eggs + toast","Turkey tacos"],["Protein oats","Chicken pasta"],
["Eggs + berries","Chicken stir-fry"],["Eggs + toast","Beef & bean chili"],["Protein pancakes","Chicken wraps"],["Eggs + oatmeal","Leftover protein bowl"]
],
lowercarb:[
["Eggs + avocado","Chicken salad bowls"],["Greek yogurt + berries","Turkey lettuce tacos"],["Cottage cheese + fruit","Chicken pesto vegetables"],
["Eggs + spinach","Chicken stir-fry"],["Greek yogurt + nuts","Beef & broccoli bowls"],["Egg muffins + fruit","Chicken lettuce wraps"],["Eggs + berries","Leftover protein bowl"]
]};
const groceries=["Oats","Bananas","Eggs","Bread","Greek yogurt","Berries","Chicken breast","Rice","Tortillas","Ground turkey/beef","Beans","Pasta","Mixed vegetables","Carrots","Hummus","Apples","Peanut butter","Fruit","Granola","Cheese"];
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

function selectMeal(meal){
  showToast((isPremium ? "⭐ Saved-ready meal: " : "Selected: ") + meal);
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
  const base={low:70,mid:95,high:130}[budget];
  const cost=Math.round(base*people/4);

  const requestedTarget = document.getElementById("nutrition-target")?.value || "balanced";
  const optimizerCheckbox = document.getElementById("reuse-optimizer");

  let plan = plans[diet];
  let targetNote = "";

  if (requestedTarget !== "balanced") {
    if (!requirePremium("Nutrition targets")) {
      document.getElementById("nutrition-target").value = "balanced";
    } else if (requestedTarget === "highprotein") {
      plan = plans.highprotein;
      targetNote = " · high protein";
    } else if (requestedTarget === "lowercarb") {
      plan = plans.lowercarb;
      targetNote = " · lower carb target";
    }
  }

  if (optimizerCheckbox?.checked && !isPremium) {
    optimizerCheckbox.checked = false;
  }

  if (isPremium && optimizerCheckbox?.checked) {
    targetNote += " · ingredient reuse optimized";
  }

  currentWeek = plan.map(day => [...day]);
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  document.getElementById("result").innerHTML=
    `<h3>Your personalized week <span style="color:#2e7d50">· about $${cost}</span><small>${escapeHtml(targetNote)}</small></h3>
    <div class="week">${plan.map((d,i)=>
      `<div class="day"><b>${days[i]}</b>${d.map(m=>
        `<button type="button" class="meal" data-meal="${escapeHtml(m)}">${escapeHtml(m)}${isPremium ? ' ☆' : ''}</button>`
      ).join("")}</div>`).join("")}</div>
    <div class="groceries">${groceries.map(g=>`<div class="gitem">☐ ${g}</div>`).join("")}</div>`;
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
  return "smartmeal:grocery-checks";
}

function groceryChecks(){
  try { return JSON.parse(localStorage.getItem(groceryStorageKey()) || "{}"); }
  catch { return {}; }
}

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

  const checks = groceryChecks();
  result.querySelectorAll(".gitem").forEach((item, index) => {
    if (item.dataset.groceryEnhanced === "1") return;
    const label = item.textContent.replace("☐", "").trim();
    item.textContent = "";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.groceryIndex = String(index);
    checkbox.checked = checks[index] === true;
    const text = document.createElement("span");
    text.textContent = label;
    item.appendChild(checkbox);
    item.appendChild(text);
    item.dataset.groceryEnhanced = "1";
  });
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
  showToast("Meal swapped to " + next + ".");
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
      .insert(groceries.map(item=>({household_id:familyHousehold.household_id,item,added_by:user.id})));
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
      const diet = plan.diet === "vegetarian" ? "Vegetarian" : plan.diet === "highprotein" ? "High protein" : "Balanced";
      const budget = plan.budget === "low" ? "$60–$80" : plan.budget === "high" ? "$110+" : "$80–$110";
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

  const result = document.getElementById("result");
  if (!result) return;

  result.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-grocery-index]");
    if (!checkbox) return;
    const checks = groceryChecks();
    checks[checkbox.dataset.groceryIndex] = checkbox.checked;
    localStorage.setItem(groceryStorageKey(), JSON.stringify(checks));
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
      if (button) deleteFamilyGrocery(button.dataset.familyGroceryDelete);
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
