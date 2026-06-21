export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number; 
  explanation?: string;
  category?: string;          
};

export type QuizSet = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];            
  totalQuestions?: number;    
  createdAt: string;
  questions: QuizQuestion[];
};

export type Attempt = {
  setId: string;
  setTitle: string;
  score: number;
  total: number;
  answers: Answer[];
  completedAt: string;
};

export type ViewMode = "select" | "test" | "review";
export type AppMode = "candidate" | "admin";
export type Answer = number | null;