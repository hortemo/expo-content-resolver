package com.hortemo.contentresolver

import android.content.ContentResolver
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class QueryArgs : Record {
  @Field val QUERY_ARG_GROUP_COLUMNS: Array<String>? = null
  @Field val QUERY_ARG_SORT_COLUMNS: Array<String>? = null
  @Field val QUERY_ARG_SQL_SELECTION_ARGS: Array<String>? = null
  @Field val QUERY_ARG_LIMIT: Int? = null
  @Field val QUERY_ARG_OFFSET: Int? = null
  @Field val QUERY_ARG_SORT_DIRECTION: Int? = null
  @Field val QUERY_ARG_SORT_COLLATION: String? = null
  @Field val QUERY_ARG_SORT_LOCALE: String? = null
  @Field val QUERY_ARG_SQL_GROUP_BY: String? = null
  @Field val QUERY_ARG_SQL_HAVING: String? = null
  @Field val QUERY_ARG_SQL_LIMIT: String? = null
  @Field val QUERY_ARG_SQL_SELECTION: String? = null
  @Field val QUERY_ARG_SQL_SORT_ORDER: String? = null
}

class ContentResolverModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ContentResolver")

    AsyncFunction("query") { uri: Uri, projection: Array<String>, queryArgs: QueryArgs ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available")

      val records = mutableListOf<Map<String, Any?>>()

      context.contentResolver.query(
        uri,
        projection,
        createQueryArgs(queryArgs),
        null
      )?.use { cursor ->
        while (cursor.moveToNext()) {
          records.add(toRecord(cursor))
        }
      }

      return@AsyncFunction records
    }

    AsyncFunction("insert") { uri: Uri, values: Map<String, Any?>? ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available")

      val result = context.contentResolver.insert(uri, values?.let { createContentValues(it) })
      return@AsyncFunction result?.toString()
    }
  }

  private fun createQueryArgs(queryArgs: QueryArgs): Bundle = Bundle().apply {
    queryArgs.QUERY_ARG_GROUP_COLUMNS?.let { putStringArray(ContentResolver.QUERY_ARG_GROUP_COLUMNS, it) }
    queryArgs.QUERY_ARG_SORT_COLUMNS?.let { putStringArray(ContentResolver.QUERY_ARG_SORT_COLUMNS, it) }
    queryArgs.QUERY_ARG_SQL_SELECTION_ARGS?.let { putStringArray(ContentResolver.QUERY_ARG_SQL_SELECTION_ARGS, it) }
    queryArgs.QUERY_ARG_LIMIT?.let { putInt(ContentResolver.QUERY_ARG_LIMIT, it) }
    queryArgs.QUERY_ARG_OFFSET?.let { putInt(ContentResolver.QUERY_ARG_OFFSET, it) }
    queryArgs.QUERY_ARG_SORT_DIRECTION?.let { putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, it) }
    queryArgs.QUERY_ARG_SORT_COLLATION?.let { putString(ContentResolver.QUERY_ARG_SORT_COLLATION, it) }
    queryArgs.QUERY_ARG_SORT_LOCALE?.let { putString(ContentResolver.QUERY_ARG_SORT_LOCALE, it) }
    queryArgs.QUERY_ARG_SQL_GROUP_BY?.let { putString(ContentResolver.QUERY_ARG_SQL_GROUP_BY, it) }
    queryArgs.QUERY_ARG_SQL_HAVING?.let { putString(ContentResolver.QUERY_ARG_SQL_HAVING, it) }
    queryArgs.QUERY_ARG_SQL_LIMIT?.let { putString(ContentResolver.QUERY_ARG_SQL_LIMIT, it) }
    queryArgs.QUERY_ARG_SQL_SELECTION?.let { putString(ContentResolver.QUERY_ARG_SQL_SELECTION, it) }
    queryArgs.QUERY_ARG_SQL_SORT_ORDER?.let { putString(ContentResolver.QUERY_ARG_SQL_SORT_ORDER, it) }
  }

  private fun toRecord(cursor: Cursor): Map<String, Any?> {
    val record = mutableMapOf<String, Any?>()
    for (i in 0 until cursor.columnCount) {
      val columnName = cursor.getColumnName(i)
      val value: Any? = when (cursor.getType(i)) {
        Cursor.FIELD_TYPE_NULL -> null
        Cursor.FIELD_TYPE_INTEGER -> cursor.getInt(i)
        Cursor.FIELD_TYPE_FLOAT -> cursor.getDouble(i)
        Cursor.FIELD_TYPE_STRING -> cursor.getString(i)
        Cursor.FIELD_TYPE_BLOB -> String(cursor.getBlob(i), Charsets.UTF_8)
        else -> throw IllegalArgumentException("Unsupported column type: ${cursor.getType(i)}")
      }
      record[columnName] = value
    }
    return record
  }

  private fun createContentValues(values: Map<String, Any?>): ContentValues =
    ContentValues(values.size).apply {
      values.forEach { (key, value) ->
        when (value) {
          null -> putNull(key)
          is String -> put(key, value)
          is Boolean -> put(key, value)
          is Number -> putNumber(this, key, value)
          is ByteArray -> put(key, value)
          else -> throw IllegalArgumentException("Unsupported content value type for key $key: ${value::class.java.name}")
        }
      }
    }

  private fun putNumber(contentValues: ContentValues, key: String, number: Number) {
    when (number) {
      is Byte -> contentValues.put(key, number)
      is Short -> contentValues.put(key, number)
      is Int -> contentValues.put(key, number)
      is Long -> contentValues.put(key, number)
      is Float -> contentValues.put(key, number)
      is Double -> putDouble(contentValues, key, number)
      else -> putDouble(contentValues, key, number.toDouble())
    }
  }

  private fun putDouble(contentValues: ContentValues, key: String, value: Double) {
    when {
      value.isNaN() || value.isInfinite() ->
        throw IllegalArgumentException("Unsupported numeric value for key $key: $value")
      value % 1.0 == 0.0 && value <= Long.MAX_VALUE && value >= Long.MIN_VALUE -> {
        val longValue = value.toLong()
        if (longValue.toDouble() == value) {
          contentValues.put(key, longValue)
        } else {
          contentValues.put(key, value)
        }
      }
      else -> contentValues.put(key, value)
    }
  }

}
