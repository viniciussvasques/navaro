"""Manual test for Reviews feature."""

import asyncio

import httpx

BASE_URL = "http://localhost:8000/api/v1"


async def run_test():
    print("🚀 Starting Manual Review Verification...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Auth (User 1 - Owner)
        # ---------------------------------------------------------
        print("\n🔑 Login Owner...")
        phone = "+5511999991111"
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
        phone2 = "+5511988882222"
        await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone2})
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone2})
        code = resp.json()["message"].split(": ")[1].strip()
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone2, "code": code})
        token_customer = resp.json()["tokens"]["access_token"]
        headers_customer = {"Authorization": f"Bearer {token_customer}"}
        print("  ✅ Customer Logged In")

        # 3. Create Establishment (Owner)
        # ---------------------------------------------------------
        print("\n🏢 Creating Establishment...")
        from uuid import uuid4

        est_data = {
            "name": f"Barbearia das Estrelas {uuid4()}",
            "category": "barbershop",
            "address": "Av Paulista, 1000",
            "city": "São Paulo",
            "state": "SP",
            "phone": "+5511999990001",
        }
        resp = await client.post(f"{BASE_URL}/establishments", json=est_data, headers=headers_owner)
        est_id = resp.json()["id"]
        print(f"  ✅ Establishment Created: {est_id}")

        # 4. Customer Creates Review
        # ---------------------------------------------------------
        print("\n⭐ Customer Reviewing...")
        review_data = {
            "establishment_id": est_id,
            "rating": 5,
            "comment": "Melhor corte que já fiz!",
        }
        resp = await client.post(f"{BASE_URL}/reviews", json=review_data, headers=headers_customer)
        if resp.status_code == 201:
            review = resp.json()
            review_id = review["id"]
            print(f"  ✅ Created Review! ID: {review_id}")
        else:
            print(f"  ❌ Failed to create review: {resp.text}")
            return

        # 5. List Reviews (Public)
        # ---------------------------------------------------------
        print("\n📋 Listing Reviews...")
        resp = await client.get(f"{BASE_URL}/reviews/establishments/{est_id}")
        data = resp.json()
        print(f"  ✅ Total Reviews: {data['total']}")
        print(f"  ✅ Latest: {data['items'][0]['comment']} (Rating: {data['items'][0]['rating']})")

        # 6. Owner Responds
        # ---------------------------------------------------------
        print("\n📢 Owner Responding...")
        resp = await client.patch(
            f"{BASE_URL}/reviews/{review_id}/respond",
            json={"response": "Muito obrigado! Volte sempre!"},
            headers=headers_owner,
        )
        if resp.status_code == 200:
            print(f"  ✅ Response added: {resp.json()['owner_response']}")
        else:
            print(f"  ❌ Failed to respond: {resp.text}")

        # 7. Verify Ownership Restriction
        # ---------------------------------------------------------
        print("\n🔒 Testing Permission Restriction...")
        # Customer trying to respond to their own review (should be forbidden)
        resp = await client.patch(
            f"{BASE_URL}/reviews/{review_id}/respond",
            json={"response": "Impostor!"},
            headers=headers_customer,
        )
        print(f"  ✅ Status code for restricted action: {resp.status_code} (Expected 403)")

    print("\n🎉 Manual Review Verification Complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
