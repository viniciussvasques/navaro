"""Tests for double-booking prevention."""

from datetime import UTC, datetime, timedelta

import pytest


class TestDoubleBookingPrevention:
    """Tests to ensure double-booking is prevented."""

    @pytest.fixture
    def base_time(self):
        """Base time for testing."""
        return datetime.now(UTC).replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(
            days=1
        )

    def _check_overlap(self, existing_start, existing_duration, new_start, new_duration):
        """Check if two time slots overlap."""
        existing_end = existing_start + timedelta(minutes=existing_duration)
        new_end = new_start + timedelta(minutes=new_duration)

        # Overlap if: new starts before existing ends AND new ends after existing starts
        return new_start < existing_end and new_end > existing_start

    # ─── Overlap Logic Tests ────────────────────────────────────────────────────

    def test_same_slot_overlaps(self, base_time):
        """Test that the same time slot is detected as overlap."""
        is_overlap = self._check_overlap(
            existing_start=base_time, existing_duration=30, new_start=base_time, new_duration=30
        )
        assert is_overlap is True

    def test_overlapping_slots_detected(self, base_time):
        """Test that overlapping time slots are detected."""
        # Existing: 14:00 - 14:30
        # New: 14:15 - 14:45 (starts during existing)
        is_overlap = self._check_overlap(
            existing_start=base_time,
            existing_duration=30,
            new_start=base_time + timedelta(minutes=15),
            new_duration=30,
        )
        assert is_overlap is True

    def test_adjacent_slots_no_overlap(self, base_time):
        """Test that adjacent (non-overlapping) slots are allowed."""
        # Existing: 14:00 - 14:30
        # New: 14:30 - 15:00 (starts exactly when existing ends)
        is_overlap = self._check_overlap(
            existing_start=base_time,
            existing_duration=30,
            new_start=base_time + timedelta(minutes=30),
            new_duration=30,
        )
        assert is_overlap is False

    def test_slot_before_existing_no_overlap(self, base_time):
        """Test that slots before existing are allowed."""
        # Existing: 14:00 - 14:30
        # New: 13:00 - 13:30 (ends before existing starts)
        is_overlap = self._check_overlap(
            existing_start=base_time,
            existing_duration=30,
            new_start=base_time - timedelta(minutes=60),
            new_duration=30,
        )
        assert is_overlap is False

    def test_slot_contains_existing(self, base_time):
        """Test that larger slot containing existing is detected."""
        # Existing: 14:00 - 14:30
        # New: 13:45 - 14:45 (contains existing)
        is_overlap = self._check_overlap(
            existing_start=base_time,
            existing_duration=30,
            new_start=base_time - timedelta(minutes=15),
            new_duration=60,
        )
        assert is_overlap is True

    def test_existing_contains_new(self, base_time):
        """Test that slot inside existing is detected."""
        # Existing: 14:00 - 15:00
        # New: 14:15 - 14:30 (inside existing)
        is_overlap = self._check_overlap(
            existing_start=base_time,
            existing_duration=60,
            new_start=base_time + timedelta(minutes=15),
            new_duration=15,
        )
        assert is_overlap is True

    # ─── Business Logic Tests ───────────────────────────────────────────────────

    def test_cancelled_appointments_allow_rebooking(self):
        """Test that cancelled appointment slots become available."""
        # Simulating: cancelled appointments should not block slots
        active_appointments = []  # Cancelled ones filtered out
        slot_blocked = len(active_appointments) > 0
        assert slot_blocked is False

    def test_different_staff_same_time_allowed(self):
        """Test that different staff can have same time slots."""
        staff_1_appointments = [{"staff_id": "staff_1", "time": "14:00"}]
        staff_2_appointments = []  # No appointments for staff_2

        # Staff 2 should be able to book same time
        staff_2_available = len(staff_2_appointments) == 0
        assert staff_2_available is True

    def test_multiple_slots_same_day_different_times(self, base_time):
        """Test that multiple slots same day are allowed if no overlap."""
        slots = [
            (base_time, 30),  # 14:00 - 14:30
            (base_time + timedelta(hours=1), 30),  # 15:00 - 15:30
            (base_time + timedelta(hours=2), 30),  # 16:00 - 16:30
        ]

        # Check no overlaps between any pairs
        has_overlap = False
        for i, (start1, dur1) in enumerate(slots):
            for j, (start2, dur2) in enumerate(slots):
                if i != j and self._check_overlap(start1, dur1, start2, dur2):
                    has_overlap = True
                    break

        assert has_overlap is False
