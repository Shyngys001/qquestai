/*  Fixed OpenAI API Key (demo) */

/*  State  */
let questions=[], answers=[], current=0, score=0, timerId=null, timePerQ=30, sessionMeta={};

/*  DOM helpers  */
const $  = s=>document.querySelector(s);
const txt=(s,t)=>$(s).textContent=t;
const show=id=>{ hideAll(); $("#"+id).classList.remove("hidden"); }
const hideAll=()=>["setup","quiz","result","cabinet"].forEach(i=>$("#"+i).classList.add("hidden"));
const loader=on=>$("#loader").classList.toggle("hidden",!on);

/*  nav  */
$("#navQuiz").onclick   = ()=>{navSel("navQuiz");show("setup");};
$("#navCabinet").onclick= ()=>{navSel("navCabinet");renderCabinet();show("cabinet");};
const navSel=id=>document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.id===id));

/*  Start  */
$("#startBtn").onclick=async()=>{
  const lang=$("#language").value, subj=$("#subject").value, diff=$("#difficulty").value;
  const cnt=+$("#qCount").value||5; timePerQ=+$("#timePerQ").value||30;

  navSel("navQuiz"); hideAll(); show("quiz"); loader(true);

  try{ questions=await genQs(lang,subj,diff,cnt); loader(false); beginQuiz(lang,subj,diff,cnt);}
  catch(e){loader(false);alert("GPT қатесі: "+e.message);show("setup");}
};

/*  GPT  */
async function genQs(lang,subj,level,n){
  const prompt=`Generate ${n} ${level}-level multiple-choice quiz questions in ${lang}. Topic: ${subj}. Return JSON with question, options, answerIndex.`;
  const r=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+API_KEY},
    body:JSON.stringify({model:"gpt-4o-mini",messages:[
      {role:"system",content:"You are an educational content generator."},
      {role:"user",content:prompt}]})
  });
  const d=await r.json();
  let raw=d.choices?.[0]?.message?.content||"[]";
  if(raw.startsWith("```")) raw=raw.replace(/```[a-z]*|```/g,"");
  return JSON.parse(raw);
}

/*  Quiz flow  */
function beginQuiz(lang,subj,diff,cnt){
  current=score=0; answers=[];
  sessionMeta={date:Date.now(),language:lang,subject:subj,difficulty:diff,total:cnt};
  next();
}
function next(){
  const q=questions[current];
  txt("#questionNumber",`Сұрақ ${current+1}/${questions.length}`);
  txt("#questionText",q.question);
  $("#options").innerHTML=q.options.map((o,i)=>`<label><input type="radio" name="opt" value="${i}"><span>${o}</span></label>`).join("");
  startTimer();
}
function startTimer(){
  clearInterval(timerId); let t=timePerQ; txt("#timer",t+"s");
  timerId=setInterval(()=>{t--;txt("#timer",t+"s");if(t<=0){clearInterval(timerId);submit();}},1000);
}
$("#submitBtn").onclick=submit;
function submit(){
  clearInterval(timerId);
  const sel=document.querySelector("input[name='opt']:checked"), pick=sel?+sel.value:null;
  if(pick===questions[current].answerIndex) score++;
  answers.push({q:questions[current].question,user:pick,correct:questions[current].answerIndex});
  current++; current<questions.length?next():finish();
}
function finish(){
  hideAll(); show("result");
  txt("#scoreText",`Дұрыс жауаптар: ${score}/${questions.length}`);
  const hist=JSON.parse(localStorage.getItem("quizHistory")||"[]");
  hist.push({...sessionMeta,score,answers});
  localStorage.setItem("quizHistory",JSON.stringify(hist));
}

/*  Cabinet  */
function renderCabinet(){
  const hist=JSON.parse(localStorage.getItem("quizHistory")||"[]").reverse();
  const tb=$("#historyTable tbody"); tb.innerHTML="";
  if(!hist.length){tb.innerHTML="<tr><td colspan='4'>Тарих бос</td></tr>";}
  hist.forEach(h=>{
    const d=new Date(h.date).toLocaleDateString("kk-KZ");
    tb.insertAdjacentHTML("beforeend",
      `<tr><td>${d}</td><td>${h.subject}</td><td>${h.difficulty}</td><td>${h.score}/${h.total}</td></tr>`);
  });

  /* stats */
  const stat={}; hist.forEach(h=>{
    if(!stat[h.subject]) stat[h.subject]={attempts:0,correct:0,total:0};
    stat[h.subject].attempts++; stat[h.subject].correct+=h.score; stat[h.subject].total+=h.total;
  });
  $("#statsList").innerHTML=Object.entries(stat).map(([s,v])=>{
    const pct=Math.round(v.correct/v.total*100)||0;
    return `<li><strong>${s}</strong>: ${v.attempts} тест, орташа ${pct}%</li>`;
  }).join("")||"<li>Әлі дерек жоқ</li>";
}
$("#clearHistory").onclick=()=>{if(confirm("Өшіру?")){localStorage.removeItem("quizHistory");renderCabinet();}};

/*  init  */
navSel("navQuiz"); show("setup");