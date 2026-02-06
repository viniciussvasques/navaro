import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    """
    Test the full authentication flow:
    1. Send verification code
    2. Extract code from response (dev mode)
    3. Verify code and get tokens
    """
    phone = "+5511999999999"

    # 1. Send Code
    response = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    if response.status_code != 200:
        print(f"DEBUG ERROR: {response.text}")
    assert response.status_code == 200, f"Send Code Failed: {response.text}"
    data = response.json()
    # In dev mode, message format is "Código de verificação: XXXXXX"
    assert "Código de verificação" in data["message"]

    # Extract code
    message = data["message"]
    code = message.split(": ")[1].strip()

    # 2. Verify Code
    response = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    if response.status_code != 200:
        print(f"\nDEBUG_AUTH_ERROR: {response.text}\n")
    assert response.status_code == 200, f"Verify Code Failed: {response.text}"
    auth_data = response.json()
    assert "tokens" in auth_data
    assert "access_token" in auth_data["tokens"]
    assert "user" in auth_data
    assert auth_data["user"]["phone"] == phone
