import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/ui/Header";
import NavigationBreadcrumb from "../../components/ui/NavigationBreadcrumb";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import { useIntroVibeAuth } from "../../introVibeAuth";
import {
  PERSONALITY_META,
  buildMatchSummary,
  getHealthyTips,
} from "../../utils/introVibe";

const PersonalizedDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, users, resetAssessment } = useIntroVibeAuth();
  const [isRetakingAssessment, setIsRetakingAssessment] = useState(false);

  const personalityType = currentUser?.personalityType || currentUser?.predictedPersonality || "Ambivert";
  const personalityMeta = PERSONALITY_META[personalityType];
  const healthyTips = getHealthyTips(personalityType);
  const isIntrovert = personalityType === "Introvert";
  const sudokuRequired = isIntrovert && !currentUser?.sudokuCompleted;
  const canOpenChats = !isIntrovert || currentUser?.sudokuCompleted;

  const availableMatches = useMemo(() => {
    return users
      .filter((user) => user.id !== currentUser?.id && user.assessmentCompleted)
      .map((user) => ({ user, match: buildMatchSummary(currentUser, user) }))
      .filter(({ match }) => match.samePersonality && match.sharedInterests.length > 0).length;
  }, [users, currentUser]);

  const handleRetakeAssessment = async () => {
    setIsRetakingAssessment(true);
    const updatedUser = await resetAssessment();
    setIsRetakingAssessment(false);

    if (!updatedUser) {
      return;
    }

    navigate("/adaptive-quiz");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      <Header />
      <NavigationBreadcrumb />
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
        <section className="rounded-[2rem] border border-border bg-card shadow-gentle-lg p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Icon name="Sparkles" size={16} color="var(--color-primary)" />
                <span>IntroVibe Home</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-heading font-semibold text-foreground">
                {currentUser?.username}, your confirmed type is {personalityType}
              </h1>
              <p className="text-muted-foreground mt-4 text-base md:text-lg leading-relaxed max-w-2xl">
                {personalityMeta?.description}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-background/70 p-5 min-w-[280px]">
              <p className="text-sm text-muted-foreground mb-2">Your chat access</p>
              <p className="text-xl font-semibold text-foreground">{personalityMeta?.chatLabel}</p>
              <p className="text-sm text-muted-foreground mt-3">
                Matches available right now: <strong className="text-foreground">{availableMatches}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="rounded-3xl bg-background/70 border border-border p-5">
              <p className="text-sm text-muted-foreground mb-2">Selected interests</p>
              <div className="flex flex-wrap gap-2">
                {(currentUser?.interests || []).map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 rounded-full bg-card border border-border text-sm text-foreground"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-background/70 border border-border p-5">
              <p className="text-sm text-muted-foreground mb-2">Assessment status</p>
              <p className="text-xl font-semibold text-foreground">Complete</p>
              <p className="text-sm text-muted-foreground mt-2">
                You can retake the 5-question personality test anytime.
              </p>
              <Button
                variant="ghost"
                size="sm"
                iconName="ClipboardList"
                className="mt-4"
                onClick={handleRetakeAssessment}
                disabled={isRetakingAssessment}
                loading={isRetakingAssessment}
              >
                Retake test
              </Button>
            </div>

            <div className="rounded-3xl bg-background/70 border border-border p-5">
              <p className="text-sm text-muted-foreground mb-2">Sudoku status</p>
              <p className="text-xl font-semibold text-foreground">
                {isIntrovert
                  ? currentUser?.sudokuCompleted
                    ? "Required step completed"
                    : "Required before chat"
                  : "Optional activity"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isIntrovert
                  ? "Introverts complete Sudoku before matching and chat open."
                  : "Ambiverts and extroverts can play Sudoku anytime without blocking matches or chat."}
              </p>
              <Button
                variant={isIntrovert && !currentUser?.sudokuCompleted ? "default" : "outline"}
                size="sm"
                iconName="Grid3X3"
                className="mt-4"
                onClick={() => navigate("/sudoku-puzzle")}
              >
                {isIntrovert && !currentUser?.sudokuCompleted ? "Open required Sudoku" : "Play Sudoku"}
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 mt-6">
          <section className="rounded-[2rem] border border-border bg-card shadow-gentle p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="HeartPulse" size={18} color="var(--color-primary)" />
              <h2 className="text-2xl font-heading font-semibold text-foreground">
                Healthy Tips for {personalityType}s
              </h2>
            </div>
            <div className="space-y-4">
              {healthyTips.map((tip) => (
                <div key={tip} className="flex items-start gap-3">
                  <Icon name="CheckCircle" size={16} color="var(--color-success)" className="mt-1" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card shadow-gentle p-6 md:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Icon name="Compass" size={18} color="var(--color-accent)" />
              <h2 className="text-2xl font-heading font-semibold text-foreground">
                Your next step
              </h2>
            </div>

            {sudokuRequired ? (
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-lg font-semibold text-foreground">Complete the Sudoku challenge</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  This is your final unlock before IntroVibe opens matching and chat access for you.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button variant="default" iconName="Grid3X3" onClick={() => navigate("/sudoku-puzzle")}>
                    Open Sudoku
                  </Button>
                  <Button
                    variant="outline"
                    iconName="ClipboardList"
                    onClick={handleRetakeAssessment}
                    disabled={isRetakingAssessment}
                    loading={isRetakingAssessment}
                  >
                    Retake personality test
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-5">
                <p className="text-lg font-semibold text-foreground">
                  {isIntrovert ? "Matching and chat are ready" : "Your feed is ready, and Sudoku stays optional"}
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {isIntrovert
                    ? "Explore people who share your personality type and interests, then start the kind of conversation your profile allows."
                    : "You can jump into matching and chat now, or open Sudoku any time when you want a calm side activity."}
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="default"
                    iconName="MessagesSquare"
                    onClick={() => navigate("/find-matches-conversations")}
                    disabled={!canOpenChats}
                  >
                    Open Matches & Chat
                  </Button>
                  {!isIntrovert && (
                    <Button variant="outline" iconName="Grid3X3" onClick={() => navigate("/sudoku-puzzle")}>
                      Play optional Sudoku
                    </Button>
                  )}
                  <Button variant="ghost" iconName="Settings" onClick={() => navigate("/settings")}>
                    Open Settings
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-border bg-background/70 p-5">
              <p className="text-sm font-medium text-foreground mb-2">How matching works</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                IntroVibe combines your confirmed personality type with your selected interests so your feed feels more intentional and less random.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PersonalizedDashboard;
