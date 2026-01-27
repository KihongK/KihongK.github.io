# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for 김기홍, built on [al-folio](https://github.com/alshedivat/al-folio) Jekyll theme. The primary feature is an **AI self-introduction chatbot** at `/api-demo/` that connects to an external API backend.

**Live Site**: https://KihongK.github.io

## Development Commands

### Local Development with Docker (Recommended)

```bash
docker compose pull
docker compose up
```

Site available at http://localhost:8080

### Local Development (Windows with WSL)

```bash
wsl
bundle exec jekyll serve
```

### Code Formatting

```bash
npx prettier --check .   # Check formatting
npx prettier --write .   # Fix formatting
```

### Build for Production

```bash
bundle exec jekyll build
```

Output goes to `_site/` directory.

## Core Feature: AI Chatbot

The chatbot is the main custom feature of this site.

### Chatbot Architecture

```
_pages/roy.md                → Page definition (permalink: /api-demo/)
    ↓
_layouts/roy.liquid          → UI layout + embedded CSS
    ↓
_scripts/chatbot-setup.js    → Frontend logic (compiled to assets/js/)
    ↓
External API Backend         → https://api.kim-ki-hong.com/v1/chat/
```

### Key Chatbot Files

| File | Purpose |
|------|---------|
| `_scripts/chatbot-setup.js` | Main chatbot logic: API calls, message handling, UI state |
| `_layouts/roy.liquid` | Complete UI with embedded styles (chat messages, typing indicator, welcome screen) |
| `_pages/roy.md` | Page frontmatter only (layout: roy, permalink: /api-demo/) |

### Communication Protocol

**Primary: Socket.IO (실시간 통신)**
```
URL: https://api.kim-ki-hong.com
Path: /socket.io
Transports: ['websocket', 'polling']
```

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | - | - | 연결 성공 |
| `disconnect` | - | - | 연결 해제 |
| `chat:message` | Client→Server | `{ message: string }` | 사용자 질문 전송 |
| `chat:response` | Server→Client | `{ response, source: "llm"\|"human", timestamp }` | 응답 수신 |
| `chat:typing` | Server→Client | `{ is_typing: boolean }` | 타이핑 상태 |
| `chat:human_join` | Server→Client | - | 담당자 참여 알림 |

**Fallback: REST API**
```
POST /v1/chat/  → { message } → { response, question_type, suggested_questions }
GET  /v1/health/ → 연결 상태 확인
```

### Message Source Types

| source | 의미 | UI 표시 |
|--------|------|---------|
| `llm` | LLM 자동 응답 | 기존 봇 스타일 (파란색) |
| `human` | 개발자 수동 응답 | 녹색 + "담당자" 배지 |

### Chatbot Key Functions

- `initSocketConnection()` - Socket.IO 연결 초기화, 실패 시 REST 폴백
- `sendMessage()` - Socket.IO로 전송, 연결 없으면 REST API 사용
- `handleChatResponse(data)` - 응답 처리 (source에 따라 봇/담당자 구분)
- `handleTypingStatus(data)` - 서버에서 받은 타이핑 상태 표시
- `displaySystemMessage(message, type)` - 담당자 참여 등 시스템 알림
- `loadChatHistory()` / `saveConversation()` - LocalStorage 기록

### API Configuration

`_scripts/chatbot-setup.js`:
```javascript
const API_BASE_URL = 'https://api.kim-ki-hong.com';
```

## Jekyll Theme Structure

- `_config.yml` - Main configuration (site settings, plugins, library versions)
- `_layouts/` - Page templates (Liquid templates: `about.liquid`, `post.liquid`, `roy.liquid`, etc.)
- `_includes/` - Reusable components (header, footer, social links)
- `_pages/` - Static pages (about.md, roy.md)
- `_data/` - YAML data files (cv.yml, repositories.yml)
- `_sass/` - SCSS stylesheets
- `_scripts/` - JavaScript source files (processed by Jekyll with frontmatter)

### Collections

- `books` - Book reviews
- `news` - News items (displayed on homepage)
- `projects` - Project portfolio

### CV Generation

- Primary: `assets/json/resume.json` (JSON Resume format)
- Fallback: `_data/cv.yml`

## Deployment

Automatic via GitHub Actions (`.github/workflows/deploy.yml`):
1. Push to `main` triggers build
2. Site builds to `gh-pages` branch
3. GitHub Pages serves from `gh-pages`

## Notes

- JavaScript files in `_scripts/` use Jekyll frontmatter to define their output path
- ImageMagick required for responsive image generation
- The chatbot has a mock response mode when `API_BASE_URL` points to a placeholder domain
