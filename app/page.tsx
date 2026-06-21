"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [selectedSetId, setSelectedSetId] = useState("");
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

  // Infinite Scroll State Controls
  const [scrollPage, setScrollPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const infiniteAnchorRef = useRef<HTMLDivElement>(null);

  // Directional Floating Action Button State Metrics
  const [showScrollFAB, setShowScrollFAB] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const lastScrollY = useRef(0);

  // Smart Recall State Counters
  const [weakPoolCount, setWeakPoolCount] = useState(0);

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
    loadInitialSets();
  }, []);

  useEffect(() => {
    if (viewMode === "select") {
      const pool = JSON.parse(localStorage.getItem("quiz.weakPool") || "[]");
      setWeakPoolCount(pool.length);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!selectedSet || viewMode === "select" || isSubmitted) return;
    const savedProgress = JSON.parse(localStorage.getItem(progressKey) ?? "{}");
    savedProgress[selectedSet.id] = { questionIndex, answers, marked };
    localStorage.setItem(progressKey, JSON.stringify(savedProgress));
  }, [answers, marked, questionIndex, selectedSet, viewMode, isSubmitted]);

  // Infinite Scroll Observer Setup
  useEffect(() => {
    if (!hasMore || viewMode !== "select" || appMode !== "candidate" || loadingMore) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          await loadNextBatch();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentAnchor = infiniteAnchorRef.current;
    if (currentAnchor) observer.observe(currentAnchor);

    return () => {
      if (currentAnchor) observer.unobserve(currentAnchor);
    };
  }, [scrollPage, hasMore, viewMode, appMode, loadingMore]);

  // Handle Scroll Watcher for Floating Navigation Icon Directionality Rules
  useEffect(() => {
    if (viewMode !== "select" || appMode !== "candidate") {
      setShowScrollFAB(false);
      return;
    }

    const handleScrollWatcher = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 300) {
        setShowScrollFAB(true);
      } else {
        setShowScrollFAB(false);
      }

      if (currentScrollY > lastScrollY.current) {
        setScrollDirection("down");
      } else {
        setScrollDirection("up");
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScrollWatcher, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollWatcher);
  }, [viewMode, appMode]);

  function normalizeSavedAnswers(value: unknown, total: number): Answer[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, idx) => typeof incoming[idx] === "number" ? incoming[idx] as number : null);
  }

  function normalizeSavedMarked(value: unknown, total: number): boolean[] {
    const incoming = Array.isArray(value) ? value : [];
    return Array.from({ length: total }, (_, idx) => Boolean(incoming[idx]));
  }

  async function loadInitialSets() {
    try {
      const response = await fetch("/api/sets?page=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      
      setSets(data.sets ?? []);
      localStorage.setItem(setKey, JSON.stringify(data.sets ?? []));
      setStatus("Online sets loaded");
      setScrollPage(1);
      
      if ((data.sets ?? []).length >= data.total) {
        setHasMore(false);
      }
    } catch {
      const cached = JSON.parse(localStorage.getItem(setKey) ?? "[]");
      setSets(Array.isArray(cached) ? cached : []);
      setHasMore(false);
      setStatus(cached.length ? "Using downloaded offline sets" : "No sets available yet");
    }
  }

  async function loadNextBatch() {
    setLoadingMore(true);
    const nextPage = scrollPage + 1;
    
    try {
      const response = await fetch(`/api/sets?page=${nextPage}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      
      if (data.sets && data.sets.length > 0) {
        setSets((prev) => {
          const updated = [...prev, ...data.sets];
          localStorage.setItem(setKey, JSON.stringify(updated));
          return updated;
        });
        setScrollPage(nextPage);
        
        if (sets.length + data.sets.length >= data.total) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  const handleFloatingScrollAction = () => {
    if (scrollDirection === "down") {
      infiniteAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  function startPersonalRecallTest() {
    const pool = JSON.parse(localStorage.getItem("quiz.weakPool") || "[]");
    if (pool.length === 0) return;

    const shuffledPool = [...pool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    const randomizedSelection = shuffledPool.slice(0, 15);

    const syntheticRecallSet: QuizSet = {
      id: "synthetic-personalized-recall-pool",
      title: "🧠 Random Active Recall Session",
      description: "A randomized mini-test generated dynamically from your 30 most recent skipped or incorrect questions.",
      category: "Personal Revision",
      tags: ["Active Recall", "Spaced Repetition"],
      questions: randomizedSelection,
    };

    setSets((prev) => {
      if (!prev.some(s => s.id === syntheticRecallSet.id)) {
        return [syntheticRecallSet, ...prev];
      }
      return prev.map(s => s.id === syntheticRecallSet.id ? syntheticRecallSet : s);
    });

    setTimeout(() => {
      startTest(syntheticRecallSet.id);
    }, 50);
  }

  async function loadSets() {
    await loadInitialSets();
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

    const weakQuestionsCollected = selectedSet.questions.filter((question, index) => {
      const userAnswer = answers[index];
      const isUnattempted = userAnswer === null || typeof userAnswer === "undefined";
      const isWrong = !isUnattempted && userAnswer !== question.correctAnswerIndex;
      return isUnattempted || isWrong;
    });

    if (weakQuestionsCollected.length > 0) {
      const existingPool = JSON.parse(localStorage.getItem("quiz.weakPool") || "[]");
      
      const uniqueNewQuestions = weakQuestionsCollected.filter(
        (newQ) => !existingPool.some((oldQ: any) => oldQ.question === newQ.question)
      );

      const updatedPool = [...uniqueNewQuestions, ...existingPool];
      const cappedPool = updatedPool.slice(0, 30);

      localStorage.setItem("quiz.weakPool", JSON.stringify(cappedPool));
    }
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
    const token = data.token;
    setAdminToken(token);
    localStorage.setItem(tokenKey, token);
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
    await loadInitialSets();
    await loadAdminSets(1);
  }

  return (
    <main style={{ position: "relative", minHeight: "100vh" }}>
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
            <>
              {/* Highlighted Recall Banner Component with Dynamic Glow Animation */}
              {weakPoolCount > 0 && (
                <div className="recallBanner highlightRecallGlow" style={{
                  background: "linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)",
                  padding: "18px 20px",
                  borderRadius: "14px",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                  position: "relative"
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#9333ea", display: "flex", alignItems: "center", gap: "8px" }}>
                      ⚡ Smart Active Revision Available
                    </h3>
                    <p style={{ margin: "6px 0 0", fontSize: "0.88rem", fontWeight: "500", color: "#6b7280" }}>
                      Reviewing your personal mistake pool (<b>{weakPoolCount}/30</b> saved). Ready to spin a fast 15-question random challenge session?
                    </p>
                  </div>
                  <button 
                    onClick={startPersonalRecallTest}
                    style={{
                      background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",
                      color: "#ffffff",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(147, 51, 234, 0.4)",
                      transition: "transform 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Start Recall Challenge ➔
                  </button>
                </div>
              )}

              <CandidateDashboard sets={sets} attempts={attempts} status={status} downloadOffline={() => localStorage.setItem(setKey, JSON.stringify(sets))} startTest={startTest} />
              
              <div ref={infiniteAnchorRef} style={{ width: "100%", padding: "24px 12px", textAlign: "center", color: "#6b7280", fontSize: "0.9rem", fontWeight: "500" }}>
                {hasMore ? (loadingMore ? "🔄 Loading next quiz sets..." : "↓ Scroll down to view older tests") : "🎉 Caught up! All available quiz sets loaded."}
              </div>
            </>
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
              <label>Admin ID <input value={adminId} onChange={(e) => setAdminId(e.target.value)} /></label>
              <label>Password <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></label>
              <button type="submit">Login</button>
            </form>
          ) : (
            <div className="adminGrid">
              <section className="adminEditor">
                <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} />
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

      {/* Dynamic Circular Directional Floating Action Button */}
      {showScrollFAB && (
        <button
          onClick={handleFloatingScrollAction}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            fontSize: "1.25rem",
            fontWeight: "bold",
            zIndex: 100,
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
        >
          {scrollDirection === "down" ? "↓" : "↑"}
        </button>
      )}

      {/* Embedded Global Styles injecting CSS keyframes for highlighting animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .highlightRecallGlow {
          border: 2px solid #9333ea !important;
          animation: animatedRecallBorderGlow 3s infinite ease-in-out;
        }

        html.dark .highlightRecallGlow p {
          color: #a1a1aa !important;
        }

        @keyframes animatedRecallBorderGlow {
          0% {
            border-color: #9333ea;
            box-shadow: 0 0 4px rgba(147, 51, 234, 0.15);
          }
          50% {
            border-color: #ec4899;
            box-shadow: 0 0 16px rgba(236, 72, 153, 0.4);
          }
          100% {
            border-color: #9333ea;
            box-shadow: 0 0 4px rgba(147, 51, 234, 0.15);
          }
        }
      `}} />
    </main>
  );
}