import readline from "readline";

export function impossible(_: never): never {
  throw new Error("impossible");
}

export async function waitMinutes(minutes: number, fudgeWeight: number = 0.0): Promise<void> {
  const fudge = fudgeWeight * Math.random();
  const fudgedMin = minutes + fudge;
  const fullSec = Math.floor(fudgedMin * 60);
  const partMin = Math.floor(fullSec / 60);
  const partSec = fullSec % 60;
  console.log(new Date().toLocaleString());
  console.log(`waiting ${partMin} minutes and ${partSec} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, fullSec * 1000));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function getInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, async (input) => {
      resolve(input);
    });
  });
}

export function oneOfRandom<T>(array: T[]): T {
  console.assert(array.length > 0);
  const x = array[Math.floor(Math.random() * array.length)];
  return x!;
}

export function trimEmptyLines(text: string): string {
  return text.split("\n").filter((line) => line.trim().length > 0).join("\n");
}

export function countLines(text: string): number {
  return text.split("\n").length;
}

export async function launchCountdown(seconds: number): Promise<void> {
  console.log(`making call to openai api in ${seconds} seconds...`);
  for (let i = seconds; i > 0; --i) {
    console.log(`  t-minus ${i} seconds`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("launching!");
}
