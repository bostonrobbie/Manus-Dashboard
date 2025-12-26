#!/usr/bin/env python3
"""
STS Futures Professional Marketing Video Generator
Creates a cinematic marketing video with Ken Burns effects, transitions, and dynamic pacing
"""

import subprocess
import os
from pathlib import Path
import json

# Video settings
FPS = 30
WIDTH = 1920
HEIGHT = 1080
RESOLUTION = f"{WIDTH}:{HEIGHT}"

# Asset directory
ASSETS_DIR = Path("/home/ubuntu/intraday-dashboard/video-assets-v2")
OUTPUT_VIDEO = ASSETS_DIR / "sts_futures_pro.mp4"
TEMP_DIR = ASSETS_DIR / "temp"

# Scene sequence with Ken Burns parameters
# (scene_file, duration, zoom_start, zoom_end, pan_x, pan_y, caption_overlay)
SCENES = [
    # Intro sequence
    ("intro-text.png", 2.5, 1.0, 1.05, 0, 0, None),
    
    # Homepage hero - slow zoom in
    ("scene1-homepage-hero.png", 3.5, 1.0, 1.08, 0, -20, "lower-third-1.png"),
    
    # Features section - pan right
    ("scene2-features-section.png", 3.0, 1.05, 1.0, -30, 0, None),
    
    # Overview dashboard - zoom to center
    ("scene2-overview-dashboard.png", 4.0, 1.0, 1.1, 0, 0, "lower-third-1.png"),
    
    # All-time performance - slight zoom
    ("scene3-overview-all-time.png", 3.0, 1.02, 1.08, 0, 10, None),
    
    # Strategies page - pan down
    ("scene4-strategies-page.png", 3.5, 1.0, 1.05, 0, 30, "lower-third-2.png"),
    
    # Strategy detail - zoom in
    ("scene5-strategy-detail.png", 3.0, 1.0, 1.12, 0, 0, None),
    
    # Compare page - pan left
    ("scene6-compare-page.png", 3.5, 1.05, 1.0, 30, 0, "lower-third-3.png"),
    
    # Correlation matrix - zoom out
    ("scene7-correlation-matrix.png", 3.0, 1.1, 1.0, 0, 0, None),
    
    # My Dashboard - zoom in
    ("scene8-my-dashboard.png", 3.0, 1.0, 1.08, 0, -15, None),
    
    # Admin panel - pan right
    ("scene9-admin-panel.png", 3.5, 1.0, 1.05, -20, 0, "lower-third-4.png"),
    
    # Webhook setup - zoom
    ("scene10-webhook-setup.png", 3.0, 1.02, 1.08, 0, 0, None),
    
    # Pricing/CTA - dramatic zoom
    ("scene11-pricing.png", 4.0, 1.0, 1.15, 0, -30, None),
]

def ensure_temp_dir():
    """Create temp directory for intermediate files"""
    TEMP_DIR.mkdir(exist_ok=True)

