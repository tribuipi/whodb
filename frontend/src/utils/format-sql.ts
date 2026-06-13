import { format } from 'sql-formatter';

/** Maps a WhoDB source type to a sql-formatter dialect. Falls back to the generic 'sql' dialect. */
function dialectFor(sourceType: string | undefined): string {
  switch ((sourceType ?? '').toLowerCase()) {
    case 'postgres':
    case 'cockroachdb':
    case 'yugabytedb':
    case 'questdb':
      return 'postgresql';
    case 'mysql':
      return 'mysql';
    case 'mariadb':
      return 'mariadb';
    case 'tidb':
      return 'tidb';
    case 'sqlite3':
      return 'sqlite';
    case 'duckdb':
      return 'duckdb';
    case 'clickhouse':
      return 'clickhouse';
    default:
      return 'sql';
  }
}

/**
 * Pretty-prints a SQL string for the given source type. Returns the original
 * string unchanged if the formatter throws (e.g. on unsupported syntax).
 */
export function formatSql(code: string, sourceType: string | undefined): string {
  try {
    return format(code, { language: dialectFor(sourceType) as any });
  } catch {
    return code;
  }
}
