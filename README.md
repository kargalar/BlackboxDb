# BlackboxDB

BlackboxDB is a self-hosted catalog for movies, TV series, and games. Browse, search, and organize a personal media collection with a modern web interface.

## Features

- Search and browse media titles with detailed metadata.
- Organize movies, series, and games in one catalog.
- Responsive Next.js web interface with theme support.
- GraphQL API backed by Prisma for catalog data.

## Project layout

- `web/` — Next.js frontend.
- `server/` — GraphQL API and Prisma schema.

## Development

Requirements: Node.js 20 or later, npm, and a configured database.

Copy the example environment files and provide your own database and API settings:

```sh
cp web/.env.example web/.env.local
cp server/.env.example server/.env
```

Install dependencies and run the frontend:

```sh
npm install
cd web
npm install
npm run dev
```

Run the checks from `web/`:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Never commit real environment files, database backups, private media catalogs, or API secrets. Keep real credentials in local environment files or a secrets manager.

## License

BlackboxDB is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
