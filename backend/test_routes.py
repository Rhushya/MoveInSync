"""Quick script to test what routes are registered."""
from app.main import app

print("=" * 80)
print("REGISTERED ROUTES:")
print("=" * 80)

for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f"{list(route.methods) if route.methods else ['ANY']:30s} {route.path}")
    elif hasattr(route, 'path'):
        print(f"{'[MOUNT]':30s} {route.path}")

print("=" * 80)
