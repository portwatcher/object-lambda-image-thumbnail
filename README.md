# S3 Object Lambda Image Thumbnail

dead simple dynamic image thumbnail generator

## Features

- configurable size
- cache to s3 automatically, resizing happens only once

## Usage

### Configure Lambda, Execution Role, Bucket Policies

Please read aws docs to do it. This is your business.

### Install Modules

```bash
npm install    # pnpm won't work if you choose to upload a zip to aws lambda
sudo apt install zip
```

### Build

Change `bucketName` in `index.js` to your source bucket

```bash
npm run build
```

### Upload

Upload `function.zip` in your `dist` folder to aws lambda