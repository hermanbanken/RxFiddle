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

import nl.hermanbanken.rxfiddle.data.*;
import nl.hermanbanken.rxfiddle.visualiser.Visualizer;

import java.util.LinkedList;

public class CaptureVisualizer implements Visualizer {
  LinkedList<RxFiddleEvent> events = new LinkedList<>();

  @Override
  public void logRun(Object identifier) {
    events.clear();
  }

  @Override
  public void logInvoke(Invoke invoke) {
    events.add(invoke);
  }

  @Override
  public void logResult(InvokeResult result) {
    events.add(result);
  }

  @Override
  public void logRuntime(RuntimeEvent runtimeEvent) {
    events.add(runtimeEvent);
  }

  @Override
  public void logFollow(Follow follow) {
    events.add(follow);
  }
}
