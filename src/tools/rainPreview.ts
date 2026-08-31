/**
 * Dev-only A/B page for the rain beds — open /rain-preview.html with the dev
 * server running. It imports the real synth, so what you hear here is exactly
 * what the game plays; there's no second copy to drift out of sync.
 */
import { synthRain, type RainFlavor } from "@/core/audio/synth";

const FLAVORS: Array<{ flavor: RainFlavor; name: string; blurb: string; bedLevel?: number }> = [
  {
    flavor: "windscreen",
    name: "On the glass",
    blurb: "Dense drop patter over a bed turned right down. Mostly light ticks with fatter, slower drops mixed through.",
  },
  {
    flavor: "windscreen",
    name: "On the glass — drops only",
    blurb: "The same patter with the bed almost gone. Compare against the one above and tell me which side of the two you want.",
    bedLevel: 0.25,
  },
  {
    flavor: "soft",
    name: "Soft / distant",
    blurb: "Muffled, no top end. Rain heard through a closed window — calm enough to sit under for a long scene.",
  },
  {
    flavor: "steady",
    name: "Steady downpour",
    blurb: "Fuller and wetter with real low-end weight, but still no hiss. For standing out in it.",
  },
];

const ctx = new AudioContext();
let current: AudioBufferSourceNode | null = null;

function stop(): void {
  if (current) {
    current.stop();
    current.disconnect();
    current = null;
  }
}

async function play(flavor: RainFlavor, bedLevel = 1): Promise<void> {
  stop();
  await ctx.resume();
  const buffer = await synthRain(8, flavor, bedLevel);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx.destination);
  source.start(0);
  current = source;
}

const root = document.getElementById("root")!;

for (const { flavor, name, blurb, bedLevel } of FLAVORS) {
  const card = document.createElement("section");

  const heading = document.createElement("h2");
  heading.textContent = name;

  const description = document.createElement("p");
  description.textContent = blurb;

  const button = document.createElement("button");
  button.textContent = `Play "${name}" on loop`;
  button.addEventListener("click", () => void play(flavor, bedLevel));

  card.append(heading, description, button);
  root.appendChild(card);
}

const stopButton = document.createElement("button");
stopButton.className = "stop";
stopButton.textContent = "Stop";
stopButton.addEventListener("click", stop);
root.appendChild(stopButton);
