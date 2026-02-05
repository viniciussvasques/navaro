import asyncio
from datetime import UTC, datetime, timedelta

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Core Feature Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Authentication
        print("\n🔑 Testing Authentication...")
        phone = "+5511999999999"

        # Send Code
        try:
            resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
            resp.raise_for_status()
            code = resp.json()["message"].split(": ")[1].strip()
            print(f"  🟢 Send Code: Success (Code: {code})")
        except Exception as e:
            print(f"  🔴 Send Code: Failed ({e})")
            return

        # Verify Code
        try:
            resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone, "code": code})
            resp.raise_for_status()
            token = resp.json()["tokens"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("  🟢 Login: Success (Token received)")
        except Exception as e:
            print(f"  🔴 Login: Failed ({e})")
            return

        # 2. Establishment Management
        print("\n🏢 Testing Establishment...")
        est_data = {
            "name": "Barbearia Manual Teste",
            "category": "barbershop",
            "address": "Rua Manual, 100",
            "city": "Sao Paulo",
            "state": "SP",
            "phone": "+5511999999999",
        }

        try:
            resp = await client.post(f"{BASE_URL}/establishments", json=est_data, headers=headers)
            if resp.status_code == 201:
                est_id = resp.json()["id"]
                print(f"  🟢 Create Establishment: Success (ID: {est_id})")
            else:
                print(f"  🔴 Create Establishment: Failed ({resp.text})")
                return
        except Exception as e:
            print(f"  🔴 Create Establishment: Error ({e})")
            return

        # 3. Service Management
        print("\n✂️ Testing Services...")
        service_data = {"name": "Corte Manual", "price": 60.0, "duration_minutes": 45}
        try:
            resp = await client.post(
                f"{BASE_URL}/establishments/{est_id}/services", json=service_data, headers=headers
            )
            resp.raise_for_status()
            service_id = resp.json()["id"]
            print(f"  🟢 Create Service: Success (ID: {service_id})")
        except Exception as e:
            print(f"  🔴 Create Service: Failed ({e})")
            return

        # 4. Staff Management
        print("\n👨‍💼 Testing Staff...")
        staff_data = {"name": "Jose Manual", "role": "barbeiro", "commission_rate": 40.0}
        try:
            resp = await client.post(
                f"{BASE_URL}/establishments/{est_id}/staff", json=staff_data, headers=headers
            )
            resp.raise_for_status()
            staff_id = resp.json()["id"]
            print(f"  🟢 Create Staff: Success (ID: {staff_id})")
        except Exception as e:
            print(f"  🔴 Create Staff: Failed ({e})")
            return

        # 5. Appointment Management
        print("\n📅 Testing Appointments...")
        scheduled_at = (datetime.now(UTC) + timedelta(days=2)).isoformat()
        appt_data = {
            "establishment_id": est_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": scheduled_at,
            "payment_type": "single",
        }
        try:
            resp = await client.post(f"{BASE_URL}/appointments", json=appt_data, headers=headers)
            if resp.status_code == 201:
                appt_id = resp.json()["id"]
                print(f"  🟢 Create Appointment: Success (ID: {appt_id})")
            else:
                print(f"  🔴 Create Appointment: Failed ({resp.text})")
                return
        except Exception as e:
            print(f"  🔴 Create Appointment: Error ({e})")
            return

        # List Appointments
        try:
            resp = await client.get(f"{BASE_URL}/appointments", headers=headers)
            resp.raise_for_status()
            count = len(resp.json())
            print(f"  🟢 List Appointments: Success (Count: {count})")
        except Exception as e:
            print(f"  🔴 List Appointments: Failed ({e})")

    print("\n✅ Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
