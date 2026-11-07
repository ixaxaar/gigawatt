// Narrative content schema. The text lives in story-data.ts; story.ts (engine) plays it.

/** Effects a dilemma choice applies. All optional; amounts are applied once when the choice is made. */
export interface StoryEffect {
  /** One-off cash change in USD (negative = you pay). Keep within about +/- 12% of a mid-game cash pile: -3000000 .. 6000000. */
  cash?: number;
  /** Reputation change, -10 .. +10. */
  rep?: number;
  /** Staff headcount change, -2 .. +3. */
  staff?: number;
  /** Multiplier on the utility rate for the rest of the game, 0.9 .. 1.15 (1 = unchanged). */
  utility?: number;
}

export interface DilemmaChoice {
  /** Button text, 2-5 words. */
  label: string;
  /** What happens, 1-2 sentences, past tense, shown in the log after choosing. */
  outcome: string;
  effect: StoryEffect;
}

export interface Dilemma {
  id: string;
  /** Game years (2021..2028) the card can appear in. */
  fromYear: number;
  toYear: number;
  title: string;
  /** Setup, 2-4 sentences, second person. */
  text: string;
  /** Exactly two choices; neither should be clearly dominant. */
  choices: [DilemmaChoice, DilemmaChoice];
}

export interface Chapter {
  /** Calendar year the card is shown (January). */
  year: number;
  /** Short title, 2-5 words. */
  title: string;
  /** 2-4 sentences setting the scene for the coming year, grounded in what that year was like for AI infrastructure. */
  text: string;
}

export interface RivalProfile {
  id: string;
  name: string;
  /** One-line personality. */
  bio: string;
  /** Headline templates. Use {rival} for the name; each is one sentence. */
  moves: string[];
  /** Headline templates for when the player is doing well (reputation >= 60). */
  reactsToYou: string[];
}

export interface CustomerVoice {
  /** Customer names exactly as they appear in the CUSTOMERS list of src/sim/market.ts. */
  customer: string;
  /** One short quote when they renew. */
  renews: string;
  /** One short quote when they leave unhappy. */
  leaves: string;
}
