import urllib.request, json, os

key = os.environ.get("GEMINI_API_KEY")
if not key:
    print("GEMINI_API_KEY not found")
    exit(1)

url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + key
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        models = [m["name"].replace("models/", "") for m in data.get("models", [])]
        curated = ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.5-flash", "gemma-3-27b-it", "gemini-2.0-flash-lite"]
        print("=== Verificacio models curats ===")
        for m in curated:
            status = "✅" if m in models else "❌ NO TROBAT"
            print(f"  {status}  {m}")
        print(f"\nTotal models disponibles a l'API: {len(models)}")
except urllib.error.URLError as e:
    print(f"Error fetching API: {e}")
    exit(2)
