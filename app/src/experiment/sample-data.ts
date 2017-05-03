let scheduler: Rx.TestScheduler = null

let experimentProto: any = {
  get scheduler() {
    if (scheduler === null) {
      scheduler = new Rx.TestScheduler()
      scheduler.advanceTo(0)
    }
    return scheduler
  },
  get bmi() {
    return {
      height: this.scheduler.createHotObservable([1.76, 1.77, 1.78]
        .map((v, i) => Rx.ReactiveTest.onNext(i * 100, v)).concat([Rx.ReactiveTest.onCompleted(400)])),
      weight: this.scheduler.createHotObservable([70, 72, 76, 79, 78, 75]
        .map((v, i) => Rx.ReactiveTest.onNext(i * 100, v)).concat([Rx.ReactiveTest.onCompleted(700)])),
    }
  },
  get lottery() {
    return {
      start: 2034,
      veryOldServer: (date: string) => {
        let unix = new Date(date).getTime() / 1000
        if (unix > Math.pow(2, 31)) {
          throw new Error("Crash!")
        } else {
          return this.scheduler.createHotObservable(
            Rx.ReactiveTest.onNext(0, { msg: "calculating" }),
            Rx.ReactiveTest.onNext(10, { msg: "Happy new year!", winningTicket: Math.round(Math.random() * 10) }),
            Rx.ReactiveTest.onCompleted(20)
          )
        }
      }
    }
  },
  get imdb() {
    let inputStream = (text: string) => {
      let t = 0
      let messages = []
      for (let i = 0; i <= text.length; i++) {
        t += 30 + Math.random() * 100
        messages.push(Rx.ReactiveTest.onNext(t, text.slice(0, i)))
      }
      return this.scheduler.createHotObservable(...messages)
    }
    return {
      _movies: [
        "Them",
        "Lion King",
        "Belle & The Beast",
        "Avatar",
        "Harry Potter",
        "Guardians of the Galaxy",
        "House of Cards",
        "Spectre",
        "Interstellar",
        "Iron Man",
        "Terminator Genisys",
        "The Titanic",
      ],
      findMovie: (term: string) => {
        let result = this.imdb._movies.filter((movie: string) => movie.toLowerCase().indexOf(term.toLowerCase()) >= 0)
        let t = 200 * result.length
        return this.scheduler.createHotObservable(
          Rx.ReactiveTest.onNext(t, result),
          Rx.ReactiveTest.onCompleted(t + 1)
        )
      },
      inputStream,
      johnsInput: inputStream("the titanic"),
      render: () => { /* would append to DOM here */ },
    }
  },
  get render() {
    return () => { /* would append to DOM here */ }
  },
  get log() {
    return () => { /* would write to console */ }
  },
  get showError() {
    return () => { /* would display a warning here */ }
  },
  get noop() {
    return () => { /* no operation */ }
  },
}

// Make it global
declare var experiment: any
declare var survey: any
eval("var experiment = experimentProto");
(global as any).experiment = experimentProto;
eval("var survey = experimentProto");
(global as any).survey = experimentProto
