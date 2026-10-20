# Review note: blood gases and "Talk it through"

This note is for an instructor, a nurse or a respiratory therapist who's willing to check the blood gas part of Med
Math before people rely on it. It lists every fact the patient-communication cards (`app/js/talk.js`) depend on, and
the numbers the calculation topics use (`app/js/abg.js`), with where each one comes from. Nothing here has been
reviewed by a clinician yet. If you find something wrong or out of date, please open an issue on
https://github.com/franz-rosenzweig/med-math and say which card or rule it is.

Everything in "Talk it through" is framed as communication practice: picking the clearest, most honest thing to say.
None of it is treatment advice for a real person, and facility policy always comes first. Every blood gas problem
also says: check with your instructor, because methods and ranges vary slightly by program.

## What the cards rely on

| Card | The facts it depends on | Source | Worth checking |
|---|---|---|---|
| why-artery | An ABG needs arterial blood, which shows how well the lungs move oxygen in and carbon dioxide out; the radial artery at the wrist is the usual, easiest site. | MedlinePlus "Blood gases"; AARC CPG 2013 | Wording of "blood that has just come from your lungs and heart". |
| will-it-hurt | Arterial puncture tends to hurt more than a venous draw; the radial artery is deeper than arm veins. | MedlinePlus "Blood gases" ("Pain and discomfort tend to be worse than drawing blood from a vein") | Whether to mention local anesthetic, which some facilities use. |
| allen-test | The modified Allen test checks that the ulnar artery can supply the hand on its own before a radial puncture; the palm should color quickly when ulnar pressure is released. | Common nursing and respiratory care procedure guidance (often 5 to 15 seconds); MedlinePlus mentions testing circulation to the hand | The card avoids a number of seconds. The test's reliability is debated; some places use other methods. |
| acidic | Blood is kept in a narrow acid-base balance; acidosis can come from CO2 building up, or from the body making extra acid or losing base. | Standard physiology (e.g. Guyton and Hall) | Plain-language accuracy. |
| alkaline | Alkalosis is the opposite of acidosis, and blood that's too alkaline is a problem (the "alkaline water" answer is marked untrue). | Standard physiology | — |
| compensating | Lungs and kidneys work together; the lungs adjust CO2 within minutes, the kidneys adjust bicarbonate over hours to days; compensation doesn't mean the problem is fixed. | Standard physiology; Berend et al., NEJM 2014 | "Hours to days" for renal compensation. |
| breathe-normally | Breathing rate and depth change PaCO2 within minutes, so anxious fast breathing can change the result. A distractor mentions about 0.08 pH per 10 mmHg in acute changes. | Standard physiology; AARC CPG 2013 (sampling at steady state) | The 0.08 figure is a common rule of thumb; it only appears in a wrong answer about too much detail. |
| oxygen-down | The team gives the oxygen that's needed and not more, because extra oxygen that isn't needed isn't helpful; pulse oximetry keeps watching. | Common practice of titrating oxygen to a target saturation | Keep it general; targets differ by patient and policy. |
| press-site | Hold pressure at least 5 minutes after an arterial puncture, longer on anticoagulants (often 10 to 15); arteries are under more pressure than veins. | Common nursing and respiratory care procedure guidance | Your facility's timing. |
| watch-for | Report bleeding, swelling, numbness, tingling, coldness, or a pale or bluish hand; mild soreness or a small bruise is common. | Common nursing guidance; MedlinePlus (throbbing or slight bruising that goes away) | Completeness of the list. |
| family-check | Check the patient is okay with results being shared before explaining them to a visitor; offer the provider for questions about how the patient is doing. | HIPAA basics on sharing with family when the patient agrees | Wording; facility policy on what nurses may explain. |
| family-explain | With permission: ask what they've been told, explain the one main point in plain words, say what happens next. Example values 7.31 / 58 / 28 are consistent with Henderson-Hasselbalch. | AHRQ Health Literacy Universal Precautions Toolkit; ask-tell-ask practice | — |
| teach-back | Teach-back (asking the patient to say it in their own words) checks the explanation, not the patient; "Do you understand?" doesn't. | AHRQ Health Literacy Universal Precautions Toolkit, Tool 5, "Use the Teach-Back Method" | — |
| finger-clip | A pulse oximeter estimates oxygen saturation only; an ABG also measures PaCO2 and pH. | AARC CPG 2013; standard practice | — |

## The plain-words glossary

pH, carbon dioxide (PaCO2), bicarbonate (HCO3), oxygen (PaO2, SaO2), acidosis, alkalosis and compensation, in
`GLOSSARY` in `app/js/talk.js`. Acidosis and alkalosis are described by the pH (below 7.35, above 7.45) to keep them
simple, which glosses over the acidosis/acidemia distinction on purpose.

## The numbers the calculation topics use

- Normal ranges: pH 7.35–7.45, PaCO2 35–45 mmHg, HCO3 22–26 mEq/L, PaO2 80–100 mmHg, SaO2 95–100% (common nursing
  ranges; MedlinePlus gives slightly different ones and says labs vary).
- Henderson-Hasselbalch: pH = 6.1 + log10(HCO3 ÷ (0.03 × PaCO2)).
- Winters' formula: expected PaCO2 = 1.5 × HCO3 + 8 ± 2 (Albert, Dell and Winters, Ann Intern Med 1967).
- Metabolic alkalosis: expected PaCO2 = 40 + 0.7 × (HCO3 − 24) ± 2.
- Respiratory acidosis: HCO3 up about 1 (acute) or 3.5 (chronic) per 10 mmHg PaCO2 above 40; respiratory alkalosis:
  down about 2 (acute) or 4 (chronic, "about 4 to 5") per 10 mmHg below 40, with ±2 used to decide "as expected".
  Sources differ on the chronic factors (3.5 or 4, and 4 or 5).
- Anion gap = Na − (Cl + HCO3), normal about 8–12 mEq/L (labs vary; Kraut and Madias 2007); albumin-corrected gap =
  AG + 2.5 × (4 − albumin g/dL) (Figge et al. 1998; some sources use 2.3).
- P/F ratio = PaO2 ÷ FiO2 (as a fraction); 300 or less is one of the Berlin criteria for ARDS (JAMA 2012).
- Hypoxemia is only "low", with no mild/moderate/severe bands, because the cutoffs differ between sources.
- Random SaO2 values come from the PaO2 through Severinghaus's equation (J Appl Physiol 1979), so they're plausible.

## Things a reviewer might want changed

- Whether the default normal ranges match the programs most students are in.
- The chronic compensation factors (3.5 and 4).
- The timing in the press-site card ("at least five minutes", "longer" on blood thinners) and whether to name one.
- Any card where the "best" answer still sounds too clinical for a real patient.
