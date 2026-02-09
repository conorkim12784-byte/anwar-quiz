
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import Logo from './components/Logo';
import { GameStatus, Player, GameState, Question } from './types';
import { generateQuestion, checkDirectAnswer } from './services/geminiService';

const DIRECT_TIME_LIMIT = 45;
const CHOICE_TIME_LIMIT = 20;
const NEXT_TURN_DELAY = 7000;

const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasKey, setHasKey] = useState(false);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.SETUP,
    players: [],
    currentPlayerIndex: 0,
    currentQuestion: null,
    stage: 'DIRECT',
    message: '',
    lastAnswerCorrect: false,
    selectedOption: null,
  });

  const [newPlayerName, setNewPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [directInput, setDirectInput] = useState('');
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(DIRECT_TIME_LIMIT);

  // ملفات الصوت
  const audioAssets = useMemo(() => ({
    correct: new Audio('https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3'),
    incorrect: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    finish: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')
  }), []);

  // دوال تشغيل الصوت المطلوبة
  const playCorrect = useCallback(() => {
    audioAssets.correct.currentTime = 0;
    audioAssets.correct.play().catch(() => {});
  }, [audioAssets]);

  const playIncorrect = useCallback(() => {
    audioAssets.incorrect.currentTime = 0;
    audioAssets.incorrect.play().catch(() => {});
  }, [audioAssets]);

  const playFinish = useCallback(() => {
    audioAssets.finish.currentTime = 0;
    audioAssets.finish.play().catch(() => {});
  }, [audioAssets]);

  const timerRef = useRef<any>(null);
  const nextTurnTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const checkKeyPersistence = async () => {
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
          setShowKeyPrompt(!selected);
        } catch (e) {
          setShowKeyPrompt(true);
        }
      } else {
        const envKey = !!process.env.API_KEY;
        setHasKey(envKey);
        setShowKeyPrompt(!envKey);
      }
    };

    checkKeyPersistence();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        setShowKeyPrompt(false);
      } catch (error) {
        console.error("خطأ في اختيار المفتاح", error);
      }
    }
  };

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 6) {
      setPlayers([...players, {
        id: Math.random().toString(36).substring(7),
        name: newPlayerName.trim(),
        score: 0,
        isWinner: false,
        isLoser: false
      }]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const nextTurn = useCallback(async (currentGameState: GameState) => {
    if (nextTurnTimeoutRef.current) clearTimeout(nextTurnTimeoutRef.current);
    
    if (!navigator.onLine) {
      setHasError(true);
      setErrorMessage("عذراً، تحتاج للاتصال بالإنترنت لمتابعة المسابقة.");
      return;
    }

    setIsLoading(true);
    setHasError(false);
    try {
      const winners = currentGameState.players.filter(p => p.score >= 10);
      if (winners.length > 0) {
        setGameState({ ...currentGameState, status: GameStatus.FINISHED });
        playFinish();
        return;
      }

      const question = await generateQuestion(usedQuestionIds);
      setUsedQuestionIds(prev => [...prev, question.id]);
      
      const nextIdx = (currentGameState.currentPlayerIndex + 1) % currentGameState.players.length;
      setGameState({
        ...currentGameState,
        currentPlayerIndex: nextIdx,
        currentQuestion: question,
        stage: 'DIRECT',
        message: `حان الآن دور المتسابق: ${currentGameState.players[nextIdx].name}`,
        selectedOption: null,
        lastAnswerCorrect: false
      });
      setDirectInput('');
      setTimeLeft(DIRECT_TIME_LIMIT);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found") || error.message?.includes("API_KEY")) {
        setShowKeyPrompt(true);
        setHasKey(false);
      } else {
        setHasError(true);
        setErrorMessage("حدث خطأ في جلب السؤال. تأكد من اتصال الـ API.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [usedQuestionIds, playFinish]);

  const startGame = async () => {
    if (!hasKey) {
      setShowKeyPrompt(true);
      return;
    }
    if (players.length < 2) {
      alert("يجب إضافة لاعبين على الأقل لبدء المسابقة");
      return;
    }
    setIsLoading(true);
    setHasError(false);
    try {
      const question = await generateQuestion([]);
      setUsedQuestionIds([question.id]);
      const initialGameState: GameState = {
        status: GameStatus.PLAYING,
        players: players,
        currentQuestion: question,
        currentPlayerIndex: 0,
        stage: 'DIRECT',
        message: 'أجب مباشرة لنقطتين، أو انتظر الخيارات لنقطة واحدة.',
        selectedOption: null,
        lastAnswerCorrect: false
      };
      setGameState(initialGameState);
      setTimeLeft(DIRECT_TIME_LIMIT);
    } catch (error: any) {
      setHasError(true);
      setErrorMessage("تعذر بدء المسابقة حالياً. تحقق من اتصالك ومفتاح الـ API.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.stage !== 'RESULT' && !isLoading && !hasError && !gameState.selectedOption) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState.status, gameState.stage, isLoading, hasError, gameState.selectedOption]);

  const handleTimeout = () => {
    if (gameState.stage === 'DIRECT') {
      setGameState(prev => ({
        ...prev,
        stage: 'MULTIPLE_CHOICE',
        message: 'انتهى وقت الإجابة المباشرة! اختر من الخيارات.'
      }));
      setTimeLeft(CHOICE_TIME_LIMIT);
    } else {
      const newState = {
        ...gameState,
        message: `انتهى الوقت! الإجابة الصحيحة هي: ${gameState.currentQuestion?.correctAnswer}`,
        stage: 'RESULT' as const,
        lastAnswerCorrect: false
      };
      setGameState(newState);
      playIncorrect();
      nextTurnTimeoutRef.current = setTimeout(() => nextTurn(newState), NEXT_TURN_DELAY);
    }
  };

  const handleDirectAnswer = async () => {
    if (!gameState.currentQuestion || !directInput.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const isCorrect = await checkDirectAnswer(
        gameState.currentQuestion.text,
        gameState.currentQuestion.correctAnswer,
        directInput
      );

      if (isCorrect) {
        playCorrect();
        const updatedPlayers = [...gameState.players];
        updatedPlayers[gameState.currentPlayerIndex].score += 2;

        const newState = {
          ...gameState,
          players: updatedPlayers,
          message: `أحسنت يا ${updatedPlayers[gameState.currentPlayerIndex].name}! إجابة صحيحة ونقطتين.`,
          stage: 'RESULT' as const,
          lastAnswerCorrect: true
        };
        setGameState(newState);
        nextTurnTimeoutRef.current = setTimeout(() => nextTurn(newState), NEXT_TURN_DELAY);
      } else {
        playIncorrect();
        setGameState(prev => ({ 
          ...prev, 
          stage: 'MULTIPLE_CHOICE', 
          message: 'إجابة غير دقيقة.. جرب الآن مع الاختيارات.' 
        }));
        setTimeLeft(CHOICE_TIME_LIMIT);
      }
    } catch (e) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option: string) => {
    if (gameState.selectedOption || isLoading) return;
    const isCorrect = option === gameState.currentQuestion?.correctAnswer;

    if (isCorrect) {
      playCorrect();
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].score += 1;

      const newState = {
        ...gameState,
        players: updatedPlayers,
        message: `جميل جداً! إجابة صحيحة ونقطة واحدة.`,
        selectedOption: option,
        lastAnswerCorrect: true,
        stage: 'RESULT' as const
      };
      setGameState(newState);
      nextTurnTimeoutRef.current = setTimeout(() => nextTurn(newState), NEXT_TURN_DELAY);
    } else {
      playIncorrect();
      const newState = {
        ...gameState,
        message: `للأسف الإجابة غير صحيحة. الصحيح: ${gameState.currentQuestion?.correctAnswer}`,
        selectedOption: option,
        lastAnswerCorrect: false,
        stage: 'RESULT' as const
      };
      setGameState(newState);
      nextTurnTimeoutRef.current = setTimeout(() => nextTurn(newState), NEXT_TURN_DELAY);
    }
  };

  const timerPercentage = (timeLeft / (gameState.stage === 'DIRECT' ? DIRECT_TIME_LIMIT : CHOICE_TIME_LIMIT)) * 100;

  return (
    <Layout>
      {showKeyPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="bg-[#fcf6e5] rounded-[3rem] p-12 w-full max-w-md shadow-2xl border-4 border-[#c5a059] text-center relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-l from-amber-700 via-[#c5a059] to-amber-700"></div>
            <Logo className="w-24 h-24 mb-6" />
            <h2 className="text-3xl font-bold text-amber-900 mb-4 font-amiri">أهلاً بك في مجلس العلم</h2>
            <p className="text-amber-800/70 mb-8 leading-relaxed font-medium">لتفعيل ميزات الذكاء الاصطناعي وتوليد الأسئلة، يرجى ربط مفتاح الـ API الخاص بك مرة واحدة.</p>
            <div className="bg-amber-100/50 p-4 rounded-2xl text-amber-900/60 text-xs mb-8 text-right leading-relaxed">
              💡 ملاحظة: سيتم حفظ اختيارك تلقائياً في هذا المتصفح لراحتك في المرات القادمة.
            </div>
            <button onClick={handleOpenKeySelector} className="w-full gold-btn py-6 rounded-[2rem] font-bold text-2xl active:scale-95">ربط الـ API الآن</button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="mt-4 text-[10px] text-amber-800/40 hover:underline">عرض وثائق الفوترة ومفاتيح API</a>
          </div>
        </div>
      )}

      {gameState.status === GameStatus.SETUP && (
        <div className="flex flex-col gap-10 animate-fadeIn flex-1">
          <div className="text-center">
            <h2 className="text-5xl font-amiri font-bold text-amber-900 mb-3">مجلس المتسابقين</h2>
            <p className="text-amber-800/50 font-medium italic tracking-wide text-xl">"تعلموا العلم، فإن تعلمه لله خشية"</p>
          </div>
          <div className="space-y-8">
            <div className="relative group">
              <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addPlayer()} placeholder="اسم المتسابق..." className="w-full px-10 py-7 rounded-[2.5rem] border-2 border-amber-100 bg-white/60 focus:border-amber-600 focus:bg-white outline-none text-3xl font-bold shadow-inner transition-all placeholder:text-amber-900/20" />
              <button onClick={addPlayer} className="absolute left-4 top-4 bottom-4 gold-btn px-10 rounded-[2rem] font-bold text-xl active:scale-95">إضافة</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[350px] overflow-y-auto scrollbar-hide p-2">
              {players.map((p, idx) => (
                <div key={p.id} className="bg-white/80 p-6 rounded-[2.5rem] border border-amber-100 shadow-md flex justify-between items-center group hover:border-amber-500 transition-all animate-fadeIn">
                  <div className="flex items-center gap-5">
                    <span className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center font-black text-lg shadow-lg">{idx+1}</span>
                    <span className="font-bold text-2xl text-amber-950">{p.name}</span>
                  </div>
                  <button onClick={() => removePlayer(p.id)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-100 hover:text-red-500 hover:bg-red-50 transition-all">🗑️</button>
                </div>
              ))}
              {players.length === 0 && <div className="col-span-full py-16 text-center text-amber-800/10 font-amiri text-5xl italic font-bold">بانتظار أهل المعرفة..</div>}
            </div>
          </div>
          <button onClick={startGame} disabled={isLoading || players.length < 2} className="w-full gold-btn py-8 rounded-[3rem] font-bold text-4xl shadow-2xl active:scale-95 flex items-center justify-center gap-6 disabled:opacity-50">
            {isLoading ? <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>بدء المسابقة 🌙</span>}
          </button>
        </div>
      )}

      {gameState.status === GameStatus.PLAYING && (
        <div className="flex flex-col gap-8 flex-1 animate-fadeIn">
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide px-2">
            {gameState.players.map((p, idx) => {
              const isActive = idx === gameState.currentPlayerIndex;
              return (
                <div key={p.id} className={`flex-shrink-0 min-w-[180px] p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                  isActive ? 'bg-amber-900 text-white border-amber-400 scale-[1.08] shadow-2xl z-20' : 'bg-white/70 text-amber-950 border-amber-50 opacity-80'
                }`}>
                  {isActive && <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-l from-amber-300 to-amber-500"></div>}
                  <div className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-amber-400' : 'opacity-40'}`}>{p.name}</div>
                  <div className="text-4xl font-black">{p.score} <span className="text-[10px] font-medium opacity-50 uppercase">نقطة</span></div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col items-stretch">
            {gameState.stage !== 'RESULT' && !isLoading && (
              <div className="mb-8 h-3 w-full bg-amber-900/5 rounded-full overflow-hidden border border-amber-100 shadow-inner">
                <div className={`h-full transition-all duration-1000 rounded-full timer-bar shadow-[0_0_15px_rgba(197,160,89,0.5)]`} style={{ width: `${timerPercentage}%` }}></div>
              </div>
            )}
            <div className="bg-white/50 rounded-[3.5rem] p-10 md:p-16 border border-amber-100 shadow-inner text-center min-h-[450px] flex flex-col justify-center relative group overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center gap-10">
                  <div className="w-28 h-28 border-[10px] border-amber-50 border-t-amber-800 rounded-full animate-spin shadow-2xl"></div>
                  <h3 className="text-3xl font-amiri font-bold text-amber-900/30 animate-pulse">نستلهم السؤال..</h3>
                </div>
              ) : gameState.currentQuestion ? (
                <>
                  <div className="flex justify-center mb-8"><span className="inline-block px-6 py-2.5 bg-amber-100 text-amber-900 rounded-full text-xs font-black border border-amber-200 shadow-md tracking-widest">{gameState.currentQuestion.category}</span></div>
                  <h3 className="text-4xl md:text-6xl font-amiri font-bold text-amber-950 leading-[1.3] mb-12 px-2 drop-shadow-sm">{gameState.currentQuestion.text}</h3>
                  <div className={`py-6 px-10 rounded-[2.5rem] font-bold text-2xl md:text-3xl transition-all shadow-md border ${gameState.stage === 'RESULT' ? (gameState.lastAnswerCorrect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200') : 'text-amber-800/40 font-medium italic bg-amber-50/10'}`}>
                    {gameState.message}
                  </div>
                  {gameState.stage === 'RESULT' && (
                    <div className="mt-10 p-8 bg-white/70 rounded-[3rem] border border-amber-100/50 text-right animate-fadeIn shadow-sm relative">
                       <div className="absolute -top-3 right-8 px-4 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-full">فائدة نورانية</div>
                      <p className="text-amber-950/80 leading-relaxed font-medium text-lg">{gameState.currentQuestion.explanation}</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-8">
            {!isLoading && gameState.stage === 'DIRECT' && (
              <div className="flex flex-col gap-6">
                <input type="text" value={directInput} onChange={(e) => setDirectInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleDirectAnswer()} placeholder="أدخل الإجابة مباشرة..." className="w-full px-10 py-8 rounded-[3rem] border-2 border-amber-100 bg-white/90 focus:border-amber-600 outline-none text-4xl font-bold text-center transition-all shadow-xl" autoFocus />
                <button onClick={handleDirectAnswer} className="gold-btn py-7 rounded-[2.5rem] font-bold text-2xl shadow-2xl active:scale-95">تحقق من الإجابة المباشرة (نقطتان)</button>
              </div>
            )}
            {!isLoading && gameState.stage === 'MULTIPLE_CHOICE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                {gameState.currentQuestion?.options.map((option, i) => {
                  const isCorrect = option === gameState.currentQuestion?.correctAnswer;
                  const isSelected = gameState.selectedOption === option;
                  let btnStyle = "bg-white/80 border-amber-100 text-amber-950 hover:bg-white hover:border-amber-400 shadow-md";
                  if (gameState.selectedOption) {
                    if (isCorrect) btnStyle = "bg-green-100 border-green-600 text-green-900 scale-[1.05] shadow-2xl ring-4 ring-green-100/50";
                    else if (isSelected) btnStyle = "bg-red-100 border-red-500 text-red-900";
                    else btnStyle = "bg-amber-50/10 border-transparent opacity-30 blur-[1px]";
                  }
                  return (
                    <button key={i} onClick={() => handleOptionClick(option)} disabled={!!gameState.selectedOption} className={`p-8 border-2 rounded-[3rem] text-right font-bold text-2xl transition-all active:scale-95 ${btnStyle}`}>
                      <span className="opacity-20 ml-4">◈</span> {option}
                    </button>
                  );
                })}
              </div>
            )}
            {gameState.stage === 'RESULT' && !isLoading && (
              <button onClick={() => nextTurn(gameState)} className="w-full gold-btn py-8 rounded-[3rem] font-bold text-3xl shadow-2xl flex items-center justify-center gap-5 group">
                <span>السؤال التالي</span>
                <span className="group-hover:translate-x-3 transition-transform duration-300">←</span>
              </button>
            )}
          </div>
        </div>
      )}

      {gameState.status === GameStatus.FINISHED && (
        <div className="text-center flex flex-col items-center gap-12 flex-1 animate-fadeIn mt-10">
          <div className="relative">
             <div className="absolute inset-0 bg-amber-400/40 blur-[80px] rounded-full animate-pulse"></div>
             <div className="text-[12rem] relative z-10 drop-shadow-2xl animate-float">🏆</div>
          </div>
          <h2 className="text-7xl font-amiri font-bold text-amber-950">انتهت الرحلة المباركة</h2>
          <div className="w-full max-w-xl bg-white/80 p-12 rounded-[4rem] border border-amber-100 shadow-2xl space-y-6">
            {gameState.players.sort((a,b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className={`flex justify-between items-center p-8 rounded-[3rem] border-2 transition-all ${i === 0 ? 'bg-amber-50 border-amber-400 scale-[1.08] shadow-2xl' : 'bg-white/50 border-amber-50'}`}>
                <div className="flex items-center gap-6">
                  <span className={`w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl ${i === 0 ? 'bg-amber-600 text-white shadow-lg' : 'bg-amber-100 text-amber-800'}`}>{i+1}</span>
                  <span className="font-bold text-4xl text-amber-950">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-5xl text-amber-900">{p.score}</span>
                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">نقطة</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => window.location.reload()} className="w-full max-w-md gold-btn py-8 rounded-[3rem] font-bold text-3xl shadow-2xl active:scale-95">بداية رحلة جديدة 🔁</button>
        </div>
      )}
    </Layout>
  );
};

export default App;
