import requests


class GeminiProvider:
    BASE_URL = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent"
    )

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    def summarize(self, prompt: str) -> str | None:
        if not self.api_key:
            return None

        response = requests.post(
            f"{self.BASE_URL}?key={self.api_key}",
            json={
                "contents": [{"parts": [{"text": prompt}]}],
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts).strip()
        return text or None

