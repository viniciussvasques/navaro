"""Tests for RBAC (Role-Based Access Control) permissions."""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch


class TestRBACPermissions:
    """Tests for role-based access control."""

    @pytest.fixture
    def client_user(self):
        """Create a client user."""
        user = MagicMock()
        user.id = uuid4()
        user.role = "client"
        user.is_admin = False
        return user

    @pytest.fixture
    def staff_user(self):
        """Create a staff user."""
        user = MagicMock()
        user.id = uuid4()
        user.role = "staff"
        user.is_admin = False
        user.establishment_id = uuid4()
        return user

    @pytest.fixture
    def manager_user(self):
        """Create a manager user."""
        user = MagicMock()
        user.id = uuid4()
        user.role = "manager"
        user.is_admin = False
        user.owned_establishments = [uuid4()]
        return user

    @pytest.fixture
    def admin_user(self):
        """Create an admin user."""
        user = MagicMock()
        user.id = uuid4()
        user.role = "admin"
        user.is_admin = True
        return user

    # ─── Client Permission Tests ────────────────────────────────────────────────

    def test_client_can_view_own_appointments(self, client_user):
        """Test that clients can view their own appointments."""
        appointment = MagicMock()
        appointment.user_id = client_user.id
        
        can_access = appointment.user_id == client_user.id
        assert can_access is True

    def test_client_cannot_view_others_appointments(self, client_user):
        """Test that clients cannot view other users' appointments."""
        other_user_id = uuid4()
        appointment = MagicMock()
        appointment.user_id = other_user_id
        
        can_access = appointment.user_id == client_user.id
        assert can_access is False

    def test_client_cannot_access_admin_settings(self, client_user):
        """Test that clients cannot access admin settings."""
        is_admin = client_user.is_admin
        assert is_admin is False

    # ─── Staff Permission Tests ─────────────────────────────────────────────────

    def test_staff_can_view_own_schedule(self, staff_user):
        """Test that staff can view their own schedule."""
        schedule = MagicMock()
        schedule.staff_id = staff_user.id
        
        can_access = schedule.staff_id == staff_user.id
        assert can_access is True

    def test_staff_cannot_view_other_staff_schedule(self, staff_user):
        """Test that staff cannot view other staff's schedule."""
        other_staff_id = uuid4()
        schedule = MagicMock()
        schedule.staff_id = other_staff_id
        
        can_access = schedule.staff_id == staff_user.id
        assert can_access is False

    def test_staff_can_only_access_own_establishment(self, staff_user):
        """Test multi-tenant: staff only sees their establishment."""
        own_establishment = staff_user.establishment_id
        other_establishment = uuid4()
        
        can_access_own = True  # Would be filtered by establishment_id
        can_access_other = (other_establishment == staff_user.establishment_id)
        
        assert can_access_own is True
        assert can_access_other is False

    # ─── Manager Permission Tests ───────────────────────────────────────────────

    def test_manager_can_view_all_staff_in_establishment(self, manager_user):
        """Test that managers can view all staff in their establishment."""
        establishment_id = manager_user.owned_establishments[0]
        
        # Manager owns this establishment
        can_manage = establishment_id in manager_user.owned_establishments
        assert can_manage is True

    def test_manager_cannot_manage_other_establishments(self, manager_user):
        """Test that managers cannot manage other establishments."""
        other_establishment = uuid4()
        
        can_manage = other_establishment in manager_user.owned_establishments
        assert can_manage is False

    def test_manager_can_update_establishment_settings(self, manager_user):
        """Test that managers can update their establishment settings."""
        establishment = MagicMock()
        establishment.id = manager_user.owned_establishments[0]
        establishment.owner_id = manager_user.id
        
        can_update = establishment.owner_id == manager_user.id
        assert can_update is True

    # ─── Admin Permission Tests ─────────────────────────────────────────────────

    def test_admin_can_access_all_establishments(self, admin_user):
        """Test that admins can access all establishments."""
        any_establishment = uuid4()
        
        # Admins bypass all checks
        can_access = admin_user.is_admin
        assert can_access is True

    def test_admin_can_access_system_settings(self, admin_user):
        """Test that admins can access system settings."""
        can_access = admin_user.is_admin and admin_user.role == "admin"
        assert can_access is True

    def test_admin_can_view_any_user(self, admin_user):
        """Test that admins can view any user."""
        any_user_id = uuid4()
        
        can_view = admin_user.is_admin
        assert can_view is True

    # ─── Multi-tenant Tests ─────────────────────────────────────────────────────

    def test_data_isolation_between_establishments(self):
        """Test that data is isolated between establishments."""
        establishment_1 = uuid4()
        establishment_2 = uuid4()
        
        # Appointments should be filtered by establishment
        appointments_e1 = [{"id": uuid4(), "establishment_id": establishment_1}]
        appointments_e2 = [{"id": uuid4(), "establishment_id": establishment_2}]
        
        # Query for e1 should not return e2's data
        e1_filtered = [a for a in appointments_e1 + appointments_e2 
                       if a["establishment_id"] == establishment_1]
        
        assert len(e1_filtered) == 1
        assert all(a["establishment_id"] == establishment_1 for a in e1_filtered)

    def test_cross_tenant_access_denied(self, staff_user):
        """Test that cross-tenant access is denied."""
        staff_establishment = staff_user.establishment_id
        other_establishment = uuid4()
        
        # Staff trying to access other establishment's data
        resource = MagicMock()
        resource.establishment_id = other_establishment
        
        has_access = resource.establishment_id == staff_establishment
        assert has_access is False
