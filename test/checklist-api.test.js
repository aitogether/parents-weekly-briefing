const http = require("http");
const BASE = process.env.TEST_URL || "http://localhost:3000";
const TOKEN = process.env.TEST_TOKEN || "test-token";
let pass = 0, fail = 0;

function assert(c, n, d="") { if(c){ pass++; console.log("✅", n); } else { fail++; console.error("❌", n + (d ? ": "+d : "")); } }

function req(m,p,b=null,t=TOKEN){ return new Promise((res,rej)=>{ const u=new URL(p,BASE); const o={method:m,headers:{"Authorization":"Bearer "+t,"Content-Type":"application/json"}}; if(b) o.body=JSON.stringify(b); const r=http.request(u,o,rs=>{let d="";rs.on("data",c=>d+=c);rs.on("end",()=>{try{res({status:rs.statusCode,data:JSON.parse(d)})}catch{res({status:rs.statusCode,data:d})}})});r.on("error",rej); if(b)r.write(o.body); r.end(); }); }

async function run(){
  console.log("\n=== 测试开始 ===\n");
  for(let i=1;i<=10;i++){ try{ const r=await req("GET","/health"); if(r.status===200){ console.log("✅ 服务就绪"); break; } }catch{} if(i<10) await new Promise(x=>setTimeout(x,3000)); }
  const h=await req("GET","/health"); assert(h.status===200,"健康检查");
  const r401=await req("GET","/api/checklist/weekly",null,"bad"); assert(r401.status===401,"未授权401");
  const list=await req("GET","/api/checklist/weekly"); assert(list.status===200,"获取清单"); assert(list.data.success,"成功标记"); assert(list.data.data.items.length===8,"8项检查"); assert(list.data.data.completed_count===0,"初始0完成");
  const c1=await req("POST","/api/checklist/complete/1",{notes:"已检查"}); assert(c1.status===200,"完成第1项");
  const v1=await req("GET","/api/checklist/weekly"); const i1=v1.data.data.items.find(i=>i.id===1); assert(i1.completed,"第1项已更新"); assert(v1.data.data.completed_count===1,"完成数=1");
  await req("POST","/api/checklist/complete/2",{},TOKEN); await req("POST","/api/checklist/complete/3",{},TOKEN); const v3=await req("GET","/api/checklist/weekly"); assert(v3.data.data.completed_count===3,"完成3项总数=3");
  const hist=await req("GET","/api/checklist/history?limit=4"); assert(hist.status===200,"获取历史"); assert(Array.isArray(hist.data.data.weeks),"历史为数组");
  const dup=await req("POST","/api/checklist/complete/1",{},TOKEN); assert(dup.status===200,"重复完成OK"); const vDup=await req("GET","/api/checklist/weekly"); assert(vDup.data.data.completed_count===3,"重复不增加");
  console.log("\n=== 结果: ✅",pass,"❌",fail,"===\n");
  require("fs").writeFileSync("test-results.json",JSON.stringify({passed:pass,failed:fail,total:pass+fail}));
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error(e);process.exit(1);});
