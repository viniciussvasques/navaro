"""Manual test for Portfolio feature."""

import asyncio

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Portfolio Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Auth (User)
        # ---------------------------------------------------------
        print("\n🔑 Login User...")
        phone = "+5511999994444"
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone, "code": code})
        token = resp.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  ✅ User Logged In")

        # 2. Setup (Establishment and Staff)
        # ---------------------------------------------------------
        print("\n🏢 fetching establishments...")
        resp = await client.get(f"{BASE_URL}/establishments")
        est_data = resp.json().get("items", [])

        if not est_data:
            print("  ⚠️ No establishments found. Creating one...")
            est_create_data = {
                "name": "Barbearia de Artes",
                "category": "barbershop",
                "address": "Rua das Flores, 100",
                "city": "São Paulo",
                "state": "SP",
                "phone": "+551144444444",
            }
            resp = await client.post(
                f"{BASE_URL}/establishments", json=est_create_data, headers=headers
            )
            establishment_id = resp.json()["id"]
        else:
            establishment_id = est_data[0]["id"]

        print(f"  ✅ Using Establishment: {establishment_id}")

        print("\n👤 fetching staff...")
        resp = await client.get(f"{BASE_URL}/establishments/{establishment_id}/staff")
        staff_list = resp.json()
        if not staff_list:
            print("  ⚠️ No staff found. Creating one...")
            staff_data = {"name": "Mestre Portfolio", "role": "barbeiro", "commission_rate": 50.0}
            resp = await client.post(
                f"{BASE_URL}/establishments/{establishment_id}/staff",
                json=staff_data,
                headers=headers,
            )
            staff_id = resp.json()["id"]
        else:
            staff_id = staff_list[0]["id"]
        print(f"  ✅ Using Staff: {staff_id}")

        # 3. Add Portfolio Image
        # ---------------------------------------------------------
        print("\n📸 Adding Portfolio Image...")
        image_payload = {
            "establishment_id": establishment_id,
            "staff_id": staff_id,
            "image_url": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1",
            "description": "Corte clássico",
        }
        resp = await client.post(f"{BASE_URL}/portfolio", json=image_payload, headers=headers)
        if resp.status_code == 201:
            image_id = resp.json()["id"]
            print(f"  ✅ Image Added! ID: {image_id}")
        else:
            print(f"  ❌ Failed to add image: {resp.text}")
            return

        # 4. List Portfolio (Establishment)
        # ---------------------------------------------------------
        print("\n📋 Listing Establishment Portfolio...")
        resp = await client.get(f"{BASE_URL}/portfolio/establishments/{establishment_id}")
        data = resp.json()
        print(f"  ✅ Total Items: {data['total']}")
        if data["items"]:
            print(f"  ✅ First Item Desc: {data['items'][0]['description']}")

        # 5. List Portfolio (Staff)
        # ---------------------------------------------------------
        print("\n📋 Listing Staff Portfolio...")
        resp = await client.get(f"{BASE_URL}/portfolio/staff/{staff_id}")
        data = resp.json()
        print(f"  ✅ Total Items: {data['total']}")

        # 6. Delete Image
        # ---------------------------------------------------------
        print("\n🗑️ Deleting Image...")
        resp = await client.delete(f"{BASE_URL}/portfolio/{image_id}", headers=headers)
        print(f"  ✅ Status Code: {resp.status_code} (Expected 204)")

        # 7. Final Check
        # ---------------------------------------------------------
        print("\n📋 Verifying Empty Portfolio...")
        resp = await client.get(f"{BASE_URL}/portfolio/establishments/{establishment_id}")
        print(f"  ✅ Total Items: {resp.json()['total']} (Expected 0)")

    print("\n🎉 Manual Portfolio Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
