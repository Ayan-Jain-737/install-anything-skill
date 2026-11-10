#!/usr/bin/env python3
"""
Generate Demo GIF and Social Preview Image for install-anything-skill (ias).
Demo GIF: ~6-8s animated terminal recording (item 1)
Social Preview: 1280x640 OpenGraph / GitHub card (item 7)
"""

import os
from PIL import Image, ImageDraw, ImageFont

MONO_FONT_PATH = "/usr/share/fonts/TTF/DejaVuSansMono.ttf"
SANS_BOLD_PATH = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"
SANS_REG_PATH = "/usr/share/fonts/TTF/DejaVuSans.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_terminal_window(draw, x, y, w, h, title="agent@workspace:~"):
    # Window background
    bg_color = (18, 20, 26)
    title_bar_color = (28, 32, 42)
    border_color = (45, 52, 68)

    draw.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=bg_color, outline=border_color, width=1)
    # Title bar
    draw.rounded_rectangle([x, y, x + w, y + 36], radius=10, fill=title_bar_color)
    draw.rectangle([x, y + 26, x + w, y + 36], fill=title_bar_color)
    draw.line([x, y + 36, x + w, y + 36], fill=border_color, width=1)

    # Window buttons
    draw.ellipse([x + 14, y + 12, x + 26, y + 24], fill=(255, 95, 86))   # Red
    draw.ellipse([x + 34, y + 12, x + 46, y + 24], fill=(255, 189, 46))  # Yellow
    draw.ellipse([x + 54, y + 12, x + 66, y + 24], fill=(39, 201, 63))   # Green

    # Title text
    font = get_font(MONO_FONT_PATH, 12)
    bbox = font.getbbox(title)
    tw = bbox[2] - bbox[0]
    draw.text((x + (w - tw) // 2, y + 10), title, font=font, fill=(140, 150, 170))

def generate_social_preview():
    W, H = 1280, 640
    img = Image.new("RGB", (W, H), (11, 14, 20))
    draw = ImageDraw.Draw(img)

    # Gradient/glow background accents
    for r in range(250, 0, -5):
        alpha = int(25 * (1 - r / 250))
        # Top-left glow
        draw.ellipse([60 - r, 80 - r, 60 + r, 80 + r], outline=(30 + alpha, 50 + alpha*2, 100 + alpha*3), width=3)
        # Bottom-right glow
        draw.ellipse([1150 - r, 520 - r, 1150 + r, 520 + r], outline=(80 + alpha*2, 40 + alpha, 120 + alpha*2), width=3)

    # Left column: Brand & messaging
    font_badge = get_font(MONO_FONT_PATH, 14)
    # Badge pill
    draw.rounded_rectangle([60, 60, 290, 92], radius=16, fill=(24, 32, 50), outline=(50, 90, 180), width=1)
    draw.text((75, 68), "⚡ AI AGENT TOOLING", font=font_badge, fill=(90, 170, 255))

    font_title = get_font(SANS_BOLD_PATH, 44)
    draw.text((60, 115), "install-anything", font=font_title, fill=(255, 255, 255))
    font_sub = get_font(SANS_BOLD_PATH, 28)
    draw.text((60, 170), "Short CLI: ias", font=font_sub, fill=(130, 195, 255))

    font_desc = get_font(SANS_REG_PATH, 19)
    draw.text((60, 220), "Universal GitHub Repository & Skill\nInstaller for AI Coding Agents.", font=font_desc, fill=(180, 190, 210))

    # Bullets
    bullets = [
        "✓ 1-command install: turns ANY repo into a skill",
        "✓ Auto-synthesizes SKILL.md wrapper if missing",
        "✓ Scopes cleanly to active agent (zero ghost folders)",
        "✓ Built-in skill & CLI discovery (ias find)",
    ]
    font_b = get_font(SANS_REG_PATH, 15)
    by = 300
    for b in bullets:
        draw.text((60, by), b, font=font_b, fill=(160, 225, 175))
        by += 30

    # Install command box
    draw.rounded_rectangle([60, 445, 520, 500], radius=8, fill=(20, 26, 38), outline=(60, 75, 110), width=1)
    font_cmd = get_font(MONO_FONT_PATH, 15)
    draw.text((78, 462), "$ npm i -g install-anything-skill", font=font_cmd, fill=(100, 240, 170))

    # Supported agent pills
    agents = ["Claude Code", "Cursor", "Codex", "Gemini", "Hermes", "OpenCode", "Zed"]
    ax = 60
    ay = 530
    font_p = get_font(MONO_FONT_PATH, 11)
    for ag in agents:
        abox = font_p.getbbox(ag)
        pw = (abox[2] - abox[0]) + 16
        draw.rounded_rectangle([ax, ay, ax + pw, ay + 28], radius=6, fill=(28, 35, 48), outline=(50, 62, 85))
        draw.text((ax + 8, ay + 6), ag, font=font_p, fill=(200, 215, 240))
        ax += pw + 10

    # Right column: Mini terminal window
    tx, ty, tw, th = 560, 60, 660, 520
    draw_terminal_window(draw, tx, ty, tw, th, title="ias terminal — universal agent harness")

    # Terminal content
    tfont = get_font(MONO_FONT_PATH, 13)
    lines = [
        ("$ ias find react", (100, 240, 170)),
        ("", (0, 0, 0)),
        ("🔍 Discovered Skills & Tools for \"react\":", (255, 215, 0)),
        ("───────────────────────────────────────────────────", (80, 90, 115)),
        ("1. react-best-practices (🧠 Agent Skill • 185k)", (130, 200, 255)),
        ("   Source: vercel-labs/agent-skills", (160, 170, 190)),
        ("   🚀 ias install vercel-labs/agent-skills", (120, 230, 160)),
        ("", (0, 0, 0)),
        ("2. next-cache-components (🧠 Agent Skill • 92k)", (130, 200, 255)),
        ("   Source: vercel-labs/agent-skills", (160, 170, 190)),
        ("───────────────────────────────────────────────────", (80, 90, 115)),
        ("$ ias install vercel-labs/agent-skills", (100, 240, 170)),
        ("📦 Target Repository: vercel-labs/agent-skills", (200, 215, 235)),
        ("⚡ Active Agent Detected: Claude Code (auto-detected)", (255, 180, 90)),
        ("   Discovered: react-best-practices, next-cache", (200, 215, 235)),
        ("✅ Registered to ~/.claude/skills/ias & global store", (100, 240, 170)),
        ("✨ Ready for immediate execution!", (255, 230, 100)),
    ]

    ly = ty + 50
    for ltext, lcolor in lines:
        if ltext:
            draw.text((tx + 22, ly), ltext, font=tfont, fill=lcolor)
        ly += 25

    os.makedirs("assets", exist_ok=True)
    img.save("assets/social-preview.png", "PNG", optimize=True)
    print(f"Generated assets/social-preview.png (Dimensions: {W}x{H}, Size: {os.path.getsize('assets/social-preview.png')} bytes)")

def generate_demo_gif():
    # 860x480 resolution for clean README display
    W, H = 860, 480
    frames = []

    tx, ty, tw, th = 20, 15, W - 40, H - 30
    tfont = get_font(MONO_FONT_PATH, 13)

    script_steps = [
        # Frame sequence: (command_text, show_output_step, cursor_visible)
        ("$ ", 0, True),
        ("$ i", 0, True),
        ("$ ias", 0, True),
        ("$ ias f", 0, True),
        ("$ ias find", 0, True),
        ("$ ias find r", 0, True),
        ("$ ias find react", 0, True),
        ("$ ias find react", 0, False),
        ("$ ias find react", 1, False),  # Output appears
        ("$ ias find react", 1, True),
        ("$ ias find react", 1, True),
        ("$ ias find react", 2, True),   # Start install
        ("$ ias install vercel-labs/agent-skills", 2, True),
        ("$ ias install vercel-labs/agent-skills", 3, False), # Executing
        ("$ ias install vercel-labs/agent-skills", 4, True),  # Finished
        ("$ ias install vercel-labs/agent-skills", 4, True),
        ("$ ias install vercel-labs/agent-skills", 4, True),
    ]

    durations = [
        300, 150, 150, 150, 150, 150, 300, 200, 1400, 1000, 500, 400, 800, 600, 1500, 1000, 1000
    ]

    for idx, (cmd_line, out_level, cursor) in enumerate(script_steps):
        frame = Image.new("RGB", (W, H), (13, 16, 23))
        draw = ImageDraw.Draw(frame)

        draw_terminal_window(draw, tx, ty, tw, th, title="ias — universal skill installer")

        lines = []
        # Header / first command
        prompt_line = cmd_line + ("█" if cursor and out_level == 0 else "")
        lines.append((prompt_line, (100, 240, 170)))

        if out_level >= 1:
            lines.extend([
                ("", (0, 0, 0)),
                ("🔍 Discovered Skills & Tools for \"react\":", (255, 215, 0)),
                ("──────────────────────────────────────────────────────────────", (75, 85, 110)),
                ("1. react-best-practices (🧠 Agent Skill • 185k installs)", (130, 200, 255)),
                ("   Source: vercel-labs/agent-skills", (160, 170, 190)),
                ("   🚀 ias install vercel-labs/agent-skills", (120, 230, 160)),
                ("", (0, 0, 0)),
                ("2. next-cache-components (🧠 Agent Skill • 92k installs)", (130, 200, 255)),
                ("   Source: vercel-labs/agent-skills", (160, 170, 190)),
                ("──────────────────────────────────────────────────────────────", (75, 85, 110)),
            ])

        if out_level == 2:
            lines.append(("$ ias install vercel-labs/agent-skills" + ("█" if cursor else ""), (100, 240, 170)))
        elif out_level >= 3:
            lines.append(("$ ias install vercel-labs/agent-skills", (100, 240, 170)))
            lines.append(("📦 Target Repository: vercel-labs/agent-skills", (200, 215, 235)))
            lines.append(("⚡ Active Agent Detected: Claude Code (auto-detected)", (255, 180, 90)))

        if out_level >= 4:
            lines.append(("✅ Registered: ~/.claude/skills/ias & ~/.agents/skills/", (100, 240, 170)))
            lines.append(("✨ Successfully installed! Active agent has immediate access.", (255, 230, 100)))
            lines.append(("$ " + ("█" if cursor else ""), (100, 240, 170)))

        ly = ty + 48
        for ltext, lcolor in lines:
            if ltext:
                draw.text((tx + 20, ly), ltext, font=tfont, fill=lcolor)
            ly += 22

        frames.append(frame)

    # Save animated GIF
    os.makedirs("assets", exist_ok=True)
    frames[0].save(
        "assets/demo.gif",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True
    )
    print(f"Generated assets/demo.gif (Size: {os.path.getsize('assets/demo.gif')} bytes, Frames: {len(frames)})")

if __name__ == "__main__":
    generate_social_preview()
    generate_demo_gif()
