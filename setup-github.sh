#!/bin/bash
# SponsorScan — GitHub setup script
# Run this once to push the project to a new public GitHub repo
#
# Prerequisites:
#   1. Create a new public repo on GitHub named "sponsorscan"
#      (no README, no license, no .gitignore — keep it empty)
#   2. Set your GitHub username below
#   3. Run: bash setup-github.sh

GITHUB_USERNAME="YOUR_GITHUB_USERNAME"
REPO_NAME="sponsorscan"

echo "Setting up GitHub repo for SponsorScan..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
  git init
  echo "Git initialized."
fi

# Stage all files (respects .gitignore)
git add .

# Initial commit
git commit -m "feat: SponsorScan — Compliance Guardian for global football sponsorship

Twelve Labs LA/ME 2026 Hackathon — Compliance Guardian Track

Features:
- Compliance Guardian: competitive separation, frequency cap, contextual brand safety
- Multi-territory ROI: 6 global markets (UK, EU, LatAm, APAC, MENA, NA)
- Format Intelligence: IAB CTV Ad Portfolio (in-scene, overlay, squeeze back)
- Residual Exposure: replay, time-shifted, highlights, VOD, media library
- Standards ecosystem: SCTE-35/130, DVB-TA, HbbTV, IAB LEAP, CIMM, SonicOrigin, C2PA

Stack: React 18 + Vite + Express + TypeScript + Drizzle ORM + SQLite
AI: Twelve Labs Pegasus 1.2 (visual + audio multimodal)"

# Add remote and push
git branch -M main
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
git push -u origin main

echo ""
echo "Done! Repo pushed to: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""
echo "Now add these to your DevPost submission:"
echo "  GitHub repo URL:  https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo "  Live demo URL:    https://www.perplexity.ai/computer/a/sponsorscan-global-football-sp-D..3lSviQE6vxC3BRMai0A"
echo "  Business case:    Upload business-case.pdf from this directory"
