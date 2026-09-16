const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const plans={
any:[
["Oatmeal + banana","Chicken rice bowls"],["Eggs + toast","Turkey tacos"],["Greek yogurt + berries","Chicken pasta"],
["Oatmeal + berries","Chicken stir-fry"],["Eggs + toast","Bean & beef chili"],["Pancakes + banana","Chicken wraps"],["Yogurt + granola","Leftover bowl"]
],
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
function generate(){
 const people=+document.getElementById("people").value,budget=document.getElementById("budget").value,diet=document.getElementById("diet").value;
 const base={low:70,mid:95,high:130}[budget],cost=Math.round(base*people/4);
 const plan=plans[diet],days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
 document.getElementById("result").innerHTML=`<h3>Your personalized week <span style="color:#2e7d50">· about $${cost}</span></h3><div class="week">${plan.map((d,i)=>`<div class="day"><b>${days[i]}</b>${d.map(m=>`<div class="meal">${m}</div>`).join("")}</div>`).join("")}</div><div class="groceries">${groceries.map(g=>`<div class="gitem">☐ ${g}</div>`).join("")}</div>`;
}
function showApp(){document.getElementById("app").scrollIntoView({behavior:"smooth"});setTimeout(generate,300)}
function fakeCheckout(){window.location.href="https://buy.stripe.com/test_aFafZi5zWbbah2r7D9eZ200"}
generate();
