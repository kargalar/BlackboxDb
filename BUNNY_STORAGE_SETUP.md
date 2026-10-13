# Bunny Storage setup

The server uploads user images to Bunny Storage and serves the resulting URLs through a Bunny Pull Zone.

## Migrate existing Cloudinary images

Existing Cloudinary images remain available during migration. Configure the Bunny server environment above, then run from `server/`:

```sh
npm run script:migrate-cloudinary-to-bunny
```

This is a dry run and only reports Cloudinary image references found in the database. Review the list, then run:

```sh
npm run script:migrate-cloudinary-to-bunny -- --apply
```

Apply mode downloads each image, uploads it to Bunny, downloads the Bunny copy and compares SHA-256 hashes, and only then updates the database reference. Failed downloads, uploads, verification, or database writes are reported and left retryable. The migration never deletes Cloudinary source files. Keep Cloudinary enabled as an image host until a later dry run finds no remaining Cloudinary references and you have confirmed the Bunny URLs in the app.

## Bunny dashboard

1. Create a Storage Zone and choose its primary region.
2. Copy the Storage Zone name and its FTP & API Access Password.
3. Create a Pull Zone whose origin is the Storage Zone. Use the Pull Zone's HTTPS hostname as the CDN URL.
4. If you use a region-specific Storage API endpoint, set it as `BUNNY_STORAGE_ENDPOINT`. Otherwise, use `storage.bunnycdn.com`.
5. For on-the-fly image resizing and WebP conversion, enable Bunny Optimizer and its Dynamic Images API on the Pull Zone.

## Environment variables

Set these on the server:

```dotenv
BUNNY_STORAGE_ZONE=your-storage-zone-name
BUNNY_STORAGE_PASSWORD=your-storage-zone-access-password
BUNNY_STORAGE_ENDPOINT=storage.bunnycdn.com
BUNNY_CDN_URL=https://your-pull-zone.b-cdn.net
```

Set these on the web app:

```dotenv
NEXT_PUBLIC_BUNNY_CDN_URL=https://your-pull-zone.b-cdn.net
NEXT_PUBLIC_BUNNY_CDN_HOSTNAME=your-pull-zone.b-cdn.net
NEXT_PUBLIC_BUNNY_OPTIMIZER_ENABLED=true
```

Keep `NEXT_PUBLIC_BUNNY_OPTIMIZER_ENABLED=false` until Dynamic Images is enabled on the Pull Zone. The server access password must only be configured in the server environment.
