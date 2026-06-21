"use client";

import { QuizSet, Attempt } from "./types";

type DashboardProps = {
  sets: QuizSet[];
  attempts: Attempt[];
  status: string;
  downloadOffline: () => void;
  startTest: (id: string) => void;
};

export default function CandidateDashboard({
  sets,
  attempts,
  status,
  downloadOffline,
  startTest,
}: DashboardProps) {
  return (
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
                <span>
                  {lastAttempt ? `Last Score: ${lastAttempt.score}/${lastAttempt.total}` : "Not attempted"}
                </span>
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
  );
}