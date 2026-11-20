// ===== Java Arena: mini-game content =====
const Games = (() => {
  const L = (ro, en) => ({ ro, en });
  // ---------- "What does it print?" ----------
  // answers are computed live by the in-browser JVM (and were checked against JDK 21)
  const PREDICT = [
    { ch: 3, code: `int x = 7 / 2;
double y = 7 / 2;
System.out.println(x + " " + y);`, wrong: ['3.5 3.5', '3 3.5', '4 4.0'],
      why: L('<code>7 / 2</code> e împărțire întreagă (3). Abia apoi rezultatul 3 se convertește la <code>double</code>: 3.0.', '<code>7 / 2</code> is integer division (3). Only then is 3 widened to <code>double</code>: 3.0.') },
    { ch: 3, code: `System.out.println(1 + 2 + "3" + 4 + 5);`, wrong: ['12345', '15', '339'],
      why: L('Evaluare de la stânga la dreapta: 1 + 2 = 3, apoi totul devine <code>String</code>: "3" + "3" + "4" + "5".', 'Left to right: 1 + 2 = 3, then everything becomes a <code>String</code>: "3" + "3" + "4" + "5".') },
    { ch: 3, code: `String s = "Java";
s.toUpperCase();
System.out.println(s);`, wrong: ['JAVA', 'java', 'null'],
      why: L('Șirurile sunt imutabile. <code>toUpperCase()</code> întoarce un șir nou, care aici este ignorat.', 'Strings are immutable. <code>toUpperCase()</code> returns a new string, which is ignored here.') },
    { ch: 3, code: `char c = 'A';
c += 2;
System.out.println(c + 1);`, wrong: ['C1', 'D', 'B1'],
      why: L('<code>c</code> devine <code>\'C\'</code>, dar <code>c + 1</code> este o operație cu <code>int</code>: 67 + 1 = 68.', '<code>c</code> becomes <code>\'C\'</code>, but <code>c + 1</code> is an <code>int</code> operation: 67 + 1 = 68.') },
    { ch: 3, code: `int big = Integer.MAX_VALUE;
big = big + 1;
System.out.println(big);`, wrong: ['2147483648', '0', 'ArithmeticException'],
      why: L('Depășire: un <code>int</code> are 32 de biți, așa că valoarea „se întoarce” la cea mai mică valoare.', 'Overflow: an <code>int</code> has 32 bits, so the value wraps around to the smallest one.') },
    { ch: 3, code: `System.out.println(0.1 + 0.2 == 0.3);`, wrong: ['true', '0.3', '0.30000000000000004'],
      why: L('0.1 și 0.2 nu au reprezentare binară exactă; suma este 0.30000000000000004.', '0.1 and 0.2 have no exact binary form; the sum is 0.30000000000000004.') },
    { ch: 4, code: `class Box {
    int v;
    Box(int v) { v = v; }
}
System.out.println(new Box(5).v);`, wrong: ['5', 'null', 'compile error'],
      why: L('Parametrul <code>v</code> ascunde câmpul. <code>v = v</code> se atribuie lui însuși; câmpul rămâne 0. Corect: <code>this.v = v</code>.', 'The parameter <code>v</code> shadows the field. <code>v = v</code> assigns it to itself; the field stays 0. Fix: <code>this.v = v</code>.') },
    { ch: 4, code: `class Counter {
    static int total = 0;
    int mine = 0;
    void inc() { total++; mine++; }
}
Counter a = new Counter(), b = new Counter();
a.inc(); a.inc(); b.inc();
System.out.println(a.mine + " " + b.mine + " " + Counter.total);`, wrong: ['2 1 2', '3 3 3', '2 1 1'],
      why: L('Un câmp <code>static</code> e unul singur pentru toată clasa; fiecare obiect are propriul <code>mine</code>.', 'A <code>static</code> field is shared by the whole class; each object has its own <code>mine</code>.') },
    { ch: 5, code: `class A {
    String who() { return "A"; }
    String hi() { return "hi from " + who(); }
}
class B extends A {
    String who() { return "B"; }
}
A x = new B();
System.out.println(x.hi());`, wrong: ['hi from A', 'hi from AB', 'compile error'],
      why: L('Polimorfism: <code>who()</code> se alege după tipul real al obiectului (<code>B</code>), chiar dacă e apelat din <code>A</code>.', 'Polymorphism: <code>who()</code> is chosen by the object\'s real type (<code>B</code>), even when called from <code>A</code>.') },
    { ch: 5, code: `class P { P() { System.out.print("P"); } }
class C extends P { C() { System.out.print("C"); } }
new C();
new C();`, wrong: ['CPCP', 'CC', 'PPCC'],
      why: L('Constructorul clasei de bază rulează primul (un <code>super()</code> implicit).', 'The base class constructor runs first (an implicit <code>super()</code>).') },
    { ch: 6, code: `List<Integer> l = new ArrayList<>(List.of(10, 20, 30));
l.remove(1);
System.out.println(l);`, wrong: ['[20, 30]', '[10, 20, 30]', '[10, 20]'],
      why: L('<code>remove(int)</code> elimină după <b>index</b>. Pentru valoare: <code>l.remove(Integer.valueOf(1))</code>.', '<code>remove(int)</code> removes by <b>index</b>. By value: <code>l.remove(Integer.valueOf(1))</code>.') },
    { ch: 6, code: `Set<String> s = new TreeSet<>(List.of("pear", "Apple", "banana", "apple"));
System.out.println(s);`, wrong: ['[apple, Apple, banana, pear]', '[Apple, banana, pear]', '[pear, Apple, banana, apple]'],
      why: L('<code>TreeSet</code> sortează natural; majusculele (65–90) vin înaintea minusculelor (97–122).', '<code>TreeSet</code> sorts naturally; uppercase letters (65–90) come before lowercase (97–122).') },
    { ch: 6, code: `Map<String, Integer> m = new HashMap<>();
m.put("a", 1);
m.put("a", 2);
m.merge("b", 5, Integer::sum);
m.merge("a", 5, Integer::sum);
System.out.println(m);`, wrong: ['{a=2, b=5}', '{a=1, a=2, b=5}', '{a=8, b=5}'],
      why: L('A doua <code>put</code> înlocuiește valoarea; <code>merge</code> adună la valoarea existentă: 2 + 5.', 'The second <code>put</code> replaces the value; <code>merge</code> adds to the existing one: 2 + 5.') },
    { ch: 7, code: `static int f() {
    try { return 1; }
    finally { System.out.print("F"); }
}
System.out.println(f());`, wrong: ['1F', '1', 'F'],
      why: L('<code>finally</code> rulează înainte ca metoda să se întoarcă efectiv, deci „F” apare înaintea lui 1.', '<code>finally</code> runs before the method actually returns, so "F" is printed before 1.') },
    { ch: 7, code: `try {
    System.out.print("a");
    int[] v = new int[2];
    v[2] = 1;
    System.out.print("b");
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.print("c");
} finally {
    System.out.print("d");
}
System.out.println("e");`, wrong: ['abcde', 'acd', 'ade'],
      why: L('Indicii merg de la 0 la 1, deci <code>v[2]</code> aruncă excepția; „b” nu se mai execută.', 'Indexes go from 0 to 1, so <code>v[2]</code> throws; "b" never runs.') },
    { ch: 8, code: `Deque<Integer> d = new ArrayDeque<>();
d.push(1);
d.push(2);
d.offer(3);
System.out.println(d.pop() + " " + d);`, wrong: ['3 [2, 1]', '1 [2, 3]', '2 [3, 1]'],
      why: L('<code>push</code> pune la început (stivă), <code>offer</code> la sfârșit (coadă): [2, 1, 3]; <code>pop</code> scoate 2.', '<code>push</code> adds at the front (stack), <code>offer</code> at the end (queue): [2, 1, 3]; <code>pop</code> removes 2.') },
    { ch: 9, code: `var r = switch (3) {
    case 1, 2 -> "mic";
    case 3 -> "trei";
    default -> "mare";
};
System.out.println(r);`, wrong: ['mic', 'mare', 'treimare'],
      why: L('Cu <code>-&gt;</code> nu există „fall-through”: se execută doar ramura potrivită.', 'With <code>-&gt;</code> there is no fall-through: only the matching branch runs.') },
    { ch: 9, code: `record P(int x, int y) {}
var a = new P(1, 2);
var b = new P(1, 2);
System.out.println(a.equals(b) + " " + (a == b));`, wrong: ['true true', 'false false', 'false true'],
      why: L('Un <code>record</code> are <code>equals</code> pe valori, dar <code>==</code> compară referințele: două obiecte distincte.', 'A <code>record</code> has value-based <code>equals</code>, but <code>==</code> compares references: two distinct objects.') },
    { ch: 9, code: `System.out.println(Stream.of(5, 3, 8, 1)
    .filter(x -> x > 2)
    .map(x -> x * 10)
    .sorted()
    .toList());`, wrong: ['[50, 30, 80]', '[10, 30, 50, 80]', '[80, 50, 30]'],
      why: L('<code>filter</code> păstrează 5, 3, 8; <code>map</code> îi înmulțește cu 10; <code>sorted</code> îi ordonează crescător.', '<code>filter</code> keeps 5, 3, 8; <code>map</code> multiplies by 10; <code>sorted</code> orders them ascending.') },
    { ch: 9, code: `Stream.of("a", "b", "c")
    .peek(System.out::print)
    .map(String::toUpperCase)
    .forEach(System.out::print);`, wrong: ['abcABC', 'ABC', 'abc'],
      why: L('Stream-urile sunt leneșe: fiecare element trece prin tot lanțul înainte să vină următorul.', 'Streams are lazy: each element travels through the whole pipeline before the next one starts.') },
  ];

  // ---------- Bug hunt (line numbers and messages checked with javac / java 21) ----------
  const BUGS = [
    { ch: 2, code: `public class Main {
    public static void main(String[] args) {
        int students = 30
        System.out.println(students);
    }
}`, line: 3, kind: 'compile', msg: "Main.java:3: error: ';' expected",
      why: L('Fiecare instrucțiune se termină cu <code>;</code>. Compilatorul semnalează sfârșitul liniei 3.', 'Every statement ends with <code>;</code>. The compiler points at the end of line 3.') },
    { ch: 3, code: `public class Main {
    public static void main(String[] args) {
        String course = 'Java';
        System.out.println(course);
    }
}`, line: 3, kind: 'compile', msg: 'Main.java:3: error: unclosed character literal',
      why: L('Ghilimelele simple sunt pentru <code>char</code> (un caracter). Șirurile folosesc ghilimele duble.', 'Single quotes are for a <code>char</code> (one character). Strings use double quotes.') },
    { ch: 3, code: `public class Main {
    public static void main(String[] args) {
        int grade = 8;
        if (grade = 10) {
            System.out.println("Perfect!");
        }
    }
}`, line: 4, kind: 'compile', msg: 'Main.java:4: error: incompatible types: int cannot be converted to boolean',
      why: L('<code>=</code> atribuie, <code>==</code> compară. O condiție trebuie să fie <code>boolean</code>.', '<code>=</code> assigns, <code>==</code> compares. A condition must be a <code>boolean</code>.') },
    { ch: 3, code: `public class Main {
    public static void main(String[] args) {
        int[] grades = {9, 7, 10};
        int sum = 0;
        for (int i = 0; i <= grades.length; i++) {
            sum += grades[i];
        }
        System.out.println(sum);
    }
}`, line: 6, kind: 'runtime', msg: 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat Main.main(Main.java:6)',
      why: L('Indicii merg de la 0 la <code>length - 1</code>. Condiția corectă: <code>i &lt; grades.length</code>.', 'Indexes go from 0 to <code>length - 1</code>. The right condition: <code>i &lt; grades.length</code>.') },
    { ch: 4, code: `class Student {
    private String name;
    Student(String name) { this.name = name; }
}

public class Main {
    public static void main(String[] args) {
        Student s = new Student("Ana");
        System.out.println(s.name);
    }
}`, line: 9, kind: 'compile', msg: 'Main.java:9: error: name has private access in Student',
      why: L('Încapsulare: un câmp <code>private</code> se vede doar în clasa lui. Adaugă un getter <code>getName()</code>.', 'Encapsulation: a <code>private</code> field is visible only inside its class. Add a <code>getName()</code> getter.') },
    { ch: 4, code: `public class Main {
    void greet() {
        System.out.println("Salut!");
    }

    public static void main(String[] args) {
        greet();
    }
}`, line: 7, kind: 'compile', msg: 'Main.java:7: error: non-static method greet() cannot be referenced from a static context',
      why: L('<code>main</code> este static: nu există un obiect <code>this</code>. Fă metoda <code>static</code> sau creează un obiect.', '<code>main</code> is static: there is no <code>this</code> object. Make the method <code>static</code> or create an object.') },
    { ch: 5, code: `abstract class Animal {
    abstract String sound();
}

public class Main {
    public static void main(String[] args) {
        Animal a = new Animal();
        System.out.println(a.sound());
    }
}`, line: 7, kind: 'compile', msg: 'Main.java:7: error: Animal is abstract; cannot be instantiated',
      why: L('O clasă abstractă nu poate fi instanțiată; creează o subclasă concretă, de ex. <code>Dog extends Animal</code>.', 'An abstract class cannot be instantiated; create a concrete subclass, e.g. <code>Dog extends Animal</code>.') },
    { ch: 5, code: `interface Shape {
    double area();
}

class Square implements Shape {
    double side = 2;
    double perimeter() { return 4 * side; }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(new Square().perimeter());
    }
}`, line: 5, kind: 'compile', msg: 'Main.java:5: error: Square is not abstract and does not override abstract method area() in Shape',
      why: L('O clasă care implementează o interfață trebuie să implementeze toate metodele ei abstracte.', 'A class implementing an interface must implement all of its abstract methods.') },
    { ch: 3, code: `public class Main {
    static String sign(int x) {
        if (x > 0) return "positive";
        else if (x < 0) return "negative";
    }

    public static void main(String[] args) {
        System.out.println(sign(0));
    }
}`, line: 5, kind: 'compile', msg: 'Main.java:5: error: missing return statement',
      why: L('Pentru <code>x == 0</code> nu există niciun <code>return</code>. Adaugă un <code>else</code> final.', 'For <code>x == 0</code> there is no <code>return</code>. Add a final <code>else</code>.') },
    { ch: 7, code: `public class Main {
    static void load(String file) {
        if (file.isEmpty()) {
            throw new Exception("No file name");
        }
    }

    public static void main(String[] args) {
        load("");
    }
}`, line: 4, kind: 'compile', msg: 'Main.java:4: error: unreported exception Exception; must be caught or declared to be thrown',
      why: L('<code>Exception</code> este verificată: metoda trebuie să declare <code>throws Exception</code> sau să o prindă.', '<code>Exception</code> is checked: the method must declare <code>throws Exception</code> or catch it.') },
    { ch: 6, code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("Ana", "Dan", "Ion"));
        for (String n : names) {
            if (n.startsWith("A")) {
                names.remove(n);
            }
        }
        System.out.println(names);
    }
}`, line: 6, kind: 'runtime', msg: 'Exception in thread "main" java.util.ConcurrentModificationException\n\tat java.base/java.util.ArrayList$Itr.checkForComodification(ArrayList.java:1095)\n\tat java.base/java.util.ArrayList$Itr.next(ArrayList.java:1049)\n\tat Main.main(Main.java:6)',
      why: L('Nu modifica o listă în timp ce o parcurgi cu for-each. Folosește <code>names.removeIf(n -&gt; n.startsWith("A"))</code>.', 'Don\'t modify a list while iterating it with for-each. Use <code>names.removeIf(n -&gt; n.startsWith("A"))</code>.') },
    { ch: 9, code: `public class Main {
    record Point(int x, int y) {}

    public static void main(String[] args) {
        Point p = new Point(1, 2);
        p.x = 5;
        System.out.println(p);
    }
}`, line: 6, kind: 'compile', msg: 'Main.java:6: error: cannot assign a value to final variable x',
      why: L('Componentele unui <code>record</code> sunt <code>final</code>. Creează un record nou: <code>new Point(5, p.y())</code>.', 'Record components are <code>final</code>. Create a new record: <code>new Point(5, p.y())</code>.') },
  ];

  // ---------- JVM pipeline / tools / timeline ----------
  const PIPELINE = [
    { kind: 'order', title: L('Drumul unui program Java', 'The journey of a Java program'), ch: 2,
      prompt: L('Apasă pașii în ordinea corectă, de la codul sursă până la procesor.', 'Click the steps in the right order, from source code to the CPU.'),
      items: [L('Scrii Main.java', 'You write Main.java'), L('javac Main.java', 'javac Main.java'), L('Main.class (bytecode)', 'Main.class (bytecode)'), L('java Main pornește JVM-ul', 'java Main starts the JVM'), L('Class loader încarcă clasa', 'The class loader loads the class'), L('Bytecode verifier verifică codul', 'The bytecode verifier checks the code'), L('Interpretorul + JIT produc cod mașină', 'Interpreter + JIT produce machine code')] },
    { kind: 'match', title: L('Uneltele din JDK', 'The JDK tools'), ch: 11,
      prompt: L('Potrivește fiecare unealtă cu ce face.', 'Match each tool with what it does.'),
      pairs: [['javac', L('compilează .java în .class', 'compiles .java into .class')], ['java', L('pornește JVM-ul și rulează programul', 'starts the JVM and runs the program')], ['jshell', L('rulează instrucțiuni una câte una (REPL)', 'runs statements one at a time (REPL)')], ['javadoc', L('generează documentație HTML', 'generates HTML documentation')], ['jar', L('împachetează clasele într-o arhivă', 'packages classes into an archive')], ['jlink', L('creează un runtime Java personalizat', 'builds a custom Java runtime')]] },
    { kind: 'order', title: L('Cronologia Java modern', 'The modern Java timeline'), ch: 9,
      prompt: L('Ordonează noutățile după versiunea în care au devenit standard.', 'Order the features by the version that made them standard.'),
      items: [L('Java 8: lambda și Streams API', 'Java 8: lambdas and the Streams API'), L('Java 10: var', 'Java 10: var'), L('Java 14: switch expressions', 'Java 14: switch expressions'), L('Java 16: records', 'Java 16: records'), L('Java 17 (LTS): clase sealed', 'Java 17 (LTS): sealed classes'), L('Java 21 (LTS): pattern matching în switch, virtual threads', 'Java 21 (LTS): pattern matching for switch, virtual threads'), L('Java 25 (LTS): void main() și IO.println', 'Java 25 (LTS): void main() and IO.println')] },
  ];

  // ---------- race condition ----------
  const RACE = [
    { incs: 1, sync: false, goal: 1, title: L('Actualizarea pierdută', 'The lost update'),
      prompt: L('Două fire execută <code>count++</code>. Programul ar trebui să ajungă la 2. Alege tu ordinea pașilor astfel încât rezultatul final să fie <b>1</b>.', 'Two threads run <code>count++</code>. The program should reach 2. Choose the order of the steps so that the final result is <b>1</b>.') },
    { incs: 2, sync: false, goal: 2, title: L('Dublu ghinion', 'Double trouble'),
      prompt: L('Fiecare fir face acum <code>count++</code> de două ori. Corect ar fi 4. Poți ajunge la <b>2</b>?', 'Each thread now runs <code>count++</code> twice. The right answer is 4. Can you reach <b>2</b>?') },
    { incs: 2, sync: true, goal: 4, title: L('synchronized', 'synchronized'),
      prompt: L('Acum <code>count++</code> este într-o metodă <code>synchronized</code>. Încearcă orice ordine: firul care nu are lacătul trebuie să aștepte. Termină execuția.', 'Now <code>count++</code> is inside a <code>synchronized</code> method. Try any order: the thread without the lock has to wait. Finish the run.') },
  ];

  return { PREDICT, BUGS, PIPELINE, RACE, L };
})();
if (typeof module !== 'undefined') module.exports = Games;
