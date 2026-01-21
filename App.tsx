
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  GameObject, 
  Ranking,
  COLUMNS, 
  ROWS, 
  COLOR_PALETTE, 
  FALL_DURATION,
  FALLBACK_WORDS,
  SPAWN_DELAY
} from './types';

const SUPABASE_URL = 'https://fgmchdihogjowgjsbghr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SmDleodGwF_AxWQX8pFW2A_Sn7wcUE-';

const App: React.FC = () => {
  // Lobby & Identity States
  const [playerName, setPlayerName] = useState('');
  const [theme, setTheme] = useState('');
  const [isLobby, setIsLobby] = useState(true);
  const [isLoadingWords, setIsLoadingWords] = useState(false);

  // Game States
  const [score, setScore] = useState(0);
  const [comboPoints, setComboPoints] = useState<number | null>(null);
  const [board, setBoard] = useState<(GameObject | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null))
  );
  const [movingObject, setMovingObject] = useState<GameObject | null>(null);
  const [nextWord, setNextWord] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [nextSpawnTimer, setNextSpawnTimer] = useState<number | null>(null);
  
  // Word Management
  const [gameWordPool, setGameWordPool] = useState<string[]>([]);
  const [wordColorMap, setWordColorMap] = useState<Record<string, string>>({});
  
  // Ranking State
  const [topRankings, setTopRankings] = useState<Ranking[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  const spawnTimerRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);

  const generateWordsByTheme = async (selectedTheme: string): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `당신은 단어 퍼즐 게임의 기획자입니다. 사용자가 입력한 [주제]와 매우 밀접한 한국어 단어 10개를 생성하세요.
          규칙:
          1. 고유한 한국어 명사 10개 (중복 금지)
          2. 글자 수는 2자 이상 6자 이하
          3. JSON 배열 형식: ["단어1", "단어2", ..., "단어10"]
          
          주제: ${selectedTheme}`,
      });
      const text = response.text || "";
      const jsonStr = text.match(/\[.*\]/s)?.[0] || "";
      const parsed: string[] = JSON.parse(jsonStr);
      const filtered = parsed.filter(w => /^[가-힣]+$/.test(w) && w.length >= 2 && w.length <= 6);
      return filtered.length >= 5 ? filtered.slice(0, 10) : [...FALLBACK_WORDS];
    } catch (error) {
      return [...FALLBACK_WORDS];
    }
  };

  const fetchRankings = async () => {
    setIsLoadingRankings(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rankings?select=name,score&order=score.desc&limit=3`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await response.json();
      setTopRankings(Array.isArray(data) ? data : []);
    } catch (error) {} finally { setIsLoadingRankings(false); }
  };

  const updateRanking = async (finalScore: number) => {
    if (!playerName.trim()) return;
    try {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rankings?name=eq.${encodeURIComponent(playerName)}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        if (finalScore > existing[0].score) {
          await fetch(`${SUPABASE_URL}/rest/v1/rankings?name=eq.${encodeURIComponent(playerName)}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore })
          });
        }
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/rankings`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: playerName, score: finalScore })
        });
      }
      fetchRankings();
    } catch (error) {}
  };

  const getConnections = (targetBoard: (GameObject | null)[][], r: number, c: number) => {
    const startObj = targetBoard[r][c];
    if (!startObj) return [];
    const word = startObj.word;
    const connected: { r: number, c: number }[] = [];
    const visited = new Set<string>();
    const queue = [{ r, c }];
    visited.add(`${r},${c}`);
    while (queue.length > 0) {
      const { r: cr, c: cc } = queue.shift()!;
      connected.push({ r: cr, c: cc });
      const neighbors = [{ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 }];
      for (const next of neighbors) {
        if (next.r >= 0 && next.r < ROWS && next.c >= 0 && next.c < COLUMNS && !visited.has(`${next.r},${next.c}`) && targetBoard[next.r][next.c]?.word === word) {
          visited.add(`${next.r},${next.c}`);
          queue.push(next);
        }
      }
    }
    return connected;
  };

  const applyGravityToBoard = (currentBoard: (GameObject | null)[][]) => {
    for (let c = 0; c < COLUMNS; c++) {
      let writeIdx = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (currentBoard[r][c] !== null) {
          if (writeIdx !== r) {
            currentBoard[writeIdx][c] = { ...currentBoard[r][c]!, row: writeIdx };
            currentBoard[r][c] = null;
          }
          writeIdx--;
        }
      }
    }
  };

  const processChainReactions = (currentBoard: (GameObject | null)[][]): { board: (GameObject | null)[][], points: number } => {
    let totalPoints = 0;
    let chainFound = true;
    while (chainFound) {
      chainFound = false;
      const toRemove = new Set<string>();
      const visitedForMatch = new Set<string>();
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
          if (currentBoard[r][c] && !visitedForMatch.has(`${r},${c}`)) {
            const group = getConnections(currentBoard, r, c);
            if (group.length >= 3) {
              group.forEach(pos => { toRemove.add(`${pos.r},${pos.c}`); visitedForMatch.add(`${pos.r},${pos.c}`); });
              totalPoints += (40 + (group.length - 3) * 10);
              chainFound = true;
            } else {
              group.forEach(pos => visitedForMatch.add(`${pos.r},${pos.c}`));
            }
          }
        }
      }
      if (chainFound) {
        toRemove.forEach(key => { const [r, c] = key.split(',').map(Number); currentBoard[r][c] = null; });
        applyGravityToBoard(currentBoard);
      }
    }
    return { board: currentBoard, points: totalPoints };
  };

  const startSpawnCountdown = useCallback(() => {
    setNextSpawnTimer(1); // 1초 대기로 변경
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    spawnTimerRef.current = window.setInterval(() => {
      setNextSpawnTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(spawnTimerRef.current!);
          spawnObject();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [gameWordPool]);

  const landObject = useCallback((obj: GameObject) => {
    if (gameOver) return;
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      if (obj.row < 0 || newBoard[obj.row][obj.col] !== null) {
        setGameOver(true);
        return prevBoard;
      }
      newBoard[obj.row][obj.col] = { ...obj, status: 'fixed' };
      const { board: clearedBoard, points } = processChainReactions(newBoard);
      if (points > 0) {
        setScore(s => {
          const newTotal = s + points;
          setComboPoints(points);
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = window.setTimeout(() => setComboPoints(null), 1500);
          return newTotal;
        });
      }
      setMovingObject(null);
      startSpawnCountdown();
      return clearedBoard;
    });
  }, [gameOver, startSpawnCountdown]);

  const spawnObject = useCallback(() => {
    setBoard(currentBoard => {
      if (gameOver || isLobby || gameWordPool.length === 0) return currentBoard;
      
      const spawnCol = Math.floor(Math.random() * COLUMNS);
      if (currentBoard[0][spawnCol] !== null) {
        setGameOver(true);
        return currentBoard;
      }

      setNextWord(prevNext => {
        const wordToSpawn = prevNext || gameWordPool[Math.floor(Math.random() * gameWordPool.length)];
        const newObj: GameObject = {
          id: Math.random().toString(36).substr(2, 9),
          word: wordToSpawn, col: spawnCol, row: 0, status: 'moving',
          color: wordColorMap[wordToSpawn] || 'bg-slate-500'
        };
        setMovingObject(newObj);
        
        // 다음 나올 단어 미리 준비
        return gameWordPool[Math.floor(Math.random() * gameWordPool.length)];
      });

      return currentBoard;
    });
  }, [gameOver, isLobby, gameWordPool, wordColorMap]);

  useEffect(() => {
    if (!movingObject || gameOver) return;
    const fallStepTime = FALL_DURATION / ROWS; // 1000ms / 10 rows = 100ms per row
    const ticker = setInterval(() => {
      setMovingObject(prev => {
        if (!prev) return null;
        const nextRow = prev.row + 1;
        if (nextRow < ROWS && board[nextRow][prev.col] === null) {
          return { ...prev, row: nextRow };
        } else {
          clearInterval(ticker);
          landObject(prev);
          return null;
        }
      });
    }, fallStepTime);
    return () => clearInterval(ticker);
  }, [movingObject === null, gameOver, board, landObject]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wordToMatch = inputValue.trim();
    if (!wordToMatch) return;

    let targetDeletedInBoard = false;
    let totalPointsGained = 0;

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      let targetFound = false;
      for (let r = ROWS - 1; r >= 0; r--) {
        for (let c = 0; c < COLUMNS; c++) {
          if (newBoard[r][c]?.word === wordToMatch) {
            newBoard[r][c] = null;
            totalPointsGained += 10;
            targetFound = true;
            targetDeletedInBoard = true;
            r = -1; c = COLUMNS; 
          }
        }
      }
      if (targetFound) {
        applyGravityToBoard(newBoard);
        const { board: clearedBoard, points } = processChainReactions(newBoard);
        totalPointsGained += points;
        setScore(s => s + totalPointsGained);
        if (totalPointsGained > 10) {
          setComboPoints(totalPointsGained);
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = window.setTimeout(() => setComboPoints(null), 1500);
        }
        return clearedBoard;
      }
      return prevBoard;
    });

    if (!targetDeletedInBoard && movingObject?.word === wordToMatch) {
      setMovingObject(null);
      setScore(s => {
        const ns = s + 10;
        startSpawnCountdown();
        return ns;
      });
    }
    setInputValue('');
  };

  const startGame = async () => {
    if (!playerName.trim() || !theme.trim()) return;
    setIsLoadingWords(true);
    const words = await generateWordsByTheme(theme);
    const colorMap: Record<string, string> = {};
    words.forEach((w, i) => { colorMap[w] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    setGameWordPool(words);
    setWordColorMap(colorMap);
    setNextWord(words[Math.floor(Math.random() * words.length)]);
    setIsLoadingWords(false);
    setIsLobby(false);
    setGameOver(false);
    setScore(0);
    setBoard(Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null)));
    setMovingObject(null);
    setNextSpawnTimer(null);
  };

  const resetToLobby = () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    setIsLobby(true);
    setGameOver(false);
    setScore(0);
    setMovingObject(null);
    setNextSpawnTimer(null);
    setInputValue('');
    setGameWordPool([]);
  };

  useEffect(() => { fetchRankings(); }, []);
  useEffect(() => {
    if (!isLobby && gameWordPool.length > 0 && !movingObject && nextSpawnTimer === null && !gameOver) spawnObject();
  }, [isLobby, gameWordPool.length, movingObject === null, nextSpawnTimer === null, gameOver, spawnObject]);

  useEffect(() => { if (gameOver) updateRanking(score); }, [gameOver]);

  if (isLobby) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-blue-400">WORD DROP</h1>
            <p className="text-slate-400 font-medium tracking-widest uppercase">AI Chain Puzzle</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 uppercase tracking-widest">
              <i className="fa-solid fa-trophy text-amber-400"></i> Hall of Fame
            </h2>
            <div className="space-y-3 mb-8">
              {isLoadingRankings ? (
                <div className="text-slate-500 animate-pulse text-xs uppercase font-black">Loading...</div>
              ) : topRankings.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500' : 'bg-slate-500'}`}>{i + 1}</span>
                    <span className="font-bold text-slate-200">{r.name}</span>
                  </div>
                  <span className="font-black text-blue-400">{r.score}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="PLAYER NAME" value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 10))} className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-4 px-6 text-xl font-bold text-center tracking-widest focus:outline-none focus:border-blue-500 transition-all"/>
              <input type="text" placeholder="THEME" value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-4 px-6 text-xl font-bold text-center tracking-widest focus:outline-none focus:border-blue-500 transition-all"/>
              <button onClick={startGame} disabled={!playerName.trim() || !theme.trim() || isLoadingWords} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl text-lg tracking-widest uppercase">
                {isLoadingWords ? 'GENERATING...' : 'START GAME'}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">High Velocity Mode Enabled • 1s Falling</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex justify-between items-end mb-4 px-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{playerName} | {theme}</span>
          <h1 className="text-xl font-black tracking-tighter text-blue-400 uppercase">Word Drop</h1>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Next</div>
            {nextWord && (
              <div className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${wordColorMap[nextWord]}`}>
                {nextWord}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Score</div>
            <div className="text-2xl font-black text-white">{score}</div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div 
          className="relative bg-slate-800/80 backdrop-blur-xl border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: '300px', height: '500px', display: 'grid', gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
        >
          {comboPoints !== null && (
            <div className="absolute top-1/3 left-0 w-full text-center z-50 pointer-events-none animate-bounce">
              <span className="text-5xl font-black text-amber-400 drop-shadow-lg">+{comboPoints}</span>
              <div className="text-xs font-black text-white uppercase tracking-widest">CHAIN!</div>
            </div>
          )}

          {board.map((row, r) => row.map((cell, c) => cell && (
            <div key={cell.id} className="absolute grid-step-transition flex items-center justify-center text-[11px] font-black p-1 rounded-lg shadow-lg ring-1 ring-white/10 text-white truncate"
              style={{ width: `${100 / COLUMNS}%`, height: `${100 / ROWS}%`, top: `${(r / ROWS) * 100}%`, left: `${(c / COLUMNS) * 100}%`, backgroundColor: cell.color.replace('bg-', '') }}>
              <div className={`w-full h-full flex items-center justify-center rounded ${cell.color}`}>{cell.word}</div>
            </div>
          )))}

          {movingObject && (
            <div className="absolute grid-step-transition flex items-center justify-center text-[11px] font-black p-1 rounded-lg shadow-2xl ring-2 ring-white/30 text-white z-10"
              style={{ 
                width: `${100 / COLUMNS}%`, 
                height: `${100 / ROWS}%`, 
                left: `${(movingObject.col / COLUMNS) * 100}%`, 
                top: `${(movingObject.row / ROWS) * 100}%` 
              }}>
              <div className={`w-full h-full flex items-center justify-center rounded ${movingObject.color} animate-pulse`}>{movingObject.word}</div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
              <i className="fa-solid fa-skull-crossbones text-5xl text-rose-500 mb-4"></i>
              <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Terminated</h2>
              <p className="text-slate-400 mb-8 font-bold uppercase tracking-widest">Final Score: {score}</p>
              <div className="flex flex-col gap-3 w-40">
                <button onClick={startGame} className="py-3 bg-blue-600 text-white font-black rounded-xl text-xs uppercase hover:bg-blue-500 transition-colors">Replay</button>
                <button onClick={resetToLobby} className="py-3 bg-slate-700 text-white font-black rounded-xl text-xs uppercase hover:bg-slate-600 transition-colors">Menu</button>
              </div>
            </div>
          )}
        </div>

        {!movingObject && !gameOver && !isLoadingWords && !isLobby && nextSpawnTimer !== null && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-slate-400 font-bold text-[9px] uppercase tracking-widest bg-slate-900/80 px-4 py-1 rounded-full border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in duration-200">
            Next Word in {nextSpawnTimer}s
          </div>
        )}
      </div>

      <div className="mt-6 w-full max-w-sm">
        <form onSubmit={handleInputSubmit} className="relative mb-4">
          <input type="text" placeholder="TYPE WORD..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={gameOver}
            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl py-4 px-6 text-lg font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all shadow-inner" autoFocus/>
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 px-4 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors">
            <i className="fa-solid fa-bolt"></i>
          </button>
        </form>
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-wrap justify-center gap-1">
          {gameWordPool.map(w => (
            <span key={w} className={`px-2 py-0.5 rounded-md text-[9px] font-black text-white/90 uppercase tracking-tighter border border-white/10 ${wordColorMap[w] || 'bg-slate-700'}`}>
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
