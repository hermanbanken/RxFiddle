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

public class RuntimeEvent implements RxFiddleEvent {
  private final Object target;
  private final String className;
  private final String methodName;

  public RuntimeEvent(Object target, String className, String methodName) {
    this.target = target;
    this.className = className;
    this.methodName = methodName;
  }

  @Override
  public String toString() {
    return target == null
        ? String.format("static[%s::%s]", className.replace('/', '.'), methodName)
        : String.format(
            "%s[%s::%s]", Utils.objectToString(target), className.replace('/', '.'), methodName);
  }
}
