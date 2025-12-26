#!/usr/bin/env python3
"""
STS Futures Final Marketing Video Assembler
Combines AI-generated cinematic clips with dashboard screenshots
"""

import subprocess
from pathlib import Path

ASSETS_DIR = Path("/home/ubuntu/intraday-dashboard/video-assets-v2")
TEMP_DIR = ASSETS_DIR / "temp_final"
OUTPUT_VIDEO = ASSETS_DIR / "sts_futures_final.mp4"

FPS = 30
WIDTH = 1920
HEIGHT = 1080

# Final video sequence
# (source_type, file, duration, description)
# source_type: 'video' for AI clips, 'image' for screenshots
SEQUENCE = [
    # Cinematic intro
    ("video", "intro_cinematic.mp4", 5.0, "Cinematic intro"),
    
    # Homepage hero
    ("image", "scene1-homepage-hero.png", 3.0, "Homepage hero"),
    
    # Dashboard showcase (AI animated)
    ("video", "dashboard_showcase.mp4", 5.0, "Dashboard animation"),
    
    # Overview dashboard screenshot
    ("image", "scene2-overview-dashboard.png", 2.5, "Overview dashboard"),
    
    # All-time performance
    ("image", "scene3-overview-all-time.png", 2.5, "All-time performance"),
    
    # Strategies page
    ("image", "scene4-strategies-page.png", 2.5, "Strategies listing"),
    
    # Strategy detail
    ("image", "scene5-strategy-detail.png", 2.5, "Strategy detail"),
    
    # Comparison showcase (AI animated)
    ("video", "comparison_showcase.mp4", 5.0, "Comparison animation"),
    
    # Compare page screenshot
    ("image", "scene6-compare-page.png", 2.5, "Compare page"),
    
    # Correlation matrix
    ("image", "scene7-correlation-matrix.png", 2.5, "Correlation matrix"),
    
    # My Dashboard
    ("image", "scene8-my-dashboard.png", 2.5, "My Dashboard"),
    
    # Admin panel
    ("image", "scene9-admin-panel.png", 2.5, "Admin panel"),
    
    # Webhook setup
    ("image", "scene10-webhook-setup.png", 2.5, "Webhook setup"),
    
    # CTA ending (AI animated)
    ("video", "cta_ending.mp4", 5.0, "CTA ending"),
]

def ensure_temp_dir():
    TEMP_DIR.mkdir(exist_ok=True)

def process_image(image_file, duration, output_file):
    """Convert image to video segment with fade"""
    image_path = ASSETS_DIR / image_file
    if not image_path.exists():
        print(f"  Warning: {image_file} not found")
        return False
    
    # Scale, pad, add fade
    filter_str = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fade=t=in:st=0:d=0.3,fade=t=out:st={duration-0.3}:d=0.3,format=yuv420p"
    
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", str(image_path),
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

def process_video(video_file, duration, output_file):
    """Process AI-generated video clip with fade"""
    video_path = ASSETS_DIR / video_file
    if not video_path.exists():
        print(f"  Warning: {video_file} not found")
        return False
    
    # Scale to match resolution and add fade
    filter_str = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,fade=t=in:st=0:d=0.3,fade=t=out:st={duration-0.3}:d=0.3,format=yuv420p"
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
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

def create_final_video():
    ensure_temp_dir()
    
    segments = []
    
    for i, (source_type, file_name, duration, desc) in enumerate(SEQUENCE):
        print(f"Processing {i+1}/{len(SEQUENCE)}: {desc}")
        
        segment_file = TEMP_DIR / f"segment_{i:02d}.mp4"
        
        if source_type == "image":
            success = process_image(file_name, duration, segment_file)
        else:
            success = process_video(file_name, duration, segment_file)
        
        if success and segment_file.exists():
            segments.append(segment_file)
        else:
            print(f"  Failed to process {file_name}")
    
    # Create concat file
    concat_file = TEMP_DIR / "concat_list.txt"
    with open(concat_file, 'w') as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    
    print(f"\nConcatenating {len(segments)} segments...")
    
    # Final concatenation with high quality
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(OUTPUT_VIDEO)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        size_mb = OUTPUT_VIDEO.stat().st_size / (1024 * 1024)
        total_duration = sum(d for _, _, d, _ in SEQUENCE)
        print(f"\n✅ Final video created: {OUTPUT_VIDEO}")
        print(f"   Duration: ~{total_duration:.1f} seconds")
        print(f"   File size: {size_mb:.1f} MB")
        success = True
    else:
        print(f"Error: {result.stderr[-500:]}")
        success = False
    
    # Cleanup
    print("\nCleaning up...")
    for f in TEMP_DIR.glob("*.mp4"):
        f.unlink()
    if concat_file.exists():
        concat_file.unlink()
    
    return success

if __name__ == "__main__":
    print("=" * 60)
    print("STS Futures Final Marketing Video Assembler")
    print("=" * 60)
    print()
    
    success = create_final_video()
    
    if success:
        print("\n🎬 Final video assembly complete!")
    else:
        print("\n❌ Video assembly failed")
