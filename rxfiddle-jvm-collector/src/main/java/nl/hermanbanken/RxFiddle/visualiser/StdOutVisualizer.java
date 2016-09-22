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
    System.out.println("fiddle setup " + invoke);
  }

  @Override
  public void logResult(InvokeResult result) {
    System.out.println("fiddle setup " + result);
  }

  @Override
  public void logRuntime(RuntimeEvent runtimeEvent) {
    System.out.println("fiddle runtime " + runtimeEvent);
  }

  @Override
  public void logFollow(Follow follow) {
    System.out.println("fiddle follow " + Utils.objectToString(follow.target));
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
