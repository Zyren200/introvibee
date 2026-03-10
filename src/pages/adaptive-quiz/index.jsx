import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import QuestionCard from './components/QuestionCard';
import RecommendationPanel from './components/RecommendationPanel';
import ProgressIndicator from './components/ProgressIndicator';
import NavigationControls from './components/NavigationControls';
import { quizDifficultyLevels, quizQuestions } from './data/questions';
import { Checkbox } from '../../components/ui/Checkbox';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const QUIZ_PROGRESS_KEY = 'adaptiveQuizProgress';
const ADAPTIVE_QUIZ_EVENTS_KEY = 'isfAdaptiveQuizEvents';
const QUESTIONS_PER_SESSION = 30;
const DEFAULT_DIFFICULTY = 'medium';

const quizCategories = Array.from(new Set(quizQuestions.map((question) => question.category))).sort();
const difficultyMeta = {
  easy: {
    label: 'Easy',
    description: 'Lighter and more accessible prompts',
  },
  medium: {
    label: 'Medium',
    description: 'Balanced depth for steady reflection',
  },
  deep: {
    label: 'Deep',
    description: 'More introspective and challenging prompts',
  },
};

const shuffleArray = (items = []) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const createQuestionSession = ({ categories, difficulty = DEFAULT_DIFFICULTY, previousQuestionIds = [] }) => {
  const pool = quizQuestions.filter(
    (question) => categories.includes(question.category) && question.difficulty === difficulty
  );
  const count = Math.min(QUESTIONS_PER_SESSION, pool.length);
  if (count === 0) return [];

  let nextSession = shuffleArray(pool).slice(0, count);
  const previousSignature = previousQuestionIds.join('|');
  let attempts = 0;

  while (
    attempts < 5 &&
    previousQuestionIds.length === count &&
    nextSession.map((question) => question.id).join('|') === previousSignature
  ) {
    nextSession = shuffleArray(pool).slice(0, count);
    attempts += 1;
  }

  return nextSession;
};

