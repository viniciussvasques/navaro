import asyncio
import httpx

# Define base URL (internal container network)
API_URL = "http://localhost:8000/api/v1"


async def verify_data():
    print("🧪 Verifying Seeded Data...")

    async with httpx.AsyncClient() as client:
        # 1. Login to get token
        login_res = await client.post(
            f"{API_URL}/auth/login", json={"email": "admin@dunnaa.com", "password": "admin123"}
        )
        if login_res.status_code != 200:
            print(f"❌ Login Failed: {login_res.text}")
            return

        token = login_res.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login Successful")

        # 2. Fetch Establishments
        print("  > Fetching Establishments...")
        est_res = await client.get(f"{API_URL}/establishments", headers=headers)
        if est_res.status_code == 200:
            data = est_res.json()
            count = len(data) if isinstance(data, list) else len(data.get("items", []))
            print(f"    ✅ Success! Found {count} establishments.")
            if count > 0:
                first = data[0] if isinstance(data, list) else data["items"][0]
                print(f"       Example: {first.get('name')} ({first.get('slug')})")
        else:
            print(f"    ❌ Failed: {est_res.status_code} - {est_res.text}")

        # 3. Fetch Users
        print("  > Fetching Users...")
        users_res = await client.get(f"{API_URL}/users", headers=headers)
        if users_res.status_code == 200:
            data = users_res.json()
            count = len(data) if isinstance(data, list) else len(data.get("items", []))
            print(f"    ✅ Success! Found {count} users.")
        else:
            print(f"    ❌ Failed: {users_res.status_code} - {users_res.text}")


if __name__ == "__main__":
    asyncio.run(verify_data())
