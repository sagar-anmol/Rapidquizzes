"use client";

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
  
  if (viewMode === "test") {
    return (
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
            {!isSubmitted ? (
              <>
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
                    <button onClick={submitTest} style={{ backgroundColor: "#28a745", color: "#fff" }}>Submit Test</button>
                  ) : (
                    <button onClick={goNext}>Save & Next</button>
                  )}
                </div>
              </>
            ) : (
              <div className="scorecardInlinePanel" style={{ background: "#fff", padding: "40px 20px", textAlign: "center", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                <div style={{ width: "80px", height: "80px", background: "#e6f4ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <span style={{ fontSize: "2rem" }}>🏆</span>
                </div>
                <p className="eyebrow" style={{ color: "#28a745", fontWeight: "bold", fontSize: "1.1rem" }}>Assessment Submitted Successfully</p>
                <h2 style={{ fontSize: "3.5rem", margin: "15px 0", color: "#111" }}>
                  {score} <span style={{ fontSize: "1.5rem", color: "#888" }}>/ {selectedSet.questions.length}</span>
                </h2>
                <p className="muted" style={{ marginBottom: "30px" }}>You scored {Math.round((score / selectedSet.questions.length) * 100)}% on this assessment profile module.</p>
                <div className="scorecardActions" style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px", margin: "0 auto" }}>
                  <button style={{ width: "100%", padding: "14px", fontSize: "1rem", fontWeight: "600" }} onClick={startDetailedReview}>
                    View Result Breakdown ➔
                  </button>
                  <button className="clear" style={{ width: "100%" }} onClick={retry}>Retry Test</button>
                  <button className="ghost" style={{ width: "100%" }} onClick={backToTests}>Back to Home Dashboard</button>
                </div>
              </div>
            )}
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
                const state = marked[index] ? "review" : typeof answers[index] === "number" ? "answered" : "notAnswered";
                return (
                  <button
                    className={`paletteButton ${state} ${index === questionIndex ? "current" : ""}`}
                    key={question.id}
                    onClick={() => !isSubmitted && setQuestionIndex(index)}
                    disabled={isSubmitted}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="summaryBox">
              <span>Total: {selectedSet.questions.length}</span>
              <span>Answered: {answeredCount}</span>
            </div>
            {!isSubmitted && <button onClick={submitTest} style={{ width: "100%", marginTop: "20px" }}>Submit Test</button>}
          </aside>
        </div>
      </section>
    );
  }

  // viewMode === "review" Layout
  return (
    <section className="exam reviewSectionLayout">
      <div className="examBar" style={{ borderBottom: "2px solid #28a745" }}>
        <button className="ghost" onClick={backToTests}>Dashboard</button>
        <div>
          <p className="eyebrow" style={{ color: "#28a745", fontWeight: "bold" }}>Detailed Review Profile</p>
          <h2>{selectedSet.title}</h2>
        </div>
        <div className="examStats">
          <span style={{ background: "#28a745", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontWeight: "bold" }}>
            Score: {score}/{selectedSet.questions.length}
          </span>
        </div>
      </div>

      <div className="examBody">
        <section className="questionDesk">
          <div className="questionHeader">
            <strong>Review Question {questionIndex + 1}</strong>
            <span>{questionIndex + 1} / {selectedSet.questions.length}</span>
          </div>
          <div className="progress">
            <span style={{ width: `${((questionIndex + 1) / selectedSet.questions.length) * 100}%`, backgroundColor: "#28a745" }} />
          </div>
          <h3 style={{ margin: "25px 0" }}>{currentQuestion.question}</h3>
          
          <div className="options">
            {currentQuestion.options.map((option, index) => {
              const isUserSelection = answers[questionIndex] === index;
              const isCorrectTarget = index === currentQuestion.correctAnswerIndex;
              let targetColor = "#fff";
              let borderSettings = "1px solid #eaeaea";
              let badgeLabel = "";

              if (isCorrectTarget) {
                targetColor = "#d4edda";
                borderSettings = "2px solid #28a745";
                badgeLabel = " ✔ Correct Option Target";
              } else if (isUserSelection) {
                targetColor = "#f8d7da";
                borderSettings = "2px solid #dc3545";
                badgeLabel = " ✘ Your Selection";
              }

              return (
                <div 
                  key={`${currentQuestion.id}-review-${index}`}
                  style={{
                    background: targetColor,
                    border: borderSettings,
                    padding: "16px",
                    borderRadius: "6px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: isCorrectTarget || isUserSelection ? "600" : "normal"
                  }}
                >
                  <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <span style={{
                      background: isCorrectTarget ? "#28a745" : isUserSelection ? "#dc3545" : "#eaeaea",
                      color: isCorrectTarget || isUserSelection ? "#fff" : "#333",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      fontWeight: "bold"
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </div>
                  {badgeLabel && <span style={{ fontSize: "0.8rem", textTransform: "uppercase", opacity: 0.8 }}>{badgeLabel}</span>}
                </div>
              );
            })}
          </div>

          {currentQuestion.explanation && (
            <div style={{ background: "#f8f9fa", borderLeft: "4px solid #28a745", padding: "16px", marginTop: "25px", borderRadius: "4px" }}>
              <strong style={{ color: "#111" }}>Explanation Insight:</strong>
              <p style={{ marginTop: "6px", fontSize: "0.95rem", lineHeight: "1.6", opacity: 0.9 }}>{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="examControls" style={{ marginTop: "30px" }}>
            <button className="ghost" disabled={questionIndex === 0} onClick={goPrevious}>Previous</button>
            <button onClick={retry} className="clear">Reset & Try Again</button>
            {questionIndex === selectedSet.questions.length - 1 ? (
              <button onClick={backToTests}>Finish Review</button>
            ) : (
              <button onClick={goNext}>Next Question ➔</button>
            )}
          </div>
        </section>

        <aside className="palette">
          <h2>Review Board</h2>
          <div className="legend">
            <span><b style={{ backgroundColor: "#28a745", display: "inline-block", width: "12px", height: "12px", borderRadius: "50%" }} /> Correct</span>
            <span><b style={{ backgroundColor: "#dc3545", display: "inline-block", width: "12px", height: "12px", borderRadius: "50%" }} /> Incorrect</span>
          </div>
          <div className="paletteGrid">
            {selectedSet.questions.map((question, index) => {
              const gradedCorrect = answers[index] === question.correctAnswerIndex;
              return (
                <button
                  className={`paletteButton ${index === questionIndex ? "current" : ""}`}
                  key={`palette-review-${question.id}`}
                  onClick={() => setQuestionIndex(index)}
                  style={{ backgroundColor: gradedCorrect ? "#28a745" : "#dc3545", color: "#fff" }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button className="ghost" onClick={backToTests} style={{ width: "100%", marginTop: "30px" }}>Exit to Dashboard</button>
        </aside>
      </div>
    </section>
  );
}