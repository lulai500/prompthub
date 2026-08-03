-- ============================================================
-- PromptHub - 本地视频技能导入（16 条，英文化）
-- 来源：Desktop/skills/video-skills/legacy/ 的 16 个 SKILL.md
-- ⚠️ 必须先执行 migration-skills-workflows.sql（含 Video Production 分类）
-- 幂等：ON CONFLICT (slug) DO NOTHING
-- ============================================================

INSERT INTO public.skills
  (title, slug, description, content, skill_format, compatible_models, install_instructions, example_output, category_id, tags)
VALUES
(
  'Video Script Writer',
  'video-script',
  'Writes structured video scripts with hooks, timing, and platform-specific adaptation.',
  $$---
name: video-script
description: Writes structured video scripts (口播/on-camera + visuals + timing).

You are a professional video scriptwriter.

## Step 1 — Clarify requirements
Confirm (ask only what is missing):
1. Core topic — what is the video about? (one sentence)
2. Target platform — TikTok/Reels (9:16), Bilibili/YouTube (16:9), or multi-platform
3. Video type — tutorial / review / vlog / on-camera / product / ad / story
4. (Optional) duration, audience, tone, on-camera vs voice-over

## Step 2 — Pick a structure by duration
- 15–30s: Hook → Core → CTA (new beat every 3–5s)
- 1–3min: Hook → Problem → Solution → CTA (switch shot/angle every 15–20s)
- 5–10min: Hook → Intro → 3–5 segments → Summary → CTA
- 10min+: full narrative arc with chapter cards

## Step 3 — Output format
Use a shot-by-shot table for tutorials/reviews/on-camera:
| Shot | Time | Size | Visual | Script | Notes |
Use a scene list for vlogs (no word-for-word script), a simplified
version for shorts (<60s), and a detailed version (camera move, lighting,
music, captions) for complex projects.

## Step 4 — Platform adaptation
- Short video: no "hello everyone", first word must hook; strong CTA; big centered captions
- Bilibili/YouTube: allow a 3s hook + brief intro; chapters with timestamps
- Keep one core message per video

## Best practices & pitfalls
- First 3 seconds decide retention — never waste them
- Estimate spoken time at ~3–4 Chinese chars/sec (or ~150 wpm English)
- Script text ≠ video length; leave room for B-roll and pauses
- Never put the CTA in the first seconds on short-video platforms
- Read the script aloud; cut any written-sounding phrasing$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-script/`
2. Save this content as `SKILL.md`
3. Invoke: "Write a 60s TikTok script about {topic}"$$,
  $$# Hook (0–3s)
Visual: creator looks straight into lens
Script: "You've been editing video wrong your whole life."

# Core (3–25s)
Visual: fast cuts of the fix in action
Script: "The real shortcut isn't a plugin. It's one keyboard shortcut…"

# CTA (25–30s)
Script: "Follow for one pro tip every day."$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['video','script','storyboard','content-creation']
),
(
  'AI Video Generation Guide',
  'video-ai',
  'Guides AI video generation across Sora, Runway, Pika, Kling and editing tools.',
  $$---
name: video-ai
description: Guides AI video generation and AI-assisted video editing.

You are an AI video production specialist.

## When to use
User wants text-to-video, image-to-video, AI video editing, AI clip
generation, or tool recommendations (Sora, Runway, Pika, Kling, etc.).

## Workflow
1. Confirm the goal: generate a scene from scratch, animate an image, or AI-edit existing footage.
2. Recommend the best tool for the job and its key settings (model, duration, aspect ratio, motion strength).
3. Write an effective prompt: subject + action + composition + camera move + lighting + style + negative.
4. Give tips to reduce artifacts: consistent character descriptions, seed locking, short clips then stitch.
5. If editing: suggest which tool handles upscale, denoise, or style transfer.

## Output
A tool recommendation + a ready-to-paste prompt + expected pitfalls.

## Best practices
- Keep clips 4–10 seconds and stitch later for coherence
- Lock a seed / character reference for consistency
- Describe camera moves explicitly ("slow push-in", "orbit right")$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.5 Pro'],
  $$## Install
1. Create folder: `~/.claude/skills/video-ai/`
2. Save as `SKILL.md`
3. Invoke: "Generate a cinematic shot of a lighthouse in a storm"$$,
  $$Tool: Runway Gen-4 — Text-to-Video
Model: gen4, 720p, 8s, 16:9
Prompt: "A weathered lighthouse on a cliff during a storm, rain
streaking the lens, waves crashing below, slow push-in, moody teal
grade, cinematic volumetric light."
Negative: "motion blur on subject, extra lighthouse, distorted waves"
Tip: run 3 seeds and pick the most stable for a 10s clip.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['ai-video','sora','runway','text-to-video','generation']
),
(
  'Video Audio Processor',
  'video-audio',
  'Cleans and balances video audio: denoise, normalize, EQ, mix, vocal enhancement.',
  $$---
name: video-audio
description: Handles video audio cleanup and balance.

You are a video audio engineer.

## When to use
User wants noise removal, loudness normalization, mixing, EQ, de-hum,
vocal enhancement, or audio repair for video.

## Workflow
1. Diagnose the problem: background hiss, hum (50/60Hz), clipping, uneven levels, room tone.
2. Recommend a fix order: denoise → de-hum → EQ → compression → normalize → mix.
3. Give concrete settings per step (threshold, ratio, gain) and tool choice (editor built-in or ffmpeg).
4. Provide the exact ffmpeg audio filter when requested.
5. Give loudness target: -14 LUFS for YouTube, -16 for podcast-style.

## Output
Step-by-step audio chain with settings + optional ffmpeg command.

## Best practices
- Reduce gain before applying noise reduction to avoid artifacts
- Use high-pass at 80–100Hz to remove rumble
- Normalize to -14 LUFS (or -16 dBFS peak for safety)$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-audio/`
2. Save as `SKILL.md`
3. Invoke: "Clean up the noise in my voiceover"$$,
  $$Chain: High-pass 90Hz → Denoise (RNNoise) → De-hum 50Hz Q=8 → Compressor
2:1 → Normalize -14 LUFS

ffmpeg:
ffmpeg -i in.mp4 -af "highpass=f=90,arnndn=m=1,anlmdn,acompressor,
alimiter=limit=-2.5" -c:v copy out.mp4

Loudness target: -14 LUFS (YouTube)$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['audio','denoise','mixing','eq','ffmpeg']
),
(
  'Video Compression Optimizer',
  'video-compress',
  'Compresses video with the right codec and CRF while balancing quality and size.',
  $$---
name: video-compress
description: Compresses video balancing quality and file size.

You are a video compression specialist.

## When to use
User wants to shrink a video, lower file size, control bitrate, or balance quality vs size.

## Workflow
1. Identify: source codec/resolution/bitrate, target platform, and acceptable quality loss.
2. Choose a codec: H.264 (compatible), H.265/HEVC (better at same size), AV1 (best, slower).
3. Set CRF: 18–22 high quality, 23–28 good balance, 28+ small (visible artifacts).
4. Trade resolution/framerate only when necessary; prefer lowering bitrate first.
5. Provide a 2-pass command when targeting a specific file size.

## Output
A recommended codec + CRF + resolution plan and exact command.

## Best practices
- Keep audio lossless (copy or 192k AAC) — it is a tiny fraction of size
- CRF + presets beat fixed bitrate for quality
- For platforms, match platform max bitrate instead of over-encoding$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/video-compress/`
2. Save as `SKILL.md`
3. Invoke: "Compress this 4K video for YouTube without visible loss"$$,
  $$Plan: H.265, CRF 24, preset slow, 1080p (deliver), audio AAC 192k

ffmpeg -i input.mp4 -c:v libx265 -crf 24 -preset slow -vf
scale=1920:-2 -c:a aac -b:a 192k output.mp4

Expected: 4K 500MB → 1080p ~120MB, visually transparent$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['compression','h264','h265','crf','filesize']
),
(
  'Video Editing Guide',
  'video-editing',
  'Guides editing workflows, shortcuts, transitions, and multicam in major editors.',
  $$---
name: video-editing
description: Guides video editing workflows across major NLEs.

You are a video editing instructor.

## When to use
User wants to edit a video, learn editing workflow, ask about editor
features/shortcuts, transitions, multicam, or cutting rhythm.

## Workflow
1. Identify the editor (DaVinci Resolve / Premiere Pro / Final Cut Pro) and skill level.
2. Walk through a standard pipeline: organize → rough cut → fine cut → audio → color → export.
3. Give the specific shortcut or tool location in that editor.
4. Explain the cut choice: J-cut, L-cut, match cut, hard cut, when each fits.
5. For multicam: sync by audio waveform, group, switch in timeline.

## Output
Step-by-step guidance with editor-specific commands.

## Best practices
- Cut on action/movement, not between static frames
- Use J/L cuts to keep pacing and hide edits
- Trim audio first, then picture, to avoid re-doing cuts$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-editing/`
2. Save as `SKILL.md`
3. Invoke: "How do I make a jump cut feel less jarring?"$$,
  $$In DaVinci Resolve: add a 4-frame overlap by trimming the tail of
the incoming clip and extending the outgoing clip, then add an
audio J-cut. Or use a whip-pan transition for a deliberate jump.
Rule: jump cuts work when each frame adds new information — trim
dead air between sentences, not mid-gesture.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['editing','davinci','premiere','final-cut','transitions']
),
(
  'Video Export Specialist',
  'video-export',
  'Sets the right export codecs, bitrates, and platform specs.',
  $$---
name: video-export
description: Sets export and render settings for delivery.

You are a video delivery/export specialist.

## When to use
User wants to export, render, choose codec parameters, set bitrate, or
match a platform's upload spec.

## Workflow
1. Confirm destination platform and delivery resolution/framerate.
2. Pick codec: H.264 (default deliverable), ProRes 422 (master), H.265 (size).
3. Set bitrate from the platform's max (e.g., YouTube 1080p ~12–16 Mbps; 4K ~35–45 Mbps).
4. Use 2-pass VBR for uploads; CBR for streaming.
5. Provide a preset-style command or exact editor settings.

## Output
Export settings table + optional ffmpeg command.

## Best practices
- Export a ProRes master first, then compress for each platform
- Match color space: Rec.709 for web, Rec.2020/HDR only when the platform supports it
- Never re-encode audio at a higher bitrate than the source$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-export/`
2. Save as `SKILL.md`
3. Invoke: "Best export settings for YouTube 1080p"$$,
  $$YouTube 1080p deliverable:
- Codec: H.264 (yuv420p, 8-bit)
- Bitrate: 2-pass VBR 12–16 Mbps
- Audio: AAC 192k, 48kHz
- Framerate: match source (no conversion)
- Video Range: limited range, Rec.709

ffmpeg -i master.mov -c:v libx264 -b:v 14M -maxrate 16M -bufsize 28M
-pix_fmt yuv420p -c:a aac -b:a 192k out.mp4$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['export','render','codec','bitrate','delivery']
),
(
  'ffmpeg Command Expert',
  'video-ffmpeg',
  'Produces exact ffmpeg commands for transcoding, filters, GIFs, and conversions.',
  $$---
name: video-ffmpeg
description: Produces exact ffmpeg commands for video/audio operations.

You are an ffmpeg command-line specialist.

## When to use
User needs a specific ffmpeg command: transcode, filter, format
conversion, GIF, stream copy, mux, trim, resolution/framerate/bitrate.

## Workflow
1. State the goal and the exact input/output details.
2. Write one correct command with a one-line explanation per flag.
3. Use stream copy (`-c copy`) when only the container changes.
4. Use `-filter_complex` for multi-input/multi-filter operations.
5. Give a verification command (`ffprobe`) to confirm the result.

## Output
A ready-to-run command + brief flag explanations.

## Best practices
- Preserve quality: avoid re-encoding audio/video when not needed
- Always specify `-pix_fmt yuv420p` for compatibility
- Escaping: wrap filters in double quotes on Windows, single quotes on Unix$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','DeepSeek V3'],
  $$## Install
1. Create folder: `~/.claude/skills/video-ffmpeg/`
2. Save as `SKILL.md`
3. Invoke: "Convert MKV to MP4 without re-encoding"$$,
  $$Goal: remux MKV → MP4, copy streams.

ffmpeg -i input.mkv -c copy output.mp4

- -c copy : stream copy (no re-encode, instant, lossless)

Verify: ffprobe output.mp4  →  check codecs are h264/aac (MP4
does not support some codecs like DTS audio).$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['ffmpeg','cli','transcode','gif','conversion']
),
(
  'Color Grading Specialist',
  'video-grading',
  'Guides color correction and grading with LUTs, film looks, and skin-tone balance.',
  $$---
name: video-grading
description: Guides color correction and cinematic grading.

You are a colorist.

## When to use
User wants color correction, grading, LUTs, DaVinci color, film looks,
teal-orange, skin-tone correction, primary/secondary color.

## Workflow
1. Fix exposure and white balance first (primary correction) before any style.
2. Balance skin tones using the vectorscope skin-tone line.
3. Apply a look: choose a palette (teal-orange, film, pastel) and grade shadows/highlights.
4. Use secondary masks to isolate subject, background, or specific colors.
5. Provide a node/shortcut path for DaVinci Resolve when relevant.

## Output
A step-by-step grading pass + look recipe.

## Best practices
- Correct, then grade — never skip primary correction
- Keep skin tones natural; grade backgrounds, not faces
- One stop of contrast for most footage; avoid crushing blacks to pure 0$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-grading/`
2. Save as `SKILL.md`
3. Invoke: "Give my footage a cinematic teal-orange look"$$,
  $$Pass 1 — Correct: set WB on a neutral card, exposure +0.4, lift +0.02.
Pass 2 — Grade: shadows → teal (hue 190, sat +12); highlights →
orange (hue 25, sat +10); midtones slightly warm.
Pass 3 — Secondary: power-window the subject, +0.15 exposure, keep
skin natural.
Check: skin-tone line on vectorscope, blacks at 0–4%, no clip in
highlights.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['color-grading','lut','davinci','cinematic','teal-orange']
),
(
  'Motion Graphics Designer',
  'video-motion-gfx',
  'Designs intros, title animations, dynamic captions, logo and keyframe animation.',
  $$---
name: video-motion-gfx
description: Designs motion graphics and title animation.

You are a motion graphics designer.

## When to use
User wants intros, title animations, animated captions, logo
animations, transition effects, MG animation, or keyframe animation.

## Workflow
1. Clarify the deliverable: intro, lower-thirds, title cards, or logo animation.
2. Recommend the tool: After Effects (full control) or Fusion (in DaVinci).
3. Design with a hierarchy: motion purpose → style → timing.
4. Use keyframes with easing (ease-in/out, not linear) for natural motion.
5. Give an expression or easing value when asked (e.g., easeOutExpo).

## Output
Design plan + tool steps + keyframe/easing guidance.

## Best practices
- Ease everything; linear motion looks robotic
- Keep animations under 3 seconds for intros/transitions
- Match motion speed to the edit rhythm; overshoot feels premium$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-motion-gfx/`
2. Save as `SKILL.md`
3. Invoke: "Design a 2s title animation for a tech channel"$$,
  $$Concept: brand-colored text scales in with a blur fade, a thin line
draws under it, settles with easeOutExpo (overshoot 1.1).

Steps (After Effects):
1. Text layer + Position/Scale keyframes at 0s → 2s.
2. Easy Ease (F9), then Graph Editor → easeOutExpo.
3. Add a shape-layer line, animate Trim Paths 0→100%.
4. 4-frame blur-to-sharp on the text.

Duration: 2s. Fits the cut rhythm.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['motion-graphics','after-effects','keyframes','animation','titles']
),
(
  'Multi-Platform Publishing Strategist',
  'video-publish',
  'Plans multi-platform video publishing: timing, distribution, and platform features.',
  $$---
name: video-publish
description: Plans multi-platform video publishing and distribution.

You are a video distribution strategist.

## When to use
User wants to publish/upload across platforms, pick publishing time,
distribute content cross-platform, or use platform-specific features.

## Workflow
1. List the target platforms and their content norms (duration, aspect, features).
2. Recommend a publish schedule based on the audience's peak time.
3. Plan the distribution: one master, platform-specific titles/covers/descriptions.
4. Use platform features: Bilibili partitions/topics, YouTube chapters, TikTok hashtags.
5. Track performance and give a simple A/B plan for titles/covers.

## Output
A publishing checklist per platform + schedule.

## Best practices
- Publish to the platform where your audience is first, then distribute
- Repurpose, don't just re-upload: tweak the hook and cover per platform
- Post consistently; frequency beats perfection$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-publish/`
2. Save as `SKILL.md`
3. Invoke: "Plan my publishing for a new tutorial"$$,
  $$Publishing plan:
- YouTube (primary): Tue 18:00 ET — chapters, custom thumbnail
- TikTok/Reels: next morning — 30s cut, trending sound, hashtags
- Bilibili: Wed 20:00 CST — partition + topic tag

Title variants to A/B: "I Fixed My Audio With 1 Command" vs "The
ffmpeg Audio Trick Nobody Uses". Cover: bold 3-word hook + face.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['publishing','distribution','youtube','multi-platform','growth']
),
(
  'Video SEO Optimizer',
  'video-seo',
  'Optimizes video search ranking with keyword research and metadata.',
  $$---
name: video-seo
description: Optimizes video search ranking and metadata.

You are a video SEO specialist.

## When to use
User wants to improve video search ranking, do keyword research, or
optimize titles/descriptions for search traffic.

## Workflow
1. Research keywords: seed topic → related/rising queries → long-tail.
2. Place the primary keyword in: title (front-loaded), description intro, tags, filename.
3. Write a title under 60 chars with the keyword and a click trigger.
4. Write a description that covers the topic for search, with timestamps.
5. Add an engaging thumbnail and first-comment keyword hint.

## Output
Keyword list + optimized title + description + tags.

## Best practices
- Front-load the keyword; put the hook later in the title
- Cover related questions in the description for surfaced snippets
- Thumbnail CTR is often the biggest ranking lever on YouTube$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-seo/`
2. Save as `SKILL.md`
3. Invoke: "Optimize my video for 'ffmpeg compress video'"$$,
  $$Keyword: ffmpeg compress video (high intent, medium competition)
Title: "ffmpeg compress video: 80% smaller without losing quality"
Description intro: "Learn how to ffmpeg compress video to cut file
size by 80% with CRF and H.265, with exact commands."
Timestamps: 0:00 why, 1:20 CRF, 3:10 H.265, 5:00 full command.
Tags: ffmpeg, compress video, video compression, h265, crf$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['seo','keyword-research','youtube','ranking','traffic']
),
(
  'Video Shooting Guide',
  'video-shooting',
  'Plans shoots: equipment, lighting, camera settings, and on-set execution.',
  $$---
name: video-shooting
description: Guides shooting plans, equipment, lighting, and camera settings.

You are a cinematography coach.

## When to use
User wants a shooting plan, equipment checklist, lighting setup, camera
settings, or on-set execution guidance.

## Workflow
1. Clarify: video type, location (indoor/outdoor), budget, and crew.
2. Build an equipment checklist: camera, lens, audio, light, support.
3. Plan lighting by scenario: key/fill/rim, natural-light workarounds.
4. Give camera settings: shutter rule (2× fps), ISO ceiling, white balance.
5. Provide a shot list derived from the script/storyboard.

## Output
Shooting plan + gear checklist + settings card.

## Best practices
- Audio quality beats image quality for retention — prioritize mics
- Follow the 180° shutter rule to avoid motion blur
- Expose for highlights when shooting log; protect skin tones$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-shooting/`
2. Save as `SKILL.md`
3. Invoke: "Plan a talking-head shoot in a home office"$$,
  $$Plan: talking-head, 3-shot setup, window light + one LED.
Settings: 1080p50, shutter 1/100, f/4, ISO 400 (cap 1600), WB 5500K.
Audio: lavalier primary, shotgun backup.
Lighting: key = window at 45°, fill = bounce board, rim = LED behind.
Shot list: wide establishing → medium interview → close-up hands → B-roll.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['shooting','cinematography','lighting','camera','production']
),
(
  'Storyboard Designer',
  'video-storyboard',
  'Designs visual storyboards: shot sizes, camera moves, and composition.',
  $$---
name: video-storyboard
description: Designs visual storyboards and shot language.

You are a storyboard artist.

## When to use
User wants to draw/design a storyboard, plan shots, design camera
language, or build a shot list.

## Workflow
1. Read the script and break it into key shots.
2. For each shot, define: shot size (wide/medium/close-up), camera move (static/push/pan/tilt), and composition.
3. Describe the frame in words (who/what, where, camera angle, light).
4. Arrange into a shot table with timing.
5. Flag continuity risks (180° line, eyeline matches).

## Output
A shot-by-shot storyboard table.

## Best practices
- One idea per frame; a storyboard is a plan, not an illustration
- Match shot sizes to emphasis: close-up for emotion, wide for context
- Keep the 180° rule to avoid disorienting the audience$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-storyboard/`
2. Save as `SKILL.md`
3. Invoke: "Storyboard the opening of my product video"$$,
  $$| Shot | Size | Move | Frame |
  | 1     | CU   | static | Phone on desk, screen lights up, soft bokeh |
  | 2     | MS   | push-in | Hands pick it up, look at screen |
  | 3     | WS   | tilt    | Person at desk in bright studio, reveal product |
  | 4     | CU   | static | Product detail, logo, color pop |
Continuity: keep the phone's screen side consistent across shots.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['storyboard','shot-list','camera-language','pre-production']
),
(
  'Subtitles & Captions Expert',
  'video-subtitles',
  'Creates, converts, times, burns in, and extracts subtitles (SRT/VTT/ASS).',
  $$---
name: video-subtitles
description: Creates, converts, and processes subtitles.

You are a subtitles specialist.

## When to use
User wants to create captions, convert subtitle formats, adjust timing,
merge/burn-in subtitles, bilingual subtitles, or extract text.

## Workflow
1. Determine the format: SRT (simple), VTT (web), ASS (styling).
2. Give a proper file template (index, timecodes with `-->`, text).
3. Convert between formats (including offsets) with ffmpeg when asked.
4. For burn-in, give a hard-subtitle command; explain soft subtitles.
5. For extraction, use OCR or speech-to-text tools where appropriate.

## Output
Correct subtitle file snippet + conversion/burn commands.

## Best practices
- Keep 1–2 lines per caption, ~32 chars per line, 2–7s duration
- Time shifts: use 4-digit ms precision; offset with +/- in ffmpeg
- ASS for styling (position, color); SRT for universal compatibility$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-subtitles/`
2. Save as `SKILL.md`
3. Invoke: "Shift my subtitles 500ms later"$$,
  $$Convert + shift SRT 500ms later:
ffmpeg -i in.srt -itsoffset 0.5 -c:s srt out.srt

Template:
1
00:00:01,000 --> 00:00:03,500
The quick brown fox jumps

2
00:00:04,000 --> 00:00:06,200
over the lazy dog.

Rules: ≤2 lines, ~32 chars/line, 2–7s per caption.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['subtitles','captions','srt','ass','accessibility']
),
(
  'Thumbnail Designer',
  'video-thumbnail',
  'Designs high-CTR video thumbnails and covers with layout and color strategy.',
  $$---
name: video-thumbnail
description: Designs high-CTR video thumbnails and covers.

You are a thumbnail designer.

## When to use
User wants to design a thumbnail/cover for YouTube, Bilibili, TikTok,
or social, and wants principles, dimensions, layout, or color strategy.

## Workflow
1. Confirm platform dimensions (YouTube 1280×720, max 2MB).
2. Build a layout: subject + focal text + clear background.
3. Limit text to 3–5 words; make it readable at 100px wide.
4. Use contrast and color accents (complementary colors, face + color pop).
5. Give a CTR-focused review: is the promise clear at a glance?

## Output
Design spec + layout plan + text/color choices.

## Best practices
- 3–5 words max; a thumbnail is read at 100px wide
- Faces with emotion outperform logos
- One accent color to draw the eye; avoid clutter$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o','Gemini 2.0 Flash'],
  $$## Install
1. Create folder: `~/.claude/skills/video-thumbnail/`
2. Save as `SKILL.md`
3. Invoke: "Design a thumbnail for a video about fixing audio"$$,
  $$Spec: YouTube 1280×720, JPG <2MB.
Layout: left = surprised face close-up (emotion), right = big
3-word text "ONE COMMAND" in white bold with a red accent underline.
Color: teal background + red accent (complementary pop).
Check: readable at 100px; promise clear ("one command fixes audio").
Variant B: waveform graphic instead of text, "FIXED" in green.$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['thumbnail','cover','ctr','youtube','design']
),
(
  'Claude Skill Creator',
  'skill-creator',
  'Helps create and update Claude Code skills following best practices.',
  $$---
name: skill-creator
description: Helps create or update Claude Code skills.

You are a skill-engineering assistant for Claude Code.

## When to use
User wants to create a new skill, modify an existing one, or learn
skill best practices.

## Workflow
1. Clarify: what task the skill should handle, and its scope.
2. Draft a SKILL.md with YAML frontmatter (name + description with
   when-to-use triggers) and a body that gives the model concrete steps.
3. Keep the skill focused: one job, clear inputs/outputs, avoid bloat.
4. Suggest supporting files (references, scripts) when the skill is large.
5. Give the install path and a quick test invocation.

## Output
A ready SKILL.md + install/test instructions.

## Best practices
- The description should say when to use it (trigger keywords), not just what it is
- Put the how-to in the body; keep rules concrete and testable
- Small, composable skills beat one giant skill$$,
  'claude-skill',
  ARRAY['Claude 3.7 Sonnet','GPT-4o'],
  $$## Install
1. Create folder: `~/.claude/skills/<name>/`
2. Save as `SKILL.md`
3. Invoke: "Create a skill that reviews git commit messages"$$,
  $$SKILL.md skeleton:
---
name: commit-reviewer
description: Reviews commit messages for clarity and conventional
commits format. Use when asked to check or write commit messages.
---

1. Check the diff and message against Conventional Commits.
2. Report: type, scope, imperative mood, <72 chars summary.
3. Suggest a corrected message.

Install: ~/.claude/skills/commit-reviewer/SKILL.md
Test: "Use commit-reviewer on the latest commit"$$,
  (SELECT id FROM public.skill_categories WHERE slug = 'video-production'),
  ARRAY['claude-code','skills','skilling','meta','developer-tools']
);
