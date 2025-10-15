import React, { useState } from "react";
import { Button, SafeAreaView, ScrollView, Text, View } from "react-native";

import ContentResolver, {
  EXTERNAL_CONTENT_URI,
  MediaColumns,
  QUERY_SORT_DIRECTION,
  QueryArgs,
} from "@hortemo/expo-content-resolver";

const SAMPLE_RECORDS = [
  {
    id: "alpha",
    baseName: "alpha",
    mimeType: "image/jpeg",
    size: 322_000,
  },
  {
    id: "bravo",
    baseName: "bravo photo",
    mimeType: "image/jpeg",
    size: 222_000,
  },
  {
    id: "charlie",
    baseName: "charlie",
    mimeType: "image/jpeg",
    size: 198_000,
  },
  {
    id: "delta",
    baseName: "délta-æøå-🙂",
    mimeType: "image/jpeg",
    size: 123_000,
  },
] as const;

type State = {
  status: "idle" | "running" | "done" | "error";
  error: string | null;
};

async function runIntegrationTest(): Promise<string | null> {
  const runId = Date.now();
  const inserted: Array<{
    displayName: string;
    contentUri: string;
    mimeType: string;
    size: number;
  }> = [];

  // Insert and verify by contentUri
  for (const s of SAMPLE_RECORDS) {
    const seconds = Math.floor(Date.now() / 1000);
    const displayName = `${s.baseName}-${runId}.jpg`;

    const contentUri = await ContentResolver.insert(
      EXTERNAL_CONTENT_URI.Images,
      {
        [MediaColumns.DISPLAY_NAME]: displayName,
        [MediaColumns.MIME_TYPE]: s.mimeType,
        [MediaColumns.DATE_ADDED]: seconds,
        [MediaColumns.DATE_MODIFIED]: seconds,
        relative_path: "Pictures/ExpoContentResolver/",
        is_pending: 0,
        [MediaColumns.SIZE]: s.size,
      }
    );

    if (!contentUri) return `Insert returned null for ${s.id}`;

    const rows = await ContentResolver.query(
      contentUri,
      [MediaColumns.DISPLAY_NAME],
      {}
    );
    if (rows.length !== 1) return `Inserted row not found for ${s.id}`;
    if (rows[0][MediaColumns.DISPLAY_NAME] !== displayName)
      return `Inserted row display name mismatch for ${s.id}`;

    inserted.push({
      displayName,
      contentUri,
      mimeType: s.mimeType,
      size: s.size,
    });
  }

  // Metadata presence + MIME check
  const metadata = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME, MediaColumns.MIME_TYPE],
    {
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.DATE_ADDED],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.DESCENDING,
    }
  );
  if (!metadata.length) return "MediaStore metadata query returned no rows";

  for (const fx of inserted) {
    const rec = metadata.find(
      (r) => r[MediaColumns.DISPLAY_NAME] === fx.displayName
    );
    if (!rec) return `Missing ${fx.displayName} from metadata query`;
    const mime = rec[MediaColumns.MIME_TYPE];
    if (mime && mime !== fx.mimeType)
      return `Unexpected MIME type for ${fx.displayName}`;
  }

  // Name-based ordering + selection
  const alphabetical = [...inserted]
    .map((f) => f.displayName)
    .sort((a, b) => a.localeCompare(b));
  const selectionIn = `${MediaColumns.DISPLAY_NAME} IN (${alphabetical.map(() => "?").join(", ")})`;
  const baseArgs: QueryArgs = {
    QUERY_ARG_SQL_SELECTION: selectionIn,
    QUERY_ARG_SQL_SELECTION_ARGS: alphabetical,
    QUERY_ARG_LIMIT: alphabetical.length,
  };

  // Name sort ASC
  const asc = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME],
    {
      ...baseArgs,
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.DISPLAY_NAME],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.ASCENDING,
    }
  );
  if (asc.length !== alphabetical.length)
    return "Ascending sort query returned unexpected row count";
  const ascNames = asc.map((r) => r[MediaColumns.DISPLAY_NAME]);
  for (let i = 0; i < alphabetical.length; i++)
    if (ascNames[i] !== alphabetical[i]) return "Ascending sort order mismatch";

  // Name sort DESC
  const desc = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME],
    {
      ...baseArgs,
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.DISPLAY_NAME],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.DESCENDING,
    }
  );
  if (desc.length !== alphabetical.length)
    return "Descending sort query returned unexpected row count";
  const descNames = desc.map((r) => r[MediaColumns.DISPLAY_NAME]);
  const expectedDesc = [...alphabetical].reverse();
  for (let i = 0; i < expectedDesc.length; i++)
    if (descNames[i] !== expectedDesc[i])
      return "Descending sort order mismatch";

  // SIZE sort (ASC) within the same IN selection
  const bySizeAsc = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME, MediaColumns.SIZE],
    {
      ...baseArgs,
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.SIZE],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.ASCENDING,
    }
  );
  const sizesSeen = bySizeAsc.map((r) => r[MediaColumns.SIZE]);
  const sizesExpected = [...inserted].map((f) => f.size).sort((a, b) => a - b);
  for (let i = 0; i < sizesExpected.length; i++)
    if (sizesSeen[i] !== sizesExpected[i])
      return "SIZE ascending sort mismatch";

  // LIMIT works (deterministic using DISPLAY_NAME ASC)
  const limited = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME],
    {
      ...baseArgs,
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.DISPLAY_NAME],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.ASCENDING,
      QUERY_ARG_LIMIT: 2,
    }
  );
  const expectedLimited = alphabetical.slice(0, 2);
  if (limited.length !== 2) return "LIMIT query did not return 2 rows";
  const limitedNames = limited.map((r) => r[MediaColumns.DISPLAY_NAME]);
  if (
    limitedNames[0] !== expectedLimited[0] ||
    limitedNames[1] !== expectedLimited[1]
  )
    return "LIMIT + sort returned unexpected rows";

  // LIKE selection (prefix for the 'alpha' record)
  const likePrefix = `alpha-${runId}%`;
  const likeRows = await ContentResolver.query(
    EXTERNAL_CONTENT_URI.Images,
    [MediaColumns.DISPLAY_NAME],
    {
      QUERY_ARG_SQL_SELECTION: `${MediaColumns.DISPLAY_NAME} LIKE ?`,
      QUERY_ARG_SQL_SELECTION_ARGS: [likePrefix],
      QUERY_ARG_LIMIT: 5,
      QUERY_ARG_SORT_COLUMNS: [MediaColumns.DISPLAY_NAME],
      QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.ASCENDING,
    }
  );
  if (likeRows.length !== 1)
    return "LIKE selection returned unexpected row count";
  if (!likeRows[0][MediaColumns.DISPLAY_NAME].startsWith(`alpha-${runId}`))
    return "LIKE selection mismatch";

  return null;
}

const App = (): JSX.Element => {
  const [state, setState] = useState<State>({ status: "idle", error: null });

  const onRun = () => {
    setState({ status: "running", error: null });
    runIntegrationTest()
      .then((failure) =>
        setState(
          failure
            ? { status: "error", error: failure }
            : { status: "done", error: null }
        )
      )
      .catch((err) =>
        setState({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: "600" }}>
          Expo Content Resolver
        </Text>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#d4d4d8",
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "500" }}>
            Insert and query MediaStore
          </Text>

          <Button
            title="Run test"
            onPress={onRun}
            testID="testButton-integration"
            accessibilityLabel="Run Insert and query MediaStore"
            disabled={state.status === "running"}
          />

          <Text testID="testStatus-integration">{state.status}</Text>

          {state.error ? (
            <Text testID="testError-integration" style={{ color: "#dc2626" }}>
              {state.error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
