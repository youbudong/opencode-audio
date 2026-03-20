# opencode-audio

An [OpenCode](https://opencode.ai) plugin that adds AI audio generation tools — music via [Suno](https://suno.com) and text-to-speech via [ElevenLabs](https://elevenlabs.io) and [Fish Audio](https://fish.audio).

## Tools

| Tool | Description |
|------|-------------|
| `generate_music` | Generate AI music with Suno (async polling, saves `.mp3`) |
| `generate_voice_elevenlabs` | Text-to-speech with ElevenLabs (multilingual) |
| `list_elevenlabs_voices` | Browse available ElevenLabs voices |
| `generate_voice_fish` | Text-to-speech with Fish Audio (best for Chinese) |
| `list_fish_voices` | Browse available Fish Audio voice models |

## Install

```bash
npm install opencode-audio
```

Add to your `opencode.json`:

```json
{
  "plugins": {
    "audio": "opencode-audio"
  }
}
```

### Local development

Clone this repo into your project and point to it:

```json
{
  "plugins": {
    "audio": "./path/to/opencode-audio"
  }
}
```

## Configuration

Set API keys as environment variables (e.g. in `.env`):

```bash
# Music generation (Suno)
SUNO_API_KEY=your-key-here        # https://sunoapi.org

# Voice generation (use one or both)
ELEVENLABS_API_KEY=your-key-here  # https://elevenlabs.io
FISH_API_KEY=your-key-here        # https://fish.audio
```

Each tool checks for its required key at runtime and returns a helpful error if missing.

## Usage

Once installed, the tools are available to the AI assistant automatically.

### Generate music

> Generate epic orchestral background music, save to assets/audio/

The `generate_music` tool accepts:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `track_id` | Yes | Output filename (without extension) |
| `prompt` | Yes | Text description of the music |
| `style` | Yes | Genre/style tags (e.g. `"epic orchestral, cinematic, 90 bpm"`) |
| `output_dir` | No | Output directory relative to project root |
| `instrumental` | No | Instrumental only, no vocals (default: `true`) |
| `model` | No | Suno model: `"V4"`, `"V4_5"`, `"V4_5ALL"` (default: `"V4_5ALL"`) |

### Text-to-speech (ElevenLabs)

> List available voices, then generate "Welcome aboard" with a deep male voice

| Parameter | Required | Description |
|-----------|----------|-------------|
| `text` | Yes | Text to convert to speech |
| `voice_id` | Yes | ElevenLabs voice ID (find via `list_elevenlabs_voices`) |
| `filename` | Yes | Output filename (without extension) |
| `output_dir` | No | Output directory relative to project root |
| `model_id` | No | TTS model (default: `"eleven_multilingual_v2"`) |
| `stability` | No | Voice stability 0.0–1.0 (default: `0.5`) |
| `similarity_boost` | No | Similarity boost 0.0–1.0 (default: `0.75`) |
| `style` | No | Style exaggeration 0.0–1.0 (default: `0.4`) |
| `format` | No | `"mp3_44100_128"`, `"opus"`, `"pcm_44100"` (default: `"mp3_44100_128"`) |

### Text-to-speech (Fish Audio)

> Generate Chinese speech "你好世界" using Fish Audio

| Parameter | Required | Description |
|-----------|----------|-------------|
| `text` | Yes | Text to convert to speech |
| `reference_id` | Yes | Fish Audio voice model ID (find via `list_fish_voices`) |
| `filename` | Yes | Output filename (without extension) |
| `output_dir` | No | Output directory relative to project root |
| `format` | No | `"mp3"`, `"wav"`, `"opus"` (default: `"mp3"`) |
| `bitrate` | No | Audio bitrate in kbps (default: `128`) |

## Development

```bash
npm install
npm run typecheck   # Type-check without emitting
npm run build       # Compile to dist/
```

## License

MIT
