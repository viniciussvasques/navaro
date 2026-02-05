import asyncio
import json
import sys
from typing import Any

import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"
DEBUG_URL = "http://127.0.0.1:8000/debug"


# Helper para colorir output
class Colors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"


def log(msg, color=Colors.OKBLUE):
    print(f"{color}{msg}{Colors.ENDC}")


def log_json(data: Any):
    print(json.dumps(data, indent=2))


async def main():
    headers = {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Health Check
        log("--- 1. Testing Connection ---")
        try:
            resp = await client.get("http://localhost:8000/docs")
            if resp.status_code == 200:
                log("✅ API is reachable (Docs OK)", Colors.OKGREEN)
            else:
                log(f"❌ API reachable but returned {resp.status_code}", Colors.FAIL)
        except Exception as e:
            log(f"❌ Could not connect to API: {e}", Colors.FAIL)
            return

        # 2. Authentication
        log("\n--- 2. Testing Authentication ---")
        phone = "+5511999999999"

        # Send Code
        log(f"Sending code to {phone}...")
        resp = await client.post(f"{BASE_URL}/auth/send-code", json={"phone": phone})
        if resp.status_code != 200:
            log(f"❌ Failed to send code: {resp.text}", Colors.FAIL)
            return

        data = resp.json()
        log(f"Response: {data}", Colors.OKGREEN)

        # Extract Code (In dev mode, it's in the message)
        # Message format: "Código de verificação: 123456"
        message = data.get("message", "")
        code = message.split(": ")[1].strip() if ": " in message else None

        if not code:
            log(
                "❌ Could not extract code from response. Is environment 'development'?",
                Colors.FAIL,
            )
            # Try default code just in case or stop
            return

        log(f"✅ Extracted Code: {code}", Colors.OKGREEN)

        # Verify Code
        log("Verifying code...")
        resp = await client.post(f"{BASE_URL}/auth/verify", json={"phone": phone, "code": code})
        if resp.status_code != 200:
            log(f"❌ Failed to verify code: {resp.text}", Colors.FAIL)
            return

        auth_data = resp.json()
        token = auth_data["access_token"]
        headers["Authorization"] = f"Bearer {token}"
        log("✅ Authentication Successful! Token acquired.", Colors.OKGREEN)

        # 3. User Profile
        log("\n--- 3. Testing User Profile ---")
        resp = await client.get(f"{BASE_URL}/users/me", headers=headers)
        if resp.status_code == 200:
            user = resp.json()
            log(
                f"✅ User Info: {user['name']} ({user['phone']}) - Role: {user['role']}",
                Colors.OKGREEN,
            )
        else:
            log(f"❌ Failed to get user profile: {resp.text}", Colors.FAIL)

        # 4. Create Establishment
        log("\n--- 4. Testing Create Establishment ---")
        # Generate random slug to avoid unique constraint if re-running
        import random

        slug_suffix = random.randint(1000, 9999)
        est_data = {
            "name": f"Barbearia Teste {slug_suffix}",
            "slug": f"barbearia-teste-{slug_suffix}",
            "description": "Uma barbearia de teste criada via script",
            "category": "barbershop",
            "address": "Rua Teste, 123",
            "phone": "+5511988888888",
            "settings": {"theme": "dark", "allow_chat": True},
        }
        resp = await client.post(f"{BASE_URL}/establishments", json=est_data, headers=headers)
        est_id = None
        if resp.status_code == 201:
            est = resp.json()
            est_id = est["id"]
            log(f"✅ Establishment Created: {est['name']} (ID: {est_id})", Colors.OKGREEN)
        elif resp.status_code == 409:
            log("⚠️ Establishment slug already exists, skipping create.", Colors.WARNING)
            # Try to search for one to continue tests
            resp_list = await client.get(f"{BASE_URL}/establishments/my", headers=headers)
            if resp_list.status_code == 200 and resp_list.json():
                est_id = resp_list.json()[0]["id"]
                log(f"ℹ️ Used existing establishment: {est_id}", Colors.OKBLUE)
        else:
            log(f"❌ Failed to create establishment: {resp.text}", Colors.FAIL)

        if not est_id:
            log("❌ Cannot proceed with Service tests without Establishment ID", Colors.FAIL)
            return

        # 5. Services
        log("\n--- 5. Testing Services ---")
        service_data = {
            "name": "Corte de Cabelo Moderno",
            "description": "Corte na tesoura e máquina",
            "price": 50.00,
            "duration_minutes": 45,
            "active": True,
        }
        resp = await client.post(
            f"{BASE_URL}/establishments/{est_id}/services", json=service_data, headers=headers
        )
        if resp.status_code == 201:
            svc = resp.json()
            log(f"✅ Service Created: {svc['name']} - R$ {svc['price']}", Colors.OKGREEN)
        else:
            log(f"❌ Failed to create service: {resp.text}", Colors.FAIL)

        # List Services
        resp = await client.get(f"{BASE_URL}/establishments/{est_id}/services", headers=headers)
        if resp.status_code == 200:
            services = resp.json()
            log(f"✅ Service List: Found {services['total']} service(s)", Colors.OKGREEN)
            for s in services["items"]:
                print(f"   - {s['name']}")
        else:
            log(f"❌ Failed to list services: {resp.text}", Colors.FAIL)

        log("\n✅ VERIFICATION COMPLETE!", Colors.HEADER)


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
