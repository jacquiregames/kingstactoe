#!/bin/bash
gnome-terminal -- bash -c "python3 main.py; exec bash"
gnome-terminal -- bash -c "pnpm run dev; exec bash"
