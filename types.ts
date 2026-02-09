
export enum GameStatus {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
}

export interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  options: string[];
  category: string;
  explanation: string;
  source?: 'AI' | 'MANUAL';
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  currentQuestion: Question | null;
  stage: 'DIRECT' | 'MULTIPLE_CHOICE' | 'RESULT';
  message: string;
  lastAnswerCorrect: boolean;
  selectedOption?: string | null;
}
