import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type Kysely,
  type QueryCompiler,
  type QueryResult,
  type TransactionSettings,
} from "kysely";

interface LibSQLExecutor {
  execute(stmt: LibSQLStatement): Promise<LibSQLResultSet>;
}

interface LibSQLClient extends LibSQLExecutor {
  closed: boolean;
  close(): void;
  transaction(mode?: "write" | "read" | "deferred"): Promise<LibSQLTransaction>;
}

interface LibSQLTransaction extends LibSQLExecutor {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface LibSQLStatement {
  sql: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any[];
}

interface LibSQLResultSet {
  lastInsertRowid: bigint | undefined;
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

export class LibSQLDialect implements Dialect {
  readonly #client: LibSQLClient;

  constructor(client: LibSQLClient) {
    this.#client = client;
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createDriver(): Driver {
    return new LibSQLDriver(this.#client);
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }
}

class LibSQLDriver implements Driver {
  readonly #client: LibSQLClient;

  constructor(client: LibSQLClient) {
    this.#client = client;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<LibSQLConnection> {
    return new LibSQLConnection(this.#client);
  }

  async beginTransaction(
    connection: DatabaseConnection,
    settings: TransactionSettings,
  ): Promise<void> {
    if (!(connection instanceof LibSQLConnection)) {
      throw new Error(
        "beginTransaction called with unexpected connection type",
      );
    }
    await connection.begin(settings);
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    if (!(connection instanceof LibSQLConnection)) {
      throw new Error(
        "commitTransaction called with unexpected connection type",
      );
    }
    await connection.commit();
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    if (!(connection instanceof LibSQLConnection)) {
      throw new Error(
        "rollbackTransaction called with unexpected connection type",
      );
    }
    await connection.rollback();
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {
    if (!this.#client.closed) {
      this.#client.close();
    }
  }
}

class LibSQLConnection implements DatabaseConnection {
  readonly #client: LibSQLClient;
  #transaction: LibSQLTransaction | undefined;

  constructor(client: LibSQLClient) {
    this.#client = client;
  }

  get #executor(): LibSQLExecutor {
    return this.#transaction ?? this.#client;
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const result = await this.#executor.execute({
      sql: compiledQuery.sql,
      args: [...compiledQuery.parameters],
    });

    const rows: R[] = [];

    for (const row of result.rows) {
      const obj: Record<string, unknown> = {};
      for (const key in row) {
        obj[key] = row[key];
      }
      // Driver boundary: R is erased at runtime; the row shape is guaranteed
      // by kysely's type-level tracking, not enforced here.
      // oxlint-disable-next-line no-unsafe-type-assertion
      rows.push(obj as unknown as R);
    }

    return {
      rows,
      numAffectedRows: BigInt(result.rowsAffected),
      insertId: result.lastInsertRowid,
    };
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("LibSQL dialect does not support streaming.");
  }

  async begin(settings: TransactionSettings): Promise<void> {
    this.#transaction = await this.#client.transaction(
      settings.accessMode === "read only" ? "read" : "write",
    );
  }

  async commit(): Promise<void> {
    await this.#transaction?.commit();
    this.#transaction = undefined;
  }

  async rollback(): Promise<void> {
    await this.#transaction?.rollback();
    this.#transaction = undefined;
  }
}
