use pipeline::materialize::materialize_serving;
use pipeline::storage::db::open_rw;
use pipeline::storage::schema::init_schema;
use rusqlite::{Connection, params};
use tempfile::tempdir;

struct TestDb {
    _dir: tempfile::TempDir,
    path: String,
}

fn new_db() -> TestDb {
    let dir = tempdir().expect("create tempdir");
    let path = dir
        .path()
        .join("stage.sqlite")
        .to_string_lossy()
        .to_string();

    init_schema(&path).expect("init schema");

    TestDb { _dir: dir, path }
}

fn seed_dirty_doc(conn: &Connection, doc_id: i64, dni: &str, name: &str, natural_ruc: &str) {
    conn.execute(
        "INSERT INTO document(doc_id, doc_type, doc_number) VALUES (?1, 'DNI', ?2)",
        params![doc_id, dni],
    )
    .expect("insert document");

    conn.execute(
        "INSERT INTO document_attribute(doc_id, full_name, natural_ruc10) VALUES (?1, ?2, ?3)",
        params![doc_id, name, natural_ruc],
    )
    .expect("insert attribute");

    conn.execute(
        "INSERT INTO projection_dirty_doc(doc_id) VALUES (?1)",
        params![doc_id],
    )
    .expect("mark dirty");
}

fn add_phone(conn: &Connection, doc_id: i64, phone: &str, confidence: i64) {
    conn.execute(
        "INSERT INTO document_phone(
             doc_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence
         ) VALUES (?1, ?2, 1, 1, ?3)",
        params![doc_id, phone, confidence],
    )
    .expect("insert phone");
}

#[test]
fn projects_name_natural_ruc_and_ranks_phones_by_confidence() {
    let db = new_db();

    {
        let conn = open_rw(&db.path).expect("open db");

        seed_dirty_doc(&conn, 1, "12345678", "AGUIRRE BECERRA, ELOY", "10123456781");
        add_phone(&conn, 1, "999000111", 10);
        add_phone(&conn, 1, "988000222", 90);
        add_phone(&conn, 1, "977000333", 50);
    }

    materialize_serving(&db.path).expect("materialize");

    let conn = open_rw(&db.path).expect("reopen db");
    let (name, person_ruc, primary, secondary): (String, String, String, String) = conn
        .query_row(
            "SELECT name, person_ruc, phone_primary, phone_secondary
             FROM doc_projection WHERE doc_id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .expect("projected row");

    assert_eq!(name, "AGUIRRE BECERRA, ELOY");
    assert_eq!(person_ruc, "10123456781");
    assert_eq!(primary, "988000222", "highest confidence wins primary");
    assert_eq!(secondary, "977000333", "second highest wins secondary");
}

// Rebuilding one dirty document must not change another document's projection.
#[test]
fn rebuilding_one_document_leaves_the_others_alone() {
    let db = new_db();

    {
        let conn = open_rw(&db.path).expect("open db");

        seed_dirty_doc(&conn, 1, "11111111", "FIRST PERSON", "10111111111");
        add_phone(&conn, 1, "999000111", 10);

        seed_dirty_doc(&conn, 2, "22222222", "SECOND PERSON", "10222222221");
        add_phone(&conn, 2, "999000222", 99);
    }

    materialize_serving(&db.path).expect("first materialize");

    {
        let conn = open_rw(&db.path).expect("open db");

        conn.execute(
            "UPDATE document_attribute SET full_name = 'FIRST RENAMED' WHERE doc_id = 1",
            [],
        )
        .expect("rename");

        conn.execute("INSERT INTO projection_dirty_doc(doc_id) VALUES (1)", [])
            .expect("mark dirty again");
    }

    materialize_serving(&db.path).expect("second materialize");

    let conn = open_rw(&db.path).expect("reopen db");

    let first: String = conn
        .query_row(
            "SELECT name FROM doc_projection WHERE doc_id = 1",
            [],
            |row| row.get(0),
        )
        .expect("first row");

    let second: String = conn
        .query_row(
            "SELECT name FROM doc_projection WHERE doc_id = 2",
            [],
            |row| row.get(0),
        )
        .expect("second row");

    let second_phone: String = conn
        .query_row(
            "SELECT phone_primary FROM doc_projection WHERE doc_id = 2",
            [],
            |row| row.get(0),
        )
        .expect("second phone");

    assert_eq!(first, "FIRST RENAMED");
    assert_eq!(second, "SECOND PERSON");
    assert_eq!(second_phone, "999000222");
}

// Rebuilding a document must replace its FTS entry instead of leaving stale data.
#[test]
fn rebuild_replaces_the_fts_entry_rather_than_duplicating_it() {
    let db = new_db();

    {
        let conn = open_rw(&db.path).expect("open db");
        seed_dirty_doc(&conn, 1, "12345678", "OLD NAME", "10123456781");
    }

    materialize_serving(&db.path).expect("first materialize");

    {
        let conn = open_rw(&db.path).expect("open db");

        conn.execute(
            "UPDATE document_attribute SET full_name = 'NEW NAME' WHERE doc_id = 1",
            [],
        )
        .expect("rename");

        conn.execute("INSERT INTO projection_dirty_doc(doc_id) VALUES (1)", [])
            .expect("mark dirty again");
    }

    materialize_serving(&db.path).expect("second materialize");

    let conn = open_rw(&db.path).expect("reopen db");

    let stale: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM doc_projection_fts WHERE doc_projection_fts MATCH 'OLD'",
            [],
            |row| row.get(0),
        )
        .expect("stale count");

    let fresh: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM doc_projection_fts WHERE doc_projection_fts MATCH 'NEW'",
            [],
            |row| row.get(0),
        )
        .expect("fresh count");

    assert_eq!(stale, 0, "the previous name must not remain searchable");
    assert_eq!(fresh, 1);
}

// Phone ranking must be scoped to dirty documents.
#[test]
fn ranking_ignores_phones_belonging_to_clean_documents() {
    let db = new_db();

    {
        let conn = open_rw(&db.path).expect("open db");

        seed_dirty_doc(&conn, 1, "11111111", "DIRTY PERSON", "10111111111");
        add_phone(&conn, 1, "999000111", 10);

        seed_dirty_doc(&conn, 2, "22222222", "CLEAN PERSON", "10222222221");
        add_phone(&conn, 2, "988000222", 99);

        conn.execute("DELETE FROM projection_dirty_doc WHERE doc_id = 2", [])
            .expect("leave doc 2 clean");
    }

    materialize_serving(&db.path).expect("materialize");

    let conn = open_rw(&db.path).expect("reopen db");

    let primary: String = conn
        .query_row(
            "SELECT phone_primary FROM doc_projection WHERE doc_id = 1",
            [],
            |row| row.get(0),
        )
        .expect("dirty row");

    let clean_rows: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM doc_projection WHERE doc_id = 2",
            [],
            |row| row.get(0),
        )
        .expect("clean count");

    assert_eq!(primary, "999000111");
    assert_eq!(clean_rows, 0, "a clean document is not projected");
}
