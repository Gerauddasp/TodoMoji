import { exec } from "child_process";
import OpenAI from "openai";
import dotenv from "dotenv";
import { run } from "@jxa/run";
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} - ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "logfile.log"),
    }),
  ],
});

// Load environment variables
dotenv.config();

// Set up OpenAI API client
const client = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

// Function to run JXA script to get tasks from Things 3
function getTodosFromThings() {
  return new Promise((resolve, reject) => {
    exec("osascript -l JavaScript get_todos.js", (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(JSON.parse(stdout));
      }
    });
  });
}

// Function to check if a string contains an emoji
function containsEmoji(text) {
  const emojiRegex = /\p{Extended_Pictographic}/u;
  return emojiRegex.test(text);
}

// Function to request emoji suggestions from OpenAI API
async function requestEmojiFromChatGPT(taskName) {
  try {
    const prompt = `Here is a task:<BEGIN>${taskName}</END>
    # Context:
    I would like you to add emojis to make it more fun and engaging. The text should either be in French or English.

    # Please improve the task text by following these rules:
    1. Replace words with relevant emojis where it's obvious
    Examples:
    Pizza -> 🍕
    Sun -> ☀️
    Calendar -> 📅

    Counter examples:
    Meeting -> 📅 (wrong)
    Report -> ✍️ (wrong)


    2. When in doubt add the emoji next to the word.
    Examples:
    Add meeting for next week -> Add meeting 📅 for next week
    Write a report about the meeting -> Write a report ✍️ about the meeting 📅

    Counter examples:
    Write a report about the meeting -> Write a ✍️ about the 📅
    Add meeting for next week -> Add 📅 for next week
    
    3. Never replace the first word of the task.
    Examples:
    Write a report about the meeting -> Write a report ✍️ about the meeting 📅
    Add meeting for next week -> Add meeting 📅 for next week

    Counter examples:
    Write a report about the meeting -> ✍️ a report about the meeting 📅
    Add meeting for next week -> 📅 meeting for next week
    
    3. On top of replacing words with emojis, also add ONE additional emoji at !!!EITHER!!! the beginning or end of the task to visually complement it (but do not add more than one extra emoji).
    Examples:
    Write a report about the meeting -> Write a report about the meeting 📅
    Write a report about the meeting -> ✍️ Write a report about the meeting 

    Counter examples:
    Write a report about the meeting -> ✍️ Write a report about the meeting 📅

    4. Only respond with the updated task text, without any additional context or explanation.
    
    Now apply these rules to the task: <BEGIN>${taskName}</END>`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // You can use GPT-4 or another model if preferred
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error("Error with OpenAI API:", error);
    return null;
  }
}

async function updateTaskInThings(taskId, newName) {
  // Use JXA to update the task in Things
  try {
    await run(
      (taskId, newName) => {
        const Things = Application("Things3");
        const task = Things.toDos().find((todo) => todo.id() === taskId);
        task.name = newName;
      },
      taskId,
      newName
    );
    logger.info(`Updated task ID ${taskId} -> ${newName}`);
  } catch (error) {
    logger.error(`Error updating task with JXA: ${error}`);
  }
}

// Main function to check and update tasks
async function main() {
  try {
    // Fetch all to-dos from Things 3 (IDs and names)
    const todos = await getTodosFromThings();
    const checkedTasks = new Set();

    for (let { id, name } of todos) {
      if (!checkedTasks.has(id)) {
        // If the task doesn't contain an emoji, request a suggestion from OpenAI
        if (!containsEmoji(name)) {
          // Request emoji suggestion
          const suggestedTask = await requestEmojiFromChatGPT(name);
          if (suggestedTask) {
            // Update task in Things 3 using the task ID and the Things URL Scheme
            updateTaskInThings(id, suggestedTask);
          }
        } else {
          logger.debug(`Task already has emoji: ${name}`);
        }

        // Mark the task as checked
        checkedTasks.add(id);
      }
    }
  } catch (error) {
    logger.error(error);
  }
}

// Run the script
main();
