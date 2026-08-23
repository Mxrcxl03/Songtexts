# Database schema baseline

`schema-baseline.sql` is a schema-only snapshot of the current local Songtexts development database. It is intended as a durable reference for designing future migrations against the exact structure that exists today.

Generated on 2026-08-23 from the running `songtexts-db-dev` Postgres container:

```powershell
docker exec songtexts-db-dev pg_dump --schema-only --no-owner --no-privileges --no-comments --schema=public --dbname=songtexte --username=postgres > backend/src/main/resources/db/schema-baseline.sql
```

The snapshot contains database structure only: tables, columns, data types, defaults, nullability, primary keys, foreign keys, unique/check constraints, indexes, sequences, and relationships. It does not contain row data, passwords, tokens, or environment secrets.

At generation time the database had one standalone non-constraint index, `idx_song_uploader_id`; primary-key and unique indexes are represented by the corresponding constraints in the SQL dump.

To refresh it, start the local development stack, verify the database represents the intended current structure, rerun the command above, and review the diff before committing. The dump intentionally excludes ownership, grants, comments, and row data to reduce environment-specific noise.

At generation time the project did not contain Flyway or Liquibase migrations; the schema was managed by Hibernate with `spring.jpa.hibernate.ddl-auto=update`.
