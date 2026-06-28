// ═══════════════════════════════════════════════════════════
//  FitOS — coach-tree.js
//  Diagnostic decision tree for the Coach Center chatbot.
//  Structure: each node has a `prompt`, an array of `options`
//  (each pointing to a child node id), and optionally a
//  `resolution` (shown once we reach a leaf where the user
//  confirms "yes, this is my issue").
//  Every branch ends in a resolution with practical advice and
//  a relevant FitOS deep-link where applicable.
// ═══════════════════════════════════════════════════════════

const COACH_TREE = {
  root: {
    prompt: "What's going on? Pick the area closest to your issue.",
    options: [
      { label: '🏋️ Workout / Training',     next: 'workout' },
      { label: '🍎 Diet / Nutrition',        next: 'diet' },
      { label: '😴 Recovery / Soreness',     next: 'recovery' },
      { label: '📈 Progress / Plateau',      next: 'progress' },
      { label: '🧠 Motivation / Consistency', next: 'mindset' },
      { label: '⚙️ App / Technical Problem', next: 'technical' },
    ],
  },

  // ── WORKOUT ─────────────────────────────────────────────
  workout: {
    prompt: 'What kind of workout issue is it?',
    options: [
      { label: "An exercise hurts or feels wrong", next: 'workout_pain' },
      { label: "The plan doesn't fit my equipment", next: 'workout_equipment' },
      { label: "I don't know how to do an exercise", next: 'workout_form' },
      { label: "The plan feels too easy or too hard", next: 'workout_difficulty' },
      { label: "I missed workouts / fell behind", next: 'workout_missed' },
      { label: "Something else about training", next: 'workout_other' },
    ],
  },
  workout_pain: {
    prompt: 'Where do you feel it?',
    options: [
      { label: 'Joint (knee, shoulder, wrist, etc.)', next: 'workout_pain_joint' },
      { label: 'Muscle (sharp pain, not normal soreness)', next: 'workout_pain_muscle' },
      { label: 'Lower back specifically', next: 'workout_pain_back' },
    ],
  },
  workout_pain_joint: {
    prompt: 'Does it hurt only during the exercise, or also at rest?',
    options: [
      { label: 'Only during that specific movement', next: 'r_joint_during' },
      { label: 'Also hurts at rest / won\'t go away', next: 'r_joint_persistent' },
    ],
  },
  r_joint_during: {
    resolution: {
      title: 'Likely a movement-pattern issue, not an injury',
      body: [
        "Pain that shows up only during one specific movement and disappears right after is usually a form, range-of-motion, or exercise-selection issue — not damage.",
        "Stop doing that exact variation today. Go to Profile and add the joint under Injuries & Limitations — FitOS will automatically swap in a joint-friendly substitute next time you regenerate your plan.",
        "If the swapped version still pinches, drop the range of motion (partial reps) for 1-2 weeks before going back to full range.",
      ],
      cta: { label: 'Update Injuries in Profile', href: 'profile.html' },
      tag: 'workout-pain-during',
    },
  },
  r_joint_persistent: {
    resolution: {
      title: 'This needs more than a plan change',
      body: [
        "Joint pain that lingers after you've stopped training, or that's present even at rest, isn't something an app should diagnose or treat.",
        "Please stop loading that joint and see a doctor or physiotherapist before continuing that movement pattern.",
        "In the meantime, mark it under Injuries in your Profile so FitOS avoids that joint in future plans while you recover.",
      ],
      cta: { label: 'Update Injuries in Profile', href: 'profile.html' },
      tag: 'workout-pain-persistent',
      severity: 'high',
    },
  },
  workout_pain_muscle: {
    resolution: {
      title: 'Sharp muscle pain ≠ normal training soreness',
      body: [
        "Delayed soreness (DOMS) 1-2 days after training is normal. A sharp, sudden, or localized pain during a lift — especially with a 'pulling' or 'pop' sensation — is not.",
        "If it was sudden/sharp: stop training that muscle, apply rest and ice for 48-72 hours, and see a professional if it doesn't improve.",
        "If it's just deep soreness from a hard session: light movement, hydration, and protein intake speed recovery. It should ease within 2-4 days.",
      ],
      tag: 'workout-pain-muscle',
    },
  },
  workout_pain_back: {
    prompt: 'Does the pain happen during hinge movements (deadlifts, rows) specifically?',
    options: [
      { label: 'Yes, mainly hinge/bend movements', next: 'r_back_hinge' },
      { label: 'No, it\'s there generally', next: 'r_joint_persistent' },
    ],
  },
  r_back_hinge: {
    resolution: {
      title: 'Likely a bracing or hip-hinge technique issue',
      body: [
        "Lower back pain specifically during hinge movements (deadlifts, rows, RDLs) is very often a bracing issue — the spine rounding under load instead of staying neutral.",
        "Drop the weight by 30-40% and rebuild the hip hinge pattern: brace your core like you're about to be punched, push the hips back first, keep the bar/weight close to your shins.",
        "Add 'Lower Back Pain' under Injuries in Profile — FitOS will substitute hip-hinge-heavy lifts for safer hamstring/glute alternatives until you're confident in the pattern again.",
      ],
      cta: { label: 'Update Injuries in Profile', href: 'profile.html' },
      tag: 'workout-pain-back-hinge',
    },
  },

  workout_equipment: {
    prompt: 'What\'s the equipment mismatch?',
    options: [
      { label: "I don't have what an exercise needs", next: 'r_equipment_missing' },
      { label: 'I got new equipment and want it reflected', next: 'r_equipment_new' },
      { label: 'The substitutes feel like a downgrade', next: 'r_equipment_quality' },
    ],
  },
  r_equipment_missing: {
    resolution: {
      title: "Update your equipment — your plan will follow",
      body: [
        "Your plan is built from your Equipment Access selections. If something doesn't match what you actually have, your profile is probably out of date.",
        "Go to Profile → Equipment Access, select exactly what you have available, and save. We'll prompt you to regenerate your plan automatically.",
        "FitOS substitutes exercises using real equipment equivalence (e.g. dumbbells ↔ kettlebells) so the stimulus stays similar even when the tool changes.",
      ],
      cta: { label: 'Update Equipment in Profile', href: 'profile.html' },
      tag: 'equipment-missing',
    },
  },
  r_equipment_new: {
    resolution: {
      title: 'Add it to your profile, then regenerate',
      body: [
        "Go to Profile → Equipment Access and check the new equipment you now have access to.",
        "After saving, you'll be asked if you want to regenerate your plan — say yes and FitOS will rebuild your workouts to take advantage of the new gear.",
        "Your old plan stays archived in Workout History, so nothing is lost.",
      ],
      cta: { label: 'Go to Profile', href: 'profile.html' },
      tag: 'equipment-new',
    },
  },
  r_equipment_quality: {
    resolution: {
      title: 'Some substitutions are genuinely limited — that\'s honest, not lazy',
      body: [
        "A few movements (like a true side-lateral-raise) really do need specific equipment (dumbbells, cables, or bands) — a barbell or pull-up bar alone can't fully replace them.",
        "If a substitute exercise's note mentions 'you may not have the right equipment,' that's FitOS being transparent rather than forcing a bad fit.",
        "The fix is usually small: resistance bands are inexpensive and unlock a lot of substitute coverage. Add them in Profile if that's feasible for you.",
      ],
      cta: { label: 'Update Equipment in Profile', href: 'profile.html' },
      tag: 'equipment-quality',
    },
  },

  workout_form: {
    resolution: {
      title: 'Form guidance, the right way',
      body: [
        "Open the exercise inside your current workout and tap it — the notes field includes a coaching cue for that specific movement.",
        "For a deeper visual breakdown, search '[exercise name] form' on YouTube from a reputable strength coach — text alone can't replace seeing the movement.",
        "General checklist for any new lift: brace your core, control the lowering phase (2-3 seconds), and stop the set the moment form breaks down — not after.",
      ],
      cta: { label: 'Go to Today\'s Workout', href: 'workout-current.html' },
      tag: 'workout-form',
    },
  },

  workout_difficulty: {
    prompt: 'Too easy, or too hard?',
    options: [
      { label: 'Too easy — not challenging anymore', next: 'r_too_easy' },
      { label: 'Too hard — can\'t complete the sets/reps', next: 'r_too_hard' },
    ],
  },
  r_too_easy: {
    resolution: {
      title: 'Time to push progression',
      body: [
        "If you're completing every set with reps to spare, it's time to add load: +2.5kg for upper body lifts, +5kg for lower body lifts, per FitOS's double-progression rule.",
        "If you've been on the same split for 8+ weeks, consider regenerating your plan from Workouts → New Plan — it picks up your latest fitness level and goal.",
        "Also check your Fitness Level in Profile — if you've leveled up, updating it changes the rep ranges and intensity guidance in future plans.",
      ],
      cta: { label: 'Go to Workouts', href: 'workouts.html' },
      tag: 'difficulty-too-easy',
    },
  },
  r_too_hard: {
    resolution: {
      title: 'Scale it back — that\'s normal, not failure',
      body: [
        "It's completely fine to reduce the weight or reps below what's listed — consistency at a manageable level beats grinding through unsafe reps.",
        "If every exercise feels too hard (not just one), your plan difficulty needs adjusting. You have two options below — pick whichever suits you.",
        "If it's just one or two specific lifts, drop the weight 10–20% on those and keep everything else. Individual weak points are completely normal.",
      ],
      actions: [
        { label: '📉 Build Me an Easier Plan', href: 'workouts.html?rebuild=easier', style: 'primary' },
        { label: '⚙️ Change My Level in Profile', href: 'profile.html', style: 'secondary' },
      ],
      tag: 'difficulty-too-hard',
    },
  },

  workout_missed: {
    resolution: {
      title: 'Missing days happens — here\'s how to get back on track',
      body: [
        "Don't try to 'make up' missed workouts by cramming them together — just resume from your next scheduled day.",
        "If you missed more than 2 weeks, drop your starting weights by about 10% for the first week back, then build back up.",
        "Check Workouts → your history to see your last completed session, and just pick up the next day in the rotation.",
      ],
      cta: { label: 'Go to Workouts', href: 'workouts.html' },
      tag: 'workout-missed',
    },
  },

  workout_other: {
    prompt: 'Can you narrow it down a bit more?',
    options: [
      { label: 'I want a completely different split/style', next: 'r_different_split' },
      { label: 'I don\'t understand the progression rules', next: 'r_progression_explain' },
      { label: 'None of these match my issue', next: 'fallback' },
    ],
  },
  r_different_split: {
    resolution: {
      title: 'Change your training days to change your split',
      body: [
        "Your split (Full Body, Upper/Lower, Hybrid 5-Day, or Push/Pull/Legs) is determined by how many days per week you train.",
        "Go to Profile, change 'Training Days per Week,' save, and regenerate your plan from Workouts → New Plan to get a different structure.",
        "3 days = Full Body, 4 days = Upper/Lower, 5 days = Hybrid, 6 days = Push/Pull/Legs.",
      ],
      cta: { label: 'Update Training Days in Profile', href: 'profile.html' },
      tag: 'different-split',
    },
  },
  r_progression_explain: {
    resolution: {
      title: 'How FitOS progression works',
      body: [
        "FitOS uses double progression: you build up reps within the listed range first (e.g. from 6 to 8 reps), then add weight once you hit the top of the range for all sets.",
        "Increments are +2.5kg for upper body presses/pulls and +5kg for squats/deadlifts/leg work — small, sustainable jumps.",
        "Every 6 weeks, take a lighter 'deload' week (about 40-50% less volume) to let your joints and nervous system recover before the next push.",
      ],
      tag: 'progression-explain',
    },
  },

  // ── DIET ─────────────────────────────────────────────────
  diet: {
    prompt: 'What\'s the diet/nutrition issue?',
    options: [
      { label: "I don't know what or how much to eat", next: 'diet_unsure' },
      { label: 'Logging food is a hassle', next: 'diet_logging' },
      { label: 'My diet type isn\'t being respected', next: 'diet_type' },
      { label: 'I\'m always hungry / never hungry', next: 'diet_hunger' },
      { label: 'Something else about nutrition', next: 'diet_other' },
    ],
  },
  diet_unsure: {
    prompt: 'What\'s your main goal right now?',
    options: [
      { label: 'Lose fat', next: 'r_diet_fatloss' },
      { label: 'Build muscle', next: 'r_diet_muscle' },
      { label: 'Just eat healthier / maintain', next: 'r_diet_maintain' },
    ],
  },
  r_diet_fatloss: {
    resolution: {
      title: 'Fat loss nutrition basics',
      body: [
        "Aim for a moderate calorie deficit (roughly 300-500 kcal below maintenance) — large deficits cause muscle loss and rebound hunger.",
        "Protein is the priority: about 1.8-2.2g per kg of bodyweight daily protects muscle while you're in a deficit.",
        "Check Nutrition → your daily targets, which are calculated from your profile, and log meals for a week to see where you actually land versus the target.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'diet-fatloss',
    },
  },
  r_diet_muscle: {
    resolution: {
      title: 'Muscle-building nutrition basics',
      body: [
        "You need a slight calorie surplus (roughly 200-300 kcal above maintenance) to support new tissue growth without excess fat gain.",
        "Protein target: 1.6-2.2g per kg bodyweight, spread across 3-5 meals for steady muscle protein synthesis.",
        "Carbs fuel your training — don't cut them too low if strength/size is the priority. Check your daily targets in Nutrition.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'diet-muscle',
    },
  },
  r_diet_maintain: {
    resolution: {
      title: 'Maintenance / general health basics',
      body: [
        "Eat at roughly your maintenance calories — check Nutrition for your personalized target based on your stats and activity level.",
        "Prioritize whole foods, adequate protein (around 1.6g/kg), and fiber from vegetables/fruit — this naturally regulates hunger and energy.",
        "Logging for just 1-2 weeks (even imperfectly) reveals patterns most people are surprised by.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'diet-maintain',
    },
  },

  diet_logging: {
    resolution: {
      title: 'Making logging less of a chore',
      body: [
        "Use Nutrition → Quick Add for foods you eat often — search once, and it's saved for one-tap logging next time.",
        "You don't need to log perfectly forever. Logging closely for 1-2 weeks to learn your portions, then logging loosely afterward, works well for most people.",
        "If a food isn't in our database, use 'Add Custom Food' in the nutrition log — enter the macros from the package once, and it's reusable.",
      ],
      cta: { label: 'Go to Nutrition Log', href: 'nutrition-log.html' },
      tag: 'diet-logging',
    },
  },
  diet_type: {
    resolution: {
      title: 'Update your diet type in Profile',
      body: [
        "Your Diet Type (Vegetarian, Vegan, Keto, etc.) is set in Profile → Training Profile and should drive what FitOS recommends in food suggestions.",
        "If it's showing the wrong type, double check it's saved correctly there, and let us know via feedback if suggestions still don't match — that helps us improve the food database.",
      ],
      cta: { label: 'Update Diet Type in Profile', href: 'profile.html' },
      tag: 'diet-type',
    },
  },
  diet_hunger: {
    prompt: 'Which one matches you?',
    options: [
      { label: 'Always hungry, even after meals', next: 'r_diet_always_hungry' },
      { label: 'Rarely hungry, hard to eat enough', next: 'r_diet_never_hungry' },
    ],
  },
  r_diet_always_hungry: {
    resolution: {
      title: 'Persistent hunger usually means one of three things',
      body: [
        "Not enough protein or fiber: both are far more filling per calorie than refined carbs or fats. Increase vegetables, lean protein, and whole grains.",
        "Deficit too aggressive: if you're cutting more than 500-750 kcal below maintenance, hunger will be relentless — moderate the deficit.",
        "Not enough volume: low-calorie-dense foods (vegetables, fruit, broth-based soups) let you eat a larger volume for fewer calories, which helps satiety.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'diet-always-hungry',
    },
  },
  r_diet_never_hungry: {
    resolution: {
      title: 'Struggling to eat enough — practical fixes',
      body: [
        "Favor calorie-dense foods: nuts, nut butter, olive oil, dried fruit, full-fat dairy — small portions add up fast.",
        "Liquid calories are easier to consume than solid food when appetite is low: smoothies, milk, protein shakes.",
        "Eat on a schedule rather than waiting for hunger cues — 4-5 smaller meals spread through the day is often easier than 3 large ones.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'diet-never-hungry',
    },
  },
  diet_other: {
    prompt: 'A couple more options — does either match?',
    options: [
      { label: 'I want to understand macros better', next: 'r_macros_explain' },
      { label: 'None of these match my issue', next: 'fallback' },
    ],
  },
  r_macros_explain: {
    resolution: {
      title: 'Macros, simply explained',
      body: [
        "Protein (4 kcal/g): builds and repairs muscle. Priority #1 for body composition goals.",
        "Carbs (4 kcal/g): your body's preferred fuel, especially for training performance and brain function.",
        "Fat (9 kcal/g): essential for hormone production; don't go too low even in a fat-loss phase. Your personalized targets are visible in Nutrition.",
      ],
      cta: { label: 'Go to Nutrition', href: 'nutrition.html' },
      tag: 'macros-explain',
    },
  },

  // ── RECOVERY ────────────────────────────────────────────
  recovery: {
    prompt: 'What\'s the recovery issue?',
    options: [
      { label: "I'm constantly sore", next: 'recovery_sore' },
      { label: "I can't sleep well", next: 'recovery_sleep' },
      { label: 'I feel run-down / overtrained', next: 'recovery_overtrained' },
      { label: 'Something else about recovery', next: 'recovery_other' },
    ],
  },
  recovery_sore: {
    resolution: {
      title: 'Managing chronic soreness',
      body: [
        "If soreness lasts more than 4-5 days after every session, your training volume or intensity is likely outpacing your recovery capacity.",
        "Make sure protein intake is adequate (1.6g+/kg) and sleep is 7+ hours — these are the two biggest recovery levers, bigger than any supplement.",
        "Log your soreness daily in Recovery — patterns over 1-2 weeks will show if it's tied to specific workouts, sleep, or stress.",
      ],
      cta: { label: 'Log in Recovery', href: 'recovery.html' },
      tag: 'recovery-sore',
    },
  },
  recovery_sleep: {
    resolution: {
      title: 'Sleep is non-negotiable for results',
      body: [
        "Poor sleep blunts strength gains, increases hunger hormones, and slows recovery — it's worth treating as seriously as training.",
        "Keep a consistent sleep/wake time, avoid screens 30-60 min before bed, and keep the room cool and dark.",
        "Avoid hard training or caffeine within 6 hours of bedtime — both can interfere with sleep depth even if you don't notice falling asleep.",
      ],
      tag: 'recovery-sleep',
    },
  },
  recovery_overtrained: {
    resolution: {
      title: 'Signs you may need a deload',
      body: [
        "Persistent fatigue, declining performance despite training hard, irritability, and disrupted sleep are classic overreaching signs.",
        "Take a deload week: cut volume by 40-50% (fewer sets, same or lighter weight) for 5-7 days, then reassess.",
        "If it doesn't improve after a deload and rest, consider whether sleep, stress, or nutrition outside the gym are the real bottleneck.",
      ],
      cta: { label: 'Log in Recovery', href: 'recovery.html' },
      tag: 'recovery-overtrained',
    },
  },
  recovery_other: {
    prompt: 'Does either of these match?',
    options: [
      { label: 'How often should I take rest days?', next: 'r_rest_days' },
      { label: 'None of these match my issue', next: 'fallback' },
    ],
  },
  r_rest_days: {
    resolution: {
      title: 'How many rest days you actually need',
      body: [
        "Most lifters do well with 1-2 full rest days per week, even at 5-6 training days, since muscle groups rotate and aren't loaded every day.",
        "Active recovery (walking, light mobility work) on rest days is usually better than total inactivity.",
        "Listen to recovery data: if Recovery scores trend down for 3+ days straight, take an extra rest day regardless of your plan.",
      ],
      cta: { label: 'Go to Recovery', href: 'recovery.html' },
      tag: 'rest-days',
    },
  },

  // ── PROGRESS ────────────────────────────────────────────
  progress: {
    prompt: 'What kind of progress issue?',
    options: [
      { label: 'Weight/scale isn\'t moving', next: 'r_scale_stuck' },
      { label: 'Strength isn\'t increasing', next: 'r_strength_stuck' },
      { label: 'I don\'t see visible changes', next: 'r_visual_stuck' },
      { label: 'I want to know if I\'m actually progressing', next: 'progress_check' },
    ],
  },
  r_scale_stuck: {
    resolution: {
      title: 'The scale isn\'t the full picture',
      body: [
        "Weight fluctuates 1-2kg daily from water, sodium, and digestion — judge trends over 2+ weeks, not single readings, ideally using a weekly average.",
        "If the weekly average is genuinely flat for 3+ weeks during a cut, tighten your deficit slightly or double-check your logging accuracy in Nutrition.",
        "Muscle gain can mask fat loss on the scale — check Progress → photos and measurements alongside weight for the real trend.",
      ],
      cta: { label: 'Go to Progress', href: 'progress.html' },
      tag: 'scale-stuck',
    },
  },
  r_strength_stuck: {
    resolution: {
      title: 'Breaking a strength plateau',
      body: [
        "First check the basics: are you sleeping 7+ hours, eating enough protein and overall calories, and recovering between sessions?",
        "Take a deload week (less volume, same intensity), then resume — plateaus often break right after a planned rest.",
        "Switch rep ranges for a few weeks (e.g. from 8-10 reps to 4-6, or vice versa) to provide a different training stimulus.",
      ],
      cta: { label: 'Go to Progress', href: 'progress.html' },
      tag: 'strength-stuck',
    },
  },
  r_visual_stuck: {
    resolution: {
      title: 'Visible changes lag behind real progress',
      body: [
        "Physical changes are usually the last thing to show — strength numbers and measurements typically move weeks before the mirror does.",
        "Take photos in the same lighting, pose, and time of day every 2 weeks — day-to-day comparison is too noisy to judge anything from.",
        "If measurements and strength are trending the right way, visible change is coming — give it 4-6 more weeks before changing your approach.",
      ],
      cta: { label: 'Go to Progress', href: 'progress.html' },
      tag: 'visual-stuck',
    },
  },
  progress_check: {
    resolution: {
      title: 'How to actually tell if you\'re progressing',
      body: [
        "Strength: are your top sets using more weight or reps than 4 weeks ago? Check Workout History to compare.",
        "Body composition: are waist/hip measurements or progress photos trending in the right direction over a month?",
        "Consistency: have you completed most of your planned sessions? Adherence is itself a leading indicator — results follow from it.",
      ],
      cta: { label: 'Go to Progress', href: 'progress.html' },
      tag: 'progress-check',
    },
  },

  // ── MINDSET ─────────────────────────────────────────────
  mindset: {
    prompt: 'What\'s the motivation/consistency issue?',
    options: [
      { label: "I keep skipping workouts", next: 'r_skipping' },
      { label: "I lost motivation entirely", next: 'r_lost_motivation' },
      { label: "I'm anxious or stressed about my progress", next: 'mindset_stress' },
      { label: 'Something else', next: 'mindset_other' },
    ],
  },
  r_skipping: {
    resolution: {
      title: 'Fixing the skip-workout pattern',
      body: [
        "Lower the bar for what counts as 'showing up' — a 15-minute version of the workout still beats skipping entirely, and keeps the habit alive.",
        "Schedule training at a fixed time, same as a meeting you can't move — removing the daily 'should I go?' decision is the single biggest lever for consistency.",
        "Track your streak in the app — most people are more motivated to protect a streak than to chase a vague long-term goal.",
      ],
      tag: 'skipping-workouts',
    },
  },
  r_lost_motivation: {
    resolution: {
      title: 'When motivation disappears entirely',
      body: [
        "Motivation is supposed to fade — it's not a personal failure, it's how motivation works for everyone. Systems and habits carry you through the gaps.",
        "Revisit your 'why': are your current goals still what you actually want, or have they gone stale? It's fine to set a new goal in Profile.",
        "Consider a short deliberate break (3-5 days) rather than dragging through half-hearted sessions — a real reset often restores motivation faster than pushing through.",
      ],
      tag: 'lost-motivation',
    },
  },
  mindset_stress: {
    resolution: {
      title: 'Progress anxiety is common — a few reframes help',
      body: [
        "Comparing your week 2 to someone else's year 2 is a distortion, not useful information. Compare yourself only to your own past data in Progress.",
        "Set process goals (e.g. 'train 4x this week') instead of only outcome goals (e.g. 'lose 2kg') — process goals are within your direct control and reduce anxiety.",
        "If anxiety about food, weight, or training feels persistent and distressing rather than just occasional frustration, please consider talking to a doctor or therapist — that's beyond what this app can help with.",
      ],
      tag: 'mindset-stress',
    },
  },
  mindset_other: {
    prompt: 'Does this match?',
    options: [
      { label: 'I compare myself to others too much', next: 'mindset_stress' },
      { label: 'None of these match my issue', next: 'fallback' },
    ],
  },

  // ── TECHNICAL ───────────────────────────────────────────
  technical: {
    prompt: 'What kind of technical problem?',
    options: [
      { label: "Sign-in / Google sign-in doesn't work", next: 'tech_signin' },
      { label: "Page looks broken or doesn't fit my screen", next: 'tech_layout' },
      { label: "A button isn't responding", next: 'tech_button' },
      { label: "Something didn't save", next: 'tech_save' },
      { label: 'Something else technical', next: 'tech_other' },
    ],
  },
  tech_signin: {
    resolution: {
      title: 'Google sign-in troubleshooting',
      body: [
        "If you see 'Something went wrong,' the error message now shown on the sign-in screen includes a specific reason — that detail is the actual cause, not a generic failure.",
        "Common causes: third-party cookies/popups blocked by your browser, or (for the site owner) Google sign-in not yet enabled for this project in Firebase.",
        "Try email/password sign-in as a fallback while the Google option is investigated, or try again after allowing popups for this site.",
      ],
      cta: { label: 'Go to Sign In', href: 'login.html' },
      tag: 'tech-signin',
    },
  },
  tech_layout: {
    resolution: {
      title: 'Layout/display issue',
      body: [
        "Try a hard refresh (pull down to refresh on mobile, or Ctrl/Cmd+Shift+R on desktop) — this clears any stale cached styling.",
        "Make sure your browser is reasonably up to date — very old mobile browser versions can render modern layouts incorrectly.",
        "If a specific page is still cut off or overlapping after a refresh, note which page and what device/browser you're using — that detail helps us fix it directly.",
      ],
      tag: 'tech-layout',
    },
  },
  tech_button: {
    resolution: {
      title: 'Unresponsive button troubleshooting',
      body: [
        "Wait a moment after tapping — some actions (saving, generating a plan) take a second and disable the button during that time to prevent duplicate submissions.",
        "Try a hard refresh of the page — a stuck network request can occasionally leave a button looking inactive.",
        "If it's still unresponsive after a refresh, note exactly which button and page — that's the fastest way for us to track it down.",
      ],
      tag: 'tech-button',
    },
  },
  tech_save: {
    resolution: {
      title: 'Something didn\'t save',
      body: [
        "Check your internet connection — saves require connectivity, though FitOS also keeps a local backup on your device so you shouldn't lose data entirely.",
        "Try the save action again — most save failures are transient network issues, not data loss.",
        "If it keeps failing in the same spot, that's worth reporting with the specific page and action — tap the thumbs-down on this conversation to flag it.",
      ],
      tag: 'tech-save',
    },
  },
  tech_other: {
    prompt: 'A couple more options — does either match?',
    options: [
      { label: 'The app feels slow / laggy', next: 'r_tech_slow' },
      { label: 'None of these match my issue', next: 'fallback' },
    ],
  },
  r_tech_slow: {
    resolution: {
      title: 'Performance troubleshooting',
      body: [
        "Close other browser tabs/apps running in the background — they compete for the same memory and can slow page rendering.",
        "A hard refresh clears cached scripts that may be running an old, slower version of the page.",
        "If slowness is specific to one page (e.g. the workout tracker during a session), note that — it helps narrow down which part of the app to optimize.",
      ],
      tag: 'tech-slow',
    },
  },

  // ── FALLBACK ────────────────────────────────────────────
  fallback: {
    resolution: {
      title: "Let's get you to a human answer",
      body: [
        "We weren't able to match your exact issue from the menu — that's on us, not you.",
        "Use the thumbs-down / feedback option to describe exactly what's happening — specific reports like that directly shape what FitOS fixes next.",
        "In the meantime, you can restart this chat and try a different starting category in case your issue fits better there.",
      ],
      tag: 'fallback-unmatched',
    },
  },
};

const COACH_TREE_ROOT = 'root';
