
const parameterizableTopics: string[] = [
];

function parameterizeSettings(style: string): string[] {
  const settings = parameterizableTopics.slice();
  for (let i = 0; i < settings.length; i++) {
    settings[i] = `${style} ${settings[i]}`;
  }
  return settings;
}

const topics: string[] = [
  "South American names",
  "Canadian names",
  "Chinese names",
  "Japanese names",
  "Korean names",
  "Italian names",
  "French names",
  "German names",
  "Russian names",
  "Indian names",
  "African names",
  "Middle Eastern names",
  "European names",
  "Spanish names",
  "Portuguese names",
  "American names",
  "Ghetto names",
  "Hillbilly names",
  "Redneck names",
  "White trash names",
  "Black names",
  "Hispanic names",
  "Asian names",
  "Native American names",
  "Arabic names",
  "Muslim names",
  "Jewish names",
  "Christian names",
  "Overly masculine names",
  "Overly feminine names",
  "Over-the-top names",
  "USA names",
  "Famous names",
  "Historical names",
  "Modern names",
  "Western names",
  "Sci-fi names",
  "Fantasy names",
  "Alien names",
  "Futuristic names",
  "Protoss names",
  "Zerg names",
  "Terran names",
  "Jungle names",
  "Creative names",
  "Magic The Gathering names (of people)",
  "Undead names",
];
if (false) {
  topics.push(...parameterizeSettings("foo"));
}

export function getTopics(): string[] {
  return [...topics];
}
