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

package nl.hermanbanken.rxfiddle.visualiser;

import nl.hermanbanken.rxfiddle.*;
import nl.hermanbanken.rxfiddle.data.*;

public class StdOutVisualizer implements Visualizer {

  @Override
  public void logRun(Object identifier) {
    System.out.println("fiddle run " + identifier);
  }

  @Override
  public void logInvoke(Invoke invoke) {
    System.out.println("fiddle setup " + toString(invoke));
  }

  @Override
  public void logResult(InvokeResult result) {
    System.out.println("fiddle setup " + toString(result));
  }

  @Override
  public void logRuntime(RuntimeEvent runtimeEvent) {
    System.out.println("fiddle runtime " + toString(runtimeEvent));
  }

  @Override
  public void logFollow(Follow follow) {
    System.out.println("fiddle follow " + objectToString(follow.target));
  }

  private static String toString(Label label) {
    return String.format(
        "%s.%s:%d", label.className.replace('/', '.'), label.methodName, label.lineNumber);
  }

  private static String toString(Invoke invoke) {
    return invoke.target == null
        ? String.format(
            "static[%s::%s], %s",
            invoke.className.replace('/', '.'),
            invoke.methodName,
            toString(invoke.label))
        : String.format(
            "%s[%s::%s], %s",
            objectToString(invoke.target),
            invoke.className.replace('/', '.'),
            invoke.methodName,
            toString(invoke.label));
  }

  private static String toString(RuntimeEvent event) {
    return event.target == null
        ? String.format("static[%s::%s]", event.className.replace('/', '.'), event.methodName)
        : String.format(
            "%s[%s::%s]",
            objectToString(event.target),
            event.className.replace('/', '.'),
            event.methodName);
  }

  private static String toString(InvokeResult ir) {
    return String.format(
        "%s => %s", ir.invoke == null ? "null" : toString(ir.invoke), objectToString(ir.result));
  }

  private static String objectToString(Object object) {
    return String.format(
        "(%s %s)", object.getClass().getName(), Integer.toHexString(object.hashCode()));
  }

  static {
    new Thread(
            () -> {
              try {
                Thread.sleep(4000);
              } catch (InterruptedException e) {
                e.printStackTrace();
              }

              System.err.println(Hook.results);
              System.err.println(Hook.followed);
            })
        .start();
  }
}
