import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";
import fs from "fs";
import dotenv from "dotenv";
import { oneOfRandom, trimEmptyLines, impossible, countLines, getInput, waitMinutes, launchCountdown } from "./utils";
import { createPreHistory } from "./directive";
import { getTopics } from "./topics";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("API key not found. Please set it in the .env file.");
  process.exit(1);
}

const openai = new OpenAIApi(new Configuration({
  apiKey: apiKey,
}));

export enum HistoryMode {
  interactive,
  oneShot,
}

async function getGpt4Response(history: ChatCompletionRequestMessage[]): Promise<string> {
  let temperature = 1.0;
  let top_p = 1.0;
  const die = oneOfRandom([0, 1, 2, 3]);
  if (die === 0) {
    temperature = oneOfRandom([1.05, 1.1]);
  } else if (die === 1) {
    top_p = oneOfRandom([0.9, 0.95]);
  }
  temperature = 1.0;
  top_p = 1.0;
  console.log("");
  console.log("");
  console.log(`temperature=${temperature}`);
  console.log(`top_p=${top_p}`);
  console.log(`history.length=${history.length}`);
  console.log("");
  console.log("");

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: history,
    temperature: temperature,
    top_p: top_p,
  });

  const choices = response.data.choices;
  if (!choices || choices.length === 0) {
    throw new Error("No choices found in response.");
  }
  return choices[0]?.message?.content!;
}

async function smokeTest() {
  const history: ChatCompletionRequestMessage[] = [
    {
      "role": "user",
      "content": "Give me a single name.",
    },
  ];
  console.log("");
  console.log("");
  console.log("Prompt: Give me a single name.")
  const response = await getGpt4Response(history);
  console.log(response);
  console.log("");
  console.log("");
}

function isNonHelpful(text: string): boolean {
  text = text.toLowerCase();
  if (!text.includes("sorry")) {
    return false;
  }
  if (!text.includes("assist")) {
    return false;
  }
  if (!text.includes("can't") || !text.includes("can not") || !text.includes("cannot")) {
    return false;
  }
  return true;
}

async function generatePrompts() {
  const filename = "prompts.txt";
  const topics = getTopics();

  for (let i = 0; i < topics.length; ++i) {
    const topic = topics[i];
    console.log(`${i}: ${topic}`);
  }
  console.log(`topic count: ${topics.length}`)
  console.log("");

  let history = createPreHistory();
  const goAskGpt = async (input: string, mode: HistoryMode) => {
    switch (mode) {
      case HistoryMode.interactive:
        break;
      case HistoryMode.oneShot:
        history = createPreHistory();
        break;
      default:
        impossible(mode);
    }
    history.push({
      "role": "user",
      "content": input,
    });
    let output = await getGpt4Response(history);
    output = trimEmptyLines(output);
    history.push({
      "role": "assistant",
      "content": output,
    });
    console.log("");
    console.log("");
    console.log(output);
    console.log("");
    console.log("");

    if (isNonHelpful(output)) {
      console.log("Non-helpful response detected. Aborting.");
      console.log(`input: ${input}`);
      console.log("Fix the prompt and try again.")
      if (false as boolean) {
        process.exit(1);
      }
      else {
        return 100000;
      }
    }

    let content = `\n\n\n[[${input}]]\n${output}\n`
    fs.appendFileSync(filename, content);

    return countLines(output);
  }

  if (false as boolean) {
    await smokeTest();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (false as boolean) {
    while (true) {
      const input = await getInput("> ");
      await goAskGpt(input, HistoryMode.interactive);
    }
  } else {
    let startingTopic: number | null = null;
    if (startingTopic === null) {
      startingTopic = parseInt(fs.readFileSync("topicIndex.txt", "utf8"));
    }
    if (startingTopic === null || isNaN(startingTopic)) {
      throw new Error("startingTopic is null or NaN");
    }
    const topicCount = topics.length;
    for (let topicIndex = startingTopic; topicIndex < topicCount; ++topicIndex) {
      const topic = topics[topicIndex];
      const maxAttempts = 5;
      // socket hangup is common at promptCount = 100
      let promptCount = 70;
      let success = false;
      for (let attempt = 0; attempt < maxAttempts; ++attempt) {
        try {
          console.assert(!success);
          console.assert(promptCount >= 40);
          console.log(new Date().toLocaleString());
          console.log(`Prompt count: ${promptCount}`);
          console.log(`Topic index: ${topicIndex}/${topicCount}`);
          console.log(`Topic: ${topic}`);
          const input = `Give me ${promptCount} ${topic}`;
          await launchCountdown(10);
          const lineCount = await goAskGpt(input, HistoryMode.oneShot);
          success = lineCount >= 0.8 * promptCount;
          if (!success) {
            console.log(`Got ${lineCount} lines, expected ${promptCount} lines.`);
            success = lineCount >= 0.5 * promptCount;
            if (success) {
              console.log(`Waiting before continuing.`);
            }
            else {
              console.log(`Waiting before trying again.`);
            }
            await waitMinutes((success ? 10 : 20) - 3, 6);
            if (!success) {
              continue;
            }
          }
          fs.writeFileSync("topicIndex.txt", `${topicIndex + 1}`);
          break;
        } catch (error) {
          console.error(error);
          if (error && "response" in (error as any)) {
            const response = (error as any).response;
            if (response && "status" in response) {
              const status = response.status;
              if (status === 400) {
                console.log("Bad request.");
                await waitMinutes(9, 3);
              }
              else if (status === 401) {
                console.log(new Date().toLocaleString());
                throw new Error("Unauthorized");
              }
              else if (status === 429) {
                console.log("Rate limit exceeded.");
                await waitMinutes(attempt == 0 ? 5 : 10, 3);
              }
              else if (status === 503) {
                console.log("Service unavailable.");
                await waitMinutes(10, 5);
              }
              else {
                console.log("Unknown response status.");
                await waitMinutes(10, 5);
              }
            }
            else {
              console.log("Unknown response.");
              await waitMinutes(2, 4);
            }
          }
          else {
            console.log("Unknown error without response.");
            await waitMinutes(1, 0.2);
          }
          console.log(new Date().toLocaleString());
          console.log(`Retrying... ${attempt + 1}/${maxAttempts}`);
          promptCount -= 5;
          if (false as boolean) {
            smokeTest();
            await waitMinutes(0, 0.5);
          }
        }
      }
      if (!success) {
        console.log(new Date().toLocaleString());
        console.error(`Failed to generate prompts for ${topic}`);
        throw new Error(`Failed to generate prompts for ${topic}`);
      }

      // sleep to avoid rate limit
      // await waitMinutes(0.9, 0.2);
      console.log(new Date().toLocaleString());
      console.log("");
      console.log("");
    }
    startingTopic = 0;
    fs.writeFileSync("topicIndex.txt", `${startingTopic}`);
  }
}

async function main() {
  await waitMinutes(0);

  const maxEpochs = 1;
  let epoch = 0;
  while (true) {
    try {
      await generatePrompts();
    }
    catch (error) {
      console.error(error);
      await waitMinutes(25, 1);
      continue;
    }
    console.log("");
    console.log(`Epoch ${epoch} complete.`);
    if (epoch >= maxEpochs) {
      break;
    }
    console.log("");
    await waitMinutes(10, 1);
    ++epoch;
  }
  console.log("main() completed successfully.");
}

// misc unrelated note: SizeNet
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
