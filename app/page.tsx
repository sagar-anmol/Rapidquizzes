"use client";

import { useEffect, useMemo, useState } from "react";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

type QuizSet = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: string;
  questions: QuizQuestion[];
};

type Attempt = {
  setId: string;
  setTitle: string;
  score: number;
  total: number;
  answers: Answer[];
  completedAt: string;
};

type ViewMode = "select" | "test" | "result";
type AppMode = "candidate" | "admin";
type Answer = number | null;

const sampleJson = `{
  "title": "June Current Affairs Set 1",
  "description": "Daily practice questions",
  "category": "Current Affairs",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Optional short explanation."
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

  const selectedSet = useMemo(() => sets.find((set) => set.id === selectedSetId), [sets, selectedSetId]);
  const currentQuestion = selectedSet?.questions[questionIndex];
  const score = selectedSet
    ? selectedSet.questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0)
    : 0;
  const answeredCount = selectedSet ? selectedSet.questions.filter((_, index) => isAnswered(index)).length : 0;
  const markedCount = selectedSet ? selectedSet.questions.filter((_, index) => Boolean(marked[index])).length : 0;

  useEffect(() => {
    const savedToken = localStorage.getItem(tokenKey) ?? "";
    const savedAttempts = JSON.parse(localStorage.getItem(attemptKey) ?? "[]");
    setAdminToken(savedToken);
    setAttempts(Array.isArray(savedAttempts) ? savedAttempts : []);
    loadSets();
  }, []);

  useEffect(() => {
    if (!selectedSet || viewMode === "select") return;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
    savedProgress[selectedSet.id] = { questionIndex, answers, marked };
    localStorage.setItem(progressKey, JSON.stringify(savedProgress));
  }, [answers, marked, questionIndex, selectedSet, viewMode]);

  function isAnswered(index: number) {
    return typeof answers[index] === "number";
  }

  function normalizeSavedAnswers(value: unknown, total: number): Answer[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, index) =>
      typeof incoming[index] === "number" ? incoming[index] : null
    );
  }

  function normalizeSavedMarked(value: unknown, total: number): boolean[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, index) => Boolean(incoming[index]));
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

  function openAdmin() {
    setAppMode("admin");
    setMessage("");
    if (adminToken) {
      loadAdminSets(1);
    }
  }

  function openCandidate() {
    setAppMode("candidate");
    setMessage("");
  }

  function startTest(id: string) {
    const set = sets.find((item) => item.id === id);
    if (!set) return;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
    const progress = savedProgress[id];
    setSelectedSetId(id);
    setQuestionIndex(Math.min(Math.max(Number(progress?.questionIndex ?? 0), 0), set.questions.length - 1));
    setAnswers(normalizeSavedAnswers(progress?.answers, set.questions.length));
    setMarked(normalizeSavedMarked(progress?.marked, set.questions.length));
    setViewMode("test");
  }

  function answerQuestion(optionIndex: number) {
    if (!selectedSet || viewMode !== "test") return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = optionIndex;
    setAnswers(nextAnswers);
  }

  function clearResponse() {
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = null;
    setAnswers(nextAnswers);
  }

  function toggleMark() {
    const nextMarked = [...marked];
    nextMarked[questionIndex] = !nextMarked[questionIndex];
    setMarked(nextMarked);
  }

  function goNext() {
    if (!selectedSet) return;
    setQuestionIndex(Math.min(questionIndex + 1, selectedSet.questions.length - 1));
  }

  function goPrevious() {
    setQuestionIndex(Math.max(questionIndex - 1, 0));
  }

  function submitTest() {
    if (!selectedSet) return;
    const nextAttempt: Attempt = {
      setId: selectedSet.id,
      setTitle: selectedSet.title,
      score: selectedSet.questions.reduce(
        (total, question, index) => total + (answers[index] === question.answer ? 1 : 0),
        0
      ),
      total: selectedSet.questions.length,
      answers,
      completedAt: new Date().toISOString()
    };
    const nextAttempts = [nextAttempt, ...attempts].slice(0, 50);
    setAttempts(nextAttempts);
    localStorage.setItem(attemptKey, JSON.stringify(nextAttempts));
    setViewMode("result");
  }

  function retry() {
    setAnswers(selectedSet ? Array.from({ length: selectedSet.questions.length }, () => null) : []);
    setMarked(selectedSet ? Array.from({ length: selectedSet.questions.length }, () => false) : []);
    setQuestionIndex(0);
    setViewMode("test");
  }

  function backToTests() {
    setSelectedSetId("");
    setQuestionIndex(0);
    setAnswers([]);
    setMarked([]);
    setViewMode("select");
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
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setMessage("JSON is not valid. Check commas and quotes.");
      return;
    }

    const response = await fetch("/api/sets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken
      },
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

  function downloadOffline() {
    localStorage.setItem(setKey, JSON.stringify(sets));
    setStatus(`${sets.length} set${sets.length === 1 ? "" : "s"} saved offline`);
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">{appMode === "admin" ? "Administrative Console" : "Assessment Console"}</p>
          <h1>{appMode === "admin" ? "Question Set Management" : "Current Affairs Online Test"}</h1>
        </div>
        <div className="topActions">
          {appMode === "admin" ? (
            <button className="ghost" onClick={openCandidate}>
              Candidate view
            </button>
          ) : (
            <button className="ghost" onClick={openAdmin}>
              Admin
            </button>
          )}
        </div>
      </header>

      {appMode === "candidate" && (
      <section className="shell">
        {viewMode === "select" && (
          <section className="testSelect">
            <div className="selectHead">
              <div>
                <p className="eyebrow">Candidate Dashboard</p>
                <h2>Available Tests</h2>
              </div>
              <div className="selectActions">
                <span className="status">{status}</span>
                <button onClick={downloadOffline}>Download offline</button>
              </div>
            </div>

            <div className="testGrid">
              {sets.map((set) => {
                const lastAttempt = attempts.find((attempt) => attempt.setId === set.id);
                return (
                  <article className="testCard" key={set.id}>
                    <div>
                      <p className="eyebrow">{set.category ?? "Quiz Set"}</p>
                      <h3>{set.title}</h3>
                      {set.description && <p className="muted">{set.description}</p>}
                    </div>
                    <div className="testMeta">
                      <span>{set.questions.length} questions</span>
                      <span>{lastAttempt ? `Last: ${lastAttempt.score}/${lastAttempt.total}` : "Not attempted"}</span>
                    </div>
                    <button onClick={() => startTest(set.id)}>Proceed to Test</button>
                  </article>
                );
              })}
              {!sets.length && <p className="muted">No quiz sets yet. Login as admin and upload one.</p>}
            </div>

            <div className="history panel">
              <h2>Recent marks</h2>
              {attempts.slice(0, 5).map((attempt) => (
                <div className="attempt" key={`${attempt.setId}-${attempt.completedAt}`}>
                  <span>{attempt.setTitle}</span>
                  <strong>
                    {attempt.score}/{attempt.total}
                  </strong>
                </div>
              ))}
              {!attempts.length && <p className="muted">Your attempts will appear here.</p>}
            </div>
          </section>
        )}

        {viewMode === "test" && selectedSet && currentQuestion && (
          <section className="exam">
            <div className="examBar">
              <button className="ghost" onClick={backToTests}>All tests</button>
              <div>
                <p className="eyebrow">{selectedSet.category ?? "Online Test"}</p>
                <h2>{selectedSet.title}</h2>
              </div>
              <div className="examStats">
                <span>Mode Untimed</span>
                <span>Answered {answeredCount}</span>
                <span>Marked {markedCount}</span>
              </div>
            </div>

            <div className="examBody">
              <section className="questionDesk">
                <div className="questionHeader">
                  <strong>Question No. {questionIndex + 1}</strong>
                  <span>{questionIndex + 1} / {selectedSet.questions.length}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${((questionIndex + 1) / selectedSet.questions.length) * 100}%` }} />
                </div>
                <h3>{currentQuestion.question}</h3>
                <div className="options">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      className={answers[questionIndex] === index ? "chosen" : ""}
                      key={`${currentQuestion.id}-${option}`}
                      onClick={() => answerQuestion(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option}
                    </button>
                  ))}
                </div>
                <div className="examControls">
                  <button className="ghost" disabled={questionIndex === 0} onClick={goPrevious}>Previous</button>
                  <button className="clear" onClick={clearResponse}>Clear Response</button>
                  <button className="mark" onClick={toggleMark}>
                    {marked[questionIndex] ? "Unmark" : "Mark for Review"}
                  </button>
                  {questionIndex === selectedSet.questions.length - 1 ? (
                    <button onClick={submitTest}>Submit Test</button>
                  ) : (
                    <button onClick={goNext}>Save & Next</button>
                  )}
                </div>
              </section>

              <aside className="palette">
                <h2>Question Palette</h2>
                <div className="legend">
                  <span><b className="answered" /> Answered</span>
                  <span><b className="notAnswered" /> Not answered</span>
                  <span><b className="review" /> Review</span>
                </div>
                <div className="paletteGrid">
                  {selectedSet.questions.map((question, index) => {
                    const state = marked[index] ? "review" : isAnswered(index) ? "answered" : "notAnswered";
                    return (
                      <button
                        className={`paletteButton ${state} ${index === questionIndex ? "current" : ""}`}
                        key={question.id}
                        onClick={() => setQuestionIndex(index)}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="summaryBox">
                  <span>Total: {selectedSet.questions.length}</span>
                  <span>Answered: {answeredCount}</span>
                  <span>Not Answered: {selectedSet.questions.length - answeredCount}</span>
                </div>
                <button onClick={submitTest}>Submit Test</button>
              </aside>
            </div>
          </section>
        )}

        {viewMode === "result" && selectedSet && (
          <section className="quiz">
            <>
              <div className="result">
                <p className="eyebrow">Result</p>
                <h2>
                  {score}/{selectedSet.questions.length}
                </h2>
                <p>{Math.round((score / selectedSet.questions.length) * 100)}% score in {selectedSet.title}</p>
                <div className="resultActions">
                  <button onClick={retry}>Attempt again</button>
                  <button className="ghost" onClick={backToTests}>Choose another test</button>
                </div>
                <div className="reviewList">
                  {selectedSet.questions.map((question, index) => (
                    <details key={question.id}>
                      <summary>
                        {answers[index] === question.answer ? "Correct" : "Wrong"}: {question.question}
                      </summary>
                      <p>Your answer: {isAnswered(index) ? question.options[answers[index] as number] : "Not answered"}</p>
                      <p>Correct answer: {question.options[question.answer]}</p>
                      {question.explanation && <p>{question.explanation}</p>}
                    </details>
                  ))}
                </div>
              </div>
            </>
          </section>
        )}
      </section>
      )}

      {appMode === "admin" && (
        <section className="adminScreen">
          <div className="adminHero">
            <div>
              <p className="eyebrow">Admin Workspace</p>
              <h2>Upload, review, and publish quiz sets</h2>
              <p className="muted">
                Quiz sets are stored in MongoDB Atlas when configured, with local JSON fallback for development.
              </p>
            </div>
            {adminToken && <span className="adminBadge">Authenticated</span>}
          </div>

          {!adminToken ? (
            <section className="loginShell">
              <form className="loginCard" onSubmit={loginAdmin}>
                <div>
                  <p className="eyebrow">Secure Login</p>
                  <h2>Admin access</h2>
                </div>
                <label>
                  Admin ID
                  <input value={adminId} onChange={(event) => setAdminId(event.target.value)} />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                  />
                </label>
                <button type="submit">Login to Admin</button>
              </form>
            </section>
          ) : (
            <div className="adminGrid">
              <section className="adminEditor">
                <div className="sectionTitle">
                  <div>
                    <p className="eyebrow">Question Upload</p>
                    <h2>Paste quiz set JSON</h2>
                  </div>
                  <button className="ghost" onClick={() => setJsonInput(sampleJson)}>
                    Reset sample
                  </button>
                </div>
                <textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} />
                <div className="adminActions">
                  <button onClick={uploadJson}>Publish Set</button>
                  <button className="ghost" onClick={() => loadAdminSets(1)}>
                    Fetch latest 5
                  </button>
                </div>
              </section>

              <aside className="adminList">
                <div className="sectionTitle">
                  <div>
                    <p className="eyebrow">Repository</p>
                    <h2>Latest uploads</h2>
                  </div>
                </div>
                {adminSets.map((set) => (
                  <div className="attempt" key={set.id}>
                    <span>{set.title}</span>
                    <strong>{set.questions.length}</strong>
                  </div>
                ))}
                {!adminSets.length && <p className="muted">Fetch latest uploads to inspect stored sets.</p>}
                <div className="pager">
                  <button disabled={adminPage <= 1} onClick={() => loadAdminSets(adminPage - 1)}>
                    Previous
                  </button>
                  <span>
                    {adminPage}/{adminTotalPages}
                  </span>
                  <button disabled={adminPage >= adminTotalPages} onClick={() => loadAdminSets(adminPage + 1)}>
                    Next
                  </button>
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
