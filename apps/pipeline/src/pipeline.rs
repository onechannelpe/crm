use crate::PipelineError;
use crate::cli::Command;
use crate::config::manifest::verify_manifest;
use crate::db::schema;
use crate::stages::consolidate;
use crate::stages::materialize;
use crate::stages::normalize;
use crate::stages::validate;
use crate::stages::verify;

pub fn run(command: Command) -> Result<(), PipelineError> {
    match command {
        Command::InitSchema { db } => schema::init_schema(&db),
        Command::RegisterSnapshot {
            db,
            source_key,
            source_name,
            snapshot_label,
            snapshot_date,
            file_path,
            reliability_rank,
        } => consolidate::register_snapshot(
            &db,
            &source_key,
            &source_name,
            &snapshot_label,
            &snapshot_date,
            &file_path,
            reliability_rank,
        ),
        Command::IngestSnapshot {
            db,
            mapping,
            input,
            snapshot_label,
            snapshot_date,
            batch_size,
        } => consolidate::ingest_snapshot(
            &db,
            &mapping,
            &input,
            &snapshot_label,
            &snapshot_date,
            batch_size,
        ),
        Command::MaterializeServing { db } => materialize::materialize_serving(&db),
        Command::ValidateSnapshot { db, snapshot_label } => {
            validate::validate_snapshot(&db, &snapshot_label)
        }
        Command::PromoteDb { from, to } => materialize::promote_db(&from, &to),
        Command::RunMatrix {
            db,
            build_dir,
            manifest,
            row_cap_a,
            row_cap_b,
            run_osiptel_sample,
            osiptel_row_cap,
        } => verify::run_matrix(
            &db,
            &build_dir,
            &manifest,
            row_cap_a,
            row_cap_b,
            run_osiptel_sample,
            osiptel_row_cap,
        ),
        Command::VerifyManifest { manifest } => {
            verify_manifest(&manifest)?;
            Ok(())
        }
        Command::NormalizeSource {
            manifest,
            source_key,
            row_cap,
            out_dir,
        } => normalize::normalize_source(&manifest, &source_key, row_cap, &out_dir),
        Command::NormalizeMatrix {
            manifest,
            row_cap,
            out_dir,
        } => normalize::normalize_matrix(&manifest, row_cap, &out_dir),
    }
}

#[cfg(test)]
mod tests {
    use super::run;
    use crate::cli::{Command, parse_args};
    use rusqlite::Connection;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn parses_init_schema() {
        let args = vec![
            "init-schema".to_owned(),
            "--db".to_owned(),
            "a.sqlite".to_owned(),
        ];
        let cmd = parse_args(&args).expect("parse should succeed");
        assert_eq!(
            cmd,
            Command::InitSchema {
                db: "a.sqlite".to_owned()
            }
        );
    }

    #[test]
    fn ingests_and_materializes_small_snapshot() {
        let temp = TempDir::new().expect("tempdir");
        let db_path = temp.path().join("pipeline.sqlite");
        let input_path = temp.path().join("sample.csv");
        let mapping_path = temp.path().join("mapping.json");

        fs::write(
            &input_path,
            "dni,name,ruc,company,role,phone\n12345678,ANA RAMOS,20100099991,ACME SAC,GERENTE,987111222\n23456789,LUIS PEREZ,20100099991,ACME SAC,APODERADO,999333444\n",
        )
        .expect("write input");
        fs::write(
            &mapping_path,
            r#"{
  "source_key":"sample",
  "source_name":"Sample",
  "delimiter":",",
  "has_header":true,
  "fields":{
    "person_dni":"dni",
    "person_full_name":"name",
    "company_ruc":"ruc",
    "company_name":"company",
    "role_name":"role",
    "phone":"phone"
  }
}"#,
        )
        .expect("write mapping");

        run(Command::InitSchema {
            db: db_path.to_string_lossy().to_string(),
        })
        .expect("init schema");
        run(Command::IngestSnapshot {
            db: db_path.to_string_lossy().to_string(),
            mapping: mapping_path.to_string_lossy().to_string(),
            input: input_path.to_string_lossy().to_string(),
            snapshot_label: "s1".to_owned(),
            snapshot_date: "2026-01-01".to_owned(),
            batch_size: 10,
        })
        .expect("ingest");
        run(Command::MaterializeServing {
            db: db_path.to_string_lossy().to_string(),
        })
        .expect("materialize");

        let conn = Connection::open(db_path).expect("open db");
        let contacts: i64 = conn
            .query_row("SELECT COUNT(*) FROM contacts_serving", [], |r| r.get(0))
            .expect("contacts count");
        let roles: i64 = conn
            .query_row("SELECT COUNT(*) FROM person_company_role", [], |r| r.get(0))
            .expect("roles count");
        let role_phones: i64 = conn
            .query_row("SELECT COUNT(*) FROM role_phone", [], |r| r.get(0))
            .expect("role phones count");
        let person_phones: i64 = conn
            .query_row("SELECT COUNT(*) FROM person_phone", [], |r| r.get(0))
            .expect("person phones count");

        assert_eq!(contacts, 2);
        assert_eq!(roles, 2);
        assert_eq!(role_phones, 2);
        assert_eq!(person_phones, 0);
    }
}
