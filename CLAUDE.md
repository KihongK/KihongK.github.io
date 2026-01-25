# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for 김기홍, built using the [al-folio](https://github.com/alshedivat/al-folio) Jekyll theme. The site is deployed to GitHub Pages at https://KihongK.github.io.

## Development Commands

### Local Development (Windows with WSL)
```bash
# Start the development server
wsl
bundle exec jekyll serve
```

### Local Development with Docker (Recommended)
```bash
# Pull and run with Docker
docker compose pull
docker compose up

# Build your own image (if needed)
docker compose up --build
```
The site will be available at http://localhost:8080.

### Code Formatting
```bash
# Check formatting with Prettier
npx prettier --check .

# Fix formatting issues
npx prettier --write .
```

### Build for Production
```bash
bundle exec jekyll build
```
Output goes to `_site/` directory.

## Architecture

### Jekyll Theme Structure
- `_config.yml` - Main configuration (site settings, plugins, library versions)
- `_layouts/` - Page templates (Liquid templates: `about.liquid`, `post.liquid`, `cv.liquid`, etc.)
- `_includes/` - Reusable components (header, footer, social links, etc.)
- `_pages/` - Static pages (about.md, roy.md for the chatbot page)
- `_data/` - YAML data files (cv.yml, repositories.yml, socials.yml)
- `_sass/` - SCSS stylesheets
- `assets/` - Static assets (JS, CSS, images, JSON)

### Key Customizations

**AI Chatbot Page (`_pages/roy.md` + `_layouts/roy.liquid`)**
- Custom self-introduction chatbot at `/api-demo/`
- Uses `assets/js/chatbot-setup.js` for frontend logic
- Connects to an external API backend

**CV Generation**
- Primary: `assets/json/resume.json` (JSON Resume format)
- Fallback: `_data/cv.yml`

### Collections
Defined in `_config.yml`:
- `books` - Book reviews
- `news` - News items (displayed on homepage)
- `projects` - Project portfolio

### Important Configuration Notes
- Site URL: `https://KihongK.github.io`
- Language: `en` (English, though content is in Korean)
- Jekyll plugins are declared in both `Gemfile` and `_config.yml`
- ImageMagick must be installed for responsive image generation

## Deployment

Automatic deployment via GitHub Actions (`.github/workflows/deploy.yml`):
1. Push to `main` branch triggers deployment
2. Site builds to `gh-pages` branch
3. GitHub Pages serves from `gh-pages`

## Dependencies

- **Ruby/Jekyll**: See `Gemfile` for gem dependencies
- **Node.js**: `package.json` contains Prettier and Liquid plugin for code formatting
- **Docker**: `docker-compose.yml` for containerized development
