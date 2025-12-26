#!/usr/bin/env python3
"""
STS Futures Marketing Video Generator
Creates a professional marketing video from dashboard screenshots
"""

import subprocess
import os
from pathlib import Path

# Video settings
FPS = 30
RESOLUTION = "1920x1080"
DURATION_PER_SCENE = 3  # seconds per scene
TRANSITION_DURATION = 0.5  # seconds for fade transition

# Asset directory
ASSETS_DIR = Path("/home/ubuntu/intraday-dashboard/video-assets")
OUTPUT_VIDEO = ASSETS_DIR / "sts_futures_demo.mp4"

# Scene sequence with timing (scene_file, duration_seconds, description)
SCENES = [
    ("title-card.png", 3, "Title card - STS Futures intro"),
    ("scene1-homepage-hero.png", 4, "Homepage hero with stats"),
    ("scene2-features-section.png", 3, "Features overview"),
    ("scene2-overview-dashboard.png", 4, "Portfolio Overview dashboard"),
    ("scene3-overview-all-time.png", 3, "All-time performance"),
    ("scene4-strategies-page.png", 4, "Strategies listing"),
    ("scene5-strategy-detail.png", 3, "Strategy detail view"),
    ("scene6-compare-page.png", 4, "Strategy comparison"),
    ("scene7-correlation-matrix.png", 3, "Correlation analysis"),
    ("scene8-my-dashboard.png", 3, "Personal dashboard"),
    ("scene9-admin-panel.png", 4, "Admin control center"),
    ("scene10-webhook-setup.png", 3, "Webhook configuration"),
    ("cta-card.png", 4, "Call to action - pricing"),
]

def create_video():
    """Create the marketing video using ffmpeg"""
    
    # Create input file list for ffmpeg concat
    concat_file = ASSETS_DIR / "concat_list.txt"
    
    # First, resize all images to consistent resolution and create video segments
    segments = []
    
    for i, (scene_file, duration, desc) in enumerate(SCENES):
        scene_path = ASSETS_DIR / scene_file
        if not scene_path.exists():
            print(f"Warning: {scene_file} not found, skipping...")
            continue
            
        segment_file = ASSETS_DIR / f"segment_{i:02d}.mp4"
        segments.append(segment_file)
        
        print(f"Processing scene {i+1}/{len(SCENES)}: {desc}")
        
        # Create video segment from image with zoom effect
        # Using zoompan filter for subtle Ken Burns effect
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(scene_path),
            "-vf", f"scale={RESOLUTION}:force_original_aspect_ratio=decrease,pad={RESOLUTION}:(ow-iw)/2:(oh-ih)/2:color=black,zoompan=z='min(zoom+0.0005,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={duration*FPS}:s={RESOLUTION}:fps={FPS}",
            "-c:v", "libx264",
            "-t", str(duration),
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            str(segment_file)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error processing {scene_file}: {result.stderr}")
            # Fallback to simple scaling without zoompan
            cmd_simple = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(scene_path),
                "-vf", f"scale={RESOLUTION}:force_original_aspect_ratio=decrease,pad={RESOLUTION}:(ow-iw)/2:(oh-ih)/2:color=black",
                "-c:v", "libx264",
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                "-preset", "fast",
                str(segment_file)
            ]
            subprocess.run(cmd_simple, capture_output=True)
    
    # Create concat file
    with open(concat_file, 'w') as f:
        for seg in segments:
            if seg.exists():
                f.write(f"file '{seg}'\n")
    
    print(f"\nConcatenating {len(segments)} segments...")
    
    # Concatenate all segments with crossfade transitions
    # For simplicity, we'll use concat demuxer first
    cmd_concat = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        str(OUTPUT_VIDEO)
    ]
    
    result = subprocess.run(cmd_concat, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"\n✅ Video created successfully: {OUTPUT_VIDEO}")
        print(f"   Duration: ~{sum(d for _, d, _ in SCENES)} seconds")
        
        # Get file size
        size_mb = OUTPUT_VIDEO.stat().st_size / (1024 * 1024)
        print(f"   File size: {size_mb:.1f} MB")
    else:
        print(f"Error creating video: {result.stderr}")
    
    # Cleanup segment files
    print("\nCleaning up temporary files...")
    for seg in segments:
        if seg.exists():
            seg.unlink()
    if concat_file.exists():
        concat_file.unlink()
    
    return OUTPUT_VIDEO.exists()

if __name__ == "__main__":
    print("=" * 60)
    print("STS Futures Marketing Video Generator")
    print("=" * 60)
    print()
    
    success = create_video()
    
    if success:
        print("\n🎬 Video generation complete!")
    else:
        print("\n❌ Video generation failed")
