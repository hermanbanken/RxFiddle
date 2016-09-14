package nl.hermanbanken.rxfiddle;

import rx.Observable;
import rx.schedulers.Schedulers;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@SuppressWarnings("unused")
public class RxFiddle {
    public static void main(String[] args) throws IOException {
        Observable
                .interval(0L, 1L, TimeUnit.SECONDS, Schedulers.io())
                .map(number -> (char) ('a' + (number.intValue() % ('z' - 'a' + 1))))
                .flatMap(a -> Observable.just(a))
                .take(1)
                .subscribe(next -> System.out.println("Next: "+next));
        System.in.read();
    }
}