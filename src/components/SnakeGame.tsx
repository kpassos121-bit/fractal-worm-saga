import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface Position {
  x: number;
  y: number;
}

interface Obstacle extends Position {}

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

const SnakeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [nextDirection, setNextDirection] = useState<Position>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isPaused, setIsPaused] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const gameLoopRef = useRef<number>();

  const generateFood = useCallback((currentSnake: Position[], currentObstacles: Obstacle[]) => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y) ||
      currentObstacles.some((obstacle) => obstacle.x === newFood.x && obstacle.y === newFood.y)
    );
    return newFood;
  }, []);

  const generateObstacles = useCallback((count: number, currentSnake: Position[]) => {
    const newObstacles: Obstacle[] = [];
    for (let i = 0; i < count; i++) {
      let obstacle: Obstacle;
      do {
        obstacle = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
      } while (
        currentSnake.some((segment) => segment.x === obstacle.x && segment.y === obstacle.y) ||
        newObstacles.some((obs) => obs.x === obstacle.x && obs.y === obstacle.y)
      );
      newObstacles.push(obstacle);
    }
    return newObstacles;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    const initialObstacles = generateObstacles(0, initialSnake);
    setSnake(initialSnake);
    setFood(generateFood(initialSnake, initialObstacles));
    setObstacles(initialObstacles);
    setDirection({ x: 1, y: 0 });
    setNextDirection({ x: 1, y: 0 });
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setSpeed(INITIAL_SPEED);
    setIsPaused(false);
    setShowLevelUp(false);
  }, [generateFood, generateObstacles]);

  const levelUp = useCallback(() => {
    const newLevel = level + 1;
    setLevel(newLevel);
    setSpeed((prevSpeed) => Math.max(50, prevSpeed - 20));
    
    const obstacleCount = Math.floor(newLevel / 2);
    const newObstacles = generateObstacles(obstacleCount, snake);
    setObstacles(newObstacles);
    
    setShowLevelUp(true);
    setIsPaused(true);
    toast.success(`Fase ${newLevel}!`, {
      description: `Velocidade aumentada! ${obstacleCount > 0 ? `${obstacleCount} obstáculos adicionados!` : ''}`,
    });
    
    setTimeout(() => {
      setShowLevelUp(false);
      setIsPaused(false);
    }, 2000);
  }, [level, snake, generateObstacles]);

  const checkCollision = useCallback((head: Position, body: Position[], currentObstacles: Obstacle[]) => {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    
    if (body.some((segment) => segment.x === head.x && segment.y === head.y)) {
      return true;
    }
    
    if (currentObstacles.some((obstacle) => obstacle.x === head.x && obstacle.y === head.y)) {
      return true;
    }
    
    return false;
  }, []);

  const gameLoop = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };
      head.x += nextDirection.x;
      head.y += nextDirection.y;

      if (checkCollision(head, prevSnake.slice(1), obstacles)) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem("snakeHighScore", score.toString());
        }
        toast.error("Game Over!", {
          description: `Pontuação final: ${score}`,
        });
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        const newScore = score + 10;
        setScore(newScore);
        setFood(generateFood(newSnake, obstacles));
        
        if (newScore % 50 === 0 && newScore > 0) {
          levelUp();
        }
      } else {
        newSnake.pop();
      }

      setDirection(nextDirection);
      return newSnake;
    });
  }, [nextDirection, food, score, gameOver, isPaused, checkCollision, generateFood, highScore, obstacles, levelUp]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem("snakeHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          if (direction.y === 0) setNextDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
          if (direction.y === 0) setNextDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
          if (direction.x === 0) setNextDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
          if (direction.x === 0) setNextDirection({ x: 1, y: 0 });
          break;
        case " ":
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameOver]);

  useEffect(() => {
    gameLoopRef.current = window.setInterval(gameLoop, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameLoop, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "hsl(240 10% 8%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "hsl(240 20% 20% / 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw obstacles
    obstacles.forEach((obstacle) => {
      ctx.fillStyle = "hsl(0 84% 60%)";
      ctx.shadowColor = "hsl(0 84% 60%)";
      ctx.shadowBlur = 15;
      ctx.fillRect(obstacle.x * CELL_SIZE + 2, obstacle.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.shadowBlur = 0;
    });

    // Draw food
    ctx.fillStyle = "hsl(280 84% 60%)";
    ctx.shadowColor = "hsl(280 84% 60%)";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? "hsl(160 84% 50%)" : "hsl(160 84% 40%)";
      ctx.shadowColor = "hsl(160 84% 50%)";
      ctx.shadowBlur = isHead ? 25 : 15;
      ctx.fillRect(
        segment.x * CELL_SIZE + 2,
        segment.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
      ctx.shadowBlur = 0;
    });
  }, [snake, food, obstacles]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center space-y-2 animate-fade-in">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse-neon">
          Neon Snake
        </h1>
        <p className="text-muted-foreground">Use as setas para controlar • Espaço para pausar</p>
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 shadow-neon">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Pontuação</p>
            <p className="text-3xl font-bold text-primary">{score}</p>
          </div>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur border-accent/20 shadow-neon">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Recorde</p>
            <p className="text-3xl font-bold text-accent">{highScore}</p>
          </div>
        </Card>

        <Card className="p-4 bg-card/50 backdrop-blur border-secondary/20 shadow-neon-secondary">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Fase</p>
            <p className="text-3xl font-bold text-secondary">{level}</p>
          </div>
        </Card>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="border-2 border-primary/30 rounded-lg shadow-neon bg-background/80 backdrop-blur"
        />
        
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg animate-fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold text-destructive">Game Over!</h2>
              <p className="text-xl text-foreground">Pontuação: {score}</p>
              {score === highScore && score > 0 && (
                <p className="text-lg text-primary animate-pulse-neon">Novo Recorde! 🎉</p>
              )}
            </div>
          </div>
        )}

        {showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-5xl font-bold text-secondary animate-pulse-neon">Fase {level}</h2>
              <p className="text-xl text-secondary-glow">Prepare-se!</p>
            </div>
          </div>
        )}

        {isPaused && !gameOver && !showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg animate-fade-in">
            <div className="text-center space-y-2">
              <Pause className="w-16 h-16 mx-auto text-accent" />
              <h2 className="text-3xl font-bold text-accent">Pausado</h2>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={resetGame}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Reiniciar
        </Button>

        {!gameOver && (
          <Button
            onClick={() => setIsPaused((prev) => !prev)}
            size="lg"
            variant="outline"
            className="border-accent/50 text-accent hover:bg-accent/10"
          >
            {isPaused ? (
              <>
                <Play className="mr-2 h-5 w-5" />
                Continuar
              </>
            ) : (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pausar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;
