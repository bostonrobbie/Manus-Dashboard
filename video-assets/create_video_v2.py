#!/usr/bin/env python3
"""
STS Futures Marketing Video Generator v2
Creates a professional marketing video from dashboard screenshots
"""

import subprocess
import os
from pathlib import Path

# Video settings
FPS = 30
WIDTH = 1920
HEIGHT = 1080
RESOLUTION = f"{WIDTH}:{HEIGHT}"

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
    
    segments = []
    
    for i, (scene_file, duration, desc) in enumerate(SCENES):
        scene_path = ASSETS_DIR / scene_file
        if not scene_path.exists():
            print(f"Warning: {scene_file} not found, skipping...")
            continue
            
        segment_file = ASSETS_DIR / f"segment_{i:02d}.mp4"
        segments.append(segment_file)
        
        print(f"Processing scene {i+1}/{len(SCENES)}: {desc}")
        
        # Simple approach: scale to fit, pad with black, no zoompan
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(scene_path),
            "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black",
            "-c:v", "libx264",
            "-t", str(duration),
            "-pix_fmt", "yuv420p",
            "-r", str(FPS),
            "-preset", "fast",
            str(segment_file)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error processing {scene_file}")
            print(f"stderr: {result.stderr[-500:] if len(result.stderr) > 500 else result.stderr}")
            return False
    
    # Create concat file
    concat_file = ASSETS_DIR / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for seg in segments:
            if seg.exists():
                f.write(f"file '{seg}'\n")
    
    print(f"\nConcatenating {len(segments)} segments...")
    
    # Concatenate all segments
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
        
        # Get file size
        size_mb = OUTPUT_VIDEO.stat().st_size / (1024 * 1024)
        total_duration = sum(d for _, d, _ in SCENES)
        print(f"   Duration: ~{total_duration} seconds")
        print(f"   File size: {size_mb:.1f} MB")
        success = True
    else:
        print(f"Error creating video: {result.stderr[-500:]}")
        success = False
    
    # Cleanup segment files
    print("\nCleaning up temporary files...")
    for seg in segments:
        if seg.exists():
            seg.unlink()
    if concat_file.exists():
        concat_file.unlink()
    
    return success

if __name__ == "__main__":
    print("=" * 60)
    print("STS Futures Marketing Video Generator v2")
    print("=" * 60)
    print()
    
    success = create_video()
    
    if success:
        print("\n🎬 Video generation complete!")
    else:
        print("\n❌ Video generation failed")
