import sqlite3

conn = sqlite3.connect("coalguard.db")
cursor = conn.cursor()

def add_col(table, col, col_type):
    cols = [c[1] for c in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        print(f"Added {col} to {table}")
    else:
        print(f"{col} already exists in {table}")

add_col("workers", "verification_status", "TEXT DEFAULT 'VERIFIED'")
add_col("workers", "training_status", "TEXT DEFAULT 'CERTIFIED'")
add_col("workers", "verified_by_id", "TEXT")
add_col("workers", "verification_notes", "TEXT")
add_col("workers", "verified_at", "DATETIME")

add_col("corrective_actions", "verification_decision", "TEXT")
add_col("corrective_actions", "closed_by_id", "TEXT")
add_col("corrective_actions", "closed_at", "DATETIME")
add_col("corrective_actions", "closure_notes", "TEXT")

conn.commit()
conn.close()
print("Migration completed successfully.")
