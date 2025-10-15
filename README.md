# @hortemo/expo-content-resolver

Exposes Android's `ContentResolver#query` API, letting React Native (Expo) apps query the MediaStore.

## Installation

```sh
npm install @hortemo/expo-content-resolver
```

## Usage

```ts
import ContentResolver, {
  EXTERNAL_CONTENT_URI,
  MediaColumns,
  ImageColumns,
  QUERY_SORT_DIRECTION,
} from '@hortemo/expo-content-resolver';

const recentLandscapePhotos = await ContentResolver.query(
  EXTERNAL_CONTENT_URI.Images,
  [
    MediaColumns._ID,
    MediaColumns.DISPLAY_NAME,
    MediaColumns.DATE_ADDED,
    MediaColumns.SIZE,
    MediaColumns.WIDTH,
    MediaColumns.HEIGHT,
    ImageColumns.MIME_TYPE,
  ],
  {
    QUERY_ARG_SQL_SELECTION: `${MediaColumns.MIME_TYPE} = ? AND ${MediaColumns.WIDTH} > ${MediaColumns.HEIGHT}`,
    QUERY_ARG_SQL_SELECTION_ARGS: ['image/jpeg'],
    QUERY_ARG_SORT_COLUMNS: [MediaColumns.DATE_ADDED],
    QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.DESCENDING,
    QUERY_ARG_LIMIT: 5,
  }
);
```
