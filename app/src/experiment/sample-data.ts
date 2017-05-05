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
      for (let i = 0; i <= text.length; i++) {
        t += 30 + Math.random() * 100
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
      ],
      findMovies: (term: string) => {
        let result = this.imdb._movies.filter((movie: string) => movie.toLowerCase().indexOf(term.toLowerCase()) >= 0)
        let t = 200 * result.length
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
