/// Suno music generation tool for OpenCode plugin.
/// Generates AI music via Suno API and saves audio files to the project.

import { tool } from "@opencode-ai/plugin/tool";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Suno API constants
// ---------------------------------------------------------------------------

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 30; // 5 minutes max wait

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export function createGenerateMusic(apiKey: string) {
  return tool({
  description: `Generate AI music using Suno AI.
Provide a text prompt describing the music and a style/genre tag.
Saves generated audio files to the specified output directory.`,
  args: {
    track_id: tool.schema
      .string()
      .describe(
        "Track identifier used as the output filename (without extension)."
      ),
    prompt: tool.schema
      .string()
      .describe(
        "Text description of the music to generate."
      ),
    style: tool.schema
      .string()
      .describe(
        'Genre/style tags (e.g. "epic orchestral, sci-fi, cinematic, 90 bpm").'
      ),
    output_dir: tool.schema
      .string()
      .optional()
      .describe(
        "Output directory relative to project root. Defaults to the project root."
      ),
    instrumental: tool.schema
      .boolean()
      .optional()
      .describe("Whether to generate instrumental only (no vocals). Defaults to true."),
    model: tool.schema
      .string()
      .optional()
      .describe('Suno model version. Options: "V4", "V4_5", "V4_5ALL". Defaults to "V4_5ALL".'),
  },
  async execute(args, ctx) {
    const instrumental = args.instrumental !== false;
    const model = args.model ?? "V4_5ALL";
    const title = args.track_id.replace(/_/g, " ");

    // --- Step 1: Submit generation request ---
    ctx.metadata({ title: `Generating: ${args.track_id}` });

    const genResponse = await fetch(`${SUNO_API_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: args.prompt,
        customMode: true,
        style: args.style,
        title,
        instrumental,
        model,
      }),
    });

    if (!genResponse.ok) {
      const err = await genResponse.text();
      return `Error: Suno API (${genResponse.status}): ${err}`;
    }

    const genData = (await genResponse.json()) as {
      code: number;
      data: { taskId: string };
    };
    const taskId = genData.data?.taskId;
    if (!taskId) {
      return `Error: No taskId returned: ${JSON.stringify(genData)}`;
    }

    // --- Step 2: Poll for completion ---
    ctx.metadata({ title: `Waiting: ${args.track_id} (task: ${taskId})` });

    let audioUrl: string | null = null;
    let duration: number | null = null;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      if (ctx.abort.aborted) return "Generation cancelled.";

      const pollResponse = await fetch(
        `${SUNO_API_BASE}/generate/record-info?taskId=${taskId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!pollResponse.ok) continue;

      const pollData = (await pollResponse.json()) as {
        data: {
          status: string;
          response?: { data?: Array<{ audio_url: string; duration: number }> };
        };
      };

      if (pollData.data.status === "SUCCESS") {
        const tracks = pollData.data.response?.data;
        if (tracks && tracks.length > 0) {
          audioUrl = tracks[0].audio_url;
          duration = tracks[0].duration;
        }
        break;
      } else if (pollData.data.status === "FAILED") {
        return `Error: Suno generation failed for "${args.track_id}".`;
      }
    }

    if (!audioUrl) {
      return `Error: Timed out waiting for music generation (task: ${taskId}).`;
    }

    // --- Step 3: Download and save ---
    ctx.metadata({ title: `Downloading: ${args.track_id}` });

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return `Error: Failed to download audio: ${audioResponse.status}`;
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    const outputDir = args.output_dir
      ? join(ctx.worktree, args.output_dir)
      : ctx.worktree;
    await mkdir(outputDir, { recursive: true });

    const outputPath = join(outputDir, `${args.track_id}.mp3`);
    await writeFile(outputPath, audioBuffer);

    const relPath = args.output_dir
      ? `${args.output_dir}/${args.track_id}.mp3`
      : `${args.track_id}.mp3`;

    ctx.metadata({ title: `Done: ${args.track_id}` });

    return [
      `Music generated and saved.`,
      `  File: ${relPath}`,
      `  Duration: ${duration ? `${Math.round(duration)}s` : "unknown"}`,
      `  Style: ${args.style}`,
      `  Model: ${model}`,
    ].join("\n");
  },
  });
}
