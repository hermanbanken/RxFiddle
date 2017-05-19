Observable.from(1, 2, 3)
	.map(x => x * 2)
	.filter(x => x < 3)
	.subscribe(console.log)
