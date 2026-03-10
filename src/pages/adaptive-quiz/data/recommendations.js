const recommendationMap = {
  q1: {
    very_comfortable: {
      title: 'Natural Connector',
      icon: 'Users',
      message: 'Your comfort with new people is a wonderful strength! You might enjoy being a peer mentor or conversation facilitator.',
      suggestions: [
        'Consider joining social committees or welcome groups',
        'You could help others feel comfortable in new settings',
        'Explore leadership roles in student organizations'
      ]
    },
    somewhat_uncomfortable: {
      title: 'Thoughtful Approach',
      icon: 'Heart',
      message: 'Your preference for familiar faces shows you value deep connections. Quality over quantity is a beautiful approach.',
      suggestions: [
        'Try one-on-one coffee chats instead of large gatherings',
        'Look for small study groups with consistent members',
        'Consider online communities where you can connect gradually'
      ]
    },
    very_uncomfortable: {
      title: 'Gentle Steps Forward',
      icon: 'Sparkles',
      message: 'Starting conversations can be challenging, and that\'s completely okay. Small steps can lead to meaningful connections.',
      suggestions: [
        'Begin with text-based introductions before meeting in person',
        'Join interest-based groups where shared topics ease conversation',
        'Practice with low-pressure environments like online forums'
      ]
    },
    default: {
      title: 'Flexible Communicator',
      icon: 'MessageCircle',
      message: 'Your adaptability in social situations is valuable. You can adjust your approach based on context.',
      suggestions: [
        'Notice which settings feel most comfortable for you',
        'Build on your strengths in familiar environments',
        'Gradually expand your comfort zone at your own pace'
      ]
    }
  },
  q2: {
    alone_time: {
      title: 'Restorative Solitude',
      icon: 'Home',
      message: 'Quiet alone time is essential for your wellbeing. Honoring this need helps you show up fully when you do connect.',
      suggestions: [
        'Schedule regular alone time in your calendar',
        'Create a peaceful space for recharging',
        'Communicate your needs to friends and roommates'
      ]
    },
    creative_activity: {
      title: 'Creative Recharge',
      icon: 'Palette',
      message: 'Creative activities help you process and restore energy. This is a wonderful form of self-care.',
      suggestions: [
        'Explore creative clubs or independent projects',
        'Use creative expression as a reflection tool',
        'Share your creations when you feel comfortable'
      ]
    },
    default: {
      title: 'Personal Restoration',
      icon: 'Battery',
      message: 'Understanding how you recharge is key to maintaining your energy and wellbeing.',
      suggestions: [
        'Experiment with different recharge activities',
        'Notice what leaves you feeling most restored',
        'Build recharge time into your routine'
      ]
    }
  },
  q3: {
    quiet_solo: {
      title: 'Independent Learner',
      icon: 'BookOpen',
      message: 'You thrive in quiet, independent learning environments. This focus is a tremendous asset.',
      suggestions: [
        'Seek out quiet study spaces on campus',
        'Consider self-paced online courses',
        'Use noise-canceling headphones when needed'
      ]
    },
    small_collaborative: {
      title: 'Collaborative Balance',
      icon: 'Users',
      message: 'Small group collaboration gives you the best of both worlds—connection and focus.',
      suggestions: [
        'Form study partnerships with 1-2 trusted peers',
        'Look for project-based learning opportunities',
        'Balance group work with independent study time'
      ]
    },
    default: {
      title: 'Adaptive Learner',
      icon: 'Brain',
      message: 'Your learning preferences help you succeed in various environments.',
      suggestions: [
        'Identify your optimal learning conditions',
        'Communicate your preferences to instructors',
        'Create study environments that support your focus'
      ]
    }
  },
  default: {
    title: 'Insight Received',
    icon: 'Check',
    message: 'Thank you for sharing. Your response helps us understand your unique communication style and preferences.',
    suggestions: [
      'Every response adds to your personalized profile',
      'There are no right or wrong answers',
      'Your authentic responses lead to better recommendations'
    ]
  }
};

export const getRecommendation = (questionId, answer) => {
  const questionRecs = recommendationMap?.[questionId];
  if (!questionRecs) return recommendationMap?.default;
  
  return questionRecs?.[answer] || questionRecs?.default || recommendationMap?.default;
};