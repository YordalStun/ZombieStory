import type { DialogueScript } from "@/core/dialogue/DialogueTypes";

export const NIGHT_BROADCAST: DialogueScript = [
  { speaker: "NEWSLINE", text: "...and if you're just joining us, we continue to follow the situation developing across the region tonight." },
  { speaker: "MARCUS WELL — NEWSLINE", text: "Officials are calling it a 'rapidly spreading viral outbreak' — though no one in the medical community agrees on what that actually means." },
  { speaker: "SARAH KIM — NEWSLINE", text: "What we can tell you is what you're seeing behind me. Footage from the city centre, where bystanders were forced to restrain individuals showing, quote, 'extreme aggressive behaviour.'" },
  { speaker: "SARAH KIM — NEWSLINE", text: "The Department of Health has not confirmed reports that the infected don't respond to pain." },
  { speaker: "MARCUS WELL — NEWSLINE", text: "Local hospitals are reporting overcrowding as A&E departments fill with bite and scratch victims. The Home Office has deployed the Army to two counties as a, quote, 'precautionary measure.'" },
  { speaker: "MARCUS WELL — NEWSLINE", text: "We'll stay on air as long as we can. If you're just tuning in... lock your doors." },
];

export const MORNING_BROADCAST: DialogueScript = [
  { speaker: "NEWSLINE", text: "If you're just waking up — and I understand many of you did not sleep — here's what changed overnight." },
  { speaker: "MARCUS WELL — NEWSLINE", text: "The outbreak officials wouldn't name last night now has a name. They're calling it 'HV-1.'" },
  { speaker: "MARCUS WELL — NEWSLINE", text: "Three more counties are under mandatory shelter orders as of five a.m. The motorway south of the city is closed in both directions." },
  { speaker: "NEWSLINE", text: "If you must leave home this morning, officials are asking that you avoid the city centre entirely and stay near main roads." },
  { speaker: "MARCUS WELL — NEWSLINE", text: "We'll remain on air as long as we're able. If you have somewhere safer to be than here — go." },
];
