const recommendations={
  customers:{title:"Start with customer organization",text:"A simple CRM is a strong first step when leads, follow-ups, and customer conversations are getting scattered.",tool:"HubSpot"},
  website:{title:"Start with the type of site you need",text:"If you sell products online, an ecommerce platform may fit. If you only need a service page, keep the website simpler.",tool:"Shopify for online stores"},
  marketing:{title:"Start with one channel",text:"Pick one repeatable marketing channel before paying for a stack of tools. A CRM can help capture and follow up with the leads you earn.",tool:"HubSpot"},
  design:{title:"Start with reusable templates",text:"Create a small set of repeatable brand templates for posts, flyers, and promotions instead of designing from scratch each time.",tool:"Canva"}
};
const box=document.getElementById("recommendation");
document.querySelectorAll(".goal-card").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".goal-card").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const r=recommendations[btn.dataset.goal];
    box.innerHTML='<strong>'+r.title+'</strong><p>'+r.text+'</p><p><strong>Suggested starting point:</strong> '+r.tool+'</p>';
  });
});