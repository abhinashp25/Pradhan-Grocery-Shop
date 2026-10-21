# Frontend (what customers and the owner see)

React + TypeScript + Vite + Tailwind. Installable phone app (PWA).

    npm install        # first time only
    npm run dev        # work on it at http://localhost:5173
    npm run build      # checks the code and makes the files in dist/ for hosting

Needs a `.env` file (copy `.env.example`) with the Supabase address and public key.

- `src/pages` customer screens, `src/pages/owner` owner screens (open at /owner/login)
- `src/components` shared pieces: header, bottom bar, product card, buttons, popups
- `src/lib` shared logic: language, money, time, theme, My List, login, database calls
- `src/locales` all customer text: `en.json`, `or.json` (Odia), `hi.json` (Hindi)
- `public` icons, favicon, and `audio/` for the Odia help clips
