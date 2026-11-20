# Java Arena

**Joacă:** https://danciugaby.github.io/java-arena/

Provocări de programare Java în stil CodinGame, construite pe capitolele cursului de Java (ediția actualizată pentru Java 21/25). Studenții scriu cod Java real, care rulează direct în browser, primesc un scor și urcă din liga Lemn până în Legendă. Interfața este în română și engleză.

*Java programming challenges in the style of CodinGame, built on the chapters of the Java course. Students write real Java that runs right in the browser, get a score and climb from the Wood league to Legend. The interface is in Romanian and English.*

## Activități

| Cap. | Activitate | Tip |
|---|---|---|
| 1–2 | De la .java la procesor: JVM, uneltele JDK, cronologia Java | mini-joc |
| 2 | Salut, Arenă! (`Scanner` sau `void main()` + `IO.readln()` din Java 25) | cod scurt |
| 3 | Robotul de cristale: bucle și condiții, scorul este numărul de acțiuni, 3 hărți ascunse | optimizare |
| 3 | Termometrul: vectori (`closestToZero`) | cod scurt |
| 4 | Contul bancar: încapsulare, constructori, câmp static | puzzle |
| 5 | Fabrica de forme: clase abstracte, moștenire, polimorfism | puzzle |
| 6 | Catalogul grupei: `List`, `Map`, sortare | puzzle |
| 7 | Evadarea din excepții: excepții verificate, înlănțuirea cauzelor | puzzle |
| 7 | Condiția de cursă: `count++` pe două fire, apoi `synchronized` | mini-joc |
| 8 | Turnul de paranteze: `Deque` / `ArrayDeque` | cod scurt |
| 9 | Arena tiparelor: records, interfețe sealed, `switch` cu tipare | puzzle |
| 9 | Golf cu stream-uri: fără nicio buclă | cod scurt |
| 12 | Boss: CourseManager, proiectul de laborator | boss |
| 3–9 | Ce afișează? / Vânătoarea de bug-uri | arcade |

**Ligi:** Lemn = trec testele vizibile · Bronz = trec și testele ascunse · Argint, Aur, Legendă = cerințe suplimentare (cod mai scurt, câmpuri private, excepții verificate, fără bucle etc.).

## Cum funcționează

`src/mj-*.js` este un interpretor Java scris în JavaScript (subset de Java 25): clase, moștenire, interfețe cu metode `default`, clase abstracte, records, enum, interfețe sealed, `switch` cu tipare și deconstrucție de records, lambda, method references, Streams API și `Collectors`, colecții (`ArrayList`, `HashMap` cu aceeași ordine de iterare ca JDK, `TreeMap`, `ArrayDeque`, `PriorityQueue` etc.), excepții cu stack trace, `Scanner`, `String.format`, `IO.println`. Mesajele de eroare urmează formatul javac.

Limitări: firele de execuție rulează pe rând; recursivitatea e limitată la ~550 de apeluri; depășirea `int` se aplică la atribuire; `==` pe `String` compară valorile.

Progresul se păstrează în `localStorage`, în browserul fiecărui student.

## Dezvoltare

```sh
npm ci
npm run build      # -> dist/index.html (un singur fișier)
npm test           # cere un JDK 21 (javac/java) în PATH
```

`npm test` rulează fiecare program din `test/cases*.txt` atât cu JDK-ul real, cât și cu interpretorul, și compară ieșirile. Verifică apoi că soluțiile de referință ating liga Legendă și că răspunsurile din mini-jocuri coincid cu ce afișează Java.

La fiecare push pe `main`, workflow-ul `.github/workflows/pages.yml` construiește și testează site-ul, apoi îl publică pe ramura `gh-pages`.

| Fișier | Conținut |
|---|---|
| `src/mj-parse.js` | lexer și parser Java |
| `src/mj-runtime.js`, `src/mj-exec.js` | valori, clase, evaluare, apeluri |
| `src/mj-lib.js` | biblioteca standard (String, colecții, streams, Optional, formatare) |
| `src/challenges.js` | provocările, testele, ligile |
| `src/games.js` | conținutul mini-jocurilor |
| `src/app.js`, `src/app.css` | interfața |
