const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";
const GROCERY_PULSE_BASE = "https://grocerypulse.ca";

function normalize(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\b(the|fresh|organic|natural|large|small|medium|value|family|pack|pkg|per|each)\b/g," ")
    .replace(/\s+/g," ")
    .trim();
}

const aliases={
  "Oats":["oat","oats","rolled oat"],
  "Bananas":["banana"],
  "Berries":["berry","berries","strawberry","blueberry","raspberry"],
  "Greek yogurt":["greek yogurt","yogurt"],
  "Eggs":["egg"],
  "Avocado":["avocado"],
  "Apples":["apple"],
  "Peanut butter":["peanut butter"],
  "Chia seeds":["chia seed","chia"],
  "Whole-grain bread":["whole grain bread","whole wheat bread","bread"],
  "Almonds":["almond"],
  "Walnuts":["walnut"],
  "Pumpkin seeds":["pumpkin seed","pepita"],
  "Spinach":["spinach"],
  "Tomatoes":["tomato"],
  "Broccoli":["broccoli"],
  "Carrots":["carrot"],
  "Mixed vegetables":["mixed vegetable","vegetable blend","mixed veg"],
  "Sweet potatoes":["sweet potato"],
  "Brown rice":["brown rice"],
  "Quinoa":["quinoa"],
  "Chicken breast":["chicken breast","boneless chicken","chicken"],
  "Turkey":["turkey"],
  "Salmon":["salmon"],
  "Tuna":["tuna"],
  "Shrimp":["shrimp"],
  "Tofu":["tofu"],
  "Chickpeas":["chickpea","garbanzo"],
  "Lentils":["lentil"],
  "Black beans":["black bean"],
  "Beans":["bean"],
  "Hummus":["hummus"],
  "Whole-grain tortillas":["whole grain tortilla","whole wheat tortilla","tortilla"],
  "Olive oil":["olive oil","extra virgin olive oil"]
};

function scoreMatch(requested,product){
  const productText=normalize(product.name);
  const terms=aliases[requested] || [requested];
  let score=0;
  for(const term of terms){
    const t=normalize(term);
    if(!t) continue;
    if(productText.includes(t)) score=Math.max(score,100+t.length);
    else{
      const words=t.split(" ");
      const hits=words.filter(word=>productText.includes(word)).length;
      score=Math.max(score,hits*15);
    }
  }
  if(requested==="Greek yogurt" && productText.includes("greek")) score+=30;
  if(requested==="Chicken breast" && productText.includes("breast")) score+=25;
  if(requested==="Whole-grain bread" && (productText.includes("whole")||productText.includes("wheat"))) score+=20;
  return score;
}

function bestProduct(requested,products){
  const scored=products.map(product=>({product,score:scoreMatch(requested,product)})).sort((a,b)=>b.score-a.score);
  if(!scored.length || scored[0].score<20) return null;
  return {
    product:scored[0].product,
    confidence:scored[0].score>=120 ? "high" : scored[0].score>=70 ? "medium" : "low"
  };
}

async function fetchJson(url,apiKey){
  const response=await fetch(url,{headers:{Accept:"application/json",Authorization:"Bearer "+apiKey},cache:"no-store"});
  const body=await response.text();
  let data={};
  try{data=JSON.parse(body);}catch{}
  if(!response.ok) throw new Error("GroceryPulse request failed (HTTP "+response.status+").");
  return data;
}

async function verifyUser(accessToken){
  const response=await fetch(SUPABASE_URL+"/auth/v1/user",{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:"Bearer "+accessToken}
  });
  if(!response.ok) return null;
  return response.json();
}

module.exports = async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  try{
    const authHeader=req.headers.authorization || "";
    if(!authHeader.startsWith("Bearer ")) return res.status(401).json({error:"Not signed in"});
    const user=await verifyUser(authHeader.slice(7).trim());
    if(!user) return res.status(401).json({error:"Not signed in"});

    const apiKey=process.env.GROCERYPULSE_API_KEY;
    if(!apiKey){
      return res.status(503).json({error:"Item-level grocery pricing is not connected yet.",code:"PRICE_API_NOT_CONFIGURED"});
    }

    const city=String(req.body?.city || "Winnipeg").trim();
    const items=Array.isArray(req.body?.items)
      ? [...new Set(req.body.items.map(item=>String(item).trim()).filter(Boolean))].slice(0,24)
      : [];
    if(!items.length) return res.status(400).json({error:"No grocery items supplied."});

    const productsPayload=await fetchJson(GROCERY_PULSE_BASE+"/api/v1/products",apiKey);
    const products=Array.isArray(productsPayload.products) ? productsPayload.products : [];
    const matches={};
    items.forEach(item=>{matches[item]=bestProduct(item,products);});

    const priceRows=[];
    let offset=0;
    for(let page=0;page<3;page++){
      const payload=await fetchJson(
        GROCERY_PULSE_BASE+"/api/v1/prices?city="+encodeURIComponent(city)+"&limit=10000&offset="+offset,
        apiKey
      );
      if(Array.isArray(payload.observations)) priceRows.push(...payload.observations);
      if(!payload?.meta?.has_more) break;
      offset=Number(payload.meta.next_offset);
      if(!Number.isFinite(offset)) break;
    }

    const latestByProductStore=new Map();
    priceRows.forEach(row=>{
      const productId=row?.retailer_products?.product_id;
      const storeId=row?.store_id;
      if(!productId || !storeId || typeof row.effective_price!=="number") return;
      const key=productId+":"+storeId;
      const prior=latestByProductStore.get(key);
      if(!prior || String(row.observed_at)>String(prior.observed_at)) latestByProductStore.set(key,row);
    });

    const results=items.map(item=>{
      const match=matches[item];
      if(!match) return {item,matched:false,confidence:"none",prices:[]};

      const rows=[...latestByProductStore.values()].filter(row=>row?.retailer_products?.product_id===match.product.id);
      const latestByBanner=new Map();
      rows.forEach(row=>{
        const banner=row.retailer_products.banner || row.retailer_products.retailer || "";
        const prior=latestByBanner.get(banner);
        if(!prior || String(row.observed_at)>String(prior.observed_at)) latestByBanner.set(banner,row);
      });

      const prices=[...latestByBanner.values()]
        .sort((a,b)=>a.effective_price-b.effective_price)
        .slice(0,8)
        .map(row=>({
          banner:row.retailer_products.banner,
          retailer_name:row.retailer_products.retailer_name || row.retailer_products.retailer,
          price:row.effective_price,
          regular_price:row.regular_price,
          sale_price:row.sale_price,
          on_sale:row.is_on_sale===true,
          package_size:row.package_size,
          in_stock:row.in_stock,
          observed_at:row.observed_at
        }));

      return {
        item,
        matched:true,
        confidence:match.confidence,
        matched_product:match.product.name,
        product_id:match.product.id,
        prices
      };
    });

    return res.status(200).json({
      city,
      generated_at:new Date().toISOString(),
      source:"GroceryPulse Canadian Grocery Price Index",
      results
    });
  }catch(error){
    console.error("SmartMeal grocery prices endpoint error:",error);
    return res.status(502).json({error:"Unable to load item-level grocery prices right now."});
  }
};

module.exports.config={api:{bodyParser:true}};
