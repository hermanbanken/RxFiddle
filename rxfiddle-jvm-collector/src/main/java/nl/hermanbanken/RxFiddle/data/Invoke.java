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

package nl.hermanbanken.rxfiddle.data;

public class Invoke implements RxFiddleEvent {

  public static enum Kind {
    Setup,
    Runtime
  }

  public final Object target;
  final String className;
  final String methodName;
  final Label label;
  public Kind kind;

  public Invoke(Object target, String className, String methodName, Label label, Kind kind) {
    this.target = target;
    this.className = className;
    this.methodName = methodName;
    this.label = label;
    this.kind = kind;
  }

  @Override
  public String toString() {
    return String.format(
            "%s[%s::%s] %s\n%s",
            target == null ? "static" : Utils.objectToString(target),
            className.replace('/', '.'),
            methodName,
            kind,
            label == null ? "" : label)
        .trim();
  }
}
