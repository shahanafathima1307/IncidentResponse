"""
SQLite Database Layer for Incident Response Agent.

Provides persistent storage for incident records with thread-safe access,
schema migrations/initialization, and data mapping to shared contract models.
"""

import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator, List, Optional, Tuple

from backend.app.config import settings
from contracts.schemas import (
    IncidentCreateRequest,
    IncidentResolutionRequest,
    IncidentResponse,
    IncidentSeverity,
    IncidentStatus,
)


def generate_incident_id() -> str:
    """Generate a clean, readable incident identifier, e.g., INC-7B3E4F9A."""
    hex_code = uuid.uuid4().hex[:8].upper()
    return f"INC-{hex_code}"


def get_current_utc() -> datetime:
    """Get current UTC timestamp with timezone."""
    return datetime.now(timezone.utc)


class Database:
    """Manages SQLite connections and table schemas."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or settings.DATABASE_PATH
        self._ensure_db_dir()
        self.init_db()

    def _ensure_db_dir(self) -> None:
        """Create database directory if it does not exist."""
        if isinstance(self.db_path, Path):
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Context manager yielding a thread-safe SQLite connection with row factory."""
        conn = sqlite3.connect(
            str(self.db_path),
            check_same_thread=False,
            timeout=10.0
        )
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_db(self) -> None:
        """Initialize SQLite database schema and migrate if needed."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='incidents';")
            row = cursor.fetchone()
            if row:
                tbl_sql = row[0]
                if "CHECK" not in tbl_sql.upper() or "COLLATE NOCASE" not in tbl_sql.upper():
                    conn.execute("ALTER TABLE incidents RENAME TO incidents_old;")
                    conn.execute("""
                        CREATE TABLE incidents (
                            id TEXT PRIMARY KEY COLLATE NOCASE,
                            title TEXT NOT NULL,
                            description TEXT NOT NULL,
                            affected_service TEXT NOT NULL,
                            severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
                            status TEXT NOT NULL CHECK(status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
                            created_at TEXT NOT NULL,
                            updated_at TEXT NOT NULL,
                            root_cause TEXT,
                            resolution TEXT,
                            outcome TEXT,
                            resolved_at TEXT
                        );
                    """)
                    conn.execute("""
                        INSERT INTO incidents (id, title, description, affected_service, severity, status, created_at, updated_at, root_cause, resolution, outcome, resolved_at)
                        SELECT id, title, description, affected_service, severity, status, created_at, updated_at, root_cause, resolution, outcome, resolved_at
                        FROM incidents_old;
                    """)
                    conn.execute("DROP TABLE incidents_old;")
            else:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS incidents (
                        id TEXT PRIMARY KEY COLLATE NOCASE,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        affected_service TEXT NOT NULL,
                        severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
                        status TEXT NOT NULL CHECK(status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        root_cause TEXT,
                        resolution TEXT,
                        outcome TEXT,
                        resolved_at TEXT
                    );
                """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
            """)

    def check_health(self) -> bool:
        """Check if SQLite database is reachable and operational."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1;")
                return cursor.fetchone() is not None
        except Exception:
            return False


class IncidentRepository:
    """Repository handling CRUD operations on incidents table."""

    def __init__(self, db: Database):
        self.db = db

    def _row_to_model(self, row: sqlite3.Row) -> IncidentResponse:
        """Convert a SQLite row to an IncidentResponse schema."""
        return IncidentResponse(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            affected_service=row["affected_service"],
            severity=IncidentSeverity(row["severity"]),
            status=IncidentStatus(row["status"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            root_cause=row["root_cause"],
            resolution=row["resolution"],
            outcome=row["outcome"],
            resolved_at=datetime.fromisoformat(row["resolved_at"]) if row["resolved_at"] else None,
        )

    def create(self, data: IncidentCreateRequest) -> IncidentResponse:
        """Create a new incident and persist to SQLite."""
        incident_id = generate_incident_id()
        now = get_current_utc()
        now_iso = now.isoformat()

        with self.db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO incidents (
                    id, title, description, affected_service, severity,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    incident_id,
                    data.title,
                    data.description,
                    data.affected_service,
                    data.severity.value,
                    IncidentStatus.OPEN.value,
                    now_iso,
                    now_iso,
                ),
            )

        incident = self.get_by_id(incident_id)
        if not incident:
            raise RuntimeError("Failed to retrieve created incident.")
        return incident

    def get_by_id(self, incident_id: str) -> Optional[IncidentResponse]:
        """Retrieve an incident by unique ID."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM incidents WHERE id = ? COLLATE NOCASE;", (incident_id.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_model(row)

    def list_all(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[IncidentResponse], int]:
        """
        List incidents with optional filtering by status and severity.
        Returns a tuple of (list of incidents, total count).
        """
        query_conditions = []
        params = []

        if status:
            query_conditions.append("status = ?")
            params.append(status.upper())

        if severity:
            query_conditions.append("severity = ?")
            params.append(severity.upper())

        where_clause = f"WHERE {' AND '.join(query_conditions)}" if query_conditions else ""

        with self.db.get_connection() as conn:
            cursor = conn.cursor()

            # Count total
            count_sql = f"SELECT COUNT(*) FROM incidents {where_clause};"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()[0]

            # Fetch items
            fetch_sql = f"""
                SELECT * FROM incidents
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?;
            """
            cursor.execute(fetch_sql, params + [limit, offset])
            rows = cursor.fetchall()
            items = [self._row_to_model(row) for row in rows]

            return items, total

    def resolve(
        self, incident_id: str, data: IncidentResolutionRequest
    ) -> Optional[IncidentResponse]:
        """Record root cause, resolution, outcome, and set status to RESOLVED."""
        existing = self.get_by_id(incident_id)
        if not existing:
            return None

        now = get_current_utc()
        now_iso = now.isoformat()

        with self.db.get_connection() as conn:
            conn.execute(
                """
                UPDATE incidents
                SET root_cause = ?,
                    resolution = ?,
                    outcome = ?,
                    status = ?,
                    resolved_at = ?,
                    updated_at = ?
                WHERE id = ?;
                """,
                (
                    data.root_cause,
                    data.resolution,
                    data.outcome,
                    IncidentStatus.RESOLVED.value,
                    now_iso,
                    now_iso,
                    incident_id.strip(),
                ),
            )

        return self.get_by_id(incident_id)


# Global database instance
db_instance = Database()
repository = IncidentRepository(db_instance)


def get_repository() -> IncidentRepository:
    """Dependency injection helper for IncidentRepository."""
    return repository
