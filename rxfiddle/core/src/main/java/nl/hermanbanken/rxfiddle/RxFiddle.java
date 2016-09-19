package nl.hermanbanken.rxfiddle;

import rx.Observable;
import rx.schedulers.Schedulers;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@SuppressWarnings("unused")
public class RxFiddle {
    public static void main(String[] args) throws IOException {
        randomObs()
                .map(number -> (char) ('a' + (number.intValue() % ('z' - 'a' + 1))))
                .flatMap(Observable::just)
                .take(2)
                .subscribe(next -> System.out.println("Next: "+next));
        System.in.read();
    }

    private static Observable<Long> randomObs() {
        return Observable
                .interval(0L, 1L, TimeUnit.SECONDS, Schedulers.io());
    }
}