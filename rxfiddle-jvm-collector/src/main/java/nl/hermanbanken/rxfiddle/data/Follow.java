package nl.hermanbanken.rxfiddle.data;

public class Follow implements RxFiddleEvent {
  public final Object target;

  public Follow(Object target) {
    this.target = target;
  }
}
