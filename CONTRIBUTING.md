# Contributing to LabForge

Thanks for your interest in contributing! Here's how to get started.

## Development setup

1. Fork and clone the repo
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env.local` and fill in the required values
4. Run migrations: `pnpm drizzle-kit push`
5. Start the dev server: `pnpm dev`

## Making changes

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm build` to check for errors
4. Open a pull request with a clear description of what you changed and why

## Reporting issues

Open an issue on GitHub. Include steps to reproduce, expected behavior, and actual behavior.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
