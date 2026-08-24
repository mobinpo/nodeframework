# Images

- [Introduction](#introduction)
- [Resizing With Sharp](#resizing-with-sharp)
- [Storing Processed Images](#storing-processed-images)

<a name="introduction"></a>
## Introduction

Image processing in Node builds on the `sharp` package. Nodevel does not bundle it; install once and use wherever uploads are handled.

<a name="resizing-with-sharp"></a>
## Resizing With Sharp

```shell
npm install sharp
```

```js
const sharp = require('sharp');

const buffer = await sharp(inputBuffer)
    .resize(300, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();
```

<a name="storing-processed-images"></a>
## Storing Processed Images

Pipe results into the Storage facade:

```js
const disk = app.make('storage').disk('public');
await disk.put(`avatars/${userId}.webp`, buffer);
```

For large uploads, offload processing to a queued job so requests stay fast — pass the stored path, never raw binary, through the queue payload.
