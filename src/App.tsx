/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Play, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Point, Direction, Food, GameStatus } from "./types";

// 遊戲常數
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const INITIAL_SPEED = 150; // 毫秒
const MIN_SPEED = 60;

export default function App() {
  // 遊戲狀態
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
    { x: 10, y: 13 },
  ]);
  const [direction, setDirection] = useState<Direction>("UP");
  const [foods, setFoods] = useState<Food[]>([]);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Refs 用於遊戲邏輯（避免閉包陷阱）
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef<Direction>("UP");
  const lastUpdateRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  
  // 生成隨機位置的食物
  const createFood = useCallback((currentSnake: Point[]): Food => {
    let newFood: Food;
    while (true) {
      const rand = Math.random();
      let type: 'standard' | 'premium' | 'poisonous' = 'standard';
      if (rand > 0.9) type = 'poisonous';
      else if (rand > 0.7) type = 'premium';

      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
        type,
        expiresAt: Date.now() + 6000 + Math.random() * 6000, // 6-12秒後消失
      };
      // 確保食物不會出現在蛇身
      const onSnake = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  // 初始化遊戲
  const startGame = () => {
    const initialSnake = [
      { x: 20, y: 15 },
      { x: 20, y: 16 },
      { x: 20, y: 17 },
      { x: 20, y: 18 },
    ];
    setSnake(initialSnake);
    setDirection("UP");
    directionRef.current = "UP";
    setFoods([createFood(initialSnake), createFood(initialSnake), createFood(initialSnake)]);
    setScore(0);
    setStatus(GameStatus.PLAYING);
    lastUpdateRef.current = performance.now();
  };

  // 鍵盤控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== "DOWN") setDirection("UP");
          break;
        case "ArrowDown":
          if (directionRef.current !== "UP") setDirection("DOWN");
          break;
        case "ArrowLeft":
          if (directionRef.current !== "RIGHT") setDirection("LEFT");
          break;
        case "ArrowRight":
          if (directionRef.current !== "LEFT") setDirection("RIGHT");
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 更新方向 Ref
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // 遊戲主迴圈
  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;

    // 控制遊戲速度：分數越高速度越快
    // 初始 150ms，每 10 分減少 3ms，挑戰難度更高
    const speed = Math.max(40, INITIAL_SPEED - Math.floor(score / 10) * 3);
    
    if (time - lastUpdateRef.current > speed) {
      setFoods(prevFoods => {
        const now = Date.now();
        // 移除過期食物
        const validFoods = prevFoods.filter(f => f.expiresAt > now);
        // 如果場上沒食物了，補幾個
        if (validFoods.length < 2) return [...validFoods, createFood(snake), createFood(snake)];
        return validFoods;
      });

      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (directionRef.current) {
          case "UP": newHead.y -= 1; break;
          case "DOWN": newHead.y += 1; break;
          case "LEFT": newHead.x -= 1; break;
          case "RIGHT": newHead.x += 1; break;
        }

        // 碰撞檢查：牆壁
        if (
          newHead.x < 0 ||
          newHead.x >= CANVAS_WIDTH / GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= CANVAS_HEIGHT / GRID_SIZE
        ) {
          setStatus(GameStatus.GAME_OVER);
          return prevSnake;
        }

        // 碰撞檢查：自身
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setStatus(GameStatus.GAME_OVER);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // 檢查是否吃到食物
        let ate = false;
        setFoods(currentFoods => {
          const hitFoodIndex = currentFoods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
          if (hitFoodIndex !== -1) {
            ate = true;
            const food = currentFoods[hitFoodIndex];
            
            // 計分邏輯
            if (food.type === 'poisonous') {
              setScore(s => Math.max(0, s - 15));
            } else {
              setScore(s => s + (food.type === 'premium' ? 25 : 10));
            }
            
            // 隨機生成 4-6 個新食物
            const spawnCount = Math.floor(Math.random() * 3) + 4;
            const nextFoods = currentFoods.filter((_, i) => i !== hitFoodIndex);
            
            for(let i=0; i<spawnCount; i++) {
              if (nextFoods.length < 15) { // 最多保留 15 個在場上
                nextFoods.push(createFood(newSnake));
              }
            }
            return nextFoods;
          }
          return currentFoods;
        });

        if (!ate) {
          newSnake.pop();
        }

        return newSnake;
      });
      lastUpdateRef.current = time;
    }
    
    requestRef.current = requestAnimationFrame(update);
  }, [status, score, createFood, snake]);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [status, update]);

  // 更新最高分
  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // 繪製畫布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清除畫布
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
    gradient.addColorStop(0, "#FCFAF5");
    gradient.addColorStop(1, "#F7F3E9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 繪製背景網格（微妙的）
    ctx.strokeStyle = "rgba(140, 126, 109, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    // 繪製食物
    foods.forEach((food) => {
      const now = Date.now();
      const timeLeft = food.expiresAt - now;
      const isExpiring = timeLeft < 2000; // 剩不到 2 秒時閃爍
      
      ctx.globalAlpha = isExpiring ? (Math.sin(now / 100) * 0.3 + 0.7) : 1;
      
      if (food.type === 'poisonous') {
        ctx.fillStyle = '#334155'; // 毒蘑菇顏色
      } else {
        ctx.fillStyle = food.type === 'premium' ? '#B91C1C' : '#D97706';
      }
      
      const scale = isExpiring ? (Math.sin(now / 200) * 0.1 + 0.9) : 1;
      const size = (GRID_SIZE / 3) * scale;
      
      ctx.beginPath();
      // 毒蘑菇形狀稍微不同
      if (food.type === 'poisonous') {
        ctx.roundRect(food.x * GRID_SIZE + 4, food.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, 4);
      } else {
        ctx.arc(
          food.x * GRID_SIZE + GRID_SIZE / 2,
          food.y * GRID_SIZE + GRID_SIZE / 2,
          size,
          0,
          Math.PI * 2
        );
      }
      ctx.fill();
      
      // 高光或毒素標誌
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      if (food.type === 'poisonous') {
        ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, 2, 0, Math.PI * 2);
      } else {
        ctx.arc(
          food.x * GRID_SIZE + GRID_SIZE / 2 - 2,
          food.y * GRID_SIZE + GRID_SIZE / 2 - 2,
          size / 2,
          0,
          Math.PI * 2
        );
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // 繪製蛇
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? "#5C6E58" : "#8BA888";
      
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      const size = GRID_SIZE - 4;
      const radius = isHead ? 8 : 4;

      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, size, size, radius);
      ctx.fill();

      // 如果是蛇頭，畫上眼睛
      if (isHead) {
        ctx.fillStyle = "white";
        const eyeSize = 3;
        let lX = x + 4, lY = y + 4, rX = x + 12, rY = y + 4;

        if (directionRef.current === "DOWN") {
          lY = y + 12; rY = y + 12;
        } else if (directionRef.current === "LEFT") {
          rX = x + 4; rY = y + 12;
        } else if (directionRef.current === "RIGHT") {
          lX = x + 12; lY = y + 12;
        }

        ctx.fillRect(lX, lY, eyeSize, eyeSize);
        ctx.fillRect(rX, rY, eyeSize, eyeSize);
      }
    });

  }, [snake, foods]);

  return (
    <div className="min-h-screen bg-earth-100 flex flex-col items-center justify-center p-8 select-none font-sans overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[1024px] flex flex-col gap-8"
      >
        {/* Header Section */}
        <header className="w-full flex justify-between items-end border-b-2 border-earth-300 pb-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-forest-700 tracking-tighter">Forest Crawler</h1>
            <p className="text-xs text-earth-text uppercase tracking-[0.2em] font-bold">The Humble Snake • Harvest Edition</p>
          </div>
          
          <div className="flex gap-12">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-earth-muted font-bold mb-1">Current Score</div>
              <div className="text-3xl font-mono font-black text-forest-900 leading-none">{score.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-earth-muted font-bold mb-1">Top Record</div>
              <div className="text-3xl font-mono font-black text-forest-500 leading-none">{highScore.toLocaleString()}</div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative flex-1 flex items-start justify-center gap-8">
          <div className="relative bg-white rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] border-[12px] border-earth-300 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block bg-white"
            />

            {/* Overlays */}
            <AnimatePresence>
              {status === GameStatus.IDLE && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-forest-900/80 backdrop-blur-sm p-10 text-center"
                >
                  <h2 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase">Forest Path</h2>
                  <p className="text-earth-300 mb-8 font-serif italic text-lg">Begin your journey through the dense brush.</p>
                  <button
                    onClick={startGame}
                    className="px-10 py-4 bg-forest-500 hover:bg-forest-700 text-white font-black text-xl rounded-full transition-all active:scale-95 shadow-lg flex items-center gap-3"
                  >
                    Enter the Wild <Play size={24} fill="currentColor" />
                  </button>
                </motion.div>
              )}

              {status === GameStatus.GAME_OVER && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-forest-900/85 backdrop-blur-md p-10 text-center"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <h2 className="text-7xl font-black text-white mb-2 tracking-tighter uppercase">Game Over</h2>
                    <p className="text-earth-300 mb-10 font-serif italic text-xl">The forest reclaimed the crawler.</p>
                    <div className="bg-white/10 w-full p-6 rounded-3xl mb-10 border border-white/10">
                      <span className="text-xs font-bold text-earth-muted uppercase tracking-widest block mb-2">Final Harvest</span>
                      <span className="text-6xl font-black text-forest-500">{score.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={startGame}
                      className="px-12 py-4 bg-earth-100 hover:bg-white text-forest-900 font-black text-xl rounded-full transition-all active:scale-95 shadow-2xl flex items-center gap-3 mx-auto"
                    >
                      Begin Anew <RefreshCw size={24} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Section */}
          <aside className="w-64 flex flex-col gap-6 flex-shrink-0">
            <div className="bg-earth-200 p-6 rounded-2xl border border-earth-300">
              <h3 className="text-[10px] font-black text-earth-muted uppercase mb-5 tracking-widest">Nourishment Info</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#D97706] shadow-sm"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-forest-900">Wild Berry</span>
                    <span className="text-[10px] font-bold text-forest-500 uppercase">+10 Points</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#B91C1C] shadow-sm"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-forest-900 font-serif italic">Autumn Rosehip</span>
                    <span className="text-[10px] font-bold text-red-600 uppercase">+25 Points</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-lg bg-[#334155] shadow-sm"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700">Poisonous</span>
                    <span className="text-[10px] font-bold text-red-500 uppercase">-15 Points</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-forest-700 p-6 rounded-2xl text-earth-100 shadow-xl">
              <h3 className="text-[10px] font-black opacity-60 uppercase mb-5 tracking-widest">Controls</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-forest-700">
                <div />
                <div className="bg-earth-100/20 p-2 rounded-lg aspect-square flex items-center justify-center border border-white/10"><ArrowUp size={16} color="white" /></div>
                <div />
                <div className="bg-earth-100/20 p-2 rounded-lg aspect-square flex items-center justify-center border border-white/10"><ArrowLeft size={16} color="white" /></div>
                <div className="bg-earth-100/20 p-2 rounded-lg aspect-square flex items-center justify-center border border-white/10"><ArrowDown size={16} color="white" /></div>
                <div className="bg-earth-100/20 p-2 rounded-lg aspect-square flex items-center justify-center border border-white/10"><ArrowRight size={16} color="white" /></div>
              </div>
              <p className="mt-5 text-[11px] leading-relaxed opacity-70 font-medium italic">
                Use directional arrows to navigate through the dense undergrowth. Avoid the stone walls and your own tail.
              </p>
            </div>
          </aside>
        </main>

        {/* Footer */}
        <footer className="w-full flex justify-between items-center text-[10px] text-earth-muted font-black tracking-widest uppercase border-t-2 border-earth-300 pt-4">
          <div>v1.0.4 • HARVEST EDITION</div>
          <div className="flex gap-6">
            <span className="flex items-center gap-2 italic">Sound: <span className="text-forest-700">On</span></span>
            <span className="flex items-center gap-2 italic">Grid: <span className="text-forest-700">Hidden</span></span>
            <span className="flex items-center gap-2 italic">Difficulty: <span className="text-forest-700">Ranger</span></span>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
