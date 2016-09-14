package nl.hermanbanken.rxfiddle;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import rx.Observable;
import rx.schedulers.Schedulers;

@SuppressWarnings("unused")
public class RxFiddle {
    public static void main(String[] args) throws IOException {
        Observable
                .interval(0L, 1L, TimeUnit.SECONDS, Schedulers.io())
                .map(number -> (char) ('a' + (number.intValue() % ('z' - 'a' + 1))))
                .subscribe(next -> System.out.println("Next: "+next));
        System.in.read();
    }
}