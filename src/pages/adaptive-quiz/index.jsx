import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/ui/Header";
import NavigationBreadcrumb from "../../components/ui/NavigationBreadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import { personalityQuestions } from "./data/questions";
import { useIntroVibeAuth } from "../../introVibeAuth";
import {
  PERSONALITY_META,
  getHealthyTips,
  getPostAuthRoute,
  resolvePersonalityFromAnswers,
} from "../../utils/introVibe";

const getEmptyAnswers = () =>
  personalityQuestions.reduce((accumulator, question) => {
    accumulator[question.id] = "";
    return accumulator;
  }, {});

const AdaptiveQuiz = () => {
  const navigate = useNavigate();
  const { currentUser, completeAssessment, resetAssessment, error: authError } = useIntroVibeAuth();
  const [answers, setAnswers] = useState(() => {
    const savedAnswers = Array.isArray(currentUser?.assessmentAnswers) ? currentUser.assessmentAnswers : [];
    return personalityQuestions.reduce((accumulator, question, index) => {
      accumulator[question.id] = savedAnswers[index] || "";
      return accumulator;
    }, {});
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [resultType, setResultType] = useState(currentUser?.personalityType || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const currentQuestion = personalityQuestions[currentStep];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPercentage = (answeredCount / personalityQuestions.length) * 100;

  const activePersonality = resultType || currentUser?.personalityType;
  const resultMeta = activePersonality ? PERSONALITY_META[activePersonality] : null;
  const healthyTips = activePersonality ? getHealthyTips(activePersonality) : [];

  const answerArray = useMemo(
    () => personalityQuestions.map((question) => answers[question.id]).filter(Boolean),
    [answers]
  );

  const resetQuizState = () => {
    setAnswers(getEmptyAnswers());
    setCurrentStep(0);
    setResultType(null);
    setSubmitError("");
  };

  const handleChooseAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setSubmitError("");
  };

  const handleNext = async () => {
    if (currentStep < personalityQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    const resolvedPersonality = resolvePersonalityFromAnswers(
      answerArray,
      currentUser?.predictedPersonality
    );

    setIsSubmitting(true);
    setSubmitError("");
    const updatedUser = await completeAssessment({
      personalityType: resolvedPersonality,
      answers: personalityQuestions.map((question) => answers[question.id]),
    });
    setIsSubmitting(false);

    if (!updatedUser) {
      setSubmitError(authError || "We could not save your assessment right now.");
      return;
    }

    setResultType(updatedUser?.personalityType || resolvedPersonality);
  };

  const handleRetake = async () => {
    setSubmitError("");
    setIsRetaking(true);
    const updatedUser = await resetAssessment();
    setIsRetaking(false);

    if (!updatedUser) {
      setSubmitError(authError || "We could not reset your assessment right now.");
      return;
    }

    resetQuizState();
  };

  if (resultMeta) {
    const nextRoute = getPostAuthRoute({
      ...currentUser,
      personalityType: activePersonality,
      assessmentCompleted: true,
      sudokuCompleted: activePersonality === "Introvert" ? currentUser?.sudokuCompleted : true,
    });

    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
        <Header />
        <NavigationBreadcrumb />
        <main className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <section className="bg-card rounded-3xl border border-border p-6 md:p-8 shadow-gentle-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
              <Icon name="CheckCircle" size={16} color="var(--color-success)" />
              <span>Personality identified</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
              You are an {activePersonality}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              {resultMeta.description}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 mt-8">
              <div className="rounded-3xl border border-border bg-background/80 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="HeartPulse" size={18} color="var(--color-primary)" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">
                    Healthy Tips
                  </h2>
                </div>
                <div className="space-y-3">
                  {healthyTips.map((tip) => (
                    <div key={tip} className="flex items-start gap-3">
                      <Icon name="Sparkles" size={16} color="var(--color-primary)" className="mt-1" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Icon name="MessagesSquare" size={18} color="var(--color-accent)" />
                  <h2 className="text-2xl font-heading font-semibold text-foreground">
                    Chat Access
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {resultMeta.chatLabel}
                </p>
                <div className="mt-5 rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Matching basis</p>
                  <p className="text-sm text-muted-foreground">
                    IntroVibe will match you using your personality type plus your selected interests.
                  </p>
                </div>

                {activePersonality === "Introvert" && (
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Sudoku requirement</p>
                    <p className="text-sm text-muted-foreground">
                      Complete the Sudoku puzzle next to unlock matching and chat.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                iconName="ArrowRight"
                onClick={() => navigate(nextRoute)}
                disabled={isRetaking}
              >
                {activePersonality === "Introvert" ? "Continue to Sudoku" : "Continue to IntroVibe"}
              </Button>
              <Button
                variant="outline"
                iconName="RotateCcw"
                onClick={handleRetake}
                disabled={isRetaking}
                loading={isRetaking}
              >
                Retake test
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      <Header />
      <NavigationBreadcrumb />
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <section className="bg-card rounded-3xl border border-border p-6 md:p-8 shadow-gentle-lg">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                <Icon name="ClipboardList" size={16} color="var(--color-primary)" />
                <span>5-question personality test</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                Confirm your vibe
              </h1>
              <p className="text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                Answer five quick questions. Your result will confirm whether you are introvert,
                ambivert, or extrovert, then unlock your Healthy Tips and social flow.
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              Question {currentStep + 1} of {personalityQuestions.length}
            </div>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="rounded-3xl border border-border bg-background/70 p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon name={currentQuestion.icon} size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-semibold text-foreground">
                  {currentQuestion.prompt}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Pick the answer that feels most natural to you.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChooseAnswer(currentQuestion.id, option.value)}
                    className={[
                      "w-full text-left rounded-2xl border p-4 transition-gentle",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-gentle"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={[
                          "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        ].join(" ")}
                      >
                        {option.label}
                      </div>
                      <div className="pt-2">
                        <p className="text-foreground leading-relaxed">{option.text}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {submitError && (
            <div className="mt-6 rounded-2xl border border-error/25 bg-error/10 p-4">
              <p className="text-sm text-error">{submitError}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between">
            <Button
              variant="outline"
              iconName="ArrowLeft"
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0 || isSubmitting}
            >
              Previous
            </Button>
            <Button
              variant="default"
              iconName={currentStep === personalityQuestions.length - 1 ? "CheckCircle" : "ArrowRight"}
              iconPosition="right"
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || isSubmitting}
              loading={isSubmitting}
            >
              {currentStep === personalityQuestions.length - 1 ? "See my result" : "Next question"}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdaptiveQuiz;
