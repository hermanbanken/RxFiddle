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
import org.junit.Assert;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
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
  }

  @Test
  public void testSimple() {
    Observable.just(1).subscribe(System.out::println);

    Predicate<Object> ourSubs = o -> o instanceof Subscriber && !(o instanceof ActionSubscriber);
    shouldContain(1, Hook.followed, ourSubs, "Subscriber");
    shouldContain(1, Hook.followed, o -> o instanceof Observable, "Observable");
    // TODO figure out why it also contains a ActionSubscriber
    assertLength(2 + 1, Hook.followed);
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

    Predicate<Object> ourSubs = o -> o instanceof Subscriber && !(o instanceof ActionSubscriber);
    shouldContain(3, Hook.followed, ourSubs, "Subscriber");
    shouldContain(3, Hook.followed, o -> o instanceof Observable, "Observable");
    // TODO figure out why it also contains a ActionSubscriber
    assertLength(6 + 1, Hook.followed);
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

    shouldContain(3, Hook.followed, o -> o instanceof Subscriber, "Subscriber");
    shouldContain(1, Hook.followed, o -> o.equals(s[0]), "TestSubscription");
    shouldContain(2, Hook.followed, o -> o instanceof Observable, "Observable");
    shouldContain(3, Hook.followed, o -> o instanceof ScheduledAction, "ScheduledAction");
  }

  @Test
  public void testRetrieveTarget() {
    Hook.visualizer = log;
    Observable<Integer> o = Observable.just(0, 1, 3, 4, 5);
    shouldContain(1, log.events, e -> e instanceof Invoke && ((Invoke) e).target == null, "");
    shouldContain(1, log.events, e -> e instanceof InvokeResult && ((InvokeResult) e).result == o, "");
    shouldContain(1, log.events, e -> e instanceof Follow && ((Follow) e).target == o, "");
    assertLength(3, log.events);
  }

  @Test
  public void testTargetsOutOfOrder() {
    Observable<Integer> s = Observable.just(0);
    Hook.visualizer = log;
    Observable<Observable<Integer>> o = s.map(Observable::just);

    shouldContain(1, log.events, e -> e instanceof Invoke && ((Invoke) e).target == s, "");
    shouldContain(1, log.events, e -> e instanceof InvokeResult && ((InvokeResult) e).result == o, "");
    shouldContain(1, log.events, e -> e instanceof Follow && ((Follow) e).target == o, "");
    assertLength(3, log.events);

    log.events.clear();

    TestSubscriber<Observable<Integer>> l = new TestSubscriber<>();
    o.subscribe(l);
    l.awaitTerminalEvent();

    assertLength(3, log.events);
    shouldContain(1, log.events, e -> e instanceof Invoke && ((Invoke) e).target == s, "");
    shouldContain(1, log.events, e -> e instanceof InvokeResult && ((InvokeResult) e).result == o, "");
    shouldContain(1, log.events, e -> e instanceof Follow && ((Follow) e).target == o, "");
  }

  private static <T> void assertLength(int length, Collection<T> input) {
    if(input.size() != length) {
      Assert.fail(String.format("expected:<%d> but was:<%d>\nExpected\t:%d\nActual\t:%s",
        length,
        input.size(),
        length,
        Arrays.toString(input.toArray())
        ));
    }
  }

  private static <T> void shouldContain(
      int count, Collection<T> input, Predicate<Object> matcher, String typeDescription) {
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
