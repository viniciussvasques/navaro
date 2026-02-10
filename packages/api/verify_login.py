import asyncio
import httpx

# Define base URL (internal container network)
API_URL = "http://localhost:8000/api/v1"

async def test_login():
    print("🧪 Testing Login...")
    
    # login with admin
    async with httpx.AsyncClient() as client:
        # 1. Login
        login_data = {
            "username": "admin@dunnaa.com", # OAuth2PasswordRequestForm uses username for email
            "password": "admin123"
        }
        # Try both JSON and Form Data (FastAPI OAuth2 expects Form Data usually, but let's check custom auth)
        # Looking at previous logs, it was a JSON endpoint /api/auth/login or similar?
        # Step 5399 curl used JSON to http://localhost:3005/api/auth/login (Admin API Proxy) -> JSON
        # The Backend usually has /api/v1/user/auth or /api/v1/auth/access-token
        
        # Let's try the endpoint that the Admin Wrapper calls.
        # But here I am inside the API container. checking routes would be good but let's try standard patterns.
        
        try:
            # The original `test_login` function's content is being replaced by the new `verify_login` logic.
            # This block is the new content for the login attempts.
            # Note: The `async def verify_login():` part from the instruction is interpreted as the *content*
            # to be executed within the `test_login` function's `try` block, not a new function definition.
            # The `client` object is already available from the `test_login`'s `async with httpx.AsyncClient() as client:`
            # and `API_URL` is a global constant.

            # Try original email
            print("\n🔑 Tentando login com admin@dunnaa.com...")
            try:
                response = await client.post(
                    f"{API_URL}/auth/login",
                    json={"email": "admin@dunnaa.com", "password": "admin123"},
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("✅ Login SUCESSO via Body!")
                    print("🍪 Cookies recebidos:", response.cookies)
                    if "access_token" in response.cookies:
                        print("✅ Cookie HttpOnly 'access_token' encontrado!")
                    else:
                        print("❌ Cookie 'access_token' NÃO encontrado!")
                else:
                    print(f"❌ Falha: {response.text}")

            except Exception as e:
                print(f"❌ Erro de conexão: {e}")

            # Try .br email (user's attempt)
            print("\n🔑 Tentando login com admin@dunnaa.com.br...")
            try:
                response = await client.post(
                    f"{API_URL}/auth/login",
                    json={"email": "admin@dunnaa.com.br", "password": "admin123"},
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("✅ Login SUCESSO via Body!")
                    print("🍪 Cookies recebidos:", response.cookies)
                else:
                    print(f"❌ Falha: {response.text}")
                    if response.status_code == 401:
                        print("   -> Usuário não existe ou senha errada.")

            except Exception as e:
                print(f"❌ Erro de conexão: {e}")
            
            # Attempt 2: Form to /api/v1/login/access-token (original part, kept as per instruction)
            print("  > Attempting Form login to /api/v1/login/access-token...")
            response = await client.post(f"{API_URL}/login/access-token", data=login_data)
            print(f"    Status: {response.status_code}")
            if response.status_code == 200:
                 print("    ✅ Success!")
                 print(response.json())
                 return

        except Exception as e:
            print(f"    ❌ Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_login())
