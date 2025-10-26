import re
import numpy as np
import argparse
import os

def center_ase_file(filepath):
    """
    Centers the geometry in a 3ds Max ASCII Export (.ase) file.
    - Zeros out the *TM_POS transformation.
    - Calculates the center of all vertices and offsets them to be centered at the origin.
    """
    with open(filepath, 'r') as f:
        lines = f.readlines()

    vertices = []
    vertex_indices = []

    # --- First pass: Extract all vertices ---
    for i, line in enumerate(lines):
        if '*MESH_VERTEX' in line:
            parts = re.split(r'\s+', line.strip())
            try:
                x = float(parts[2])
                y = float(parts[3])
                z = float(parts[4])
                vertices.append([x, y, z])
                vertex_indices.append(i)
            except (ValueError, IndexError):
                print(f"Warning: Could not parse vertex line in {filepath}: '{line.strip()}'")
                continue

    if not vertices:
        print(f"No vertices found in {filepath}. Skipping.")
        return

    # --- Calculate center and apply offset ---
    vertices_np = np.array(vertices, dtype=np.float32)
    center = vertices_np.mean(axis=0)
    print(f"File: {os.path.basename(filepath)}, Original center: {center}")
    vertices_np -= center

    # --- Second pass: Update lines with new data ---
    vertex_counter = 0
    for i, line in enumerate(lines):
        # Zero out the transformation matrix position
        if '*TM_POS' in line or '*TM_ROW3' in line:
            parts = re.split(r'\s+', line.strip())
            lines[i] = f"\t\t*{parts[0]} 0.0000\t0.0000\t0.0000\n"
        
        # Update vertex coordinates
        elif '*MESH_VERTEX' in line:
            if vertex_counter < len(vertices_np):
                parts = re.split(r'\s+', line.strip())
                new_vertex = vertices_np[vertex_counter]
                lines[i] = f"\t\t\t*MESH_VERTEX    {parts[1]}\t{new_vertex[0]:.4f}\t{new_vertex[1]:.4f}\t{new_vertex[2]:.4f}\n"
                vertex_counter += 1

    # --- Write the modified content back to the file ---
    with open(filepath, 'w') as f:
        f.writelines(lines)
    print(f"Successfully centered {os.path.basename(filepath)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Center the geometry in a .ase file.")
    parser.add_argument("input_files", nargs='+', help="Path to one or more input .ase files.")
    args = parser.parse_args()

    for file in args.input_files:
        if os.path.exists(file):
            center_ase_file(file)
        else:
            print(f"Error: Input file not found: {file}")
