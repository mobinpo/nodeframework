# File Storage

- [Introduction](#introduction)
- [Configuration](#configuration)
- [Obtaining Disk Instances](#obtaining-disk-instances)
- [Retrieving Files](#retrieving-files)
    - [Downloading Files](#downloading-files)
    - [File URLs](#file-urls)
- [Storing Files](#storing-files)
- [Deleting Files](#deleting-files)
- [Public Files](#public-files)

<a name="introduction"></a>
## Introduction

Nodevel provides a simple, unified API for local filesystem storage through the `Filesystem` facade and `storage` container binding.

<a name="configuration"></a>
## Configuration

Disks are declared in `config/filesystems.js`:

```js
disks: {
    local:  { driver: 'local', root: storage('app') },
    public: { driver: 'local', root: storage('app/public'), url: '/storage' },
}
```

The `default` key names the disk used when none is specified.

<a name="obtaining-disk-instances"></a>
## Obtaining Disk Instances

```js
const disk = app().make('storage').disk();          // default
const pub  = app().make('storage').disk('public');
```

<a name="retrieving-files"></a>
## Retrieving Files

```js
const contents = await disk.get('reports/invoice.pdf');

if (await disk.exists('reports/invoice.pdf')) { /* ... */ }

const files = await disk.files('reports');   // list a directory
```

<a name="downloading-files"></a>
### Downloading Files

Stream or return file content as an attachment response:

```js
return response().make(contents, 200, {
    'content-disposition': 'attachment; filename="invoice.pdf"',
});
```

<a name="file-urls"></a>
### File URLs

Files on disks configured with a `url` prefix generate URLs:

```js
pub.url('avatars/1.png');   // "/storage/avatars/1.png"
```

<a name="storing-files"></a>
## Storing Files

```js
await disk.put('avatars/1.png', buffer);
await disk.copy('old.txt', 'new.txt');
await disk.move('tmp.txt', 'final.txt');
await disk.makeDirectory('reports/2026');
```

Paths resolve inside the disk root; traversal outside it throws.

<a name="deleting-files"></a>
## Deleting Files

```js
await disk.delete('avatars/1.png');
```

<a name="public-files"></a>
## Public Files

Expose the `public` disk over HTTP with the `storage:link` Artisan command, which symlinks `public/storage` to `storage/app/public`:

```shell
npx tsx bin/artisan.ts storage:link
```
