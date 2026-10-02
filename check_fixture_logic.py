import os
import sys

def get_fixture_dir():
    # To be absolutely sure, find the backend folder first
    current_file = os.path.abspath(__file__)
    # Find "backend" in the path and resolve from there
    backend_dir = current_file
    while os.path.basename(backend_dir) != "backend" and backend_dir != os.path.dirname(backend_dir):
        backend_dir = os.path.dirname(backend_dir)
    
    return os.path.join(os.path.dirname(backend_dir), "data", "novamart")

print(get_fixture_dir())
