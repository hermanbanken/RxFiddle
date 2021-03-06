/*
 * RxFiddle - Rx debugger
 * Copyright (C) 2016 Herman Banken
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package nl.hermanbanken.rxfiddle;

import nl.hermanbanken.rxfiddle.data.Follow;
import nl.hermanbanken.rxfiddle.data.Invoke;
import nl.hermanbanken.rxfiddle.data.InvokeResult;
import org.junit.*;
import rx.Observable;
import rx.Subscriber;
import rx.Subscription;
import rx.internal.schedulers.ScheduledAction;
import rx.internal.util.ActionSubscriber;
import rx.observers.TestSubscriber;
import rx.schedulers.Schedulers;

import java.util.Collection;
import java.util.Collections;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.util.concurrent.TimeUnit.MILLISECONDS;

public class HookFollowTest {

  private CaptureVisualizer log = new CaptureVisualizer();

  @BeforeClass
  public static void ensureClassesLoaded() {
    Hook.reset();
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
    Hook.visualizer = log;
  }

  @After
  public void after() {
    System.out.println("================================");
    log.events.forEach(System.out::println);
    System.out.println("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
  }

  @Test
  public void testSimple() {
    Observable.just(1).subscribe(System.out::println);

    shouldContain(
        1,
        Hook.followed,
        Subscriber.class,
        (Subscriber e) -> !(e instanceof ActionSubscriber),
        "OurSubs");
    shouldContain(1, Hook.followed, o -> o instanceof Observable, "Observable");
    assertLength(2, Hook.followed);
  }

  @Test
  public void testMultipleOperators() {
    Observable
        // 1
        .just(0, 1, 3, 4, 5)
        // 2
        .map(number -> (char) ('a' + (number % ('z' - 'a' + 1))))
        // 3
        .take(2)
        .subscribe(System.out::println);

    shouldContain(
        3, log.events, Invoke.class, (Invoke i) -> i.kind == Invoke.Kind.Setup, "invokes");
    shouldContain(
        3,
        Hook.followed,
        Subscriber.class,
        (Subscriber e) -> !(e instanceof ActionSubscriber),
        "OurSubs");
    shouldContain(3, Hook.followed, o -> o instanceof Observable, "Observable");
    assertLength(6, Hook.followed);
  }

  @Test(timeout = 300)
  public void testScheduler() throws InterruptedException {
    TestSubscriber<Long> ts = new TestSubscriber<>();
    final Subscription[] s = {null};

    new Thread(
            () ->
                s[0] =
                    Observable.interval(0, 1, MILLISECONDS, Schedulers.io()).take(3).subscribe(ts))
        .start();

    ts.awaitTerminalEvent();
    ts.assertCompleted();

    shouldContain(2, Hook.followed, e -> e instanceof Subscriber, "Subscriber");
    shouldContain(
        1, Hook.followed, Subscription.class, (Subscription e) -> e == s[0], "TestSubscription");
    shouldContain(2, Hook.followed, e -> e instanceof Observable, "Observable");
    shouldContain(3, Hook.followed, e -> e instanceof ScheduledAction, "ScheduledAction");
  }

  @Test
  public void testRetrieveTarget() {
    Hook.visualizer = log;
    Observable<Integer> o = Observable.just(0, 1, 3, 4, 5);
    shouldContain(1, log.events, Invoke.class, (Invoke e) -> e.target == null, "");
    shouldContain(1, log.events, InvokeResult.class, (InvokeResult e) -> e.result == o, "");
    shouldContain(1, log.events, Follow.class, (Follow e) -> e.target == o, "");
    assertLength(3, log.events);
  }

  @Test
  public void testTargetsOutOfOrder() {
    Observable<Integer> s = Observable.just(0);
    log.events.clear();
    Observable<Observable<Integer>> o = s.map(Observable::just);

    shouldContain(1, log.events, Invoke.class, (Invoke e) -> e.target == s, "");
    shouldContain(1, log.events, InvokeResult.class, (InvokeResult e) -> e.result == o, "");
    shouldContain(1, log.events, Follow.class, (Follow e) -> e.target == o, "");
    assertLength(3, log.events);

    log.events.clear();

    TestSubscriber<Observable<Integer>> l = new TestSubscriber<>();
    o.subscribe(l);
    l.awaitTerminalEvent();

    assertLength(3, log.events);
    shouldContain(1, log.events, Invoke.class, (Invoke e) -> e.target == s, "");
    shouldContain(1, log.events, InvokeResult.class, (InvokeResult e) -> e.result == o, "");
    shouldContain(1, log.events, Follow.class, (Follow e) -> e.target == o, "");
  }

  private static <T> void assertLength(int length, Collection<T> input) {
    if (input.size() != length) {
      StringBuilder s = new StringBuilder();
      for (Object item : input.toArray()) {
        s.append(item);
        s.append('\n');
      }

      Assert.fail(
          String.format(
              "expected:<%d> but was:<%d>\nExpected\t:%d\nActual\t:[\n%s]",
              length,
              input.size(),
              length,
              s));
    }
  }

  private static <R, T> void shouldContain(
      int count,
      Collection<R> input,
      Class<T> klass,
      Predicate<T> matcher,
      String typeDescription) {
    shouldContain(
        count,
        input
            .stream()
            .flatMap(o -> klass.isInstance(o) ? Stream.of(klass.cast(o)) : Stream.empty())
            .collect(Collectors.toList()),
        matcher,
        typeDescription);
  }

  private static <O, T extends O> void shouldContain(
      int count, Collection<T> input, Predicate<O> matcher, String typeDescription) {
    Collection<T> copy = Collections.unmodifiableCollection(input);
    long actual = copy.stream().filter(matcher).count();
    if (actual != count) {
      StringBuilder s = new StringBuilder();
      if (actual > count) {
        s.append("Matches: [\n");
        for (Object item : copy.stream().filter(matcher).toArray()) {
          s.append('\t');
          s.append(item);
          s.append('\n');
        }
        s.append("]");
      } else {
        s.append("All: [\n");
        for (O item : copy) {
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
