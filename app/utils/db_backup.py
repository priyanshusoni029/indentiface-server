"""
Database backup and restore for developer handover.

Workflow
--------
Developer A (outgoing):
    flask db-backup export backup.sql
    # send backup.sql to Developer B

Developer B (incoming, first-time setup):
    flask db-backup restore backup.sql
    # local DB is now seeded with all historical records
    # future writes append locally; export again before next handover
"""

import os
import sqlite3
import click
from flask import Blueprint, current_app

backup_cli = Blueprint('db_backup', __name__, cli_group='db-backup')


def _db_path() -> str:
    return current_app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')


def export_backup(output_path: str):
    """Dump the entire SQLite database to a portable .sql text file."""
    conn = sqlite3.connect(_db_path())
    with open(output_path, 'w', encoding='utf-8') as f:
        for line in conn.iterdump():
            f.write(f"{line}\n")
    conn.close()
    size = os.path.getsize(output_path)
    print(f"Backup exported → {output_path}  ({size:,} bytes)")


def restore_backup(input_path: str):
    """
    Merge a .sql backup into the local database.
    Uses INSERT OR IGNORE so existing local rows are never overwritten.
    """
    with open(input_path, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Safe merge: skip any row whose primary key already exists locally
    sql = sql.replace('INSERT INTO', 'INSERT OR IGNORE INTO')

    conn = sqlite3.connect(_db_path())
    conn.executescript(sql)
    conn.close()
    print(f"Backup restored from {input_path}")


@backup_cli.cli.command('export')
@click.argument('output', default='backup.sql')
def cli_export(output):
    """Export local DB to a .sql file. Usage: flask db-backup export [backup.sql]"""
    export_backup(output)


@backup_cli.cli.command('restore')
@click.argument('input_path', default='backup.sql')
def cli_restore(input_path):
    """Restore (merge) a .sql file into local DB. Usage: flask db-backup restore [backup.sql]"""
    restore_backup(input_path)