/// Fish Audio TTS tool for OpenCode plugin.
/// Generates speech from text, optimized for Chinese. Saves audio files.

import { tool } from "@opencode-ai/plugin/tool";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Fish Audio API constants
// ---------------------------------------------------------------------------

const FISH_API_BASE = "https://api.fish.audio";

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listFishVoices = tool({
  description: `List available Fish Audio voice models. Use to find reference_id values.
Requires FISH_API_KEY environment variable.`,
  args: {
    page: tool.schema
      .number()
      .optional()
      .describe("Page number. Defaults to 1."),
    page_size: tool.schema
      .number()
      .optional()
      .describe("Results per page. Defaults to 20."),
    title: tool.schema
      .string()
      .optional()
      .describe("Filter by model title keyword."),
  },
  async execute(args) {
    const apiKey = process.env.FISH_API_KEY;
    if (!apiKey) {
      return "Error: FISH_API_KEY environment variable is not set. Get a key from https://fish.audio/";
    }

    const params = new URLSearchParams();
    params.set("page", String(args.page ?? 1));
    params.set("page_size", String(args.page_size ?? 20));
    if (args.title) params.set("title", args.title);

    const response = await fetch(`${FISH_API_BASE}/model?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return `Error: Fish Audio API (${response.status}): ${await response.text()}`;
    }

    const data = (await response.json()) as {
      items: Array<{
        _id: string;
        title: string;
        description?: string;
        languages?: string[];
      }>;
      total: number;
    };

    const lines = data.items.map((m) => {
      const langs = m.languages?.join(",") ?? "?";
      return `  ${m._id} | ${m.title} | ${langs} | ${m.description?.substring(0, 40) ?? ""}`;
    });

    return [
      `Found ${data.total} voice models (showing ${data.items.length}):`,
      `  model_id | title | langs | description`,
      `  ${"─".repeat(75)}`,
      ...lines,
    ].join("\n");
  },
});

export const generateVoiceFish = tool({
  description: `Generate speech using Fish Audio TTS. Best for Chinese.
Converts text to audio and saves the file.
Requires FISH_API_KEY environment variable.`,
  args: {
    text: tool.schema.string().describe("The text to convert to speech."),
    reference_id: tool.schema
      .string()
      .describe("Fish Audio voice model ID. Find one with list_fish_voices."),
    filename: tool.schema
      .string()
      .describe("Output filename without extension."),
    output_dir: tool.schema
      .string()
      .optional()
      .describe("Output directory relative to project root. Defaults to project root."),
    format: tool.schema
      .string()
      .optional()
      .describe('Audio format: "mp3", "wav", "opus". Defaults to "mp3".'),
    bitrate: tool.schema
      .number()
      .optional()
      .describe("Audio bitrate in kbps. Defaults to 128."),
  },
  async execute(args, ctx) {
    const apiKey = process.env.FISH_API_KEY;
    if (!apiKey) {
      return "Error: FISH_API_KEY environment variable is not set. Get a key from https://fish.audio/";
    }

    const format = args.format ?? "mp3";

    ctx.metadata({ title: `Fish TTS: ${args.filename}` });

    const requestBody: Record<string, unknown> = {
      text: args.text,
      reference_id: args.reference_id,
      format,
    };
    if (args.bitrate) {
      requestBody.bitrate = args.bitrate;
    }

    const response = await fetch(`${FISH_API_BASE}/v1/tts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: "s2-pro",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      return `Error: Fish Audio API (${response.status}): ${err}`;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    const outputDir = args.output_dir
      ? join(ctx.worktree, args.output_dir)
      : ctx.worktree;
    await mkdir(outputDir, { recursive: true });

    const ext = format === "opus" ? "ogg" : format;
    const outputPath = join(outputDir, `${args.filename}.${ext}`);
    await writeFile(outputPath, audioBuffer);

    const relPath = args.output_dir
      ? `${args.output_dir}/${args.filename}.${ext}`
      : `${args.filename}.${ext}`;

    ctx.metadata({ title: `Done: ${args.filename}` });

    return [
      `Voice generated via Fish Audio.`,
      `  File: ${relPath}`,
      `  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`,
      `  Format: ${format} | Model: s2-pro`,
    ].join("\n");
  },
});
