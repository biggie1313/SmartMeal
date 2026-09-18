const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
]};
const groceries=["Oats","Bananas","Eggs","Bread","Greek yogurt","Berries","Chicken breast","Rice","Tortillas","Ground turkey/beef","Beans","Pasta","Mixed vegetables","Carrots","Hummus","Apples","Peanut butter","Fruit","Granola","Cheese"];
function selectMeal(meal){
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = "Selected: " + meal;
  toast.style.display = "block";
  clearTimeout(window.smartMealToastTimer);
  window.smartMealToastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}

function escapeHtml(value){
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function generate(){
 const people=+document.getElementById("people").value,budget=document.getElementById("budget").value,diet=document.getElementById("diet").value;
 const base={low:70,mid:95,high:130}[budget],cost=Math.round(base*people/4);
 const plan=plans[diet],days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
 document.getElementById("result").innerHTML=`<h3>Your personalized week <span style="color:#2e7d50">· about $${cost}</span></h3><div class="week">${plan.map((d,i)=>`<div class="day"><b>${days[i]}</b>${d.map(m=>`<button type="button" class="meal" data-meal="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("")}</div>`).join("")}</div><div class="groceries">${groceries.map(g=>`<div class="gitem">☐ ${g}</div>`).join("")}</div>`;
}
function showApp(){
  supabaseClient.auth.getSession().then(({data}) => {
    if (!data.session) {
      openAuth("signup", "free");
      return;
    }
    document.getElementById("app").scrollIntoView({behavior:"smooth"});
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
  setTimeout(() => document.getElementById("auth-email").focus(), 50);
}

function closeAuth(){
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.getElementById("auth-message").textContent = "";
}

function toggleAuthMode(){
  authMode = authMode === "signup" ? "signin" : "signup";
  updateAuthForm();
}

function updateAuthForm(){
  const signup = authMode === "signup";
  document.getElementById("auth-title").textContent = signup ? "Create your account" : "Welcome back";
  document.getElementById("auth-subtitle").textContent = signup
    ? "Use your email and password to get started."
    : "Sign in to continue to SmartMeal.";
  document.getElementById("auth-submit").textContent = signup ? "Create account" : "Sign in";
  document.getElementById("auth-password").autocomplete = signup ? "new-password" : "current-password";
  document.getElementById("auth-switch").textContent = signup
    ? "Already have an account? Sign in"
    : "Need an account? Create one";
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

    if (authMode === "signup") {
      result = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    }

    if (result.error) throw result.error;

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

async function fakeCheckout(){
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    openAuth("signin", "premium");
    return;
  }
  window.location.href="https://buy.stripe.com/test_aFafZi5zWbbah2r7D9eZ200";
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("SmartMeal auth:", event);
});



document.addEventListener("DOMContentLoaded", () => {
  const result = document.getElementById("result");
  if (!result) return;
  result.addEventListener("click", (event) => {
    const mealButton = event.target.closest(".meal");
    if (!mealButton) return;
    selectMeal(mealButton.dataset.meal || "");
  });
});
