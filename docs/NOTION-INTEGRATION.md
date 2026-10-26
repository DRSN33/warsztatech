# Zgłoszenia WWW — stan wdrożenia

## Potwierdzony cel
Istniejące źródło danych Notion: Zgłoszenia WWW, `ffed7123-d3cc-46ab-8a2c-794e5d20d86c`.
Jego schemat zweryfikowano przez natywne połączenie Notion. To identyfikator źródła danych, nie kontenera bazy. API używa `Notion-Version: 2025-09-03` i rodzica `data_source_id`.
Pola: Name (title), Telefon (phone_number), Pojazd i Opis usterki (rich_text), Zgoda (checkbox), Źródło (select: WWW), Status (status: Nowe). Data zgłoszenia jest automatyczna.
Nie tworzymy baz, nie edytujemy ani nie odczytujemy kartotek klientów.

## Konfiguracja
- NOTION_API_KEY: sekret integracji z dostępem Read content i Insert content do istniejącej bazy. Świeży token należy zapisać bezpośrednio w Vercel. Sekret wpisany jako nazwa zmiennej wymaga rotacji.
- TURNSTILE_SECRET_KEY: sekret Cloudflare, zapisany w Vercel; sama obecność nie potwierdza ważności.
- TURNSTILE_SITE_KEY: publiczny klucz tego samego widgetu. Dopuszczone hosty muszą obejmować testowany adres Preview i domenę produkcyjną, najlepiej przy osobnych widgetach na środowiska.
- Preview: gałąź feature/notion-zgloszenia-www. Serwer dopuszcza tylko dokładne VERCEL_URL i VERCEL_BRANCH_URL.
- Production: warsztatech.vercel.app. Nie kopiować produkcyjnych sekretów do lokalnych plików.
Vercel nie pozwolił zmienić nazwy istniejącej zmiennej Sensitive. Nie usunięto starych wpisów.
`GET /api/form-config` ujawnia tylko klucz publiczny i odmawia uruchomienia formularza przy brakującej konfiguracji.

## Testy
`node --test` — testy lokalne z atrapami Cloudflare/Notion i przeglądarki. Nie są dowodem działającego zapisu w zewnętrznym Notion.
Obejmują walidację, zgodę, obce domeny, honeypot, błędne tokeny/domenę/akcję, awarie usług, brak sekretów, bezpieczny config, sukces i błędy formularza oraz blokadę podwójnego kliknięcia.
Nie ma automatycznych ponowień zapisu: po timeout należy sprawdzić syntetyczny wpis przed kolejną próbą.

## Warunki release — wszystkie wymagane
1. Zapisać świeży NOTION_API_KEY i prawidłowy TURNSTILE_SITE_KEY w Vercel, sprawdzić parę kluczy Turnstile i dostęp integracji serwerowej do źródła danych.
2. Utworzyć Preview dla dokładnego commitu, sprawdzić formularz w prawdziwej przeglądarce i wykonać jeden oznaczony syntetyczny zapis bez danych klienta. Potwierdzić wpis oraz brak duplikatu; nie usuwać danych.
3. Ustawić i zweryfikować trwały limit żądań w Vercel Firewall dla /api/zgloszenie. Turnstile nie zastępuje limitu liczby żądań. Nie polegać na pamięci pojedynczej funkcji.
4. Uzupełnić i zatwierdzić politykę prywatności: bieżący plik nadal jest szablonem z niepotwierdzonymi danymi administratora, starym adresem i opisem WhatsApp. Opisać rzeczywisty przepływ przez Vercel, Cloudflare i Notion oraz ustalić retencję. Nie publikować szablonu jako zatwierdzonej polityki.
5. Po testach przygotować build produkcyjny bez przypisywania domen, przetestować go, uzyskać zatwierdzenie właściciela i dopiero promować ten build.

Status: produkcyjny release wstrzymany do spełnienia powyższych warunków. Nie deklarować testu end-to-end ani gotowości produkcyjnej na podstawie samych testów lokalnych.

## Audyt 26.10.2026 — rzeczywisty test
- Repo main: fbda27d; PR #2 remote head przed aktualizacją: acdeadf; lokalne poprawki 55e8074 i f456b8b nie były wypchnięte.
- Preview warsztatech-7k7nlxhie-drsn1.vercel.app: formularz renderuje się, testowy Turnstile zaliczony automatycznie. Jedna wysyłka „TEST WWW NOTION 2026-10-26 0951”, telefon 000000000, wyłącznie syntetyczne dane.
- Log Vercel 07:50:04 UTC: POST /api/zgloszenie → notion-create-failed 404. Weryfikacja istniejącego źródła przez Composio: brak tego rekordu. Nie ponawiano zapisu ani niczego nie usuwano.
- Composio widzi źródło danych; to nie dowodzi uprawnień integracji używanej przez NOTION_API_KEY w Vercel. Właściciel musi udostępnić bazę właśnie tej integracji.
- W metadanych production są NOTION_API_KEY i TURNSTILE_SECRET_KEY; brak TURNSTILE_SITE_KEY. Nie odczytywano wartości sekretów. Historyczne nieprawidłowe nazwy zmiennych pozostawiono bez zmian i nie ujawniano.
- Vercel Firewall: aktywna poprawna reguła rule_warsztat_tech_intake_rate_limit_lRQ1PL, POST /api/zgloszenie, 5 żądań / 60 s / IP, deny po przekroczeniu. Zachowanie limitu w ruchu wymaga osobnego sprawdzenia.
- Polityka prywatności pozostaje szablonem. Poproszono o potwierdzenie danych administratora i retencji; nie opublikowano niepotwierdzonych ustaleń.
- Testy lokalne: 31/31. Dodatkowa blokada publicznego config i zapisu na produkcji przy kluczach testowych.
- Produkcja nieopublikowana: warunek udanego E2E nie został spełniony. Make i kartoteki klientów bez zmian.

## Potwierdzenie właściciela — polityka prywatności
26.10.2026 właściciel potwierdził: Damian Drabek / WarsztatTech, ul. Owocowa 7, Zawiercie, damiandrabson@gmail.com i maksymalnie 6 miesięcy dla zgłoszeń bez dalszej współpracy. Politykę uzupełniono o rzeczywiste pola i przepływ Vercel → weryfikacja Turnstile → Notion, prawa i dane techniczne. Nie jest to potwierdzenie automatycznego usuwania po 6 miesiącach; retencja wymaga przeglądu przez administratora. Istniejących danych nie usuwano.
Limit Firewall przetestowano pustymi żądaniami bez danych klientów: pierwsze 5 otrzymało 404 (brak endpointu na dotychczasowej produkcji), szóste 403 z warstwy ochronnej.
Ponowne sprawdzenie metadanych Vercel: nadal brak TURNSTILE_SITE_KEY dla production. Dostęp serwerowej integracji Notion nadal wymaga naprawy; nie ponawiano tworzenia rekordu bez potwierdzonej zmiany uprawnień.
