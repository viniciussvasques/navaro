"""Manual test for Notifications feature."""

import asyncio

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Notifications Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Auth (User & Owner)
        # ---------------------------------------------------------
        print("\n🔑 Login User...")
        user_phone = "+5511999995555"
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": user_phone})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": user_phone})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(
            f"{BASE_URL}/auth/verify", json={"phone": user_phone, "code": code}
        )
        user_token = resp.json()["tokens"]["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        print("  ✅ User Logged In")

        print("\n🔑 Login Owner...")
        owner_phone = "+5511111111111"  # We use a different one to avoid collision or use existing
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": owner_phone})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": owner_phone})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(
            f"{BASE_URL}/auth/verify", json={"phone": owner_phone, "code": code}
        )
        owner_token = resp.json()["tokens"]["access_token"]
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        print("  ✅ Owner Logged In")

        # 2. Setup Establishment (if needed)
        # ---------------------------------------------------------
        print("\n🏢 fetching establishments...")
        resp = await client.get(f"{BASE_URL}/establishments")
        est_data = resp.json().get("items", [])
        if not est_data:
            print("  ⚠️ No establishments. Creating one...")
            payload = {
                "name": "Barbearia de Notificações",
                "category": "barbershop",
                "address": "Rua Alerta, 1",
                "city": "São Paulo",
                "state": "SP",
                "phone": "+551155555555",
            }
            resp = await client.post(
                f"{BASE_URL}/establishments", json=payload, headers=owner_headers
            )
            establishment_id = resp.json()["id"]
        else:
            establishment_id = est_data[0]["id"]
        print(f"  ✅ Using Establishment: {establishment_id}")

        # 3. Queue Flow (Trigger Queue Notification)
        # ---------------------------------------------------------
        print("\n🚶 User entering queue...")
        resp = await client.post(
            f"{BASE_URL}/queue", json={"establishment_id": establishment_id}, headers=user_headers
        )
        entry_id = resp.json()["id"]

        print("\n📣 Owner calling user...")
        resp = await client.patch(
            f"{BASE_URL}/queue/{entry_id}/status", json={"status": "called"}, headers=owner_headers
        )
        print("  ✅ Queue Status Updated")

        # 4. Check Inbox
        # ---------------------------------------------------------
        print("\n📱 User checking notifications...")
        resp = await client.get(f"{BASE_URL}/notifications", headers=user_headers)
        data = resp.json()
        print(f"  ✅ Inbox Size: {data['total']} | Unread: {data['unread_count']}")
        if data["items"]:
            notif = data["items"][0]
            print(f"  ✅ Type: {notif['type']} | Message: {notif['message']}")
            notif_id = notif["id"]

            # Mark Read
            print("\n📖 Marking as read...")
            await client.patch(f"{BASE_URL}/notifications/{notif_id}/read", headers=user_headers)
            resp = await client.get(f"{BASE_URL}/notifications", headers=user_headers)
            print(
                f"  ✅ Unread Count: {resp.json()['unread_count']} (Expected: {data['unread_count'] - 1})"
            )

        # 5. Check-in Flow (Trigger Owner Notification)
        # ---------------------------------------------------------
        print("\n📝 Setup check-in (Create Appointment first)...")
        # Create service/staff if needed
        resp = await client.get(f"{BASE_URL}/establishments/{establishment_id}/services")
        services = resp.json()
        if not services:
            print("  ⚠️ No services. Creating one...")
            resp = await client.post(
                f"{BASE_URL}/establishments/{establishment_id}/services",
                json={"name": "Corte de Teste", "price": 50, "duration_minutes": 30},
                headers=owner_headers,
            )
            service_id = resp.json()["id"]
        else:
            service_id = services[0]["id"]

        resp = await client.get(f"{BASE_URL}/establishments/{establishment_id}/staff")
        staff_data = resp.json()
        if not staff_data:
            print("  ⚠️ No staff. Creating one...")
            resp = await client.post(
                f"{BASE_URL}/establishments/{establishment_id}/staff",
                json={"name": "Barbeiro Teste", "role": "barbeiro", "commission_rate": 50},
                headers=owner_headers,
            )
            staff_id = resp.json()["id"]
        else:
            staff_id = staff_data[0]["id"]

        print("\n📅 Creating appointment...")
        from datetime import datetime, timedelta

        scheduled_at = (datetime.now() + timedelta(days=1)).isoformat()
        await client.post(
            f"{BASE_URL}/appointments",
            json={
                "establishment_id": establishment_id,
                "service_id": service_id,
                "staff_id": staff_id,
                "scheduled_at": scheduled_at,
                "payment_type": "presencial",
            },
            headers=user_headers,
        )

        print("\n📸 User scanning QR Code (Perform Check-in)...")
        # Get QR as owner
        resp = await client.get(
            f"{BASE_URL}/checkins/establishments/{establishment_id}/qr", headers=owner_headers
        )
        qr_token = resp.json()["qr_token"]
        # Perform as user
        resp = await client.post(
            f"{BASE_URL}/checkins", json={"qr_token": qr_token}, headers=user_headers
        )
        print(f"  ✅ Check-in status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"  ❌ Error: {resp.text}")

        print("\n📱 Owner checking notifications...")
        resp = await client.get(f"{BASE_URL}/notifications", headers=owner_headers)
        data = resp.json()
        found = any(n["type"] == "checkin" for n in data["items"])
        print(f"  ✅ Check-in alert found in owner inbox: {found}")

    print("\n🎉 Manual Notifications Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
