# ISF Ease – Functional Test Plan (Mar 8, 2026)

## A. Review & Scope
- ISF Ease supports introverted students with calm workflows: login, matching, low-pressure conversations, guided prompts, quiet hours (Quit Mode), 30-minute time limits, and adaptive quizzes.
- Features covered: Personalized Dashboard, Find Matches, Conversations, Guided Prompts, Quiet Mode (quiet hours), Time Limit (30 minutes), Adaptive Quiz with recommendations.
- Assumptions: students have stable internet; matching depends on accurate profile data.
- Constraints: session time cap 30 minutes; notifications must stay non-intrusive.

## B. Validation Goals
- Functionality: each feature behaves as described.
- Performance: smooth navigation and responses.
- Security: personal data (interests, tags, quiz answers) not exposed in UI logs.
- Usability: tone remains calm, supportive, and minimal.

## C. Test Cases

### ISF-TC-001 — Login & Personal Info (US-001)
- Preconditions: account exists (created via Sign Up flow).
- Steps: open app → enter the newly created username/password → click Login.
- Expected: login succeeds; dashboard loads with soft palette, minimal notifications, and supportive welcome (“Welcome back, take your time.”); self-paced options visible.

### ISF-TC-002 — Find Matches (US-002)
- Preconditions: profile has interests/tags.
- Steps: go to Find Matches → system shows peers with overlapping interests/tags → view suggestions.
- Data: Interests “Reading, Coding”; Tags “Reflective, Calm”.
- Expected: matches highlight shared traits; 2–3 gentle suggestions; actions “Send a quiet hello” / “Save for later”; no intrusive notifications.

### ISF-TC-003 — Conversations (US-003)
- Preconditions: logged in, peer contact exists.
- Steps: Conversations → select peer → receive message → delay reply.
- Expected: gentle notifications; options Reply later / Save draft / Mark as read; prompt “Respond when you’re ready”; history intact.

### ISF-TC-004 — Guided Prompts (US-004)
- Preconditions: logged in, peer available.
- Steps: start new chat → open guided prompts → pick prompt “What’s your favorite book?” → send.
- Expected: prompt sends; peer receives; calm confirmation; prompts remain optional.

### ISF-TC-005 — Quiet Mode (US-005)
- Preconditions: logged in; notifications enabled.
- Steps: enable Quiet Mode → set duration 2 hours → wait → check notifications after quiet hours.
- Expected: notifications silenced and stored; quiet confirmation (e.g., “Quiet Hours enabled until…”) ; messages delivered after quiet hours with calm reminder.

### ISF-TC-006 — Time Limit 30m (US-006)
- Preconditions: logged in; timer enabled.
- Steps: start activity → continue 30 minutes → observe behavior.
- Expected: gentle reminder at 25 minutes; auto-pause at 30 minutes; options to save progress/resume; tone stays supportive.

### ISF-TC-007 — Adaptive Quiz (US-007)
- Preconditions: logged in; quiz enabled.
- Steps: answer 30 questions → watch recommendations.
- Data: answers vary (e.g., “Prefer written communication”).
- Expected: each answer triggers personalized recommendation (journaling tools, quiet hours, reflection prompts); immediate feedback; progress saved; supportive tone and summary.
