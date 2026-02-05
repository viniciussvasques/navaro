"""Manual test for Favorites feature."""

import asyncio

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Favorites Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Auth (User)
        # ---------------------------------------------------------
        print("\n🔑 Login User...")
        phone = "+5511999993333"
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone, "code": code})
        token = resp.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  ✅ User Logged In")

        # 2. Get some establishment and staff
        # ---------------------------------------------------------
        print("\n🏢 fetching establishments...")
        resp = await client.get(f"{BASE_URL}/establishments")
        est_data = resp.json()
        est_list = est_data.get("items", [])

        if not est_list:
            print("  ⚠️ No establishments found. Creating one...")
            est_create_data = {
                "name": "Barbearia de Luxo",
                "category": "barbershop",
                "address": "Rua Augusta, 500",
                "city": "São Paulo",
                "state": "SP",
                "phone": "+551122222222",
            }
            resp = await client.post(
                f"{BASE_URL}/establishments", json=est_create_data, headers=headers
            )
            establishment_id = resp.json()["id"]
        else:
            establishment_id = est_list[0]["id"]

        print(f"  ✅ Using Establishment: {establishment_id}")

        # Try to get a staff member
        print("\n👤 fetching staff...")
        resp = await client.get(f"{BASE_URL}/establishments/{establishment_id}/staff")
        staff_list = resp.json()
        if not staff_list:
            print("  ⚠️ No staff found. Creating one...")
            staff_data = {"name": "Mestre João", "role": "barbeiro", "commission_rate": 50.0}
            resp = await client.post(
                f"{BASE_URL}/establishments/{establishment_id}/staff",
                json=staff_data,
                headers=headers,
            )
            staff_id = resp.json()["id"]
        else:
            staff_id = staff_list[0]["id"]
        print(f"  ✅ Using Staff: {staff_id}")

        # 3. Favorite Establishment
        # ---------------------------------------------------------
        print("\n❤️ Favoriting Establishment...")
        resp = await client.post(
            f"{BASE_URL}/favorites/establishments",
            json={"establishment_id": establishment_id},
            headers=headers,
        )
        print(f"  ✅ Added Establishment: {resp.json()['added']}")

        # 4. Favorite Staff
        # ---------------------------------------------------------
        print("\n⭐️ Favoriting Staff...")
        resp = await client.post(
            f"{BASE_URL}/favorites/staff",
            json={"staff_id": staff_id, "establishment_id": establishment_id},
            headers=headers,
        )
        print(f"  ✅ Added Staff: {resp.json()['added']}")

        # 5. List Favorites
        # ---------------------------------------------------------
        print("\n📋 Listing Favorites...")
        resp = await client.get(f"{BASE_URL}/favorites", headers=headers)
        data = resp.json()
        print(f"  ✅ Favorite Establishments: {len(data['establishments'])}")
        print(f"  ✅ Favorite Staff: {len(data['staff'])}")
        if data["establishments"]:
            print(f"  ✅ First Est: {data['establishments'][0]['establishment_name']}")
        if data["staff"]:
            print(f"  ✅ First Staff: {data['staff'][0]['staff_name']}")

        # 6. Unfavorite (Toggle)
        # ---------------------------------------------------------
        print("\n💔 Unfavoriting Establishment...")
        resp = await client.post(
            f"{BASE_URL}/favorites/establishments",
            json={"establishment_id": establishment_id},
            headers=headers,
        )
        print(f"  ✅ Added (should be False): {resp.json()['added']}")

        # 7. Verify Unfavorite
        # ---------------------------------------------------------
        print("\n📋 Listing Favorites again...")
        resp = await client.get(f"{BASE_URL}/favorites", headers=headers)
        data = resp.json()
        print(f"  ✅ Favorite Establishments: {len(data['establishments'])}")
        print(f"  ✅ Favorite Staff: {len(data['staff'])} (Should still be 1)")

    print("\n🎉 Manual Favorites Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
