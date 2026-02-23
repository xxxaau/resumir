import zipfile
import os
import sys

FILES_TO_INCLUDE = [
    "manifest.json",
    "background.js",
    "ext.js",
    "Readability.js",
    "theme.js",
    "LICENSE",
    "PRIVACY_POLICY.md"
]

DIRS_TO_INCLUDE = [
    "icons",
    "options",
    "sidebar"
]

OUTPUT_ZIP = "resumir-contingut-v1.1.5.zip"

def create_zip():
    print(f"Starting zip creation for {OUTPUT_ZIP}")
    
    if os.path.exists(OUTPUT_ZIP):
        try:
            os.remove(OUTPUT_ZIP)
            print(f"Removed old {OUTPUT_ZIP}")
        except OSError as e:
            print(f"Error removing old zip: {e}")

    try:
        with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add root files
            for file in FILES_TO_INCLUDE:
                if os.path.exists(file):
                    print(f"Adding {file}")
                    zipf.write(file, arcname=file)
                else:
                    print(f"WARNING: {file} not found!")

            # Add directories
            for directory in DIRS_TO_INCLUDE:
                if os.path.exists(directory):
                    print(f"Adding {directory}/...")
                    for root, _, files in os.walk(directory):
                        for file in files:
                            file_path = os.path.join(root, file)
                            rel_path = os.path.relpath(file_path, ".")
                            # Force forward slashes
                            arcname = rel_path.replace("\\", "/")
                            print(f"  Adding {arcname}")
                            zipf.write(file_path, arcname=arcname)
                else:
                    print(f"WARNING: {directory}/ not found!")
    except Exception as e:
        print(f"FAILED to create zip: {e}")
        sys.exit(1)

    print(f"Success! Created {OUTPUT_ZIP}")

if __name__ == "__main__":
    create_zip()
