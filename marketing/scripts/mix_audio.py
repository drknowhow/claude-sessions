"""Lays the app's chimes on a quiet procedural pad and muxes the mix into both promo cuts.

Cue frames come from src/timeline.ts via out/cues.json (written by `render.mjs audio`), so
picture and sound share one timeline. Placement is sample-exact on float buses; ffmpeg only
decodes, measures and muxes.

    python -I marketing/scripts/mix_audio.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
OUT = ROOT / "out"
SFX = OUT / "sfx"
SR = 48000
PAD_GAIN = 0.28  # pad sits about 12 dB under the chimes ...
DUCK_GAIN = 0.1  # ... and about 9 dB lower again while one plays
RAMP_S = 0.18
CHIME_RMS = 0.25  # loudest 50 ms of each chime, so a square-wave blip and a sine glass sit level
CHIME_CEIL = 0.56  # onset peaks (the wood knock's noise click above all) are held here
DUCK_TAIL_S = 0.25
TARGET_I = -16.0
TARGET_TP = -1.5
VIDEOS = [
    (OUT / "promo.mp4", REPO / "docs" / "media" / "claude-sessions-promo.mp4"),
    (OUT / "promo-vertical.mp4", REPO / "docs" / "media" / "claude-sessions-promo-vertical.mp4"),
]

# Pad chords, low voicings (Hz) under the chimes (650 Hz and up). Every chord holds the
# marimba's E or G, so the needs and done chimes never sound wrong against it.
C3, D3, E3, F3, G3, A3, B3 = 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94
C2, F2, G2, A2 = 65.41, 87.31, 98.0, 110.0
CHORDS = {
    "Cmaj9": ([C2], [C3, G3, B3, D3 * 2, E3 * 2]),
    "Am9": ([A2], [A2 * 2, E3, G3, B3, C3 * 2]),
    "Fmaj9": ([F2], [F3, A3, C3 * 2, E3 * 2, G3 * 2]),
    "G6": ([G2], [G3, B3, D3 * 2, E3 * 2]),
}
# Chord per scene: settle, lift at the tray, open up for the sounds, lean in for the jump, home.
SCENE_CHORD = {
    "tabs": "Cmaj9", "waiting": "Cmaj9", "tray": "Am9", "hover": "Am9",
    "sounds": "Fmaj9", "jump": "G6", "toast": "Cmaj9", "end": "Cmaj9",
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def fade_edges(x: np.ndarray, ms: float = 12.0) -> np.ndarray:
    n = min(len(x), int(SR * ms / 1000))
    if n == 0:
        return x
    x = x.copy()
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    x[:n] *= ramp
    x[-n:] *= ramp[::-1]
    return x


def level(x: np.ndarray) -> np.ndarray:
    """Scale so the loudest 50 ms window has CHIME_RMS, then hold onsets under CHIME_CEIL."""
    w = int(0.05 * SR)
    sq = np.convolve(x.astype(np.float64) ** 2, np.ones(w) / w, mode="valid")
    rms = float(np.sqrt(sq.max())) or 1.0
    return limit(x * (CHIME_RMS / rms), CHIME_CEIL)


def limit(x: np.ndarray, ceiling: float, ms: float = 4.0) -> np.ndarray:
    """Look-ahead peak limiter: a min-filtered gain smoothed by a box no wider than the
    filter, so the gain at every sample is at or under what that sample needs."""
    w = int(SR * ms / 1000)
    need = np.minimum(1.0, ceiling / np.maximum(np.abs(x.astype(np.float64)), 1e-9))
    lo = np.lib.stride_tricks.sliding_window_view(np.pad(need, w, constant_values=1.0), 2 * w + 1).min(axis=1)
    g = np.convolve(np.pad(lo, w, mode="edge"), np.ones(2 * w + 1) / (2 * w + 1), mode="valid")
    return (x * g).astype(np.float32)


def voice(freq: float, t: np.ndarray, seed: int) -> np.ndarray:
    """Two sines a few cents apart plus soft 2nd/3rd partials: warm, slow beating, no edges."""
    rng = np.random.default_rng(seed)
    ph = rng.uniform(0, 2 * np.pi, 4)
    cents = 4.0
    lo, hi = freq * 2 ** (-cents / 1200), freq * 2 ** (cents / 1200)
    x = np.sin(2 * np.pi * lo * t + ph[0]) + np.sin(2 * np.pi * hi * t + ph[1])
    x += 0.22 * np.sin(2 * np.pi * 2 * freq * t + ph[2])
    x += 0.07 * np.sin(2 * np.pi * 3 * freq * t + ph[3])
    # A slow swell per voice so the chord breathes.
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * rng.uniform(0.05, 0.11) * t + rng.uniform(0, 2 * np.pi))
    return x


def pad(total: int, scenes: list, fps: int) -> np.ndarray:
    t = np.arange(total, dtype=np.float64) / SR
    # Merge consecutive scenes on the same chord into one segment.
    segs: list[list] = []
    for s in scenes:
        chord = SCENE_CHORD[s["id"]]
        start, end = s["from"] / fps, (s["from"] + s["dur"]) / fps
        if segs and segs[-1][0] == chord:
            segs[-1][2] = end
        else:
            segs.append([chord, start, end])
    xfade = 1.6
    out = np.zeros(total, dtype=np.float64)
    for i, (chord, start, end) in enumerate(segs):
        # Raised-cosine window that overlaps its neighbours by xfade seconds.
        a, b = max(0.0, start - xfade / 2), min(total / SR, end + xfade / 2)
        env = np.zeros(total)
        m = (t >= a) & (t < b)
        env[m] = 1.0
        if i > 0:
            r = (t >= a) & (t < a + xfade)
            env[r] = 0.5 - 0.5 * np.cos(np.pi * (t[r] - a) / xfade)
        if i < len(segs) - 1:
            r = (t >= b - xfade) & (t < b)
            env[r] = 0.5 + 0.5 * np.cos(np.pi * (t[r] - (b - xfade)) / xfade)
        bass, notes = CHORDS[chord]
        sig = np.zeros(total)
        idx = np.nonzero(env)[0]
        tt = t[idx]
        for k, f in enumerate(notes):
            sig[idx] += voice(f, tt, seed=1000 * i + k) / len(notes)
        for f in bass:
            sig[idx] += 0.35 * np.sin(2 * np.pi * f * tt)
        out += sig * env
    # Soft fade in over the first 1.2 s.
    n = int(1.2 * SR)
    out[:n] *= np.linspace(0.0, 1.0, n)
    out /= np.max(np.abs(out)) or 1.0
    return out.astype(np.float32)


def loudness(wav: Path) -> dict:
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af",
         f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA=11:print_format=json", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    ).stderr
    return json.loads(r[r.rindex("{"): r.rindex("}") + 1])


def write_wav(path: Path, mono: np.ndarray) -> None:
    stereo = np.repeat(mono[:, None], 2, axis=1).astype(np.float32).tobytes()
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-",
         "-c:a", "pcm_s24le", str(path)],
        input=stereo, check=True,
    )


def main() -> None:
    spec = json.loads((OUT / "cues.json").read_text(encoding="utf-8"))
    fps = spec["fps"]
    total = int(round(spec["frames"] / fps * SR))
    repeat = int(round(spec["needsRepeatFrames"] / fps * SR))

    clips: dict[str, np.ndarray] = {}
    chimes = np.zeros(total, dtype=np.float32)
    active = np.zeros(total, dtype=bool)
    for cue in spec["cues"]:
        name = cue["sound"]
        if name not in clips:
            clips[name] = level(fade_edges(decode(SFX / f"{name}.wav")))
        clip = clips[name]
        start = int(round(cue["frame"] / fps * SR))
        for s in [start, start + repeat] if cue["kind"] == "needs" else [start]:
            e = min(total, s + len(clip))
            chimes[s:e] += clip[: e - s]
            active[s: min(total, e + int(DUCK_TAIL_S * SR))] = True

    bed = pad(total, spec["scenes"], fps)
    tail = int(1.5 * SR)
    bed[-tail:] *= np.linspace(1.0, 0.0, tail, dtype=np.float32)

    # Ducking envelope: full pad gain between chimes, DUCK_GAIN under them, smoothed.
    env = np.where(active, DUCK_GAIN, PAD_GAIN).astype(np.float32)
    k = int(RAMP_S * SR)
    env = np.convolve(env, np.ones(k, dtype=np.float32) / k, mode="same").astype(np.float32)
    mix = bed * env + chimes
    peak = float(np.max(np.abs(mix))) or 1.0
    if peak > 0.98:
        mix *= 0.98 / peak

    raw_wav = OUT / "promo-mix-raw.wav"
    write_wav(raw_wav, mix)

    # Loudness: aim for the template's -16 LUFS / -1.5 dBTP, but as one linear gain so the
    # chime transients are not squashed. If the true-peak ceiling binds first, the mix lands
    # quieter than -16 instead of being limited.
    m = loudness(raw_wav)
    gain_db = min(TARGET_I - float(m["input_i"]), TARGET_TP - float(m["input_tp"]))
    mix_wav = OUT / "promo-mix.wav"
    write_wav(mix_wav, (mix * 10 ** (gain_db / 20)).astype(np.float32))
    f = loudness(mix_wav)
    print(f"mix: {f['input_i']} LUFS integrated, {f['input_tp']} dBTP, LRA {f['input_lra']} "
          f"(gain {gain_db:+.2f} dB)")

    for src, dst in VIDEOS:
        if not src.exists():
            print("skip (not rendered):", src.name)
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-i", str(mix_wav), "-map", "0:v:0", "-map", "1:a:0",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(dst)],
            check=True,
        )
        print(dst)


if __name__ == "__main__":
    main()
