import { requireNativeModule } from "expo-modules-core";

export enum MediaColumns {
  _ID = "_id",
  DATA = "_data",
  SIZE = "_size",
  DISPLAY_NAME = "_display_name",
  TITLE = "title",
  DATE_ADDED = "date_added",
  DATE_MODIFIED = "date_modified",
  MIME_TYPE = "mime_type",
  MEDIA_SCANNER_NEW_OBJECT_ID = "media_scanner_new_object_id",
  IS_DRM = "is_drm",
  WIDTH = "width",
  HEIGHT = "height",
}

export enum ImageColumns {
  DESCRIPTION = "description",
  PICASA_ID = "picasa_id",
  IS_PRIVATE = "isprivate",
  LATITUDE = "latitude",
  LONGITUDE = "longitude",
  DATE_TAKEN = "datetaken",
  ORIENTATION = "orientation",
  MINI_THUMB_MAGIC = "mini_thumb_magic",
  BUCKET_ID = "bucket_id",
  BUCKET_DISPLAY_NAME = "bucket_display_name",
}

export enum VideoColumns {
  DURATION = "duration",
  ARTIST = "artist",
  ALBUM = "album",
  RESOLUTION = "resolution",
  DESCRIPTION = "description",
  IS_PRIVATE = "isprivate",
  TAGS = "tags",
  CATEGORY = "category",
  LANGUAGE = "language",
  LATITUDE = "latitude",
  LONGITUDE = "longitude",
  DATE_TAKEN = "datetaken",
  MINI_THUMB_MAGIC = "mini_thumb_magic",
  BUCKET_ID = "bucket_id",
  BUCKET_DISPLAY_NAME = "bucket_display_name",
  BOOKMARK = "bookmark",
}

export type Column = MediaColumns | ImageColumns | VideoColumns;

export interface MediaRecord {
  [MediaColumns._ID]?: number;
  [MediaColumns.DATA]?: string;
  [MediaColumns.SIZE]?: number;
  [MediaColumns.DISPLAY_NAME]?: string;
  [MediaColumns.TITLE]?: string;
  [MediaColumns.DATE_ADDED]?: number;
  [MediaColumns.DATE_MODIFIED]?: number;
  [MediaColumns.MIME_TYPE]?: string;
  [MediaColumns.MEDIA_SCANNER_NEW_OBJECT_ID]?: number;
  [MediaColumns.IS_DRM]?: boolean;
  [MediaColumns.WIDTH]?: number;
  [MediaColumns.HEIGHT]?: number;
}

export interface ImageRecord extends MediaRecord {
  [ImageColumns.DESCRIPTION]?: string;
  [ImageColumns.PICASA_ID]?: string;
  [ImageColumns.IS_PRIVATE]?: boolean;
  [ImageColumns.LATITUDE]?: number;
  [ImageColumns.LONGITUDE]?: number;
  [ImageColumns.DATE_TAKEN]?: number;
  [ImageColumns.ORIENTATION]?: number;
  [ImageColumns.MINI_THUMB_MAGIC]?: number;
  [ImageColumns.BUCKET_ID]?: string;
  [ImageColumns.BUCKET_DISPLAY_NAME]?: string;
}

export interface VideoRecord extends MediaRecord {
  [VideoColumns.DURATION]?: number;
  [VideoColumns.ARTIST]?: string;
  [VideoColumns.ALBUM]?: string;
  [VideoColumns.RESOLUTION]?: string;
  [VideoColumns.DESCRIPTION]?: string;
  [VideoColumns.IS_PRIVATE]?: boolean;
  [VideoColumns.TAGS]?: string;
  [VideoColumns.CATEGORY]?: string;
  [VideoColumns.LANGUAGE]?: string;
  [VideoColumns.LATITUDE]?: number;
  [VideoColumns.LONGITUDE]?: number;
  [VideoColumns.DATE_TAKEN]?: number;
  [VideoColumns.MINI_THUMB_MAGIC]?: number;
  [VideoColumns.BUCKET_ID]?: string;
  [VideoColumns.BUCKET_DISPLAY_NAME]?: string;
  [VideoColumns.BOOKMARK]?: number;
}

export type Record = MediaRecord & ImageRecord & VideoRecord;

export enum EXTERNAL_CONTENT_URI {
  Images = "content://media/external/images/media",
  Video = "content://media/external/video/media",
}

export enum QUERY_SORT_DIRECTION {
  ASCENDING = 0,
  DESCENDING = 1,
}

export enum QUERY_SORT_COLLATION {
  PRIMARY = 0,
  SECONDARY = 1,
  TERTIARY = 2,
  IDENTICAL = 3,
}

export interface QueryArgs {
  QUERY_ARG_GROUP_COLUMNS?: string[];
  QUERY_ARG_SORT_COLUMNS?: string[];
  QUERY_ARG_SQL_SELECTION_ARGS?: string[];
  QUERY_ARG_LIMIT?: number;
  QUERY_ARG_OFFSET?: number;
  QUERY_ARG_SORT_DIRECTION?: QUERY_SORT_DIRECTION;
  QUERY_ARG_SORT_COLLATION?: QUERY_SORT_COLLATION;
  QUERY_ARG_SORT_LOCALE?: string;
  QUERY_ARG_SQL_GROUP_BY?: string;
  QUERY_ARG_SQL_HAVING?: string;
  QUERY_ARG_SQL_LIMIT?: string;
  QUERY_ARG_SQL_SELECTION?: string;
  QUERY_ARG_SQL_SORT_ORDER?: string;
}

export type InsertValues = Partial<Record> & {
  [key: string]: string | number | boolean | null | undefined;
};

export interface ContentResolverModule {
  query(
    uri: string,
    projection: Column[],
    queryArgs: QueryArgs
  ): Promise<Record[]>;
  insert(uri: string, values: InsertValues | null): Promise<string | null>;
}

const ContentResolver =
  requireNativeModule<ContentResolverModule>("ContentResolver");

export default ContentResolver;
