# Contributing

1. `npm install` then `npm run dev`.
2. Put any money logic in `src/engine` with a unit test; the UI must not compute money.
3. Before opening a PR run `npm run lint`, `npm test` and `npm run format`.
4. Use semantic design tokens from `src/styles.css`; never hardcode colors.
5. Every interactive element must be keyboard operable and labelled.
6. Do not edit `src/routeTree.gen.ts` or `src/integrations/supabase/*` (generated).
