#!/bin/bash

# This script converts all .ase files in the specified directory to .glb format using assimp.

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")

# The directory containing the original models
ORIGINAL_MODEL_DIR="$SCRIPT_DIR/original_models"

# The directory to output the converted models
OUTPUT_DIR="$SCRIPT_DIR/../public/models"

# Loop through all .ase files in the directory
for file in "$ORIGINAL_MODEL_DIR"/*.ase; do
  # Check if the file exists to avoid errors with no matches
  if [ -f "$file" ]; then
    # Get the filename without the extension
    filename=$(basename -- "$file")
    extension="${filename##*.}"
    filename="${filename%.*}"
    
    # Run the assimp export command
    echo "Converting $file to $filename.glb..."
    assimp export "$file" "$OUTPUT_DIR/$filename.glb"
  fi
done

# Loop through all .asc files in the directory
for file in "$ORIGINAL_MODEL_DIR"/*.asc; do
  # Check if the file exists to avoid errors with no matches
  if [ -f "$file" ]; then
    # Get the filename without the extension
    filename=$(basename -- "$file")
    extension="${filename##*.}"
    filename="${filename%.*}"
    
    # Run the python script
    echo "Converting $file to $filename.glb..."
    python3 "$SCRIPT_DIR/asc_to_glb.py" "$file" "$OUTPUT_DIR/$filename.glb"
  fi
done

echo "Conversion complete."
