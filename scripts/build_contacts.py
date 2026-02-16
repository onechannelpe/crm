#!/usr/bin/env python3
"""Build a complete deduplicated contacts CSV for engine search.

Output schema:
    dni,name,doc_type,role,phone_primary,phone_secondary,phones_all,org_ruc,org_name,sources

Guarantees:
- all configured raw sources are ingested
- all distinct normalized phones are preserved in phones_all
- engine-critical fields stay parser-friendly (no commas/quotes/newlines)
"""

from __future__ import annotations

import argparse
import csv
import re
import sqlite3
import sys
import time
from pathlib import Path
from typing import Iterable

PHONE_COLUMNS = ["TELEFONO_IBK", "TELEFONO_CIP", *[f"TELEFONO{i}" for i in range(1, 26)]]

SRC_REP_CSV = 1 << 0
SRC_REP_PIPE = 1 << 1
SRC_MOVISTAR = 1 << 2
SRC_CLARO = 1 << 3
SRC_BITEL = 1 << 4
SRC_CELULARES = 1 << 5

SOURCE_LABELS = [
    (SRC_REP_CSV, "representantes_csv"),
    (SRC_REP_PIPE, "representantes_pipe"),
    (SRC_MOVISTAR, "movistar"),
    (SRC_CLARO, "claro"),
    (SRC_BITEL, "bitel"),
    (SRC_CELULARES, "celulares"),
]


