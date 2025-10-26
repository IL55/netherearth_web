"""
Converts a simplified ASC (assumed 3D Studio ASCII) file to GLB format.
This example assumes a very basic ASC format for demonstration purposes. Adjust parsing logic based on the actual ASC file structure.
Dependencies:
- pygltflib: For creating and saving GLB files.
- numpy: For numerical operations and array handling.

# Setup virtual environment and install dependencies:
python3 -m venv venv
source venv/bin/activate

# Install required packages:
pip install pygltflib numpy

# Usage:
python3 ./utils/asc_to_glb.py ./utils/original_models/bullet1.asc ./public/models/output.glb

"""

import numpy as np
import pygltflib
import struct
import argparse
import os

def parse_simple_asc(filepath):
    """
    Parses a 3D Studio (ASC) file format.
    - Extracts vertices and faces.
    - Assumes Z-up coordinate system and converts to Y-up for glTF.
    """
    vertices = []
    faces = []
    parsing_vertices = False
    parsing_faces = False

    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if "Vertex list:" in line:
                    parsing_vertices = True
                    parsing_faces = False
                    continue
                if "Face list:" in line:
                    parsing_vertices = False
                    parsing_faces = True
                    continue

                if parsing_vertices:
                    # Example: Vertex 0:  X:-398.1393     Y:99.5840     Z:8.0000
                    parts = line.split()
                    if len(parts) >= 5 and parts[0] == "Vertex":
                        try:
                            x = float(parts[2].replace("X:", ""))
                            y = float(parts[3].replace("Y:", ""))
                            z = float(parts[4].replace("Z:", ""))
                            # ASC is Z-up, glTF is Y-up. Convert coordinates.
                            # 3dsMax (Z-up, right-handed) to glTF (Y-up, right-handed)
                            # (X, Y, Z) -> (X, Z, -Y)
                            vertices.append([x, z, -y])
                        except (ValueError, IndexError):
                            print(f"Warning: Could not parse vertex line: '{line}'")

                elif parsing_faces:
                    # Example: Face 0:    A:0 B:1 C:2 AB:1 BC:1 CA:1
                    parts = line.split()
                    if len(parts) >= 5 and parts[0] == "Face":
                        try:
                            # Indices are 0-based in the file
                            a = int(parts[2].replace("A:", ""))
                            b = int(parts[3].replace("B:", ""))
                            c = int(parts[4].replace("C:", ""))
                            faces.append([a, b, c])
                        except (ValueError, IndexError):
                            print(f"Warning: Could not parse face line: '{line}'")

    except FileNotFoundError:
        print(f"Error: File not found at {filepath}")
        return None, None
    except Exception as e:
        print(f"Error parsing ASC file: {e}")
        return None, None

    if not vertices:
        print("Error: No vertices found in ASC file.")
        return None, None
    if not faces:
        print("Error: No faces found in ASC file.")
        return None, None

    print(f"Parsed {len(vertices)} vertices and {len(faces)} faces.")
    
    # --- Center the model at the origin ---
    if len(vertices) > 0:
        vertices_np = np.array(vertices, dtype=np.float32)
        center = vertices_np.mean(axis=0)
        vertices_np -= center
        print(f"Model centered. Original center was {center}")
        return vertices_np, np.array(faces, dtype=np.uint32)

    return np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.uint32)


def create_glb(vertices, faces, output_path):
    """Creates a simple GLB file from vertices and faces."""
    if vertices is None or faces is None:
        return

    num_vertices = len(vertices)
    num_faces = len(faces)

    # --- Convert data to bytes ---
    # Flatten vertices [[x,y,z], [x,y,z]] -> [x,y,z,x,y,z]
    verts_bytes = vertices.tobytes()
    # Flatten faces [[f1,f2,f3], [f1,f2,f3]] -> [f1,f2,f3,f1,f2,f3]
    faces_bytes = faces.tobytes()

    # Calculate byte lengths and offsets
    verts_byte_len = len(verts_bytes)
    faces_byte_len = len(faces_bytes)
    total_byte_len = verts_byte_len + faces_byte_len

    # --- Create GLTF structure using pygltflib ---
    gltf = pygltflib.GLTF2()

    # Create Buffer
    gltf.buffers.append(pygltflib.Buffer(byteLength=total_byte_len))

    # Create BufferViews
    # Vertices view
    gltf.bufferViews.append(pygltflib.BufferView(
        buffer=0,
        byteOffset=0,
        byteLength=verts_byte_len,
        target=pygltflib.ARRAY_BUFFER # Target for vertex attributes
    ))
    # Indices view
    gltf.bufferViews.append(pygltflib.BufferView(
        buffer=0,
        byteOffset=verts_byte_len, # Start after vertices
        byteLength=faces_byte_len,
        target=pygltflib.ELEMENT_ARRAY_BUFFER # Target for indices
    ))

    # Create Accessors
    # Vertices accessor
    min_vert = vertices.min(axis=0).tolist()
    max_vert = vertices.max(axis=0).tolist()
    gltf.accessors.append(pygltflib.Accessor(
        bufferView=0, # Index of the vertices bufferView
        componentType=pygltflib.FLOAT, # Data type
        count=num_vertices,
        type=pygltflib.VEC3, # 3 components per vertex
        min=min_vert,
        max=max_vert
    ))
    # Indices accessor
    gltf.accessors.append(pygltflib.Accessor(
        bufferView=1, # Index of the indices bufferView
        componentType=pygltflib.UNSIGNED_INT, # Data type (matches faces dtype)
        count=num_faces * 3, # Total number of indices
        type=pygltflib.SCALAR # Single component per index
    ))

    # Create MeshPrimitive (defines geometry)
    primitive = pygltflib.Primitive(
        attributes=pygltflib.Attributes(POSITION=0), # POSITION maps to accessor 0 (vertices)
        indices=1 # Indices map to accessor 1 (faces)
    )

    # Create Mesh
    gltf.meshes.append(pygltflib.Mesh(primitives=[primitive]))

    # Create Node
    gltf.nodes.append(pygltflib.Node(mesh=0)) # Node uses the first mesh

    # Create Scene
    gltf.scenes.append(pygltflib.Scene(nodes=[0])) # Scene uses the first node
    gltf.scene = 0 # Default scene index

    # --- Combine buffers into binary blob for GLB ---
    # The order must match the bufferView offsets
    blob = verts_bytes + faces_bytes
    gltf.set_binary_blob(blob)

    # --- Save as GLB ---
    try:
        # Ensure the output directory exists before saving
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        gltf.save(output_path)
        print(f"Successfully saved GLB to {output_path}")
    except Exception as e:
        print(f"Error saving GLB file: {e}")

# --- Main execution ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert simple ASC (assumed 3D Studio ASCII) to GLB.")
    parser.add_argument("input_asc", help="Path to the input ASC file.")
    parser.add_argument("output_glb", help="Path for the output GLB file.")
    args = parser.parse_args()

    if not os.path.exists(args.input_asc):
        print(f"Error: Input file not found: {args.input_asc}")
    else:
        vertices_np, faces_np = parse_simple_asc(args.input_asc)
        if vertices_np is not None and faces_np is not None:
            create_glb(vertices_np, faces_np, args.output_glb)
