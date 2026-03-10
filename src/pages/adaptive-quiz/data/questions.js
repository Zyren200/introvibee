const getQuestionOrder = (id) => Number((id || '').toString().replace(/[^0-9]/g, '')) || 0;

const determineDifficulty = (index, total) => {
  if (total <= 1) return 'medium';
  if (total === 2) return index === 0 ? 'easy' : 'deep';

  const ratio = index / (total - 1);
  if (ratio <= 0.33) return 'easy';
  if (ratio <= 0.66) return 'medium';
  return 'deep';
};

const assignQuestionDifficulties = (questions = []) => {
  const groupedByCategory = questions.reduce((acc, question) => {
    const key = question?.category || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(question);
    return acc;
  }, {});

  const difficultyById = {};

  Object.values(groupedByCategory).forEach((categoryQuestions) => {
    const sorted = [...categoryQuestions].sort(
      (a, b) => getQuestionOrder(a?.id) - getQuestionOrder(b?.id)
    );

    sorted.forEach((question, index) => {
      difficultyById[question.id] = determineDifficulty(index, sorted.length);
    });
  });

  return questions.map((question) => ({
    ...question,
    difficulty: difficultyById[question.id] || 'medium',
  }));
};

const baseQuizQuestions = [
  {
    id: 'q1',
    category: 'Communication',
    icon: 'MessageCircle',
    text: 'How do you typically feel about starting conversations with new people?',
    options: [
      { value: 'very_comfortable', label: 'Very comfortable—I enjoy meeting new people' },
      { value: 'somewhat_comfortable', label: 'Somewhat comfortable with the right setting' },
      { value: 'neutral', label: 'Neutral—depends on the situation' },
      { value: 'somewhat_uncomfortable', label: 'Somewhat uncomfortable—I prefer familiar faces' },
      { value: 'very_uncomfortable', label: 'Very uncomfortable—I find it quite challenging' }
    ]
  },
  {
    id: 'q2',
    category: 'Social Energy',
    icon: 'Battery',
    text: 'After a day of social interaction, how do you prefer to recharge?',
    options: [
      { value: 'alone_time', label: 'Quiet alone time with minimal stimulation' },
      { value: 'small_group', label: 'Small gathering with close friends' },
      { value: 'creative_activity', label: 'Creative or solo activities (reading, art, music)' },
      { value: 'nature', label: 'Time in nature or peaceful environments' },
      { value: 'flexible', label: 'I\'m flexible—depends on my mood' }
    ]
  },
  {
    id: 'q3',
    category: 'Learning Style',
    icon: 'BookOpen',
    text: 'Which learning environment helps you focus best?',
    options: [
      { value: 'quiet_solo', label: 'Quiet space, working independently' },
      { value: 'small_collaborative', label: 'Small collaborative groups (2-3 people)' },
      { value: 'structured_class', label: 'Structured classroom with clear guidelines' },
      { value: 'online_self_paced', label: 'Online, self-paced learning' },
      { value: 'mixed', label: 'Mix of solo and group work' }
    ]
  },
  {
    id: 'q4',
    category: 'Emotional Expression',
    icon: 'Heart',
    text: 'How comfortable are you sharing your feelings with others?',
    options: [
      { value: 'very_open', label: 'Very open—I share easily with most people' },
      { value: 'selective', label: 'Selective—only with trusted friends' },
      { value: 'written', label: 'More comfortable in writing than speaking' },
      { value: 'reserved', label: 'Reserved—I keep feelings mostly private' },
      { value: 'depends', label: 'Depends on the topic and person' }
    ]
  },
  {
    id: 'q5',
    category: 'Group Dynamics',
    icon: 'Users',
    text: 'In group settings, what role do you naturally take?',
    options: [
      { value: 'observer', label: 'Observer—I listen and process before contributing' },
      { value: 'supporter', label: 'Supporter—I encourage others and help behind the scenes' },
      { value: 'contributor', label: 'Contributor—I share ideas when I have something valuable' },
      { value: 'facilitator', label: 'Facilitator—I help organize and coordinate' },
      { value: 'varies', label: 'Varies depending on my comfort level' }
    ]
  },
  {
    id: 'q6',
    category: 'Communication',
    icon: 'MessageSquare',
    text: 'Which communication method feels most natural to you?',
    options: [
      { value: 'text_messaging', label: 'Text messaging—I can think before responding' },
      { value: 'one_on_one', label: 'One-on-one conversations in person' },
      { value: 'video_calls', label: 'Video calls with people I know well' },
      { value: 'written_long', label: 'Written messages (emails, letters)' },
      { value: 'depends_context', label: 'Depends on the context and relationship' }
    ]
  },
  {
    id: 'q7',
    category: 'Stress Response',
    icon: 'AlertCircle',
    text: 'When feeling overwhelmed, what helps you most?',
    options: [
      { value: 'solitude', label: 'Complete solitude and quiet' },
      { value: 'trusted_person', label: 'Talking to one trusted person' },
      { value: 'physical_activity', label: 'Physical activity or movement' },
      { value: 'creative_outlet', label: 'Creative expression (writing, art, music)' },
      { value: 'structured_routine', label: 'Following a structured routine' }
    ]
  },
  {
    id: 'q8',
    category: 'Social Preferences',
    icon: 'Coffee',
    text: 'What size gathering feels most comfortable for you?',
    options: [
      { value: 'one_on_one', label: 'One-on-one interactions' },
      { value: 'small_2_4', label: 'Small groups (2-4 people)' },
      { value: 'medium_5_10', label: 'Medium groups (5-10 people)' },
      { value: 'large_comfortable', label: 'Large groups—I enjoy the energy' },
      { value: 'avoid_gatherings', label: 'I generally prefer to avoid gatherings' }
    ]
  },
  {
    id: 'q9',
    category: 'Decision Making',
    icon: 'GitBranch',
    text: 'How do you prefer to make important decisions?',
    options: [
      { value: 'alone_reflection', label: 'Alone with time for deep reflection' },
      { value: 'trusted_input', label: 'After discussing with trusted advisors' },
      { value: 'research_analysis', label: 'Through research and careful analysis' },
      { value: 'intuition', label: 'Following my intuition and gut feelings' },
      { value: 'structured_process', label: 'Using a structured decision-making process' }
    ]
  },
  {
    id: 'q10',
    category: 'Emotional Awareness',
    icon: 'Brain',
    text: 'How aware are you of your emotional states throughout the day?',
    options: [
      { value: 'very_aware', label: 'Very aware—I notice subtle shifts' },
      { value: 'moderately_aware', label: 'Moderately aware—I check in occasionally' },
      { value: 'aware_intense', label: 'Aware mainly when emotions are intense' },
      { value: 'learning', label: 'Learning to be more aware' },
      { value: 'not_priority', label: 'Not a priority for me currently' }
    ]
  },
  {
    id: 'q11',
    category: 'Conflict Style',
    icon: 'Shield',
    text: 'How do you typically handle disagreements or conflicts?',
    options: [
      { value: 'avoid', label: 'Avoid them when possible' },
      { value: 'time_process', label: 'Need time to process before addressing' },
      { value: 'direct_calm', label: 'Address directly but calmly' },
      { value: 'written_first', label: 'Prefer to communicate in writing first' },
      { value: 'mediator', label: 'Seek a mediator or neutral third party' }
    ]
  },
  {
    id: 'q12',
    category: 'Creativity',
    icon: 'Palette',
    text: 'When do you feel most creative or inspired?',
    options: [
      { value: 'solitude', label: 'In solitude with minimal distractions' },
      { value: 'nature', label: 'In nature or peaceful environments' },
      { value: 'night_quiet', label: 'Late at night when everything is quiet' },
      { value: 'after_social', label: 'After meaningful social interactions' },
      { value: 'structured_time', label: 'During dedicated creative time blocks' }
    ]
  },
  {
    id: 'q13',
    category: 'Boundaries',
    icon: 'Lock',
    text: 'How comfortable are you setting boundaries with others?',
    options: [
      { value: 'very_comfortable', label: 'Very comfortable—I communicate needs clearly' },
      { value: 'working_on_it', label: 'Working on it—getting better over time' },
      { value: 'situational', label: 'Depends on the relationship' },
      { value: 'challenging', label: 'Challenging—I worry about disappointing others' },
      { value: 'very_difficult', label: 'Very difficult—I often overextend myself' }
    ]
  },
  {
    id: 'q14',
    category: 'Processing Style',
    icon: 'Cpu',
    text: 'How do you process new information or experiences?',
    options: [
      { value: 'internal_reflection', label: 'Internal reflection before discussing' },
      { value: 'talk_through', label: 'Talk through with others immediately' },
      { value: 'write_journal', label: 'Write or journal about it' },
      { value: 'research_more', label: 'Research and gather more information' },
      { value: 'sleep_on_it', label: 'Sleep on it and revisit later' }
    ]
  },
  {
    id: 'q15',
    category: 'Social Energy',
    icon: 'Zap',
    text: 'What drains your energy most quickly?',
    options: [
      { value: 'large_crowds', label: 'Large crowds or noisy environments' },
      { value: 'small_talk', label: 'Extended small talk or surface conversations' },
      { value: 'conflict', label: 'Conflict or tense situations' },
      { value: 'multitasking', label: 'Multitasking or constant interruptions' },
      { value: 'performance', label: 'Being "on" or performing for others' }
    ]
  },
  {
    id: 'q16',
    category: 'Connection',
    icon: 'Link',
    text: 'What helps you feel most connected to others?',
    options: [
      { value: 'deep_conversations', label: 'Deep, meaningful conversations' },
      { value: 'shared_activities', label: 'Shared activities or interests' },
      { value: 'quality_time', label: 'Quality time without pressure to talk' },
      { value: 'written_exchange', label: 'Written exchanges (letters, messages)' },
      { value: 'acts_of_service', label: 'Acts of service or practical support' }
    ]
  },
  {
    id: 'q17',
    category: 'Self-Care',
    icon: 'Sparkles',
    text: 'Which self-care activity appeals to you most?',
    options: [
      { value: 'reading', label: 'Reading or listening to audiobooks' },
      { value: 'nature_walks', label: 'Nature walks or outdoor time' },
      { value: 'creative_hobbies', label: 'Creative hobbies (art, music, crafts)' },
      { value: 'meditation', label: 'Meditation or mindfulness practices' },
      { value: 'learning', label: 'Learning something new independently' }
    ]
  },
  {
    id: 'q18',
    category: 'Feedback',
    icon: 'MessageCircle',
    text: 'How do you prefer to receive feedback or constructive criticism?',
    options: [
      { value: 'written_detailed', label: 'Written with detailed explanations' },
      { value: 'one_on_one_private', label: 'One-on-one in a private setting' },
      { value: 'time_to_prepare', label: 'With advance notice so I can prepare' },
      { value: 'sandwich_method', label: 'Balanced with positive observations' },
      { value: 'direct_brief', label: 'Direct and brief—just the key points' }
    ]
  },
  {
    id: 'q19',
    category: 'Motivation',
    icon: 'Target',
    text: 'What motivates you most in your studies or work?',
    options: [
      { value: 'personal_growth', label: 'Personal growth and mastery' },
      { value: 'meaningful_impact', label: 'Making a meaningful impact' },
      { value: 'autonomy', label: 'Autonomy and independence' },
      { value: 'deep_understanding', label: 'Deep understanding of subjects' },
      { value: 'helping_others', label: 'Helping or supporting others' }
    ]
  },
  {
    id: 'q20',
    category: 'Comfort Zone',
    icon: 'Home',
    text: 'How do you feel about stepping outside your comfort zone?',
    options: [
      { value: 'gradual_steps', label: 'Prefer gradual, small steps' },
      { value: 'with_support', label: 'Willing with trusted support' },
      { value: 'prepared_research', label: 'Comfortable when well-prepared' },
      { value: 'challenging_growth', label: 'Challenging but necessary for growth' },
      { value: 'avoid_when_possible', label: 'Prefer to avoid when possible' }
    ]
  },
  {
    id: 'q21',
    category: 'Time Management',
    icon: 'Clock',
    text: 'How do you prefer to structure your day?',
    options: [
      { value: 'detailed_schedule', label: 'Detailed schedule with specific time blocks' },
      { value: 'flexible_framework', label: 'Flexible framework with key priorities' },
      { value: 'flow_state', label: 'Follow my energy and flow state' },
      { value: 'routine_consistency', label: 'Consistent routine with minimal variation' },
      { value: 'spontaneous', label: 'Spontaneous—I decide as I go' }
    ]
  },
  {
    id: 'q22',
    category: 'Collaboration',
    icon: 'Users',
    text: 'In collaborative projects, what role suits you best?',
    options: [
      { value: 'researcher', label: 'Researcher—gathering and analyzing information' },
      { value: 'writer_creator', label: 'Writer/Creator—producing content independently' },
      { value: 'organizer', label: 'Organizer—coordinating tasks and timelines' },
      { value: 'quality_checker', label: 'Quality checker—reviewing and refining' },
      { value: 'idea_generator', label: 'Idea generator—brainstorming concepts' }
    ]
  },
  {
    id: 'q23',
    category: 'Sensory Preferences',
    icon: 'Volume2',
    text: 'What sensory environment helps you concentrate best?',
    options: [
      { value: 'complete_silence', label: 'Complete silence' },
      { value: 'white_noise', label: 'White noise or ambient sounds' },
      { value: 'instrumental_music', label: 'Instrumental music' },
      { value: 'nature_sounds', label: 'Nature sounds' },
      { value: 'varies', label: 'Varies by task and mood' }
    ]
  },
  {
    id: 'q24',
    category: 'Emotional Support',
    icon: 'Heart',
    text: 'When you need emotional support, what helps most?',
    options: [
      { value: 'listening_ear', label: 'Someone to listen without advice' },
      { value: 'practical_help', label: 'Practical help with tasks' },
      { value: 'space_alone', label: 'Space to process alone first' },
      { value: 'gentle_presence', label: 'Gentle presence without pressure to talk' },
      { value: 'validation', label: 'Validation of my feelings' }
    ]
  },
  {
    id: 'q25',
    category: 'Change Adaptation',
    icon: 'RefreshCw',
    text: 'How do you typically respond to unexpected changes?',
    options: [
      { value: 'need_time', label: 'Need time to adjust and process' },
      { value: 'plan_contingencies', label: 'Create backup plans and contingencies' },
      { value: 'seek_information', label: 'Seek information to understand the change' },
      { value: 'talk_through', label: 'Talk through concerns with trusted people' },
      { value: 'adapt_quickly', label: 'Adapt relatively quickly' }
    ]
  },
  {
    id: 'q26',
    category: 'Recognition',
    icon: 'Award',
    text: 'How do you prefer to be recognized for your achievements?',
    options: [
      { value: 'private_acknowledgment', label: 'Private acknowledgment' },
      { value: 'written_note', label: 'Written note or message' },
      { value: 'small_group', label: 'Recognition in a small, trusted group' },
      { value: 'tangible_reward', label: 'Tangible reward or opportunity' },
      { value: 'no_recognition', label: 'Prefer no public recognition' }
    ]
  },
  {
    id: 'q27',
    category: 'Problem Solving',
    icon: 'Lightbulb',
    text: 'What\'s your natural approach to solving problems?',
    options: [
      { value: 'analytical', label: 'Analytical—break down into logical steps' },
      { value: 'intuitive', label: 'Intuitive—trust my instincts' },
      { value: 'research', label: 'Research—gather information first' },
      { value: 'collaborative', label: 'Collaborative—discuss with others' },
      { value: 'trial_error', label: 'Trial and error—learn by doing' }
    ]
  },
  {
    id: 'q28',
    category: 'Values',
    icon: 'Compass',
    text: 'Which value resonates most strongly with you?',
    options: [
      { value: 'authenticity', label: 'Authenticity—being true to myself' },
      { value: 'growth', label: 'Growth—continuous learning and development' },
      { value: 'connection', label: 'Connection—meaningful relationships' },
      { value: 'peace', label: 'Peace—inner calm and balance' },
      { value: 'contribution', label: 'Contribution—making a positive difference' }
    ]
  },
  {
    id: 'q29',
    category: 'Future Planning',
    icon: 'Calendar',
    text: 'How do you approach planning for the future?',
    options: [
      { value: 'detailed_goals', label: 'Detailed goals with specific milestones' },
      { value: 'general_direction', label: 'General direction with flexibility' },
      { value: 'values_based', label: 'Values-based—align with what matters most' },
      { value: 'short_term', label: 'Short-term focus—one step at a time' },
      { value: 'intuitive_flow', label: 'Intuitive—trust the path will unfold' }
    ]
  },
  {
    id: 'q30',
    category: 'Reflection',
    icon: 'BookOpen',
    text: 'How often do you engage in self-reflection?',
    options: [
      { value: 'daily', label: 'Daily—it\'s part of my routine' },
      { value: 'weekly', label: 'Weekly—I set aside dedicated time' },
      { value: 'as_needed', label: 'As needed—when facing challenges' },
      { value: 'occasionally', label: 'Occasionally—a few times a month' },
      { value: 'rarely', label: 'Rarely—I prefer to stay action-focused' }
    ]
  },
  {
    id: 'q31',
    category: 'Communication',
    icon: 'Mic',
    text: 'When sharing ideas in class, what usually helps you speak up?',
    options: [
      { value: 'prepare_notes', label: 'Preparing notes before class' },
      { value: 'small_group_first', label: 'Discussing first in a small group' },
      { value: 'asked_directly', label: 'When I am asked directly' },
      { value: 'chat_box', label: 'Using chat or written responses' },
      { value: 'still_difficult', label: 'It is still difficult most of the time' }
    ]
  },
  {
    id: 'q32',
    category: 'Learning Style',
    icon: 'NotebookPen',
    text: 'How do you remember lessons most effectively?',
    options: [
      { value: 'rewrite_notes', label: 'Rewriting notes in my own words' },
      { value: 'teach_someone', label: 'Explaining concepts to someone else' },
      { value: 'practice_problems', label: 'Doing practice questions' },
      { value: 'visual_maps', label: 'Using mind maps and diagrams' },
      { value: 'audio_review', label: 'Listening to recordings or summaries' }
    ]
  },
  {
    id: 'q33',
    category: 'Stress Response',
    icon: 'ShieldAlert',
    text: 'Before deadlines, what helps reduce your stress the most?',
    options: [
      { value: 'early_start', label: 'Starting tasks earlier than usual' },
      { value: 'task_breakdown', label: 'Breaking tasks into smaller steps' },
      { value: 'quiet_music', label: 'Listening to calming music' },
      { value: 'body_movement', label: 'Short walks or stretching breaks' },
      { value: 'peer_checkin', label: 'Checking in with a trusted peer' }
    ]
  },
  {
    id: 'q34',
    category: 'Connection',
    icon: 'Handshake',
    text: 'What usually makes you trust someone more?',
    options: [
      { value: 'consistency', label: 'Consistent words and actions' },
      { value: 'respect_boundaries', label: 'Respecting boundaries' },
      { value: 'deep_listening', label: 'Listening without judgment' },
      { value: 'shared_values', label: 'Shared values and beliefs' },
      { value: 'time', label: 'Time and repeated positive interactions' }
    ]
  },
  {
    id: 'q35',
    category: 'Time Management',
    icon: 'Timer',
    text: 'How do you usually handle long study sessions?',
    options: [
      { value: 'pomodoro', label: 'Timed cycles with short breaks' },
      { value: 'single_focus', label: 'Single long focus block' },
      { value: 'task_switch', label: 'Switching tasks to stay fresh' },
      { value: 'environment_change', label: 'Changing location halfway through' },
      { value: 'depends_energy', label: 'Depends on my energy that day' }
    ]
  },
  {
    id: 'q36',
    category: 'Self-Care',
    icon: 'Leaf',
    text: 'Which activity helps you reset after an emotionally heavy day?',
    options: [
      { value: 'journaling', label: 'Journaling my thoughts' },
      { value: 'sleep_early', label: 'Sleeping earlier than usual' },
      { value: 'quiet_walk', label: 'A quiet walk outdoors' },
      { value: 'warm_drink', label: 'Tea and quiet rest time' },
      { value: 'digital_break', label: 'Taking a full break from screens' }
    ]
  },
  {
    id: 'q37',
    category: 'Collaboration',
    icon: 'UsersRound',
    text: 'In team projects, what setup helps you contribute best?',
    options: [
      { value: 'clear_roles', label: 'Clear role assignments from the start' },
      { value: 'written_updates', label: 'Written updates instead of frequent calls' },
      { value: 'small_team', label: 'Smaller team size' },
      { value: 'deadline_chunks', label: 'Milestones with mini-deadlines' },
      { value: 'paired_work', label: 'Working in pairs before full-group review' }
    ]
  },
  {
    id: 'q38',
    category: 'Feedback',
    icon: 'MessageSquareQuote',
    text: 'When receiving critique, what tone helps you most?',
    options: [
      { value: 'gentle_direct', label: 'Gentle but direct' },
      { value: 'step_by_step', label: 'Step-by-step with examples' },
      { value: 'goal_focused', label: 'Focused on goals, not personality' },
      { value: 'private_supportive', label: 'Private and supportive' },
      { value: 'written_summary', label: 'Written summary I can revisit' }
    ]
  },
  {
    id: 'q39',
    category: 'Creativity',
    icon: 'PenLine',
    text: 'How do you usually get past creative blocks?',
    options: [
      { value: 'freewrite', label: 'Freewriting or sketching without pressure' },
      { value: 'reference_inspo', label: 'Looking at inspiring references' },
      { value: 'short_break', label: 'Taking a short intentional break' },
      { value: 'change_medium', label: 'Switching to a different medium/task' },
      { value: 'talk_idea', label: 'Talking ideas out with one trusted person' }
    ]
  },
  {
    id: 'q40',
    category: 'Decision Making',
    icon: 'Scale',
    text: 'Which decision style best describes you under pressure?',
    options: [
      { value: 'fast_logic', label: 'Fast decisions based on logic' },
      { value: 'pause_then_choose', label: 'Pause first, then decide' },
      { value: 'ask_input', label: 'Ask for input before deciding' },
      { value: 'compare_options', label: 'Compare options in a list' },
      { value: 'defer_when_possible', label: 'Delay when possible to avoid mistakes' }
    ]
  },
  {
    id: 'q41',
    category: 'Social Preferences',
    icon: 'MessagesSquare',
    text: 'What kind of social plan usually feels best for you?',
    options: [
      { value: 'planned_ahead', label: 'Planned ahead with clear details' },
      { value: 'short_meetup', label: 'Short meetup with a fixed end time' },
      { value: 'activity_based', label: 'Activity-based meetup (games, workshop, etc.)' },
      { value: 'low_stimulation', label: 'Low-noise, low-crowd setting' },
      { value: 'online_option', label: 'Online option first before in-person' }
    ]
  },
  {
    id: 'q42',
    category: 'Emotional Awareness',
    icon: 'ScanHeart',
    text: 'When your mood shifts, what helps you notice it early?',
    options: [
      { value: 'body_signals', label: 'Body signals like tension or fatigue' },
      { value: 'thought_patterns', label: 'Changes in thought patterns' },
      { value: 'habit_change', label: 'Changes in my daily habits' },
      { value: 'journal_check', label: 'Quick mood journal check-ins' },
      { value: 'others_notice', label: 'Others notice before I do' }
    ]
  },
  {
    id: 'q43',
    category: 'Comfort Zone',
    icon: 'Mountain',
    text: 'If you try something new, what support helps most?',
    options: [
      { value: 'clear_expectations', label: 'Clear expectations and steps' },
      { value: 'practice_round', label: 'A practice round first' },
      { value: 'mentor_support', label: 'Support from a mentor/friend' },
      { value: 'quiet_environment', label: 'A calm, low-pressure environment' },
      { value: 'self_paced', label: 'Ability to move at my own pace' }
    ]
  },
  {
    id: 'q44',
    category: 'Values',
    icon: 'BadgeCheck',
    text: 'What quality do you value most in collaborators?',
    options: [
      { value: 'reliability', label: 'Reliability and follow-through' },
      { value: 'kindness', label: 'Kindness and empathy' },
      { value: 'honesty', label: 'Honesty in communication' },
      { value: 'curiosity', label: 'Curiosity and openness to ideas' },
      { value: 'accountability', label: 'Accountability under pressure' }
    ]
  },
  {
    id: 'q45',
    category: 'Reflection',
    icon: 'BookMarked',
    text: 'What reflection format works best for you?',
    options: [
      { value: 'short_daily_prompts', label: 'Short daily prompts' },
      { value: 'weekly_long_form', label: 'Longer weekly reflections' },
      { value: 'voice_notes', label: 'Voice notes instead of writing' },
      { value: 'guided_questions', label: 'Guided questions with structure' },
      { value: 'visual_reflection', label: 'Visual reflection (mind map/doodle)' }
    ]
  },
  {
    id: 'q46',
    category: 'Recognition',
    icon: 'Medal',
    text: 'What kind of achievement tracking motivates you most?',
    options: [
      { value: 'private_checklist', label: 'Private checklist of completed tasks' },
      { value: 'streak_tracking', label: 'Daily/weekly streak tracking' },
      { value: 'mentor_feedback', label: 'Feedback from a mentor' },
      { value: 'small_rewards', label: 'Small personal rewards' },
      { value: 'milestone_board', label: 'Visible milestone board' }
    ]
  },
  {
    id: 'q47',
    category: 'Change Adaptation',
    icon: 'Route',
    text: 'When plans suddenly change, what is your first response?',
    options: [
      { value: 'replan_immediately', label: 'Re-plan immediately' },
      { value: 'pause_breathe', label: 'Pause and breathe first' },
      { value: 'ask_clarity', label: 'Ask for clear expectations' },
      { value: 'focus_next_step', label: 'Focus on just the next step' },
      { value: 'wait_then_adjust', label: 'Wait a bit, then adjust' }
    ]
  },
  {
    id: 'q48',
    category: 'Processing Style',
    icon: 'FilePenLine',
    text: 'How do you process difficult feedback best?',
    options: [
      { value: 'write_response', label: 'Write my thoughts privately first' },
      { value: 'walk_and_think', label: 'Take a walk and think' },
      { value: 'review_later', label: 'Review it again after some time' },
      { value: 'clarify_questions', label: 'Ask clarifying questions' },
      { value: 'peer_reflection', label: 'Discuss with one trusted peer' }
    ]
  },
  {
    id: 'q49',
    category: 'Problem Solving',
    icon: 'Wrench',
    text: 'If a study plan is not working, what do you usually do?',
    options: [
      { value: 'adjust_schedule', label: 'Adjust schedule and keep core goals' },
      { value: 'change_method', label: 'Change study method completely' },
      { value: 'seek_help', label: 'Ask for help from teacher/peer' },
      { value: 'reduce_scope', label: 'Reduce scope and finish essentials first' },
      { value: 'restart_plan', label: 'Restart with a simpler plan' }
    ]
  },
  {
    id: 'q50',
    category: 'Motivation',
    icon: 'Flag',
    text: 'What keeps you going when progress feels slow?',
    options: [
      { value: 'small_wins', label: 'Tracking small wins' },
      { value: 'purpose_reminder', label: 'Remembering my long-term purpose' },
      { value: 'peer_encouragement', label: 'Encouragement from supportive peers' },
      { value: 'rest_then_return', label: 'Resting briefly then returning' },
      { value: 'structured_plan', label: 'A clear structured next-step plan' }
    ]
  }
];

export const quizDifficultyLevels = ['easy', 'medium', 'deep'];

export const quizQuestions = assignQuestionDifficulties(baseQuizQuestions);
