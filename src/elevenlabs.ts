/// ElevenLabs TTS tool for OpenCode plugin.
/// Generates speech from text and saves audio files.

import { tool } from "@opencode-ai/plugin/tool";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// ElevenLabs API constants
// ---------------------------------------------------------------------------

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listElevenLabsVoices = tool({
  description: `List available ElevenLabs voices. Use this to find voice_id values.
Requires ELEVENLABS_API_KEY environment variable.`,
  args: {
    category: tool.schema
      .string()
      .optional()
      .describe('Filter by category: "premade", "cloned", etc. Leave empty for all.'),
  },
  async execute(args) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return "Error: ELEVENLABS_API_KEY environment variable is not set. Get a key from https://elevenlabs.io/";
    }

    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!response.ok) {
      return `Error: ElevenLabs API (${response.status}): ${await response.text()}`;
    }

    const data = (await response.json()) as {
      voices: Array<{
        voice_id: string;
        name: string;
        category: string;
        labels?: Record<string, string>;
      }>;
    };

    let voices = data.voices;
    if (args.category) {
      voices = voices.filter((v) => v.category === args.category);
    }

    const lines = voices.map((v) => {
      const labels = v.labels
        ? Object.entries(v.labels)
            .map(([k, val]) => `${k}=${val}`)
            .join(", ")
        : "";
      return `  ${v.voice_id} | ${v.name} | ${v.category} | ${labels}`;
    });

    return [
      `Found ${voices.length} voices:`,
      `  voice_id | name | category | labels`,
      `  ${"─".repeat(70)}`,
      ...lines,
    ].join("\n");
  },
});

export const generateVoiceElevenLabs = tool({
  description: `Generate speech using ElevenLabs TTS.
Converts text to audio and saves the file.
Requires ELEVENLABS_API_KEY environment variable.`,
  args: {
    text: tool.schema.string().describe("The text to convert to speech."),
    voice_id: tool.schema
      .string()
      .describe("ElevenLabs voice_id. Find one with list_elevenlabs_voices."),
    filename: tool.schema
      .string()
      .describe("Output filename without extension."),
    output_dir: tool.schema
      .string()
      .optional()
      .describe("Output directory relative to project root. Defaults to project root."),
    stability: tool.schema
      .number()
      .optional()
      .describe("Voice stability (0.0-1.0). Defaults to 0.5."),
    similarity_boost: tool.schema
      .number()
      .optional()
      .describe("Similarity boost (0.0-1.0). Defaults to 0.75."),
    style: tool.schema
      .number()
      .optional()
      .describe("Style exaggeration (0.0-1.0). Defaults to 0.4."),
    format: tool.schema
      .string()
      .optional()
      .describe('Output format: "mp3_44100_128", "opus", "pcm_44100". Defaults to "mp3_44100_128".'),
    model_id: tool.schema
      .string()
      .optional()
      .describe('TTS model. Defaults to "eleven_multilingual_v2".'),
  },
  async execute(args, ctx) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return "Error: ELEVENLABS_API_KEY environment variable is not set. Get a key from https://elevenlabs.io/";
    }

    const voiceSettings = {
      stability: args.stability ?? 0.5,
      similarity_boost: args.similarity_boost ?? 0.75,
      style: args.style ?? 0.4,
    };
    const modelId = args.model_id ?? "eleven_multilingual_v2";
    const format = args.format ?? "mp3_44100_128";

    let ext = "mp3";
    if (format.startsWith("opus")) ext = "opus";
    else if (format.startsWith("pcm")) ext = "wav";

    ctx.metadata({ title: `TTS: ${args.filename}` });

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${args.voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: args.text,
          model_id: modelId,
          voice_settings: voiceSettings,
          output_format: format,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return `Error: ElevenLabs API (${response.status}): ${err}`;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    const outputDir = args.output_dir
      ? join(ctx.worktree, args.output_dir)
      : ctx.worktree;
    await mkdir(outputDir, { recursive: true });

    const outputPath = join(outputDir, `${args.filename}.${ext}`);
    await writeFile(outputPath, audioBuffer);

    const relPath = args.output_dir
      ? `${args.output_dir}/${args.filename}.${ext}`
      : `${args.filename}.${ext}`;

    ctx.metadata({ title: `Done: ${args.filename}` });

    return [
      `Voice generated.`,
      `  File: ${relPath}`,
      `  Size: ${(audioBuffer.length / 1024).toFixed(1)} KB`,
      `  Model: ${modelId}`,
    ].join("\n");
  },
});
