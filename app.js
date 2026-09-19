const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isPremium = false;
let subscriptionPlan = "premium";
let currentWeek = [];

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
      updatePremiumUI();
      return;
    }

    if (signupButton) signupButton.style.display = "none";
    if (signoutButton) signoutButton.style.display = "inline-flex";
    if (status) status.style.display = "inline-flex";

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
  } catch (error) {
    console.error("SmartMeal premium status error:", error);
    isPremium = false;
    subscriptionPlan = "premium";
    updatePremiumUI();
    await loadSavedPlans();
  }
}

function updatePremiumUI(){
  const tools = document.getElementById("premium-tools");
  const upsell = document.getElementById("premium-upsell");
  const status = document.getElementById("account-status");

  if (tools) tools.style.display = isPremium ? "block" : "none";
  if (upsell) upsell.style.display = isPremium ? "none" : "block";

  if (status) {
    status.style.display = "inline-flex";
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

  result.innerHTML = plan.html || "";
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
    updatePremiumUI();
    await loadSavedPlans();
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
      if (authAfter === "premium") {
        fakeCheckout();
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

async function fakeCheckout(plan = "premium"){
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth("signin", "premium");
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
    const mealButton = event.target.closest(".meal");
    if (!mealButton) return;
    if (isPremium) {
      selectMeal(mealButton.dataset.meal || "");
    } else {
      showToast("Selected: " + (mealButton.dataset.meal || ""));
    }
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
