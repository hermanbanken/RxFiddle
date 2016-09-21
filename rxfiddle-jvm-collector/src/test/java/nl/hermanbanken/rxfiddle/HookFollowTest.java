package nl.hermanbanken.rxfiddle;

import org.junit.Assert;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import rx.Observable;
import rx.Subscriber;
import rx.Subscription;
import rx.internal.schedulers.ScheduledAction;
import rx.observers.TestSubscriber;
import rx.schedulers.Schedulers;

import java.util.Collection;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

public class HookFollowTest {

  @BeforeClass
  public static void ensureClassesLoaded() {
    // Just run something which uses (most of) the classes used below
    Observable.just(1)
        .delay(0, TimeUnit.MICROSECONDS, Schedulers.newThread())
        .flatMap(Observable::just)
        .buffer(1)
        .subscribe();
  }

  @Before
  public void setup() {
    Hook.reset();
  }

  @Test
  public void testSimple() {
    Observable.just(1).subscribe(System.out::println);
    shouldContain(1, Hook.followed, o -> o instanceof Subscriber, "Subscriber");
    shouldContain(1, Hook.followed, o -> o instanceof Observable, "Observable");
    Assert.assertEquals(2, Hook.followed.size());
  }

  @Test
  public void testMultiple() {
    Observable
        // 1
        .just(0, 1, 3, 4, 5)
        // 2
        .map(number -> (char) ('a' + (number % ('z' - 'a' + 1))))
        // 3
        .take(2)
        .subscribe(System.out::println);

    shouldContain(3, Hook.followed, o -> o instanceof Subscriber, "Subscriber");
    shouldContain(3, Hook.followed, o -> o instanceof Observable, "Observable");
    Assert.assertEquals(6, Hook.followed.size());
  }

  @Test(timeout = 300)
  public void testScheduler() throws InterruptedException {
    TestSubscriber<Long> ts = new TestSubscriber<>();
    final Subscription[] s = {null};

    new Thread(
            () -> {
              Observable<Long> obs =
                  Observable.interval(0, 1, TimeUnit.MILLISECONDS, Schedulers.io()).take(3);
              s[0] = obs.subscribe(ts);
            })
        .start();

    ts.awaitTerminalEvent();
    ts.assertCompleted();

    shouldContain(2, Hook.followed, o -> o instanceof Subscriber, "Subscriber");
    shouldContain(1, Hook.followed, o -> o.equals(s[0]), "TestSubscription");
    shouldContain(2, Hook.followed, o -> o instanceof Observable, "Observable");
    shouldContain(3, Hook.followed, o -> o instanceof ScheduledAction, "ScheduledAction");
  }

  private static void shouldContain(
      int count, Collection<Object> input, Predicate<Object> matcher, String typeDescription) {
    long actual = input.stream().filter(matcher).count();
    if (actual != count) {
      StringBuilder s = new StringBuilder();
      if (actual > count) {
        s.append("Matches: [\n");
        for (Object item : input.stream().filter(matcher).toArray()) {
          s.append('\t');
          s.append(item);
          s.append('\n');
        }
        s.append("]");
      } else {
        s.append("All: [\n");
        for (Object item : input) {
          s.append('\t');
          s.append(matcher.test(item));
          s.append('\t');
          s.append(item);
          s.append('\t');
          s.append(item.getClass().getName());
          s.append('\n');
        }
        s.append("]");
      }
      Assert.fail(
          String.format(
              "Input did not contain %d %s, but %d. %s",
              count,
              typeDescription,
              actual,
              s.toString()));
    }
  }
}
