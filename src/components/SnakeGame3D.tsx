import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Play, Pause, Trophy } from "lucide-react";
import { toast } from "sonner";
import * as THREE from "three";

interface Position {
  x: number;
  y: number;
}

interface Obstacle extends Position {}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

const SnakeSegment = ({ position, isHead }: { position: Position; isHead: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current && isHead) {
      meshRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={[position.x - GRID_SIZE/2, 0.5, position.y - GRID_SIZE/2]}
    >
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial 
        color={isHead ? "#22c55e" : "#16a34a"}
        emissive={isHead ? "#22c55e" : "#16a34a"}
        emissiveIntensity={isHead ? 0.5 : 0.3}
      />
    </mesh>
  );
};

const Food = ({ position }: { position: Position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 2;
      meshRef.current.position.y = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={[position.x - GRID_SIZE/2, 0.5, position.y - GRID_SIZE/2]}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial 
        color="#c026d3"
        emissive="#c026d3"
        emissiveIntensity={0.7}
      />
    </mesh>
  );
};

const ObstacleBlock = ({ position }: { position: Position }) => {
  return (
    <mesh position={[position.x - GRID_SIZE/2, 0.5, position.y - GRID_SIZE/2]}>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial 
        color="#ef4444"
        emissive="#ef4444"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

const Grid = () => {
  return (
    <gridHelper args={[GRID_SIZE, GRID_SIZE, "#4a5568", "#2d3748"]} />
  );
};

const Scene = ({ 
  snake, 
  food, 
  obstacles 
}: { 
  snake: Position[]; 
  food: Position; 
  obstacles: Obstacle[] 
}) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 15, 15]} />
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
      />
      
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#c026d3" />
      
      <Grid />
      
      {snake.map((segment, index) => (
        <SnakeSegment key={index} position={segment} isHead={index === 0} />
      ))}
      
      <Food position={food} />
      
      {obstacles.map((obstacle, index) => (
        <ObstacleBlock key={index} position={obstacle} />
      ))}
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} />
      </mesh>
    </>
  );
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_food", name: "Primeira Refeição", description: "Coma sua primeira comida", icon: "🍎", unlocked: false },
  { id: "score_50", name: "Iniciante", description: "Alcance 50 pontos", icon: "⭐", unlocked: false },
  { id: "score_100", name: "Experiente", description: "Alcance 100 pontos", icon: "🌟", unlocked: false },
  { id: "score_200", name: "Mestre", description: "Alcance 200 pontos", icon: "💫", unlocked: false },
  { id: "level_5", name: "Sobrevivente", description: "Alcance a fase 5", icon: "🏆", unlocked: false },
  { id: "level_10", name: "Lendário", description: "Alcance a fase 10", icon: "👑", unlocked: false },
  { id: "long_snake", name: "Cobra Gigante", description: "Tenha 15 segmentos", icon: "🐍", unlocked: false },
];

const SnakeGame3D = () => {
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
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [showAchievements, setShowAchievements] = useState(false);
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

  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements((prev) => {
      const updated = prev.map((ach) => {
        if (ach.id === achievementId && !ach.unlocked) {
          toast.success(`Conquista desbloqueada: ${ach.name}`, {
            description: ach.description,
            icon: ach.icon,
          });
          return { ...ach, unlocked: true };
        }
        return ach;
      });
      localStorage.setItem("snakeAchievements", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const checkAchievements = useCallback((currentScore: number, currentLevel: number, snakeLength: number) => {
    if (currentScore >= 10) unlockAchievement("first_food");
    if (currentScore >= 50) unlockAchievement("score_50");
    if (currentScore >= 100) unlockAchievement("score_100");
    if (currentScore >= 200) unlockAchievement("score_200");
    if (currentLevel >= 5) unlockAchievement("level_5");
    if (currentLevel >= 10) unlockAchievement("level_10");
    if (snakeLength >= 15) unlockAchievement("long_snake");
  }, [unlockAchievement]);

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
        checkAchievements(newScore, level, newSnake.length);
        
        if (newScore % 50 === 0 && newScore > 0) {
          levelUp();
        }
      } else {
        newSnake.pop();
      }

      setDirection(nextDirection);
      return newSnake;
    });
  }, [nextDirection, food, score, gameOver, isPaused, checkCollision, generateFood, highScore, obstacles, levelUp, checkAchievements, level]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem("snakeHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
    
    const savedAchievements = localStorage.getItem("snakeAchievements");
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (direction.y === 0) setNextDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (direction.y === 0) setNextDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (direction.x === 0) setNextDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
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

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-background">
      <div className="text-center space-y-2 animate-fade-in">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse-neon">
          Neon Snake 3D
        </h1>
        <p className="text-muted-foreground">WASD ou Setas para controlar • Espaço para pausar • Arraste para rotacionar</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
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

        <Card 
          className="p-4 bg-card/50 backdrop-blur border-primary/20 shadow-neon cursor-pointer hover:scale-105 transition-transform"
          onClick={() => setShowAchievements(!showAchievements)}
        >
          <div className="text-center">
            <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-sm text-muted-foreground">Conquistas</p>
            <p className="text-2xl font-bold text-primary">{unlockedCount}/{achievements.length}</p>
          </div>
        </Card>
      </div>

      {showAchievements && (
        <Card className="p-6 bg-card/90 backdrop-blur border-primary/20 shadow-neon max-w-2xl w-full animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Conquistas</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowAchievements(false)}>
              Fechar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border transition-all ${
                  achievement.unlocked
                    ? "bg-primary/10 border-primary/50"
                    : "bg-muted/10 border-muted/50 opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div>
                    <h3 className="font-bold text-foreground">{achievement.name}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="relative w-full max-w-3xl h-[500px] rounded-lg overflow-hidden border-2 border-primary/30 shadow-neon">
        <Canvas>
          <Scene snake={snake} food={food} obstacles={obstacles} />
        </Canvas>
        
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
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
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-5xl font-bold text-secondary animate-pulse-neon">Fase {level}</h2>
              <p className="text-xl text-secondary-glow">Prepare-se!</p>
            </div>
          </div>
        )}

        {isPaused && !gameOver && !showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
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

export default SnakeGame3D;
