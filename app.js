const KEY_V10="attandace_pro_v10", LEGACY_KEYS=["attandace_pro_v5","attandace_pro_v6"];
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now();
const baseData=()=>({version:10,subjects:[],records:{},holidays:{},schedule:[],settings:{name:"",college:"",department:"",academicYear:"",semester:"",division:"",minPct:75,batch:""},assignments:[],exams:[],notes:[]});
let data=loadData();
let calMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let activeBatch=data.settings.batch||"";

function loadData(){
  try{
    const raw=localStorage.getItem(KEY_V10);
    if(raw){const d=JSON.parse(raw);return normalize(d)}
  }catch{}
  for(const k of LEGACY_KEYS){
    try{const raw=localStorage.getItem(k);if(raw){const d=JSON.parse(raw);return migrate(d)}}catch{}
  }
  return baseData();
}
function normalize(d){
  const x={...baseData(),...d,settings:{...baseData().settings,...(d.settings||{})}};
  x.subjects=Array.isArray(d.subjects)?d.subjects.map(s=>({id:s.id||uid(),name:s.name||"Untitled",code:s.code||"",min:+s.min||75,teacher:s.teacher||"",room:s.room||"",present:+s.present||0,absent:+s.absent||0})):[];
  x.records=d.records||{};x.holidays=d.holidays||{};x.schedule=Array.isArray(d.schedule)?d.schedule:[];
  return x;
}
function migrate(old){
  const n=baseData();n.subjects=(old.subjects||[]).map(s=>({...s,id:s.id||uid()}));n.records=old.records||{};n.holidays=old.holidays||{};n.schedule=(old.schedule||[]).map(x=>({...x,id:x.id||uid()}));n.settings={...n.settings,...(old.settings||{})};n.version=10;
  localStorage.setItem(KEY_V10,JSON.stringify(n));return n;
}
function save(){localStorage.setItem(KEY_V10,JSON.stringify(data));render()}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m))}
function subject(id){return data.subjects.find(s=>s.id===id)}
function minFor(s){return +(s.min||data.settings.minPct||75)}
function percent(s){let t=(+s.present||0)+(+s.absent||0);return t?100*s.present/t:0}
function level(p,m=75){return p<m?["bad","Danger"]:p<m+5?["warn","Caution"]:["good","Safe"]}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("show"),1800)}
function todayName(){return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]}
function recordFor(d,id){return data.records[d]?.[id]}
function mark(id,val,date){
  if(data.holidays[date]){toast("Holiday: attendance disabled");return}
  const s=subject(id);if(!s)return;
  data.records[date]??={};const old=data.records[date][id];
  if(old===true)s.present--; if(old===false)s.absent--;
  data.records[date][id]=val;if(val===true)s.present++;else s.absent++;save();toast(val?"Present marked":"Absent marked")
}
function clearDay(date){
  if(data.records[date]){for(const [id,v] of Object.entries(data.records[date])){const s=subject(id);if(s){if(v===true)s.present--;else if(v===false)s.absent--}}delete data.records[date];save();toast("Day cleared")}
}
function subjectCard(s){
  const p=percent(s),[c,st]=level(p,minFor(s)),tot=s.present+s.absent;
  return `<div class="card"><div class="dot ${c}"></div><div class="main"><b>${esc(s.name)} ${s.code?`<span class="badge">${esc(s.code)}</span>`:""}</b><small>${esc(s.teacher||"Faculty not set")} ${s.room?"• "+esc(s.room):""} • ${s.present}/${tot} present • min ${minFor(s)}%</small></div><div class="pct">${p.toFixed(1)}%</div><div class="actions"><button onclick="openModal('subject','${s.id}')">Edit</button><button onclick="delSubject('${s.id}')">×</button></div></div>`
}
function markCard(s,d){
  const v=recordFor(d,s.id);return `<div class="card"><div class="dot ${level(percent(s),minFor(s))[0]}"></div><div class="main"><b>${esc(s.name)}</b><small>${percent(s).toFixed(1)}% • ${v===true?"Marked present":v===false?"Marked absent":"Not marked"}</small></div><div class="actions"><button class="present" onclick="mark('${s.id}',true,'${d}')">✓ Present</button><button class="absent" onclick="mark('${s.id}',false,'${d}')">✕ Absent</button></div></div>`
}
function scheduleCard(x){
  const s=subject(x.subjectId);if(!s)return "";
  const selected=!x.batch||!activeBatch||x.batch===activeBatch;
  if(!selected)return "";
  const v=recordFor(today(),s.id);
  return `<div class="card"><div class="dot ${level(percent(s),minFor(s))[0]}"></div><div class="main"><b>${esc(s.name)} ${x.batch?`<span class="badge">${esc(x.batch)}</span>`:""}</b><small>${x.start}${x.end?"–"+x.end:""} ${x.room?"• "+esc(x.room):s.room?"• "+esc(s.room):""} ${s.teacher?"• "+esc(s.teacher):""}</small></div><div class="actions"><button class="present" onclick="mark('${s.id}',true,'${today()}')">${v===true?"✓ Present":"Present"}</button><button class="absent" onclick="mark('${s.id}',false,'${today()}')">${v===false?"✓ Absent":"Absent"}</button></div></div>`
}
function empty(a,b){return `<div class="card"><div class="main"><b>${a}</b><small>${b}</small></div></div>`}
function renderHome(){
  const total=data.subjects.reduce((a,s)=>a+s.present+s.absent,0),pr=data.subjects.reduce((a,s)=>a+s.present,0),ab=total-pr,p=total?100*pr/total:0,m=+data.settings.minPct||75,[c,st]=level(p,m);
  document.getElementById("hello").textContent=data.settings.name?`Hello, ${data.settings.name} 👋`:"Hello 👋";
  document.getElementById("todayText").textContent=`${todayName()} • ${new Date().toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}${data.settings.semester?" • "+data.settings.semester:""}`;
  document.getElementById("overall").textContent=p.toFixed(1)+"%";document.getElementById("gaugePct").textContent=p.toFixed(1)+"%";document.getElementById("overallBadge").textContent=total?`${st} • target ${m}%`:"Set up your semester";
  document.getElementById("overallHint").textContent=total?(p<m?`You are ${(m-p).toFixed(1)} points below your target.`:`Your attendance is ${p.toFixed(1)}%. Keep the buffer.`):"Add subjects and timetable to start.";
  document.getElementById("heroTarget").textContent=m+"%";document.getElementById("heroStreak").textContent=calcStreak();
  document.getElementById("present").textContent=pr;document.getElementById("absent").textContent=ab;document.getElementById("total").textContent=total;
  const sched=data.schedule.filter(x=>x.day===todayName()&&(!x.batch||!activeBatch||x.batch===activeBatch)).sort((a,b)=>a.start.localeCompare(b.start));
  const marked=sched.filter(x=>recordFor(today(),x.subjectId)!==undefined).length;document.getElementById("todayCount").textContent=`${marked}/${sched.length}`;
  const deg=Math.min(360,p*3.6);document.getElementById("gauge").style.background=`conic-gradient(var(--accent),var(--cyan) ${deg}deg,#252a35 ${deg}deg)`;
  const alert=document.getElementById("alert");alert.className="alert"+(p<m?" bad":"")+(total?"":" hidden");
  if(total)alert.innerHTML=p<m?`🔴 <b>Attendance below target.</b> ${data.subjects.filter(s=>percent(s)<minFor(s)).length} subject(s) need attention.`:`🟢 <b>${st}.</b> Use the planner before skipping a lecture.`;
  const arr=data.subjects.slice().sort((a,b)=>percent(a)-percent(b));document.getElementById("attentionCards").innerHTML=arr.filter(s=>percent(s)<minFor(s)+5).slice(0,4).map(subjectCard).join("")||empty("All good","No subject is currently close to the minimum.");
  document.getElementById("todayCards").innerHTML=sched.length?sched.map(scheduleCard).join(""):data.subjects.slice(0,4).map(s=>markCard(s,today())).join("")||empty("Nothing scheduled","Add a timetable or subjects.");
}
function renderSubjects(){
  let a=data.subjects.slice(),q=(document.getElementById("subjectSearch")?.value||"").toLowerCase(),sort=document.getElementById("subjectSort")?.value||"risk";
  a=a.filter(s=>`${s.name} ${s.code} ${s.teacher}`.toLowerCase().includes(q));
  if(sort==="az")a.sort((x,y)=>x.name.localeCompare(y.name));else if(sort==="pct")a.sort((x,y)=>percent(y)-percent(x));else a.sort((x,y)=>percent(x)-percent(y));
  document.getElementById("subjectsList").innerHTML=a.map(subjectCard).join("")||empty("No subjects","Add your first subject.")
}
function renderMark(){
  const d=document.getElementById("markDate").value||today(),h=data.holidays[d];document.getElementById("holidayBanner").innerHTML=h?`<div class="holidayNotice">🏖️ <b>${esc(h.name)}</b> — ${h.type==="half"?"Half day":"Full day"} holiday. Attendance is disabled for this date.</div>`:"";
  const sched=data.schedule.filter(x=>x.day===new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"})&&(!x.batch||!activeBatch||x.batch===activeBatch)).sort((a,b)=>a.start.localeCompare(b.start));
  const ids=sched.map(x=>x.subjectId);const list=ids.length?ids.map(id=>subject(id)).filter(Boolean):data.subjects;
  document.getElementById("markList").innerHTML=list.map(s=>markCard(s,d)).join("")||empty("No subjects","Add subjects first.")
}
function renderTimetable(){
  const active=document.querySelector(".day.active")?.dataset.day||todayName();
  document.getElementById("days").innerHTML=days.map(d=>`<button class="day ${d===active?"active":""}" data-day="${d}"><b>${d.slice(0,3)}</b><small>${data.schedule.filter(x=>x.day===d&&(!x.batch||!activeBatch||x.batch===activeBatch)).length} classes</small></button>`).join("");
  document.querySelectorAll(".day").forEach(b=>b.onclick=()=>{document.querySelectorAll(".day").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderTimetable()});
  const list=data.schedule.filter(x=>x.day===active&&(!x.batch||!activeBatch||x.batch===activeBatch)).sort((a,b)=>a.start.localeCompare(b.start));
  document.getElementById("scheduleList").innerHTML=list.map(x=>`<div class="card"><div class="main"><b>${esc(subject(x.subjectId)?.name||x.title||"Unknown")} ${x.batch?`<span class="badge">${esc(x.batch)}</span>`:""}</b><small>${x.start}${x.end?"–"+x.end:""} ${x.room?"• "+esc(x.room):""} ${subject(x.subjectId)?.teacher?"• "+esc(subject(x.subjectId).teacher):""}</small></div><div class="actions"><button onclick="openModal('class','${x.id}')">Edit</button><button onclick="delClass('${x.id}')">Delete</button></div></div>`).join("")||empty("No classes","Use Add timetable or scan your timetable photo.");
  document.getElementById("timetableMeta").textContent=`${data.settings.college||"College"} ${data.settings.division?"• "+data.settings.division:""} ${activeBatch?"• "+activeBatch:""}`;
  renderBatches();
}
function renderBatches(){
  const batches=["","S1","S2","S3","Other"];document.getElementById("batchButtons").innerHTML=batches.map(b=>`<button class="batchbtn ${b===activeBatch?"active":""}" onclick="setBatch('${b}')">${b||"All"}</button>`).join("")
}
function setBatch(b){activeBatch=b;data.settings.batch=b;save()}
function renderHolidays(){
  const ds=Object.keys(data.holidays).sort(),future=ds.find(d=>d>=today()),nh=document.getElementById("nextHoliday"),ns=document.getElementById("nextHolidaySub");
  if(future){nh.textContent=data.holidays[future].name;ns.textContent=`${future} • ${data.holidays[future].type==="half"?"Half day":"Full day"}`}else{nh.textContent="No upcoming holiday";ns.textContent="Add your college holidays below."}
  renderMonth();document.getElementById("holidayList").innerHTML=ds.map(d=>{let h=data.holidays[d];return `<div class="card"><div class="main"><b>${esc(h.name)}</b><small>${d} • ${h.type==="half"?"Half day":"Full day"} • excluded from attendance</small></div><div class="actions"><button onclick="openModal('holiday','${d}')">Edit</button><button onclick="delHoliday('${d}')">Delete</button></div></div>`}).join("")||empty("No holidays","Add college holidays as needed.")
}
function renderMonth(){
  const y=calMonth.getFullYear(),m=calMonth.getMonth(),title=calMonth.toLocaleDateString(undefined,{month:"long",year:"numeric"});document.getElementById("monthTitle").textContent=title;
  const first=new Date(y,m,1).getDay(),start=(first+6)%7,daysIn=new Date(y,m+1,0).getDate();let html=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div class="caldow">${x}</div>`).join("");
  for(let i=0;i<start;i++)html+=`<div class="calday muted"></div>`;
  for(let d=1;d<=daysIn;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,r=data.records[ds]||{},vals=Object.values(r),p=vals.filter(Boolean).length,t=vals.length,cls=data.holidays[ds]?"holiday":t?(p===t?"present":p===0?"absent":""):"";html+=`<div class="calday ${cls}" onclick="document.getElementById('markDate').value='${ds}';nav('mark')"><b>${d}</b><small>${data.holidays[ds]?"Holiday":t?`${p}/${t}`:""}</small></div>`}
  document.getElementById("monthGrid").innerHTML=html
}
function renderHistory(){
  const ds=Object.keys(data.records).sort().reverse();document.getElementById("historyList").innerHTML=ds.map(d=>{const r=data.records[d],rows=Object.entries(r).map(([id,v])=>subject(id)?`<div class="row"><span>${esc(subject(id).name)}</span><span><b>${v?"Present":"Absent"}</b> <button onclick="mark('${id}',${v?false:true},'${d}')">Change</button></span></div>`:"").join("");return `<div class="historyday"><strong>${d}</strong>${rows}</div>`}).join("")||empty("No attendance history","Mark your first class.")
}
function options(id){document.getElementById(id).innerHTML=`<option value="">Select subject</option>`+data.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}
function renderPlanner(){
  ["simSubject","recoverSubject","marginSubject"].forEach(options);updatePlannerResults()
}
function calcStreak(){
  let streak=0,d=new Date();for(let i=0;i<120;i++){const ds=d.toISOString().slice(0,10),r=data.records[ds];if(r&&Object.values(r).some(v=>v===true)){streak++;d.setDate(d.getDate()-1)}else if(data.holidays[ds]){d.setDate(d.getDate()-1)}else break}return streak
}
function updatePlannerResults(){
  let s=subject(document.getElementById("recoverSubject").value),m;
  if(s){m=minFor(s)/100;let n=0;while((s.present+n)/(s.present+s.absent+n)<m&&n<10000)n++;document.getElementById("recoverResult").innerHTML=percent(s)>=minFor(s)?`🟢 Already above minimum at <b>${percent(s).toFixed(1)}%</b>.`:`📚 Attend the next <b>${n}</b> consecutive classes to reach ${minFor(s)}%.`}else document.getElementById("recoverResult").textContent="Choose a subject.";
  s=subject(document.getElementById("marginSubject").value);if(s){m=minFor(s)/100;let n=0;while(s.present/(s.present+s.absent+n)>=m&&n<10000)n++;document.getElementById("marginResult").innerHTML=`🛡️ Safe absence margin: <b>${Math.max(0,n-1)}</b> class${Math.max(0,n-1)===1?"":"es"}.`}else document.getElementById("marginResult").textContent="Choose a subject."
}
function simulate(type){
  const s=subject(document.getElementById("simSubject").value);if(!s){document.getElementById("simResult").textContent="Choose a subject.";return}
  const n=type==="attend"?1:type==="attend5"?5:type==="attend10"?10:type==="miss"?1:5, p=s.present+(type.startsWith("attend")?n:0),a=s.absent+(type.startsWith("attend")?0:n),pct=100*p/(p+a);
  document.getElementById("simResult").innerHTML=`<b>${type.startsWith("attend")?"After attending":"After missing"} ${n} class${n>1?"es":""}: ${pct.toFixed(1)}%</b><br><small>Current ${percent(s).toFixed(1)}% • target ${minFor(s)}% • ${pct>=minFor(s)?"Within target":"Below target"}</small>`
}
function renderAnalytics(){
  const total=data.subjects.reduce((a,s)=>a+s.present+s.absent,0),pr=data.subjects.reduce((a,s)=>a+s.present,0),p=total?100*pr/total:0;
  document.getElementById("analyticsOverall").textContent=p.toFixed(1)+"%";let a=data.subjects.slice().sort((x,y)=>percent(y)-percent(x)),w=a.slice().sort((x,y)=>percent(x)-percent(y));
  document.getElementById("bestSubject").textContent=a[0]?`${a[0].name} • ${percent(a[0]).toFixed(1)}%`:"—";document.getElementById("worstSubject").textContent=w[0]?`${w[0].name} • ${percent(w[0]).toFixed(1)}%`:"—";
  const month=new Date().toISOString().slice(0,7);document.getElementById("monthClasses").textContent=Object.entries(data.records).filter(([d])=>d.startsWith(month)).reduce((n,[,r])=>n+Object.keys(r).length,0);
  document.getElementById("bars").innerHTML=a.map(s=>`<div class="bar"><div class="barhead"><span>${esc(s.name)}</span><b>${percent(s).toFixed(1)}%</b></div><div class="barline"><div class="barfill" style="width:${Math.min(100,percent(s))}%"></div></div></div>`).join("")||empty("No data","Add subjects.");
  const last=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().slice(0,10),r=data.records[ds]||{},v=Object.values(r),pct=v.length?100*v.filter(Boolean).length/v.length:0;last.push({ds,pct})}
  document.getElementById("trend").innerHTML=`<div class="trendgrid">${last.map(x=>`<div class="trendcol" title="${x.ds}: ${x.pct.toFixed(0)}%"><div class="trendbar" style="height:${Math.max(5,x.pct)}%"></div><div class="trendlabel">${x.ds.slice(8)}</div></div>`).join("")}</div>`
}
function renderCollege(){
  document.getElementById("assignmentCount").textContent=`${data.assignments.length} assignment${data.assignments.length===1?"":"s"} stored`;
  document.getElementById("examCount").textContent=`${data.exams.length} exam${data.exams.length===1?"":"s"} stored`;
  document.getElementById("profileSummary").innerHTML=`<div class="row"><span>College</span><b>${esc(data.settings.college||"Not set")}</b></div><div class="row"><span>Department</span><b>${esc(data.settings.department||"Not set")}</b></div><div class="row"><span>Academic year</span><b>${esc(data.settings.academicYear||"Not set")}</b></div><div class="row"><span>Semester / Division</span><b>${esc(data.settings.semester||"—")} / ${esc(data.settings.division||"—")}</b></div><div class="row"><span>Batch</span><b>${esc(activeBatch||"All")}</b></div>`
}
function renderSettings(){
  const s=data.settings;for(const id of ["studentName","collegeName","department","academicYear","semester","division","minPct","batch"]){const el=document.getElementById(id);if(el)el.value=id==="studentName"?s.name:id==="collegeName"?s.college:id==="department"?s.department:id==="academicYear"?s.academicYear:id==="semester"?s.semester:id==="division"?s.division:id==="minPct"?s.minPct:s.batch}
}
function render(){renderHome();renderSubjects();renderMark();renderTimetable();renderHolidays();renderHistory();renderPlanner();renderAnalytics();renderCollege();renderSettings()}
function nav(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));render();window.scrollTo({top:0,behavior:"smooth"})}

function openModal(type,id=null){
  const m=document.getElementById("modal"),f=document.getElementById("form");m.classList.remove("hidden");
  if(type==="subject"){
    const s=id&&subject(id);document.getElementById("modalTitle").textContent=id?"Edit subject":"Add subject";
    f.innerHTML=`<div class="form"><label>Subject name<input id="fName" required value="${esc(s?.name||"")}"></label><div class="formGrid"><label>Short code<input id="fCode" value="${esc(s?.code||"")}"></label><label>Minimum attendance %<input id="fMin" type="number" min="1" max="100" value="${s?.min||data.settings.minPct}"></label></div><label>Teacher / Faculty<input id="fTeacher" value="${esc(s?.teacher||"")}"></label><label>Default room<input id="fRoom" value="${esc(s?.room||"")}"></label><div class="formGrid"><label>Initial present<input id="fP" type="number" min="0" value="${s?.present||0}"></label><label>Initial absent<input id="fA" type="number" min="0" value="${s?.absent||0}"></label></div><button class="primary" type="submit">Save subject</button></div>`;
    f.onsubmit=e=>{e.preventDefault();const obj={name:document.getElementById("fName").value.trim(),code:document.getElementById("fCode").value.trim().toUpperCase(),min:+document.getElementById("fMin").value||75,teacher:document.getElementById("fTeacher").value.trim(),room:document.getElementById("fRoom").value.trim(),present:+document.getElementById("fP").value||0,absent:+document.getElementById("fA").value||0};if(!obj.name)return;if(id)Object.assign(s,obj);else data.subjects.push({id:uid(),...obj});m.classList.add("hidden");save();toast(id?"Subject updated":"Subject added")}
  }else if(type==="class"){
    const x=id?data.schedule.find(z=>z.id===id):null;document.getElementById("modalTitle").textContent=id?"Edit timetable class":"Add timetable class";
    f.innerHTML=`<div class="form"><label>Day<select id="fDay">${days.map(d=>`<option ${d===x?.day?"selected":""}>${d}</option>`).join("")}</select></label><label>Subject<select id="fSub">${data.subjects.map(s=>`<option value="${s.id}" ${s.id===x?.subjectId?"selected":""}>${esc(s.name)}</option>`).join("")}</select></label><div class="formGrid"><label>Start<input id="fStart" type="time" required value="${x?.start||""}"></label><label>End<input id="fEnd" type="time" value="${x?.end||""}"></label></div><div class="formGrid"><label>Batch<select id="fBatch"><option value="">All</option><option ${x?.batch==="S1"?"selected":""}>S1</option><option ${x?.batch==="S2"?"selected":""}>S2</option><option ${x?.batch==="S3"?"selected":""}>S3</option><option ${x?.batch==="Other"?"selected":""}>Other</option></select></label><label>Room<input id="fCRoom" value="${esc(x?.room||"")}"></label></div><button class="primary" type="submit">Save class</button></div>`;
    f.onsubmit=e=>{e.preventDefault();const obj={id:x?.id||uid(),day:document.getElementById("fDay").value,subjectId:document.getElementById("fSub").value,start:document.getElementById("fStart").value,end:document.getElementById("fEnd").value,batch:document.getElementById("fBatch").value,room:document.getElementById("fCRoom").value.trim()};if(x)Object.assign(x,obj);else data.schedule.push(obj);m.classList.add("hidden");save();toast("Timetable saved")}
  }else if(type==="holiday"){
    const h=id&&data.holidays[id];document.getElementById("modalTitle").textContent=id?"Edit holiday":"Add holiday";
    f.innerHTML=`<div class="form"><label>Date<input id="fDate" type="date" required value="${id||today()}"></label><label>Holiday name<input id="fHName" required placeholder="Independence Day" value="${esc(h?.name||"")}"></label><label>Type<select id="fHType"><option value="full" ${h?.type!=="half"?"selected":""}>Full day</option><option value="half" ${h?.type==="half"?"selected":""}>Half day</option></select></label><button class="primary" type="submit">Save holiday</button></div>`;
    f.onsubmit=e=>{e.preventDefault();const d=document.getElementById("fDate").value;if(id&&id!==d)delete data.holidays[id];data.holidays[d]={name:document.getElementById("fHName").value.trim(),type:document.getElementById("fHType").value};m.classList.add("hidden");save();toast("Holiday saved")}
  }else if(type==="scanReview"){
    document.getElementById("modalTitle").textContent="Review timetable scan";
    const parsed=id||[];f.innerHTML=`<div class="form"><div class="holidayNotice">📷 Scan results are a draft. Review every row before importing.</div>${parsed.length?parsed.map((r,i)=>`<div class="card"><div class="main"><b>${esc(r.day||"Unknown")} • ${esc(r.start||"--")}</b><small>${esc(r.text||"Detected timetable text")}</small></div></div>`).join(""):empty("No rows detected","Use manual setup or try a clearer timetable image.")}<button class="primary" type="button" onclick="document.getElementById('modal').classList.add('hidden');openModal('class')">＋ Add detected data manually</button></div>`;
  }
}
function delSubject(id){if(confirm("Delete subject and its attendance records?")){data.subjects=data.subjects.filter(s=>s.id!==id);Object.values(data.records).forEach(r=>delete r[id]);data.schedule=data.schedule.filter(x=>x.subjectId!==id);save();toast("Subject deleted")}}
function delHoliday(d){if(confirm("Delete this holiday?")){delete data.holidays[d];save();toast("Holiday deleted")}}
function delClass(id){data.schedule=data.schedule.filter(x=>x.id!==id);save();toast("Class removed")}

function importBackup(file){
  const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.subjects||!x.records)throw 0;data=normalize(x);localStorage.setItem(KEY_V10,JSON.stringify(data));activeBatch=data.settings.batch||"";render();toast("Backup restored")}catch{alert("Invalid attendance backup file")}};r.readAsText(file)
}
function exportBackup(){const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="attandace-pro-v10-backup.json";a.click();URL.revokeObjectURL(a.href)}
async function scanTimetable(){
  const input=document.getElementById("timetableFile");input.click();
  input.onchange=async()=>{const file=input.files[0];if(!file)return;
    if(file.type==="application/pdf"){toast("PDF selected — review/import PDF pages manually for now");return}
    const url=URL.createObjectURL(file);document.getElementById("modalTitle").textContent="Timetable photo";
    const f=document.getElementById("form"),m=document.getElementById("modal");m.classList.remove("hidden");
    f.innerHTML=`<div class="form"><img src="${url}" style="width:100%;max-height:50vh;object-fit:contain;border-radius:16px;background:#000"><div class="holidayNotice">The V10 scanner prepares the image for timetable extraction. For reliable S1/S2/S3 recognition, verify the detected rows before saving.</div><button class="primary" type="button" id="continueScan">Review timetable</button></div>`;
    document.getElementById("continueScan").onclick=()=>{m.classList.add("hidden");openModal("scanReview",[]);toast("Review mode opened")};
  }
}
function loadDemo(){
  const ids={};const subjects=[["Java Programming","JPR","D.J. Ghanawa","C209"],["Microprocessor","MIC","S.S. Kedar","C213"],["UI/UX Design","UID","S.S. Gosavi","C211"],["Data Communication & Network","DCN","K.S. Kambale","C211"],["Python Programming","PWP","C.P. Jadhav","C210"]].map(([name,code,teacher,room],i)=>{const s={id:uid(),name,code,min:75,teacher,room,present:16-i,absent:i+2};ids[code]=s.id;return s});
  data=baseData();data.subjects=subjects;data.settings={name:"Tanmay",college:"Fabtech Technical Campus",department:"Computer Engineering",academicYear:"2026–27",semester:"Semester 4",division:"CW4K",minPct:75,batch:"S2"};
  const add=(day,start,end,code,batch,room)=>data.schedule.push({id:uid(),day,start,end,subjectId:ids[code],batch,room});
  add("Monday","09:30","10:30","JPR","S1","C209");add("Monday","09:30","10:30","MIC","S2","C213");add("Monday","09:30","10:30","UID","S3","C211");
  add("Monday","10:30","11:30","MIC","S1","C213");add("Monday","10:30","11:30","UID","S2","C211");add("Monday","10:30","11:30","JPR","S3","C209");
  add("Tuesday","09:30","10:30","DCN","S2","C211");add("Tuesday","10:30","11:30","PWP","S2","C210");add("Wednesday","09:30","10:30","MIC","S2","C213");add("Thursday","10:30","11:30","UID","S2","C211");add("Friday","09:30","10:30","JPR","S2","C209");
  save();toast("Sample V10 data loaded")
}

document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));
document.getElementById("addSubject").onclick=()=>openModal("subject");
document.getElementById("addHoliday").onclick=()=>openModal("holiday");
document.getElementById("addTimetable").onclick=()=>data.subjects.length?openModal("class"):toast("Add a subject first");
document.getElementById("manualTimetable").onclick=()=>data.subjects.length?openModal("class"):toast("Add a subject first");
document.getElementById("scanTimetable").onclick=scanTimetable;
document.getElementById("close").onclick=()=>document.getElementById("modal").classList.add("hidden");
document.getElementById("markDate").value=today();document.getElementById("markDate").onchange=renderMark;
document.getElementById("markAllPresent").onclick=()=>{const d=document.getElementById("markDate").value||today();data.subjects.forEach(s=>mark(s.id,true,d));};
document.getElementById("clearDay").onclick=()=>{const d=document.getElementById("markDate").value||today();if(confirm("Clear attendance for this day?"))clearDay(d)};
document.getElementById("subjectSearch").oninput=renderSubjects;document.getElementById("subjectSort").onchange=renderSubjects;
["recoverSubject","marginSubject"].forEach(id=>document.getElementById(id).onchange=updatePlannerResults);
document.querySelectorAll("[data-sim]").forEach(b=>b.onclick=()=>simulate(b.dataset.sim));
document.getElementById("studentName").onchange=e=>{data.settings.name=e.target.value.trim();save()};
document.getElementById("collegeName").onchange=e=>{data.settings.college=e.target.value.trim();save()};
document.getElementById("department").onchange=e=>{data.settings.department=e.target.value.trim();save()};
document.getElementById("academicYear").onchange=e=>{data.settings.academicYear=e.target.value.trim();save()};
document.getElementById("semester").onchange=e=>{data.settings.semester=e.target.value.trim();save()};
document.getElementById("division").onchange=e=>{data.settings.division=e.target.value.trim();save()};
document.getElementById("minPct").onchange=e=>{data.settings.minPct=Math.max(1,Math.min(100,+e.target.value||75));save();toast("Minimum updated")};
document.getElementById("batch").onchange=e=>{activeBatch=e.target.value;data.settings.batch=activeBatch;save()};
document.getElementById("themeBtn").onclick=()=>{document.documentElement.classList.toggle("light");localStorage.setItem("v10theme",document.documentElement.classList.contains("light")?"light":"dark")};
if(localStorage.getItem("v10theme")==="light")document.documentElement.classList.add("light");
document.getElementById("prevMonth").onclick=()=>{calMonth.setMonth(calMonth.getMonth()-1);renderMonth()};
document.getElementById("nextMonth").onclick=()=>{calMonth.setMonth(calMonth.getMonth()+1);renderMonth()};
document.getElementById("clearHistory").onclick=()=>{if(confirm("Clear all attendance records and reset subject totals?")){data.records={};data.subjects.forEach(s=>{s.present=0;s.absent=0});save();toast("History cleared")}};
document.getElementById("export").onclick=exportBackup;
document.getElementById("import").onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0])};
document.getElementById("reset").onclick=()=>{if(confirm("Reset ALL V10 data? This cannot be undone.")){localStorage.removeItem(KEY_V10);location.reload()}};
document.getElementById("demo").onclick=loadDemo;
document.getElementById("notifyBtn").onclick=async()=>{if(!("Notification"in window)){toast("Notifications not supported");return}const p=await Notification.requestPermission();toast(p==="granted"?"Notifications enabled":"Permission not granted")};
document.getElementById("addAssignment").onclick=()=>{data.assignments.push({id:uid(),title:"New assignment",created:today()});save();toast("Assignment placeholder added")};
document.getElementById("addExam").onclick=()=>{data.exams.push({id:uid(),title:"New exam",date:today()});save();toast("Exam placeholder added")};
document.getElementById("notesCard").onclick=()=>{data.notes.push({id:uid(),text:"New note",date:today()});save();toast("Note placeholder added")};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
render();
