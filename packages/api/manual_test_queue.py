"""Manual test for Queue Mode."""

import asyncio

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Queue Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Auth (User 1 - Owner)
        # ---------------------------------------------------------
        print("\n🔑 Login Owner...")
        phone = "+5511999999999"

        # Send/Verify Code
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone, "code": code})
        token_owner = resp.json()["tokens"]["access_token"]
        headers_owner = {"Authorization": f"Bearer {token_owner}"}
        print("  ✅ Owner Logged In")

        # 2. Auth (User 2 - Customer)
        # ---------------------------------------------------------
        print("\n🔑 Login Customer...")
        phone2 = "+5511988887777"
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone2})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone2})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone2, "code": code})
        token_customer = resp.json()["tokens"]["access_token"]
        headers_customer = {"Authorization": f"Bearer {token_customer}"}
        print("  ✅ Customer Logged In")

        # 3. Create Establishment (if not exists, let's create new one)
        # ---------------------------------------------------------
        print("\n🏢 Creating Establishment...")
        from uuid import uuid4

        est_data = {
            "name": f"Barbearia Fila {uuid4()}",
            "category": "barbershop",
            "address": "Rua da Fila, 10",
            "city": "São Paulo",
            "state": "SP",
            "phone": "+5511999990000",
        }
        resp = await client.post(f"{BASE_URL}/establishments", json=est_data, headers=headers_owner)
        if resp.status_code != 201:
            print(f"❌ Failed to create establishment: {resp.text}")
            return
        est_id = resp.json()["id"]
        print(f"  ✅ Establishment Created: {est_id}")

        # 4. Customer Joins Queue
        # ---------------------------------------------------------
        print("\n🚶 Customer Joining Queue...")
        queue_data = {"establishment_id": est_id}
        resp = await client.post(f"{BASE_URL}/queue", json=queue_data, headers=headers_customer)
        if resp.status_code == 201:
            entry = resp.json()
            entry_id = entry["id"]
            print(f"  ✅ Joined Queue! Position: {entry['position']}, ID: {entry_id}")
        else:
            print(f"  ❌ Failed to join queue: {resp.text}")
            return

        # 5. List Queue (Public)
        # ---------------------------------------------------------
        print("\n📋 Listing Queue...")
        resp = await client.get(f"{BASE_URL}/queue/establishments/{est_id}")
        data = resp.json()
        print(
            f"  ✅ Queue Status: Waiting: {data['total_waiting']}, Serving: {data['current_serving']}"
        )

        # 6. Call Customer (Owner)
        # ---------------------------------------------------------
        print("\n📢 Calling Customer...")
        resp = await client.patch(
            f"{BASE_URL}/queue/{entry_id}/status", json={"status": "called"}, headers=headers_owner
        )
        if resp.status_code == 200:
            print(f"  ✅ Status updated to: {resp.json()['status']}")
        else:
            print(f"  ❌ Failed to update status: {resp.text}")

        # 7. Serve Customer
        # ---------------------------------------------------------
        print("\n✂️ Serving Customer...")
        resp = await client.patch(
            f"{BASE_URL}/queue/{entry_id}/status", json={"status": "serving"}, headers=headers_owner
        )
        if resp.status_code == 200:
            print(f"  ✅ Status updated to: {resp.json()['status']}")

        # 8. Complete
        # ---------------------------------------------------------
        print("\n✅ Completing Service...")
        resp = await client.patch(
            f"{BASE_URL}/queue/{entry_id}/status",
            json={"status": "completed"},
            headers=headers_owner,
        )
        if resp.status_code == 200:
            print(f"  ✅ Status updated to: {resp.json()['status']}")

    print("\n🎉 Manual Queue Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
