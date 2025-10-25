"""
This script generates a sand texture for the Netherearth project.

This script has NO EXTERNAL DEPENDENCIES. It generates a BMP file from scratch.

Usage:
To generate the sand texture, run this script from the command line:
python generate_sand_texture.py

The output file will be saved as 'sand.bmp' in the '../public/models/textures' directory.
"""

import os
import random
import struct

def generate_sand_texture_bmp(width=64, height=64):
    """Generates a procedural sand texture as a BMP file without external libraries."""
    
    # BMP file format requires row padding to a multiple of 4 bytes.
    # For 24-bit color, each pixel is 3 bytes (BGR).
    row_size_unpadded = width * 3
    padding = (4 - (row_size_unpadded % 4)) % 4
    row_size_padded = row_size_unpadded + padding

    # Total size of the pixel data
    pixel_data_size = row_size_padded * height
    
    # BMP header constants
    file_header_size = 14
    info_header_size = 40
    file_size = file_header_size + info_header_size + pixel_data_size
    pixel_data_offset = file_header_size + info_header_size

    # 1. BITMAPFILEHEADER (14 bytes)
    file_header = struct.pack(
        '<2sIHHI',
        b'BM',             # Signature
        file_size,          # File size
        0,                  # Reserved
        0,                  # Reserved
        pixel_data_offset   # Pixel data offset
    )

    # 2. BITMAPINFOHEADER (40 bytes)
    info_header = struct.pack(
        '<IiiHHIIiiII',
        info_header_size,   # Header size
        width,              # Image width
        height,             # Image height
        1,                  # Color planes (must be 1)
        24,                 # Bits per pixel (24-bit for RGB)
        0,                  # Compression method (0 for BI_RGB)
        pixel_data_size,    # Image size (can be 0 for BI_RGB)
        0,                  # Horizontal resolution (pixels/meter)
        0,                  # Vertical resolution (pixels/meter)
        0,                  # Number of colors in palette (0 for 24-bit)
        0                   # Number of important colors (0 for all)
    )

    # 3. Pixel Data
    pixel_data = bytearray()
    # BMP rows are stored bottom-to-top
    for y in range(height):
        for x in range(width):
            # Generate a sand-like color
            r = random.randint(190, 220)
            g = random.randint(160, 190)
            b = random.randint(100, 130)
            # Pixels are stored in BGR order
            pixel_data.extend(struct.pack('<BBB', b, g, r))
        # Add padding to the end of the row
        pixel_data.extend(b'\x00' * padding)

    return file_header + info_header + pixel_data

if __name__ == '__main__':
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'textures')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    output_path = os.path.join(output_dir, 'sand.bmp')
    
    bmp_data = generate_sand_texture_bmp()
    
    with open(output_path, 'wb') as f:
        f.write(bmp_data)
    
    print(f"Sand texture successfully saved to {output_path}")
