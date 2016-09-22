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

import jdk.internal.org.objectweb.asm.Type;
import nl.hermanbanken.rxfiddle.data.*;
import nl.hermanbanken.rxfiddle.data.Invoke.Kind;
import nl.hermanbanken.rxfiddle.visualiser.StdOutVisualizer;
import nl.hermanbanken.rxfiddle.visualiser.Visualizer;

import java.util.*;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Hook for instrumented classes
 *
 * @see <a href="https://www.youtube.com/watch?v=y4Ex6bsTv3k">ScalaDays 2015 Amsterdam presentation by Tal Weiss</a>
 * @see <a href="http://www.slideshare.net/Takipi/advanced-production-debugging#33">Relevant slide from presentation</a>
 *
 */
@SuppressWarnings({"WeakerAccess", "unused"})
public class Hook {

  public static Visualizer visualizer = new StdOutVisualizer();
  public static final Stack<Label> labels = new Stack<>();
  public static final Stack<Invoke> invokes = new Stack<>();

  public static volatile Label currentLabel = null;
  public static volatile Invoke currentInvoke = null;

  public static HashMap<Label, ArrayList<Invoke>> results = new HashMap<>();

  public static HashSet<Object> followed = new HashSet<>();

  public static void reset() {
    visualizer = new StdOutVisualizer();
    labels.clear();
    invokes.clear();
    currentLabel = null;
    currentInvoke = null;
    results.clear();
    followed.clear();
    visualizer.logRun(System.nanoTime());
  }

  static {
    reset();
  }

  public static class Constants {
    public static final String CLASS_NAME = Type.getInternalName(Hook.class);

    public static final String HOOK_METHOD_NAME = "libraryHook";
    public static final String HOOK_METHOD_DESC =
        "(Ljava/lang/Object;Ljava/lang/String;Ljava/lang/String;Z)V";

    public static final String LEAVE_METHOD_NAME = "leave";
    public static final String LEAVE_METHOD_DESC = "(Ljava/lang/Object;)V";

    public static final String ENTER_METHOD_NAME = "enter";
    public static final String ENTER_METHOD_DESC =
        "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V";
  }

  public static Predicate<String> RUNTIME = Pattern.compile("request|subscribe|unsafeSubscribe|on(Next|Error|Complete)").asPredicate();

  /** Usage of Rx **/
  public static void libraryHook(
      Object subject, String className, String methodName, boolean fromLambda) {
    if (className.startsWith("rx/plugins") || className.startsWith("rx/internal")) return;

    Invoke invoke;
    // Runtime events
    if (followed.contains(subject) && RUNTIME.test(methodName)) {
      invoke = new Invoke(subject, className, methodName, labels.size() > 0 ? labels.peek() : null, Kind.Runtime);
    }
    // Static setup events
    else if(!labels.isEmpty() && subject == null && className.contains("Observable")) {
      invoke = new Invoke(null, className, methodName, labels.peek(), Kind.Setup);
    }
    // Instance setup events
    else if(!labels.isEmpty() && subject != null && followed.contains(subject)) {
      follow(subject);
      invoke = new Invoke(subject, className, methodName, labels.peek(), Kind.Setup);
    } else {
      System.err.printf("Ignored %s %s %s %b\n", subject, className, methodName, fromLambda);
      return;
    }
    invokes.push(invoke);
    visualizer.logInvoke(invoke);
  }

  /** Tracing **/
  public static void enter(String className, String methodName, String file, int lineNumber) {
    Label label = new Label(className, methodName, file, lineNumber);
    labels.add(label);
  }

  public static void leave(Object result) {
    labels.pop();
    visualizer.logResult(new InvokeResult(invokes.isEmpty() ? null : invokes.pop(), result));
    follow(result);
  }

  public static void follow(Object obj) {
    if (obj == null) return;
    if (followed.add(obj)) {
      visualizer.logFollow(new Follow(obj));
    }
  }
}
