# WarsztatTech — integracja zgłoszeń WWW (przygotowanie)
Docelowa baza: istniejąca Notion **Zgłoszenia WWW** (ID ffed7123-d3cc-46ab-8a2c-794e5d20d86c). Nie twórz drugiej bazy.
Endpoint POST /api/zgloszenie przyjmuje name, phone, vehicle, issue, consent, turnstileToken, website (honeypot).
Wymagane zmienne Vercel: NOTION_API_KEY (sekret integracji Notion udostępnionej tej konkretnej bazie), TURNSTILE_SECRET_KEY (Cloudflare Turnstile).
Przed uruchomieniem należy dodać publiczny widget Turnstile po stronie formularza, przetestować realny zapis i sprawdzić limity antyspamowe. Sam endpoint NIE jest jeszcze publicznie używany; na tym branchu brak zmian produkcyjnej strony.
NIE ustawiać NOTION_API_KEY w plikach repo ani w client-side JS. Brak automatycznego tworzenia potwierdzonych terminów, wycen i powiadomień.
Wymagana polityka prywatności uwzględniająca zbieranie danych przez formularz i czas przechowywania.
