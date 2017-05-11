let scheduler: Rx.TestScheduler = null

let _ = {
  get next(): Function {
    return Rx.ReactiveTest.onNext
  },
  get complete(): Function {
    return Rx.ReactiveTest.onCompleted
  }
}

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
      height$: this.scheduler.createHotObservable([1.76, 1.77, 1.78]
        .map((v, i) => _.next(i * 100, v)).concat([_.complete(400)])),
      weight$: this.scheduler.createHotObservable([70, 72, 76, 79, 78, 75]
        .map((v, i) => _.next(i * 100, v)).concat([_.complete(700)])),
    }
  },
  get lottery() {
    let start = 2034
    let year = 1000 * 3600 * 24 * 365.25
    return {
      newYear$: Rx.Observable
        .interval(year, survey.scheduler)
        .map(t => new Date(Date.UTC(t + start, 0, 1))),
      veryOldServer: (date: string) => {
        let unix = new Date(date).getTime() / 1000
        if (unix > Math.pow(2, 31)) {
          return Rx.Observable.throw(new Error("Crash!"), this.scheduler)
        } else {
          return this.scheduler.createHotObservable(
            _.next(0, { msg: "calculating" }),
            _.next(10, { msg: "Happy new year!", winningTicket: Math.round(Math.random() * 10) }),
            _.complete(20)
          )
        }
      },
    }
  },
  get imdb() {
    let inputStream = (text: string) => {
      let t = 0
      let messages = []
      // let random = new Array(11).fill(1).map(_ => Math.floor(Math.random() * 100))
      let random = [21, 37, 69, 35, 8, 48, 99, 75, 32, 51, 52, 96, 55, 19, 14, 61, 89,
        70, 44, 69, 21, 19, 87, 64, 52, 96, 12, 41, 33, 69, 28, 35, 23, 82, 94, 73, 79, 24,
        15, 19, 22, 21, 48, 25, 64, 52, 59, 23, 8, 63, 97, 74, 18, 86, 97, 21, 64, 8, 66, 33,
        0, 40, 53, 70, 72, 62, 54, 13, 88, 43, 94, 70, 96, 6, 91, 60, 77, 58, 12, 98, 8, 64,
        96, 9, 28, 86, 45, 65, 94, 28, 55, 39, 34, 46, 2, 93, 17, 84, 3]
      for (let i = 0; i <= text.length; i++) {
        t += random.shift()
        messages.push(_.next(t, text.slice(0, i)))
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
        "The Avengers",
      ],
      findMoviesAsync: (term: string) => {
        let result = this.imdb._movies.filter((movie: string) => movie.toLowerCase().indexOf(term.toLowerCase()) >= 0)
        let t = 100 * result.length
        return this.scheduler.createHotObservable(
          _.next(t, result),
          _.complete(t + 1)
        )
      },
      inputStream,
      johnsInput$: inputStream("the titanic"),
      render: () => { /* would append to DOM here */ },
    }
  },
  get render() {
    return () => { /* would append to DOM here */ }
  },
  get renderSomething() {
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
