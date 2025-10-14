# @hortemo/expo-content-resolver

Expo native module that exposes a typed wrapper around Android's `ContentResolver#query` API. It lets React Native apps query the MediaStore (or any other content provider) from JS.

## Installation

```sh
yarn add @hortemo/expo-content-resolver
# or
npm install @hortemo/expo-content-resolver
```

You also need to run `npx expo prebuild` (or `expo prebuild --platform android`) so the native module is linked into your Android project.

## Usage

```ts
import ContentResolver, {
  EXTERNAL_CONTENT_URI,
  MediaColumns,
} from '@hortemo/expo-content-resolver';

const insertedUri = await ContentResolver.insert(EXTERNAL_CONTENT_URI.Images, {
  [MediaColumns.DISPLAY_NAME]: 'example.jpg',
  [MediaColumns.MIME_TYPE]: 'image/jpeg',
});

const records = await ContentResolver.query(insertedUri ?? EXTERNAL_CONTENT_URI.Images, [MediaColumns._ID, MediaColumns.DATA], {});
```

See `src/ContentResolver.ts` for all available types.

## Testing

Run the end-to-end checks (Maestro + Expo prebuild) with:

```sh
./e2e/e2e.sh
```

Make sure an Android emulator is available or let the script start the default AVD (`Pixel_3a_API_35_extension_level_13_arm64-v8a`). The harness seeds a few sample MediaStore rows before running Maestro assertions so queries always return results.
