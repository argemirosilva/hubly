#!/usr/bin/env python3
"""
Gera todos os tamanhos de ícone para Android e iOS a partir do ícone 512px do Hubly.
"""
from PIL import Image
import os

SRC = "/home/ubuntu/webdev-static-assets/hubly-icons/hubly-icon-512.png"
ANDROID_BASE = "/home/ubuntu/agendei/android/app/src/main/res"
IOS_BASE = "/home/ubuntu/agendei/ios/App/App/Assets.xcassets/AppIcon.appiconset"

# Tamanhos Android (mipmap)
ANDROID_ICONS = [
    ("mipmap-mdpi",    48),
    ("mipmap-hdpi",    72),
    ("mipmap-xhdpi",   96),
    ("mipmap-xxhdpi",  144),
    ("mipmap-xxxhdpi", 192),
]

# Tamanhos iOS (App Store + todos os dispositivos)
IOS_ICONS = [
    ("Icon-20@1x.png",    20),
    ("Icon-20@2x.png",    40),
    ("Icon-20@3x.png",    60),
    ("Icon-29@1x.png",    29),
    ("Icon-29@2x.png",    58),
    ("Icon-29@3x.png",    87),
    ("Icon-40@1x.png",    40),
    ("Icon-40@2x.png",    80),
    ("Icon-40@3x.png",    120),
    ("Icon-60@2x.png",    120),
    ("Icon-60@3x.png",    180),
    ("Icon-76@1x.png",    76),
    ("Icon-76@2x.png",    152),
    ("Icon-83.5@2x.png",  167),
    ("Icon-1024.png",     1024),
]

src = Image.open(SRC).convert("RGBA")

# Gerar ícones Android
print("Gerando ícones Android...")
for folder, size in ANDROID_ICONS:
    out_dir = os.path.join(ANDROID_BASE, folder)
    os.makedirs(out_dir, exist_ok=True)
    img = src.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(out_dir, "ic_launcher.png")
    img.save(out_path, "PNG")
    # Também salvar versão round
    out_path_round = os.path.join(out_dir, "ic_launcher_round.png")
    img.save(out_path_round, "PNG")
    print(f"  ✓ {folder}/ic_launcher.png ({size}x{size})")

# Gerar ícones iOS
print("\nGerando ícones iOS...")
os.makedirs(IOS_BASE, exist_ok=True)
for filename, size in IOS_ICONS:
    img = src.resize((size, size), Image.LANCZOS)
    out_path = os.path.join(IOS_BASE, filename)
    img.save(out_path, "PNG")
    print(f"  ✓ {filename} ({size}x{size})")

# Gerar splash screen Android (9-patch simples com fundo escuro)
print("\nGerando splash screens...")
SPLASH_SIZES = [
    ("drawable-port-mdpi",    320, 480),
    ("drawable-port-hdpi",    480, 800),
    ("drawable-port-xhdpi",   720, 1280),
    ("drawable-port-xxhdpi",  1080, 1920),
    ("drawable-port-xxxhdpi", 1440, 2560),
]
SPLASH_BG = (15, 23, 42, 255)  # #0f172a
ICON_SIZE_RATIO = 0.35  # ícone ocupa 35% da largura

for folder, w, h in SPLASH_SIZES:
    out_dir = os.path.join(ANDROID_BASE, folder)
    os.makedirs(out_dir, exist_ok=True)
    splash = Image.new("RGBA", (w, h), SPLASH_BG)
    icon_size = int(w * ICON_SIZE_RATIO)
    icon = src.resize((icon_size, icon_size), Image.LANCZOS)
    x = (w - icon_size) // 2
    y = (h - icon_size) // 2
    splash.paste(icon, (x, y), icon)
    out_path = os.path.join(out_dir, "splash.png")
    splash.save(out_path, "PNG")
    print(f"  ✓ {folder}/splash.png ({w}x{h})")

print("\n✅ Todos os ícones gerados com sucesso!")
