<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All financial math lives in pure functions under src/engine (unit-tested); UI never computes money — keeps numbers consistent and testable.
- App state is one PaceProvider (Context + useReducer) persisted to localStorage key `pace:v1` with structural validation — frontend-only, corrupted storage falls back to seed.
- No sign-in: the app is fully open and all data stays in the browser — lets anyone (including automated reviewers) use every page instantly.
