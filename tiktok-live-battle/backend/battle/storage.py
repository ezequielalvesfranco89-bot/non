"""Small SQLite persistence layer, including durable per-session idempotency."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path


class Store:
    def __init__(self, path: str):
        if path != ':memory:':
            Path(path).expanduser().parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute('PRAGMA journal_mode=WAL')
        self.connection.execute('PRAGMA foreign_keys=ON')
        self.connection.executescript('''
            CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS processed (
                session TEXT NOT NULL, source TEXT NOT NULL, event_id TEXT NOT NULL,
                PRIMARY KEY(session, source, event_id)
            );
            CREATE TABLE IF NOT EXISTS followers (
                session TEXT NOT NULL, source TEXT NOT NULL, user_id TEXT NOT NULL,
                PRIMARY KEY(session, source, user_id)
            );
            CREATE TABLE IF NOT EXISTS combos (
                session TEXT NOT NULL, source TEXT NOT NULL, user_id TEXT NOT NULL,
                gift_id TEXT NOT NULL, combo_id TEXT NOT NULL, count INTEGER NOT NULL,
                PRIMARY KEY(session, source, user_id, gift_id, combo_id)
            );
            CREATE TABLE IF NOT EXISTS goals (
                session TEXT NOT NULL, goal_id TEXT NOT NULL,
                PRIMARY KEY(session, goal_id)
            );
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp REAL NOT NULL, payload TEXT NOT NULL
            );
        ''')

    @contextmanager
    def transaction(self):
        self.connection.execute('BEGIN IMMEDIATE')
        try:
            yield
        except BaseException:
            self.connection.execute('ROLLBACK')
            raise
        else:
            self.connection.execute('COMMIT')

    def get(self, key, default=None):
        row = self.connection.execute('SELECT value FROM kv WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else default

    def set(self, key, value):
        self.connection.execute('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', (key, json.dumps(value, ensure_ascii=False, allow_nan=False)))

    def claim_event(self, session, source, event_id):
        return self.connection.execute('INSERT OR IGNORE INTO processed VALUES(?,?,?)', (session, source, event_id)).rowcount == 1

    def claim_follower(self, session, source, user_id):
        return self.connection.execute('INSERT OR IGNORE INTO followers VALUES(?,?,?)', (session, source, user_id)).rowcount == 1

    def claim_goal(self, session, goal_id):
        return self.connection.execute('INSERT OR IGNORE INTO goals VALUES(?,?)', (session, goal_id)).rowcount == 1

    def reached_goals(self, session):
        return {r[0] for r in self.connection.execute('SELECT goal_id FROM goals WHERE session=?', (session,))}

    def combo_delta(self, session, source, user_id, gift_id, combo_id, count):
        key = (session, source, user_id, gift_id, combo_id)
        row = self.connection.execute('SELECT count FROM combos WHERE session=? AND source=? AND user_id=? AND gift_id=? AND combo_id=?', key).fetchone()
        previous = row[0] if row else 0
        if count <= previous:
            return 0
        self.connection.execute('INSERT INTO combos VALUES(?,?,?,?,?,?) ON CONFLICT(session,source,user_id,gift_id,combo_id) DO UPDATE SET count=excluded.count', (*key, count))
        return count - previous

    def add_history(self, result):
        self.connection.execute('INSERT INTO history(timestamp,payload) VALUES(?,?)', (result['timestamp'], json.dumps(result, ensure_ascii=False)))
        self.connection.execute('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 1000)')

    def history(self, limit=100):
        return [json.loads(row[0]) for row in self.connection.execute('SELECT payload FROM history ORDER BY id DESC LIMIT ?', (limit,))]

    def clear_session_rows(self, keep_session):
        # Only the current session is resumable; prior battle history remains.
        for table in ('processed', 'followers', 'combos', 'goals'):
            self.connection.execute(f'DELETE FROM {table} WHERE session<>?', (keep_session,))

    def close(self):
        self.connection.close()
