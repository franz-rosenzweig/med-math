// "Talk it through": communication practice around arterial blood gases. Each card is a moment at the
// bedside, with one best thing to say, what's wrong with the others, and a model answer. It's
// communication practice only, never treatment advice for a real person. The facts behind each card,
// with sources, are listed in REVIEW.md for an instructor or clinician to check.

export const KINDS = {
  best: 'Best',
  jargon: 'Jargon',
  reassure: 'False reassurance',
  detail: 'Too much detail',
  dismiss: 'Brushes it off',
  incomplete: 'Leaves things out',
  noteach: 'Doesn’t check understanding',
  privacy: 'Shares before checking',
  wrong: 'Not true',
};

export const TALK = [
  {
    id: 'why-artery',
    scene: 'You’re about to draw an arterial blood gas from the patient’s wrist.',
    who: 'Patient', says: '“They already took blood from my arm this morning. Why do you need more, and why from my wrist?”',
    options: [
      { id: 'a', kind: 'best', text: '“This test needs blood from an artery, which is blood that has just come from your lungs and heart. It shows how well your lungs are getting oxygen in and carbon dioxide out. The artery at your wrist is close to the skin and the easiest one to reach.”', why: 'Plain words, answers both questions, and says what the test is for.' },
      { id: 'b', kind: 'jargon', text: '“We need an arterial sample to assess your PaO2, PaCO2 and acid-base status, and the radial artery is the most accessible site.”', why: 'Accurate, but “arterial”, “PaO2” and “radial” mean nothing to most patients.' },
      { id: 'c', kind: 'dismiss', text: '“It’s just a different kind of blood test. The doctor ordered it, so we have to do it.”', why: 'Doesn’t answer the question, and leaves the patient feeling unheard.' },
      { id: 'd', kind: 'detail', text: '“Venous blood has already given up oxygen to your tissues, so its partial pressures differ from arterial blood, which reflects alveolar gas exchange, and the radial artery has collateral flow through the palmar arches…”', why: 'Far more than was asked, and the main point gets lost.' },
    ],
    model: 'This morning’s blood came from a vein and was for other tests. This one needs blood from an artery, the blood that has just come from your lungs, so it shows how well your lungs are getting oxygen in and carbon dioxide out. The artery at your wrist is close to the skin, which makes it the easiest one to reach. Can you tell me in your own words what this test is checking?',
  },
  {
    id: 'will-it-hurt',
    scene: 'You’re getting ready to draw an arterial blood gas from the wrist.',
    who: 'Patient', says: '“Is this going to hurt like the blood draw this morning?”',
    options: [
      { id: 'a', kind: 'best', text: '“It can hurt a bit more than a regular blood draw, because the artery is a little deeper than the veins in your arm. It’s quick, I’ll tell you right before I start, and if you need me to stop, just say so.”', why: 'Honest about the pain, explains why in plain words, and gives the patient some control.' },
      { id: 'b', kind: 'reassure', text: '“Don’t worry, it won’t hurt at all.”', why: 'Not true. Most people find it hurts more than a vein draw, and a broken promise costs trust.' },
      { id: 'c', kind: 'jargon', text: '“Radial artery puncture is generally more painful than venipuncture, but the procedure is brief.”', why: 'True, but in words the patient may not follow.' },
      { id: 'd', kind: 'dismiss', text: '“Everyone says it hurts, but you’ll be fine. Just hold still.”', why: 'Brushes off the worry and doesn’t prepare the patient.' },
    ],
    model: 'Honestly, it can hurt more than a normal blood draw. The artery is a little deeper than the veins in your arm, so you may feel a sharp sting or an ache for a moment. It’s quick, I’ll tell you right before I start, and if it’s too much, tell me and I’ll stop.',
  },
  {
    id: 'allen-test',
    scene: 'Before a radial puncture, you’re doing the modified Allen test.',
    who: 'Patient', says: '“Why are you pressing on my wrist and having me open and close my hand?”',
    options: [
      { id: 'a', kind: 'best', text: '“Two arteries at your wrist bring blood to your hand. I’m checking that the second one works well on its own, so your hand has a good backup supply before I take blood from the first. When I let go, your palm should turn pink again quickly.”', why: 'Explains what it checks and why, in plain words, and what the patient will see.' },
      { id: 'b', kind: 'jargon', text: '“I’m doing a modified Allen test to confirm ulnar collateral circulation before radial puncture.”', why: 'Names the test but doesn’t explain it.' },
      { id: 'c', kind: 'detail', text: '“The test was first described in 1929; the modified version occludes both arteries, blanches the palm, and times the return of color after releasing the ulnar artery, with cutoffs that vary between sources…”', why: 'A history lesson nobody asked for.' },
      { id: 'd', kind: 'dismiss', text: '“It’s just a routine check. You don’t need to worry about it.”', why: 'Doesn’t answer the question.' },
    ],
    model: 'Two arteries at your wrist bring blood to your hand. I’m going to press on both while you make a fist, then let go of one. If your palm turns pink again quickly, the second artery can keep your hand supplied on its own, and that’s what we want to know before taking blood from the first one. Can you tell me what I’m checking for?',
  },
  {
    id: 'acidic',
    scene: 'The patient’s ABG showed acidosis, and the provider has mentioned it to them.',
    who: 'Patient', says: '“The doctor said my blood is ‘a little too acidic’. What does that mean?”',
    options: [
      { id: 'a', kind: 'best', text: '“Your body keeps your blood in a very narrow balance between acid and base. Right now it’s tipped a little toward the acid side. That can happen when carbon dioxide builds up, or when the body makes too much acid or loses too much base. The team is working out why, and I’ll make sure the doctor goes over the cause with you.”', why: 'Plain words, no false promises, and points to the provider for the cause.' },
      { id: 'b', kind: 'jargon', text: '“Your pH is below 7.35, so you have an acidemia from a primary metabolic or respiratory process.”', why: 'Correct, but it’s a lab report, not an explanation.' },
      { id: 'c', kind: 'reassure', text: '“It’s nothing to worry about. Everybody’s blood gets a bit acidic sometimes.”', why: 'Minimizes something the team is taking seriously.' },
      { id: 'd', kind: 'detail', text: '“pH equals 6.1 plus the log of bicarbonate over 0.03 times PaCO2, so either the numerator fell or the denominator rose…”', why: 'An equation is the last thing a worried patient needs.' },
    ],
    model: 'Your body keeps your blood in a very narrow balance between acid and base, and right now it’s tipped a little toward the acid side. That can happen when carbon dioxide builds up because breathing isn’t clearing it fast enough, or when the body makes extra acid or loses some of its base. The team is working out which it is for you, and the doctor can go over that with you. Can you tell me in your own words what “too acidic” means?',
  },
  {
    id: 'alkaline',
    scene: 'The patient’s ABG showed alkalosis.',
    who: 'Patient', says: '“Someone said my blood is a bit alkaline. Is that the opposite of acidic? Is it bad?”',
    options: [
      { id: 'a', kind: 'best', text: '“Yes, alkaline is the opposite of acidic. Your blood is a little on the base side of normal right now. It’s something the team is watching and working to bring back into balance, and I’ll let the doctor know you’d like to talk about what’s causing it.”', why: 'Answers the actual question, stays honest, and connects them with the provider.' },
      { id: 'b', kind: 'wrong', text: '“It’s not bad at all. Alkaline is actually healthy, like alkaline water.”', why: 'Not true. Blood that’s too alkaline is a problem, whatever the water ads say.' },
      { id: 'c', kind: 'jargon', text: '“Your pH is above 7.45, which indicates alkalemia, possibly a metabolic alkalosis with respiratory compensation.”', why: 'Too technical to help.' },
      { id: 'd', kind: 'dismiss', text: '“Try not to look at the numbers. That’s the doctor’s job.”', why: 'Shuts the patient out of their own care.' },
    ],
    model: 'Yes, alkaline is the opposite of acidic. Your blood is a little on the base side of normal right now, which is something the team watches and works to bring back into balance. I’ll let the doctor know you have questions about what’s causing it. Can you tell me what “alkaline” means, so I know I explained it well?',
  },
  {
    id: 'compensating',
    scene: 'The provider told the patient their body is compensating.',
    who: 'Patient', says: '“The doctor said my body is ‘compensating’. Compensating for what?”',
    options: [
      { id: 'a', kind: 'best', text: '“Your lungs and kidneys work as a team to keep your blood’s acid balance steady. When one gets thrown off, the other adjusts to pull it back toward normal. The lungs can do that within minutes by changing your breathing, and the kidneys more slowly, over hours to days.”', why: 'A clear picture of what compensation is, without promising it’s fixed.' },
      { id: 'b', kind: 'reassure', text: '“It means you’re fine now. Your body fixed it.”', why: 'Not true. Compensation means the body is making up for a problem, not that the problem is gone.' },
      { id: 'c', kind: 'jargon', text: '“Your PaCO2 has decreased to offset the primary metabolic acidosis, consistent with Winters’ formula.”', why: 'Correct for a clinician, meaningless to most patients.' },
      { id: 'd', kind: 'detail', text: '“There’s ROME, which stands for respiratory opposite, metabolic equal, and then the expected compensation rules, and the tic-tac-toe method…”', why: 'That’s how a student reads the result, not what the patient asked.' },
    ],
    model: 'Your lungs and kidneys work together to keep your blood’s acid balance steady. When one side gets thrown off, the other adjusts to pull it back toward normal. The lungs can do that within minutes by breathing faster or slower, and the kidneys do it more slowly, over hours to days. So “compensating” means your body is already working to balance things, while the team treats the cause. What questions do you have about that?',
  },
  {
    id: 'breathe-normally',
    scene: 'You’re about to draw an ABG. The patient is nervous and breathing fast.',
    who: 'Patient', says: '“Why do you want me to calm down and breathe normally before you do it?”',
    options: [
      { id: 'a', kind: 'best', text: '“How fast and deep you breathe changes the carbon dioxide in your blood within minutes. If you’re breathing fast because you’re nervous, the result would show that moment instead of how you usually are. So let’s take a minute first.”', why: 'Gives the real reason, in plain words, and doesn’t blame the patient.' },
      { id: 'b', kind: 'jargon', text: '“Hyperventilation would lower your PaCO2 and give us a falsely alkalotic result.”', why: 'Right reason, wrong words for this listener.' },
      { id: 'c', kind: 'dismiss', text: '“Just relax, it’s not a big deal.”', why: 'Doesn’t explain, and telling someone to relax rarely helps.' },
      { id: 'd', kind: 'detail', text: '“Minute ventilation is inversely related to PaCO2, so a change in rate or tidal volume alters the result, and acute changes shift the pH by about 0.08 for every 10 mmHg…”', why: 'Too much, and none of it calms anyone.' },
    ],
    model: 'How fast and deep you breathe changes the carbon dioxide in your blood within a few minutes. If you’re breathing fast because you’re nervous, the result would show that moment instead of how you usually are. So let’s take a minute together first, and I’ll tell you before I start.',
  },
  {
    id: 'oxygen-down',
    scene: 'After an ABG, the team turned the patient’s oxygen down.',
    who: 'Patient', says: '“Why did you turn my oxygen down? Don’t I need it?”',
    options: [
      { id: 'a', kind: 'best', text: '“Your last blood test showed you have enough oxygen in your blood, so the team is giving you what you need and not more, because extra oxygen you don’t need isn’t helpful either. We’ll keep checking your oxygen with the clip on your finger, and if it goes down, we’ll adjust it again.”', why: 'Explains the reason and what happens next, which is what the worry is really about.' },
      { id: 'b', kind: 'reassure', text: '“Don’t worry about the oxygen. You’re doing great and you’ll be off it soon.”', why: 'Doesn’t explain, and promises something nobody knows yet.' },
      { id: 'c', kind: 'jargon', text: '“Your PaO2 was above target, so we titrated your FiO2 down per protocol.”', why: 'All abbreviations, no explanation.' },
      { id: 'd', kind: 'dismiss', text: '“That’s what the order says.”', why: 'True, but it shuts the conversation down.' },
    ],
    model: 'Your last blood test showed you have enough oxygen in your blood, so the team is giving you what you need and not more. Extra oxygen you don’t need isn’t helpful either. We’ll keep checking your oxygen with the clip on your finger, and if it drops, we’ll turn it back up. Can you tell me what we’ll do if your oxygen level goes down?',
  },
  {
    id: 'press-site',
    scene: 'You’ve just drawn an ABG from the wrist. The patient takes a blood thinner.',
    who: 'Patient', says: '“Do I really have to keep pressing on it? It’s been a minute.”',
    options: [
      { id: 'a', kind: 'best', text: '“Yes, please. An artery is under more pressure than a vein, so it bleeds and bruises more easily. We usually press for at least five minutes, and since you take a blood thinner, we’ll press even longer. I’ll check it before we stop.”', why: 'Clear reason, a clear time, and it accounts for the blood thinner.' },
      { id: 'b', kind: 'wrong', text: '“A minute is fine. You can let go now.”', why: 'Not enough, especially on a blood thinner. Common nursing guidance is at least 5 minutes, and longer with anticoagulants.' },
      { id: 'c', kind: 'jargon', text: '“Hemostasis takes longer at an arterial puncture site, especially with anticoagulation.”', why: 'Right idea, but the patient has to decode it.' },
      { id: 'd', kind: 'dismiss', text: '“Just keep pressing until I say so.”', why: 'No reason and no time, which makes it harder to keep doing.' },
    ],
    model: 'Yes, please keep pressing. An artery is under more pressure than a vein, so it bleeds and bruises more easily than this morning’s blood draw. We usually press for at least five minutes, and because you take a blood thinner, we’ll press longer. I’ll check the spot before we stop. Why do you think we press longer for you?',
  },
  {
    id: 'watch-for',
    scene: 'The ABG is done and the site has stopped bleeding.',
    who: 'Patient', says: '“Is there anything I should watch for after this?”',
    options: [
      { id: 'a', kind: 'best', text: '“Yes. Press the call button right away if the spot starts bleeding or swelling, or if your hand gets numb, tingly, cold, or turns pale or bluish. A little soreness or a small bruise is common. Can you tell me what you’d call me for?”', why: 'Lists what matters in plain words, says what to do, and checks understanding.' },
      { id: 'b', kind: 'reassure', text: '“Nothing, really. It’ll be fine.”', why: 'Problems are uncommon, but the patient needs to know what they look like.' },
      { id: 'c', kind: 'incomplete', text: '“Just tell me if it bleeds.”', why: 'Leaves out numbness, coldness and color changes in the hand.' },
      { id: 'd', kind: 'jargon', text: '“Report any signs of hematoma, paresthesia, or distal ischemia.”', why: 'Exactly the right list, in words the patient won’t recognize.' },
    ],
    model: 'Yes. Keep an eye on your wrist and hand. Press the call button right away if the spot starts bleeding or swelling, or if your hand gets numb, tingly, cold, or turns pale or bluish. A little soreness or a small bruise is common and usually goes away. Can you tell me what you’d call me for?',
  },
  {
    id: 'family-check',
    scene: 'A visitor who says she’s the patient’s daughter is looking at the ABG results on the screen. You don’t know yet whether the patient wants her to have them.',
    who: 'Daughter', says: '“What do these numbers mean? Is she getting worse?”',
    options: [
      { id: 'a', kind: 'best', text: '“I can see you’re worried. Before I go over her results, I need to check with your mother that she’s okay with me sharing them. If she is, I’ll explain them in plain words, and I’ll ask the doctor to talk with you both about how she’s doing overall.”', why: 'Acknowledges the worry, protects the patient’s privacy, and offers a real next step.' },
      { id: 'b', kind: 'privacy', text: '“Her pH is 7.31 and her CO2 is 58, so it’s a respiratory acidosis, and her oxygen is a bit low too.”', why: 'Shares results before checking the patient is okay with it, and in jargon.' },
      { id: 'c', kind: 'reassure', text: '“Oh, she’s doing fine. Don’t worry about the numbers.”', why: 'You don’t know that, and it isn’t yours to promise.' },
      { id: 'd', kind: 'dismiss', text: '“You’ll have to ask the doctor. I can’t tell you anything.”', why: 'Closes the door without offering a way forward.' },
    ],
    model: 'I can see you’re worried about her. Before I talk about her results, I need to check with her that she’s okay with me sharing them, because they’re hers. If she is, I’ll explain what the numbers mean in plain words, and I’ll ask the doctor to talk with you both about how she’s doing overall.',
  },
  {
    id: 'family-explain',
    scene: 'The patient has said it’s fine to talk with her son about her care. Her ABG showed her blood was a little too acidic because carbon dioxide had built up.',
    who: 'Son', says: '“What do these numbers mean?”',
    options: [
      { id: 'a', kind: 'best', text: '“What has the team told you so far? … This test checks the oxygen, the carbon dioxide and the acid balance in her blood. Her lungs haven’t been clearing carbon dioxide as well as they should, which has made her blood a little more acidic than normal. The team is treating that and will repeat the test to see how she’s doing.”', why: 'Starts from what he knows, explains the one thing that matters, and says what happens next.' },
      { id: 'b', kind: 'detail', text: '“Her pH is 7.31, PaCO2 58, HCO3 28 and PaO2 70, so going through them one by one…”', why: 'Reads out every number without saying what any of it means.' },
      { id: 'c', kind: 'reassure', text: '“Her numbers are basically normal.”', why: 'Not true here, and it will undermine trust later.' },
      { id: 'd', kind: 'jargon', text: '“She has a respiratory acidosis with partial metabolic compensation.”', why: 'Correct, but it answers in a language he doesn’t speak.' },
    ],
    model: 'What has the team told you so far? … This test looks at the oxygen, the carbon dioxide and the acid balance in her blood. Her lungs haven’t been clearing carbon dioxide as well as they should, and that’s made her blood a little more acidic than normal. The team is treating that, and they’ll repeat the test to see how she’s doing. What questions do you have for the doctor? I can let them know.',
  },
  {
    id: 'teach-back',
    scene: 'You’ve just explained to a patient what to watch for in their hand after an ABG.',
    who: 'You', says: 'You want to make sure you explained it well.', ask: 'What’s the best way to check?',
    options: [
      { id: 'a', kind: 'best', text: '“I want to make sure I explained that clearly. Can you tell me what you’d watch for in your hand, and what you’d do if you noticed it?”', why: 'Teach-back: the patient says it in their own words, and it checks your explaining, not their intelligence.' },
      { id: 'b', kind: 'noteach', text: '“Do you understand?”', why: 'Most people say yes whether or not they do, so it checks nothing.' },
      { id: 'c', kind: 'noteach', text: '“You got all that, right?”', why: 'Invites a yes and makes it awkward to admit confusion.' },
      { id: 'd', kind: 'detail', text: '“Let me go over all of it again, just to be safe.”', why: 'Repeating it doesn’t tell you whether it landed.' },
    ],
    model: 'I want to make sure I explained that clearly. Can you tell me, in your own words, what you’d watch for in your hand, and what you’d do if you noticed it? (If anything is missing or mixed up, explain that part again in a different way, and ask again.)',
  },
  {
    id: 'finger-clip',
    scene: 'You’re about to draw an ABG. The patient has a pulse oximeter on their finger.',
    who: 'Patient', says: '“Can’t you just use the clip on my finger instead of a needle?”',
    options: [
      { id: 'a', kind: 'best', text: '“The finger clip is good for checking oxygen, and we’ll keep using it. But it only shows how much oxygen your blood is carrying. This blood test also shows the carbon dioxide and the acid balance, which the clip can’t measure.”', why: 'Respects the question and explains exactly what the blood test adds.' },
      { id: 'b', kind: 'wrong', text: '“The clip is just as good, but the doctor prefers a blood test.”', why: 'Not true. The clip can’t measure carbon dioxide or pH.' },
      { id: 'c', kind: 'jargon', text: '“Pulse oximetry only estimates SpO2. It can’t give us PaCO2 or pH.”', why: 'Right, but full of abbreviations.' },
      { id: 'd', kind: 'dismiss', text: '“No, sorry. We need the blood.”', why: 'No reason given.' },
    ],
    model: 'The clip on your finger is good for keeping an eye on your oxygen, and we’ll keep using it. But it only shows how much oxygen your blood is carrying. This blood test also tells us about the carbon dioxide and the acid balance in your blood, which the clip can’t measure, so we need a small sample this time.',
  },
];

// Plain words for the terms patients hear.
export const GLOSSARY = [
  ['pH', 'A number for how acidic or basic the blood is. Lower is more acidic, higher is more basic (alkaline). The body keeps it in a narrow range, about 7.35 to 7.45.'],
  ['Carbon dioxide (PaCO2)', 'The gas your body makes as it uses energy, and breathes out. In the blood it acts like an acid, so when it builds up, the blood gets more acidic.'],
  ['Bicarbonate (HCO3)', 'A base in the blood that soaks up acid. The kidneys keep the amount in balance.'],
  ['Oxygen (PaO2, SaO2)', 'PaO2 is how much oxygen is dissolved in the blood in the arteries. SaO2 is how full the blood’s oxygen carriers (hemoglobin) are, as a percent.'],
  ['Acidosis', 'The blood is more acidic than normal, a pH below 7.35.'],
  ['Alkalosis', 'The blood is more basic (alkaline) than normal, a pH above 7.45.'],
  ['Compensation', 'The lungs or kidneys adjusting to bring the pH back toward normal. The lungs change carbon dioxide within minutes, and the kidneys change bicarbonate over hours to days.'],
];