const appendAdaptiveQuizEvent = (userId, description) => {
  if (!userId || !description) return;
  try {
    const raw = localStorage.getItem(ADAPTIVE_QUIZ_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const userEvents = Array.isArray(parsed?.[userId]) ? parsed[userId] : [];
    const event = {
      id: crypto.randomUUID(),
      description,
      timestamp: Date.now(),
    };
    const updated = {
      ...parsed,
      [userId]: [event, ...userEvents].slice(0, 100),
    };
    localStorage.setItem(ADAPTIVE_QUIZ_EVENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('isf-activity-updated'));
  } catch (error) {
    console.error('Failed to append adaptive quiz activity event', error);
  }
};

const AdaptiveQuiz = () => {
  const { currentUser } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState(quizCategories);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const autoAdvanceTimerRef = useRef(null);

  const currentQuestion = sessionQuestions[currentQuestionIndex];
  const totalQuestions = sessionQuestions.length;

  const answeredCount = useMemo(() => {
    const sessionQuestionIds = new Set(sessionQuestions.map((question) => question.id));
    return Object.keys(answers).filter((questionId) => sessionQuestionIds.has(questionId)).length;
  }, [answers, sessionQuestions]);

  const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const availableQuestionCount = useMemo(
    () =>
      quizQuestions.filter(
        (question) =>
          selectedCategories.includes(question.category) &&
          question.difficulty === selectedDifficulty
      ).length,
    [selectedCategories, selectedDifficulty]
  );

  const clearAutoAdvanceTimer = () => {
    if (!autoAdvanceTimerRef.current) return;
    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  };

  useEffect(() => () => clearAutoAdvanceTimer(), []);

  useEffect(() => {
    const savedProgress = localStorage.getItem(QUIZ_PROGRESS_KEY);
    if (!savedProgress) return;

    try {
      const parsed = JSON.parse(savedProgress);
      const parsedAnswers =
        parsed?.savedAnswers && typeof parsed.savedAnswers === 'object' ? parsed.savedAnswers : {};
      const parsedIndex = Number.isFinite(parsed?.savedIndex) ? parsed.savedIndex : 0;
      const parsedCategories = Array.isArray(parsed?.selectedCategories)
        ? parsed.selectedCategories.filter((category) => quizCategories.includes(category))
        : quizCategories;
      const parsedDifficulty = quizDifficultyLevels.includes(parsed?.selectedDifficulty)
        ? parsed.selectedDifficulty
        : DEFAULT_DIFFICULTY;

      const questionById = new Map(quizQuestions.map((question) => [question.id, question]));
      const parsedQuestionIds = Array.isArray(parsed?.questionIds) ? parsed.questionIds : [];
      const restoredQuestions = parsedQuestionIds
        .map((questionId) => questionById.get(questionId))
        .filter(Boolean);

      const fallbackQuestions =
        restoredQuestions.length > 0
          ? restoredQuestions
          : createQuestionSession({
              categories: parsedCategories.length ? parsedCategories : quizCategories,
              difficulty: parsedDifficulty,
            });

      if (!fallbackQuestions.length) return;

      setSelectedCategories(parsedCategories.length ? parsedCategories : quizCategories);
      setSelectedDifficulty(parsedDifficulty);
      setSessionQuestions(fallbackQuestions);
      setAnswers(parsedAnswers);
      setCurrentQuestionIndex(Math.min(parsedIndex, Math.max(0, fallbackQuestions.length - 1)));
      setHasStarted(true);
    } catch (error) {
      console.error('Failed to load adaptive quiz progress', error);
    }
  }, []);

  useEffect(() => {
    if (!hasStarted || quizCompleted || totalQuestions === 0) return;

    localStorage.setItem(
      QUIZ_PROGRESS_KEY,
      JSON.stringify({
        savedAnswers: answers,
        savedIndex: currentQuestionIndex,
        selectedCategories,
        selectedDifficulty,
        questionIds: sessionQuestions.map((question) => question.id),
      })
    );
  }, [
    hasStarted,
    quizCompleted,
    answers,
    currentQuestionIndex,
    selectedCategories,
    selectedDifficulty,
    sessionQuestions,
    totalQuestions,
  ]);

  const finalizeQuiz = () => {
    clearAutoAdvanceTimer();
    setShowRecommendation(false);
    setQuizCompleted(true);
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
    appendAdaptiveQuizEvent(
      currentUser?.id,
      `Completed adaptive quiz (${totalQuestions} ${difficultyMeta[selectedDifficulty]?.label?.toLowerCase()} questions)`
    );
  };

  const handleStartQuiz = () => {
    if (selectedCategories.length === 0) {
      setCategoryError('Please select at least one category to begin.');
      return;
    }

    const nextSession = createQuestionSession({
      categories: selectedCategories,
      difficulty: selectedDifficulty,
    });
    if (nextSession.length === 0) {
      setCategoryError('No questions available for the selected categories and difficulty.');
      return;
    }

    setCategoryError('');
    clearAutoAdvanceTimer();
    setSessionQuestions(nextSession);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowRecommendation(false);
    setIsPaused(false);
    setQuizCompleted(false);
    setHasStarted(true);
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
    appendAdaptiveQuizEvent(
      currentUser?.id,
      `Started adaptive quiz (${difficultyMeta[selectedDifficulty]?.label} difficulty)`
    );
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
    setShowRecommendation(true);

    clearAutoAdvanceTimer();
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setShowRecommendation(false);
      } else {
        finalizeQuiz();
      }
      autoAdvanceTimerRef.current = null;
    }, 3000);
  };

  const handleNext = () => {
    clearAutoAdvanceTimer();
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowRecommendation(false);
    } else {
      finalizeQuiz();
    }
  };

  const handlePrevious = () => {
    clearAutoAdvanceTimer();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setShowRecommendation(false);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handlePause = () => {
    clearAutoAdvanceTimer();
    setIsPaused(true);
    appendAdaptiveQuizEvent(currentUser?.id, 'Paused adaptive quiz');
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleRestart = () => {
    clearAutoAdvanceTimer();
    const previousQuestionIds = sessionQuestions.map((question) => question.id);
    const nextSession = createQuestionSession({
      categories: selectedCategories,
      difficulty: selectedDifficulty,
      previousQuestionIds,
    });

    if (!nextSession.length) {
      setHasStarted(false);
      setCategoryError('Please choose categories and difficulty with available questions.');
      localStorage.removeItem(QUIZ_PROGRESS_KEY);
      return;
    }

    setSessionQuestions(nextSession);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowRecommendation(false);
    setQuizCompleted(false);
    setIsPaused(false);
    setHasStarted(true);
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
    appendAdaptiveQuizEvent(
      currentUser?.id,
      `Retook adaptive quiz (${difficultyMeta[selectedDifficulty]?.label} difficulty)`
    );
  };

  const handleChooseCategories = () => {
    clearAutoAdvanceTimer();
    setHasStarted(false);
    setQuizCompleted(false);
    setIsPaused(false);
    setShowRecommendation(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSessionQuestions([]);
    setCategoryError('');
    localStorage.removeItem(QUIZ_PROGRESS_KEY);
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((entry) => entry !== category) : [...prev, category]
    );
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-xl p-6 md:p-8 border border-border shadow-gentle">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="ListChecks" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground">
                  Choose Quiz Categories
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick categories and a difficulty. Each attempt gives you a fresh randomized set.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Button variant="outline" size="sm" onClick={() => setSelectedCategories(quizCategories)}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])}>
                Clear all
              </Button>
              <span className="caption text-muted-foreground">
                {availableQuestionCount} {difficultyMeta[selectedDifficulty]?.label?.toLowerCase()} questions available, {Math.min(QUESTIONS_PER_SESSION, availableQuestionCount)} will be used this run
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quizCategories.map((category) => (
                <div key={category} className="p-3 rounded-lg border border-border bg-background/50">
                  <Checkbox
                    label={category}
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <h2 className="font-body font-medium text-foreground mb-3">
                Select Difficulty
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {quizDifficultyLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedDifficulty(level)}
                    className={`
                      p-3 rounded-lg border text-left transition-gentle
                      ${selectedDifficulty === level
                        ? 'border-primary bg-primary/5 shadow-gentle-sm'
                        : 'border-border bg-background/50 hover:border-primary/40 hover:bg-muted'
                      }
                    `}
                  >
                    <p className="font-body font-medium text-foreground">
                      {difficultyMeta[level]?.label || level}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {difficultyMeta[level]?.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {categoryError && (
              <p className="mt-4 text-sm text-error">{categoryError}</p>
            )}

            <div className="mt-6">
              <Button variant="default" iconName="Play" iconPosition="right" onClick={handleStartQuiz}>
                Start Adaptive Quiz
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="CheckCircle" size={40} color="var(--color-success)" />
            </div>
            <h1 className="font-heading text-3xl font-semibold text-foreground mb-4">
              Quiz Complete
            </h1>
            <p className="text-muted-foreground font-body text-lg mb-8 leading-relaxed">
              You completed {totalQuestions} {difficultyMeta[selectedDifficulty]?.label?.toLowerCase()} questions
              from your selected categories. Retake to get a new randomized set.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:shadow-gentle-md transition-gentle font-body font-medium"
              >
                Retake with new questions
              </button>
              <button
                onClick={handleChooseCategories}
                className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-gentle font-body font-medium"
              >
                Change categories and difficulty
              </button>
              <button
                onClick={() => window.location.href = '/personalized-dashboard'}
                className="px-6 py-3 rounded-lg bg-secondary text-secondary-foreground hover:shadow-gentle-md transition-gentle font-body font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="Pause" size={32} color="var(--color-accent)" />
            </div>
            <h2 className="font-heading text-2xl font-semibold text-foreground mb-4">
              Quiz Paused
            </h2>
            <p className="text-muted-foreground font-body mb-2">
              You have answered {answeredCount} of {totalQuestions} questions
            </p>
            <p className="text-muted-foreground font-body text-sm mb-8">
              Your current progress, selected categories, and difficulty are saved.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleResume}
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:shadow-gentle-md transition-gentle font-body font-medium"
              >
                Resume Quiz
              </button>
              <button
                onClick={handleChooseCategories}
                className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-gentle font-body font-medium"
              >
                Change categories and difficulty
              </button>
              <button
                onClick={() => window.location.href = '/personalized-dashboard'}
                className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-gentle font-body font-medium"
              >
                Save and Exit
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <h2 className="font-heading text-2xl font-semibold text-foreground mb-4">
              No questions available
            </h2>
            <p className="text-muted-foreground mb-6">
              Please choose at least one category and a difficulty with available questions.
            </p>
            <Button variant="default" onClick={handleChooseCategories}>
              Choose categories
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-semibold text-foreground mb-3">
            Adaptive Quiz
          </h1>
          <p className="text-muted-foreground font-body leading-relaxed">
            Take your time with these questions. There are no wrong answers, just honest reflections.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Difficulty: {difficultyMeta[selectedDifficulty]?.label || selectedDifficulty}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              Categories: {selectedCategories.length}
            </span>
          </div>
        </div>

        <ProgressIndicator
          current={answeredCount}
          total={totalQuestions}
          percentage={progressPercentage}
        />

        <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          selectedAnswer={answers?.[currentQuestion?.id]}
          onAnswer={handleAnswer}
        />

        {showRecommendation && answers?.[currentQuestion?.id] && (
          <RecommendationPanel
            question={currentQuestion}
            answer={answers?.[currentQuestion?.id]}
          />
        )}

        <NavigationControls
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSkip={handleSkip}
          onPause={handlePause}
          canGoPrevious={currentQuestionIndex > 0}
          canGoNext={!!answers?.[currentQuestion?.id]}
          isLastQuestion={currentQuestionIndex === totalQuestions - 1}
        />
      </main>
    </div>
  );
};

export default AdaptiveQuiz;
