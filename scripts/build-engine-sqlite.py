#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import sqlite3
import sys
import time
from pathlib import Path

csv.field_size_limit(sys.maxsize)


def connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    return conn


def schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS contacts;
        DROP TABLE IF EXISTS phone_index;
        DROP TABLE IF EXISTS ruc_phone_agg;
        DROP TABLE IF EXISTS dni_phone_agg;
        DROP TABLE IF EXISTS contacts_fts;

        CREATE TABLE contacts (
            id INTEGER PRIMARY KEY,
            dni TEXT NOT NULL,
            name TEXT,
            org_ruc TEXT,
            org_name TEXT,
            phone_primary TEXT,
            phone_secondary TEXT
        );
        CREATE TABLE phone_index (
            phone TEXT NOT NULL,
            contact_id INTEGER NOT NULL
        );
        CREATE TABLE ruc_phone_agg (
            org_ruc TEXT PRIMARY KEY,
            phones TEXT NOT NULL
        );
        CREATE TABLE dni_phone_agg (
            dni TEXT PRIMARY KEY,
            phones TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE contacts_fts USING fts5(
            person_name,
            company_name
        );

        CREATE INDEX idx_contacts_dni ON contacts(dni);
        CREATE INDEX idx_contacts_ruc ON contacts(org_ruc);
        CREATE INDEX idx_phone_index_phone ON phone_index(phone);
        """
    )


def norm(v: str) -> str:
    return (v or "").strip()


def digits(v: str) -> str:
    return "".join(ch for ch in (v or "") if ch.isdigit())


def norm_dni(v: str) -> str:
    cleaned = digits(v)
    return cleaned if 7 <= len(cleaned) <= 12 else ""


def norm_ruc(v: str) -> str:
    cleaned = digits(v)
    return cleaned if len(cleaned) == 11 else ""


def norm_phone(v: str) -> str:
    cleaned = digits(v)
    if len(cleaned) == 11 and cleaned.startswith("51"):
        cleaned = cleaned[2:]
    if len(cleaned) == 9 and cleaned.startswith("9"):
        return cleaned
    return ""


def parse_phones(v: str) -> tuple[str, str, list[str]]:
    parts = [p.strip() for p in (v or "").split(";") if p.strip()]
    uniq: list[str] = []
    seen = set()
    for p in parts:
        p = norm_phone(p)
        if not p:
            continue
        if p in seen:
            continue
        seen.add(p)
        uniq.append(p)
    p1 = uniq[0] if uniq else ""
    p2 = uniq[1] if len(uniq) > 1 else ""
    return p1, p2, uniq


def build(input_csv: Path, output_db: Path) -> dict[str, int]:
    conn = connect(output_db)
    schema(conn)
    rows = 0
    phone_rows = 0

    with input_csv.open("r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f)
        batch: list[tuple[tuple[str, str, str, str, str, str], list[str]]] = []
        for row in r:
            dni = norm_dni(row.get("dni", ""))
            if not dni:
                continue
            name = norm(row.get("name", ""))
            ruc = norm_ruc(row.get("org_ruc", row.get("ruc", "")))
            org = norm(row.get("org_name", row.get("company", "")))

            p1 = norm_phone(row.get("phone_primary", row.get("phone", "")))
            p2 = norm_phone(row.get("phone_secondary", ""))
            all_phones = norm(row.get("phones_all", ""))
            if all_phones:
                p1, p2, parsed = parse_phones(all_phones)
            else:
                parsed = []
                seen = set()
                for phone in [p1, p2]:
                    if phone and phone not in seen:
                        seen.add(phone)
                        parsed.append(phone)

            batch.append(((dni, name, ruc, org, p1, p2), parsed))
            rows += 1

            if len(batch) >= 10000:
                phone_rows += flush_batch(conn, batch)
                batch.clear()
                conn.commit()

        if batch:
            phone_rows += flush_batch(conn, batch)

    conn.execute(
        "INSERT INTO contacts_fts(rowid,person_name,company_name) SELECT id, COALESCE(name,''), COALESCE(org_name,'') FROM contacts"
    )
    conn.execute(
        """
        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT c.org_ruc AS org_ruc, p.phone AS phone
            FROM contacts c JOIN phone_index p ON p.contact_id = c.id
            WHERE c.org_ruc IS NOT NULL AND c.org_ruc <> ''
            GROUP BY c.org_ruc, p.phone
            ORDER BY c.org_ruc, p.phone
        )
        GROUP BY org_ruc
        """
    )
    conn.execute(
        """
        INSERT INTO dni_phone_agg(dni, phones)
        SELECT dni, group_concat(phone, ';')
        FROM (
            SELECT c.dni AS dni, p.phone AS phone
            FROM contacts c JOIN phone_index p ON p.contact_id = c.id
            WHERE c.dni IS NOT NULL AND c.dni <> ''
            GROUP BY c.dni, p.phone
            ORDER BY c.dni, p.phone
        )
        GROUP BY dni
        """
    )
    conn.commit()
    conn.close()
    return {"rows": rows, "phone_rows": phone_rows}


def flush_batch(conn: sqlite3.Connection, batch: list[tuple[tuple[str, str, str, str, str, str], list[str]]]) -> int:
    contacts_only = [row for row, _ in batch]
    conn.executemany(
        "INSERT INTO contacts(dni,name,org_ruc,org_name,phone_primary,phone_secondary) VALUES (?,?,?,?,?,?)",
        contacts_only,
    )
    first_id = conn.execute("SELECT MAX(id) - ? + 1 FROM contacts", (len(batch),)).fetchone()[0]
    phone_rows = []
    for i, (_, phones) in enumerate(batch):
        cid = first_id + i
        for phone in phones:
            phone_rows.append((phone, cid))
    if phone_rows:
        conn.executemany("INSERT INTO phone_index(phone,contact_id) VALUES (?,?)", phone_rows)
    return len(phone_rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="Build engine sqlite snapshot from contacts csv")
    ap.add_argument("--input", default="apps/engine/data/contacts.csv")
    ap.add_argument("--output", default="apps/engine/data/contacts.sqlite")
    args = ap.parse_args()

    start = time.time()
    info = build(Path(args.input), Path(args.output))
    print({"output": args.output, **info, "elapsed_s": round(time.time() - start, 2)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
