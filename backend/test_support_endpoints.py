#!/usr/bin/env python3
"""
Test script for Admin Support endpoints.
"""
import requests
import json

BASE_URL = "http://localhost"

def login():
    """Login as admin and get access token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={"email": "admin@orion.com", "password": "admin123"}
    )
    if response.status_code == 200:
        data = response.json()
        return data['access']
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_support_users_search(token):
    """Test user search endpoint."""
    print("\n=== Testing User Search ===")
    response = requests.get(
        f"{BASE_URL}/api/admin/support/users/?q=admin",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count', 0)}")
        if data.get('results'):
            print(f"First result: {data['results'][0]['email']}")
    else:
        print(f"Error: {response.text}")

def test_support_user_detail(token, user_id=1):
    """Test user detail endpoint."""
    print(f"\n=== Testing User Detail (ID: {user_id}) ===")
    response = requests.get(
        f"{BASE_URL}/api/admin/support/users/{user_id}/",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"User: {data.get('name')} ({data.get('email')})")
        print(f"Status: {data.get('status')}")
        print(f"Email Verified: {data.get('emailVerified')}")
    else:
        print(f"Error: {response.text}")

def test_support_user_timeline(token, user_id=1):
    """Test user timeline endpoint."""
    print(f"\n=== Testing User Timeline (ID: {user_id}) ===")
    response = requests.get(
        f"{BASE_URL}/api/admin/support/users/{user_id}/timeline/",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Timeline events count: {data.get('count', 0)}")
    else:
        print(f"Error: {response.text}")

def test_impersonation_status(token):
    """Test impersonation status endpoint."""
    print("\n=== Testing Impersonation Status ===")
    response = requests.get(
        f"{BASE_URL}/api/admin/support/impersonate/status/",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Is impersonating: {data.get('isImpersonating', False)}")
    else:
        print(f"Error: {response.text}")

def test_export_jobs_list(token):
    """Test export jobs list endpoint."""
    print("\n=== Testing Export Jobs List ===")
    response = requests.get(
        f"{BASE_URL}/api/admin/support/export/",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Export jobs count: {data.get('count', 0)}")
    else:
        print(f"Error: {response.text}")

def main():
    print("Admin Support Endpoints Test")
    print("=" * 50)

    # Login
    print("\n=== Logging in as admin ===")
    token = login()
    if not token:
        print("Failed to get access token. Exiting.")
        return

    print(f"Access token obtained: {token[:50]}...")

    # Test endpoints
    test_support_users_search(token)
    test_support_user_detail(token)
    test_support_user_timeline(token)
    test_impersonation_status(token)
    test_export_jobs_list(token)

    print("\n" + "=" * 50)
    print("All tests completed!")

if __name__ == "__main__":
    main()
