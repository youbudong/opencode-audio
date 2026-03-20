/// OpenCode audio generation plugin.
/// Provides AI music generation (Suno) and text-to-speech (ElevenLabs, Fish Audio).

import type { Plugin } from "@opencode-ai/plugin";
import { createGenerateMusic, createDownloadMusic } from "./suno.js";
import { createGenerateVoiceElevenLabs, createListElevenLabsVoices } from "./elevenlabs.js";
import { createGenerateVoiceFish, createListFishVoices } from "./fish-audio.js";

export const AudioPlugin: Plugin = async (_ctx) => {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ?? "";
  const fishApiKey = process.env.FISH_API_KEY ?? "";
  const sunoApiKey = process.env.SUNO_API_KEY ?? "";

  return {
    tool: {
      generate_music: createGenerateMusic(sunoApiKey),
      download_music: createDownloadMusic(sunoApiKey),
      generate_voice_elevenlabs: createGenerateVoiceElevenLabs(elevenLabsApiKey),
      list_elevenlabs_voices: createListElevenLabsVoices(elevenLabsApiKey),
      generate_voice_fish: createGenerateVoiceFish(fishApiKey),
      list_fish_voices: createListFishVoices(fishApiKey),
    },
  };
};
