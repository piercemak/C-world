#!/usr/bin/env python3
"""Create the single-title HLS pilot package used by The Drama.

This intentionally creates one video rendition and two audio renditions. It
does not alter the source file. The generated folder can be uploaded under the
catalog item's hlsPrefix.
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def run(command):
    print("+", " ".join(str(part) for part in command))
    subprocess.run(command, check=True)


def probe_audio(ffprobe, input_path):
    result = subprocess.run(
        [ffprobe, "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=codec_name,channels,channel_layout",
         "-of", "json", str(input_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    streams = json.loads(result.stdout or "{}").get("streams", [])
    if not streams:
        raise RuntimeError("The input file has no audio stream.")
    return streams[0]


def package(input_path, output_dir, subtitle_path=None, ffmpeg="ffmpeg", ffprobe="ffprobe"):
    input_path = Path(input_path).expanduser().resolve()
    output_dir = Path(output_dir).expanduser().resolve()
    if not input_path.is_file():
        raise RuntimeError(f"Input file was not found: {input_path}")
    if output_dir.exists() and any(output_dir.iterdir()):
        raise RuntimeError(f"Output folder is not empty: {output_dir}")

    audio = probe_audio(ffprobe, input_path)
    source_codec = str(audio.get("codec_name", "")).lower()
    source_channels = int(audio.get("channels") or 0)
    if source_codec not in {"aac", "eac3", "ac3"} or source_channels < 2:
        raise RuntimeError(
            "The pilot expects a multichannel AAC, AC-3, or E-AC-3 source "
            f"audio track; found {audio.get('codec_name', 'unknown')} with "
            f"{audio.get('channels', 'unknown')} channel(s)."
        )

    video_dir = output_dir / "video"
    aac_dir = output_dir / "audio" / "aac"
    surround_dir = output_dir / "audio" / "surround"
    for directory in (video_dir, aac_dir, surround_dir):
        directory.mkdir(parents=True, exist_ok=True)

    common = [ffmpeg, "-y", "-hide_banner", "-loglevel", "warning", "-i", str(input_path)]
    hls = ["-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod",
           "-hls_segment_type", "fmp4", "-hls_fmp4_init_filename", "init.mp4"]

    run(common + ["-map", "0:v:0", "-an", "-c:v", "copy", *hls,
                  "-hls_segment_filename", str(video_dir / "seg_%05d.m4s"),
                  str(video_dir / "index.m3u8")])

    run(common + ["-map", "0:a:0", "-vn", "-c:a", "copy", *hls,
                  "-hls_segment_filename", str(surround_dir / "seg_%05d.m4s"),
                  str(surround_dir / "index.m3u8")])

    run(common + ["-map", "0:a:0", "-vn", "-c:a", "aac", "-profile:a", "aac_low",
                  "-b:a", "192k", "-ac", "2", "-ar", "48000", *hls,
                  "-hls_segment_filename", str(aac_dir / "seg_%05d.m4s"),
                  str(aac_dir / "index.m3u8")])

    surround_channels = str(source_channels)
    surround_name = {
        "aac": "AAC Surround",
        "ac3": "AC-3 Surround",
        "eac3": "E-AC-3 Surround",
    }[source_codec]
    master = f"""#EXTM3U
#EXT-X-VERSION:7
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="AAC Stereo",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,CHANNELS="2",URI="audio/aac/index.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="{surround_name}",LANGUAGE="en",DEFAULT=NO,AUTOSELECT=NO,CHANNELS="{surround_channels}",URI="audio/surround/index.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AUDIO="audio"
video/index.m3u8
"""
    (output_dir / "master.m3u8").write_text(master, encoding="utf-8")

    if subtitle_path:
        subtitle = Path(subtitle_path).expanduser().resolve()
        if not subtitle.is_file():
            raise RuntimeError(f"Subtitle file was not found: {subtitle}")
        subtitle_dir = output_dir / "subtitles"
        subtitle_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(subtitle, subtitle_dir / subtitle.name)

    print(f"HLS pilot package created at {output_dir}")
    print("Upload this folder beneath: thedrama/hls/")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--subtitle")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    try:
        package(args.input, args.output, args.subtitle, args.ffmpeg, args.ffprobe)
    except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"HLS pilot failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
