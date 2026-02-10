#!/usr/bin/env python3
"""Script to run tests with coverage reporting."""

import os
import subprocess
import sys

# Set correct database URL
os.environ["DATABASE_URL"] = "postgresql+asyncpg://dunnaa:dunnaa_dev@localhost:5432/dunnaa"

# Run pytest with coverage
result = subprocess.run(
    [
        sys.executable,
        "-m",
        "pytest",
        "--cov=app",
        "--cov-report=term",
        "--cov-report=html",
        "-q",
    ],
    cwd="/root/projetos/navaro/packages/api",
)

sys.exit(result.returncode)
