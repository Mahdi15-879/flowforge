const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Integration tests require an explicit DATABASE_URL.");
}

let actual;

try {
  actual = new URL(databaseUrl);
} catch {
  throw new Error("Invalid integration DATABASE_URL.");
}

if (
  actual.protocol !== "postgresql:" ||
  actual.hostname !== "127.0.0.1" ||
  actual.port !== "15432" ||
  actual.username !== "flowforge" ||
  actual.pathname !== "/flowforge_test" ||
  actual.searchParams.get("schema") !== "public"
) {
  throw new Error(
    "Unsafe integration database connection. Expected local flowforge_test.",
  );
}
