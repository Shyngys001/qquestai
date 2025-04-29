/* -----------------------------------------------------------
 *  QuizQuest AI – Front-end logic (frontend/js/app.js)
 *  Никаких секретных ключей!  Браузер общается лишь с /api.
 * -----------------------------------------------------------
 */

/* =======  state  ======= */
let questions = [];          // [{question, options, answerIndex}, …]
let answers   = [];          // per-question user choices
let current   = 0;           // current question idx
let score     = 0;           // correct answers counter
let timerId   = null;        // setInterval id
let timePerQ  = 30;          // seconds for every question
let session   = {};          // meta for history

/* =======  tiny helpers  ======= */
const $        = s => document.querySelector(s);
const txt      = (sel, t) => $(sel).textContent = t;
const hideAll  = () => ["setup", "quiz", "result", "cabinet"]
                      .forEach(id => $("#" + id).classList.add("hidden"));
const show     = id => { hideAll(); $("#" + id).classList.remove("hidden"); };
const loader   = on => $("#loader").classList.toggle("hidden", !on);

/* =======  navigation bar  ======= */
const navSel = id => document
  .querySelectorAll(".nav-btn")
  .forEach(b => b.classList.toggle("active", b.id === id));

$("#navQuiz")   .onclick = () => { navSel("navQuiz");   show("setup");  };
$("#navCabinet").onclick = () => { navSel("navCabinet"); renderCabinet(); show("cabinet"); };

/* =======  start button  ======= */
$("#startBtn").onclick = async () => {
  const language   = $("#language").value;
  const subject    = $("#subject").value;
  const difficulty = $("#difficulty").value;
  const count      = +$("#qCount").value    || 5;
        timePerQ  = +$("#timePerQ").value  || 30;

  navSel("navQuiz");
  hideAll(); show("quiz"); loader(true);

  try {
    questions = await fetchQuestions(language, subject, difficulty, count);
    loader(false);
    beginQuiz({ language, subject, difficulty, total: count });
  } catch (err) {
    loader(false);
    alert("Сервер қатесі: " + err.message);
    show("setup");
  }
};

/* =======  ask backend for questions  ======= */
async function fetchQuestions(language, subject, difficulty, count) {
  const resp = await fetch("/api/generate", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ language, subject, difficulty, count })
  });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}

/* =======  quiz flow  ======= */
function beginQuiz(meta) {
  current = score = 0;
  answers = [];
  session = { date: Date.now(), ...meta };
  nextQuestion();
}

function nextQuestion() {
  const q = questions[current];

  txt("#questionNumber", `Сұрақ ${current + 1}/${questions.length}`);
  txt("#questionText",   q.question);

  /* answer options */
  $("#options").innerHTML = q.options
    .map((opt, i) =>
      `<label class="option">
         <input type="radio" name="opt" value="${i}">
         <span>${opt}</span>
       </label>`).join("");

  startTimer();
}

function startTimer() {
  clearInterval(timerId);
  let t = timePerQ;
  txt("#timer", t + "s");
  timerId = setInterval(() => {
    txt("#timer", --t + "s");
    if (t <= 0) { clearInterval(timerId); submitAnswer(); }
  }, 1000);
}

$("#submitBtn").onclick = submitAnswer;

function submitAnswer() {
  clearInterval(timerId);

  const picked = +document.querySelector("input[name='opt']:checked")?.value;
  if (picked === questions[current].answerIndex) score++;

  answers.push({
    q       : questions[current].question,
    user    : Number.isFinite(picked) ? picked : null,
    correct : questions[current].answerIndex
  });

  current++;
  current < questions.length ? nextQuestion() : finishQuiz();
}

function finishQuiz() {
  hideAll(); show("result");
  txt("#scoreText", `Дұрыс жауаптар: ${score}/${questions.length}`);

  const history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
  history.push({ ...session, score, answers });
  localStorage.setItem("quizHistory", JSON.stringify(history));
}

/* =======  cabinet (history & stats)  ======= */
function renderCabinet() {
  const hist = JSON.parse(localStorage.getItem("quizHistory") || "[]").reverse();
  const tbody = $("#historyTable tbody");
  tbody.innerHTML = hist.length ? "" : "<tr><td colspan='4'>Тарих бос</td></tr>";

  hist.forEach(h => {
    const date = new Date(h.date).toLocaleDateString("kk-KZ");
    tbody.insertAdjacentHTML("beforeend",
      `<tr>
         <td>${date}</td>
         <td>${h.subject}</td>
         <td>${h.difficulty}</td>
         <td>${h.score}/${h.total}</td>
       </tr>`);
  });

  /* aggregate stats */
  const stats = {};
  hist.forEach(h => {
    stats[h.subject] ??= { attempts: 0, correct: 0, total: 0 };
    stats[h.subject].attempts++;
    stats[h.subject].correct += h.score;
    stats[h.subject].total   += h.total;
  });

  $("#statsList").innerHTML = Object.entries(stats).map(([subj, v]) => {
    const pct = Math.round((v.correct / v.total) * 100) || 0;
    return `<li><strong>${subj}</strong>: ${v.attempts} тест, орташа ${pct}%</li>`;
  }).join("") || "<li>Әлі дерек жоқ</li>";
}

$("#clearHistory").onclick = () => {
  if (confirm("Өшіру?")) {
    localStorage.removeItem("quizHistory");
    renderCabinet();
  }
};

/* =======  init on load ======= */
navSel("navQuiz");
show("setup");