<div align="center">
  <img src="web/src/app/icon.svg" width="88" alt="Blackbox icon" />

# BlackboxDB

**Your personal space for the stories you follow.**

Catalog movies, shows, games, books, and more in a self-hosted media tracker.

[![Web](https://img.shields.io/badge/Web-Next.js-111111?logo=nextdotjs)](https://github.com/kargalar/BlackboxDb) [![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE) [![Issues](https://img.shields.io/github/issues/kargalar/BlackboxDb)](https://github.com/kargalar/BlackboxDb/issues)

[Explore the project](https://github.com/kargalar/BlackboxDb) · [Build from source](#build-from-source) · [Report an issue](https://github.com/kargalar/BlackboxDb/issues)

</div>

![BlackboxDB landing page with media categories and account actions](docs/screenshots/blackbox-home.png)

## Keep your media life in one place

Search and organize the titles you watch, play, read, and listen to. Save ratings and notes, build lists, and discover what to explore next through a responsive web interface.

## Features

- Browse and search movies, TV shows, games, books, music, people, and companies.
- Keep personal lists, ratings, reviews, and activity logs.
- Explore recommendations, discussions, quizzes, and related content.
- Use a responsive Next.js interface with theme support.
- Run the GraphQL API and Prisma-backed catalog on your own infrastructure.

## Run locally

Requirements: Node.js 20 or later, npm, and a configured database.

Copy the sample environment files and set your local API and database values:

```sh
cp web/.env.example web/.env.local
cp server/.env.example server/.env
```

Install dependencies, then start the API and frontend using the project start scripts or run each service from its directory. The web app runs with:

```sh
cd web
npm install
npm run dev
```

## Build from source

Run frontend checks from `web/`:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Keep real environment files, database backups, private media catalogs, and API secrets out of version control. Configure production credentials through your hosting provider's secret store.

## Admin backups

The admin backup downloads one `.tar.gz` archive containing a PostgreSQL database dump,
the complete server `uploads/` directory (including screenshots, posters, backdrops,
profile pictures and covers), and a manifest with SHA-256 checksums for every file.
PostgreSQL client tools (`pg_dump` and `pg_restore`) must be installed on the server.
Allow enough temporary disk space for a copy of the uploads and the resulting archive.
Pause edits and uploads while taking a backup so database records and files stay consistent.

The admin screen shows an overall progress bar and the current phase: database dump,
upload copy, checksum verification, archive creation, and download. Preparation uses
fixed phase weights and measured file bytes; the database phase remains at its
starting percentage until `pg_dump` finishes. Downloads stream directly to disk
where supported and reach 100% only after the file writer closes. Other browsers
use their native downloader and report the server's transfer progress.

Restore accepts these system archives and older database-only `.dump` backups.
A system archive replaces both the database and local uploads; a legacy `.dump`
replaces only the database. Archives are validated before restoration, and database
restoration runs in a single transaction. Previous uploads are kept until restoration
succeeds and are put back if the database restore fails. If restoration fails, a
`.blackboxdb-restore-*` recovery directory may remain beside `uploads/`.

External image URLs remain in the database; files hosted by external services are not
downloaded into the archive. Back up source code and `.env` configuration separately
before reinstalling the operating system. The admin archive contains private user
data and should be stored securely.

## License

BlackboxDB is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
