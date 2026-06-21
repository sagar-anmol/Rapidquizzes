"use client";

import { useState, useEffect } from "react";
import { QuizSet, QuizQuestion, Answer, ViewMode } from "./types";

type QuizEngineProps = {
  selectedSet: QuizSet;
  currentQuestion: QuizQuestion;
  questionIndex: number;
  setQuestionIndex: (idx: number) => void;
  viewMode: ViewMode;
  answers: Answer[];
  marked: boolean[];
  score: number;
  answeredCount: number;
  markedCount: number;
  isSubmitted: boolean;
  answerQuestion: (idx: number) => void;
  clearResponse: () => void;
  toggleMark: () => void;
  goPrevious: () => void;
  goNext: () => void;
  submitTest: () => void;
  startDetailedReview: () => void;
  retry: () => void;
  backToTests: () => void;
};

export default function QuizEngine({
  selectedSet,
  currentQuestion,
  questionIndex,
  setQuestionIndex,
  viewMode,
  answers,
  marked,
  score,
  answeredCount,
  markedCount,
  isSubmitted,
  answerQuestion,
  clearResponse,
  toggleMark,
  goPrevious,
  goNext,
  submitTest,
  startDetailedReview,
  retry,
  backToTests,
}: QuizEngineProps) {
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isReviewMode = viewMode === "review";
  const isTestActive = !isReviewMode && !isSubmitted;

  // Intercept Browser Tab Closures / Refreshes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isTestActive) return;
      const message = "Are you sure you want to exit? Your active quiz progress will be permanently lost.";
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTestActive]);

  // Safe Exit Confirmation Handler
  const handleSafeExitConfirmation = () => {
    if (isTestActive) {
      const confirmLeave = window.confirm(
        "⚠️ Warning: Leaving this page will erase your active answers. Your quiz progress will be completely lost!\n\nDo you want to proceed and exit?"
      );
      if (!confirmLeave) return;
    }
    backToTests();
  };

  return (
    <section className="examContainer" style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", position: "relative" }}>
      
      {/* Mobile Topbar Header */}
      <div className="mobileExamHeader" style={{
        display: "none", 
        background: "#ffffff", 
        padding: "8px 12px", 
        borderBottom: "1px solid #e4e4e7",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <button className="ghost" onClick={handleSafeExitConfirmation} style={{ padding: "4px 8px", fontSize: "0.85rem", border: "1px solid #e4e4e7", borderRadius: "6px" }}>◀ Exit</button>
        <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#27272a" }}>Q. {questionIndex + 1}/{selectedSet.questions.length}</span>
        
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          style={{ 
            background: "#2563eb", 
            border: "none", 
            color: "#ffffff", 
            padding: "6px 12px", 
            borderRadius: "6px", 
            cursor: "pointer", 
            fontSize: "0.85rem", 
            fontWeight: "600",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}
        >
          ☰ Palette
        </button>
      </div>

      {/* Main Layout Grid Flexbox container */}
      <div className="examBody" style={{ display: "flex", width: "100%", gap: "24px" }}>
        
        {/* Core Workspace Section Desk */}
        <section className="questionDesk" style={{ flex: 1, padding: "16px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e4e4e7", height: "fit-content" }}>
          
          {/* Desktop Header Dashboard */}
          <div className="examBar desktopOnlyBar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isReviewMode ? "2px solid #16a34a" : "1px solid #e4e4e7", paddingBottom: "12px", marginBottom: "16px" }}>
            <button className="ghost" onClick={handleSafeExitConfirmation} style={{ padding: "6px 12px", border: "1px solid #e4e4e7", borderRadius: "6px" }}>◀ Leave Test</button>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow" style={{ color: isReviewMode ? "#16a34a" : "#2563eb", fontWeight: "bold", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                {isReviewMode ? "Detailed Review Profile" : selectedSet.category ?? "Online Test"}
              </p>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#18181b", margin: "2px 0" }}>{selectedSet.title}</h2>
            </div>
            <div className="examStats" style={{ fontSize: "0.85rem", display: "flex", gap: "12px", fontWeight: "500" }}>
              {isReviewMode ? (
                <span style={{ background: "#16a34a", color: "#fff", padding: "4px 10px", borderRadius: "8px", fontWeight: "bold" }}>
                  Score: {score}/{selectedSet.questions.length}
                </span>
              ) : (
                <>
                  <span style={{ background: "#f4f4f5", padding: "4px 8px", borderRadius: "6px" }}>Answered: <b>{answeredCount}</b></span>
                  <span style={{ background: "#fef3c7", color: "#d97706", padding: "4px 8px", borderRadius: "6px" }}>Marked: <b>{markedCount}</b></span>
                </>
              )}
            </div>
          </div>

          <div className="questionHeader" style={{ fontSize: "0.95rem", fontWeight: "700", color: "#3f3f46" }}>
            {isReviewMode ? "Review " : ""}Question {questionIndex + 1} of {selectedSet.questions.length}
          </div>
          
          <div className="progress" style={{ margin: "8px 0 16px", background: "#e4e4e7", height: "5px", borderRadius: "3px", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${((questionIndex + 1) / selectedSet.questions.length) * 100}%`, backgroundColor: isReviewMode ? "#16a34a" : "#2563eb", transition: "width 0.2s ease" }} />
          </div>

          <h3 style={{ margin: "16px 0", lineHeight: "1.4", fontSize: "1.15rem", fontWeight: "600", color: "#18181b" }}>
            {currentQuestion.question}
          </h3>

          <div className="options" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {currentQuestion.options.map((option, index) => {
              if (!isReviewMode) {
                return (
                  <button
                    className={answers[questionIndex] === index ? "chosen" : ""}
                    key={`${currentQuestion.id}-${option}`}
                    onClick={() => answerQuestion(index)}
                    disabled={isSubmitted}
                    style={{ 
                      padding: "12px 14px", 
                      fontSize: "0.95rem", 
                      textAlign: "left", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "12px",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <span className="opt-letter" style={{
                      fontWeight: "bold",
                      background: answers[questionIndex] === index ? "#2563eb" : "#f4f4f5",
                      color: answers[questionIndex] === index ? "#fff" : "#18181b",
                      width: "24px", height: "24px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                );
              } else {
                const isUserSelection = answers[questionIndex] === index;
                const isCorrectTarget = index === currentQuestion.correctAnswerIndex;
                let targetBg = "#ffffff";
                let targetBorder = "1px solid #e4e4e7";

                if (isCorrectTarget) {
                  targetBg = "#f0fdf4";
                  targetBorder = "1px solid #16a34a";
                } else if (isUserSelection) {
                  targetBg = "#fef2f2";
                  targetBorder = "1px solid #dc2626";
                }

                return (
                  <div 
                    key={`${currentQuestion.id}-review-${index}`}
                    style={{
                      background: targetBg,
                      border: targetBorder,
                      padding: "12px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "0.95rem"
                    }}
                  >
                    <span style={{
                      background: isCorrectTarget ? "#16a34a" : isUserSelection ? "#dc2626" : "#e4e4e7",
                      color: isCorrectTarget || isUserSelection ? "#fff" : "#27272a",
                      width: "24px", height: "24px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem"
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </div>
                );
              }
            })}
          </div>

          {isReviewMode && currentQuestion.explanation && (
            <div style={{ background: "#f4f4f5", borderLeft: "4px solid #16a34a", padding: "12px 14px", marginTop: "16px", borderRadius: "6px", fontSize: "0.9rem" }}>
              <strong style={{ color: "#16a34a" }}>Explanation:</strong>
              <p style={{ marginTop: "4px", lineHeight: "1.5", color: "#52525b", margin: 0 }}>{currentQuestion.explanation}</p>
            </div>
          )}

          {!isReviewMode && isSubmitted && (
            <div className="scorecardInlinePanel" style={{ background: "#ffffff", padding: "24px 16px", textAlign: "center", borderRadius: "10px", border: "1px solid #e4e4e7", marginTop: "20px" }}>
              <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: "0.9rem", textTransform: "uppercase", margin: 0 }}>Test Completed Successfully</p>
              <h2 style={{ fontSize: "2.25rem", margin: "8px 0", color: "#18181b" }}>{score} <span style={{ fontSize: "1.25rem", color: "#71717a" }}>/ {selectedSet.questions.length}</span></h2>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px" }}>
                <button style={{ padding: "10px 20px", fontSize: "0.9rem", fontWeight: "600" }} onClick={startDetailedReview}>Breakdown Profile ➔</button>
                <button className="clear" style={{ padding: "10px 20px", fontSize: "0.9rem" }} onClick={retry}>Retry</button>
              </div>
            </div>
          )}

          {/* Core Navigation Controls Bar Container */}
          <div className="responsiveControlsRow" style={{ marginTop: "24px", display: "flex", width: "100%", gap: "8px", alignItems: "center" }}>
            <button className="ghost" disabled={questionIndex === 0} onClick={goPrevious} style={{ padding: "10px 18px", fontSize: "0.9rem", fontWeight: "600", minWidth: "75px" }}>Prev</button>
            
            {!isReviewMode && !isSubmitted && (
              <>
                <button className="clear" onClick={clearResponse} style={{ padding: "10px 14px", fontSize: "0.9rem" }}>Clear</button>
                <button className="mark" onClick={toggleMark} style={{ padding: "10px 16px", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                  {marked[questionIndex] ? "Unmark" : "Mark as Review"}
                </button>
              </>
            )}

            {isReviewMode && <button onClick={retry} className="clear" style={{ padding: "10px 14px", fontSize: "0.9rem", fontWeight: "600" }}>Reset & Retry</button>}

            {questionIndex === selectedSet.questions.length - 1 ? (
              !isSubmitted && !isReviewMode ? (
                <button onClick={submitTest} style={{ backgroundColor: "#16a34a", color: "#fff", padding: "10px 20px", fontSize: "0.9rem", fontWeight: "700", marginLeft: "auto" }}>Submit Test</button>
              ) : isReviewMode ? (
                <button onClick={backToTests} style={{ padding: "10px 20px", fontSize: "0.9rem", fontWeight: "600", marginLeft: "auto" }}>Finish</button>
              ) : null
            ) : (
              <button onClick={goNext} style={{ padding: "10px 20px", fontSize: "0.9rem", fontWeight: "600", whiteSpace: "nowrap", marginLeft: "auto" }}>Save & Next</button>
            )}
          </div>
        </section>

        {/* Drawer Dim Overlay */}
        {mobileMenuOpen && (
          <div className="mobileMenuOverlay" onClick={() => setMobileMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.3)", zIndex: 998 }} />
        )}

        {/* Right Side Sidebar Panel (Perfect Desktop Column + Collapsible Mobile Drawer) */}
        <aside className={`palette ${mobileMenuOpen ? "mobileOpen" : ""}`} style={{ 
          display: "flex", 
          flexDirection: "column", 
          width: "300px", 
          background: "#ffffff", 
          padding: "16px", 
          borderRadius: "12px", 
          border: "1px solid #e4e4e7",
          height: "fit-content"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#18181b", margin: 0 }}>{isReviewMode ? "Review Center" : "Question Palette"}</h2>
            <button className="mobileCloseButton" onClick={() => setMobileMenuOpen(false)} style={{ display: "none", background: "none", border: "none", fontSize: "1.2rem", color: "#71717a", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", maxHeight: "380px" }}>
            <div className="paletteGrid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {selectedSet.questions.map((question, index) => {
                let btnClass = "paletteButton";
                let inlineStyles: React.CSSProperties = {};

                if (isReviewMode) {
                  inlineStyles = { backgroundColor: answers[index] === question.correctAnswerIndex ? "#16a34a" : "#dc2626", color: "#fff" };
                } else {
                  btnClass += ` ${marked[index] ? "review" : typeof answers[index] === "number" ? "answered" : "notAnswered"}`;
                }

                return (
                  <button
                    className={`${btnClass} ${index === questionIndex ? "current" : ""}`}
                    key={question.id}
                    style={{
                      ...inlineStyles,
                      padding: "10px 0",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                    onClick={() => { setQuestionIndex(index); setMobileMenuOpen(false); }}
                    disabled={isSubmitted && !isReviewMode}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: "14px", marginTop: "14px" }}>
            <div className="summaryBox" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#52525b", fontWeight: "500", padding: "4px" }}>
              <span>Total Questions: <b>{selectedSet.questions.length}</b></span>
              <span>{isReviewMode ? `Correct: ${score}` : `Selected: ${answeredCount}`}</span>
            </div>

            {!isSubmitted && !isReviewMode && (
              <button 
                onClick={() => { submitTest(); setMobileMenuOpen(false); }} 
                style={{ width: "100%", padding: "12px", marginTop: "12px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: "700", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.95rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              >
                Submit Test
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Standard Script String Loader Injecting Raw Cross-Platform Platform CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          header.topbar {
            display: none !important;
          }
          .mobileExamHeader {
            display: flex !important;
          }
          .desktopOnlyBar {
            display: none !important;
          }
          .examBody {
            flex-direction: column;
            gap: 0 !important;
          }
          .questionDesk {
            border: none !important;
            border-radius: 0 !important;
            padding: 12px 14px !important;
          }
          .responsiveControlsRow {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
          .responsiveControlsRow button {
            text-align: center !important;
            text-overflow: ellipsis;
            overflow: hidden;
            padding: 10px 4px !important;
            font-size: 0.8rem !important;
          }
          aside.palette {
            position: fixed !important;
            top: 0; right: 0; bottom: 0;
            width: 250px !important;
            background: #ffffff !important;
            z-index: 999 !important;
            box-shadow: -4px 0 15px rgba(0,0,0,0.08);
            padding: 14px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            transform: translateX(100%);
            transition: transform 0.2s ease-in-out;
          }
          aside.palette.mobileOpen {
            transform: translateX(0) !important;
          }
          .mobileCloseButton {
            display: block !important;
          }
        }
      `}} />
    </section>
  );
}