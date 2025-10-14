import { useCallback, useEffect, useMemo, useState } from "react";
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
    baseName: "bravo",
    mimeType: "image/jpeg",
    size: 222_000,
  },
  {
    id: "charlie",
    baseName: "charlie",
    mimeType: "image/jpeg",
    size: 198_000,
  },
] as const;

type TestState = {
  status: "idle" | "running" | "done" | "error";
  error: string | null;
};

type TestCase = {
  id: string;
  label: string;
  run: () => Promise<string | null>;
};

type TestStatusMap = Record<string, TestState>;

const createInitialStatuses = (cases: TestCase[]): TestStatusMap =>
  cases.reduce<TestStatusMap>((acc, testCase) => {
    acc[testCase.id] = { status: "idle", error: null };
    return acc;
  }, {} as TestStatusMap);

const createTestCases = (): TestCase[] => [
  {
    id: "integration",
    label: "Insert and query MediaStore",
    run: async () => {
      const runId = Date.now();
      const inserted: Array<{
        displayName: string;
        contentUri: string;
        mimeType: string;
        size: number;
      }> = [];

      for (const sample of SAMPLE_RECORDS) {
        const seconds = Math.floor(Date.now() / 1000);
        const displayName = `${sample.baseName}-${runId}.jpg`;

        const contentUri = await ContentResolver.insert(
          EXTERNAL_CONTENT_URI.Images,
          {
            [MediaColumns.DISPLAY_NAME]: displayName,
            [MediaColumns.MIME_TYPE]: sample.mimeType,
            [MediaColumns.DATE_ADDED]: seconds,
            [MediaColumns.DATE_MODIFIED]: seconds,
            relative_path: "Pictures/ExpoContentResolver/",
            is_pending: 0,
            [MediaColumns.SIZE]: sample.size,
          }
        );

        if (!contentUri) {
          return `Insert returned null for ${sample.id}`;
        }

        const rows = await ContentResolver.query(
          contentUri,
          [MediaColumns.DISPLAY_NAME],
          {}
        );

        if (rows.length !== 1) {
          return `Inserted row not found for ${sample.id}`;
        }

        const [row] = rows;
        if (row[MediaColumns.DISPLAY_NAME] !== displayName) {
          return `Inserted row display name mismatch for ${sample.id}`;
        }

        inserted.push({
          displayName,
          contentUri,
          mimeType: sample.mimeType,
          size: sample.size,
        });
      }

      const metadataRecords = await ContentResolver.query(
        EXTERNAL_CONTENT_URI.Images,
        [MediaColumns.DISPLAY_NAME, MediaColumns.MIME_TYPE],
        {
          QUERY_ARG_SORT_COLUMNS: [MediaColumns.DATE_ADDED],
          QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.DESCENDING,
        }
      );

      if (metadataRecords.length === 0) {
        return "MediaStore metadata query returned no rows";
      }

      for (const fixture of inserted) {
        const record = metadataRecords.find(
          (candidate) =>
            candidate[MediaColumns.DISPLAY_NAME] === fixture.displayName
        );

        if (!record) {
          return `Missing ${fixture.displayName} from metadata query`;
        }

        const mime = record[MediaColumns.MIME_TYPE];
        if (mime && mime !== fixture.mimeType) {
          return `Unexpected MIME type for ${fixture.displayName}`;
        }
      }

      const alphabeticalNames = [...inserted]
        .map((fixture) => fixture.displayName)
        .sort((a, b) => a.localeCompare(b));

      const placeholders = alphabeticalNames.map(() => "?").join(", ");
      const selection = `${MediaColumns.DISPLAY_NAME} IN (${placeholders})`;

      const queryArgsBase: QueryArgs = {
        QUERY_ARG_SQL_SELECTION: selection,
        QUERY_ARG_SQL_SELECTION_ARGS: alphabeticalNames,
        QUERY_ARG_SORT_COLUMNS: [MediaColumns.DISPLAY_NAME],
        QUERY_ARG_LIMIT: alphabeticalNames.length,
      };

      const ascendingRecords = await ContentResolver.query(
        EXTERNAL_CONTENT_URI.Images,
        [MediaColumns.DISPLAY_NAME],
        {
          ...queryArgsBase,
          QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.ASCENDING,
        }
      );

      if (ascendingRecords.length !== alphabeticalNames.length) {
        return "Ascending sort query returned unexpected row count";
      }

      const ascendingNames = ascendingRecords.map(
        (record) => record[MediaColumns.DISPLAY_NAME]
      );

      if (
        ascendingNames.some((name, index) => name !== alphabeticalNames[index])
      ) {
        return "Ascending sort order mismatch";
      }

      const descendingRecords = await ContentResolver.query(
        EXTERNAL_CONTENT_URI.Images,
        [MediaColumns.DISPLAY_NAME],
        {
          ...queryArgsBase,
          QUERY_ARG_SORT_DIRECTION: QUERY_SORT_DIRECTION.DESCENDING,
        }
      );

      if (descendingRecords.length !== alphabeticalNames.length) {
        return "Descending sort query returned unexpected row count";
      }

      const expectedDescending = [...alphabeticalNames].reverse();
      const descendingNames = descendingRecords.map(
        (record) => record[MediaColumns.DISPLAY_NAME]
      );

      if (
        descendingNames.some(
          (name, index) => name !== expectedDescending[index]
        )
      ) {
        return "Descending sort order mismatch";
      }

      return null;
    },
  },
];

const App = (): JSX.Element => {
  const [statuses, setStatuses] = useState<TestStatusMap>({});

  const testCases = useMemo(() => createTestCases(), []);

  useEffect(() => {
    if (testCases.length === 0) {
      setStatuses({});
      return;
    }

    setStatuses(createInitialStatuses(testCases));
  }, [testCases]);

  const runTest = useCallback(
    (testCase: TestCase) => async () => {
      setStatuses((prev) => ({
        ...prev,
        [testCase.id]: { status: "running", error: null },
      }));

      try {
        const failure = await testCase.run();

        setStatuses((prev) => ({
          ...prev,
          [testCase.id]: failure
            ? { status: "error", error: failure }
            : { status: "done", error: null },
        }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setStatuses((prev) => ({
          ...prev,
          [testCase.id]: { status: "error", error: message },
        }));
      }
    },
    []
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: "600" }}>
          Expo Content Resolver
        </Text>

        {testCases.map((testCase) => {
          const testState = statuses[testCase.id];

          return (
            <View
              key={testCase.id}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#d4d4d8",
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "500" }}>
                {testCase.label}
              </Text>

              <Button
                title="Run test"
                onPress={runTest(testCase)}
                testID={`testButton-${testCase.id}`}
                accessibilityLabel={`Run ${testCase.label}`}
                disabled={testState?.status === "running"}
              />

              <Text testID={`testStatus-${testCase.id}`}>
                {testState?.status ?? "idle"}
              </Text>

              {testState?.error ? (
                <Text
                  testID={`testError-${testCase.id}`}
                  style={{ color: "#dc2626" }}
                >
                  {testState.error}
                </Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
