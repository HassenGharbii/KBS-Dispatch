// Baseline pragmas. Migrations are plain TS modules (not .sql files) because
// Metro has no built-in loader for importing raw text/SQL files.
export const sql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
`;
