# Accessible To-Do List

A small React + TypeScript to-do list built to be accessible, with tests at two levels.

- Add a task, mark it done, delete it (with a confirmation), and an empty state.
- Named controls, a linked error message, announced status messages.
- Keyboard-only use, visible focus ring, works at 320 px.

## Run it

    npm install
    npm run dev

## Test it

    npm test        # component tests with axe and Testing Library
    npm run e2e     # browser tests with Playwright and axe (run `npx playwright install chromium` once)

Built with Vite, React, TypeScript, Vitest, Testing Library, axe-core and Playwright.