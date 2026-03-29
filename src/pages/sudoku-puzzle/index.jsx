import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/ui/Header";
import NavigationBreadcrumb from "../../components/ui/NavigationBreadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import { useIntroVibeAuth } from "../../introVibeAuth";
import {
  getStoredSessionToken,
  isApiOnlyMode,
  isApiUnavailableError,
  isRemoteAuthEnabled,
  requestIntroVibeApi,
} from "../../lib/introVibeApi";

const SUDOKU_PROGRESS_KEY = "introVibeSudokuProgress";

const puzzle = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const cloneBoard = (board) => board.map((row) => [...row]);

const getInitialBoard = (userId) => {
  if (!userId) return cloneBoard(puzzle);

  try {
    const raw = localStorage.getItem(SUDOKU_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const savedBoard = parsed?.[userId];
    if (Array.isArray(savedBoard) && savedBoard.length === 9) {
      return savedBoard.map((row) => (Array.isArray(row) ? [...row] : Array(9).fill(0)));
    }
  } catch (error) {
    console.error("Failed to restore Sudoku progress", error);
  }

  return cloneBoard(puzzle);
};

const shouldUseRemoteSudoku = (authMode, currentUserId) =>
  Boolean(currentUserId) && (authMode === "railway-api" || (isRemoteAuthEnabled() && getStoredSessionToken()));

const shouldFallbackToLegacySudoku = (error) =>
  isRemoteAuthEnabled() && !isApiOnlyMode() && isApiUnavailableError(error);

const SudokuPuzzle = () => {
  const navigate = useNavigate();
  const { currentUser, markSudokuComplete, error: authError, authMode, authReady } = useIntroVibeAuth();
  const [board, setBoard] = useState(() => getInitialBoard(currentUser?.id));
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(Boolean(currentUser?.sudokuCompleted));
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [storageMode, setStorageMode] = useState("legacy-local");
  const lastRemoteBoardRef = useRef(JSON.stringify(cloneBoard(puzzle)));

  const isIntrovert = currentUser?.personalityType === "Introvert";
  const continueRoute = "/find-matches-conversations";

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    let cancelled = false;

    const hydrateSudokuProgress = async () => {
      setIsLoadingProgress(true);
      setFeedback("");

      if (shouldUseRemoteSudoku(authMode, currentUser?.id)) {
        try {
          const payload = await requestIntroVibeApi("/api/sudoku/progress");
          if (cancelled) return;

          const nextBoard = Array.isArray(payload?.progress?.boardState)
            ? payload.progress.boardState.map((row) => [...row])
            : cloneBoard(puzzle);
          setBoard(nextBoard);
          setCompleted(Boolean(currentUser?.sudokuCompleted || payload?.progress?.status === "completed"));
          lastRemoteBoardRef.current = JSON.stringify(nextBoard);
          setStorageMode("railway-api");
          setIsLoadingProgress(false);
          return;
        } catch (error) {
          if (!shouldFallbackToLegacySudoku(error)) {
            if (!cancelled) {
              setFeedback(error.message || "Unable to load your Sudoku progress right now.");
              setStorageMode("railway-api");
              setIsLoadingProgress(false);
            }
            return;
          }
        }
      }

      if (!cancelled) {
        setBoard(getInitialBoard(currentUser?.id));
        setCompleted(Boolean(currentUser?.sudokuCompleted));
        setStorageMode("legacy-local");
        setIsLoadingProgress(false);
      }
    };

    hydrateSudokuProgress();

    return () => {
      cancelled = true;
    };
  }, [authMode, authReady, currentUser?.id, currentUser?.sudokuCompleted]);

  const boardSnapshot = useMemo(() => JSON.stringify(board), [board]);

  useEffect(() => {
    if (!currentUser?.id || isLoadingProgress) return undefined;

    if (storageMode === "legacy-local") {
      try {
        const raw = localStorage.getItem(SUDOKU_PROGRESS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          SUDOKU_PROGRESS_KEY,
          JSON.stringify({
            ...parsed,
            [currentUser.id]: board,
          })
        );
      } catch (error) {
        console.error("Failed to save Sudoku progress", error);
      }
      return undefined;
    }

    if (storageMode !== "railway-api" || completed || currentUser?.sudokuCompleted) {
      return undefined;
    }

    if (lastRemoteBoardRef.current === boardSnapshot) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        await requestIntroVibeApi("/api/sudoku/progress", {
          method: "PUT",
          body: JSON.stringify({ boardState: board }),
        });
        lastRemoteBoardRef.current = boardSnapshot;
      } catch (error) {
        if (shouldFallbackToLegacySudoku(error)) {
          setStorageMode("legacy-local");
          return;
        }

        setFeedback(error.message || "Unable to save your Sudoku draft right now.");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [board, boardSnapshot, completed, currentUser?.id, currentUser?.sudokuCompleted, isLoadingProgress, storageMode]);

  const filledCells = useMemo(
    () =>
      board.reduce(
        (sum, row) => sum + row.filter((value) => Number.isInteger(value) && value > 0).length,
        0
      ),
    [board]
  );

  const handleChange = (rowIndex, columnIndex, value) => {
    if (puzzle[rowIndex][columnIndex] !== 0) return;

    const sanitized = value.replace(/[^1-9]/g, "").slice(-1);

    setBoard((prev) => {
      const next = cloneBoard(prev);
      next[rowIndex][columnIndex] = sanitized ? Number(sanitized) : 0;
      return next;
    });
    setFeedback("");
  };

  const resetBoard = () => {
    setBoard(cloneBoard(puzzle));
    setFeedback("");
  };

  const checkBoard = async () => {
    let hasEmpty = false;
    let hasWrongCell = false;

    for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < 9; columnIndex += 1) {
        if (board[rowIndex][columnIndex] === 0) {
          hasEmpty = true;
          continue;
        }

        if (board[rowIndex][columnIndex] !== solution[rowIndex][columnIndex]) {
          hasWrongCell = true;
        }
      }
    }

    if (hasWrongCell) {
      setFeedback("A few cells are still off. Keep going, you are close.");
      return;
    }

    if (hasEmpty) {
      setFeedback("Nice progress. Fill the remaining cells to finish the puzzle.");
      return;
    }

    setIsCompleting(true);
    setFeedback("");

    if (storageMode === "railway-api" && lastRemoteBoardRef.current !== boardSnapshot) {
      try {
        await requestIntroVibeApi("/api/sudoku/progress", {
          method: "PUT",
          body: JSON.stringify({ boardState: board }),
        });
        lastRemoteBoardRef.current = boardSnapshot;
      } catch (error) {
        if (!shouldFallbackToLegacySudoku(error)) {
          setIsCompleting(false);
          setFeedback(error.message || "We could not save your Sudoku progress right now.");
          return;
        }

        setStorageMode("legacy-local");
      }
    }

    const updatedUser = await markSudokuComplete();
    setIsCompleting(false);

    if (!updatedUser) {
      setFeedback(authError || "We could not save your Sudoku progress right now.");
      return;
    }

    setCompleted(true);
    setFeedback(
      isIntrovert
        ? "Sudoku complete. Matching and chat are now unlocked."
        : "Sudoku complete. Nice work. You can jump back into matching and chat anytime."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      <Header />
      <NavigationBreadcrumb />
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8">
          <section className="bg-card border border-border rounded-3xl p-5 md:p-8 shadow-gentle-lg">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                  <Icon name="Grid3X3" size={16} color="var(--color-primary)" />
                  <span>{isIntrovert ? "Required Introvert Feature" : "Optional Brain Break"}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                  Sudoku Focus Challenge
                </h1>
                <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                  {isIntrovert
                    ? "Complete this puzzle to unlock matching and chat. It is your calm gateway into IntroVibe."
                    : "Sudoku is optional for you. Play it whenever you want a calm challenge before or after chatting."}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Filled cells</p>
                <p className="text-2xl font-semibold text-foreground">{filledCells} / 81</p>
              </div>
            </div>

            {isLoadingProgress ? (
              <div className="rounded-2xl border border-border bg-background/70 p-6">
                <p className="text-sm text-muted-foreground">Loading your saved Sudoku progress...</p>
              </div>
            ) : (
              <div className="grid grid-cols-9 gap-1 bg-border p-1 rounded-2xl overflow-hidden">
                {board.map((row, rowIndex) =>
                  row.map((value, columnIndex) => {
                    const isFixed = puzzle[rowIndex][columnIndex] !== 0;
                    const isWrong =
                      value !== 0 && value !== solution[rowIndex][columnIndex] && feedback.includes("off");

                    return (
                      <input
                        key={`${rowIndex}-${columnIndex}`}
                        value={value || ""}
                        onChange={(event) => handleChange(rowIndex, columnIndex, event.target.value)}
                        disabled={isFixed || isCompleting}
                        inputMode="numeric"
                        maxLength={1}
                        className={[
                          "aspect-square w-full text-center text-base md:text-lg font-semibold outline-none",
                          "bg-background text-foreground",
                          isFixed ? "bg-muted/60 text-foreground" : "focus:bg-primary/5",
                          isWrong ? "text-error" : "",
                          rowIndex % 3 === 2 && rowIndex !== 8 ? "border-b-2 border-primary/30" : "",
                          columnIndex % 3 === 2 && columnIndex !== 8 ? "border-r-2 border-primary/30" : "",
                        ].join(" ")}
                      />
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button variant="default" iconName="CheckCircle" onClick={checkBoard} loading={isCompleting} disabled={isLoadingProgress}>
                Check puzzle
              </Button>
              <Button variant="outline" iconName="RotateCcw" onClick={resetBoard} disabled={isCompleting || isLoadingProgress}>
                Reset board
              </Button>
              {!isIntrovert && (
                <Button variant="ghost" iconName="ArrowRight" onClick={() => navigate("/personalized-dashboard")}>
                  Skip for now
                </Button>
              )}
            </div>

            {feedback && (
              <div className={`mt-5 rounded-2xl border p-4 ${completed ? "bg-success/10 border-success/25" : feedback.toLowerCase().includes("unable") || feedback.toLowerCase().includes("could not") ? "bg-error/10 border-error/25" : "bg-muted/40 border-border"}`}>
                <p className={completed ? "text-success" : feedback.toLowerCase().includes("unable") || feedback.toLowerCase().includes("could not") ? "text-error" : "text-foreground"}>{feedback}</p>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-gentle">
              <h2 className="text-2xl font-heading font-semibold text-foreground mb-3">
                Why this is here
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                {isIntrovert ? (
                  <>
                    <p>IntroVibe uses Sudoku as a focused checkpoint for introverts before opening the social layer.</p>
                    <p>It gives you one quiet win first, then moves you into matching and chat when you feel settled.</p>
                  </>
                ) : (
                  <>
                    <p>Sudoku is completely optional for ambiverts and extroverts, so your social tools stay open even if you skip it.</p>
                    <p>It is here as a calm side activity whenever you want a quick brain break before returning to your inbox.</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 shadow-gentle">
              <h2 className="text-2xl font-heading font-semibold text-foreground mb-4">
                {isIntrovert ? "What unlocks next" : "What you can do next"}
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Icon name="Users" size={18} color="var(--color-primary)" />
                  <p className="text-sm text-muted-foreground">Personality and interest-based matching</p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="MessageCircle" size={18} color="var(--color-secondary)" />
                  <p className="text-sm text-muted-foreground">
                    {isIntrovert ? "1-on-1 chat access after completion" : "Keep chatting right away, or come back to Sudoku later"}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="HeartPulse" size={18} color="var(--color-accent)" />
                  <p className="text-sm text-muted-foreground">Healthy tips that stay aligned with your personality result</p>
                </div>
              </div>
            </div>

            {(completed || currentUser?.sudokuCompleted || !isIntrovert) && (
              <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 border border-border rounded-3xl p-6 shadow-gentle">
                <h2 className="text-2xl font-heading font-semibold text-foreground mb-3">
                  Ready to continue?
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {isIntrovert
                    ? "Your required puzzle step is finished. Move into matching and chat whenever you are ready."
                    : "You can head back to your matches and chats now, and Sudoku will stay here whenever you want it."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="default" iconName="ArrowRight" onClick={() => navigate(continueRoute)}>
                    Open Matches & Chat
                  </Button>
                  <Button variant="outline" iconName="LayoutDashboard" onClick={() => navigate("/personalized-dashboard")}>
                    Back to dashboard
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default SudokuPuzzle;