def normalize_doc(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if 7 <= len(digits) <= 12:
        return digits
    return ""


def normalize_ruc(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    return digits if len(digits) == 11 else ""


def normalize_phone(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) == 11 and digits.startswith("51"):
        digits = digits[2:]
    if len(digits) == 9 and digits.startswith("9"):
        return digits
    return ""


def sanitize_text(value: str) -> str:
    if not value:
        return ""
    text = value.replace("\r", " ").replace("\n", " ")
    text = text.replace('"', "").replace(",", " ").replace("|", " ").replace(";", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def pick_unique_phones(raw_phones: Iterable[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in raw_phones:
        phone = normalize_phone(raw)
        if not phone or phone in seen:
            continue
        seen.add(phone)
        out.append(phone)
    return out


def source_labels_from_mask(mask: int) -> str:
    labels = [label for bit, label in SOURCE_LABELS if mask & bit]
    return "+".join(labels)


def open_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            dni TEXT NOT NULL,
            org_ruc TEXT NOT NULL,
            name TEXT,
            doc_type TEXT,
            role TEXT,
            org_name TEXT,
            source_mask INTEGER NOT NULL DEFAULT 0,
            name_score INTEGER NOT NULL DEFAULT 0,
            org_score INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(dni, org_ruc)
        ) WITHOUT ROWID
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contact_phones (
            dni TEXT NOT NULL,
            org_ruc TEXT NOT NULL,
            phone TEXT NOT NULL,
            PRIMARY KEY (dni, org_ruc, phone)
        ) WITHOUT ROWID
        """
    )
    return conn


UPSERT_CONTACT_SQL = """
INSERT INTO contacts (
    dni, org_ruc, name, doc_type, role, org_name, source_mask, name_score, org_score
) VALUES (
    ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?
)
ON CONFLICT(dni, org_ruc) DO UPDATE SET
    name = CASE
        WHEN excluded.name IS NULL THEN contacts.name
        WHEN contacts.name IS NULL THEN excluded.name
        WHEN excluded.name_score > contacts.name_score THEN excluded.name
        WHEN excluded.name_score = contacts.name_score AND length(excluded.name) > length(contacts.name)
            THEN excluded.name
        ELSE contacts.name
    END,
    name_score = CASE
        WHEN excluded.name IS NULL THEN contacts.name_score
        WHEN contacts.name IS NULL THEN excluded.name_score
        WHEN excluded.name_score > contacts.name_score THEN excluded.name_score
        WHEN excluded.name_score = contacts.name_score AND length(excluded.name) > length(contacts.name)
            THEN excluded.name_score
        ELSE contacts.name_score
    END,
    doc_type = CASE
        WHEN contacts.doc_type IS NULL OR contacts.doc_type = '' THEN excluded.doc_type
        ELSE contacts.doc_type
    END,
    role = CASE
        WHEN contacts.role IS NULL OR contacts.role = '' THEN excluded.role
        ELSE contacts.role
    END,
    org_name = CASE
        WHEN excluded.org_name IS NULL THEN contacts.org_name
        WHEN contacts.org_name IS NULL THEN excluded.org_name
        WHEN excluded.org_score > contacts.org_score THEN excluded.org_name
        WHEN excluded.org_score = contacts.org_score AND length(excluded.org_name) > length(contacts.org_name)
            THEN excluded.org_name
        ELSE contacts.org_name
    END,
    org_score = CASE
        WHEN excluded.org_name IS NULL THEN contacts.org_score
        WHEN contacts.org_name IS NULL THEN excluded.org_score
        WHEN excluded.org_score > contacts.org_score THEN excluded.org_score
        WHEN excluded.org_score = contacts.org_score AND length(excluded.org_name) > length(contacts.org_name)
            THEN excluded.org_score
        ELSE contacts.org_score
    END,
    source_mask = contacts.source_mask | excluded.source_mask
"""


INSERT_PHONE_SQL = """
INSERT OR IGNORE INTO contact_phones (dni, org_ruc, phone)
VALUES (?, ?, ?)
"""


class Builder:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.pending = 0
        self.contact_upserts = 0
        self.phone_inserts = 0

    def push(
        self,
        *,
        dni: str,
        org_ruc: str,
        name: str,
        doc_type: str,
        role: str,
        org_name: str,
        phones: list[str],
        source_mask: int,
        name_score: int,
        org_score: int,
    ) -> None:
        if not dni:
            return
        self.conn.execute(
            UPSERT_CONTACT_SQL,
            (dni, org_ruc, name, doc_type, role, org_name, source_mask, name_score, org_score),
        )
        self.pending += 1
        self.contact_upserts += 1
        for phone in phones:
            self.conn.execute(INSERT_PHONE_SQL, (dni, org_ruc, phone))
            self.pending += 1
            self.phone_inserts += 1
        self._maybe_commit()

    def _maybe_commit(self) -> None:
        if self.pending >= 80_000:
            self.conn.commit()
            self.pending = 0

    def commit(self) -> None:
        if self.pending > 0:
            self.conn.commit()
            self.pending = 0


def ingest_representantes_csv(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("nro_documento") or "").strip())
            ruc = normalize_ruc((row.get("ruc") or "").strip())
            name = sanitize_text((row.get("nombre") or "").strip())
            doc_type = sanitize_text((row.get("documento") or "").strip())
            role = sanitize_text((row.get("cargo") or "").strip())
            org_name = sanitize_text((row.get("razon_social") or "").strip())
            phones = pick_unique_phones((row.get(col) or "" for col in PHONE_COLUMNS))
            builder.push(
                dni=dni,
                org_ruc=ruc,
                name=name,
                doc_type=doc_type,
                role=role,
                org_name=org_name,
                phones=phones,
                source_mask=SRC_REP_CSV,
                name_score=95,
                org_score=95,
            )
    builder.commit()
    return rows


def ingest_representantes_pipe(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter="|", quotechar='"')
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("nro_documento") or "").strip())
            ruc = normalize_ruc((row.get("ruc") or "").strip())
            name = sanitize_text((row.get("nombre") or "").strip())
            doc_type = sanitize_text((row.get("documento") or "").strip())
            role = sanitize_text((row.get("cargo") or "").strip())
            phones = pick_unique_phones((row.get(col) or "" for col in PHONE_COLUMNS))
            builder.push(
                dni=dni,
                org_ruc=ruc,
                name=name,
                doc_type=doc_type,
                role=role,
                org_name="",
                phones=phones,
                source_mask=SRC_REP_PIPE,
                name_score=90,
                org_score=0,
            )
    builder.commit()
    return rows


def ingest_movistar(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter="|")
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("bi_doc") or "").strip())
            name = sanitize_text((row.get("bi_razon") or "").strip())
            doc_type = sanitize_text((row.get("bi_tipo_doc") or "").strip())
            phone = normalize_phone((row.get("bi_telefono") or "").strip())
            if not phone:
                continue
            builder.push(
                dni=dni,
                org_ruc="",
                name=name,
                doc_type=doc_type,
                role="",
                org_name="",
                phones=[phone],
                source_mask=SRC_MOVISTAR,
                name_score=80,
                org_score=0,
            )
    builder.commit()
    return rows


def ingest_claro(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter="|")
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("ID_CARD_VALUE") or "").strip())
            name = sanitize_text((row.get("CUSTOMER_FULL_NAME") or "").strip())
            doc_type = sanitize_text((row.get("ID_CARD_TYPE_VALUE") or "").strip())
            phone = normalize_phone((row.get("SUBSCRIPTION_ACCESS_NUMBER") or "").strip())
            if not phone:
                continue
            builder.push(
                dni=dni,
                org_ruc="",
                name=name,
                doc_type=doc_type,
                role="",
                org_name="",
                phones=[phone],
                source_mask=SRC_CLARO,
                name_score=80,
                org_score=0,
            )
    builder.commit()
    return rows


def ingest_bitel(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f, delimiter="|")
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("NumDocumento") or "").strip())
            phone = normalize_phone((row.get("telefono") or "").strip())
            doc_type_raw = (row.get("TipoDocumento") or "").strip()
            doc_type = "DNI" if doc_type_raw == "01" else sanitize_text(doc_type_raw)
            if not phone:
                continue
            builder.push(
                dni=dni,
                org_ruc="",
                name="",
                doc_type=doc_type,
                role="",
                org_name="",
                phones=[phone],
                source_mask=SRC_BITEL,
                name_score=0,
                org_score=0,
            )
    builder.commit()
    return rows


def ingest_celulares(path: Path, builder: Builder) -> int:
    print(f"ingesting {path.name}")
    rows = 0
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows += 1
            dni = normalize_doc((row.get("DOCUMENTO") or "").strip())
            phone = normalize_phone((row.get("CELULAR") or "").strip())
            if not phone:
                continue
            builder.push(
                dni=dni,
                org_ruc="",
                name="",
                doc_type="",
                role="",
                org_name="",
                phones=[phone],
                source_mask=SRC_CELULARES,
                name_score=0,
                org_score=0,
            )
    builder.commit()
    return rows


def export_contacts(conn: sqlite3.Connection, output_path: Path) -> int:
    print(f"writing {output_path}")
    rows = 0
    with output_path.open("w", encoding="utf-8", newline="") as out:
        out.write(
            "dni,name,doc_type,role,phone_primary,phone_secondary,phones_all,org_ruc,org_name,sources\n"
        )
        cursor = conn.execute(
            """
            SELECT c.dni, c.name, c.doc_type, c.role, c.org_ruc, c.org_name, c.source_mask, p.phone
            FROM contacts c
            LEFT JOIN contact_phones p
              ON p.dni = c.dni AND p.org_ruc = c.org_ruc
            ORDER BY c.dni, c.org_ruc, p.phone
            """
        )
        current_key: tuple[str, str] | None = None
        current_meta: tuple[str, str, str, str, str, int] | None = None
        current_phones: list[str] = []
        for dni, name, doc_type, role, ruc, org_name, source_mask, phone in cursor:
            key = (dni or "", ruc or "")
            if current_key is None:
                current_key = key
                current_meta = (
                    sanitize_text(name or ""),
                    sanitize_text(doc_type or ""),
                    sanitize_text(role or ""),
                    sanitize_text(org_name or ""),
                    key[1],
                    int(source_mask or 0),
                )
            elif key != current_key:
                phones_all = ";".join(current_phones)
                p1 = current_phones[0] if current_phones else ""
                p2 = current_phones[1] if len(current_phones) > 1 else ""
                meta = current_meta or ("", "", "", "", "", 0)
                row = [
                    current_key[0],
                    meta[0],
                    meta[1],
                    meta[2],
                    p1,
                    p2,
                    phones_all,
                    meta[4],
                    meta[3],
                    source_labels_from_mask(meta[5]),
                ]
                out.write(",".join(row) + "\n")
                rows += 1
                current_key = key
                current_meta = (
                    sanitize_text(name or ""),
                    sanitize_text(doc_type or ""),
                    sanitize_text(role or ""),
                    sanitize_text(org_name or ""),
                    key[1],
                    int(source_mask or 0),
                )
                current_phones = []
            if phone:
                current_phones.append(phone)

        if current_key is not None:
            phones_all = ";".join(current_phones)
            p1 = current_phones[0] if current_phones else ""
            p2 = current_phones[1] if len(current_phones) > 1 else ""
            meta = current_meta or ("", "", "", "", "", 0)
            row = [
                current_key[0],
                meta[0],
                meta[1],
                meta[2],
                p1,
                p2,
                phones_all,
                meta[4],
                meta[3],
                source_labels_from_mask(meta[5]),
            ]
            out.write(",".join(row) + "\n")
            rows += 1
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Build complete contacts.csv from raw sources.")
    parser.add_argument("--data-dir", required=True, help="Directory with raw source files.")
    parser.add_argument("--output", required=True, help="Output contacts CSV path.")
    parser.add_argument(
        "--db-path",
        default="",
        help="Optional sqlite path for intermediate state (default: output + .sqlite.tmp).",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    output_path = Path(args.output)
    db_path = Path(args.db_path) if args.db_path else output_path.with_suffix(".sqlite.tmp")

    required = [
        data_dir / "Consolidado_RUC20_Representantes_OK.csv",
        data_dir / "Representantes_ENRIQUECIDO.txt",
        data_dir / "MOVISTAR_POST_202508.txt",
        data_dir / "CLARO_POST_202508.txt",
        data_dir / "BITEL_POST_MS.txt",
        data_dir / "celulares.txt",
    ]
    missing = [p for p in required if not p.exists()]
    if missing:
        for p in missing:
            print(f"missing input: {p}", file=sys.stderr)
        return 1

    start = time.time()
    if db_path.exists():
        db_path.unlink()

    conn = open_db(db_path)
    builder = Builder(conn)
    try:
        ingest_representantes_csv(data_dir / "Consolidado_RUC20_Representantes_OK.csv", builder)
        ingest_representantes_pipe(data_dir / "Representantes_ENRIQUECIDO.txt", builder)
        ingest_movistar(data_dir / "MOVISTAR_POST_202508.txt", builder)
        ingest_claro(data_dir / "CLARO_POST_202508.txt", builder)
        ingest_bitel(data_dir / "BITEL_POST_MS.txt", builder)
        ingest_celulares(data_dir / "celulares.txt", builder)
        builder.commit()
        total_rows = export_contacts(conn, output_path)
    finally:
        conn.close()

    elapsed = time.time() - start
    print(f"done: {total_rows:,} rows in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
