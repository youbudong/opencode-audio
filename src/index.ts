/// OpenCode audio generation plugin.
/// Provides AI music generation (Suno) and text-to-speech (ElevenLabs, Fish Audio).

import type { Plugin } from "@opencode-ai/plugin";
import { generateMusic } from "./suno.js";
import { generateVoiceElevenLabs, listElevenLabsVoices } from "./elevenlabs.js";
import { generateVoiceFish, listFishVoices } from "./fish-audio.js";

export const AudioPlugin: Plugin = async (_ctx) => {
  return {
    tool: {
      generate_music: generateMusic,
      generate_voice_elevenlabs: generateVoiceElevenLabs,
      list_elevenlabs_voices: listElevenLabsVoices,
      generate_voice_fish: generateVoiceFish,
      list_fish_voices: listFishVoices,
    },
  };
};