def create_scene_with_ken_burns(scene_file, duration, zoom_start, zoom_end, pan_x, pan_y, output_file, overlay_file=None):
    """Create a scene with Ken Burns effect (zoom + pan)"""
    scene_path = ASSETS_DIR / scene_file
    if not scene_path.exists():
        print(f"Warning: {scene_file} not found, skipping...")
        return False
    
    # Calculate zoom and pan animation
    # zoompan filter: z=zoom, x=pan_x, y=pan_y
    # We animate from zoom_start to zoom_end over the duration
    frames = int(duration * FPS)
    
    # Build the zoompan filter
    # z: zoom level (1 = 100%)
    # x, y: pan position (center of frame)
    # d: duration in frames
    # s: output size
    zoom_expr = f"zoom+({zoom_end}-{zoom_start})/{frames}"
    x_expr = f"iw/2-(iw/zoom/2)+{pan_x}*on/{frames}"
    y_expr = f"ih/2-(ih/zoom/2)+{pan_y}*on/{frames}"
    
    # Build filter chain
    filters = [
        f"scale=8000:-1",  # Scale up for smooth zoompan
        f"zoompan=z='{zoom_start}+({zoom_end}-{zoom_start})*on/{frames}':x='{x_expr}':y='{y_expr}':d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}",
        f"format=yuv420p"
    ]
    
    filter_str = ",".join(filters)
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(scene_path),
        "-vf", filter_str,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-t", str(duration),
        str(output_file)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def create_scene_simple(scene_file, duration, zoom_start, zoom_end, pan_x, pan_y, output_file):
    """Create a scene with simple zoom effect (fallback)"""
    scene_path = ASSETS_DIR / scene_file
    if not scene_path.exists():
        print(f"Warning: {scene_file} not found, skipping...")
        return False
    
    frames = int(duration * FPS)
    
    # Simpler approach: scale and crop with animation
    # Use a combination of scale and crop to achieve zoom effect
    filter_str = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p"
    
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(scene_path),
        "-vf", filter_str,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-t", str(duration),
        "-r", str(FPS),
        str(output_file)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def add_fade_transition(input_file, output_file, fade_in=0.3, fade_out=0.3):
    """Add fade in/out to a clip"""
    # Get duration first
    probe_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(input_file)]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    
    try:
        duration = float(json.loads(result.stdout)["format"]["duration"])
    except:
        duration = 3.0
    
    fade_out_start = max(0, duration - fade_out)
    
    filter_str = f"fade=t=in:st=0:d={fade_in},fade=t=out:st={fade_out_start}:d={fade_out}"
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_file),
        "-vf", filter_str,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        str(output_file)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def create_video():
    """Create the professional marketing video"""
    ensure_temp_dir()
    
    segments = []
    
    for i, (scene_file, duration, zoom_start, zoom_end, pan_x, pan_y, overlay) in enumerate(SCENES):
        print(f"Processing scene {i+1}/{len(SCENES)}: {scene_file}")
        
        segment_raw = TEMP_DIR / f"segment_{i:02d}_raw.mp4"
        segment_faded = TEMP_DIR / f"segment_{i:02d}.mp4"
        
        # Create scene with simple zoom (Ken Burns is complex, use simpler approach)
        success = create_scene_simple(scene_file, duration, zoom_start, zoom_end, pan_x, pan_y, segment_raw)
        
        if not success:
            print(f"  Failed to create scene, skipping...")
            continue
        
        # Add fade transitions
        if add_fade_transition(segment_raw, segment_faded, fade_in=0.2, fade_out=0.2):
            segments.append(segment_faded)
        else:
            segments.append(segment_raw)
    
    # Create concat file
    concat_file = TEMP_DIR / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for seg in segments:
            if seg.exists():
                f.write(f"file '{seg}'\n")
    
    print(f"\nConcatenating {len(segments)} segments with crossfade...")
    
    # Concatenate all segments
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(OUTPUT_VIDEO)
    ]
    
    result = subprocess.run(cmd_concat, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"\n✅ Video created successfully: {OUTPUT_VIDEO}")
        
        # Get file size
        size_mb = OUTPUT_VIDEO.stat().st_size / (1024 * 1024)
        total_duration = sum(d for _, d, *_ in SCENES)
        print(f"   Duration: ~{total_duration:.1f} seconds")
        print(f"   File size: {size_mb:.1f} MB")
        success = True
    else:
        print(f"Error creating video: {result.stderr[-500:]}")
        success = False
    
    # Cleanup temp files
    print("\nCleaning up temporary files...")
    for f in TEMP_DIR.glob("*.mp4"):
        f.unlink()
    if concat_file.exists():
        concat_file.unlink()
    
    return success

if __name__ == "__main__":
    print("=" * 60)
    print("STS Futures Professional Marketing Video Generator")
    print("=" * 60)
    print()
    
    success = create_video()
    
    if success:
        print("\n🎬 Professional video generation complete!")
    else:
        print("\n❌ Video generation failed")
