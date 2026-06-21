"use client";

import { useEffect, useMemo, useState } from "react";
import { QuizSet, Attempt, Answer, ViewMode, AppMode } from "@/components/types";
import CandidateDashboard from "@/components/CandidateDashboard";
import QuizEngine from "@/components/QuizEngine";

const sampleJson = `{
  "title": "June 1, 2026 Current Affairs",
  "description": "Daily practice questions covering national and international events.",
  "category": "Current Affairs",
  "tags": ["International", "Technology"],
  "questions": [
    {
      "question": "Which country is targeted under the NSDC and Fourth Valley Concierge Corporation partnership to facilitate the movement of at least 50,000 skilled Indian professionals over five years?",
      "options": ["South Korea", "Germany", "Australia", "Japan"],
      "correctAnswerIndex": 3,
      "explanation": "The National Skill Development Corporation (NSDC) partnered with Tokyo-based Fourth Valley Concierge Corporation (FVCC) on May 26, 2026, to facilitate the movement of at least 50,000 skilled Indian workers to Japan over a five-year period.",
      "category": "International"
    }
  ]
}`;

const setKey = "quiz.offlineSets";
const attemptKey = "quiz.attempts";
const progressKey = "quiz.progress";
const tokenKey = "quiz.adminToken";

export default function Home() {
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState("Loading quiz sets...");
  const [appMode, setAppMode] = useState<AppMode>("candidate");
  const [adminToken, setAdminToken] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [adminPage, setAdminPage] = useState(1);
  const [adminSets, setAdminSets] = useState<QuizSet[]>([]);
  const [adminTotalPages, setAdminTotalPages] = useState(1);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectedSet = useMemo(() => sets.find((set) => set.id === selectedSetId), [sets, selectedSetId]);
  const currentQuestion = selectedSet?.questions[questionIndex];
  
  const score = selectedSet
    ? selectedSet.questions.reduce((total, question, index) => total + (answers[index] === question.correctAnswerIndex ? 1 : 0), 0)
    : 0;
    
  const answeredCount = selectedSet ? selectedSet.questions.filter((_, idx) => typeof answers[idx] === "number").length : 0;
  const markedCount = selectedSet ? selectedSet.questions.filter((_, idx) => Boolean(marked[idx])).length : 0;

  useEffect(() => {
    const savedToken = localStorage.getItem(tokenKey) ?? "";
    const savedAttempts = JSON.parse(localStorage.getItem(attemptKey) ?? "[]");
    setAdminToken(savedToken);
    setAttempts(Array.isArray(savedAttempts) ? savedAttempts : []);
    loadSets();
  }, []);

  useEffect(() => {
    if (!selectedSet || viewMode === "select" || isSubmitted) return;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
    savedProgress[selectedSet.id] = { questionIndex, answers, marked };
    localStorage.setItem(progressKey, JSON.stringify(savedProgress));
  }, [answers, marked, questionIndex, selectedSet, viewMode, isSubmitted]);

  function normalizeSavedAnswers(value: unknown, total: number): Answer[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, idx) => typeof incoming[idx] === "number" ? incoming[idx] as number : null);
  }

  function normalizeSavedMarked(value: unknown, total: number): boolean[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, idx) => Boolean(incoming[idx]));
  }

  async function loadSets() {
    try {
      const response = await fetch("/api/sets?limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      setSets(data.sets);
      localStorage.setItem(setKey, JSON.stringify(data.sets));
      setStatus("Online sets loaded");
    } catch {
      const cached = JSON.parse(localStorage.getItem(setKey) ?? "[]");
      setSets(Array.isArray(cached) ? cached : []);
      setStatus(cached.length ? "Using downloaded offline sets" : "No sets available yet");
    }
  }

  async function loadAdminSets(page = adminPage) {
    const response = await fetch(`/api/sets?page=${page}&limit=5`, { cache: "no-store" });
    const data = await response.json();
    setAdminSets(data.sets ?? []);
    setAdminTotalPages(data.totalPages ?? 1);
    setAdminPage(page);
  }

  function startTest(id: string) {
    const set = sets.find((item) => item.id === id);
    if (!set) return;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
    const progress = savedProgress[id];
    
    setSelectedSetId(id);
    setIsSubmitted(false);
    setQuestionIndex(Math.min(Math.max(Number(progress?.questionIndex ?? 0), 0), set.questions.length - 1));
    setAnswers(normalizeSavedAnswers(progress?.answers, set.questions.length));
    setMarked(normalizeSavedMarked(progress?.marked, set.questions.length));
    setViewMode("test");
  }

  function answerQuestion(optionIndex: number) {
    if (!selectedSet || isSubmitted) return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = optionIndex;
    setAnswers(nextAnswers);
  }

  function clearResponse() {
    if (isSubmitted) return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = null;
    setAnswers(nextAnswers);
  }

  function toggleMark() {
    if (isSubmitted) return;
    const nextMarked = [...marked];
    nextMarked[questionIndex] = !nextMarked[questionIndex];
    setMarked(nextMarked);
  }

  function submitTest() {
    if (!selectedSet) return;
    const nextAttempt: Attempt = {
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      score: score,
      total: selectedSet.questions.length,
      answers,
      completedAt: new Date().toISOString()
    };
    const nextAttempts = [nextAttempt, ...attempts].slice(0, 50);
    setAttempts(nextAttempts);
    localStorage.setItem(attemptKey, JSON.stringify(nextAttempts));
    setIsSubmitted(true);
  }

  async function loginAdmin(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Checking admin login...");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: adminId, password: adminPassword })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Login failed");
      return;
    }
    setAdminToken(data.token);
    localStorage.setItem(tokenKey, data.token);
    setMessage("Admin panel unlocked");
    loadAdminSets(1);
  }

  async function uploadJson() {
    setMessage("Uploading set...");
    let parsed;
    try { parsed = JSON.parse(jsonInput); } catch {
      setMessage("JSON is not valid. Check commas and quotes.");
      return;
    }
    const response = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify(parsed)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    setMessage(`Saved ${data.saved} set${data.saved === 1 ? "" : "s"}.`);
    await loadSets();
    await loadAdminSets(1);
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">{appMode === "admin" ? "Administrative Console" : "Assessment Console"}</p>
          <h1>{appMode === "admin" ? "Question Set Management" : "Current Affairs Online Test"}</h1>
        </div>
        <div className="topActions">
          <button className="ghost" onClick={() => { setAppMode(appMode === "admin" ? "candidate" : "admin"); setMessage(""); if(appMode !== "admin" && adminToken) loadAdminSets(1); }}>
            {appMode === "admin" ? "Candidate view" : "Admin"}
          </button>
        </div>
      </header>

      {appMode === "candidate" && (
        <section className="shell">
          {viewMode === "select" ? (
            <CandidateDashboard sets={sets} attempts={attempts} status={status} downloadOffline={() => localStorage.setItem(setKey, JSON.stringify(sets))} startTest={startTest} />
          ) : (
            selectedSet && currentQuestion && (
              <QuizEngine selectedSet={selectedSet} currentQuestion={currentQuestion} questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} viewMode={viewMode} answers={answers} marked={marked} score={score} answeredCount={answeredCount} markedCount={markedCount} isSubmitted={isSubmitted} answerQuestion={answerQuestion} clearResponse={clearResponse} toggleMark={toggleMark} goPrevious={() => setQuestionIndex(Math.max(questionIndex - 1, 0))} goNext={() => setQuestionIndex(Math.min(questionIndex + 1, selectedSet.questions.length - 1))} submitTest={submitTest} startDetailedReview={() => { setQuestionIndex(0); setViewMode("review"); }} retry={() => { setAnswers(Array.from({ length: selectedSet.questions.length }, () => null)); setMarked(Array.from({ length: selectedSet.questions.length }, () => false)); setQuestionIndex(0); setIsSubmitted(false); setViewMode("test"); }} backToTests={() => { setSelectedSetId(""); setQuestionIndex(0); setAnswers([]); setMarked([]); setIsSubmitted(false); setViewMode("select"); }} />
            )
          )}
        </section>
      )}

      {appMode === "admin" && (
        <section className="adminScreen">
          <div className="adminHero">
            <div>
              <h2>Question Set Management Workspace</h2>
              <p className="muted">Upload, review, and publish quiz sets directly to MongoDB Atlas or local fallback.</p>
            </div>
            {adminToken && <span className="adminBadge">Authenticated</span>}
          </div>

          {!adminToken ? (
            <form className="loginCard" onSubmit={loginAdmin}>
              <label>Admin ID <input value={adminId} onChange={(e) => setAdminId(event?.target ? (e.target as HTMLInputElement).value : "")} /></label>
              <label>Password <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(event?.target ? (e.target as HTMLInputElement).value : "")} /></label>
              <button type="submit">Login</button>
            </form>
          ) : (
            <div className="adminGrid">
              <section className="adminEditor">
                <textarea value={jsonInput} onChange={(e) => setJsonInput(event?.target ? (e.target as HTMLTextAreaElement).value : "")} />
                <div className="adminActions"><button onClick={uploadJson}>Publish Set</button></div>
              </section>
              <aside className="adminList">
                {adminSets.map((set) => <div className="attempt" key={set.id}><span>{set.title}</span><strong>{set.questions.length}</strong></div>)}
                <div className="pager">
                  <button disabled={adminPage <= 1} onClick={() => loadAdminSets(adminPage - 1)}>Prev</button>
                  <span>{adminPage}/{adminTotalPages}</span>
                  <button disabled={adminPage >= adminTotalPages} onClick={() => loadAdminSets(adminPage + 1)}>Next</button>
                </div>
              </aside>
            </div>
          )}
          {message && <p className="message">{message}</p>}
        </section>
      )}
    </main>
  );
}